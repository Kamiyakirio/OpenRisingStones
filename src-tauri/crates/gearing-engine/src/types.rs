//! IPC data contracts and compact stat vectors shared by both native solvers.
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::collections::BTreeMap;

pub const STAT_NAMES: [&str; 23] = [
  "STR",
  "DEX",
  "INT",
  "MND",
  "VIT",
  "CRT",
  "DHT",
  "DET",
  "SKS",
  "SPS",
  "TEN",
  "PIE",
  "CMS",
  "CRL",
  "CP",
  "GTH",
  "PCP",
  "GP",
  "PDMG",
  "MDMG",
  "DLY",
  "main",
  "secondary",
];
pub const N: usize = STAT_NAMES.len();
pub fn stat_index(name: &str) -> Result<usize, String> {
  STAT_NAMES
    .iter()
    .position(|s| *s == name)
    .ok_or_else(|| format!("Unknown stat: {name}"))
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Stats {
  pub values: [f64; N],
  pub present: u32,
}
impl Stats {
  pub fn get(&self, index: usize) -> f64 {
    self.values[index]
  }
  pub fn has(&self, index: usize) -> bool {
    self.present & (1 << index) != 0
  }
  pub fn or(&self, index: usize, fallback: f64) -> f64 {
    if self.has(index) {
      self.get(index)
    } else {
      fallback
    }
  }
  pub fn set(&mut self, index: usize, value: f64) {
    self.values[index] = value;
    self.present |= 1 << index;
  }
  pub fn add(&self, other: &Self) -> Self {
    let mut result = *self;
    for i in 0..N {
      result.values[i] += other.values[i];
    }
    result.present |= other.present;
    result
  }
}
impl Serialize for Stats {
  fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
    let values: BTreeMap<_, _> = (0..N)
      .filter(|i| self.has(*i))
      .map(|i| (STAT_NAMES[i], self.values[i]))
      .collect();
    values.serialize(serializer)
  }
}
impl<'de> Deserialize<'de> for Stats {
  fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
    let values = BTreeMap::<String, Option<f64>>::deserialize(deserializer)?;
    let mut result = Self::default();
    for (key, value) in values {
      let i = stat_index(&key).map_err(serde::de::Error::custom)?;
      if let Some(value) = value {
        result.set(i, value);
      }
    }
    Ok(result)
  }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct Materia {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub stat: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub grade: Option<usize>,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Plan {
  pub slot: i32,
  pub gear_id: i64,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub materias: Option<Vec<Materia>>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub custom_stats: Option<Stats>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Food {
  pub id: i64,
  pub name: String,
  pub stats: Stats,
  pub stat_rates: Stats,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GearData {
  pub stats: Stats,
  pub level: f64,
  pub equip_level: f64,
  pub materia_slot: usize,
  #[serde(default)]
  pub materia_advanced: bool,
  #[serde(default)]
  pub customizable: bool,
  #[serde(default)]
  pub equip_level_variable: bool,
  pub occult_stats: Option<Stats>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomRule {
  pub major: f64,
  pub minor: f64,
  pub stat_candidates: Vec<String>,
  pub linked_slot_group: Option<String>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CombatGear {
  #[serde(default)]
  pub materia_locked: bool,
  pub id: i64,
  pub slot: i32,
  pub data: GearData,
  pub materias: Vec<Materia>,
  pub custom_stats: Option<Stats>,
  pub caps: Stats,
  pub sync_caps: Option<Stats>,
  pub custom_rule: Option<CustomRule>,
  pub acquisition: Acquisition,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Acquisition {
  pub kind: String,
  pub ring_exclusivity_group: Option<String>,
  pub tomestone_cost: f64,
  pub raid_cost: f64,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Slot {
  pub slot: i32,
  pub name: String,
  pub ui_group: String,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Schema {
  pub slots: Vec<Slot>,
  pub stats: Vec<String>,
  pub main_stat: Option<String>,
  pub secondary_stat: Option<String>,
  #[serde(default)]
  pub stat_modifiers: BTreeMap<String, f64>,
  pub trait_damage_multiplier: Option<f64>,
  pub party_bonus: Option<f64>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Level {
  pub main: f64,
  pub sub: f64,
  pub div: f64,
  pub det: f64,
  pub det_trunc: f64,
  pub ap: f64,
  pub ap_tank: f64,
  pub hp: f64,
  pub vit: f64,
  pub vit_tank: f64,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CombatRules {
  pub schema: Schema,
  pub level: Level,
  pub job_sync_level: f64,
  pub materias: BTreeMap<String, Vec<f64>>,
  pub materia_grades: Vec<usize>,
  pub materia_grade_required_levels: Vec<f64>,
  pub materia_grade_is_restricted: Vec<bool>,
  #[serde(default)]
  pub blu_mdmg_additions: Vec<f64>,
}
#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
pub struct SpeedRange {
  pub min: f64,
  pub max: f64,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CombatInput {
  #[serde(skip)]
  pub parameters: crate::parameters::Parameters,
  pub mode: String,
  pub target_gcd: f64,
  pub speed_range: Option<SpeedRange>,
  pub progression_weeks: Option<f64>,
  pub job: String,
  pub job_level: u32,
  pub sync_level: Option<f64>,
  pub base_stats: Stats,
  pub current_damage: f64,
  pub current_food_id: Option<i64>,
  pub filtered_ids: Vec<i64>,
  pub equipped_gear_ids_by_slot: Vec<(i32, i64)>,
  pub gears: Vec<CombatGear>,
  pub foods: Vec<Food>,
  pub fixed_consumables: Vec<Food>,
  pub rules: CombatRules,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductionSlot {
  pub allowed_grades: Vec<usize>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductionGear {
  pub gear_id: i64,
  pub slot: i32,
  pub base_stats: Stats,
  pub caps: Stats,
  pub slots: Vec<ProductionSlot>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductionInput {
  #[serde(skip)]
  pub parameters: crate::parameters::Parameters,
  pub stats: [String; 3],
  pub base_stats: Stats,
  pub targets: Stats,
  pub gears: Vec<ProductionGear>,
  pub materias: BTreeMap<String, Vec<f64>>,
}
