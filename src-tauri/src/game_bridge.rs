//! Thin Tauri adapter for the standalone Windows game bridge workspace.

use serde::Deserialize;
#[cfg(windows)]
use std::path::PathBuf;
use tauri::AppHandle;
#[cfg(windows)]
use tauri::Manager;

#[cfg(windows)]
use game_bridge_host::{BridgeManager, ConnectOptions, RegionTarget, SecretValue};
#[cfg(windows)]
use std::sync::Arc;
#[cfg(windows)]
use tauri::Emitter;

#[cfg(windows)]
const STATUS_EVENT: &str = "game-bridge://status";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectRequest {
  process_id: Option<u32>,
  manifest_file: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchRegionRequest {
  region_name: String,
  lobby_host: String,
  save_data_host: String,
  gm_host: String,
  game_session: String,
}

pub struct GameBridgeState {
  #[cfg(windows)]
  manager: Arc<BridgeManager>,
  #[cfg(windows)]
  asset_root: PathBuf,
}

impl GameBridgeState {
  pub fn new(app_handle: AppHandle) -> Result<Self, std::io::Error> {
    #[cfg(windows)]
    {
      let manager = BridgeManager::new();
      let event_handle = app_handle.clone();
      manager.observe(Arc::new(move |status| {
        let _ = event_handle.emit(STATUS_EVENT, status);
      }));
      #[cfg(debug_assertions)]
      let asset_root = std::env::var_os("ORS_GAME_BRIDGE_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
          PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("game-bridge")
            .join("artifacts")
            .join("Debug")
            .join("game-bridge")
        });
      #[cfg(not(debug_assertions))]
      let asset_root = app_handle
        .path()
        .resource_dir()
        .map_err(|error| std::io::Error::other(error.to_string()))?
        .join("game-bridge");
      Ok(Self {
        manager,
        asset_root,
      })
    }
    #[cfg(not(windows))]
    {
      let _ = app_handle;
      Ok(Self {})
    }
  }
}

#[cfg(windows)]
fn serialize<T: serde::Serialize>(value: T) -> Result<serde_json::Value, String> {
  serde_json::to_value(value).map_err(|error| error.to_string())
}

#[cfg(windows)]
#[tauri::command]
pub fn game_bridge_status(
  state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  serialize(state.manager.status())
}

#[cfg(not(windows))]
#[tauri::command]
pub fn game_bridge_status(
  _state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  Err("The game bridge is only supported on Windows.".to_owned())
}

#[cfg(windows)]
#[tauri::command]
pub async fn game_bridge_connect(
  state: tauri::State<'_, GameBridgeState>,
  request: ConnectRequest,
) -> Result<serde_json::Value, String> {
  let manager = Arc::clone(&state.manager);
  let manifest_file = validate_manifest_file(&request.manifest_file)?;
  let asset_root = state.asset_root.clone();
  tauri::async_runtime::spawn_blocking(move || {
    manager
      .connect(ConnectOptions {
        process_id: request.process_id,
        payload_path: asset_root.join("game_bridge_payload.dll"),
        manifest_path: asset_root.join("manifests").join(manifest_file),
        world_map_path: asset_root.join("worlds-cn.json"),
      })
      .map_err(|error| error.to_string())
      .and_then(serialize)
  })
  .await
  .map_err(|error| error.to_string())?
}

