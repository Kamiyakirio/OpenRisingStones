//! Native gearing searches, adapted from the MIT-licensed ffxiv-gearing project.
//! Game tables come from the bundled generated data package; all search runs on native threads.
mod combat;
mod det_dht;
mod exact;
mod formula;
mod frontier;
mod parameters;
mod production;
mod types;

use serde_json::{json, Value};
use std::sync::atomic::{AtomicBool, Ordering};
pub use types::*;

pub fn solve(kind: &str, input: Value, cancelled: &AtomicBool) -> Value {
  let result = match kind {
    "combat" => serde_json::from_value::<CombatInput>(input)
      .map_err(|e| format!("Invalid combat input: {e}"))
      .and_then(|input| combat::optimize(input, cancelled)),
    "production" => serde_json::from_value::<ProductionInput>(input)
      .map_err(|e| format!("Invalid production input: {e}"))
      .and_then(|input| production::optimize(input, cancelled)),
    "det-dht" => serde_json::from_value::<det_dht::Input>(input)
      .map_err(|e| format!("Invalid DET/DHT input: {e}"))
      .and_then(|input| det_dht::optimize(input, cancelled)),
    _ => Err("Unknown gearing optimization kind.".to_owned()),
  };
  result.unwrap_or_else(|message| json!({ "status": "error", "message": message }))
}

pub(crate) fn check_cancelled(cancelled: &AtomicBool) -> Result<(), String> {
  if cancelled.load(Ordering::Relaxed) {
    Err("Optimization cancelled.".into())
  } else {
    Ok(())
  }
}
