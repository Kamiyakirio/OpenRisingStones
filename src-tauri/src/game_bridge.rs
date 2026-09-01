//! Typed Tauri adapter for the standalone game bridge host.

use game_bridge_host::{
  ActiveCharacterSnapshot, BridgeError, BridgeManager, BridgePhase, BridgeStatus, ConnectOptions,
  GameScreen, GameSnapshot, GameStateSnapshot, PlayerInventorySnapshot, RegionTarget, SecretValue,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};
#[cfg(not(debug_assertions))]
use tauri::Manager;
use tauri::{AppHandle, Emitter};

use crate::{
  owned_items::{self, OwnedItemsSnapshot},
  sdo_login::{self, LoginState},
  teleport,
};

const STATUS_EVENT: &str = "game-bridge://status";
const READ_SCHEMA_VERSION: u32 = 2;
const READY_TIMEOUT: Duration = Duration::from_secs(20);
const LOGOUT_TIMEOUT: Duration = Duration::from_secs(60);

type ApiResult<T> = Result<T, GameBridgeApiError>;

/// Stable error envelope consumed by the frontend bridge service.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameBridgeApiError {
  code: String,
  message: String,
}

impl GameBridgeApiError {
  fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
    Self {
      code: code.into(),
      message: message.into(),
    }
  }
}

