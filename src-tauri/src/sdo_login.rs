//! SDO login commands with encrypted, user-scoped session persistence.
//!
//! A constrained Python sidecar performs the protocol using the project's Chrome TLS fingerprint.
//! Login cookies stay in Rust state, OS-protected storage, and child-process stdin. They are never
//! serialized to the webview or written to ordinary files as plaintext.

use std::{
  path::{Path, PathBuf},
  sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
  },
  time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::State;

use crate::{python_sidecar, secure_storage};

const MAX_SIDECAR_RESPONSE_BYTES: usize = 128 * 1024;
const LOGIN_TIMEOUT: Duration = Duration::from_secs(120);
const MAX_USER_AGENT_BYTES: usize = 512;
const GLAMOUR_API_HOST: &str = "apiff14risingstones.web.sdo.com";
const GLAMOUR_ANTIBOT_COOKIES: [&str; 2] = ["__tst_status", "EO_Bot_Ssid"];

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CookieRecord {
  pub(crate) name: String,
  pub(crate) value: String,
  pub(crate) domain: String,
  pub(crate) path: String,
  pub(crate) secure: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GameAuthContext {
  pub(crate) tgt: String,
  pub(crate) guid: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionSnapshot {
  pub(crate) cookies: Vec<CookieRecord>,
  #[serde(default)]
  user_agent: Option<String>,
  #[serde(default)]
  pub(crate) game_auth: Option<GameAuthContext>,
}

impl SessionSnapshot {
  pub(crate) fn anonymous() -> Self {
    Self {
      cookies: Vec::new(),
      user_agent: None,
      game_auth: None,
    }
  }
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
  session: SessionSnapshot,
  profile: LoginProfile,
}

pub struct LoginState {
  next_id: AtomicU64,
  lifecycle_version: Mutex<u64>,
  pending: Mutex<Option<PendingLogin>>,
  active: Mutex<Option<ActiveLogin>>,
  storage_path: Option<PathBuf>,
}

impl Default for LoginState {
  fn default() -> Self {
    Self {
      next_id: AtomicU64::new(1),
      lifecycle_version: Mutex::new(0),
      pending: Mutex::new(None),
      active: Mutex::new(None),
      storage_path: None,
    }
  }
}

impl LoginState {
  pub fn with_storage_path(storage_path: PathBuf) -> Self {
    Self {
      storage_path: Some(storage_path),
      ..Self::default()
    }
  }
}

#[tauri::command]
pub async fn sdo_login_status(state: State<'_, LoginState>) -> Result<LoginStatus, String> {
  let lifecycle_version = current_lifecycle_version(&state)?;
  if let Some(profile) = active_profile(&state)? {
    return Ok(authenticated_status(profile));
  }

  let stored_session = match load_stored_session(&state) {
    Ok(session) => session,
    Err(_) => {
      let _ = clear_stored_session(&state);
      None
    }
  };
  let Some(session) = stored_session else {
    return Ok(unauthenticated_status());
  };

  let response = match run_sidecar(json!({
    "operation": "restoreSession",
    "session": session,
  }))
  .await
  {
    Ok(response) => response,
    Err(_) => return Ok(unauthenticated_status()),
  };
  if response.status != "success" {
    let _ = clear_stored_session(&state);
    return Ok(unauthenticated_status());
  }
  let Some(profile) = response.profile else {
    let _ = clear_stored_session(&state);
    return Ok(unauthenticated_status());
  };
  if !is_complete_profile(&profile) {
    let _ = clear_stored_session(&state);
    return Ok(unauthenticated_status());
  }
  commit_active(&state, lifecycle_version, response.session, profile.clone())?;
  Ok(authenticated_status(profile))
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
  let lifecycle_version = current_lifecycle_version(&state)?;
  let response = run_sidecar(json!({ "operation": "startPush", "account": account })).await?;
  store_pending(&state, lifecycle_version, PendingKind::Push, response)
}

#[tauri::command]
pub async fn sdo_start_qr_login(state: State<'_, LoginState>) -> Result<LoginStart, String> {
  let lifecycle_version = current_lifecycle_version(&state)?;
  let response = run_sidecar(json!({ "operation": "startQr" })).await?;
  store_pending(&state, lifecycle_version, PendingKind::Qr, response)
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
  user_agent: String,
  state: State<'_, LoginState>,
) -> Result<LoginPoll, String> {
  if cookie.is_empty() || cookie.len() > 16 * 1024 || cookie.contains('\r') || cookie.contains('\n')
  {
    return Err("The cookie is empty, too long, or contains a line break.".to_owned());
  }
  let user_agent = user_agent.trim().to_owned();
  validate_user_agent(&user_agent)?;
  let lifecycle_version = current_lifecycle_version(&state)?;
  let response = run_sidecar(json!({
    "operation": "cookieLogin",
    "cookie": cookie,
    "userAgent": user_agent,
  }))
  .await?;
  if response.status == "binding_required" {
    return Ok(LoginPoll {
      status: "binding_required".to_owned(),
      profile: None,
    });
  }
  if response.status != "success" {
    return Err("The Cookie login did not complete.".to_owned());
  }
  let profile = response
    .profile
    .ok_or_else(|| "Login verification returned no account profile.".to_owned())?;
  ensure_complete_profile(&profile)?;
  commit_active(&state, lifecycle_version, response.session, profile.clone())?;
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

/// Remove persisted credentials and reset every in-memory login state value.
#[tauri::command]
pub fn clear_all_local_data(state: State<'_, LoginState>) -> Result<(), String> {
  clear_all_local_data_inner(&state)
}

fn store_pending(
  state: &LoginState,
  expected_lifecycle_version: u64,
  kind: PendingKind,
  response: SidecarResponse,
) -> Result<LoginStart, String> {
  let biz_context = response
    .biz_context
    .ok_or_else(|| "The SDO response is missing session data.".to_owned())?;
  let lifecycle_version = state
    .lifecycle_version
    .lock()
    .map_err(|_| "Unable to read the login lifecycle.".to_owned())?;
  ensure_current_lifecycle(*lifecycle_version, expected_lifecycle_version)?;
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
  let lifecycle_version = current_lifecycle_version(state)?;
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
    ensure_complete_profile(&profile)?;
    let session = response.session;
    *current = None;
    drop(current);
    commit_active(state, lifecycle_version, session, profile.clone())?;
    return Ok(LoginPoll {
      status: "success".to_owned(),
      profile: Some(profile),
    });
  }

  if response.status == "binding_required" {
    *current = None;
    return Ok(LoginPoll {
      status: "binding_required".to_owned(),
      profile: None,
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
  state: &LoginState,
  expected_lifecycle_version: u64,
  session: SessionSnapshot,
  profile: LoginProfile,
) -> Result<(), String> {
  ensure_complete_profile(&profile)?;
  let lifecycle_version = state
    .lifecycle_version
    .lock()
    .map_err(|_| "Unable to read the login lifecycle.".to_owned())?;
  ensure_current_lifecycle(*lifecycle_version, expected_lifecycle_version)?;
  persist_session(state.storage_path.as_deref(), &session)?;
  *state
    .active
    .lock()
    .map_err(|_| "Unable to store the authenticated session.".to_owned())? =
    Some(ActiveLogin { session, profile });
  Ok(())
}

fn active_profile(state: &LoginState) -> Result<Option<LoginProfile>, String> {
  let active = state
    .active
    .lock()
    .map_err(|_| "Unable to read the login state.".to_owned())?;
  Ok(active.as_ref().map(|login| login.profile.clone()))
}

fn validate_user_agent(user_agent: &str) -> Result<(), String> {
  if user_agent.len() < 20
    || user_agent.len() > MAX_USER_AGENT_BYTES
    || !user_agent.is_ascii()
    || user_agent.chars().any(char::is_control)
  {
    return Err(
      "Enter the complete User-Agent from the browser that supplied the Cookie.".to_owned(),
    );
  }
  Ok(())
}

fn is_complete_profile(profile: &LoginProfile) -> bool {
  !profile.display_account.is_empty() && !profile.character_name.is_empty()
}

fn ensure_complete_profile(profile: &LoginProfile) -> Result<(), String> {
  if is_complete_profile(profile) {
    Ok(())
  } else {
    Err("Login verification returned no bound character.".to_owned())
  }
}

fn authenticated_status(profile: LoginProfile) -> LoginStatus {
  LoginStatus {
    authenticated: true,
    profile: Some(profile),
  }
}

fn unauthenticated_status() -> LoginStatus {
  LoginStatus {
    authenticated: false,
    profile: None,
  }
}

fn persist_session(path: Option<&Path>, session: &SessionSnapshot) -> Result<(), String> {
  let Some(path) = path else {
    return Ok(());
  };
  let mut plaintext = serde_json::to_vec(session)
    .map_err(|_| "Unable to serialize the authenticated session.".to_owned())?;
  let save_result = secure_storage::save(path, &plaintext);
  plaintext.fill(0);
  save_result
}

fn load_stored_session(state: &LoginState) -> Result<Option<SessionSnapshot>, String> {
  let Some(path) = state.storage_path.as_deref() else {
    return Ok(None);
  };
  let Some(mut plaintext) = secure_storage::load(path)? else {
    return Ok(None);
  };
  let parsed = serde_json::from_slice(&plaintext)
    .map_err(|_| "Unable to parse the protected session.".to_owned());
  plaintext.fill(0);
  parsed.map(Some)
}

/// Return the in-memory session when available, otherwise decrypt the persisted login snapshot.
/// The snapshot is crate-private so credentials can only travel between trusted Rust commands.
pub(crate) fn current_session(state: &LoginState) -> Result<Option<SessionSnapshot>, String> {
  let active = state
    .active
    .lock()
    .map_err(|_| "Unable to read the login state.".to_owned())?;
  if let Some(login) = active.as_ref() {
    return Ok(Some(login.session.clone()));
  }
  drop(active);
  load_stored_session(state)
}

/// Persist a trusted sidecar session update without exposing credentials to the webview.
pub(crate) fn replace_current_session(
  state: &LoginState,
  session: SessionSnapshot,
) -> Result<(), String> {
  let mut active = state
    .active
    .lock()
    .map_err(|_| "Unable to update the authenticated session.".to_owned())?;
  let login = active
    .as_mut()
    .ok_or_else(|| "AUTHENTICATION_REQUIRED".to_owned())?;
  persist_session(state.storage_path.as_deref(), &session)?;
  login.session = session;
  Ok(())
}

/// Merge WebView-generated anti-bot cookies back into the trusted API session.
pub(crate) fn merge_glamour_antibot_cookies(
  state: &LoginState,
  document_cookie: &str,
) -> Result<(), String> {
  let parsed = parse_antibot_cookies(document_cookie)?;

  let mut active = state
    .active
    .lock()
    .map_err(|_| "Unable to update the authenticated session.".to_owned())?;
  if let Some(login) = active.as_mut() {
    merge_cookie_records(&mut login.session, &parsed);
    persist_session(state.storage_path.as_deref(), &login.session)?;
    return Ok(());
  }
  drop(active);
  let mut session = load_stored_session(state)?
    .ok_or_else(|| "There is no authenticated session to update.".to_owned())?;
  merge_cookie_records(&mut session, &parsed);
  persist_session(state.storage_path.as_deref(), &session)
}

pub(crate) fn merge_antibot_cookies(
  session: &mut SessionSnapshot,
  document_cookie: &str,
) -> Result<(), String> {
  let parsed = parse_antibot_cookies(document_cookie)?;
  merge_cookie_records(session, &parsed);
  Ok(())
}

fn parse_antibot_cookies(document_cookie: &str) -> Result<Vec<(String, String)>, String> {
  let parsed = document_cookie
    .split(';')
    .filter_map(|part| part.trim().split_once('='))
    .filter(|(name, _)| GLAMOUR_ANTIBOT_COOKIES.contains(name))
    .map(|(name, value)| (name.to_owned(), value.trim().to_owned()))
    .filter(|(_, value)| {
      !value.is_empty() && value.len() <= 256 && !value.chars().any(char::is_control)
    })
    .collect::<Vec<_>>();
  if !GLAMOUR_ANTIBOT_COOKIES
    .iter()
    .all(|required| parsed.iter().any(|(name, _)| name == required))
  {
    return Err("The Rising Stones verification cookies are incomplete.".to_owned());
  }
  Ok(parsed)
}

fn merge_cookie_records(session: &mut SessionSnapshot, cookies: &[(String, String)]) {
  for (name, value) in cookies {
    session.cookies.retain(|cookie| {
      cookie.name != *name
        || cookie.domain.trim_start_matches('.') != GLAMOUR_API_HOST
        || cookie.path != "/"
    });
    session.cookies.push(CookieRecord {
      name: name.clone(),
      value: value.clone(),
      domain: GLAMOUR_API_HOST.to_owned(),
      path: "/".to_owned(),
      secure: true,
    });
  }
}

fn clear_stored_session(state: &LoginState) -> Result<(), String> {
  if let Some(path) = state.storage_path.as_deref() {
    secure_storage::clear(path)?;
  }
  Ok(())
}

fn clear_all_local_data_inner(state: &LoginState) -> Result<(), String> {
  let mut lifecycle_version = state
    .lifecycle_version
    .lock()
    .map_err(|_| "Unable to update the login lifecycle.".to_owned())?;
  *lifecycle_version = lifecycle_version.wrapping_add(1);
  clear_stored_session(state)?;
  *state
    .pending
    .lock()
    .map_err(|_| "Unable to clear the pending login session.".to_owned())? = None;
  *state
    .active
    .lock()
    .map_err(|_| "Unable to clear the active login session.".to_owned())? = None;
  state.next_id.store(1, Ordering::Relaxed);
  Ok(())
}

fn current_lifecycle_version(state: &LoginState) -> Result<u64, String> {
  state
    .lifecycle_version
    .lock()
    .map(|version| *version)
    .map_err(|_| "Unable to read the login lifecycle.".to_owned())
}

fn ensure_current_lifecycle(current: u64, expected: u64) -> Result<(), String> {
  if current != expected {
    return Err("The login state was cleared. Start again.".to_owned());
  }
  Ok(())
}

fn clear_pending(state: &LoginState, login_id: u64) -> Result<(), String> {
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
    python_sidecar::request(&request, MAX_SIDECAR_RESPONSE_BYTES, "SDO login")
  })
  .await
  .map_err(|_| "The login task stopped unexpectedly.".to_owned())?
}

#[cfg(test)]
mod tests {
  use super::*;

  fn empty_session() -> SessionSnapshot {
    SessionSnapshot {
      cookies: vec![],
      user_agent: None,
      game_auth: None,
    }
  }

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

  #[test]
  fn session_snapshot_uses_the_python_user_agent_field_name() {
    let session = SessionSnapshot {
      cookies: vec![],
      user_agent: Some("test-user-agent".to_owned()),
      game_auth: None,
    };
    let serialized = serde_json::to_value(session).unwrap();

    assert_eq!(serialized["userAgent"], "test-user-agent");
    assert!(serialized.get("user_agent").is_none());
  }

  #[test]
  fn merges_only_complete_glamour_antibot_cookies() {
    let state = LoginState::default();
    *state.active.lock().unwrap() = Some(ActiveLogin {
      session: empty_session(),
      profile: LoginProfile {
        display_account: "test-account".to_owned(),
        character_name: "test-character".to_owned(),
        area_name: "test-area".to_owned(),
        group_name: "test-group".to_owned(),
      },
    });

    assert!(merge_glamour_antibot_cookies(&state, "EO_Bot_Ssid=123").is_err());
    merge_glamour_antibot_cookies(
      &state,
      "unrelated=value; __tst_status=456#; EO_Bot_Ssid=123",
    )
    .unwrap();

    let session = current_session(&state).unwrap().unwrap();
    assert_eq!(session.cookies.len(), 2);
    assert!(session.cookies.iter().all(|cookie| {
      GLAMOUR_ANTIBOT_COOKIES.contains(&cookie.name.as_str())
        && cookie.domain == GLAMOUR_API_HOST
        && cookie.secure
    }));
  }

  #[test]
  fn clearing_local_data_resets_every_in_memory_login_value() {
    let state = LoginState::default();
    state.next_id.store(42, Ordering::Relaxed);
    *state.lifecycle_version.lock().unwrap() = 7;
    *state.pending.lock().unwrap() = Some(PendingLogin {
      id: 41,
      kind: PendingKind::Qr,
      started_at: Instant::now(),
      session: empty_session(),
      biz_context: "test-context".to_owned(),
    });
    *state.active.lock().unwrap() = Some(ActiveLogin {
      session: empty_session(),
      profile: LoginProfile {
        display_account: "test-account".to_owned(),
        character_name: "test-character".to_owned(),
        area_name: "test-area".to_owned(),
        group_name: "test-group".to_owned(),
      },
    });

    clear_all_local_data_inner(&state).unwrap();

    assert_eq!(state.next_id.load(Ordering::Relaxed), 1);
    assert_eq!(*state.lifecycle_version.lock().unwrap(), 8);
    assert!(state.pending.lock().unwrap().is_none());
    assert!(state.active.lock().unwrap().is_none());
  }

  #[test]
  fn cleared_state_rejects_an_in_flight_login_result() {
    let state = LoginState::default();
    let lifecycle_version = current_lifecycle_version(&state).unwrap();

    clear_all_local_data_inner(&state).unwrap();
    let result = commit_active(
      &state,
      lifecycle_version,
      empty_session(),
      LoginProfile {
        display_account: "test-account".to_owned(),
        character_name: "test-character".to_owned(),
        area_name: "test-area".to_owned(),
        group_name: "test-group".to_owned(),
      },
    );

    assert!(result.is_err());
    assert!(state.active.lock().unwrap().is_none());
  }

  #[test]
  fn validates_browser_user_agents_without_accepting_header_injection() {
    assert!(validate_user_agent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151 Safari/537.36"
    )
    .is_ok());
    assert!(validate_user_agent("Mozilla/5.0\r\nCookie: secret").is_err());
    assert!(validate_user_agent("short").is_err());
  }

  #[test]
  fn refuses_to_commit_an_account_without_a_bound_character() {
    let state = LoginState::default();
    let lifecycle_version = current_lifecycle_version(&state).unwrap();
    let result = commit_active(
      &state,
      lifecycle_version,
      empty_session(),
      LoginProfile {
        display_account: "test-account".to_owned(),
        character_name: String::new(),
        area_name: String::new(),
        group_name: String::new(),
      },
    );

    assert!(result.is_err());
    assert!(state.active.lock().unwrap().is_none());
  }
}
