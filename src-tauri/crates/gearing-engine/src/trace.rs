//! Optional structured diagnostics for reproducible gearing performance investigations.
use std::cell::RefCell;

thread_local! {
  static CAPTURE: RefCell<Option<Vec<serde_json::Value>>> = const { RefCell::new(None) };
}

struct CaptureGuard(Option<Vec<serde_json::Value>>);
impl Drop for CaptureGuard {
  fn drop(&mut self) {
    CAPTURE.with(|capture| {
      capture.replace(self.0.take());
    });
  }
}

pub fn enabled() -> bool {
  std::env::var_os("ORS_GEARING_TRACE").is_some()
    || CAPTURE.with(|capture| capture.borrow().is_some())
}

pub fn emit(event: impl FnOnce() -> serde_json::Value) {
  if enabled() {
    let mut event = event();
    event["schemaVersion"] = serde_json::json!(1);
    CAPTURE.with(|capture| {
      if let Some(events) = capture.borrow_mut().as_mut() {
        events.push(event.clone());
      }
    });
    if std::env::var_os("ORS_GEARING_TRACE").is_some() {
      eprintln!("ORS_GEARING_TRACE {event}");
    }
  }
}

pub fn capture<T>(run: impl FnOnce() -> T) -> (T, Vec<serde_json::Value>) {
  let previous = CAPTURE.with(|capture| capture.replace(Some(Vec::new())));
  let guard = CaptureGuard(previous);
  let result = run();
  let events = CAPTURE.with(|capture| capture.replace(None).unwrap_or_default());
  drop(guard);
  (result, events)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn capture_records_ordered_events_and_restores_the_thread() {
    let (result, events) = capture(|| {
      emit(|| serde_json::json!({"event":"first"}));
      emit(|| serde_json::json!({"event":"second"}));
      42
    });
    assert_eq!(result, 42);
    assert_eq!(events.len(), 2);
    assert_eq!(events[0]["event"], "first");
    assert_eq!(events[1]["schemaVersion"], 1);
    CAPTURE.with(|capture| assert!(capture.borrow().is_none()));
  }
}
