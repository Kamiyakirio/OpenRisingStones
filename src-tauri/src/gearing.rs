//! Version-checked, cancellable native searches on bounded background threads.
use serde_json::{json, Value};
use std::{
  collections::HashMap,
  sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
  },
};
use tauri::State;

#[derive(Default)]
struct Jobs {
  active: HashMap<String, Arc<AtomicBool>>,
  cancelled: HashMap<String, std::time::Instant>,
}
pub struct GearingState {
  jobs: Mutex<Jobs>,
  permits: Arc<tokio::sync::Semaphore>,
}
impl Default for GearingState {
  fn default() -> Self {
    Self {
      jobs: Mutex::new(Jobs::default()),
      permits: Arc::new(tokio::sync::Semaphore::new(2)),
    }
  }
}
impl GearingState {
  fn begin(&self, id: &str) -> Result<Arc<AtomicBool>, String> {
    let mut jobs = self.jobs.lock().map_err(|e| e.to_string())?;
    jobs
      .cancelled
      .retain(|_, time| time.elapsed().as_secs() < 60);
    if jobs.cancelled.remove(id).is_some() {
      return Err("Optimization cancelled before starting.".into());
    }
    if jobs.active.len() >= 8 || jobs.active.contains_key(id) {
      return Err("Too many gearing requests.".into());
    }
    let flag = Arc::new(AtomicBool::new(false));
    jobs.active.insert(id.into(), flag.clone());
    Ok(flag)
  }
  fn cancel(&self, id: &str) -> Result<(), String> {
    let mut jobs = self.jobs.lock().map_err(|e| e.to_string())?;
    if let Some(flag) = jobs.active.get(id) {
      flag.store(true, Ordering::Relaxed);
    } else {
      // IPC cancellation may arrive before registration; keep a bounded short-lived marker.
      if jobs.cancelled.len() >= 128 {
        if let Some(old) = jobs
          .cancelled
          .iter()
          .min_by_key(|(_, time)| **time)
          .map(|(key, _)| key.clone())
        {
          jobs.cancelled.remove(&old);
        }
      }
      jobs.cancelled.insert(id.into(), std::time::Instant::now());
    }
    Ok(())
  }
}

#[tauri::command]
pub async fn optimize_gearing(
  kind: String,
  request_id: String,
  input: Value,
  data_version: String,
  parameter_version: String,
  state: State<'_, GearingState>,
) -> Result<Value, String> {
  let manifest: Value = serde_json::from_str(include_str!(
    "../../src/features/gearing/data/generated/manifest.json"
  ))
  .map_err(|e| e.to_string())?;
  if manifest["dataVersion"] != data_version || manifest["parameterVersion"] != parameter_version {
    return Err("Gearing data versions do not match; restart the application.".into());
  }
  if !["combat", "production", "det-dht"].contains(&kind.as_str())
    || request_id.is_empty()
    || request_id.len() > 80
  {
    return Err("Invalid gearing optimization request.".into());
  }
  let cancelled = state.begin(&request_id)?;
  let permit = state
    .permits
    .clone()
    .acquire_owned()
    .await
    .map_err(|e| e.to_string())?;
  let output = tauri::async_runtime::spawn_blocking(move || {
    let _permit = permit;
    let start = std::time::Instant::now();
    let result = gearing_engine::solve(&kind, input, &cancelled);
    log::debug!(
      "Gearing {kind} calculation finished in {} ms",
      start.elapsed().as_millis()
    );
    result
  })
  .await
  .unwrap_or_else(
    |error| json!({"status":"error","message":format!("Native gearing task failed: {error}")}),
  );
  state
    .jobs
    .lock()
    .map_err(|e| e.to_string())?
    .active
    .remove(&request_id);
  Ok(output)
}

#[tauri::command]
pub fn cancel_gearing_optimization(
  request_id: String,
  state: State<'_, GearingState>,
) -> Result<(), String> {
  if request_id.len() > 80 {
    return Err("Invalid gearing request ID.".into());
  }
  state.cancel(&request_id)
}

#[cfg(test)]
mod tests {
  use super::*;
  #[test]
  fn cancellation_before_registration_is_retained() {
    let state = GearingState::default();
    state.cancel("early").unwrap();
    assert!(state.begin("early").is_err());
  }
  #[test]
  fn cancellation_signals_a_running_job() {
    let state = GearingState::default();
    let flag = state.begin("active").unwrap();
    state.cancel("active").unwrap();
    assert!(flag.load(Ordering::Relaxed));
  }
  #[test]
  fn queue_is_bounded() {
    let state = GearingState::default();
    for i in 0..8 {
      state.begin(&i.to_string()).unwrap();
    }
    assert!(state.begin("overflow").is_err());
  }

  #[test]
  fn ipc_dispatches_native_search_and_rejects_stale_data() {
    let app = tauri::test::mock_builder()
      .manage(GearingState::default())
      .invoke_handler(tauri::generate_handler![
        optimize_gearing,
        cancel_gearing_optimization
      ])
      .build(tauri::test::mock_context(tauri::test::noop_assets()))
      .unwrap();
    let view = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
      .build()
      .unwrap();
    let manifest: Value = serde_json::from_str(include_str!(
      "../../src/features/gearing/data/generated/manifest.json"
    ))
    .unwrap();
    let rules: Value = serde_json::from_str(include_str!(
      "../../src/features/gearing/data/generated/rules.json"
    ))
    .unwrap();
    let call = |cmd: &str, body: Value| {
      tauri::test::get_ipc_response(
        &view,
        tauri::webview::InvokeRequest {
          cmd: cmd.into(),
          callback: tauri::ipc::CallbackFn(0),
          error: tauri::ipc::CallbackFn(1),
          url: view.url().unwrap(),
          body: tauri::ipc::InvokeBody::Json(body),
          headers: Default::default(),
          invoke_key: tauri::test::INVOKE_KEY.into(),
        },
      )
      .map(|response| response.deserialize::<Value>().unwrap())
    };
    let mut body = json!({"kind":"production","requestId":"ipc-production","dataVersion":manifest["dataVersion"],"parameterVersion":manifest["parameterVersion"],"input":{
        "stats":["CMS","CRL","CP"],"baseStats":{"CMS":0,"CRL":0,"CP":0},"targets":{"CMS":10,"CRL":0,"CP":0},
        "materias":rules["materias"],"gears":[{"gearId":1,"slot":3,"baseStats":{},"caps":{"CMS":100,"CRL":100,"CP":100},"slots":[{"allowedGrades":[1,2,3,4,5,6,7,8,9,10,11,12]}]}]
    }});
    let start = std::time::Instant::now();
    let result = call("optimize_gearing", body.clone()).unwrap();
    println!(
      "Gearing mock IPC round trip: {} us",
      start.elapsed().as_micros()
    );
    assert_eq!(result["status"], "ok");
    assert_eq!(result["plan"][0]["materias"][0]["grade"], 5);
    body["dataVersion"] = json!("stale");
    assert!(call("optimize_gearing", body.clone()).is_err());
    body["dataVersion"] = manifest["dataVersion"].clone();
    body["requestId"] = json!("cancel-before-start");
    call(
      "cancel_gearing_optimization",
      json!({"requestId":"cancel-before-start"}),
    )
    .unwrap();
    assert!(call("optimize_gearing", body).is_err());
  }
}
