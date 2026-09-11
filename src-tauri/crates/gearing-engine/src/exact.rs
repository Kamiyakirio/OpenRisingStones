//! Exact branch-and-bound fallback with discrete, provable log-damage bounds.
//! Every bound scans all reachable integer values, so floors and food caps remain safe.
use crate::{
  check_cancelled,
  combat::{Context, Evaluation, SlotStates},
  formula,
  frontier::{State, RANGE_ERROR},
  types::*,
};
use serde_json::Value;
use std::collections::HashMap;

struct Dual {
  weights: [f64; N],
  intercept: f64,
  suffix: Vec<f64>,
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
    ) + value;
  }
  match stat {
    5 => {
      let chance =
        ctx.input.parameters.floor(
          p.critical.chance_scale * (value - level.sub) / level.div + p.critical.chance_base,
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
        * ctx
          .input
          .parameters
          .floor(p.direct_hit.chance_scale * (value - level.sub) / level.div)
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
  if ctx.input.job == "BLU" {
    return Ok(vec![]);
  }
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
  if ctx.input.job == "BLU" {
    return vec![];
  }
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
        weights,
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
            dot(&bound.weights, &slot.states[a].stats)
              .total_cmp(&dot(&bound.weights, &slot.states[b].stats))
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
        for choice in 0..slots[slot].states.len() {
          indices[slot] = choice;
          let candidate = combine(&indices);
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
              .map(|state| dot(&bound.weights, &state.stats))
              .fold(f64::NEG_INFINITY, f64::max)
          })
          .collect()
      })
      .collect();
    let roots: Vec<_> = bounds
      .iter()
      .zip(&maximums)
      .map(|(bound, values)| {
        bound.intercept + dot(&bound.weights, &ctx.input.base_stats) + values.iter().sum::<f64>()
      })
      .collect();
    let mut changed = false;
    for (index, slot) in slots.iter_mut().enumerate() {
      let old = slot.states.len();
      slot.states.retain(|state| {
        bounds.iter().enumerate().all(|(d, bound)| {
          roots[d] - maximums[d][index] + dot(&bound.weights, &state.stats) >= threshold
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
  for bound in bounds {
    bound.suffix.fill(0.0);
    for i in (0..slots.len()).rev() {
      bound.suffix[i] = bound.suffix[i + 1]
        + slots[i]
          .states
          .iter()
          .map(|s| dot(&bound.weights, &s.stats))
          .fold(f64::NEG_INFINITY, f64::max);
    }
  }
  true
}

struct SpeedBound {
  weights: [f64; N],
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
    let mut weights = bound.weights;
    weights[ctx.speed] = 0.0;
    if output.iter().any(|old| old.weights == weights) {
      continue;
    }
    let intercept = bound.intercept + bound.weights[ctx.speed] * required;
    let mut exact = vec![f64::NEG_INFINITY; needed + 1];
    exact[0] = 0.0;
    let mut suffixes = vec![vec![f64::NEG_INFINITY; needed + 1]; slots.len() + 1];
    suffixes[slots.len()][0] = 0.0;
    for depth in (0..slots.len()).rev() {
      check_cancelled(ctx.cancelled)?;
      let mut next = vec![f64::NEG_INFINITY; needed + 1];
      for state in &slots[depth].states {
        let speed = state.stats.get(ctx.speed) as usize;
        let score = dot(&weights, &state.stats);
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
pub fn optimize(ctx: &Context, slots: &[SlotStates], skipped: bool) -> Result<Value, String> {
  struct Search<'a, 'b> {
    ctx: &'a Context<'b>,
    slots: Vec<SlotStates>,
    food: Option<&'a Food>,
    duals: Vec<Dual>,
    speed_bounds: Vec<SpeedBound>,
    required_raw: f64,
    maximum_raw: f64,
    seen: Vec<HashMap<Vec<i64>, (f64, i64)>>,
    suffix_min: Vec<Stats>,
    suffix_max: Vec<Stats>,
    minimum_cost: Vec<(i64, i64)>,
    nodes: usize,
    evaluation: &'a mut Evaluation,
  }
  impl Search<'_, '_> {
    fn visit(&mut self, index: usize, state: State) -> Result<(), String> {
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
        if self.duals.iter().any(|d| {
          d.intercept + dot(&d.weights, &state.stats) + d.suffix[index]
            < (best.effects.damage - self.ctx.input.parameters.damage_tolerance)
              .max(f64::MIN_POSITIVE)
              .ln()
              - self.ctx.input.parameters.bound_tolerance
        }) {
          return Ok(());
        }
        let needed = (self.required_raw - speed).max(0.0) as usize;
        let threshold = (best.effects.damage - self.ctx.input.parameters.damage_tolerance)
          .max(f64::MIN_POSITIVE)
          .ln()
          - self.ctx.input.parameters.bound_tolerance;
        if self.speed_bounds.iter().any(|bound| {
          bound.intercept + dot(&bound.weights, &state.stats) + bound.suffixes[index][needed]
            < threshold
        }) {
          return Ok(());
        }
        if self.ctx.input.job != "BLU" {
          let stats = formula::final_stats(self.ctx.input, &high, self.food);
          if formula::effects(self.ctx.input, &stats).damage
            < best.effects.damage - self.ctx.input.parameters.damage_tolerance
          {
            return Ok(());
          }
        }
      }
      if index == self.slots.len() {
        self.evaluation.consider(self.ctx, &state, self.food);
        return Ok(());
      }
      // Keep the exact damage dimensions and resource costs; speed above the target favors less overflow.
      let mut key: Vec<_> = self
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
        .collect();
      key.extend([state.points, state.raid]);
      if self.seen[index]
        .get(&key)
        .is_some_and(|&(old_speed, cost)| {
          old_speed < speed || (old_speed == speed && cost <= state.change)
        })
      {
        return Ok(());
      }
      self.seen[index].insert(key, (speed, state.change));
      self.nodes += 1;
      if self.seen[index].len() > self.ctx.input.parameters.exact_limit {
        return Err(RANGE_ERROR.into());
      }
      for i in 0..self.slots[index].states.len() {
        let next = state.combine(&self.slots[index].states[i]);
        if self.ctx.budget(&next) {
          self.visit(index + 1, next)?;
        }
      }
      Ok(())
    }
  }
  let weight_candidates = tuned_weights(ctx, slots)?;
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
  for food in foods.iter().take(12) {
    check_cancelled(ctx.cancelled)?;
    seed_incumbent(ctx, slots, Some(food), &mut evaluation)?;
  }
  seed_incumbent(ctx, slots, None, &mut evaluation)?;
  for food in foods.into_iter().map(Some).chain(std::iter::once(None)) {
    check_cancelled(ctx.cancelled)?;
    let mut ordered = slots.to_vec();
    // A speed-conditioned suffix bound benefits from placing the larger choice sets at the end.
    ordered.sort_by_key(|s| (s.states.len(), s.index));
    let mut duals = duals(ctx, &ordered, food, Some(&weight_candidates));
    if let Some(best) = &evaluation.best {
      if !filter_choices(ctx, &mut ordered, &mut duals, best.effects.damage) {
        continue;
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
      continue;
    }
    let speed_bounds = speed_bounds(ctx, &ordered, &duals, required_raw)?;
    if let Some(dual) = duals.get(1).or(duals.first()) {
      for slot in &mut ordered {
        slot.states.sort_by(|a, b| {
          dot(&dual.weights, &b.stats)
            .total_cmp(&dot(&dual.weights, &a.stats))
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
    Search {
      ctx,
      slots: ordered,
      food,
      duals,
      speed_bounds,
      required_raw,
      maximum_raw,
      seen: vec![HashMap::new(); slots.len() + 1],
      suffix_min,
      suffix_max,
      minimum_cost,
      nodes: 0,
      evaluation: &mut evaluation,
    }
    .visit(
      0,
      State {
        stats: ctx.input.base_stats,
        ..State::default()
      },
    )?;
  }
  evaluation.result(ctx, skipped)
}
