//! Exact branch-and-bound fallback with discrete, provable log-damage bounds.
//! Every bound scans all reachable integer values, so floors and food caps remain safe.
use crate::{
  check_cancelled,
  combat::{Context, Evaluation, SlotStates},
  formula,
  frontier::{PlanTree, State, StateKey, RANGE_ERROR},
  trace,
  types::*,
};
use serde_json::Value;
use std::{collections::HashMap, sync::Arc};

struct Dual {
  weights: SparseWeights,
  intercept: f64,
  suffix: Vec<f64>,
}
#[derive(Clone, PartialEq)]
struct SparseWeights {
  values: [f64; N],
  indices: [u8; N],
  len: u8,
}
impl SparseWeights {
  fn new(values: [f64; N]) -> Self {
    let mut indices = [0; N];
    let mut len = 0;
    for (index, value) in values.iter().enumerate() {
      if *value != 0.0 {
        indices[len] = index as u8;
        len += 1;
      }
    }
    Self {
      values,
      indices,
      len: len as u8,
    }
  }
  #[inline]
  fn dot(&self, stats: &Stats) -> f64 {
    self.indices[..self.len as usize]
      .iter()
      .map(|&index| {
        let index = index as usize;
        self.values[index] * stats.values[index]
      })
      .sum()
  }
}
fn dot(weights: &[f64; N], stats: &Stats) -> f64 {
  weights.iter().zip(stats.values).map(|(a, b)| a * b).sum()
}
fn factor(ctx: &Context, stat: usize, value: f64) -> f64 {
  let p = &ctx.input.parameters.coefficients.effects;
  let schema = &ctx.input.rules.schema;
  let level = &ctx.input.rules.level;
  let main = schema.main_stat.as_deref().unwrap();
  let attack = if main == "VIT" { "STR" } else { main };
  let weapon = if main == "MND" || main == "INT" {
    19
  } else {
    18
  };
  if stat == stat_index(attack).unwrap() {
    return ctx.input.parameters.floor(
      (if main == "VIT" {
        level.ap_tank
      } else {
        level.ap
      }) * (ctx
        .input
        .parameters
        .floor(value * schema.party_bonus.unwrap_or(p.main.party_bonus))
        - level.main)
        / level.main
        + p.main.damage_base,
    ) / p.main.divisor;
  }
  if stat == weapon {
    return ctx.input.parameters.floor(
      level.main * schema.stat_modifiers.get(attack).copied().unwrap_or(100.0) / p.weapon_divisor,
    ) + value
      + if ctx.input.job == "BLU" {
        ctx.blu_max_bonus
      } else {
        0.0
      };
  }
  match stat {
    5 => {
      let chance = ctx.input.parameters.floor(
        p.critical.chance_scale * (value - level.sub) / level.div
          + p.critical.chance_base
          + if ctx.input.job == "BLU" {
            p.blue_mimicry
          } else {
            0.0
          },
      ) / p.critical.divisor;
      let amount =
        ctx.input.parameters.floor(
          p.critical.damage_scale * (value - level.sub) / level.div + p.critical.damage_base,
        ) / p.critical.divisor;
      (amount - 1.0) * chance + 1.0
    }
    7 => {
      ctx.input.parameters.floor(
        (p.determination.scale * (value - level.main) / level.det + p.determination.base)
          / level.det_trunc,
      ) * level.det_trunc
        / p.determination.divisor
    }
    6 => {
      p.direct_hit.damage_bonus
        * ctx.input.parameters.floor(
          p.direct_hit.chance_scale * (value - level.sub) / level.div
            + if ctx.input.job == "BLU" {
              p.blue_mimicry
            } else {
              0.0
            },
        )
        / p.direct_hit.divisor
        + 1.0
    }
    10 => {
      ctx
        .input
        .parameters
        .floor(p.tenacity.damage_scale * (value - level.sub) / level.div + p.tenacity.damage_base)
        / p.tenacity.divisor
    }
    _ => f64::NAN,
  }
}
fn final_value(ctx: &Context, food: Option<&Food>, stat: usize, value: f64) -> f64 {
  let mut base = Stats::default();
  base.set(stat, value);
  formula::final_stats(ctx.input, &base, food).get(stat)
}
fn inverse_speed(ctx: &Context, food: Option<&Food>, value: f64, upper: bool) -> f64 {
  let (mut lo, mut hi) = (0_i64, 200000_i64);
  while lo < hi {
    let mid = (lo + hi + if upper { 1 } else { 0 }) / 2;
    let speed = final_value(ctx, food, ctx.speed, mid as f64);
    if upper {
      if speed <= value {
        lo = mid
      } else {
        hi = mid - 1
      }
    } else if speed >= value {
      hi = mid
    } else {
      lo = mid + 1
    }
  }
  lo as f64
}

