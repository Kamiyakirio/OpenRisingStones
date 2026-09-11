//! Line-oriented harness for testing the exact same complete request passed over IPC.
use std::io::{self, BufRead};
use std::sync::atomic::AtomicBool;
fn main() {
  for line in io::stdin().lock().lines() {
    let result = (|| -> Result<serde_json::Value, String> {
      let mut value: serde_json::Value =
        serde_json::from_str(&line.map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
      let parameters = gearing_engine::parameters::Parameters::from_rules(&value["parameters"])?;
      let input = value["input"].take();
      Ok(gearing_engine::solve(
        &parameters,
        value["kind"].as_str().unwrap_or(""),
        input,
        &AtomicBool::new(false),
      ))
    })();
    println!(
      "{}",
      result.unwrap_or_else(|message| serde_json::json!({"status":"error","message":message}))
    );
  }
}
