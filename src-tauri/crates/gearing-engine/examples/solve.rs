//! Line-oriented harness for regression checks and repeatable release measurements.
use std::io::{self, BufRead};
use std::sync::atomic::AtomicBool;
fn main() {
  for line in io::stdin().lock().lines() {
    let output = match line
      .and_then(|line| serde_json::from_str::<serde_json::Value>(&line).map_err(io::Error::other))
    {
      Ok(value) => gearing_engine::solve(
        value["kind"].as_str().unwrap_or(""),
        value["input"].clone(),
        &AtomicBool::new(false),
      ),
      Err(error) => serde_json::json!({"status":"error","message":error.to_string()}),
    };
    println!("{output}");
  }
}