fn tuned_weights(ctx: &Context, slots: &[SlotStates]) -> Result<Vec<[f64; N]>, String> {
  let dimensions: Vec<_> = ctx
    .relevant
    .iter()
    .copied()
    .filter(|&s| s != ctx.speed)
    .collect();
  let bounds: Vec<_> = dimensions
    .iter()
    .map(|&s| {
      let low = ctx.input.base_stats.get(s)
        + slots
          .iter()
          .map(|slot| {
            slot
              .states
              .iter()
              .map(|g| g.stats.get(s))
              .fold(f64::INFINITY, f64::min)
          })
          .sum::<f64>();
      let high = ctx.input.base_stats.get(s)
        + slots
          .iter()
          .map(|slot| {
            slot
              .states
              .iter()
              .map(|g| g.stats.get(s))
              .fold(f64::NEG_INFINITY, f64::max)
          })
          .sum::<f64>();
      (low, high)
    })
    .collect();
  if bounds
    .iter()
    .any(|(a, b)| a.fract() != 0.0 || b.fract() != 0.0 || b - a > 20000.0)
  {
    return Ok(vec![]);
  }
  let mut foods: Vec<Option<&Food>> = std::iter::once(None)
    .chain(ctx.input.foods.iter().map(Some))
    .collect();
  foods.sort_by_key(|f| f.map_or(0, |f| f.id));
  let value = |food: Option<&Food>, s: usize| {
    (
      food.map_or(0.0, |f| f.stats.get(s)),
      food.and_then(|f| f.stat_rates.has(s).then_some(f.stat_rates.get(s))),
    )
  };
  let at_least = |a: Option<&Food>, b: Option<&Food>, s: usize| {
    let (av, ar) = value(a, s);
    let (bv, br) = value(b, s);
    match (ar, br) {
      (Some(a), Some(b)) => a >= b && av >= bv,
      (None, _) => av >= bv,
      (Some(_), None) => bv <= 0.0,
    }
  };
  let foods: Vec<_> = foods
    .iter()
    .enumerate()
    .filter(|(i, food)| {
      !foods.iter().enumerate().any(|(j, candidate)| {
        i != &j
          && dimensions.iter().all(|&s| at_least(*candidate, **food, s))
          && (j < *i
            || dimensions
              .iter()
              .any(|&s| value(*candidate, s) != value(**food, s)))
      })
    })
    .map(|(_, f)| *f)
    .collect();
  let tables: Vec<Vec<Vec<f64>>> = foods
    .iter()
    .map(|&food| {
      dimensions
        .iter()
        .zip(&bounds)
        .map(|(&s, &(lo, hi))| {
          (lo as i64..=hi as i64)
            .map(|v| factor(ctx, s, final_value(ctx, food, s, v as f64)).ln())
            .collect()
        })
        .collect()
    })
    .collect();
  if tables.iter().flatten().flatten().any(|v| !v.is_finite()) {
    return Ok(vec![]);
  }
  let evaluate = |weights: &[f64; N]| {
    let constant = (ctx.input.parameters.coefficients.effects.potency_scale
      * ctx
        .input
        .rules
        .schema
        .trait_damage_multiplier
        .unwrap_or(1.0))
    .ln();
    let intercept = tables
      .iter()
      .map(|food| {
        constant
          + dimensions
            .iter()
            .enumerate()
            .map(|(i, &s)| {
              food[i]
                .iter()
                .enumerate()
                .map(|(v, &log)| log - weights[s] * (bounds[i].0 + v as f64))
                .fold(f64::NEG_INFINITY, f64::max)
            })
            .sum::<f64>()
      })
      .fold(f64::NEG_INFINITY, f64::max);
    intercept
      + dot(weights, &ctx.input.base_stats)
      + slots
        .iter()
        .map(|slot| {
          slot
            .states
            .iter()
            .map(|state| dot(weights, &state.stats))
            .fold(f64::NEG_INFINITY, f64::max)
        })
        .sum::<f64>()
  };
  let mut weights = [0.0; N];
  for (i, &s) in dimensions.iter().enumerate() {
    let (lo, hi) = bounds[i];
    weights[s] = if hi == lo {
      0.0
    } else {
      ((factor(ctx, s, hi).ln() - factor(ctx, s, lo).ln()) / (hi - lo)).max(1e-12)
    };
  }
  let mut best = (evaluate(&weights), weights);
  let mut candidates = vec![best];
  for _ in 0..4 {
    for &s in &dimensions {
      check_cancelled(ctx.cancelled)?;
      if best.1[s] == 0.0 {
        continue;
      }
      let (mut low, mut high) = ((best.1[s] / 3.0).max(1e-12), best.1[s] * 3.0);
      for _ in 0..14 {
        let left = (2.0 * low + high) / 3.0;
        let right = (low + 2.0 * high) / 3.0;
        let mut lw = best.1;
        let mut rw = best.1;
        lw[s] = left;
        rw[s] = right;
        let l = evaluate(&lw);
        let r = evaluate(&rw);
        candidates.push((l, lw));
        candidates.push((r, rw));
        if l <= r {
          high = right
        } else {
          low = left
        }
      }
      let mut w = best.1;
      w[s] = (low + high) / 2.0;
      let candidate = (evaluate(&w), w);
      candidates.push(candidate);
      if candidate.0 < best.0 {
        best = candidate;
      }
    }
  }
  candidates.sort_by(|a, b| a.0.total_cmp(&b.0));
  let mut result = vec![];
  for (_, weights) in candidates {
    if !result.contains(&weights) {
      result.push(weights);
    }
    if result.len() == 16 {
      break;
    }
  }
  Ok(result)
}
fn duals(
  ctx: &Context,
  slots: &[SlotStates],
  food: Option<&Food>,
  candidates: Option<&[[f64; N]]>,
) -> Vec<Dual> {
  let damage: Vec<_> = ctx
    .relevant
    .iter()
    .copied()
    .filter(|&s| s != ctx.speed)
    .collect();
  let bounds: Vec<_> = damage
    .iter()
    .map(|&s| {
      let base = ctx.input.base_stats.get(s);
      let lower = base
        + slots
          .iter()
          .map(|slot| {
            slot
              .states
              .iter()
              .map(|g| g.stats.get(s))
              .fold(f64::INFINITY, f64::min)
          })
          .sum::<f64>();
      let upper = base
        + slots
          .iter()
          .map(|slot| {
            slot
              .states
              .iter()
              .map(|g| g.stats.get(s))
              .fold(f64::NEG_INFINITY, f64::max)
          })
          .sum::<f64>();
      (lower, upper)
    })
    .collect();
  if bounds
    .iter()
    .any(|(a, b)| a.fract() != 0.0 || b.fract() != 0.0 || b - a > 20000.0)
  {
    return vec![];
  }
  let tables: Vec<Vec<f64>> = damage
    .iter()
    .zip(&bounds)
    .map(|(&s, &(a, b))| {
      (a as i64..=b as i64)
        .map(|value| factor(ctx, s, final_value(ctx, food, s, value as f64)).ln())
        .collect()
    })
    .collect();
  if tables.iter().flatten().any(|v| !v.is_finite()) {
    return vec![];
  }
  let minimum = inverse_speed(ctx, food, ctx.required, false);
  let maximum = ctx
    .input
    .speed_range
    .map(|r| inverse_speed(ctx, food, r.max, true));
  let default_weights: Vec<[f64; N]> = [0.2, 0.5, 0.8]
    .into_iter()
    .map(|center| {
      let mut weights = [0.0; N];
      for (i, &s) in damage.iter().enumerate() {
        let table = &tables[i];
        let mid = ((table.len() - 1) as f64 * center) as usize;
        let left = mid.saturating_sub(25);
        let right = (mid + 25).min(table.len() - 1);
        weights[s] = if right > left {
          (table[right] - table[left]) / (right - left) as f64
        } else {
          0.0
        };
      }
      weights
    })
    .collect();
  let mut output = vec![];
  for weights in candidates.unwrap_or(&default_weights) {
    let mut intercept = (ctx.input.parameters.coefficients.effects.potency_scale
      * ctx
        .input
        .rules
        .schema
        .trait_damage_multiplier
        .unwrap_or(1.0))
    .ln();
    for (i, &s) in damage.iter().enumerate() {
      intercept += tables[i]
        .iter()
        .enumerate()
        .map(|(v, &log)| log - weights[s] * (bounds[i].0 + v as f64))
        .fold(f64::NEG_INFINITY, f64::max);
    }
    let scores: Vec<Vec<(f64, f64)>> = slots
      .iter()
      .map(|slot| {
        slot
          .states
          .iter()
          .map(|state| (dot(weights, &state.stats), state.stats.get(ctx.speed)))
          .collect()
      })
      .collect();
    let evaluate = |lambda: f64| {
      intercept
        - lambda
          * if lambda < 0.0 {
            maximum.unwrap()
          } else {
            minimum
          }
        + dot(weights, &ctx.input.base_stats)
        + lambda * ctx.input.base_stats.get(ctx.speed)
        + scores
          .iter()
          .map(|slot| {
            slot
              .iter()
              .map(|(score, speed)| score + lambda * speed)
              .fold(f64::NEG_INFINITY, f64::max)
          })
          .sum::<f64>()
    };
    let mut speed_weights = vec![0.0];
    for sign in if maximum.is_some() {
      vec![1.0, -1.0]
    } else {
      vec![1.0]
    } {
      let (mut low, mut high) = (0.0, weights.iter().copied().fold(1e-10, f64::max) * 4.0);
      let mut best_lambda = 0.0;
      let mut best = evaluate(0.0);
      while evaluate(sign * high) < best && high < 1.0 {
        best = evaluate(sign * high);
        best_lambda = sign * high;
        high *= 2.0;
      }
      for _ in 0..24 {
        let left = (2.0 * low + high) / 3.0;
        let right = (low + 2.0 * high) / 3.0;
        let lv = evaluate(sign * left);
        let rv = evaluate(sign * right);
        if lv < best {
          best = lv;
          best_lambda = sign * left;
        }
        if rv < best {
          best = rv;
          best_lambda = sign * right;
        }
        if lv <= rv {
          high = right
        } else {
          low = left
        }
      }
      speed_weights.push(best_lambda);
    }
    for speed_weight in speed_weights {
      let mut weights = *weights;
      weights[ctx.speed] = speed_weight;
      let intercept = intercept
        - speed_weight
          * if speed_weight < 0.0 {
            maximum.unwrap()
          } else {
            minimum
          };
      let mut suffix = vec![0.0; slots.len() + 1];
      for i in (0..slots.len()).rev() {
        suffix[i] = suffix[i + 1]
          + slots[i]
            .states
            .iter()
            .map(|s| dot(&weights, &s.stats))
            .fold(f64::NEG_INFINITY, f64::max);
      }
      output.push(Dual {
        weights: SparseWeights::new(weights),
        intercept,
        suffix,
      });
    }
  }
  output
}

fn seed_incumbent(
  ctx: &Context,
  slots: &[SlotStates],
  food: Option<&Food>,
  evaluation: &mut Evaluation,
) -> Result<(), String> {
  let bounds = duals(ctx, slots, food, None);
  let combine = |indices: &[usize]| {
    slots.iter().zip(indices).fold(
      State {
        stats: ctx.input.base_stats,
        ..State::default()
      },
      |state, (slot, &index)| state.combine(&slot.states[index]),
    )
  };
  let rank = |state: &State| {
    let stats = formula::final_stats(ctx.input, &state.stats, food);
    let speed = stats.get(ctx.speed);
    let mut violation = (ctx.required - speed).max(0.0)
      + ctx
        .input
        .speed_range
        .map_or(0.0, |r| (speed - r.max).max(0.0));
    if let Some(weeks) = ctx.input.progression_weeks {
      violation += (state.points as f64 - weeks * ctx.input.parameters.points_per_week).max(0.0);
      violation += (state.raid as f64 - weeks * ctx.input.parameters.raid_per_week).max(0.0);
    }
    (violation, formula::effects(ctx.input, &stats).damage)
  };
  for bound in &bounds {
    check_cancelled(ctx.cancelled)?;
    let mut indices: Vec<_> = slots
      .iter()
      .map(|slot| {
        (0..slot.states.len())
          .max_by(|&a, &b| {
            bound
              .weights
              .dot(&slot.states[a].stats)
              .total_cmp(&bound.weights.dot(&slot.states[b].stats))
          })
          .unwrap()
      })
      .collect();
    let mut current = combine(&indices);
    if ctx.budget(&current) {
      evaluation.consider(ctx, &current, food);
    }
    // This only establishes a lower bound. The exhaustive search still proves the final result.
    for _ in 0..3 {
      let mut changed = false;
      for slot in 0..slots.len() {
        check_cancelled(ctx.cancelled)?;
        let old = indices[slot];
        let mut selected = old;
        let mut best_rank = rank(&current);
        // Reuse unchanged equipment on both sides of the slot during local search.
        let mut prefix = Vec::with_capacity(slots.len() + 1);
        prefix.push(State {
          stats: ctx.input.base_stats,
          ..State::default()
        });
        for (index, group) in slots.iter().enumerate() {
          prefix.push(prefix[index].combine(&group.states[indices[index]]));
        }
        let mut suffix = vec![State::default(); slots.len() + 1];
        for index in (0..slots.len()).rev() {
          suffix[index] = slots[index].states[indices[index]].combine(&suffix[index + 1]);
        }
        for choice in 0..slots[slot].states.len() {
          let candidate = prefix[slot]
            .combine(&slots[slot].states[choice])
            .combine(&suffix[slot + 1]);
          let candidate_rank = rank(&candidate);
          if ctx.budget(&candidate) {
            evaluation.consider(ctx, &candidate, food);
          }
          if candidate_rank.0 < best_rank.0
            || (candidate_rank.0 == best_rank.0 && candidate_rank.1 > best_rank.1)
          {
            selected = choice;
            best_rank = candidate_rank;
          }
        }
        indices[slot] = selected;
        current = combine(&indices);
        changed |= selected != old;
      }
      if !changed {
        break;
      }
    }
  }
  Ok(())
}

