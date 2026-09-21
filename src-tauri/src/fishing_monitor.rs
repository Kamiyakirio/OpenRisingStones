//! Publishes cast telemetry to the timer window without depending on frontend polling.
#[cfg(windows)]
use game_bridge_host::fishing::FishingTracker;
use game_bridge_host::{fishing::FishingSample, BridgeError};
use serde::Serialize;
use std::sync::{
  atomic::{AtomicBool, Ordering},
  Arc, Mutex,
};
use tauri::{Emitter, Manager, WebviewWindow};

#[derive(Default)]
pub struct FishingMonitorState(Mutex<Option<Arc<AtomicBool>>>);
impl FishingMonitorState {
  pub fn stop(&self) {
    if let Ok(mut state) = self.0.lock() {
      if let Some(cancel) = state.take() {
        cancel.store(true, Ordering::Release);
      }
    }
  }
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MonitorEvent {
  session_id: String,
  connection: &'static str,
  sample: Option<FishingSample>,
  error_code: Option<&'static str>,
  error_message: Option<String>,
}
fn report_error(window: &WebviewWindow, session_id: &str, error: BridgeError) {
  let code = match &error {
    BridgeError::ProcessNotFound => "process_not_found",
    BridgeError::MultipleProcesses => "multiple_processes",
    BridgeError::Windows { code: 5, .. } => "access_denied",
    BridgeError::InvalidData(_) => "unsupported_game_version",
    BridgeError::ConnectionClosed => "game_closed",
    BridgeError::UnsupportedPlatform => "unsupported_platform",
    _ => "read_failed",
  };
  let _ = window.emit(
    "fishing-timer://sample",
    MonitorEvent {
      session_id: session_id.to_owned(),
      connection: "error",
      sample: None,
      error_code: Some(code),
      error_message: Some(error.to_string()),
    },
  );
}
#[tauri::command]
pub fn start_fishing_monitor(
  window: WebviewWindow,
  process_id: Option<u32>,
  session_id: String,
) -> Result<(), String> {
  if window.label() != "fishing-timer" {
    return Err("Fishing monitoring requires the timer window.".into());
  }
  let state = window.state::<FishingMonitorState>();
  state.stop();
  let cancel = Arc::new(AtomicBool::new(false));
  *state
    .0
    .lock()
    .map_err(|_| "Fishing monitor state is unavailable.")? = Some(cancel.clone());
  std::thread::Builder::new()
    .name("fishing-monitor".into())
    .spawn(move || {
      #[cfg(windows)]
      {
        let result = game_bridge_host::fishing::FishingReader::connect(process_id);
        if cancel.load(Ordering::Acquire) {
          return;
        }
        let reader = match result {
          Ok(reader) => reader,
          Err(error) => {
            report_error(&window, &session_id, error);
            return;
          }
        };
        let clock = std::time::Instant::now();
        let mut tracker = FishingTracker::default();
        let mut catches = game_bridge_host::fishing::FishingCatchReader::default();
        let mut catch_item_id = None;
        let mut catch_sequence = 0;
        let mut last_catch_poll = None;
        let mut catch_available = false;
        let mut previous: Option<FishingSample> = None;
        let mut last_emit = 0;
        while !cancel.load(Ordering::Acquire) {
          let (active, animation) = match reader.sample() {
            Ok(sample) => sample,
            Err(error) => {
              if !cancel.load(Ordering::Acquire) {
                report_error(&window, &session_id, error);
              }
              break;
            }
          };
          let now = clock.elapsed().as_millis() as u64;
          let mut sample = tracker.update(active, animation, now, reader.process_id);
          // Catch polling is slower than bite detection and never prevents the stopwatch working.
          if last_catch_poll.is_none_or(|last| now.saturating_sub(last) >= 250) {
            last_catch_poll = Some(now);
            // Result messages can arrive after the animation has returned to pole-ready (0x10F).
            match catches.poll(&reader, active) {
              Ok(item) => {
                catch_available = true;
                if let Some(item) = item {
                  catch_item_id = Some(item);
                  catch_sequence += 1;
                }
              }
              Err(_) => {
                catch_available = false;
              }
            }
          }
          sample.catch_item_id = catch_item_id;
          sample.catch_sequence = catch_sequence;
          sample.catch_available = catch_available;
          let changed =
            previous.as_ref().map(|p| (p.phase, p.tug)) != Some((sample.phase, sample.tug));
          if (changed || now.saturating_sub(last_emit) >= 250) && !cancel.load(Ordering::Acquire) {
            if window
              .emit(
                "fishing-timer://sample",
                MonitorEvent {
                  session_id: session_id.clone(),
                  connection: "ready",
                  sample: Some(sample.clone()),
                  error_code: None,
                  error_message: None,
                },
              )
              .is_err()
            {
              break;
            }
            previous = Some(sample);
            last_emit = now;
          }
          std::thread::sleep(std::time::Duration::from_millis(50));
        }
      }
      #[cfg(not(windows))]
      {
        let _ = (process_id, cancel);
        report_error(&window, &session_id, BridgeError::UnsupportedPlatform);
      }
    })
    .map_err(|e| e.to_string())?;
  Ok(())
}
#[tauri::command]
pub fn stop_fishing_monitor(window: WebviewWindow) -> Result<(), String> {
  if window.label() != "fishing-timer" {
    return Err("Fishing monitoring requires the timer window.".into());
  }
  window.state::<FishingMonitorState>().stop();
  Ok(())
}
