//! Combat equipment and materia enumeration with exact resource and paired-slot constraints.
use crate::{
  check_cancelled, formula,
  frontier::{self, PlanTree, State},
  types::*,
};
use serde_json::{json, Value};
use std::{collections::HashMap, rc::Rc, sync::atomic::AtomicBool};

pub(crate) struct Context<'a> {
  pub input: &'a CombatInput,
  pub speed: usize,
  pub required: f64,
  pub relevant: Vec<usize>,
  pub cancelled: &'a AtomicBool,
  pub charge_slot: Option<i32>,
}
#[derive(Clone)]
pub(crate) struct SlotStates {
  pub index: usize,
  pub states: Vec<State>,
}
impl Context<'_> {
  pub fn budget(&self, state: &State) -> bool {
    self.input.progression_weeks.map_or(true, |w| {
      state.points as f64 <= self.input.parameters.points_per_week * w
        && state.raid as f64 <= self.input.parameters.raid_per_week * w
    })
  }
  fn current(&self, slot: i32) -> Option<&CombatGear> {
    let id = self
      .input
      .equipped_gear_ids_by_slot
      .iter()
      .find(|(s, _)| *s == slot)?
      .1;
    self.input.gears.iter().find(|g| g.id == id)
  }
  fn synced_level(&self, g: &CombatGear) -> Option<f64> {
    let sync = self.input.sync_level.unwrap_or(f64::INFINITY);
    if sync >= g.data.level && self.input.job_level as f64 >= g.data.equip_level {
      return None;
    }
    let job = g.data.level.min(self.input.rules.job_sync_level);
    Some(if g.data.equip_level_variable {
      sync.min(job)
    } else if sync < g.data.level {
      sync
    } else {
      job
    })
  }
  fn base(&self, g: &CombatGear, custom: Option<Stats>) -> Stats {
    let mut stats = Stats::default();
    for i in 0..N {
      if g.data.stats.has(i) {
        let s = if i == 21 {
          self
            .input
            .rules
            .schema
            .main_stat
            .as_deref()
            .and_then(|s| stat_index(s).ok())
            .unwrap_or(i)
        } else if i == 22 {
          self
            .input
            .rules
            .schema
            .secondary_stat
            .as_deref()
            .and_then(|s| stat_index(s).ok())
            .unwrap_or(i)
        } else {
          i
        };
        stats.set(s, g.data.stats.get(i));
      }
    }
    if g.data.customizable {
      if let Some(custom) = custom {
        for i in 0..N {
          if custom.has(i) {
            stats.set(i, custom.get(i));
          }
        }
      }
    }
    if let Some(level) = self.synced_level(g) {
      if let Some(caps) = g.sync_caps {
        for i in 0..N {
          if stats.has(i) {
            stats.set(i, stats.get(i).min(caps.or(i, f64::INFINITY)));
          }
        }
      }
      if level == 700.0 {
        if let Some(occult) = g.data.occult_stats {
          for i in 0..N {
            if occult.has(i) {
              let s = if i == 21 {
                self
                  .input
                  .rules
                  .schema
                  .main_stat
                  .as_deref()
                  .and_then(|s| stat_index(s).ok())
                  .unwrap_or(i)
              } else if i == 22 {
                self
                  .input
                  .rules
                  .schema
                  .secondary_stat
                  .as_deref()
                  .and_then(|s| stat_index(s).ok())
                  .unwrap_or(i)
              } else {
                i
              };
              stats.set(s, stats.get(s) + occult.get(i));
            }
          }
        }
      }
    }
    stats
  }
  fn fixed_stats(&self, g: &CombatGear) -> Stats {
    let mut stats = self.base(g, g.custom_stats);
    if g.sync_caps.is_none() {
      for m in &g.materias {
        if let (Some(stat), Some(grade)) = (&m.stat, m.grade) {
          if let (Ok(i), Some(value)) = (
            stat_index(stat),
            self
              .input
              .rules
              .materias
              .get(stat)
              .and_then(|v| v.get(grade.wrapping_sub(1))),
          ) {
            let base = stats.get(i);
            stats.set(i, (base + value).min(base.max(g.caps.get(i))));
          }
        }
      }
    }
    stats
  }
  fn custom_options(&self, g: &CombatGear) -> Vec<(Stats, String, Option<String>)> {
    let Some(rule) = &g.custom_rule else {
      return vec![];
    };
    let mut out = Vec::new();
    for a in 0..rule.stat_candidates.len() {
      for b in a + 1..rule.stat_candidates.len() {
        for c in 0..rule.stat_candidates.len() {
          if c == a || c == b {
            continue;
          }
          let names = &rule.stat_candidates;
          if let (Ok(aid), Ok(bid), Ok(cid)) = (
            stat_index(&names[a]),
            stat_index(&names[b]),
            stat_index(&names[c]),
          ) {
            let mut stats = Stats::default();
            stats.set(aid, rule.major);
            stats.set(bid, rule.major);
            stats.set(cid, rule.minor);
            out.push((
              stats,
              format!("{},{};{}", names[a], names[b], names[c]),
              rule.linked_slot_group.clone(),
            ));
          }
        }
      }
    }
    out
  }
  fn minimum_speed(&self, g: &CombatGear) -> f64 {
    let options = self.custom_options(g);
    if options.is_empty() {
      self.base(g, g.custom_stats).get(self.speed)
    } else {
      options
        .iter()
        .map(|(s, _, _)| self.base(g, Some(*s)).get(self.speed))
        .fold(f64::INFINITY, f64::min)
    }
  }
  fn gear_states(
    &self,
    g: &CombatGear,
    current: Option<&CombatGear>,
    skip_speed: bool,
  ) -> Result<Vec<State>, String> {
    check_cancelled(self.cancelled)?;
    let change = if current.map(|c| c.id) == Some(g.id) {
      0
    } else {
      100000
    };
    let weapon = self
      .input
      .rules
      .schema
      .slots
      .iter()
      .any(|s| s.slot == g.slot && s.ui_group == "weapon");
    let mut initial = State {
      change,
      ring_group: g.acquisition.ring_exclusivity_group.clone(),
      ..State::default()
    };
    if self.input.progression_weeks.is_some() {
      initial.points = if weapon && g.acquisition.kind == "tomestone" {
        if self.charge_slot == Some(g.slot) {
          self.input.parameters.weapon_cost
        } else {
          0
        }
      } else {
        g.acquisition.tomestone_cost as i64
      };
      initial.raid = g.acquisition.raid_cost as i64;
    }
    let make_plan = |materias, custom_stats| {
      Some(Rc::new(PlanTree::Leaf(Plan {
        slot: g.slot,
        gear_id: g.id,
        materias,
        custom_stats,
      })))
    };
    if g.materia_locked {
      if let Some((_, key, linked)) = self.custom_options(g).into_iter().find(|(stats, _, _)| {
        g.custom_stats
          .is_some_and(|current| current.values == stats.values)
      }) {
        initial.allocation = Some(key);
        initial.linked = linked;
      }
      return Ok(vec![State {
        stats: self.fixed_stats(g),
        plan: make_plan(Some(g.materias.clone()), g.custom_stats),
        ..initial
      }]);
    }
    let custom = self.custom_options(g);
    if !custom.is_empty() {
      return Ok(
        custom
          .into_iter()
          .map(|(stats, key, linked)| {
            let extra = if current.map(|c| c.id) == Some(g.id)
              && current
                .and_then(|c| c.custom_stats)
                .unwrap_or_default()
                .values
                != stats.values
            {
              1
            } else {
              0
            };
            State {
              stats: self.base(g, Some(stats)),
              plan: make_plan(None, Some(stats)),
              allocation: Some(key),
              linked,
              change: change + extra,
              ..initial.clone()
            }
          })
          .collect(),
      );
    }
    let base = self.base(g, g.custom_stats);
    let count = if g.data.materia_advanced {
      5
    } else {
      g.data.materia_slot
    };
    if self.synced_level(g).is_some() || count == 0 {
      return Ok(vec![State {
        stats: base,
        plan: make_plan(None, None),
        ..initial
      }]);
    }
    let mut candidates = vec![5, 7, 6, self.speed];
    if self.input.rules.schema.stats.iter().any(|s| s == "TEN") {
      candidates.push(10);
    }
    candidates.retain(|&s| {
      self
        .input
        .rules
        .schema
        .stats
        .iter()
        .any(|name| name == STAT_NAMES[s])
        && self.input.rules.materias.contains_key(STAT_NAMES[s])
        && !(skip_speed && s == self.speed)
    });
    let current_materias = if current.map(|c| c.id) == Some(g.id) {
      current.map(|c| c.materias.as_slice()).unwrap_or(&[])
    } else {
      &[]
    };
    #[derive(Clone)]
    struct MeldState {
      stats: Stats,
      totals: Stats,
      materias: Vec<Materia>,
      change: i64,
    }
    let mut states = vec![MeldState {
      stats: base,
      totals: Stats::default(),
      materias: vec![],
      change: 0,
    }];
    for slot in 0..count {
      let mut options = vec![Materia::default()];
      let grades = self
        .input
        .rules
        .materia_grades
        .iter()
        .copied()
        .filter(|&grade| {
          g.data.level >= self.input.rules.materia_grade_required_levels[grade - 1]
            && (slot <= g.data.materia_slot
              || !self
                .input
                .rules
                .materia_grade_is_restricted
                .get(grade)
                .copied()
                .unwrap_or(false))
        })
        .take(2);
      for grade in grades {
        for &s in &candidates {
          options.push(Materia {
            stat: Some(STAT_NAMES[s].into()),
            grade: Some(grade),
          });
        }
      }
      if let Some(old) = current_materias.get(slot) {
        if old.stat.is_some() && old.grade.is_some() && !options.contains(old) {
          options.push(old.clone());
        }
      }
      let mut next = Vec::<MeldState>::new();
      let mut keys = HashMap::new();
      for state in states {
        for option in &options {
          let mut totals = state.totals;
          if let (Some(name), Some(grade)) = (&option.stat, option.grade) {
            let s = stat_index(name)?;
            let value = self
              .input
              .rules
              .materias
              .get(name)
              .and_then(|m| m.get(grade.wrapping_sub(1)))
              .ok_or("Invalid equipped materia.")?;
            totals.set(s, totals.get(s) + value);
          }
          let mut stats = base;
          for s in 0..N {
            if totals.has(s) {
              stats.set(
                s,
                (base.get(s) + totals.get(s)).min(base.get(s).max(g.caps.or(s, f64::INFINITY))),
              );
            }
          }
          let cost = state.change
            + if current_materias.get(slot).unwrap_or(&Materia::default()) == option {
              0
            } else {
              1
            };
          let key: Vec<_> = (0..N).map(|s| stats.get(s).to_bits()).collect();
          let mut materias = state.materias.clone();
          materias.push(option.clone());
          let value = MeldState {
            stats,
            totals,
            materias,
            change: cost,
          };
          if let Some(&i) = keys.get(&key) {
            let i: usize = i;
            if cost < next[i].change {
              next[i] = value;
            }
          } else {
            keys.insert(key, next.len());
            next.push(value);
          }
        }
      }
      states = next;
      check_cancelled(self.cancelled)?;
    }
    self.prune(
      states
        .into_iter()
        .map(|s| State {
          stats: s.stats,
          plan: make_plan(Some(s.materias), None),
          change: change + s.change,
          ..initial.clone()
        })
        .collect(),
    )
  }
  pub fn prune(&self, states: Vec<State>) -> Result<Vec<State>, String> {
    frontier::prune(
      states,
      &self.relevant,
      self.speed,
      self.required,
      self.cancelled,
      self.input.parameters.frontier_limit,
    )
  }
  fn grouped_prune(&self, states: Vec<State>, ring: bool) -> Result<Vec<State>, String> {
    let mut groups = Vec::<(Option<String>, Vec<State>)>::new();
    for state in states {
      let key = if ring {
        state.ring_group.clone()
      } else {
        state.allocation.clone()
      };
      if let Some((_, group)) = groups.iter_mut().find(|(k, _)| k == &key) {
        group.push(state);
      } else {
        groups.push((key, vec![state]));
      }
    }
    let mut out = vec![];
    for (_, group) in groups {
      out.extend(self.prune(group)?);
    }
    Ok(out)
  }
  fn pair(&self, a: &SlotStates, b: &SlotStates, ring: bool) -> Result<SlotStates, String> {
    let mut out = vec![];
    for left in &a.states {
      for right in &b.states {
        if ring && left.ring_group.is_some() && left.ring_group == right.ring_group {
          continue;
        }
        if !ring
          && left.linked.is_some()
          && left.linked == right.linked
          && left.allocation.is_some()
          && right.allocation.is_some()
          && left.allocation != right.allocation
        {
          continue;
        }
        out.push(left.combine(right));
        if out.len() > 4_000_000 {
          return Err(frontier::RANGE_ERROR.into());
        }
      }
    }
    Ok(SlotStates {
      index: a.index.min(b.index),
      states: self.prune(out)?,
    })
  }
  fn paired_slots(&self, slots: &mut Vec<SlotStates>, ring: bool) -> Result<(), String> {
    let indices: Vec<_> = slots
      .iter()
      .enumerate()
      .filter(|(_, s)| {
        let slot = &self.input.rules.schema.slots[s.index];
        if ring {
          slot.slot == 12 || slot.slot == 24
        } else {
          slot.ui_group == "weapon" && s.states.iter().any(|s| s.allocation.is_some())
        }
      })
      .map(|(i, _)| i)
      .collect();
    if indices.len() == 2 {
      let combined = self.pair(&slots[indices[0]], &slots[indices[1]], ring)?;
      slots.remove(indices[1]);
      slots.remove(indices[0]);
      slots.push(combined);
    }
    Ok(())
  }
  fn slots(&mut self) -> Result<(Vec<SlotStates>, bool), String> {
    let mut skipped = false;
    let mut choices = Vec::<(usize, Vec<&CombatGear>)>::new();
    if self.input.mode == "current" {
      for &(slot, id) in &self.input.equipped_gear_ids_by_slot {
        if slot == -1 || slot == -2 {
          continue;
        }
        if let Some(g) = self.input.gears.iter().find(|g| g.id == id) {
          if let Some(index) = self
            .input
            .rules
            .schema
            .slots
            .iter()
            .position(|s| s.slot == g.slot)
          {
            choices.push((index, vec![g]));
          }
        }
      }
    } else {
      for (index, slot) in self.input.rules.schema.slots.iter().enumerate() {
        if slot.slot == -1 || slot.slot == -2 {
          continue;
        }
        let mut gears = vec![];
        for id in &self.input.filtered_ids {
          if let Some(g) = self
            .input
            .gears
            .iter()
            .find(|g| g.id == *id && g.slot == slot.slot)
          {
            if g.data.customizable
              && g.custom_rule.is_none()
              && g.custom_stats.map_or(true, |s| s.present == 0)
            {
              skipped = true;
              continue;
            }
            gears.push(g);
          }
        }
        if gears.is_empty() {
          return Err(format!("No usable gear in slot {}.", slot.slot));
        }
        choices.push((index, gears));
      }
      if let Some(weeks) = self.input.progression_weeks {
        let weapons: Vec<_> = choices
          .iter()
          .enumerate()
          .filter(|(_, (i, _))| self.input.rules.schema.slots[*i].ui_group == "weapon")
          .map(|(i, _)| i)
          .collect();
        let force = !weapons.is_empty()
          && weapons
            .iter()
            .all(|&i| choices[i].1.len() == 1 && choices[i].1[0].acquisition.kind == "tomestone");
        if force {
          if weeks * self.input.parameters.points_per_week
            < self.input.parameters.weapon_cost as f64
          {
            return Err("The progression budget cannot purchase the required weapon.".into());
          }
          self.charge_slot = Some(self.input.rules.schema.slots[choices[weapons[0]].0].slot);
        } else {
          for i in weapons {
            choices[i].1.retain(|g| g.acquisition.kind != "tomestone");
            if choices[i].1.is_empty() {
              return Err(
                "Select one tomestone weapon per weapon slot or include a non-tomestone weapon."
                  .into(),
              );
            }
          }
        }
      }
    }
    let minimum = self.input.base_stats.get(self.speed)
      + choices
        .iter()
        .map(|(_, gears)| {
          gears
            .iter()
            .map(|g| self.minimum_speed(g))
            .fold(f64::INFINITY, f64::min)
        })
        .sum::<f64>();
    let mut slots = vec![];
    for (index, gears) in choices {
      let mut states = vec![];
      for gear in gears {
        states.extend(self.gear_states(
          gear,
          if self.input.mode == "current" {
            Some(gear)
          } else {
            self.current(gear.slot)
          },
          minimum >= self.required,
        )?);
      }
      if self.input.mode == "all" {
        states = if self.input.rules.schema.slots[index].slot == 12
          || self.input.rules.schema.slots[index].slot == 24
        {
          self.grouped_prune(states, true)?
        } else if states.iter().any(|s| s.allocation.is_some()) {
          self.grouped_prune(states, false)?
        } else {
          self.prune(states)?
        };
      }
      slots.push(SlotStates { index, states });
    }
    if self.input.mode == "all" {
      self.paired_slots(&mut slots, true)?;
    }
    self.paired_slots(&mut slots, false)?;
    if slots.iter().any(|s| s.states.is_empty()) {
      return Err("No compatible paired gear states.".into());
    }
    if self.input.mode == "all" {
      slots.sort_by_key(|s| (s.states.len(), s.index));
    }
    Ok((slots, skipped))
  }
}