fn filter_choices(ctx: &Context, slots: &mut [SlotStates], bounds: &mut [Dual], best: f64) -> bool {
  let threshold = (best - ctx.input.parameters.damage_tolerance)
    .max(f64::MIN_POSITIVE)
    .ln()
    - ctx.input.parameters.bound_tolerance;
  loop {
    let maximums: Vec<Vec<f64>> = bounds
      .iter()
      .map(|bound| {
        slots
          .iter()
          .map(|slot| {
            slot
              .states
              .iter()
              .map(|state| bound.weights.dot(&state.stats))
              .fold(f64::NEG_INFINITY, f64::max)
          })
          .collect()
      })
      .collect();
    let roots: Vec<_> = bounds
      .iter()
      .zip(&maximums)
      .map(|(bound, values)| {
        bound.intercept + bound.weights.dot(&ctx.input.base_stats) + values.iter().sum::<f64>()
      })
      .collect();
    let mut changed = false;
    for (index, slot) in slots.iter_mut().enumerate() {
      let old = slot.states.len();
      slot.states.retain(|state| {
        bounds.iter().enumerate().all(|(d, bound)| {
          roots[d] - maximums[d][index] + bound.weights.dot(&state.stats) >= threshold
        })
      });
      if slot.states.is_empty() {
        return false;
      }
      changed |= old != slot.states.len();
    }
    if !changed {
      break;
    }
  }
  // Filtering can change slot cardinalities substantially; restore the intended low-branching order.
  slots.sort_by_key(|slot| (slot.states.len(), slot.index));
  for bound in bounds {
    bound.suffix.fill(0.0);
    for i in (0..slots.len()).rev() {
      bound.suffix[i] = bound.suffix[i + 1]
        + slots[i]
          .states
          .iter()
          .map(|s| bound.weights.dot(&s.stats))
          .fold(f64::NEG_INFINITY, f64::max);
    }
  }
  true
}

fn reachable_stat_bounds(ctx: &Context, slots: &[SlotStates], stat: usize) -> Option<(i64, i64)> {
  let low = ctx.input.base_stats.get(stat)
    + slots
      .iter()
      .map(|slot| {
        slot
          .states
          .iter()
          .map(|state| state.stats.get(stat))
          .fold(f64::INFINITY, f64::min)
      })
      .sum::<f64>();
  let high = ctx.input.base_stats.get(stat)
    + slots
      .iter()
      .map(|slot| {
        slot
          .states
          .iter()
          .map(|state| state.stats.get(stat))
          .fold(f64::NEG_INFINITY, f64::max)
      })
      .sum::<f64>();
  (low.is_finite()
    && high.is_finite()
    && low.fract() == 0.0
    && high.fract() == 0.0
    && high >= low
    && high - low <= 20_000.0)
    .then_some((low as i64, high as i64))
}

// Each ordinary-job damage factor depends on one integer stat. Cache those factors
// so the spatial-tree bound avoids recalculating the full formula at every node.
struct DamageTable {
  stats: [usize; 6],
  lower: [i64; 6],
  factors: [Vec<f64>; 6],
  absent: [bool; 6],
  multiplier: f64,
  blu_max_bonus: f64,
}
impl DamageTable {
  fn new(ctx: &Context, slots: &[SlotStates], food: Option<&Food>) -> Option<Self> {
    let main = ctx.input.rules.schema.main_stat.as_deref()?;
    let attack = if main == "VIT" { "STR" } else { main };
    let stats = [
      if main == "MND" || main == "INT" {
        19
      } else {
        18
      },
      stat_index(attack).ok()?,
      7,
      10,
      5,
      6,
    ];
    let mut lower = [0; 6];
    let mut factors: [Vec<f64>; 6] = std::array::from_fn(|_| Vec::new());
    let mut absent = [false; 6];
    for (index, &stat) in stats.iter().enumerate() {
      if !ctx.input.base_stats.has(stat)
        && slots
          .iter()
          .all(|slot| slot.states.iter().all(|state| !state.stats.has(stat)))
      {
        let final_stats = formula::final_stats(ctx.input, &Stats::default(), food);
        let fallback = match stat {
          5 | 6 | 10 => ctx.input.rules.level.sub,
          7 => ctx.input.rules.level.main,
          _ => 0.0,
        };
        factors[index].push(factor(ctx, stat, final_stats.or(stat, fallback)));
        absent[index] = true;
        continue;
      }
      if !ctx.input.base_stats.has(stat)
        && !slots
          .iter()
          .any(|slot| slot.states.iter().all(|state| state.stats.has(stat)))
      {
        return None;
      }
      let (low, high) = reachable_stat_bounds(ctx, slots, stat)?;
      lower[index] = low;
      factors[index] = (low..=high)
        .map(|value| factor(ctx, stat, final_value(ctx, food, stat, value as f64)))
        .collect();
      if factors[index]
        .iter()
        .any(|value| !value.is_finite() || *value <= 0.0)
      {
        return None;
      }
    }
    if factors
      .iter()
      .flatten()
      .any(|value| !value.is_finite() || *value <= 0.0)
    {
      return None;
    }
    let table = Self {
      stats,
      lower,
      factors,
      absent,
      multiplier: ctx.input.parameters.coefficients.effects.potency_scale
        * ctx
          .input
          .rules
          .schema
          .trait_damage_multiplier
          .unwrap_or(1.0),
      blu_max_bonus: if ctx.input.job == "BLU" {
        ctx.blu_max_bonus
      } else {
        0.0
      },
    };
    let mut reference = ctx.input.base_stats;
    for (index, &stat) in table.stats.iter().enumerate() {
      if !table.absent[index] {
        reference.set(stat, table.lower[index] as f64);
      }
    }
    for (index, &stat) in table.stats.iter().enumerate() {
      for offset in [
        0,
        table.factors[index].len() / 2,
        table.factors[index].len() - 1,
      ] {
        let mut sample = reference;
        if !table.absent[index] {
          sample.set(stat, (table.lower[index] + offset as i64) as f64);
        }
        let final_stats = formula::final_stats(ctx.input, &sample, food);
        let bonus = (ctx.input.job == "BLU")
          .then(|| blu_bonus(ctx, final_stats.get(2) - ctx.input.base_stats.get(2)));
        let cached = table.damage_pair(&sample, &Stats::default(), bonus)?;
        let full = formula::effects(ctx.input, &final_stats).damage;
        if (cached - full).abs() > full.abs() * 1e-10 + 1e-8 {
          return None;
        }
      }
    }
    Some(table)
  }

  #[inline]
  fn damage_pair(&self, prefix: &Stats, suffix: &Stats, blu_bonus: Option<f64>) -> Option<f64> {
    let mut factors = [0.0; 6];
    for index in 0..6 {
      if self.absent[index] {
        factors[index] = self.factors[index][0];
        continue;
      }
      let stat = self.stats[index];
      let value = prefix.get(stat) + suffix.get(stat);
      if !value.is_finite() || value.fract() != 0.0 {
        return None;
      }
      let offset = usize::try_from(value as i64 - self.lower[index]).ok()?;
      factors[index] = *self.factors[index].get(offset)?;
    }
    if let Some(bonus) = blu_bonus {
      factors[0] += bonus - self.blu_max_bonus;
    }
    Some(
      self.multiplier * factors[0] * factors[1] * factors[2] * factors[3] * factors[4] * factors[5],
    )
  }
}

fn blu_bonus(ctx: &Context, delta: f64) -> f64 {
  if delta < 0.0 {
    return 0.0;
  }
  ctx
    .input
    .rules
    .blu_mdmg_additions
    .get(delta as usize)
    .copied()
    .unwrap_or(0.0)
}

// BLU's weapon bonus depends on INT; a range maximum keeps that upper bound safe
// even if future game data makes the lookup non-monotonic.
struct BluBonusRange {
  levels: Vec<Vec<f64>>,
  maximum: f64,
}
impl BluBonusRange {
  fn new(values: &[f64]) -> Self {
    let maximum = values.iter().copied().fold(0.0, f64::max);
    let mut levels = vec![values.to_vec()];
    while let Some(previous) = levels.last() {
      let half = 1 << (levels.len() - 1);
      if previous.len() <= half {
        break;
      }
      let next = (0..previous.len() - half)
        .map(|index| previous[index].max(previous[index + half]))
        .collect();
      levels.push(next);
    }
    Self { levels, maximum }
  }

  fn maximum_between(&self, lower: f64, upper: f64) -> f64 {
    let Some(values) = self.levels.first() else {
      return 0.0;
    };
    if !lower.is_finite() || !upper.is_finite() || lower > upper {
      return self.maximum;
    }
    if values.is_empty() || upper < 0.0 || lower >= values.len() as f64 {
      return 0.0;
    }
    let start = lower.floor().max(0.0) as usize;
    let end = upper.ceil().min((values.len() - 1) as f64) as usize;
    if start > end {
      return 0.0;
    }
    let width = end - start + 1;
    let level = (usize::BITS - 1 - width.leading_zeros()) as usize;
    let span = 1 << level;
    self.levels[level][start].max(self.levels[level][end + 1 - span])
  }
}

/// Remove a food only when another is strictly better for every reachable gear state.
fn blu_product_dominates(
  ctx: &Context,
  slots: &[SlotStates],
  better: Option<&Food>,
  worse: Option<&Food>,
) -> bool {
  if ctx.input.speed_range.is_some()
    || !raw_stat_dominance_is_safe(ctx, slots, better)
    || !raw_stat_dominance_is_safe(ctx, slots, worse)
    || [better, worse]
      .into_iter()
      .flatten()
      .any(|food| [2, 19].into_iter().any(|stat| food.stats.has(stat)))
  {
    return false;
  }
  let Some((speed_low, speed_high)) = reachable_stat_bounds(ctx, slots, ctx.speed) else {
    return false;
  };
  if final_value(ctx, better, ctx.speed, speed_low as f64) < ctx.required {
    for value in speed_low..=speed_high {
      if final_value(ctx, better, ctx.speed, value as f64)
        < final_value(ctx, worse, ctx.speed, value as f64)
      {
        return false;
      }
    }
  }
  let mut low_stats = ctx.input.base_stats;
  let mut minimum_log_ratio = 0.0;
  for &stat in ctx.relevant.iter().filter(|&&stat| stat != ctx.speed) {
    let Some((low, high)) = reachable_stat_bounds(ctx, slots, stat) else {
      return false;
    };
    low_stats.set(stat, low as f64);
    let mut minimum = f64::INFINITY;
    for value in low..=high {
      let a = factor(ctx, stat, final_value(ctx, better, stat, value as f64));
      let b = factor(ctx, stat, final_value(ctx, worse, stat, value as f64));
      if !a.is_finite() || !b.is_finite() || a <= 0.0 || b <= 0.0 {
        return false;
      }
      minimum = minimum.min((a / b).ln());
    }
    minimum_log_ratio += minimum;
  }
  let minimum_damage = formula::effects(
    ctx.input,
    &formula::final_stats(ctx.input, &low_stats, worse),
  )
  .damage;
  minimum_log_ratio > 1e-8
    && minimum_damage.is_finite()
    && minimum_damage > 0.0
    && minimum_damage * minimum_log_ratio.exp_m1() > ctx.input.parameters.damage_tolerance * 2.0
}

