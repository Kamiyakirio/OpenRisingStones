//! Protected bridge for the official Regional Teleport service.
//!
//! The webview can select only allowlisted operations. Authentication cookies
//! stay in Rust memory, encrypted storage, and the constrained Python sidecar.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::{
  python_sidecar,
  sdo_login::{self, LoginState, SessionSnapshot},
};
#[cfg(windows)]
use game_bridge_host::{RegionTarget, SecretValue};

const MAX_TELEPORT_RESPONSE_BYTES: usize = 2 * 1024 * 1024;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TeleportRoleRequest {
  role_id: String,
  role_name: String,
  key: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TeleportRequest {
  action: String,
  page: Option<u32>,
  page_size: Option<u32>,
  area_id: Option<u32>,
  area_name: Option<String>,
  group_id: Option<u32>,
  group_code: Option<String>,
  group_name: Option<String>,
  target_area_id: Option<u32>,
  target_area_name: Option<String>,
  target_group_id: Option<u32>,
  target_group_code: Option<String>,
  target_group_name: Option<String>,
  role: Option<TeleportRoleRequest>,
  order_id: Option<String>,
  confirm_type: Option<u8>,
}

#[derive(Debug, Deserialize)]
struct TeleportSidecarResponse {
  payload: Value,
  session: SessionSnapshot,
}

#[derive(Deserialize)]
struct TeleportSessionRefreshSidecarResponse {
  session: SessionSnapshot,
}

#[cfg(windows)]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TeleportGameRegionSidecarResponse {
  region_name: String,
  lobby_host: String,
  save_data_host: String,
  gm_host: String,
  game_session: String,
  session: SessionSnapshot,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomaticTeleportReadiness {
  game_auth_ready: bool,
}

/// Report only readiness metadata; refresh credentials remain inside protected Rust state.
#[tauri::command]
pub fn teleport_automatic_preflight(
  login_state: State<'_, LoginState>,
) -> Result<AutomaticTeleportReadiness, String> {
  let session = sdo_login::current_session(&login_state)?
    .ok_or_else(|| "AUTHENTICATION_REQUIRED".to_owned())?;
  let game_auth_ready = session
    .game_auth
    .is_some_and(|context| !context.tgt.trim().is_empty() && !context.guid.trim().is_empty());
  Ok(AutomaticTeleportReadiness { game_auth_ready })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TeleportSidecarRequest {
  operation: &'static str,
  #[serde(flatten)]
  request: TeleportRequest,
  session: SessionSnapshot,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TeleportSessionRefreshSidecarRequest {
  operation: &'static str,
  session: SessionSnapshot,
}

/// Refresh the independent service cookie from the existing account SSO context.
#[tauri::command]
pub async fn refresh_teleport_service_session(
  login_state: State<'_, LoginState>,
) -> Result<(), String> {
  let session = sdo_login::current_session(&login_state)?
    .ok_or_else(|| "AUTHENTICATION_REQUIRED".to_owned())?;
  let response = tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request::<_, TeleportSessionRefreshSidecarResponse>(
      &TeleportSessionRefreshSidecarRequest {
        operation: "refreshTeleportServiceSession",
        session,
      },
      MAX_TELEPORT_RESPONSE_BYTES,
      "Regional Teleport session refresh",
    )
  })
  .await
  .map_err(|_| "The Regional Teleport session refresh stopped unexpectedly.".to_owned())??;
  sdo_login::replace_current_session(&login_state, response.session)
}

#[cfg(windows)]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TeleportGameRegionSidecarRequest {
  operation: &'static str,
  target_area_name: String,
  session: SessionSnapshot,
}

