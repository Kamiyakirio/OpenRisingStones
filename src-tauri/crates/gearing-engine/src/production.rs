//! Exact production/gathering meld search: tools last, minimum count, then lower grades.
use crate::{check_cancelled, types::*};
use serde_json::{json, Value};
use std::{
  collections::{HashMap, HashSet},
  sync::atomic::AtomicBool,
};

#[derive(Clone)]
struct Choice {
  gains: [i32; 3],
  materias: Vec<Materia>,
  count: usize,
  neatness: usize,
}
type NativePlan = Vec<Vec<Materia>>;
struct Context<'a> {
  input: &'a ProductionInput,
  indices: [usize; 3],
  cancelled: &'a AtomicBool,
}
impl Context<'_> {
  fn value(&self, stat: usize, grade: usize) -> f64 {
    self.input.materias[&self.input.stats[stat]][grade - 1]
  }
  fn best_grade(&self, stat: usize, grades: &[usize], maximum: usize) -> Option<usize> {
    let mut best = None;
    for &grade in grades {
      if grade > maximum {
        continue;
      }
      if best.map_or(true, |old| {
        self.value(stat, grade) > self.value(stat, old)
          || (self.value(stat, grade) == self.value(stat, old) && grade < old)
      }) {
        best = Some(grade);
      }
    }
    best
  }
  fn choices(&self, gear: &ProductionGear, maximum: usize, filled: bool) -> Vec<Choice> {
    fn visit(
      ctx: &Context,
      gear: &ProductionGear,
      maximum: usize,
      filled: bool,
      slot: usize,
      current: &mut Choice,
      raw: &mut [i32; 3],
      counts: &mut [usize; 3],
      out: &mut Vec<Choice>,
      keys: &mut HashMap<[i32; 3], usize>,
    ) {
      if slot == gear.slots.len() {
        let mut choice = current.clone();
        for i in 0..3 {
          choice.gains[i] = raw[i]
            .min((gear.caps.get(ctx.indices[i]) - gear.base_stats.get(ctx.indices[i])) as i32)
            .max(0);
        }
        choice.count = counts.iter().sum();
        choice.neatness = counts.iter().map(|v| v * v).sum();
        if let Some(&old) = keys.get(&choice.gains) {
          if (choice.count, choice.neatness) < (out[old].count, out[old].neatness) {
            out[old] = choice;
          }
        } else {
          keys.insert(choice.gains, out.len());
          out.push(choice);
        }
        return;
      }
      if !filled {
        current.materias[slot] = Materia::default();
        visit(
          ctx,
          gear,
          maximum,
          filled,
          slot + 1,
          current,
          raw,
          counts,
          out,
          keys,
        );
      }
      for i in 0..3 {
        if let Some(grade) = ctx.best_grade(i, &gear.slots[slot].allowed_grades, maximum) {
          current.materias[slot] = Materia {
            stat: Some(ctx.input.stats[i].clone()),
            grade: Some(grade),
          };
          raw[i] += ctx.value(i, grade) as i32;
          counts[i] += 1;
          visit(
            ctx,
            gear,
            maximum,
            filled,
            slot + 1,
            current,
            raw,
            counts,
            out,
            keys,
          );
          raw[i] -= ctx.value(i, grade) as i32;
          counts[i] -= 1;
        }
      }
    }
    let mut choices = Vec::new();
    visit(
      self,
      gear,
      maximum,
      filled,
      0,
      &mut Choice {
        gains: [0; 3],
        materias: vec![Materia::default(); gear.slots.len()],
        count: 0,
        neatness: 0,
      },
      &mut [0; 3],
      &mut [0; 3],
      &mut choices,
      &mut HashMap::new(),
    );
    choices
  }
  fn find(&self, maximum: usize, tools: bool, count: usize) -> Result<Option<NativePlan>, String> {
    let gears: Vec<usize> = self
      .input
      .gears
      .iter()
      .enumerate()
      .filter(|(_, g)| tools || !is_tool(g.slot))
      .map(|(i, _)| i)
      .collect();
    let choices: Vec<_> = gears
      .iter()
      .map(|&i| {
        self.choices(
          &self.input.gears[i],
          maximum,
          tools && !is_tool(self.input.gears[i].slot),
        )
      })
      .collect();
    if choices.iter().any(Vec::is_empty) {
      return Ok(None);
    }
    let mut suffix = vec![[0; 3]; gears.len() + 1];
    let mut minimum = vec![0; gears.len() + 1];
    for i in (0..gears.len()).rev() {
      for s in 0..3 {
        suffix[i][s] = suffix[i + 1][s] + choices[i].iter().map(|c| c.gains[s]).max().unwrap();
      }
      minimum[i] = minimum[i + 1] + choices[i].iter().map(|c| c.count).min().unwrap();
    }
    struct Search<'a> {
      choices: &'a [Vec<Choice>],
      suffix: &'a [[i32; 3]],
      minimum: &'a [usize],
      route: Vec<usize>,
      failed: HashSet<(usize, usize, [i32; 3])>,
      states: usize,
      cancelled: &'a AtomicBool,
    }
    impl Search<'_> {
      fn run(&mut self, index: usize, deficits: [i32; 3], count: usize) -> Result<bool, String> {
        check_cancelled(self.cancelled)?;
        if count < self.minimum[index] {
          return Ok(false);
        }
        if deficits.iter().all(|&v| v <= 0) {
          let mut left = count;
          for i in index..self.choices.len() {
            let (selected, choice) = self.choices[i]
              .iter()
              .enumerate()
              .min_by_key(|(_, c)| (c.count, c.neatness))
              .unwrap();
            if choice.count > left {
              return Ok(false);
            }
            self.route[i] = selected;
            left -= choice.count;
          }
          return Ok(true);
        }
        if index == self.choices.len() || (0..3).any(|s| deficits[s] > self.suffix[index][s]) {
          return Ok(false);
        }
        let key = (index, count, deficits);
        if self.failed.contains(&key) {
          return Ok(false);
        }
        self.states += 1;
        if self.states > crate::parameters::parameters().production_limit {
          return Err("Search range too large; adjust target stats.".into());
        }
        let mut order: Vec<usize> = (0..self.choices[index].len()).collect();
        order.sort_by_key(|&i| {
          let c = &self.choices[index][i];
          (
            -(0..3)
              .map(|s| c.gains[s].min(deficits[s].max(0)))
              .sum::<i32>(),
            c.count,
            c.neatness,
          )
        });
        for i in order {
          let choice = &self.choices[index][i];
          if choice.count > count {
            continue;
          }
          let next = std::array::from_fn(|s| (deficits[s] - choice.gains[s]).max(0));
          let left = count - choice.count;
          self.route[index] = i;
          if self.run(index + 1, next, left)? {
            return Ok(true);
          }
        }
        self.failed.insert(key);
        Ok(false)
      }
    }
    let mut search = Search {
      choices: &choices,
      suffix: &suffix,
      minimum: &minimum,
      route: vec![0; gears.len()],
      failed: HashSet::new(),
      states: 0,
      cancelled: self.cancelled,
    };
    let needed = std::array::from_fn(|s| {
      (self.input.targets.get(self.indices[s]) - self.input.base_stats.get(self.indices[s]))
        .max(0.0) as i32
    });
    if !search.run(0, needed, count)? {
      return Ok(None);
    }
    let mut plan: NativePlan = self
      .input
      .gears
      .iter()
      .map(|g| vec![Materia::default(); g.slots.len()])
      .collect();
    for (i, &gear) in gears.iter().enumerate() {
      plan[gear] = choices[i][search.route[i]].materias.clone();
    }
    Ok(Some(plan))
  }
  fn min_count(&self, tools: bool) -> Result<Option<usize>, String> {
    let gears: Vec<_> = self
      .input
      .gears
      .iter()
      .filter(|g| tools || !is_tool(g.slot))
      .collect();
    let mut low = if tools {
      gears
        .iter()
        .filter(|g| !is_tool(g.slot))
        .map(|g| g.slots.len())
        .sum()
    } else {
      0
    };
    let mut high = gears.iter().map(|g| g.slots.len()).sum();
    if self.find(12, tools, high)?.is_none() {
      return Ok(None);
    }
    while low < high {
      let mid = (low + high) / 2;
      if self.find(12, tools, mid)?.is_none() {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    Ok(Some(low))
  }
  fn calculate(&self, plan: &NativePlan) -> Stats {
    let mut result = self.input.base_stats;
    for (gear, melds) in self.input.gears.iter().zip(plan) {
      for s in 0..3 {
        let raw: f64 = melds
          .iter()
          .filter(|m| m.stat.as_ref() == Some(&self.input.stats[s]))
          .map(|m| self.value(s, m.grade.unwrap()))
          .sum();
        let i = self.indices[s];
        result.set(
          i,
          result.get(i) + raw.min(gear.caps.get(i) - gear.base_stats.get(i)).max(0.0),
        );
      }
    }
    result
  }
  fn reachable(&self, plan: &NativePlan) -> bool {
    let stats = self.calculate(plan);
    self
      .indices
      .iter()
      .all(|&s| stats.get(s) >= self.input.targets.get(s))
  }
  fn lower(&self, plan: &mut NativePlan) -> Result<(), String> {
    for grade in (2..=12).rev() {
      loop {
        check_cancelled(self.cancelled)?;
        let mut best: Option<(usize, usize, usize, f64)> = None;
        for g in 0..plan.len() {
          for m in 0..plan[g].len() {
            if plan[g][m].grade != Some(grade) || plan[g][m].stat.is_none() {
              continue;
            }
            let s = self
              .input
              .stats
              .iter()
              .position(|s| Some(s) == plan[g][m].stat.as_ref())
              .unwrap();
            let mut grades = self.input.gears[g].slots[m].allowed_grades.clone();
            grades.sort();
            for lower in grades {
              if lower >= grade {
                continue;
              }
              plan[g][m].grade = Some(lower);
              let reachable = self.reachable(plan);
              plan[g][m].grade = Some(grade);
              if reachable {
                let loss = self.value(s, grade) - self.value(s, lower);
                if best.map_or(true, |(_, _, old, old_loss)| {
                  lower < old || (lower == old && loss < old_loss)
                }) {
                  best = Some((g, m, lower, loss));
                }
                break;
              }
            }
          }
        }
        if let Some((g, m, lower, _)) = best {
          plan[g][m].grade = Some(lower);
        } else {
          break;
        }
      }
    }
    Ok(())
  }
  fn neatness(&self, plan: &NativePlan) -> usize {
    plan
      .iter()
      .map(|melds| {
        self
          .input
          .stats
          .iter()
          .map(|s| {
            let count = melds.iter().filter(|m| m.stat.as_ref() == Some(s)).count();
            count * count
          })
          .sum::<usize>()
      })
      .sum()
  }
  fn improve(&self, plan: &mut NativePlan, tools: bool) -> Result<(), String> {
    let mut score = self.neatness(plan);
    'improve: loop {
      check_cancelled(self.cancelled)?;
      for a in 0..plan.len() {
        for ai in 0..plan[a].len() {
          let source = plan[a][ai].clone();
          if source.stat.is_none() {
            continue;
          }
          for b in 0..plan.len() {
            if a == b
              || is_tool(self.input.gears[a].slot) != is_tool(self.input.gears[b].slot)
              || (!tools && is_tool(self.input.gears[a].slot))
            {
              continue;
            }
            for bi in 0..plan[b].len() {
              let target = plan[b][bi].clone();
              if source.stat == target.stat
                || !self.input.gears[b].slots[bi]
                  .allowed_grades
                  .contains(&source.grade.unwrap())
              {
                continue;
              }
              if target.stat.is_some()
                && !self.input.gears[a].slots[ai]
                  .allowed_grades
                  .contains(&target.grade.unwrap())
              {
                continue;
              }
              plan[a][ai] = target.clone();
              plan[b][bi] = source.clone();
              let next = self.neatness(plan);
              if next < score && self.reachable(plan) {
                score = next;
                continue 'improve;
              }
              plan[a][ai] = source.clone();
              plan[b][bi] = target;
            }
          }
        }
      }
      break;
    }
    Ok(())
  }
}
fn is_tool(slot: i32) -> bool {
  slot == 1 || slot == 2
}

