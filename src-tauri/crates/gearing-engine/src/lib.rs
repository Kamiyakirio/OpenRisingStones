//! Native gearing searches, adapted from the MIT-licensed ffxiv-gearing project.
//! Each request receives its complete game-data snapshot from TypeScript; searches run on native threads.
mod combat;
mod det_dht;
mod exact;
mod formula;
mod frontier;
pub mod parameters;
mod production;
mod trace;
mod types;

use serde_json::{json, Value};
use std::sync::atomic::{AtomicBool, Ordering};
pub use types::*;

pub fn solve(
  parameters: &parameters::Parameters,
  kind: &str,
  input: Value,
  cancelled: &AtomicBool,
) -> Value {
  let result = match kind {
    "combat" => serde_json::from_value::<CombatInput>(input)
      .map_err(|e| format!("Invalid combat input: {e}"))
      .and_then(|mut input| {
        input.parameters = parameters.clone();
        combat::optimize(input, cancelled)
      }),
    "production" => serde_json::from_value::<ProductionInput>(input)
      .map_err(|e| format!("Invalid production input: {e}"))
      .and_then(|mut input| {
        input.parameters = parameters.clone();
        production::optimize(input, cancelled)
      }),
    "det-dht" => serde_json::from_value::<det_dht::Input>(input)
      .map_err(|e| format!("Invalid DET/DHT input: {e}"))
      .and_then(|mut input| {
        input.parameters = parameters.clone();
        det_dht::optimize(input, cancelled)
      }),
    _ => Err("Unknown gearing optimization kind.".to_owned()),
  };
  result.unwrap_or_else(|message| json!({ "status": "error", "message": message }))
}

/// Captures internal stages for debug benchmarks without changing the regular solver API.
pub fn solve_with_diagnostics(
  parameters: &parameters::Parameters,
  kind: &str,
  input: Value,
  cancelled: &AtomicBool,
) -> (Value, Vec<Value>) {
  trace::capture(|| solve(parameters, kind, input, cancelled))
}

pub(crate) fn check_cancelled(cancelled: &AtomicBool) -> Result<(), String> {
  if cancelled.load(Ordering::Relaxed) {
    Err("Optimization cancelled.".into())
  } else {
    Ok(())
  }
}