fn food_strictly_dominates(
  ctx: &Context,
  slots: &[SlotStates],
  better: Option<&Food>,
  worse: Option<&Food>,
) -> bool {
  if ctx.input.job == "BLU" && blu_product_dominates(ctx, slots, better, worse) {
    return true;
  }
  if ctx.input.speed_range.is_some()
    || (ctx.input.job == "BLU"
      && (!raw_stat_dominance_is_safe(ctx, slots, better)
        || !raw_stat_dominance_is_safe(ctx, slots, worse)))
  {
    return false;
  }
  let Some((low_speed, high_speed)) = reachable_stat_bounds(ctx, slots, ctx.speed) else {
    return false;
  };
  for value in low_speed..=high_speed {
    if final_value(ctx, better, ctx.speed, value as f64)
      < final_value(ctx, worse, ctx.speed, value as f64)
    {
      return false;
    }
  }
  let mut strict_dimension = false;
  for &stat in ctx.relevant.iter().filter(|&&stat| stat != ctx.speed) {
    let Some((low, high)) = reachable_stat_bounds(ctx, slots, stat) else {
      return false;
    };
    let mut always_strict = true;
    for value in low..=high {
      let better_factor = factor(ctx, stat, final_value(ctx, better, stat, value as f64));
      let worse_factor = factor(ctx, stat, final_value(ctx, worse, stat, value as f64));
      if !better_factor.is_finite() || !worse_factor.is_finite() || better_factor < worse_factor {
        return false;
      }
      always_strict &= better_factor > worse_factor;
    }
    strict_dimension |= always_strict;
  }
  strict_dimension
}

fn raw_stat_dominance_is_safe(ctx: &Context, slots: &[SlotStates], food: Option<&Food>) -> bool {
  ctx.input.job != "BLU"
    || reachable_stat_bounds(ctx, slots, 2).is_some_and(|(_, upper)| {
      let delta = final_value(ctx, food, 2, upper as f64) - ctx.input.base_stats.get(2);
      delta < ctx.input.rules.blu_mdmg_additions.len() as f64
        && ctx
          .input
          .rules
          .blu_mdmg_additions
          .first()
          .is_none_or(|value| *value >= 0.0)
        && ctx
          .input
          .rules
          .blu_mdmg_additions
          .windows(2)
          .all(|values| values[0] <= values[1])
    })
}

struct SpeedBound {
  weights: SparseWeights,
  intercept: f64,
  suffixes: Vec<Vec<f64>>,
}
fn speed_bounds(
  ctx: &Context,
  slots: &[SlotStates],
  bounds: &[Dual],
  required: f64,
) -> Result<Vec<SpeedBound>, String> {
  let needed = (required - ctx.input.base_stats.get(ctx.speed)).max(0.0) as usize;
  let mut output: Vec<SpeedBound> = vec![];
  for bound in bounds {
    let mut weights = bound.weights.values;
    weights[ctx.speed] = 0.0;
    if output.iter().any(|old| old.weights.values == weights) {
      continue;
    }
    let intercept = bound.intercept + bound.weights.values[ctx.speed] * required;
    let weights = SparseWeights::new(weights);
    let mut exact = vec![f64::NEG_INFINITY; needed + 1];
    exact[0] = 0.0;
    let mut suffixes = vec![vec![f64::NEG_INFINITY; needed + 1]; slots.len() + 1];
    suffixes[slots.len()][0] = 0.0;
    for depth in (0..slots.len()).rev() {
      check_cancelled(ctx.cancelled)?;
      let mut next = vec![f64::NEG_INFINITY; needed + 1];
      for state in &slots[depth].states {
        let speed = state.stats.get(ctx.speed) as usize;
        let score = weights.dot(&state.stats);
        for (remaining, &suffix_score) in exact.iter().enumerate() {
          if suffix_score == f64::NEG_INFINITY {
            continue;
          }
          let total = (speed + remaining).min(needed);
          next[total] = next[total].max(score + suffix_score);
        }
      }
      let mut best = f64::NEG_INFINITY;
      for speed in (0..=needed).rev() {
        best = best.max(next[speed]);
        suffixes[depth][speed] = best;
      }
      exact = next;
    }
    output.push(SpeedBound {
      weights,
      intercept,
      suffixes,
    });
  }
  Ok(output)
}

// A spatial tree bounds groups of final-slot choices before expanding individual leaves.
// Every node stores componentwise extrema, so rejecting a node cannot discard a better build.
#[derive(Clone, Copy)]
struct LastChoiceNode {
  start: usize,
  end: usize,
  left: Option<usize>,
  right: Option<usize>,
  low: Stats,
  high: Stats,
  min_points: i64,
  min_raid: i64,
}
struct LastChoiceTree {
  order: Vec<usize>,
  nodes: Vec<LastChoiceNode>,
  dual_max: Vec<[f64; 8]>,
  dual_count: usize,
}
impl LastChoiceTree {
  fn new(slot: &SlotStates, relevant: &[usize]) -> Self {
    let mut tree = Self {
      order: (0..slot.states.len()).collect(),
      nodes: Vec::new(),
      dual_max: Vec::new(),
      dual_count: 0,
    };
    tree.build(slot, relevant, 0, slot.states.len());
    tree
  }

  fn with_duals(mut self, slot: &SlotStates, duals: &[Dual]) -> Self {
    self.dual_count = duals.len().min(8);
    self.dual_max = vec![[f64::NEG_INFINITY; 8]; self.nodes.len()];
    for index in (0..self.nodes.len()).rev() {
      let node = self.nodes[index];
      if let (Some(left), Some(right)) = (node.left, node.right) {
        for dual in 0..self.dual_count {
          self.dual_max[index][dual] = self.dual_max[left][dual].max(self.dual_max[right][dual]);
        }
      } else {
        for &choice in &self.order[node.start..node.end] {
          for dual in 0..self.dual_count {
            self.dual_max[index][dual] =
              self.dual_max[index][dual].max(duals[dual].weights.dot(&slot.states[choice].stats));
          }
        }
      }
    }
    self
  }

  fn build(&mut self, slot: &SlotStates, relevant: &[usize], start: usize, end: usize) -> usize {
    let first = &slot.states[self.order[start]];
    let mut low = first.stats;
    let mut high = first.stats;
    let mut min_points = first.points;
    let mut min_raid = first.raid;
    for &choice in &self.order[start + 1..end] {
      let state = &slot.states[choice];
      for stat in 0..N {
        low.values[stat] = low.values[stat].min(state.stats.get(stat));
        high.values[stat] = high.values[stat].max(state.stats.get(stat));
      }
      low.present |= state.stats.present;
      high.present |= state.stats.present;
      min_points = min_points.min(state.points);
      min_raid = min_raid.min(state.raid);
    }
    let index = self.nodes.len();
    self.nodes.push(LastChoiceNode {
      start,
      end,
      left: None,
      right: None,
      low,
      high,
      min_points,
      min_raid,
    });
    if end - start > 8 {
      let split_stat = relevant
        .iter()
        .copied()
        .max_by(|&a, &b| (high.get(a) - low.get(a)).total_cmp(&(high.get(b) - low.get(b))));
      if let Some(stat) = split_stat {
        self.order[start..end].sort_by(|&a, &b| {
          slot.states[a]
            .stats
            .get(stat)
            .total_cmp(&slot.states[b].stats.get(stat))
            .then(a.cmp(&b))
        });
        let middle = (start + end) / 2;
        let left = self.build(slot, relevant, start, middle);
        let right = self.build(slot, relevant, middle, end);
        self.nodes[index].left = Some(left);
        self.nodes[index].right = Some(right);
      }
    }
    index
  }
}
pub fn optimize(ctx: &Context, slots: &[SlotStates], skipped: bool) -> Result<Value, String> {
  optimize_slots(ctx, slots, skipped)
}

/// Continues exact search from an already Pareto-pruned prefix without repeating earlier slots.
pub fn optimize_from_frontier(
  ctx: &Context,
  frontier: Vec<State>,
  remaining: &[SlotStates],
  skipped: bool,
) -> Result<Value, String> {
  if frontier.is_empty() {
    return Err("No frontier states are available for exact search.".into());
  }
  let prefix = SlotStates {
    index: usize::MAX,
    states: frontier
      .into_iter()
      .map(|mut state| {
        for index in 0..N {
          state.stats.values[index] -= ctx.input.base_stats.values[index];
        }
        state
      })
      .collect(),
  };
  let mut slots = Vec::with_capacity(remaining.len() + 1);
  slots.push(prefix);
  slots.extend_from_slice(remaining);
  optimize_slots(ctx, &slots, skipped)
}

