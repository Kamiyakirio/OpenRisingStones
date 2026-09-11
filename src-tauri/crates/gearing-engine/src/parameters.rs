//! Typed immutable coefficients injected by the catalog owner for each calculation.
use serde_json::Value;
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoefficientsGcd {
  pub base: f64,
  pub speed_scale: f64,
  pub time_units: f64,
  pub base_divisor: f64,
  pub modifier_level: f64,
  pub default_modifier: f64,
  pub modifier_divisor: f64,
  pub result_divisor: f64,
}
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoefficientsEffectsCritical {
  pub chance_scale: f64,
  pub chance_base: f64,
  pub damage_scale: f64,
  pub damage_base: f64,
  pub divisor: f64,
}
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoefficientsEffectsDetermination {
  pub scale: f64,
  pub base: f64,
  pub divisor: f64,
}
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoefficientsEffectsDirectHit {
  pub chance_scale: f64,
  pub divisor: f64,
  pub damage_bonus: f64,
}
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoefficientsEffectsTenacity {
  pub damage_scale: f64,
  pub damage_base: f64,
  pub divisor: f64,
  pub mitigation_scale: f64,
}
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoefficientsEffectsMain {
  pub party_bonus: f64,
  pub damage_base: f64,
  pub divisor: f64,
}
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoefficientsEffectsSpeed {
  pub scale: f64,
  pub base: f64,
  pub divisor: f64,
}
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoefficientsEffectsMp {
  pub scale: f64,
  pub base: f64,
}
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoefficientsEffects {
  pub blue_mimicry: f64,
  pub critical: CoefficientsEffectsCritical,
  pub determination: CoefficientsEffectsDetermination,
  pub direct_hit: CoefficientsEffectsDirectHit,
  pub tenacity: CoefficientsEffectsTenacity,
  pub weapon_divisor: f64,
  pub main: CoefficientsEffectsMain,
  pub potency_scale: f64,
  pub speed: CoefficientsEffectsSpeed,
  pub mp: CoefficientsEffectsMp,
}
#[derive(Clone, Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Coefficients {
  pub rounding_epsilon: f64,
  pub cap_divisor: f64,
  pub det_dht_acceptable_ratio: f64,
  pub gcd: CoefficientsGcd,
  pub effects: CoefficientsEffects,
}
#[derive(Clone, Debug, Default)]
pub struct Parameters {
  pub coefficients: Coefficients,
  pub damage_tolerance: f64,
  pub bound_tolerance: f64,
  pub det_dht_ratio: f64,
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
impl Parameters {
  pub fn from_rules(data: &Value) -> Result<Self, String> {
    let number = |group: &Value, key: &str| {
      group[key]
        .as_f64()
        .filter(|n| n.is_finite() && *n >= 0.0)
        .ok_or_else(|| format!("Invalid gearing parameter: {key}"))
    };
    let search = &data["search"];
    let budget = &data["acquisition"]["progressionBudget"];
    let coefficients: Coefficients =
      serde_json::from_value(data["parameters"].clone()).map_err(|e| e.to_string())?;
    Ok(Self {
      det_dht_ratio: coefficients.det_dht_acceptable_ratio,
      coefficients,
      damage_tolerance: number(search, "gcdOptimizationDamageTolerance")?,
      bound_tolerance: number(search, "gcdOptimizationBoundTolerance")?,
      frontier_limit: number(search, "gcdOptimizationFrontierLimit")? as usize,
      exact_limit: number(search, "gcdOptimizationExactStateLimit")? as usize,
      production_limit: number(search, "productionMateriaSearchStateLimit")? as usize,
      target_min: number(search, "gcdOptimizationMinTargetGcd")?,
      target_max: number(search, "gcdOptimizationMaxTargetGcd")?,
      max_speed: number(search, "gcdOptimizationMaxSpeed")?,
      points_per_week: number(budget, "tomestonesPerWeek")?,
      raid_per_week: number(budget, "raidTokensPerWeek")?,
      weapon_cost: number(budget, "pointWeaponCost")? as i64,
    })
  }
  pub fn floor(&self, value: f64) -> f64 {
    (value + self.coefficients.rounding_epsilon).trunc()
  }
}