impl From<BridgeError> for GameBridgeApiError {
  fn from(error: BridgeError) -> Self {
    if let BridgeError::CommandRejected { code, message } = error {
      return Self::new(code, message);
    }
    let code = match &error {
      BridgeError::UnsupportedPlatform => "unsupported_platform",
      BridgeError::AlreadyConnected => "already_connected",
      BridgeError::NotConnected => "not_connected",
      BridgeError::ProcessNotFound => "process_not_found",
      BridgeError::MultipleProcesses => "multiple_processes",
      BridgeError::UnexpectedProcess => "unexpected_process",
      BridgeError::InvalidPath(_) => "invalid_path",
      BridgeError::InitializationRejected(2) => "payload_already_initialized",
      BridgeError::InitializationRejected(_) => "initialization_rejected",
      BridgeError::ProtocolMismatch { .. } => "protocol_mismatch",
      BridgeError::Timeout(_) => "bridge_timeout",
      BridgeError::ConnectionClosed => "connection_closed",
      BridgeError::InvalidData(_) => "invalid_data",
      BridgeError::Windows { .. } => "windows_operation_failed",
      BridgeError::Io(_) => "io_error",
      BridgeError::Json(_) => "json_error",
      BridgeError::CommandRejected { .. } => unreachable!(),
    };
    Self::new(code, error.to_string())
  }
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

/// Versioned batch response. New read resources can be added without adding Tauri commands.
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

pub struct GameBridgeState {
  manager: Arc<BridgeManager>,
  asset_root: PathBuf,
}

impl GameBridgeState {
  pub fn new(app_handle: AppHandle) -> Result<Self, std::io::Error> {
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

  /// Disconnects and unloads the payload before the desktop process exits.
  pub fn shutdown(&self) {
    if !matches!(self.manager.status().phase, BridgePhase::Disconnected) {
      let _ = self.manager.disconnect();
    }
  }
}

async fn run_bridge_task<T, F>(task: F) -> ApiResult<T>
where
  T: Send + 'static,
  F: FnOnce() -> ApiResult<T> + Send + 'static,
{
  tauri::async_runtime::spawn_blocking(task)
    .await
    .map_err(|error| GameBridgeApiError::new("task_failed", error.to_string()))?
}

fn connect_options(
  asset_root: &Path,
  process_id: Option<u32>,
  manifest_file: Option<&str>,
) -> ApiResult<ConnectOptions> {
  let payload_path = asset_root.join("game_bridge_payload.dll");
  let world_map_path = asset_root.join("worlds-cn.json");
  ensure_file(&payload_path, "payload")?;
  ensure_file(&world_map_path, "world map")?;
  Ok(ConnectOptions {
    process_id,
    payload_path,
    manifest_path: resolve_manifest_path(asset_root, manifest_file)?,
    world_map_path,
  })
}

fn ensure_file(path: &Path, label: &str) -> ApiResult<()> {
  if path.is_file() {
    Ok(())
  } else {
    Err(GameBridgeApiError::new(
      "bridge_asset_missing",
      format!("The game bridge {label} is missing: {}", path.display()),
    ))
  }
}

fn resolve_manifest_path(asset_root: &Path, requested: Option<&str>) -> ApiResult<PathBuf> {
  let manifest_root = asset_root.join("manifests");
  if let Some(value) = requested {
    let file_name = validate_manifest_file(value)?;
    let path = manifest_root.join(file_name);
    ensure_file(&path, "manifest")?;
    return Ok(path);
  }

  let mut manifests = std::fs::read_dir(&manifest_root)
    .map_err(|error| {
      GameBridgeApiError::new(
        "bridge_manifest_missing",
        format!("Could not read bridge manifests: {error}"),
      )
    })?
    .filter_map(Result::ok)
    .map(|entry| entry.path())
    .filter(|path| path.is_file())
    .filter(|path| {
      path
        .extension()
        .is_some_and(|extension| extension == "json")
    })
    .collect::<Vec<_>>();
  manifests.sort_by(|left, right| left.file_name().cmp(&right.file_name()));
  manifests.pop().ok_or_else(|| {
    GameBridgeApiError::new(
      "bridge_manifest_missing",
      format!(
        "No game bridge manifest was found in {}",
        manifest_root.display()
      ),
    )
  })
}

fn validate_manifest_file(value: &str) -> ApiResult<String> {
  let path = Path::new(value);
  let is_single_component = path.components().count() == 1 && path.file_name().is_some();
  let is_safe_name = value
    .bytes()
    .all(|character| character.is_ascii_alphanumeric() || matches!(character, b'.' | b'_' | b'-'));
  if !is_single_component || !is_safe_name || !value.ends_with(".json") {
    return Err(GameBridgeApiError::new(
      "invalid_manifest_file",
      "The manifest file name is invalid.",
    ));
  }
  Ok(value.to_owned())
}

fn prepare_bridge(
  manager: &Arc<BridgeManager>,
  options: ConnectOptions,
) -> ApiResult<BridgeStatus> {
  match manager.status().phase {
    BridgePhase::Ready => return Ok(manager.status()),
    BridgePhase::Disconnected => {
      manager.connect(options).map_err(GameBridgeApiError::from)?;
    }
    BridgePhase::Faulted => {
      manager.disconnect().map_err(GameBridgeApiError::from)?;
      manager.connect(options).map_err(GameBridgeApiError::from)?;
    }
    BridgePhase::Connecting => {}
    BridgePhase::ShuttingDown => {
      return Err(GameBridgeApiError::new(
        "bridge_busy",
        "The game bridge is shutting down.",
      ));
    }
  }

  let deadline = Instant::now() + READY_TIMEOUT;
  loop {
    let status = manager.status();
    match status.phase {
      BridgePhase::Ready => return Ok(status),
      BridgePhase::Faulted => {
        return Err(GameBridgeApiError::new(
          status
            .error_code
            .unwrap_or_else(|| "bridge_faulted".to_owned()),
          status
            .error_message
            .unwrap_or_else(|| "The game bridge faulted during startup.".to_owned()),
        ));
      }
      _ if Instant::now() >= deadline => {
        return Err(GameBridgeApiError::new(
          "bridge_timeout",
          "Timed out waiting for the game bridge to become ready.",
        ));
      }
      _ => std::thread::sleep(Duration::from_millis(100)),
    }
  }
}

fn read_resources(
  manager: &BridgeManager,
  request: GameReadRequest,
) -> ApiResult<GameReadResponse> {
  if request.resources.is_empty() {
    return Err(GameBridgeApiError::new(
      "invalid_read_request",
      "At least one game read resource is required.",
    ));
  }
  if !matches!(manager.status().phase, BridgePhase::Ready) {
    return Err(GameBridgeApiError::from(BridgeError::NotConnected));
  }

  let mut requested = HashSet::new();
  let mut response = GameReadResponse {
    schema_version: READ_SCHEMA_VERSION,
    active_character: None,
    selected_character: None,
    game_state: None,
    inventory: None,
    failures: Vec::new(),
  };
  for resource in request.resources {
    if !requested.insert(resource) {
      continue;
    }
    match resource {
      GameReadResource::ActiveCharacter => match manager.capture_active_character() {
        Ok(character) => response.active_character = Some(character),
        Err(error) => response.failures.push(GameReadFailure {
          resource,
          error: error.into(),
        }),
      },
      GameReadResource::SelectedCharacter => match manager.capture_snapshot() {
        Ok(snapshot) => response.selected_character = Some(snapshot),
        Err(error) => response.failures.push(GameReadFailure {
          resource,
          error: error.into(),
        }),
      },
      GameReadResource::GameState => match manager.capture_game_state() {
        Ok(state) => response.game_state = Some(state),
        Err(error) => response.failures.push(GameReadFailure {
          resource,
          error: error.into(),
        }),
      },
      GameReadResource::Inventory => match manager.capture_inventory() {
        Ok(inventory) => response.inventory = Some(inventory),
        Err(error) => response.failures.push(GameReadFailure {
          resource,
          error: error.into(),
        }),
      },
    }
  }
  Ok(response)
}

fn logout_to_title(manager: &BridgeManager) -> ApiResult<GameStateSnapshot> {
  let initial = manager
    .capture_game_state()
    .map_err(GameBridgeApiError::from)?;
  if matches!(initial.screen, GameScreen::Title) {
    return Ok(initial);
  }
  if matches!(initial.screen, GameScreen::Unknown) {
    return Err(GameBridgeApiError::new(
      "game_state_unknown",
      "The current game screen could not be identified.",
    ));
  }

  manager
    .logout_to_title()
    .map_err(GameBridgeApiError::from)?;
  let mut character_select_exit_requested = matches!(initial.screen, GameScreen::CharacterSelect);
  let deadline = Instant::now() + LOGOUT_TIMEOUT;
  loop {
    let state = manager
      .capture_game_state()
      .map_err(GameBridgeApiError::from)?;
    if matches!(state.screen, GameScreen::Title) {
      return Ok(state);
    }
    if matches!(state.screen, GameScreen::CharacterSelect) && !character_select_exit_requested {
      manager
        .logout_to_title()
        .map_err(GameBridgeApiError::from)?;
      character_select_exit_requested = true;
    }
    if Instant::now() >= deadline {
      return Err(GameBridgeApiError::new(
        "logout_timeout",
        "Timed out waiting for the game to return to the title screen.",
      ));
    }
    std::thread::sleep(Duration::from_millis(250));
  }
}

#[tauri::command]
pub fn game_bridge_status(state: tauri::State<'_, GameBridgeState>) -> ApiResult<BridgeStatus> {
  Ok(state.manager.status())
}

#[tauri::command]
pub async fn game_bridge_connect(
  state: tauri::State<'_, GameBridgeState>,
  request: ConnectRequest,
) -> ApiResult<BridgeStatus> {
  let manager = Arc::clone(&state.manager);
  let options = connect_options(
    &state.asset_root,
    request.process_id,
    request.manifest_file.as_deref(),
  )?;
  run_bridge_task(move || manager.connect(options).map_err(Into::into)).await
}

#[tauri::command]
pub async fn game_bridge_prepare(
  state: tauri::State<'_, GameBridgeState>,
  request: PrepareRequest,
) -> ApiResult<BridgeStatus> {
  let manager = Arc::clone(&state.manager);
  let options = connect_options(
    &state.asset_root,
    request.process_id,
    request.manifest_file.as_deref(),
  )?;
  run_bridge_task(move || prepare_bridge(&manager, options)).await
}

#[tauri::command]
pub async fn game_bridge_read(
  state: tauri::State<'_, GameBridgeState>,
  request: GameReadRequest,
) -> ApiResult<GameReadResponse> {
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || read_resources(&manager, request)).await
}

#[tauri::command]
pub async fn game_bridge_capture_snapshot(
  state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<GameSnapshot> {
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || manager.capture_snapshot().map_err(Into::into)).await
}

#[tauri::command]
pub async fn game_bridge_capture_active_character(
  state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<ActiveCharacterSnapshot> {
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || manager.capture_active_character().map_err(Into::into)).await
}

#[tauri::command]
pub async fn game_bridge_capture_inventory(
  state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<PlayerInventorySnapshot> {
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || manager.capture_inventory().map_err(Into::into)).await
}

/// Reads one character's owned items, encrypts the normalized index, then unloads a bridge opened
/// only for this request.
#[tauri::command]
pub async fn game_bridge_sync_owned_items(
  state: tauri::State<'_, GameBridgeState>,
  login_state: tauri::State<'_, LoginState>,
) -> ApiResult<OwnedItemsSnapshot> {
  let cache_context = sdo_login::current_cache_context(&login_state)
    .map_err(|message| GameBridgeApiError::new("cache_login_unavailable", message))?;
  let expected_character_name = cache_context.character_name.trim().to_owned();
  let manager = Arc::clone(&state.manager);
  let options = connect_options(&state.asset_root, None, None)?;
  let snapshot = run_bridge_task(move || {
    let connected_here = !matches!(manager.status().phase, BridgePhase::Ready);
    prepare_bridge(&manager, options)?;
    let result = (|| {
      let character = manager
        .capture_active_character()
        .map_err(GameBridgeApiError::from)?;
      if character.character_name.trim() != expected_character_name {
        return Err(GameBridgeApiError::new(
          "login_character_mismatch",
          "The active game character does not match the authenticated Rising Stones character.",
        ));
      }
      let inventory = manager
        .capture_inventory()
        .map_err(GameBridgeApiError::from)?;
      owned_items::build_owned_items_snapshot(character, inventory)
        .map_err(|message| GameBridgeApiError::new("owned_items_invalid", message))
    })();
    if connected_here {
      let _ = manager.disconnect();
    }
    result
  })
  .await?;
  owned_items::save_owned_items_snapshot(&login_state, &cache_context, &snapshot)
    .map_err(|message| GameBridgeApiError::new("owned_items_cache_failed", message))?;
  Ok(snapshot)
}

#[tauri::command]
pub async fn game_bridge_return_to_title(
  state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<()> {
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || manager.return_to_title().map_err(Into::into)).await
}

#[tauri::command]
pub async fn game_bridge_logout_to_title(
  state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<GameStateSnapshot> {
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || logout_to_title(&manager)).await
}

#[tauri::command]
pub async fn game_bridge_switch_region(
  state: tauri::State<'_, GameBridgeState>,
  request: SwitchRegionRequest,
) -> ApiResult<String> {
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || {
    manager
      .switch_region(RegionTarget {
        region_name: request.region_name,
        lobby_host: request.lobby_host,
        save_data_host: request.save_data_host,
        gm_host: request.gm_host,
        game_session: SecretValue::new(request.game_session),
      })
      .map_err(Into::into)
  })
  .await
}

