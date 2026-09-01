//! Non-Windows game bridge adapter with the same Tauri command surface.

// Request fields intentionally preserve the Windows command payloads but are never read here.
#![allow(dead_code)]

use game_bridge_host::{
  ActiveCharacterSnapshot, BridgeStatus, GameSnapshot, GameStateSnapshot, PlayerInventorySnapshot,
};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::sdo_login::LoginState;

type ApiResult<T> = Result<T, GameBridgeApiError>;

const UNSUPPORTED_MESSAGE: &str =
  "The game bridge is only available on Windows. Please use the Windows desktop app.";

/// Stable error envelope consumed by the frontend bridge service.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameBridgeApiError {
  code: &'static str,
  message: &'static str,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectRequest {
  process_id: Option<u32>,
  manifest_file: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareRequest {
  process_id: Option<u32>,
  manifest_file: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum GameReadResource {
  ActiveCharacter,
  SelectedCharacter,
  GameState,
  Inventory,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameReadRequest {
  resources: Vec<GameReadResource>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameReadResponse {
  schema_version: u32,
  active_character: Option<ActiveCharacterSnapshot>,
  selected_character: Option<GameSnapshot>,
  game_state: Option<GameStateSnapshot>,
  inventory: Option<PlayerInventorySnapshot>,
  failures: Vec<GameReadFailure>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameReadFailure {
  resource: GameReadResource,
  error: GameBridgeApiError,
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

/// Stateless placeholder registered on platforms that cannot host the bridge.
pub struct GameBridgeState;

impl GameBridgeState {
  pub fn new(_app_handle: AppHandle) -> Result<Self, std::io::Error> {
    Ok(Self)
  }

  pub fn shutdown(&self) {}
}

fn unsupported<T>() -> ApiResult<T> {
  Err(GameBridgeApiError {
    code: "unsupported_platform",
    message: UNSUPPORTED_MESSAGE,
  })
}

#[tauri::command]
pub fn game_bridge_status(_state: tauri::State<'_, GameBridgeState>) -> ApiResult<BridgeStatus> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_connect(
  _state: tauri::State<'_, GameBridgeState>,
  _request: ConnectRequest,
) -> ApiResult<BridgeStatus> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_prepare(
  _state: tauri::State<'_, GameBridgeState>,
  _request: PrepareRequest,
) -> ApiResult<BridgeStatus> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_read(
  _state: tauri::State<'_, GameBridgeState>,
  _request: GameReadRequest,
) -> ApiResult<GameReadResponse> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_capture_snapshot(
  _state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<GameSnapshot> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_capture_active_character(
  _state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<ActiveCharacterSnapshot> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_capture_inventory(
  _state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<PlayerInventorySnapshot> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_return_to_title(
  _state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<()> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_logout_to_title(
  _state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<GameStateSnapshot> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_switch_region(
  _state: tauri::State<'_, GameBridgeState>,
  _request: SwitchRegionRequest,
) -> ApiResult<String> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_apply_teleport_region(
  _state: tauri::State<'_, GameBridgeState>,
  _login_state: tauri::State<'_, LoginState>,
  _target_area_name: String,
) -> ApiResult<String> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_trigger_login(_state: tauri::State<'_, GameBridgeState>) -> ApiResult<()> {
  unsupported()
}

#[tauri::command]
pub async fn game_bridge_disconnect(
  _state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<BridgeStatus> {
  unsupported()
}

#[cfg(test)]
mod tests {
  use super::{unsupported, UNSUPPORTED_MESSAGE};

  #[test]
  fn unsupported_commands_return_a_stable_hint() {
    let error = unsupported::<()>().expect_err("the platform must be rejected");
    assert_eq!(error.code, "unsupported_platform");
    assert_eq!(error.message, UNSUPPORTED_MESSAGE);
  }
}