/// Resolve secrets and official hosts in Rust so the webview never receives them.
#[cfg(windows)]
pub(crate) async fn prepare_game_region(
  target_area_name: String,
  login_state: &LoginState,
) -> Result<RegionTarget, String> {
  let target_area_name = target_area_name.trim().to_owned();
  if target_area_name.is_empty()
    || target_area_name.chars().count() > 32
    || target_area_name.chars().any(char::is_control)
  {
    return Err("The target game area is invalid.".to_owned());
  }
  let session =
    sdo_login::current_session(login_state)?.ok_or_else(|| "AUTHENTICATION_REQUIRED".to_owned())?;
  let response = tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request::<_, TeleportGameRegionSidecarResponse>(
      &TeleportGameRegionSidecarRequest {
        operation: "prepareTeleportGameRegion",
        target_area_name,
        session,
      },
      MAX_TELEPORT_RESPONSE_BYTES,
      "Regional Teleport game session",
    )
  })
  .await
  .map_err(|_| "The game-session refresh task stopped unexpectedly.".to_owned())??;
  sdo_login::replace_current_session(login_state, response.session)?;
  Ok(RegionTarget {
    region_name: response.region_name,
    lobby_host: response.lobby_host,
    save_data_host: response.save_data_host,
    gm_host: response.gm_host,
    game_session: SecretValue::new(response.game_session),
  })
}

/// Execute one validated Regional Teleport request and retain updated cookies.
#[tauri::command]
pub async fn fetch_teleport(
  request: TeleportRequest,
  login_state: State<'_, LoginState>,
) -> Result<Value, String> {
  validate_request(&request)?;
  let session = sdo_login::current_session(&login_state)?
    .ok_or_else(|| "AUTHENTICATION_REQUIRED".to_owned())?;
  let response = tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request::<_, TeleportSidecarResponse>(
      &TeleportSidecarRequest {
        operation: "fetchTeleport",
        request,
        session,
      },
      MAX_TELEPORT_RESPONSE_BYTES,
      "Regional Teleport",
    )
  })
  .await
  .map_err(|_| "The Regional Teleport task stopped unexpectedly.".to_owned())??;
  sdo_login::replace_current_session(&login_state, response.session)?;
  Ok(response.payload)
}

fn validate_request(request: &TeleportRequest) -> Result<(), String> {
  let valid_action = matches!(
    request.action.as_str(),
    "overview"
      | "targets"
      | "roles"
      | "queueTime"
      | "createOrder"
      | "orderStatus"
      | "confirmOrder"
      | "orders"
      | "returnGroups"
      | "travelBack"
  );
  if !valid_action {
    return Err("The Regional Teleport operation is not supported.".to_owned());
  }
  if request
    .page
    .is_some_and(|value| value == 0 || value > 10_000)
    || request
      .page_size
      .is_some_and(|value| value == 0 || value > 50)
  {
    return Err("The Regional Teleport pagination is invalid.".to_owned());
  }
  for value in [
    request.area_name.as_ref(),
    request.group_code.as_ref(),
    request.group_name.as_ref(),
    request.target_area_name.as_ref(),
    request.target_group_code.as_ref(),
    request.target_group_name.as_ref(),
  ]
  .into_iter()
  .flatten()
  {
    if value.is_empty() || value.chars().count() > 64 || value.chars().any(char::is_control) {
      return Err("The Regional Teleport selection is invalid.".to_owned());
    }
  }
  if request
    .order_id
    .as_ref()
    .is_some_and(|value| value.len() > 48 || !value.starts_with("GM"))
    || request.confirm_type.is_some_and(|value| value > 1)
  {
    return Err("The Regional Teleport order request is invalid.".to_owned());
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  fn request(action: &str) -> TeleportRequest {
    TeleportRequest {
      action: action.to_owned(),
      page: None,
      page_size: None,
      area_id: None,
      area_name: None,
      group_id: None,
      group_code: None,
      group_name: None,
      target_area_id: None,
      target_area_name: None,
      target_group_id: None,
      target_group_code: None,
      target_group_name: None,
      role: None,
      order_id: None,
      confirm_type: None,
    }
  }

  #[test]
  fn accepts_only_allowlisted_operations() {
    assert!(validate_request(&request("overview")).is_ok());
    assert!(validate_request(&request("arbitraryUrl")).is_err());
  }

  #[test]
  fn rejects_control_characters_in_selected_names() {
    let mut value = request("createOrder");
    value.group_name = Some("World\nInjected".to_owned());
    assert!(validate_request(&value).is_err());
  }
}