#[tauri::command]
pub async fn game_bridge_apply_teleport_region(
  state: tauri::State<'_, GameBridgeState>,
  login_state: tauri::State<'_, LoginState>,
  target_area_name: String,
) -> ApiResult<String> {
  let target = teleport::prepare_game_region(target_area_name, &login_state)
    .await
    .map_err(|message| GameBridgeApiError::new("game_session_refresh_failed", message))?;
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || manager.switch_region(target).map_err(Into::into)).await
}

#[tauri::command]
pub async fn game_bridge_trigger_login(state: tauri::State<'_, GameBridgeState>) -> ApiResult<()> {
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || manager.trigger_login().map_err(Into::into)).await
}

#[tauri::command]
pub async fn game_bridge_disconnect(
  state: tauri::State<'_, GameBridgeState>,
) -> ApiResult<BridgeStatus> {
  let manager = Arc::clone(&state.manager);
  run_bridge_task(move || manager.disconnect().map_err(Into::into)).await
}

#[cfg(test)]
mod tests {
  use super::{validate_manifest_file, GameBridgeApiError};
  use game_bridge_host::BridgeError;

  #[test]
  fn duplicate_payload_has_a_stable_error_code() {
    let error = GameBridgeApiError::from(BridgeError::InitializationRejected(2));
    assert_eq!(error.code, "payload_already_initialized");
  }

  #[test]
  fn manifest_file_accepts_a_single_json_name() {
    assert_eq!(
      validate_manifest_file("2026.08.05.0000.0000.json").expect("valid manifest"),
      "2026.08.05.0000.0000.json"
    );
  }

  #[test]
  fn manifest_file_rejects_path_traversal() {
    assert!(validate_manifest_file("../manifest.json").is_err());
    assert!(validate_manifest_file("nested/manifest.json").is_err());
    assert!(validate_manifest_file("manifest.txt").is_err());
  }
}