fn optimize_slots(ctx: &Context, slots: &[SlotStates], skipped: bool) -> Result<Value, String> {
  #[derive(Default)]
  struct SearchMetrics {
    visited: usize,
    dual_pruned: usize,
    speed_bound_pruned: usize,
    damage_pruned: usize,
    memo_pruned: usize,
    last_tree_pruned: usize,
    last_tree_checked: usize,
    tail_dual_pruned: usize,
    tail_dual_checked: usize,
    dual_checks: usize,
    speed_bound_checks: usize,
  }
  struct Search<'a, 'b> {
    ctx: &'a Context<'b>,
    slots: &'a [SlotStates],
    food: Option<&'a Food>,
    duals: &'a [Dual],
    speed_bounds: &'a [SpeedBound],
    required_raw: f64,
    maximum_raw: f64,
    seen: Vec<HashMap<StateKey, (f64, i64)>>,
    suffix_min: &'a [Stats],
    suffix_max: &'a [Stats],
    minimum_cost: &'a [(i64, i64)],
    last_tree: Option<&'a LastChoiceTree>,
    pair_tree: Option<&'a LastChoiceTree>,
    pair_slot: Option<&'a SlotStates>,
    pair_paths: Option<&'a [(usize, usize)]>,
    triple_tree: Option<&'a LastChoiceTree>,
    triple_slot: Option<&'a SlotStates>,
    triple_paths: Option<&'a [(usize, usize, usize)]>,
    damage_table: Option<&'a DamageTable>,
    blu_bonus_range: Option<&'a BluBonusRange>,
    nodes: usize,
    memo_entries: usize,
    metrics: SearchMetrics,
    speed_bounds_enabled: bool,
    dual_order: Vec<usize>,
    dual_hits: Vec<usize>,
    dual_seen: Vec<usize>,
    dual_order_tuned: bool,
    prefer_damage_bound: bool,
    evaluation: &'a mut Evaluation,
  }
  impl Search<'_, '_> {
    fn visit_tail(
      &mut self,
      state: &State,
      path: &mut Vec<usize>,
      width: usize,
    ) -> Result<(), String> {
      let tree = match width {
        3 => self.triple_tree.unwrap(),
        2 => self.pair_tree.unwrap(),
        _ => self.last_tree.unwrap(),
      };
      let mut prefix_scores = [0.0; 8];
      for (index, score) in prefix_scores.iter_mut().enumerate().take(tree.dual_count) {
        *score = self.duals[index].weights.dot(&state.stats);
      }
      // A later incumbent can only raise this threshold, so the captured value
      // remains conservative throughout the subtree.
      let threshold = self
        .evaluation
        .best
        .as_ref()
        .map_or(f64::NEG_INFINITY, |best| {
          (best.effects.damage - self.ctx.input.parameters.damage_tolerance)
            .max(f64::MIN_POSITIVE)
            .ln()
            - self.ctx.input.parameters.bound_tolerance
        });
      self.visit_tail_tree(0, state, path, width, &prefix_scores, threshold)
    }

    fn blu_bonus_bound(&self, low: &Stats, high: &Stats) -> Option<f64> {
      let range = self.blu_bonus_range?;
      let base = self.ctx.input.base_stats.get(2);
      let lower = final_value(self.ctx, self.food, 2, low.get(2)) - base;
      let upper = final_value(self.ctx, self.food, 2, high.get(2)) - base;
      Some(range.maximum_between(lower, upper))
    }

    fn damage_pair_prunes(
      &self,
      prefix: &Stats,
      suffix_low: &Stats,
      suffix_high: &Stats,
      best_damage: f64,
    ) -> bool {
      let low = prefix.add(suffix_low);
      let high = prefix.add(suffix_high);
      if let Some(damage) = self
        .damage_table
        .and_then(|table| table.damage_pair(prefix, suffix_high, self.blu_bonus_bound(&low, &high)))
      {
        let margin = damage.abs() * 1e-12 + 1e-10;
        return damage + margin < best_damage - self.ctx.input.parameters.damage_tolerance;
      }
      self.damage_bound_prunes(&low, &high, best_damage)
    }

    fn visit_tail_tree(
      &mut self,
      node_index: usize,
      state: &State,
      path: &mut Vec<usize>,
      width: usize,
      prefix_scores: &[f64; 8],
      threshold: f64,
    ) -> Result<(), String> {
      let tree = match width {
        3 => self.triple_tree.expect("triple choice tree is present"),
        2 => self.pair_tree.expect("pair choice tree is present"),
        _ => self.last_tree.expect("final choice tree is present"),
      };
      let node = tree.nodes[node_index];
      self.metrics.last_tree_checked += 1;
      if self.ctx.input.progression_weeks.is_some() {
        let cheapest = State {
          points: state.points + node.min_points,
          raid: state.raid + node.min_raid,
          ..State::default()
        };
        if !self.ctx.budget(&cheapest) {
          self.metrics.last_tree_pruned += 1;
          return Ok(());
        }
      }
      let speed = state.stats.get(self.ctx.speed);
      if speed + node.high.get(self.ctx.speed) < self.required_raw
        || speed + node.low.get(self.ctx.speed) > self.maximum_raw
      {
        self.metrics.last_tree_pruned += 1;
        return Ok(());
      }
      if threshold.is_finite() {
        for dual in 0..tree.dual_count {
          self.metrics.tail_dual_checked += 1;
          if self.duals[dual].intercept + prefix_scores[dual] + tree.dual_max[node_index][dual]
            < threshold
          {
            self.metrics.tail_dual_pruned += 1;
            self.metrics.last_tree_pruned += 1;
            return Ok(());
          }
        }
      }
      if let Some(best) = &self.evaluation.best {
        if self.damage_pair_prunes(&state.stats, &node.low, &node.high, best.effects.damage) {
          self.metrics.last_tree_pruned += 1;
          return Ok(());
        }
      }
      if let (Some(left), Some(right)) = (node.left, node.right) {
        // Visit the high-stat half first to improve the incumbent earlier.
        self.visit_tail_tree(right, state, path, width, prefix_scores, threshold)?;
        self.visit_tail_tree(left, state, path, width, prefix_scores, threshold)?;
      } else {
        for offset in node.start..node.end {
          let choice = match width {
            3 => self.triple_tree.unwrap().order[offset],
            2 => self.pair_tree.unwrap().order[offset],
            _ => self.last_tree.unwrap().order[offset],
          };
          let selected = match width {
            3 => &self.triple_slot.unwrap().states[choice],
            2 => &self.pair_slot.unwrap().states[choice],
            _ => &self.slots[self.slots.len() - 1].states[choice],
          };
          let next = state.combine_values(selected);
          if self.ctx.budget(&next) {
            match width {
              3 => {
                let (first, second, third) = self.triple_paths.unwrap()[choice];
                path.extend([first, second, third]);
              }
              2 => {
                let (first, second) = self.pair_paths.unwrap()[choice];
                path.extend([first, second]);
              }
              _ => path.push(choice),
            }
            self.visit(self.slots.len(), next, path)?;
            for _ in 0..width {
              path.pop();
            }
          }
        }
      }
      Ok(())
    }

    fn damage_bound_prunes(&self, low: &Stats, high: &Stats, best_damage: f64) -> bool {
      if let Some(damage) = self.damage_table.and_then(|table| {
        table.damage_pair(high, &Stats::default(), self.blu_bonus_bound(low, high))
      }) {
        let margin = damage.abs() * 1e-12 + 1e-10;
        return damage + margin < best_damage - self.ctx.input.parameters.damage_tolerance;
      }
      let mut stats = formula::final_stats(self.ctx.input, high, self.food);
      if self.ctx.input.job == "BLU" {
        let delta = stats.get(2) - self.ctx.input.base_stats.get(2);
        let max_bonus = self
          .blu_bonus_bound(low, high)
          .unwrap_or(self.ctx.blu_max_bonus);
        let current_bonus = blu_bonus(self.ctx, delta);
        stats.set(19, stats.get(19) + max_bonus - current_bonus);
      }
      formula::effects(self.ctx.input, &stats).damage
        < best_damage - self.ctx.input.parameters.damage_tolerance
    }

    fn visit(&mut self, index: usize, state: State, path: &mut Vec<usize>) -> Result<(), String> {
      self.metrics.visited += 1;
      if self.metrics.visited & ((1 << 23) - 1) == 0 {
        trace::emit(|| {
          serde_json::json!({
            "event":"exact_progress",
            "visited":self.metrics.visited,
            "nodes":self.nodes,
            "dualPruned":self.metrics.dual_pruned,
            "speedBoundPruned":self.metrics.speed_bound_pruned,
            "damagePruned":self.metrics.damage_pruned,
            "memoPruned":self.metrics.memo_pruned,
            "lastTreePruned":self.metrics.last_tree_pruned,
            "lastTreeChecked":self.metrics.last_tree_checked,
            "tailDualPruned":self.metrics.tail_dual_pruned,
            "bestDamage":self.evaluation.best.as_ref().map(|candidate| candidate.effects.damage)
          })
        });
      }
      if !self.prefer_damage_bound
        && self.metrics.visited >= 100_000
        && self.metrics.damage_pruned > self.metrics.dual_pruned
      {
        self.prefer_damage_bound = true;
      }
      check_cancelled(self.ctx.cancelled)?;
      let budget_state = State {
        points: state.points + self.minimum_cost[index].0,
        raid: state.raid + self.minimum_cost[index].1,
        ..State::default()
      };
      if !self.ctx.budget(&budget_state) {
        return Ok(());
      }
      let speed = state.stats.get(self.ctx.speed);
      if speed > self.maximum_raw
        || speed + self.suffix_max[index].get(self.ctx.speed) < self.required_raw
      {
        return Ok(());
      }
      if let Some(best) = &self.evaluation.best {
        let low = state.stats.add(&self.suffix_min[index]);
        let high = state.stats.add(&self.suffix_max[index]);
        let fastest = final_value(
          self.ctx,
          self.food,
          self.ctx.speed,
          high.get(self.ctx.speed),
        );
        let slowest = final_value(self.ctx, self.food, self.ctx.speed, low.get(self.ctx.speed));
        if fastest < self.ctx.required
          || self.ctx.input.speed_range.is_some_and(|r| slowest > r.max)
        {
          return Ok(());
        }
        if self.prefer_damage_bound && self.damage_bound_prunes(&low, &high, best.effects.damage) {
          self.metrics.damage_pruned += 1;
          return Ok(());
        }
        let threshold = (best.effects.damage - self.ctx.input.parameters.damage_tolerance)
          .max(f64::MIN_POSITIVE)
          .ln()
          - self.ctx.input.parameters.bound_tolerance;
        let mut dual_checks = 0;
        let dual_pruned = self.dual_order.iter().any(|&dual_index| {
          dual_checks += 1;
          if !self.dual_order_tuned {
            self.dual_seen[dual_index] += 1;
          }
          let d = &self.duals[dual_index];
          let pruned = d.intercept + d.weights.dot(&state.stats) + d.suffix[index] < threshold;
          if pruned && !self.dual_order_tuned {
            self.dual_hits[dual_index] += 1;
          }
          pruned
        });
        self.metrics.dual_checks += dual_checks;
        if !self.dual_order_tuned && self.metrics.visited >= 10_000 {
          self.dual_order.sort_by(|&a, &b| {
            (self.dual_hits[b] * self.dual_seen[a])
              .cmp(&(self.dual_hits[a] * self.dual_seen[b]))
              .then(a.cmp(&b))
          });
          self.dual_order_tuned = true;
        }
        if dual_pruned {
          self.metrics.dual_pruned += 1;
          return Ok(());
        }
        let needed = (self.required_raw - speed).max(0.0) as usize;
        if self.speed_bounds_enabled {
          let mut speed_bound_checks = 0;
          let speed_bound_pruned = self.speed_bounds.iter().any(|bound| {
            speed_bound_checks += 1;
            bound.intercept + bound.weights.dot(&state.stats) + bound.suffixes[index][needed]
              < threshold
          });
          self.metrics.speed_bound_checks += speed_bound_checks;
          if speed_bound_pruned {
            self.metrics.speed_bound_pruned += 1;
            return Ok(());
          }
          if self.metrics.speed_bound_checks >= 10_000 && self.metrics.speed_bound_pruned == 0 {
            self.speed_bounds_enabled = false;
          }
        }
        if !self.prefer_damage_bound && self.damage_bound_prunes(&low, &high, best.effects.damage) {
          self.metrics.damage_pruned += 1;
          return Ok(());
        }
      }
      if index == self.slots.len() {
        let mut resolved = state;
        resolved.plan = path
          .iter()
          .enumerate()
          .fold(None, |plan, (depth, &choice)| {
            let next = self.slots[depth].states[choice].plan.clone();
            match (plan, next) {
              (Some(a), Some(b)) => Some(Arc::new(PlanTree::Join(a, b))),
              (a, None) => a,
              (None, b) => b,
            }
          });
        self.evaluation.consider(self.ctx, &resolved, self.food);
        return Ok(());
      }
      // Keep the exact damage dimensions and resource costs; speed above the target favors less overflow.
      let key = StateKey::new(
        self
          .ctx
          .relevant
          .iter()
          .map(|&stat| {
            if stat == self.ctx.speed {
              speed.min(self.required_raw) as i64
            } else {
              state.stats.get(stat) as i64
            }
          })
          .chain([state.points, state.raid]),
      );
      if self.seen[index]
        .get(&key)
        .is_some_and(|&(old_speed, cost)| {
          old_speed < speed || (old_speed == speed && cost <= state.change)
        })
      {
        self.metrics.memo_pruned += 1;
        return Ok(());
      }
      if self.seen[index]
        .insert(key, (speed, state.change))
        .is_none()
      {
        self.memo_entries += 1;
      }
      self.nodes += 1;
      let base_limit = self.ctx.input.parameters.exact_limit;
      // Tail grouping can keep the search tractable after one layer exceeds the
      // default cap. Bound both that layer and the total retained hash entries.
      let layer_limit = if self.pair_tree.is_some() || self.triple_tree.is_some() {
        base_limit.saturating_mul(5).min(5_000_000).max(base_limit)
      } else {
        base_limit
      };
      let total_limit = layer_limit
        .saturating_mul(2)
        .min(8_000_000)
        .max(layer_limit);
      if self.seen[index].len() > layer_limit || self.memo_entries > total_limit {
        return Err(RANGE_ERROR.into());
      }
      if index + 3 == self.slots.len() && self.triple_tree.is_some() {
        return self.visit_tail(&state, path, 3);
      }
      if index + 2 == self.slots.len() && self.pair_tree.is_some() {
        return self.visit_tail(&state, path, 2);
      }
      if index + 1 == self.slots.len() && self.last_tree.is_some() {
        return self.visit_tail(&state, path, 1);
      }
      for i in 0..self.slots[index].states.len() {
        let next = state.combine_values(&self.slots[index].states[i]);
        if self.ctx.budget(&next) {
          path.push(i);
          self.visit(index + 1, next, path)?;
          path.pop();
        }
      }
      Ok(())
    }
  }
  let weight_started = std::time::Instant::now();
  let weight_candidates = tuned_weights(ctx, slots)?;
  let blu_bonus_range =
    (ctx.input.job == "BLU").then(|| BluBonusRange::new(&ctx.input.rules.blu_mdmg_additions));
  trace::emit(
    || serde_json::json!({"event":"exact_weights","elapsedMs":weight_started.elapsed().as_secs_f64() * 1000.0,"candidateCount":weight_candidates.len()}),
  );
  let mut evaluation = Evaluation::new();
  let mut foods: Vec<_> = ctx.input.foods.iter().collect();
  foods.sort_by(|a, b| {
    b.stats
      .values
      .iter()
      .sum::<f64>()
      .total_cmp(&a.stats.values.iter().sum::<f64>())
      .then(a.id.cmp(&b.id))
  });
  let food_filter_started = std::time::Instant::now();
  let mut available_foods: Vec<_> = foods
    .iter()
    .copied()
    .filter(|food| {
      !foods.iter().any(|candidate| {
        candidate.id != food.id && food_strictly_dominates(ctx, slots, Some(candidate), Some(food))
      })
    })
    .collect();
  let search_without_food = !available_foods
    .iter()
    .any(|food| food_strictly_dominates(ctx, slots, Some(food), None));
  trace::emit(
    || serde_json::json!({"event":"food_filter","inputFoods":foods.len(),"retainedFoods":available_foods.len(),"searchWithoutFood":search_without_food,"retainedFoodIds":available_foods.iter().map(|food| food.id).collect::<Vec<_>>(),"elapsedMs":food_filter_started.elapsed().as_secs_f64() * 1000.0}),
  );
  let seed_started = std::time::Instant::now();
  let mut seed_attempts = 0;
  let mut stagnant_attempts = 0;
  let score_food = |state: &State, food: &Food| {
    let stats = formula::final_stats(ctx.input, &state.stats, Some(food));
    formula::effects(ctx.input, &stats).damage
  };
  let mut seed_options = available_foods.clone();
  while seed_attempts < 12 && !seed_options.is_empty() {
    check_cancelled(ctx.cancelled)?;
    if let Some(best) = &evaluation.best {
      seed_options.sort_by(|a, b| {
        score_food(&best.state, b)
          .total_cmp(&score_food(&best.state, a))
          .then(a.id.cmp(&b.id))
      });
    }
    let food = seed_options.remove(0);
    let attempt_started = std::time::Instant::now();
    let previous_damage = evaluation.best.as_ref().map(|best| best.effects.damage);
    let challenger_damage = trace::enabled()
      .then(|| {
        previous_damage.and_then(|_| {
          evaluation.best.as_ref().map(|best| {
            let stats = formula::final_stats(ctx.input, &best.state.stats, Some(food));
            formula::effects(ctx.input, &stats).damage
          })
        })
      })
      .flatten();
    seed_incumbent(ctx, slots, Some(food), &mut evaluation)?;
    seed_attempts += 1;
    let current_damage = evaluation.best.as_ref().map(|best| best.effects.damage);
    let improved = match (previous_damage, current_damage) {
      (Some(previous), Some(current)) => current > previous + ctx.input.parameters.damage_tolerance,
      (None, Some(_)) => true,
      _ => false,
    };
    stagnant_attempts = if improved { 0 } else { stagnant_attempts + 1 };
    trace::emit(
      || serde_json::json!({"event":"exact_seed_food","foodId":food.id,"elapsedMs":attempt_started.elapsed().as_secs_f64() * 1000.0,"challengerDamage":challenger_damage,"bestDamage":evaluation.best.as_ref().map(|candidate| candidate.effects.damage)}),
    );
    // The exact search covers every food; stop only the deterministic lower-bound heuristic.
    if seed_attempts >= 3 && stagnant_attempts >= 2 {
      let promising = evaluation.best.as_ref().is_some_and(|best| {
        seed_options.iter().any(|candidate| {
          score_food(&best.state, candidate)
            > best.effects.damage + ctx.input.parameters.damage_tolerance
        })
      });
      if !promising && evaluation.best.is_some() {
        break;
      }
    }
  }
  if search_without_food {
    seed_incumbent(ctx, slots, None, &mut evaluation)?;
  }
  trace::emit(
    || serde_json::json!({"event":"exact_seed","elapsedMs":seed_started.elapsed().as_secs_f64() * 1000.0,"attempts":seed_attempts,"bestDamage":evaluation.best.as_ref().map(|candidate| candidate.effects.damage)}),
  );
  if let Some(best) = &evaluation.best {
    // Search the foods most promising for the current gear first. Every food is
    // still searched, so this only improves the incumbent and pruning order.
    available_foods.sort_by(|a, b| {
      score_food(&best.state, b)
        .total_cmp(&score_food(&best.state, a))
        .then(a.id.cmp(&b.id))
    });
  }
  let search = |options: Vec<Option<&Food>>,
                mut evaluation: Evaluation|
   -> Result<Evaluation, String> {
    const PREFIX_CACHE_BUDGET_BYTES: usize = 256 * 1024 * 1024;
    const PREFIX_TRANSIENT_BUDGET_BYTES: usize = 1_500 * 1024 * 1024;
    const PREFIX_COLLAPSE_STATE_LIMIT: usize = 60_000;
    let mut prefix_cache = HashMap::<Vec<usize>, Vec<State>>::new();
    let mut prefix_cache_bytes = 0_usize;
    for food in options {
      check_cancelled(ctx.cancelled)?;
      let food_started = std::time::Instant::now();
      let mut ordered = slots.to_vec();
      // A speed-conditioned suffix bound benefits from placing the larger choice sets at the end.
      ordered.sort_by_key(|s| (s.states.len(), s.index));
      let mut duals = duals(ctx, &ordered, food, Some(&weight_candidates));
      if let Some(best) = &evaluation.best {
        if !filter_choices(ctx, &mut ordered, &mut duals, best.effects.damage) {
          trace::emit(
            || serde_json::json!({"event":"exact_food_skipped","foodId":food.map(|value| value.id),"reason":"upper_bound","elapsedMs":food_started.elapsed().as_secs_f64() * 1000.0}),
          );
          continue;
        }
      }
      if ctx.input.job == "BLU" && raw_stat_dominance_is_safe(ctx, &ordered, food) {
        let mut prefix = vec![State {
          stats: ctx.input.base_stats,
          ..State::default()
        }];
        let mut completed = 0;
        let mut signature = Some(Vec::<usize>::new());
        for (depth, slot) in ordered
          .iter()
          .take(ordered.len().saturating_sub(3))
          .enumerate()
        {
          // Source plan Arcs stay alive for this solve; their ordered pointers
          // identify identical filtered choices across different foods.
          let identifiers = slot
            .states
            .iter()
            .map(|state| state.plan.as_ref().map(|plan| Arc::as_ptr(plan) as usize))
            .collect::<Option<Vec<_>>>();
          if let (Some(signature), Some(identifiers)) = (&mut signature, identifiers) {
            signature.extend([slot.index, identifiers.len()]);
            signature.extend(identifiers);
            if let Some(cached) = prefix_cache.get(signature) {
              prefix = cached.clone();
              completed = depth + 1;
              trace::emit(
                || serde_json::json!({"event":"prefix_frontier_cache_hit","depth":completed,"states":prefix.len()}),
              );
              continue;
            }
          } else {
            signature = None;
          }
          let projected = prefix.len().saturating_mul(slot.states.len());
          if projected.saturating_mul(768) > PREFIX_TRANSIENT_BUDGET_BYTES {
            break;
          }
          let started = std::time::Instant::now();
          let merged = prefix
            .iter()
            .flat_map(|state| slot.states.iter().map(move |choice| state.combine(choice)))
            .collect();
          match ctx.prune(merged) {
            Ok(next) => {
              prefix = next;
              completed = depth + 1;
            }
            Err(error) if error == RANGE_ERROR => break,
            Err(error) => return Err(error),
          }
          trace::emit(
            || serde_json::json!({"event":"prefix_frontier_round","depth":depth + 1,"projected":projected,"kept":prefix.len(),"elapsedMs":started.elapsed().as_secs_f64() * 1000.0}),
          );
          // Frontier plans own Arc tree nodes outside State's inline footprint.
          let bytes = prefix
            .len()
            .saturating_mul(std::mem::size_of::<State>() * 2);
          if prefix_cache_bytes.saturating_add(bytes) <= PREFIX_CACHE_BUDGET_BYTES {
            if let Some(signature) = &signature {
              prefix_cache.insert(signature.clone(), prefix.clone());
              prefix_cache_bytes += bytes;
            }
          }
        }
        // A large frontier after only five rounds costs more to build than it saves.
        if completed >= 5 && (completed >= 6 || prefix.len() <= PREFIX_COLLAPSE_STATE_LIMIT) {
          for state in &mut prefix {
            for stat in 0..N {
              state.stats.values[stat] -= ctx.input.base_stats.values[stat];
            }
          }
          ordered.drain(..completed);
          ordered.insert(
            0,
            SlotStates {
              index: usize::MAX,
              states: prefix,
            },
          );
          duals = self::duals(ctx, &ordered, food, Some(&weight_candidates));
          trace::emit(
            || serde_json::json!({"event":"prefix_collapse","mergedSlots":completed,"states":ordered[0].states.len()}),
          );
        }
      }
      let required_raw = inverse_speed(ctx, food, ctx.required, false);
      let maximum_raw = ctx.input.speed_range.map_or(f64::INFINITY, |range| {
        inverse_speed(ctx, food, range.max, true)
      });
      let available = ctx.input.base_stats.get(ctx.speed)
        + ordered
          .iter()
          .map(|slot| {
            slot
              .states
              .iter()
              .map(|s| s.stats.get(ctx.speed))
              .fold(0.0, f64::max)
          })
          .sum::<f64>();
      if required_raw > available || required_raw > maximum_raw {
        trace::emit(
          || serde_json::json!({"event":"exact_food_skipped","foodId":food.map(|value| value.id),"reason":"speed_unreachable","elapsedMs":food_started.elapsed().as_secs_f64() * 1000.0}),
        );
        continue;
      }
      let speed_bounds = speed_bounds(ctx, &ordered, &duals, required_raw)?;
      if let Some(dual) = duals.get(1).or(duals.first()) {
        for slot in &mut ordered {
          slot.states.sort_by(|a, b| {
            dual
              .weights
              .dot(&b.stats)
              .total_cmp(&dual.weights.dot(&a.stats))
              .then(a.change.cmp(&b.change))
          });
        }
      }
      let mut suffix_min = vec![Stats::default(); ordered.len() + 1];
      let mut suffix_max = suffix_min.clone();
      let mut minimum_cost = vec![(0, 0); ordered.len() + 1];
      for i in (0..ordered.len()).rev() {
        suffix_min[i] = suffix_min[i + 1];
        suffix_max[i] = suffix_max[i + 1];
        for s in 0..N {
          let low = ordered[i]
            .states
            .iter()
            .map(|g| g.stats.get(s))
            .fold(f64::INFINITY, f64::min);
          let high = ordered[i]
            .states
            .iter()
            .map(|g| g.stats.get(s))
            .fold(f64::NEG_INFINITY, f64::max);
          if ordered[i].states.iter().any(|g| g.stats.has(s)) {
            let a = suffix_min[i].get(s);
            suffix_min[i].set(s, a + low);
            let b = suffix_max[i].get(s);
            suffix_max[i].set(s, b + high);
          }
        }
        minimum_cost[i] = (
          minimum_cost[i + 1].0
            + ordered[i]
              .states
              .iter()
              .map(|g| g.points)
              .min()
              .unwrap_or(0),
          minimum_cost[i + 1].1 + ordered[i].states.iter().map(|g| g.raid).min().unwrap_or(0),
        );
      }
      // A bounded pair index trades a modest setup allocation for earlier pruning.
      let pair = ordered
        .len()
        .checked_sub(2)
        .and_then(|index| {
          let count = ordered[index]
            .states
            .len()
            .checked_mul(ordered[index + 1].states.len())?;
          ((2_000..=150_000).contains(&count)
            && ordered[index].states.len() <= u16::MAX as usize
            && ordered[index + 1].states.len() <= u16::MAX as usize)
            .then_some(index)
        })
        .map(|index| -> Result<_, String> {
          let mut states =
            Vec::with_capacity(ordered[index].states.len() * ordered[index + 1].states.len());
          for (left, first) in ordered[index].states.iter().enumerate() {
            for (right, second) in ordered[index + 1].states.iter().enumerate() {
              let mut state = first.combine_values(second);
              state.allocation = Some(left as u16);
              state.linked = Some(right as u16);
              states.push(state);
            }
          }
          if raw_stat_dominance_is_safe(ctx, &ordered, food) {
            states = crate::frontier::prune(
              states,
              &ctx.relevant,
              ctx.speed,
              ctx.required,
              ctx.cancelled,
              ctx.input.parameters.frontier_limit,
            )?;
          }
          let paths: Vec<(usize, usize)> = states
            .iter_mut()
            .map(|state| {
              (
                state.allocation.take().unwrap() as usize,
                state.linked.take().unwrap() as usize,
              )
            })
            .collect();
          Ok((
            SlotStates {
              index: usize::MAX,
              states,
            },
            paths,
          ))
        })
        .transpose()?;
      // Include the raw states, pruning scratch space, and the retained tree.
      const TAIL_PRECOMPUTE_BUDGET_BYTES: usize = 768 * 1024 * 1024;
      let triple_started = std::time::Instant::now();
      let triple = ordered
        .len()
        .checked_sub(3)
        .and_then(|index| {
          let (pair_slot, _) = pair.as_ref()?;
          let projected = ordered[index]
            .states
            .len()
            .checked_mul(pair_slot.states.len())?;
          let estimated = projected.checked_mul(std::mem::size_of::<State>() * 3)?;
          (projected >= 20_000
            && estimated <= TAIL_PRECOMPUTE_BUDGET_BYTES
            && ordered[index].states.len() <= u16::MAX as usize
            && raw_stat_dominance_is_safe(ctx, &ordered, food))
          .then_some((index, projected))
        })
        .map(|(index, projected)| -> Result<Option<_>, String> {
          let (pair_slot, pair_paths) = pair.as_ref().unwrap();
          let mut states = Vec::with_capacity(projected);
          for (first_index, first) in ordered[index].states.iter().enumerate() {
            for (pair_index, second) in pair_slot.states.iter().enumerate() {
              let (second_index, third_index) = pair_paths[pair_index];
              let mut state = first.combine_values(second);
              state.allocation = Some(first_index as u16);
              state.linked = Some(second_index as u16);
              state.ring_group = Some(third_index as u16);
              states.push(state);
            }
          }
          let mut states = match crate::frontier::prune(
            states,
            &ctx.relevant,
            ctx.speed,
            ctx.required,
            ctx.cancelled,
            ctx.input.parameters.frontier_limit,
          ) {
            Ok(states) => states,
            Err(error) if error == RANGE_ERROR => return Ok(None),
            Err(error) => return Err(error),
          };
          let paths: Vec<(usize, usize, usize)> = states
            .iter_mut()
            .map(|state| {
              (
                state.allocation.take().unwrap() as usize,
                state.linked.take().unwrap() as usize,
                state.ring_group.take().unwrap() as usize,
              )
            })
            .collect();
          Ok(Some((
            SlotStates {
              index: usize::MAX,
              states,
            },
            paths,
          )))
        })
        .transpose()?
        .flatten();
      let triple_tree = triple
        .as_ref()
        .map(|(slot, _)| LastChoiceTree::new(slot, &ctx.relevant).with_duals(slot, &duals));
      let pair_tree = pair
        .as_ref()
        .map(|(slot, _)| LastChoiceTree::new(slot, &ctx.relevant).with_duals(slot, &duals));
      let last_tree = (pair_tree.is_none()
        && ordered.last().is_some_and(|slot| slot.states.len() > 32))
      .then(|| {
        let slot = ordered.last().unwrap();
        LastChoiceTree::new(slot, &ctx.relevant).with_duals(slot, &duals)
      });
      let damage_table = DamageTable::new(ctx, &ordered, food);
      let mut search = Search {
        ctx,
        slots: &ordered,
        food,
        duals: &duals,
        speed_bounds: &speed_bounds,
        required_raw,
        maximum_raw,
        seen: vec![HashMap::new(); slots.len() + 1],
        suffix_min: &suffix_min,
        suffix_max: &suffix_max,
        minimum_cost: &minimum_cost,
        last_tree: last_tree.as_ref(),
        pair_tree: pair_tree.as_ref(),
        pair_slot: pair.as_ref().map(|(slot, _)| slot),
        pair_paths: pair.as_ref().map(|(_, paths)| paths.as_slice()),
        triple_tree: triple_tree.as_ref(),
        triple_slot: triple.as_ref().map(|(slot, _)| slot),
        triple_paths: triple.as_ref().map(|(_, paths)| paths.as_slice()),
        damage_table: damage_table.as_ref(),
        blu_bonus_range: blu_bonus_range.as_ref(),
        nodes: 0,
        memo_entries: 0,
        metrics: SearchMetrics::default(),
        speed_bounds_enabled: true,
        dual_order: (0..duals.len()).collect(),
        dual_hits: vec![0; duals.len()],
        dual_seen: vec![0; duals.len()],
        dual_order_tuned: false,
        prefer_damage_bound: false,
        evaluation: &mut evaluation,
      };
      trace::emit(|| {
        serde_json::json!({
          "event":"exact_food_ready",
          "foodId":food.map(|value| value.id),
          "slotStateCounts":ordered.iter().map(|slot| slot.states.len()).collect::<Vec<_>>(),
          "pairTreeStates":pair.as_ref().map(|(slot, _)| slot.states.len()),
          "pairSourceStates":ordered.get(ordered.len().saturating_sub(2)).and_then(|first| ordered.last().map(|last| first.states.len() * last.states.len())),
          "tripleTreeStates":triple.as_ref().map(|(slot, _)| slot.states.len()),
          "tripleSetupMs":triple_started.elapsed().as_secs_f64() * 1000.0,
          "damageTable":search.damage_table.is_some(),
          "bestDamage":search.evaluation.best.as_ref().map(|candidate| candidate.effects.damage),
          "setupMs":food_started.elapsed().as_secs_f64() * 1000.0
        })
      });
      let search_started = std::time::Instant::now();
      let search_result = search.visit(
        0,
        State {
          stats: ctx.input.base_stats,
          ..State::default()
        },
        &mut Vec::with_capacity(slots.len()),
      );
      if let Err(error) = search_result {
        trace::emit(|| {
          serde_json::json!({
            "event":"exact_food_error",
            "foodId":food.map(|value| value.id),
            "message":error,
            "nodes":search.nodes,
            "memoEntries":search.memo_entries,
            "memoDepthCounts":search.seen.iter().map(|entries| entries.len()).collect::<Vec<_>>(),
            "visited":search.metrics.visited,
            "dualPruned":search.metrics.dual_pruned,
            "speedBoundPruned":search.metrics.speed_bound_pruned,
            "damagePruned":search.metrics.damage_pruned,
            "memoPruned":search.metrics.memo_pruned,
            "lastTreePruned":search.metrics.last_tree_pruned,
            "lastTreeChecked":search.metrics.last_tree_checked,
            "tailDualPruned":search.metrics.tail_dual_pruned,
            "tailDualChecked":search.metrics.tail_dual_checked,
            "bestDamage":search.evaluation.best.as_ref().map(|candidate| candidate.effects.damage),
            "elapsedMs":food_started.elapsed().as_secs_f64() * 1000.0
          })
        });
        return Err(error);
      }
      trace::emit(|| {
        serde_json::json!({
          "event":"exact_food",
          "foodId":food.map(|value| value.id),
          "slotStateCounts":ordered.iter().map(|slot| slot.states.len()).collect::<Vec<_>>(),
          "nodes":search.nodes,
          "memoEntries":search.memo_entries,
          "memoDepthCounts":search.seen.iter().map(|entries| entries.len()).collect::<Vec<_>>(),
          "visited":search.metrics.visited,
          "dualPruned":search.metrics.dual_pruned,
          "speedBoundPruned":search.metrics.speed_bound_pruned,
          "damagePruned":search.metrics.damage_pruned,
          "memoPruned":search.metrics.memo_pruned,
          "lastTreePruned":search.metrics.last_tree_pruned,
          "lastTreeChecked":search.metrics.last_tree_checked,
          "tailDualPruned":search.metrics.tail_dual_pruned,
          "tailDualChecked":search.metrics.tail_dual_checked,
          "dualChecks":search.metrics.dual_checks,
          "speedBoundChecks":search.metrics.speed_bound_checks,
          "speedBoundEnabled":search.speed_bounds_enabled,
          "damageFirst":search.prefer_damage_bound,
          "setupMs":(food_started.elapsed() - search_started.elapsed()).as_secs_f64() * 1000.0,
          "searchMs":search_started.elapsed().as_secs_f64() * 1000.0,
          "elapsedMs":food_started.elapsed().as_secs_f64() * 1000.0
        })
      });
    }
    Ok(evaluation)
  };
  evaluation = search(
    available_foods
      .into_iter()
      .map(Some)
      .chain(search_without_food.then_some(None))
      .collect(),
    evaluation,
  )?;
  evaluation.result(ctx, skipped)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn blu_bonus_range_covers_every_reachable_lookup_value() {
    let values = [0.0, 4.0, 2.0, 9.0, 3.0];
    let bound = BluBonusRange::new(&values);
    for lower in -2..=7 {
      for upper in lower..=7 {
        let expected = (lower..=upper)
          .map(|index| values.get(index as usize).copied().unwrap_or(0.0))
          .fold(0.0, f64::max);
        assert_eq!(bound.maximum_between(lower as f64, upper as f64), expected);
      }
    }
  }

  #[test]
  fn final_choice_tree_bounds_all_member_states() {
    let slot = SlotStates {
      index: 0,
      states: (0..41)
        .map(|index| {
          let mut stats = Stats::default();
          stats.set(0, (index * 7 % 29) as f64);
          stats.set(5, (index * 11 % 31) as f64);
          stats.set(8, (index * 13 % 37) as f64);
          State {
            stats,
            points: (index * 3 % 17) as i64,
            raid: (index * 5 % 19) as i64,
            ..State::default()
          }
        })
        .collect(),
    };
    let mut weights = [0.0; N];
    weights[0] = 0.1;
    weights[5] = 0.2;
    let dual = Dual {
      weights: SparseWeights::new(weights),
      intercept: 0.0,
      suffix: Vec::new(),
    };
    let tree = LastChoiceTree::new(&slot, &[0, 5, 8]).with_duals(&slot, &[dual]);
    let mut seen = Vec::new();
    for (index, node) in tree.nodes.iter().enumerate() {
      for &choice in &tree.order[node.start..node.end] {
        let state = &slot.states[choice];
        for stat in [0, 5, 8] {
          assert!(node.low.get(stat) <= state.stats.get(stat));
          assert!(node.high.get(stat) >= state.stats.get(stat));
        }
        assert!(node.min_points <= state.points);
        assert!(node.min_raid <= state.raid);
        assert!(tree.dual_max[index][0] + 1e-10 >= dot(&weights, &state.stats));
        if node.left.is_none() {
          seen.push(choice);
        }
      }
    }
    seen.sort_unstable();
    assert_eq!(seen, (0..slot.states.len()).collect::<Vec<_>>());
  }
}
