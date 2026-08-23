//! SDO login commands and in-memory session management.
//!
//! A constrained Python sidecar performs the protocol using the project's Chrome TLS fingerprint.
//! Login cookies stay in Rust state and child-process stdin and are never serialized to the webview.

use std::{
  io::Write,
  process::{Command, Stdio},
  sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
  },
  time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::State;

const CLIENT_SCRIPT: &str = include_str!("../python/sdo_login_client.py");
const MAX_SIDECAR_RESPONSE_BYTES: usize = 128 * 1024;
const LOGIN_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CookieRecord {
  name: String,
  value: String,
  domain: String,
  path: String,
  secure: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct SessionSnapshot {
  cookies: Vec<CookieRecord>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarResponse {
  status: String,
  session: SessionSnapshot,
  biz_context: Option<String>,
  qr_image_data_url: Option<String>,
  profile: Option<LoginProfile>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginProfile {
  display_account: String,
  character_name: String,
  area_name: String,
  group_name: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginStatus {
  authenticated: bool,
  profile: Option<LoginProfile>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginStart {
  login_id: u64,
  status: String,
  expires_in_seconds: u64,
  qr_image_data_url: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginPoll {
  status: String,
  profile: Option<LoginProfile>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum PendingKind {
  Push,
  Qr,
}

#[derive(Clone, Debug)]
struct PendingLogin {
  id: u64,
  kind: PendingKind,
  started_at: Instant,
  session: SessionSnapshot,
  biz_context: String,
}

#[derive(Clone, Debug)]
struct ActiveLogin {
  #[allow(dead_code)]
  session: SessionSnapshot,
  profile: LoginProfile,
}

pub struct LoginState {
  next_id: AtomicU64,
  pending: Mutex<Option<PendingLogin>>,
  active: Mutex<Option<ActiveLogin>>,
}

impl Default for LoginState {
  fn default() -> Self {
    Self {
      next_id: AtomicU64::new(1),
      pending: Mutex::new(None),
      active: Mutex::new(None),
    }
  }
}

#[tauri::command]
pub fn sdo_login_status(state: State<'_, LoginState>) -> Result<LoginStatus, String> {
  let active = state
    .active
    .lock()
    .map_err(|_| "Unable to read the login state.".to_owned())?;
  Ok(LoginStatus {
    authenticated: active.is_some(),
    profile: active.as_ref().map(|login| login.profile.clone()),
  })
}

#[tauri::command]
pub async fn sdo_start_push_login(
  account: String,
  state: State<'_, LoginState>,
) -> Result<LoginStart, String> {
  let account = account.trim();
  if account.len() < 5 || account.len() > 64 || account.chars().any(char::is_control) {
    return Err("Enter a valid SDO account or mobile number.".to_owned());
  }
  let response = run_sidecar(json!({ "operation": "startPush", "account": account })).await?;
  store_pending(&state, PendingKind::Push, response)
}

#[tauri::command]
pub async fn sdo_start_qr_login(state: State<'_, LoginState>) -> Result<LoginStart, String> {
  let response = run_sidecar(json!({ "operation": "startQr" })).await?;
  store_pending(&state, PendingKind::Qr, response)
}

#[tauri::command]
pub async fn sdo_poll_push_login(
  login_id: u64,
  state: State<'_, LoginState>,
) -> Result<LoginPoll, String> {
  poll_login(login_id, PendingKind::Push, &state).await
}

#[tauri::command]
pub async fn sdo_poll_qr_login(
  login_id: u64,
  state: State<'_, LoginState>,
) -> Result<LoginPoll, String> {
  poll_login(login_id, PendingKind::Qr, &state).await
}

#[tauri::command]
pub async fn sdo_login_with_cookie(
  cookie: String,
  state: State<'_, LoginState>,
) -> Result<LoginPoll, String> {
  if cookie.is_empty() || cookie.len() > 16 * 1024 || cookie.contains('\r') || cookie.contains('\n')
  {
    return Err("The cookie is empty, too long, or contains a line break.".to_owned());
  }
  let response = run_sidecar(json!({ "operation": "cookieLogin", "cookie": cookie })).await?;
  let profile = response
    .profile
    .ok_or_else(|| "Login verification returned no account profile.".to_owned())?;
  commit_active(&state, response.session, profile.clone())?;
  Ok(LoginPoll {
    status: "success".to_owned(),
    profile: Some(profile),
  })
}

#[tauri::command]
pub fn sdo_cancel_login(login_id: u64, state: State<'_, LoginState>) -> Result<(), String> {
  let mut pending = state
    .pending
    .lock()
    .map_err(|_| "Unable to cancel the login session.".to_owned())?;
  if pending.as_ref().is_some_and(|login| login.id == login_id) {
    *pending = None;
  }
  Ok(())
}

fn store_pending(
  state: &State<'_, LoginState>,
  kind: PendingKind,
  response: SidecarResponse,
) -> Result<LoginStart, String> {
  let biz_context = response
    .biz_context
    .ok_or_else(|| "The SDO response is missing session data.".to_owned())?;
  let id = state.next_id.fetch_add(1, Ordering::Relaxed);
  let start = LoginStart {
    login_id: id,
    status: response.status,
    expires_in_seconds: LOGIN_TIMEOUT.as_secs(),
    qr_image_data_url: response.qr_image_data_url,
  };
  *state
    .pending
    .lock()
    .map_err(|_| "Unable to store the login session.".to_owned())? = Some(PendingLogin {
    id,
    kind,
    started_at: Instant::now(),
    session: response.session,
    biz_context,
  });
  Ok(start)
}

async fn poll_login(
  login_id: u64,
  kind: PendingKind,
  state: &State<'_, LoginState>,
) -> Result<LoginPoll, String> {
  let pending = state
    .pending
    .lock()
    .map_err(|_| "Unable to read the login session.".to_owned())?
    .clone()
    .filter(|login| login.id == login_id && login.kind == kind)
    .ok_or_else(|| "The login session was cancelled or expired.".to_owned())?;

  if pending.started_at.elapsed() > LOGIN_TIMEOUT {
    clear_pending(state, login_id)?;
    return Err("The login session timed out. Start again.".to_owned());
  }

  let operation = if kind == PendingKind::Push {
    "pollPush"
  } else {
    "pollQr"
  };
  let response = run_sidecar(json!({
    "operation": operation,
    "session": pending.session,
    "bizContext": pending.biz_context,
  }))
  .await?;

  let mut current = state
    .pending
    .lock()
    .map_err(|_| "Unable to update the login session.".to_owned())?;
  if current.as_ref().map_or(true, |login| login.id != login_id) {
    return Err("The login session was cancelled or replaced.".to_owned());
  }

  if response.status == "success" {
    let profile = response
      .profile
      .ok_or_else(|| "Login verification returned no account profile.".to_owned())?;
    let session = response.session;
    *current = None;
    drop(current);
    commit_active(state, session, profile.clone())?;
    return Ok(LoginPoll {
      status: "success".to_owned(),
      profile: Some(profile),
    });
  }

  if let Some(login) = current.as_mut() {
    login.session = response.session;
  }
  Ok(LoginPoll {
    status: response.status,
    profile: None,
  })
}

fn commit_active(
  state: &State<'_, LoginState>,
  session: SessionSnapshot,
  profile: LoginProfile,
) -> Result<(), String> {
  *state
    .active
    .lock()
    .map_err(|_| "Unable to store the authenticated session.".to_owned())? =
    Some(ActiveLogin { session, profile });
  Ok(())
}

fn clear_pending(state: &State<'_, LoginState>, login_id: u64) -> Result<(), String> {
  let mut pending = state
    .pending
    .lock()
    .map_err(|_| "Unable to update the login session.".to_owned())?;
  if pending.as_ref().is_some_and(|login| login.id == login_id) {
    *pending = None;
  }
  Ok(())
}

async fn run_sidecar(request: serde_json::Value) -> Result<SidecarResponse, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let input = serde_json::to_vec(&request)
      .map_err(|_| "Unable to serialize the login request.".to_owned())?;
    let output = execute_python("python", &["-c", CLIENT_SCRIPT], &input).or_else(|error| {
      if error.starts_with("not-found:") {
        execute_python("py", &["-3", "-c", CLIENT_SCRIPT], &input)
      } else {
        Err(error)
      }
    })?;
    if output.len() > MAX_SIDECAR_RESPONSE_BYTES {
      return Err("The SDO login response exceeded the size limit.".to_owned());
    }
    serde_json::from_slice(&output)
      .map_err(|_| "Unable to parse the SDO login response.".to_owned())
  })
  .await
  .map_err(|_| "The login task stopped unexpectedly.".to_owned())?
}

fn execute_python(program: &str, arguments: &[&str], input: &[u8]) -> Result<Vec<u8>, String> {
  let mut command = Command::new(program);
  command
    .args(arguments)
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());

  #[cfg(windows)]
  {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
  }

  let mut child = command.spawn().map_err(|error| {
    if error.kind() == std::io::ErrorKind::NotFound {
      format!("not-found:{program}")
    } else {
      "Unable to start the SDO login client.".to_owned()
    }
  })?;
  child
    .stdin
    .take()
    .ok_or_else(|| "Unable to open stdin for the SDO login client.".to_owned())?
    .write_all(input)
    .map_err(|_| "Unable to write to the SDO login client.".to_owned())?;
  let output = child
    .wait_with_output()
    .map_err(|_| "Unable to wait for the SDO login client.".to_owned())?;
  if !output.status.success() {
    let detail = String::from_utf8_lossy(&output.stderr);
    let detail = detail.trim().chars().take(240).collect::<String>();
    return Err(if detail.is_empty() {
      "The SDO login request failed.".to_owned()
    } else {
      detail
    });
  }
  Ok(output.stdout)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn login_state_starts_without_credentials() {
    let state = LoginState::default();
    assert!(state.active.lock().unwrap().is_none());
    assert!(state.pending.lock().unwrap().is_none());
  }

  #[test]
  fn sidecar_response_never_serializes_session_to_frontend_types() {
    let status = LoginStatus {
      authenticated: false,
      profile: None,
    };
    let serialized = serde_json::to_string(&status).unwrap();
    assert!(!serialized.contains("cookies"));
  }
}
