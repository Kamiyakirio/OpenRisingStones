//! Deterministic Pareto pruning with a balanced spatial index and shared plan trees.
use crate::{check_cancelled, types::*};
use std::{
  collections::HashMap,
  sync::{atomic::AtomicBool, Arc},
};

const MAX_KEY_VALUES: usize = 10;
const MAX_COORDINATES: usize = 10;

/// Inline search keys avoid one heap allocation for every temporary state.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub(crate) struct StateKey {
  values: [i64; MAX_KEY_VALUES],
  len: u8,
}
impl StateKey {
  pub fn new(values: impl IntoIterator<Item = i64>) -> Self {
    let mut key = Self {
      values: [0; MAX_KEY_VALUES],
      len: 0,
    };
    for value in values {
      let index = key.len as usize;
      assert!(index < MAX_KEY_VALUES, "search key exceeds inline capacity");
      key.values[index] = value;
      key.len += 1;
    }
    key
  }
}

#[derive(Clone, Debug)]
pub enum PlanTree {
  Leaf(Plan),
  Join(Arc<PlanTree>, Arc<PlanTree>),
}
#[derive(Clone, Debug, Default)]
pub struct State {
  pub stats: Stats,
  pub plan: Option<Arc<PlanTree>>,
  pub change: i64,
  pub points: i64,
  pub raid: i64,
  pub allocation: Option<u16>,
  pub linked: Option<u16>,
  pub ring_group: Option<u16>,
}
impl State {
  pub fn combine(&self, other: &Self) -> Self {
    let mut combined = self.combine_values(other);
    combined.plan = match (&self.plan, &other.plan) {
      (Some(a), Some(b)) => Some(Arc::new(PlanTree::Join(a.clone(), b.clone()))),
      (a, None) => a.clone(),
      (None, b) => b.clone(),
    };
    combined
  }
  pub fn combine_values(&self, other: &Self) -> Self {
    Self {
      stats: self.stats.add(&other.stats),
      change: self.change + other.change,
      points: self.points + other.points,
      raid: self.raid + other.raid,
      ..Self::default()
    }
  }
  pub fn items(&self) -> Vec<Plan> {
    fn visit(node: &PlanTree, output: &mut Vec<Plan>) {
      match node {
        PlanTree::Leaf(plan) => output.push(plan.clone()),
        PlanTree::Join(a, b) => {
          visit(b, output);
          visit(a, output);
        }
      }
    }
    let mut output = Vec::new();
    if let Some(node) = &self.plan {
      visit(node, &mut output);
    }
    output
  }
}
pub const RANGE_ERROR: &str = "Search range too large; narrow the item level range.";
pub fn unique(
  states: impl IntoIterator<Item = State>,
  relevant: &[usize],
  speed: usize,
  required: f64,
) -> Vec<State> {
  let mut keys = HashMap::<StateKey, usize>::new();
  let mut output: Vec<State> = Vec::new();
  for state in states {
    let key = StateKey::new(
      relevant
        .iter()
        .map(|&s| {
          if s == speed {
            state.stats.get(s).min(required) as i64
          } else {
            state.stats.get(s) as i64
          }
        })
        .chain([state.points, state.raid]),
    );
    if let Some(&i) = keys.get(&key) {
      let a = (state.stats.get(speed) - required).max(0.0);
      let b = (output[i].stats.get(speed) - required).max(0.0);
      if a < b || (a == b && state.change < output[i].change) {
        output[i] = state;
      }
    } else {
      keys.insert(key, output.len());
      output.push(state);
    }
  }
  output
}
#[derive(Clone)]
struct Point {
  index: usize,
  coordinates: [f64; MAX_COORDINATES],
  dimensions: u8,
}
struct Node {
  start: usize,
  end: usize,
  min: [f64; MAX_COORDINATES],
  max: [f64; MAX_COORDINATES],
  dimensions: u8,
  first: usize,
  children: Option<(Box<Node>, Box<Node>)>,
}
impl Node {
  fn build(points: &mut [Point], offset: usize, ranges: Option<&[f64]>, depth: usize) -> Self {
    let dim = points[0].dimensions as usize;
    let mut min = [f64::INFINITY; MAX_COORDINATES];
    let mut max = [f64::NEG_INFINITY; MAX_COORDINATES];
    let mut first = usize::MAX;
    for point in points.iter() {
      first = first.min(point.index);
      for s in 0..dim {
        min[s] = min[s].min(point.coordinates[s]);
        max[s] = max[s].max(point.coordinates[s]);
      }
    }
    let mut node = Node {
      start: offset,
      end: offset + points.len(),
      min,
      max,
      dimensions: dim as u8,
      first,
      children: None,
    };
    if points.len() <= 32 {
      return node;
    }
    let mut root_ranges = [0.0; MAX_COORDINATES];
    for (index, range) in root_ranges.iter_mut().enumerate().take(dim) {
      *range = node.max[index] - node.min[index];
    }
    let ranges = ranges.unwrap_or(&root_ranges[..dim]);
    let mut axis = depth % dim;
    let mut widest = f64::NEG_INFINITY;
    for i in 0..dim {
      let s = (depth + i) % dim;
      let width = if ranges[s] == 0.0 {
        0.0
      } else {
        (node.max[s] - node.min[s]) / ranges[s]
      };
      if width > widest {
        widest = width;
        axis = s;
      }
    }
    let middle = points.len() / 2;
    points.select_nth_unstable_by(middle, |a, b| {
      a.coordinates[axis]
        .total_cmp(&b.coordinates[axis])
        .then(a.index.cmp(&b.index))
    });
    let (left, right) = points.split_at_mut(middle);
    node.children = Some((
      Box::new(Self::build(left, offset, Some(ranges), depth + 1)),
      Box::new(Self::build(right, offset + middle, Some(ranges), depth + 1)),
    ));
    node
  }
  fn dominates(&self, points: &[Point], target: &Point) -> bool {
    let dim = self.dimensions as usize;
    if self.first >= target.index
      || self.max[..dim]
        .iter()
        .zip(&target.coordinates[..dim])
        .any(|(a, b)| a < b)
    {
      return false;
    }
    if self.min[..dim]
      .iter()
      .zip(&target.coordinates[..dim])
      .all(|(a, b)| a >= b)
      && self.min[..dim]
        .iter()
        .zip(&target.coordinates[..dim])
        .any(|(a, b)| a > b)
    {
      return true;
    }
    if let Some((left, right)) = &self.children {
      return left.dominates(points, target) || right.dominates(points, target);
    }
    points[self.start..self.end].iter().any(|p| {
      p.index < target.index
        && p.coordinates[..dim]
          .iter()
          .zip(&target.coordinates[..dim])
          .all(|(a, b)| a >= b)
        && p.coordinates[..dim]
          .iter()
          .zip(&target.coordinates[..dim])
          .any(|(a, b)| a > b)
    })
  }
}
pub fn prune(
  states: Vec<State>,
  relevant: &[usize],
  speed: usize,
  required: f64,
  cancelled: &AtomicBool,
  limit: usize,
) -> Result<Vec<State>, String> {
  check_cancelled(cancelled)?;
  let mut states = unique(states, relevant, speed, required);
  states.sort_by(|a, b| {
    for &s in relevant {
      let av = if s == speed {
        a.stats.get(s).min(required)
      } else {
        a.stats.get(s)
      };
      let bv = if s == speed {
        b.stats.get(s).min(required)
      } else {
        b.stats.get(s)
      };
      let diff = bv.total_cmp(&av);
      if !diff.is_eq() {
        return diff;
      }
    }
    a.points
      .cmp(&b.points)
      .then(a.raid.cmp(&b.raid))
      .then(a.change.cmp(&b.change))
  });
  let mut groups = HashMap::<i64, Vec<Point>>::new();
  for (index, state) in states.iter().enumerate() {
    let mut coordinates = [0.0; MAX_COORDINATES];
    let mut dimensions = 0;
    for &stat in relevant.iter().filter(|&&stat| stat != speed) {
      coordinates[dimensions] = state.stats.get(stat);
      dimensions += 1;
    }
    for value in [
      -(state.stats.get(speed) - required).max(0.0),
      -state.points as f64,
      -state.raid as f64,
      -state.change as f64,
    ] {
      assert!(
        dimensions < MAX_COORDINATES,
        "Pareto point exceeds inline capacity"
      );
      coordinates[dimensions] = value;
      dimensions += 1;
    }
    groups
      .entry(state.stats.get(speed).min(required) as i64)
      .or_default()
      .push(Point {
        index,
        coordinates,
        dimensions: dimensions as u8,
      });
  }
  let mut keep = vec![false; states.len()];
  for points in groups.values_mut() {
    check_cancelled(cancelled)?;
    let tree = Node::build(points, 0, None, 0);
    for point in points.iter() {
      if !tree.dominates(points, point) {
        keep[point.index] = true;
      }
    }
  }
  let output: Vec<_> = states
    .into_iter()
    .enumerate()
    .filter_map(|(i, s)| keep[i].then_some(s))
    .collect();
  if output.len() > limit {
    Err(RANGE_ERROR.into())
  } else {
    Ok(output)
  }
}