pub(crate) fn better(
  a: &Candidate,
  b: &Candidate,
  speed: usize,
  required: f64,
  tolerance: f64,
) -> bool {
  let diff = a.effects.damage - b.effects.damage;
  if diff.abs() > tolerance {
    return diff > 0.0;
  }
  let ao = (a.stats.get(speed) - required).max(0.0);
  let bo = (b.stats.get(speed) - required).max(0.0);
  if ao != bo {
    return ao < bo;
  }
  if a.change != b.change {
    return a.change < b.change;
  }
  a.food_id.unwrap_or(0) < b.food_id.unwrap_or(0)
}
#[derive(Clone)]
pub(crate) struct Candidate {
  pub state: State,
  pub stats: Stats,
  pub effects: formula::Effects,
  pub food_id: Option<i64>,
  pub food_name: String,
  pub change: i64,
}
pub(crate) struct Evaluation {
  pub best: Option<Candidate>,
  fastest: Option<Candidate>,
  closest: Option<Candidate>,
}
impl Evaluation {
  pub fn new() -> Self {
    Self {
      best: None,
      fastest: None,
      closest: None,
    }
  }
  pub fn consider(&mut self, ctx: &Context, state: &State, food: Option<&Food>) {
    let stats = formula::final_stats(ctx.input, &state.stats, food);
    let effects = formula::effects(ctx.input, &stats);
    let food_id = food.map(|f| f.id);
    let candidate = Candidate {
      state: state.clone(),
      stats,
      effects,
      food_id,
      food_name: food
        .map(|f| f.name.clone())
        .unwrap_or_else(|| "No food".into()),
      change: state.change
        + if ctx.input.current_food_id == food_id {
          0
        } else {
          1
        },
    };
    if self.fastest.as_ref().map_or(true, |old| {
      effects.gcd < old.effects.gcd
        || (effects.gcd == old.effects.gcd && effects.damage > old.effects.damage)
    }) {
      self.fastest = Some(candidate.clone());
    }
    let distance = |s: &Stats| {
      ctx.input.speed_range.map_or(0.0, |r| {
        (r.min - s.get(ctx.speed))
          .max(s.get(ctx.speed) - r.max)
          .max(0.0)
      })
    };
    if self.closest.as_ref().map_or(true, |old| {
      distance(&stats) < distance(&old.stats)
        || (distance(&stats) == distance(&old.stats) && effects.damage > old.effects.damage)
    }) {
      self.closest = Some(candidate.clone());
    }
    if effects.gcd > ctx.input.target_gcd
      || ctx
        .input
        .speed_range
        .is_some_and(|r| stats.get(ctx.speed) < r.min || stats.get(ctx.speed) > r.max)
    {
      return;
    }
    if self.best.as_ref().map_or(true, |old| {
      better(
        &candidate,
        old,
        ctx.speed,
        ctx.required,
        ctx.input.parameters.damage_tolerance,
      )
    }) {
      self.best = Some(candidate);
    }
  }
  pub fn result(self, ctx: &Context, skipped: bool) -> Result<Value, String> {
    let mut result = json!({"mode":ctx.input.mode,"targetGcd":ctx.input.target_gcd,"speedStat":STAT_NAMES[ctx.speed],"requiredSpeed":ctx.required,"customSkipped":skipped});
    if let Some(range) = ctx.input.speed_range {
      result["speedRange"] = json!(range);
    }
    if let Some(best) = self.best {
      let mut plan = best.state.items();
      plan.sort_by_key(|p| {
        ctx
          .input
          .rules
          .schema
          .slots
          .iter()
          .position(|s| s.slot == p.slot)
          .unwrap_or(usize::MAX)
      });
      result["status"] = json!("ok");
      result["stats"] = json!(best.stats);
      result["effects"] = json!(best.effects);
      result["speed"] = json!(best.stats.get(ctx.speed));
      result["damageDelta"] = json!(best.effects.damage - ctx.input.current_damage);
      result["foodName"] = json!(best.food_name);
      result["plan"] = json!(plan);
      if let Some(id) = best.food_id {
        result["foodId"] = json!(id);
      }
      return Ok(result);
    }
    if let Some(fastest) = self.fastest {
      result["status"] = json!("unreachable");
      result["fastestGcd"] = json!(fastest.effects.gcd);
      result["fastestSpeed"] = json!(fastest.stats.get(ctx.speed));
      result["fastestDamage"] = json!(fastest.effects.damage);
      if let Some(closest) = self.closest {
        result["closestGcd"] = json!(closest.effects.gcd);
        result["closestSpeed"] = json!(closest.stats.get(ctx.speed));
      }
      return Ok(result);
    }
    Err("No gear states are available for optimization.".into())
  }
}

