//! Deterministic Pareto pruning with a balanced spatial index and shared plan trees.
use crate::{check_cancelled, types::*};
use std::{collections::HashMap, rc::Rc, sync::atomic::AtomicBool};

#[derive(Clone, Debug)]
pub enum PlanTree {
  Leaf(Plan),
  Join(Rc<PlanTree>, Rc<PlanTree>),
}
#[derive(Clone, Debug, Default)]
pub struct State {
  pub stats: Stats,
  pub plan: Option<Rc<PlanTree>>,
  pub change: i64,
  pub points: i64,
  pub raid: i64,
  pub allocation: Option<String>,
  pub linked: Option<String>,
  pub ring_group: Option<String>,
}
impl State {
  pub fn combine(&self, other: &Self) -> Self {
    Self {
      stats: self.stats.add(&other.stats),
      change: self.change + other.change,
      points: self.points + other.points,
      raid: self.raid + other.raid,
      plan: match (&self.plan, &other.plan) {
        (Some(a), Some(b)) => Some(Rc::new(PlanTree::Join(a.clone(), b.clone()))),
        (a, None) => a.clone(),
        (None, b) => b.clone(),
      },
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
  let mut keys = HashMap::<Vec<i64>, usize>::new();
  let mut output: Vec<State> = Vec::new();
  for state in states {
    let mut key: Vec<_> = relevant
      .iter()
      .map(|&s| {
        if s == speed {
          state.stats.get(s).min(required) as i64
        } else {
          state.stats.get(s) as i64
        }
      })
      .collect();
    key.push(state.points);
    key.push(state.raid);
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
  coordinates: Vec<f64>,
}
struct Node {
  start: usize,
  end: usize,
  min: Vec<f64>,
  max: Vec<f64>,
  first: usize,
  children: Option<(Box<Node>, Box<Node>)>,
}
impl Node {
  fn build(points: &mut [Point], offset: usize, ranges: Option<&[f64]>, depth: usize) -> Self {
    let dim = points[0].coordinates.len();
    let mut min = vec![f64::INFINITY; dim];
    let mut max = vec![f64::NEG_INFINITY; dim];
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
      first,
      children: None,
    };
    if points.len() <= 32 {
      return node;
    }
    let root_ranges: Vec<_> = (0..dim).map(|s| node.max[s] - node.min[s]).collect();
    let ranges = ranges.unwrap_or(&root_ranges);
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
    if self.first >= target.index || self.max.iter().zip(&target.coordinates).any(|(a, b)| a < b) {
      return false;
    }
    if self
      .min
      .iter()
      .zip(&target.coordinates)
      .all(|(a, b)| a >= b)
      && self.min.iter().zip(&target.coordinates).any(|(a, b)| a > b)
    {
      return true;
    }
    if let Some((left, right)) = &self.children {
      return left.dominates(points, target) || right.dominates(points, target);
    }
    points[self.start..self.end].iter().any(|p| {
      p.index < target.index
        && p
          .coordinates
          .iter()
          .zip(&target.coordinates)
          .all(|(a, b)| a >= b)
        && p
          .coordinates
          .iter()
          .zip(&target.coordinates)
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
    let mut coordinates: Vec<_> = relevant
      .iter()
      .filter(|&&s| s != speed)
      .map(|&s| state.stats.get(s))
      .collect();
    coordinates.extend([
      -(state.stats.get(speed) - required).max(0.0),
      -state.points as f64,
      -state.raid as f64,
      -state.change as f64,
    ]);
    groups
      .entry(state.stats.get(speed).min(required) as i64)
      .or_default()
      .push(Point { index, coordinates });
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
