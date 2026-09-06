//! Preserve upstream's nested integer truncation, including level and job modifiers.
use crate::parameters::parameters;
use crate::types::*;
use serde::Serialize;

pub fn floor(value: f64) -> f64 {
  (value + parameters().epsilon).trunc()
}
pub fn gcd(input: &CombatInput, speed: f64) -> f64 {
  let p = &parameters().gcd;
  let level = &input.rules.level;
  let modifier = if input.job_level as f64 >= p[4] {
    input
      .rules
      .schema
      .stat_modifiers
      .get("gcd")
      .copied()
      .unwrap_or(p[5])
  } else {
    p[5]
  };
  floor(
    floor((p[0] - floor(p[1] * (speed - level.sub) / level.div)) * p[2] / p[3]) * modifier / p[6],
  ) / p[7]
}
pub fn required_speed(input: &CombatInput) -> f64 {
  let mut low = 0_i64;
  let mut high = 1000_i64;
  while gcd(input, high as f64) > input.target_gcd && high < parameters().max_speed as i64 {
    high *= 2;
  }
  while low < high {
    let mid = (low + high) / 2;
    if gcd(input, mid as f64) <= input.target_gcd {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  low as f64
}
#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Effects {
  pub crt_chance: f64,
  pub crt_damage: f64,
  pub det_damage: f64,
  pub dht_chance: f64,
  pub ten_damage: f64,
  pub ten_mitigation: f64,
  pub damage: f64,
  pub gcd: f64,
  pub ss_damage: f64,
  pub hp: f64,
  pub mp: f64,
}
pub fn effects(input: &CombatInput, stats: &Stats) -> Effects {
  let p = &parameters().effects;
  let schema = &input.rules.schema;
  let level = &input.rules.level;
  let main_stat = schema.main_stat.as_deref().unwrap_or("STR");
  let tank = main_stat == "VIT";
  let attack = if tank { "STR" } else { main_stat };
  let attack_idx = stat_index(attack).unwrap_or(0);
  let blu = if input.job == "BLU" { p[0] } else { p[1] };
  let crt_chance =
    floor(p[2] * (stats.or(5, level.sub) - level.sub) / level.div + p[3] + blu) / p[4];
  let crt_damage = floor(p[5] * (stats.or(5, level.sub) - level.sub) / level.div + p[6]) / p[7];
  let det_damage =
    floor((p[8] * (stats.or(7, level.main) - level.main) / level.det + p[9]) / level.det_trunc)
      * level.det_trunc
      / p[10];
  let dht_chance = floor(p[11] * (stats.or(6, level.sub) - level.sub) / level.div + blu) / p[12];
  let ten_damage = floor(p[13] * (stats.or(10, level.sub) - level.sub) / level.div + p[14]) / p[15];
  let ten_mitigation = floor(p[16] * (stats.or(10, level.sub) - level.sub) / level.div) / p[17];
  let weapon = if main_stat == "MND" || main_stat == "INT" {
    19
  } else {
    18
  };
  let blu_delta = stats.get(2) - input.base_stats.get(2);
  let blu_weapon = if input.job == "BLU" && blu_delta >= 0.0 {
    input
      .rules
      .blu_mdmg_additions
      .get(blu_delta as usize)
      .copied()
      .unwrap_or(0.0)
  } else {
    0.0
  };
  let weapon_damage =
    floor(level.main * schema.stat_modifiers.get(attack).copied().unwrap_or(100.0) / p[18])
      + stats.get(weapon)
      + blu_weapon;
  let main_damage = floor(
    (if tank { level.ap_tank } else { level.ap })
      * (floor(stats.get(attack_idx) * schema.party_bonus.unwrap_or(p[25])) - level.main)
      / level.main
      + p[26],
  ) / p[27];
  let damage = p[28]
    * weapon_damage
    * main_damage
    * det_damage
    * ten_damage
    * schema.trait_damage_multiplier.unwrap_or(1.0)
    * ((crt_damage - p[29]) * crt_chance + p[30])
    * (p[31] * dht_chance + p[32]);
  let speed = stats.or(8, stats.or(9, level.sub));
  Effects {
    crt_chance,
    crt_damage,
    det_damage,
    dht_chance,
    ten_damage,
    ten_mitigation,
    damage,
    gcd: gcd(input, speed),
    ss_damage: floor(p[33] * (speed - level.sub) / level.div + p[34]) / p[35],
    hp: level.hp * schema.stat_modifiers.get("hp").copied().unwrap_or(100.0)
      + floor(
        (if tank { level.vit_tank } else { level.vit }) * (stats.or(4, level.main) - level.main),
      ),
    mp: floor(p[36] * (stats.or(11, level.main) - level.main) / level.div + p[37]),
  }
}
pub fn food_bonus(stats: &Stats, food: &Food) -> Stats {
  let mut result = Stats::default();
  for i in 0..N {
    if food.stats.has(i) {
      let value = if food.stat_rates.has(i) {
        food
          .stats
          .get(i)
          .min(floor(stats.get(i) * food.stat_rates.get(i) / 100.0))
      } else {
        food.stats.get(i)
      };
      result.set(i, value);
    }
  }
  result
}
pub fn final_stats(input: &CombatInput, stats: &Stats, food: Option<&Food>) -> Stats {
  let mut result = *stats;
  if let Some(food) = food {
    result = result.add(&food_bonus(stats, food));
  }
  for consumable in &input.fixed_consumables {
    result = result.add(&food_bonus(stats, consumable));
  }
  result
}