pub fn optimize(input: CombatInput, cancelled: &AtomicBool) -> Result<Value, String> {
  check_cancelled(cancelled)?;
  if !["current", "all"].contains(&input.mode.as_str())
    || input.gears.len() > 2000
    || input.rules.schema.slots.len() > 32
    || input.gears.iter().any(|g| g.data.materia_slot > 5)
  {
    return Err("Invalid combat gear input.".into());
  }
  if !(input.parameters.target_min..=input.parameters.target_max).contains(&input.target_gcd) {
    return Err("Target GCD must be between 1.80s and 2.50s.".into());
  }
  if input
    .progression_weeks
    .is_some_and(|w| input.mode != "all" || w.fract() != 0.0 || !(0.0..=10.0).contains(&w))
  {
    return Err("Progression weeks must be an integer from 0 to 10 in all-gear mode.".into());
  }
  if input.speed_range.is_some_and(|r| {
    r.min.fract() != 0.0
      || r.max.fract() != 0.0
      || r.min < 0.0
      || r.max < r.min
      || r.max > input.parameters.max_speed
  }) {
    return Err("Invalid speed stat range.".into());
  }
  if input.rules.level.div <= 0.0
    || input.rules.level.det <= 0.0
    || input.rules.level.main <= 0.0
    || input.rules.level.det_trunc <= 0.0
  {
    return Err("Invalid level modifiers.".into());
  }
  if input.rules.materia_grade_required_levels.len() < 12
    || input
      .rules
      .materia_grades
      .iter()
      .any(|g| !(1..=12).contains(g))
  {
    return Err("Invalid materia grade rules.".into());
  }
  let schema = &input.rules.schema;
  let speed = if schema.stats.iter().any(|s| s == "SPS") {
    9
  } else if schema.stats.iter().any(|s| s == "SKS") {
    8
  } else {
    return Err("This job does not support combat optimization.".into());
  };
  let main = schema
    .main_stat
    .as_deref()
    .ok_or("This job does not support combat optimization.")?;
  let attack = stat_index(if main == "VIT" { "STR" } else { main })?;
  let required = formula::required_speed(&input).max(input.speed_range.map_or(0.0, |r| r.min));
  if input
    .speed_range
    .is_some_and(|r| r.max < input.base_stats.or(speed, input.rules.level.sub) || required > r.max)
  {
    return Err("The speed upper bound is below the required base speed.".into());
  }
  let mut relevant = vec![
    attack,
    if main == "MND" || main == "INT" {
      19
    } else {
      18
    },
    5,
    7,
    6,
    speed,
  ];
  if schema.stats.iter().any(|s| s == "TEN") {
    relevant.push(10);
  }
  let mut ctx = Context {
    input: &input,
    speed,
    required,
    relevant,
    cancelled,
    charge_slot: None,
  };
  let (slots, skipped) = ctx.slots()?;
  let mut states = vec![State {
    stats: input.base_stats,
    ..State::default()
  }];
  for slot in &slots {
    if states.len() * slot.states.len() > input.parameters.frontier_limit * 20 {
      return super::exact::optimize(&ctx, &slots, skipped);
    }
    let combined: Vec<_> = states
      .iter()
      .flat_map(|a| slot.states.iter().map(move |b| a.combine(b)))
      .filter(|s| ctx.budget(s))
      .collect();
    states = match ctx.prune(combined) {
      Ok(states) => states,
      Err(error) if error == frontier::RANGE_ERROR => {
        return super::exact::optimize(&ctx, &slots, skipped)
      }
      Err(error) => return Err(error),
    };
  }
  let mut result = Evaluation::new();
  let mut foods: Vec<_> = input.foods.iter().collect();
  foods.sort_by_key(|f| f.id);
  for state in &states {
    check_cancelled(cancelled)?;
    result.consider(&ctx, state, None);
    for food in &foods {
      result.consider(&ctx, state, Some(food));
    }
  }
  result.result(&ctx, skipped)
}
