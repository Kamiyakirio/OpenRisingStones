//! Preserve upstream's nested integer truncation, including level and job modifiers.
use crate::parameters::Parameters;
use crate::types::*;
use serde::Serialize;

pub fn gcd(input: &CombatInput, speed: f64) -> f64 {
  let p = &input.parameters.coefficients.gcd;
  let level = &input.rules.level;
  let modifier = if input.job_level as f64 >= p.modifier_level {
    input
      .rules
      .schema
      .stat_modifiers
      .get("gcd")
      .copied()
      .unwrap_or(p.default_modifier)
  } else {
    p.default_modifier
  };
  input.parameters.floor(
    input.parameters.floor(
      (p.base
        - input
          .parameters
          .floor(p.speed_scale * (speed - level.sub) / level.div))
        * p.time_units
        / p.base_divisor,
    ) * modifier
      / p.modifier_divisor,
  ) / p.result_divisor
}
pub fn required_speed(input: &CombatInput) -> f64 {
  let mut low = 0_i64;
  let mut high = 1000_i64;
  while gcd(input, high as f64) > input.target_gcd && high < input.parameters.max_speed as i64 {
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
  let p = &input.parameters.coefficients.effects;
  let schema = &input.rules.schema;
  let level = &input.rules.level;
  let main_stat = schema.main_stat.as_deref().unwrap_or("STR");
  let tank = main_stat == "VIT";
  let attack = if tank { "STR" } else { main_stat };
  let attack_idx = stat_index(attack).unwrap_or(0);
  let blu = if input.job == "BLU" {
    p.blue_mimicry
  } else {
    0.0
  };
  let crt_chance = input.parameters.floor(
    p.critical.chance_scale * (stats.or(5, level.sub) - level.sub) / level.div
      + p.critical.chance_base
      + blu,
  ) / p.critical.divisor;
  let crt_damage = input.parameters.floor(
    p.critical.damage_scale * (stats.or(5, level.sub) - level.sub) / level.div
      + p.critical.damage_base,
  ) / p.critical.divisor;
  let det_damage = input.parameters.floor(
    (p.determination.scale * (stats.or(7, level.main) - level.main) / level.det
      + p.determination.base)
      / level.det_trunc,
  ) * level.det_trunc
    / p.determination.divisor;
  let dht_chance = input
    .parameters
    .floor(p.direct_hit.chance_scale * (stats.or(6, level.sub) - level.sub) / level.div + blu)
    / p.direct_hit.divisor;
  let ten_damage = input.parameters.floor(
    p.tenacity.damage_scale * (stats.or(10, level.sub) - level.sub) / level.div
      + p.tenacity.damage_base,
  ) / p.tenacity.divisor;
  let ten_mitigation = input
    .parameters
    .floor(p.tenacity.mitigation_scale * (stats.or(10, level.sub) - level.sub) / level.div)
    / p.tenacity.divisor;
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
  let weapon_damage = input.parameters.floor(
    level.main * schema.stat_modifiers.get(attack).copied().unwrap_or(100.0) / p.weapon_divisor,
  ) + stats.get(weapon)
    + blu_weapon;
  let main_damage = input.parameters.floor(
    (if tank { level.ap_tank } else { level.ap })
      * (input
        .parameters
        .floor(stats.get(attack_idx) * schema.party_bonus.unwrap_or(p.main.party_bonus))
        - level.main)
      / level.main
      + p.main.damage_base,
  ) / p.main.divisor;
  let damage = p.potency_scale
    * weapon_damage
    * main_damage
    * det_damage
    * ten_damage
    * schema.trait_damage_multiplier.unwrap_or(1.0)
    * ((crt_damage - 1.0) * crt_chance + 1.0)
    * (p.direct_hit.damage_bonus * dht_chance + 1.0);
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
    ss_damage: input
      .parameters
      .floor(p.speed.scale * (speed - level.sub) / level.div + p.speed.base)
      / p.speed.divisor,
    hp: level.hp * schema.stat_modifiers.get("hp").copied().unwrap_or(100.0)
      + input.parameters.floor(
        (if tank { level.vit_tank } else { level.vit }) * (stats.or(4, level.main) - level.main),
      ),
    mp: input
      .parameters
      .floor(p.mp.scale * (stats.or(11, level.main) - level.main) / level.div + p.mp.base),
  }
}
pub fn food_bonus(parameters: &Parameters, stats: &Stats, food: &Food) -> Stats {
  let mut result = Stats::default();
  for i in 0..N {
    if food.stats.has(i) {
      let value = if food.stat_rates.has(i) {
        food
          .stats
          .get(i)
          .min(parameters.floor(stats.get(i) * food.stat_rates.get(i) / 100.0))
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
    result = result.add(&food_bonus(&input.parameters, stats, food));
  }
  for consumable in &input.fixed_consumables {
    result = result.add(&food_bonus(&input.parameters, stats, consumable));
  }
  result
}
