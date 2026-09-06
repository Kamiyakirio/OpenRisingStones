//! One compiled parameter pack shared with the frontend's generated JSON.
use serde_json::Value;
use std::sync::OnceLock;

pub struct Parameters {
  pub damage_tolerance: f64,
  pub bound_tolerance: f64,
  pub det_dht_ratio: f64,
  pub epsilon: f64,
  pub gcd: [f64; 8],
  pub effects: [f64; 38],
  pub frontier_limit: usize,
  pub exact_limit: usize,
  pub production_limit: usize,
  pub target_min: f64,
  pub target_max: f64,
  pub max_speed: f64,
  pub points_per_week: f64,
  pub raid_per_week: f64,
  pub weapon_cost: i64,
}
pub fn parameters() -> &'static Parameters {
  static VALUE: OnceLock<Parameters> = OnceLock::new();
  VALUE.get_or_init(|| {
    let data: Value = serde_json::from_str(include_str!(
      "../../../../src/features/gearing/data/generated/rules.json"
    ))
    .expect("Invalid bundled gearing rules.");
    let array = |name: &str| {
      data["formulas"][name]["numbers"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_f64().unwrap())
        .collect::<Vec<_>>()
    };
    let number = |name: &str| data["search"][name].as_f64().unwrap();
    Parameters {
      damage_tolerance: number("gcdOptimizationDamageTolerance"),
      bound_tolerance: number("gcdOptimizationBoundTolerance"),
      det_dht_ratio: data["detDhtAcceptableRatio"].as_f64().unwrap(),
      epsilon: array("floor")[0],
      gcd: array("calcGcd").try_into().unwrap(),
      effects: array("calcEffects").try_into().unwrap(),
      frontier_limit: number("gcdOptimizationFrontierLimit") as usize,
      exact_limit: number("gcdOptimizationExactStateLimit") as usize,
      production_limit: number("productionMateriaSearchStateLimit") as usize,
      target_min: number("gcdOptimizationMinTargetGcd"),
      target_max: number("gcdOptimizationMaxTargetGcd"),
      max_speed: number("gcdOptimizationMaxSpeed"),
      points_per_week: data["acquisition"]["progressionBudget"]["tomestonesPerWeek"]
        .as_f64()
        .unwrap(),
      raid_per_week: data["acquisition"]["progressionBudget"]["raidTokensPerWeek"]
        .as_f64()
        .unwrap(),
      weapon_cost: data["acquisition"]["progressionBudget"]["pointWeaponCost"]
        .as_i64()
        .unwrap(),
    }
  })
}
