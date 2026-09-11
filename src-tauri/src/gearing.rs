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
  documents_path: std::path::PathBuf,
  saves: Arc<Mutex<()>>,
  jobs: Mutex<Jobs>,
  permits: Arc<tokio::sync::Semaphore>,
}
impl Default for GearingState {
  fn default() -> Self {
    Self {
      documents_path: std::env::temp_dir().join("ors-gearing-test-documents"),
      saves: Arc::new(Mutex::new(())),
      jobs: Mutex::new(Jobs::default()),
      permits: Arc::new(tokio::sync::Semaphore::new(2)),
    }
  }
}
impl GearingState {
  pub fn clear_documents(&self) -> Result<(), String> {
    let _guard = self.saves.lock().map_err(|e| e.to_string())?;
    match std::fs::remove_dir_all(&self.documents_path) {
      Ok(()) => Ok(()),
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
      Err(error) => Err(error.to_string()),
    }
  }

  pub fn with_documents_path(documents_path: std::path::PathBuf) -> Self {
    Self {
      documents_path,
      ..Self::default()
    }
  }
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
  parameters: Value,
  state: State<'_, GearingState>,
) -> Result<Value, String> {
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
    let result = (|| -> Result<Value, String> {
      let parameters = gearing_engine::parameters::Parameters::from_rules(&parameters)?;
      let mut result = gearing_engine::solve(&parameters, &kind, input, &cancelled);
      if result["status"] == "error" {
        result["status"] = json!(if cancelled.load(Ordering::Relaxed) {
          "cancelled"
        } else if result["message"]
          .as_str()
          .is_some_and(|m| m.contains("range too large"))
        {
          "limited"
        } else {
          "invalid"
        });
      }
      Ok(result)
    })()
    .unwrap_or_else(|message| {
      let status = if cancelled.load(Ordering::Relaxed) {
        "cancelled"
      } else if message.contains("range too large") {
        "limited"
      } else {
        "invalid"
      };
      json!({"status":status,"message":message})
    });
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
  fn ipc_runs_prepared_solver_inputs_and_opaque_storage() {
    let data: Value = serde_json::from_str(
      &std::fs::read_to_string(
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
          .join("../src/features/gearing/data/generated/catalog.json"),
      )
      .unwrap(),
    )
    .unwrap();
    let root = std::env::temp_dir().join(format!("gearing-ipc-{}", std::process::id()));
    let app = tauri::test::mock_builder()
      .manage(GearingState::with_documents_path(root.clone()))
      .invoke_handler(tauri::generate_handler![
        gearing_request,
        optimize_gearing,
        cancel_gearing_optimization
      ])
      .build(tauri::test::mock_context(tauri::test::noop_assets()))
      .unwrap();
    let view = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
      .build()
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
      .map(|r| r.deserialize::<Value>().unwrap())
    };
    let doc = json!({"formatVersion":2,"id":"ipc-test","name":"IPC test","job":"SCH","jobLevel":100,"clan":0,"syncLevel":null,"foodId":null,"potionId":null,"equipment":{"mainHand":{"itemId":49512,"materias":[],"customStats":null,"equipmentLocked":false,"materiaLocked":false}},"alternatives":{}});
    call(
      "gearing_request",
      json!({"operation":"save","input":{"id":"ipc-test","document":doc}}),
    )
    .unwrap();
    let restored = call(
      "gearing_request",
      json!({"operation":"load","input":{"id":"ipc-test"}}),
    )
    .unwrap();
    assert_eq!(restored["equipment"], doc["equipment"]);
    assert!(call(
      "gearing_request",
      json!({"operation":"evaluate","input":{}})
    )
    .is_err());
    let mut request = json!({"kind":"production","requestId":"ipc-search","parameters":data["rules"],"input":{"stats":["CMS","CRL","CP"],"baseStats":{"CMS":0,"CRL":0,"CP":0},"targets":{"CMS":10,"CRL":0,"CP":0},"materias":data["rules"]["materias"],"gears":[{"gearId":1,"slot":3,"baseStats":{},"caps":{"CMS":100,"CRL":100,"CP":100},"slots":[{"allowedGrades":[1,2,3,4,5,6,7,8,9,10,11,12]}]}]}});
    assert_eq!(
      call("optimize_gearing", request.clone()).unwrap()["status"],
      "ok"
    );
    request["kind"] = json!("invalid");
    assert!(call("optimize_gearing", request).is_err());
    tauri::Manager::state::<GearingState>(&app)
      .clear_documents()
      .unwrap();
    assert!(!root.exists());
  }
}

/// Opaque document I/O only. Browsing, validation and ordinary evaluation stay in TS.
#[tauri::command]
pub async fn gearing_request(
  operation: String,
  input: Value,
  state: State<'_, GearingState>,
) -> Result<Value, String> {
  let root = state.documents_path.clone();
  let saves = state.saves.clone();
  tauri::async_runtime::spawn_blocking(move || {
    use crate::gearing_storage as storage;
    match operation.as_str() {
      "list" => storage::list(&root),
      "load" => storage::load(&root, input["id"].as_str().ok_or("Missing document ID.")?),
      "save" => {
        let id = input["id"].as_str().ok_or("Missing document ID.")?;
        let _guard = saves.lock().map_err(|e| e.to_string())?;
        storage::save(&root, id, &input["document"])?;
        Ok(json!({"id":id}))
      }
      _ => Err("Unknown storage operation.".into()),
    }
  })
  .await
  .map_err(|e| e.to_string())?
}