pub fn optimize(input: ProductionInput, cancelled: &AtomicBool) -> Result<Value, String> {
  check_cancelled(cancelled)?;
  if input.gears.len() > 32 || input.gears.iter().any(|g| g.slots.len() > 5) {
    return Err("Invalid production gear count.".into());
  }
  let indices = [
    stat_index(&input.stats[0])?,
    stat_index(&input.stats[1])?,
    stat_index(&input.stats[2])?,
  ];
  if indices.iter().any(|&i| !(12..=17).contains(&i))
    || indices[0] == indices[1]
    || indices[1] == indices[2]
    || indices[0] == indices[2]
  {
    return Err("Invalid production stat selection.".into());
  }
  for (s, &i) in indices.iter().enumerate() {
    if !input.targets.has(i)
      || input.targets.get(i).fract() != 0.0
      || input.targets.get(i) < 0.0
      || input.targets.get(i) < input.base_stats.get(i)
      || input.targets.get(i) > 100000.0
    {
      return Err("Targets must be nonnegative integers at least equal to base stats and no greater than 100000.".into());
    }
    if input
      .materias
      .get(&input.stats[s])
      .map_or(true, |values| values.len() != 12)
    {
      return Err("Missing materia values.".into());
    }
  }
  if input
    .gears
    .iter()
    .flat_map(|g| &g.slots)
    .flat_map(|s| &s.allowed_grades)
    .any(|g| !(1..=12).contains(g))
  {
    return Err("Invalid materia grade.".into());
  }
  let ctx = Context {
    input: &input,
    indices,
    cancelled,
  };
  let mut tools = false;
  let mut count = ctx.min_count(false)?;
  if count.is_none() {
    tools = true;
    count = ctx.min_count(true)?;
  }
  let Some(count) = count else {
    let mut maximum = input.base_stats;
    for gear in &input.gears {
      for s in 0..3 {
        let raw: f64 = gear
          .slots
          .iter()
          .filter_map(|slot| ctx.best_grade(s, &slot.allowed_grades, 12))
          .map(|g| ctx.value(s, g))
          .sum();
        let i = indices[s];
        maximum.set(
          i,
          maximum.get(i) + raw.min(gear.caps.get(i) - gear.base_stats.get(i)).max(0.0),
        );
      }
    }
    return Ok(json!({"status":"unreachable","maximumStats":maximum}));
  };
  for grade in 1..=12 {
    if let Some(mut plan) = ctx.find(grade, tools, count)? {
      ctx.lower(&mut plan)?;
      ctx.improve(&mut plan, tools)?;
      let result_plan: Vec<_> = input
        .gears
        .iter()
        .zip(&plan)
        .map(|(g, m)| Plan {
          slot: g.slot,
          gear_id: g.gear_id,
          materias: Some(m.clone()),
          custom_stats: None,
        })
        .collect();
      return Ok(
        json!({"status":"ok","stats":ctx.calculate(&plan),"plan":result_plan,"usesTools":tools}),
      );
    }
  }
  Err("Could not generate a feasible materia plan.".into())
}
