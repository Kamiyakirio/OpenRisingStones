//! Exact DET/DHT distribution search retaining near-optimal alternatives and existing melds.
use crate::{check_cancelled, formula, parameters::parameters, types::*};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{collections::BTreeMap, sync::atomic::AtomicBool};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Input {
  base_stats: Stats,
  gears: Vec<Gear>,
  food: Option<Food>,
  level: Level,
  blu: bool,
  materias: BTreeMap<String, Vec<f64>>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Gear {
  id: i64,
  stats: Stats,
  caps: Stats,
  materias: Vec<Meld>,
  synced: bool,
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Meld {
  stat: Option<String>,
  grade: Option<usize>,
  best_grade: Option<usize>,
}
#[derive(Clone)]
struct Choice {
  pair: (i64, i64),
  cost: i64,
  plan: Vec<(i64, Vec<Option<String>>)>,
}
fn merge(map: &mut BTreeMap<(i64, i64), Choice>, candidate: Choice) {
  match map.get(&candidate.pair) {
    Some(old) if old.cost <= candidate.cost => {}
    _ => {
      map.insert(candidate.pair, candidate);
    }
  }
}
fn choices(input: &Input, gear: &Gear) -> Result<Vec<Choice>, String> {
  let mut states = vec![(0.0, 0.0, 0_i64, Vec::new())];
  for (index, meld) in gear.materias.iter().enumerate() {
    let free = !gear.synced
      && (meld.stat.is_none()
        || meld.stat.as_deref() == Some("DET")
        || meld.stat.as_deref() == Some("DHT"));
    let grades = if free { meld.best_grade } else { meld.grade };
    let candidates: Vec<Option<String>> = if free && grades.is_some() {
      vec![Some("DET".into()), Some("DHT".into())]
    } else {
      vec![meld.stat.clone()]
    };
    let mut next = vec![];
    for (det, dht, cost, plan) in states {
      for stat in &candidates {
        let mut next_plan = plan.clone();
        next_plan.push(stat.clone());
        let amount = if gear.synced {
          0.0
        } else if let (Some(stat), Some(grade)) = (stat, grades) {
          input
            .materias
            .get(stat)
            .and_then(|a| a.get(grade.wrapping_sub(1)))
            .copied()
            .ok_or("Invalid materia value.")?
        } else {
          0.0
        };
        let distance = if free && meld.stat.is_some() && meld.stat != *stat {
          1000 + (gear.materias.len() - index) as i64
        } else {
          0
        };
        next.push((
          det
            + if stat.as_deref() == Some("DET") {
              amount
            } else {
              0.0
            },
          dht
            + if stat.as_deref() == Some("DHT") {
              amount
            } else {
              0.0
            },
          cost + distance,
          next_plan,
        ));
      }
    }
    states = next;
  }
  let mut out = BTreeMap::new();
  for (det, dht, cost, plan) in states {
    let capped =
      |s, raw: f64| gear.stats.get(s) + raw.min((gear.caps.get(s) - gear.stats.get(s)).max(0.0));
    merge(
      &mut out,
      Choice {
        pair: (capped(7, det) as i64, capped(6, dht) as i64),
        cost,
        plan: vec![(gear.id, plan)],
      },
    );
  }
  // A synced or already capped piece must not gain decorative meld changes.
  if out.len() == 1 {
    let state = out.values_mut().next().unwrap();
    state.plan[0].1 = gear.materias.iter().map(|m| m.stat.clone()).collect();
    state.cost = 0;
  }
  Ok(out.into_values().collect())
}
pub fn optimize(input: Input, cancelled: &AtomicBool) -> Result<Value, String> {
  check_cancelled(cancelled)?;
  if input.gears.len() > 32 || input.gears.iter().any(|g| g.materias.len() > 5) {
    return Err("Invalid DET/DHT gear count.".into());
  }
  let initial = Choice {
    pair: (
      input.base_stats.get(7) as i64,
      input.base_stats.get(6) as i64,
    ),
    cost: 0,
    plan: vec![],
  };
  let mut frontier = BTreeMap::from([(initial.pair, initial)]);
  for gear in &input.gears {
    let gear_choices = choices(&input, gear)?;
    let mut next = BTreeMap::new();
    for state in frontier.values() {
      check_cancelled(cancelled)?;
      for choice in &gear_choices {
        let mut plan = state.plan.clone();
        plan.extend(choice.plan.clone());
        merge(
          &mut next,
          Choice {
            pair: (state.pair.0 + choice.pair.0, state.pair.1 + choice.pair.1),
            cost: state.cost + choice.cost,
            plan,
          },
        );
      }
    }
    if next.len() > parameters().frontier_limit {
      return Err("DET/DHT search range too large.".into());
    }
    frontier = next;
  }
  let p = &parameters().effects;
  let mut scored = vec![];
  let mut maximum = 0.0_f64;
  for state in frontier.into_values() {
    check_cancelled(cancelled)?;
    let mut stats = Stats::default();
    stats.set(7, state.pair.0 as f64);
    stats.set(6, state.pair.1 as f64);
    if let Some(food) = &input.food {
      stats = stats.add(&formula::food_bonus(&stats, food));
    }
    let det = formula::floor(
      (p[8] * (stats.get(7) - input.level.main) / input.level.det + p[9]) / input.level.det_trunc,
    ) * input.level.det_trunc
      / p[10];
    let direct = formula::floor(
      p[11] * (stats.get(6) - input.level.sub) / input.level.div
        + if input.blu { p[0] } else { p[1] },
    ) / p[12];
    let damage = det * (p[31] * direct + p[32]);
    maximum = maximum.max(damage);
    scored.push((damage, state, stats));
  }
  let mut unique = BTreeMap::new();
  for (damage, state, stats) in scored {
    if damage <= maximum * parameters().det_dht_ratio {
      continue;
    }
    let key = (stats.get(7) as i64, stats.get(6) as i64);
    if unique
      .get(&key)
      .map_or(true, |(_, old, _): &(f64, Choice, Stats)| {
        state.cost < old.cost
      })
    {
      unique.insert(key, (damage, state, stats));
    }
  }
  let mut best: Vec<_> = unique.into_values().collect();
  best.sort_by(|a, b| {
    b.0
      .total_cmp(&a.0)
      .then(a.1.cost.cmp(&b.1.cost))
      .then(a.1.pair.cmp(&b.1.pair))
  });
  Ok(
    json!({"status":"ok","solutions":best.into_iter().map(|(_,state,stats)|json!({"DET":stats.get(7),"DHT":stats.get(6),"gearMateriaStats":state.plan})).collect::<Vec<_>>()}),
  )
}