#[cfg(windows)]
fn validate_manifest_file(value: &str) -> Result<String, String> {
  let path = std::path::Path::new(value);
  let is_single_component = path.components().count() == 1 && path.file_name().is_some();
  let is_safe_name = value
    .bytes()
    .all(|character| character.is_ascii_alphanumeric() || matches!(character, b'.' | b'_' | b'-'));
  if !is_single_component || !is_safe_name || !value.ends_with(".json") {
    return Err("The manifest file name is invalid.".to_owned());
  }
  Ok(value.to_owned())
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn game_bridge_connect(
  _state: tauri::State<'_, GameBridgeState>,
  _request: ConnectRequest,
) -> Result<serde_json::Value, String> {
  Err("The game bridge is only supported on Windows.".to_owned())
}

#[cfg(windows)]
#[tauri::command]
pub async fn game_bridge_capture_snapshot(
  state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  let manager = Arc::clone(&state.manager);
  tauri::async_runtime::spawn_blocking(move || {
    manager
      .capture_snapshot()
      .map_err(|error| error.to_string())
      .and_then(serialize)
  })
  .await
  .map_err(|error| error.to_string())?
}

#[cfg(windows)]
#[tauri::command]
pub async fn game_bridge_capture_active_character(
  state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  let manager = Arc::clone(&state.manager);
  tauri::async_runtime::spawn_blocking(move || {
    manager
      .capture_active_character()
      .map_err(|error| error.to_string())
      .and_then(serialize)
  })
  .await
  .map_err(|error| error.to_string())?
}

#[cfg(windows)]
#[tauri::command]
pub async fn game_bridge_capture_inventory(
  state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  let manager = Arc::clone(&state.manager);
  tauri::async_runtime::spawn_blocking(move || {
    manager
      .capture_inventory()
      .map_err(|error| error.to_string())
      .and_then(serialize)
  })
  .await
  .map_err(|error| error.to_string())?
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn game_bridge_capture_inventory(
  _state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  Err("The game bridge is only supported on Windows.".to_owned())
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn game_bridge_capture_active_character(
  _state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  Err("The game bridge is only supported on Windows.".to_owned())
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn game_bridge_capture_snapshot(
  _state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  Err("The game bridge is only supported on Windows.".to_owned())
}

#[cfg(windows)]
#[tauri::command]
pub async fn game_bridge_return_to_title(
  state: tauri::State<'_, GameBridgeState>,
) -> Result<(), String> {
  let manager = Arc::clone(&state.manager);
  tauri::async_runtime::spawn_blocking(move || {
    manager.return_to_title().map_err(|error| error.to_string())
  })
  .await
  .map_err(|error| error.to_string())?
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn game_bridge_return_to_title(
  _state: tauri::State<'_, GameBridgeState>,
) -> Result<(), String> {
  Err("The game bridge is only supported on Windows.".to_owned())
}

#[cfg(windows)]
#[tauri::command]
pub async fn game_bridge_switch_region(
  state: tauri::State<'_, GameBridgeState>,
  request: SwitchRegionRequest,
) -> Result<String, String> {
  let manager = Arc::clone(&state.manager);
  tauri::async_runtime::spawn_blocking(move || {
    manager
      .switch_region(RegionTarget {
        region_name: request.region_name,
        lobby_host: request.lobby_host,
        save_data_host: request.save_data_host,
        gm_host: request.gm_host,
        game_session: SecretValue::new(request.game_session),
      })
      .map_err(|error| error.to_string())
  })
  .await
  .map_err(|error| error.to_string())?
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn game_bridge_switch_region(
  _state: tauri::State<'_, GameBridgeState>,
  _request: SwitchRegionRequest,
) -> Result<String, String> {
  Err("The game bridge is only supported on Windows.".to_owned())
}

#[cfg(windows)]
#[tauri::command]
pub async fn game_bridge_trigger_login(
  state: tauri::State<'_, GameBridgeState>,
) -> Result<(), String> {
  let manager = Arc::clone(&state.manager);
  tauri::async_runtime::spawn_blocking(move || {
    manager.trigger_login().map_err(|error| error.to_string())
  })
  .await
  .map_err(|error| error.to_string())?
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn game_bridge_trigger_login(
  _state: tauri::State<'_, GameBridgeState>,
) -> Result<(), String> {
  Err("The game bridge is only supported on Windows.".to_owned())
}

#[cfg(windows)]
#[tauri::command]
pub async fn game_bridge_disconnect(
  state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  let manager = Arc::clone(&state.manager);
  tauri::async_runtime::spawn_blocking(move || {
    manager
      .disconnect()
      .map_err(|error| error.to_string())
      .and_then(serialize)
  })
  .await
  .map_err(|error| error.to_string())?
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn game_bridge_disconnect(
  _state: tauri::State<'_, GameBridgeState>,
) -> Result<serde_json::Value, String> {
  Err("The game bridge is only supported on Windows.".to_owned())
}
