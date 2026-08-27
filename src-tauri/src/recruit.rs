//! Constrained bridge for public Rising Stones recruitment endpoints.
//!
//! Anonymous anti-bot cookies live only in Rust memory. A single recovery gate
//! executes allowlisted JavaScript challenges and shares recovered cookies with
//! subsequent list and detail requests without requiring user authentication.

use std::{
  sync::Mutex,
  time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tokio::sync::Mutex as AsyncMutex;

use crate::{
  glamour_verification::{self, GlamourVerificationState},
  python_sidecar,
  sdo_login::{self, SessionSnapshot},
};

const MAX_RECRUIT_BODY_BYTES: usize = 5 * 1024 * 1024;
const MAX_SIDECAR_RESPONSE_BYTES: usize = 6 * MAX_RECRUIT_BODY_BYTES + 4096;
const RECOVERY_FAILURE_COOLDOWN: Duration = Duration::from_millis(1500);

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecruitPageRequest {
  page: u32,
  limit: u32,
  duty_name: String,
  duty_type: String,
  target_area_id: Option<u16>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecruitDetailRequest {
  id: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RecruitResponse {
  status: u16,
  body: String,
  #[serde(default, skip_serializing)]
  url: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RecruitConfigResponse {
  jobs: RecruitResponse,
  duties: RecruitResponse,
  labels: RecruitResponse,
  areas: RecruitResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecruitOperationRequest<'a> {
  operation: &'a str,
  session: SessionSnapshot,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecruitPageOperationRequest {
  operation: &'static str,
  page: u32,
  limit: u32,
  duty_name: String,
  duty_type: String,
  target_area_id: Option<u16>,
  session: SessionSnapshot,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecruitDetailOperationRequest {
  operation: &'static str,
  id: u64,
  session: SessionSnapshot,
}

struct RecruitSessionInner {
  snapshot: SessionSnapshot,
  generation: u64,
  last_recovery_failure: Option<Instant>,
}

pub struct RecruitSessionState {
  inner: Mutex<RecruitSessionInner>,
  recovery: AsyncMutex<()>,
}

impl Default for RecruitSessionState {
  fn default() -> Self {
    Self {
      inner: Mutex::new(RecruitSessionInner {
        snapshot: SessionSnapshot::anonymous(),
        generation: 0,
        last_recovery_failure: None,
      }),
      recovery: AsyncMutex::new(()),
    }
  }
}

impl RecruitSessionState {
  fn snapshot(&self) -> Result<(SessionSnapshot, u64), String> {
    let inner = self
      .inner
      .lock()
      .map_err(|_| "Unable to read the anonymous recruitment session.".to_owned())?;
    Ok((inner.snapshot.clone(), inner.generation))
  }

  fn merge_antibot_cookies(&self, document_cookie: &str) -> Result<(), String> {
    let mut inner = self
      .inner
      .lock()
      .map_err(|_| "Unable to update the anonymous recruitment session.".to_owned())?;
    sdo_login::merge_antibot_cookies(&mut inner.snapshot, document_cookie)?;
    inner.generation = inner.generation.saturating_add(1);
    inner.last_recovery_failure = None;
    Ok(())
  }

  fn recovery_is_cooling_down(&self) -> Result<bool, String> {
    let inner = self
      .inner
      .lock()
      .map_err(|_| "Unable to read the anonymous recruitment session.".to_owned())?;
    Ok(
      inner
        .last_recovery_failure
        .is_some_and(|failed_at| failed_at.elapsed() < RECOVERY_FAILURE_COOLDOWN),
    )
  }

  fn mark_recovery_failure(&self) -> Result<(), String> {
    let mut inner = self
      .inner
      .lock()
      .map_err(|_| "Unable to update the anonymous recruitment session.".to_owned())?;
    inner.last_recovery_failure = Some(Instant::now());
    Ok(())
  }
}

/// Fetches public filter metadata without attaching an authenticated session.
#[tauri::command]
pub async fn fetch_recruit_config(
  app: AppHandle,
  state: State<'_, RecruitSessionState>,
  verification: State<'_, GlamourVerificationState>,
) -> Result<RecruitConfigResponse, String> {
  let (session, generation) = state.snapshot()?;
  let mut response = run_config(session).await?;
  if let Some((url, body)) = find_config_challenge(&response) {
    let direct_body =
      recover_challenge(&app, &state, &verification, generation, &url, &body).await?;
    if let Some(body) = direct_body {
      replace_config_response_body(&mut response, &url, body);
    } else {
      response = run_config(state.snapshot()?.0).await?;
    }
    if find_config_challenge(&response).is_some() {
      return Err("Rising Stones automatic verification did not clear the challenge.".to_owned());
    }
  }
  Ok(response)
}

/// Fetches one public recruitment page using a fixed query contract.
#[tauri::command]
pub async fn fetch_recruit_page(
  request: RecruitPageRequest,
  app: AppHandle,
  state: State<'_, RecruitSessionState>,
  verification: State<'_, GlamourVerificationState>,
) -> Result<RecruitResponse, String> {
  validate_page_request(&request)?;
  let (session, generation) = state.snapshot()?;
  let mut response = run_page(request.clone(), session).await?;
  if is_bot_challenge(&response.body) {
    if let Some(body) = recover_challenge(
      &app,
      &state,
      &verification,
      generation,
      &response.url,
      &response.body,
    )
    .await?
    {
      response.status = 200;
      response.body = body;
    } else {
      response = run_page(request, state.snapshot()?.0).await?;
    }
    reject_remaining_challenge(&response)?;
  }
  Ok(response)
}

/// Fetches one complete public recruitment record by numeric identifier.
#[tauri::command]
pub async fn fetch_recruit_detail(
  request: RecruitDetailRequest,
  app: AppHandle,
  state: State<'_, RecruitSessionState>,
  verification: State<'_, GlamourVerificationState>,
) -> Result<RecruitResponse, String> {
  if request.id == 0 {
    return Err("The recruitment identifier is invalid.".to_owned());
  }
  let (session, generation) = state.snapshot()?;
  let mut response = run_detail(request.id, session).await?;
  if is_bot_challenge(&response.body) {
    if let Some(body) = recover_challenge(
      &app,
      &state,
      &verification,
      generation,
      &response.url,
      &response.body,
    )
    .await?
    {
      response.status = 200;
      response.body = body;
    } else {
      response = run_detail(request.id, state.snapshot()?.0).await?;
    }
    reject_remaining_challenge(&response)?;
  }
  Ok(response)
}

async fn recover_challenge(
  app: &AppHandle,
  state: &RecruitSessionState,
  verification: &GlamourVerificationState,
  request_generation: u64,
  url: &str,
  body: &str,
) -> Result<Option<String>, String> {
  let _recovery = state.recovery.lock().await;
  let (session, current_generation) = state.snapshot()?;
  if current_generation > request_generation {
    return Ok(None);
  }
  if state.recovery_is_cooling_down()? {
    return Err("Rising Stones automatic verification challenge is cooling down.".to_owned());
  }
  let solution =
    match glamour_verification::verify_anonymous(app, verification, &session, url, body).await {
      Ok(solution) => solution,
      Err(error) => {
        state.mark_recovery_failure()?;
        return Err(format!(
          "Rising Stones automatic verification failed: {error}"
        ));
      }
    };
  if !solution.document_cookie.is_empty() {
    if let Err(error) = state.merge_antibot_cookies(&solution.document_cookie) {
      state.mark_recovery_failure()?;
      return Err(error);
    }
  }
  Ok(solution.body)
}

async fn run_config(session: SessionSnapshot) -> Result<RecruitConfigResponse, String> {
  tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request(
      &RecruitOperationRequest {
        operation: "fetchRecruitConfig",
        session,
      },
      MAX_SIDECAR_RESPONSE_BYTES,
      "Rising Stones recruitment configuration",
    )
  })
  .await
  .map_err(|_| "The recruitment configuration task stopped unexpectedly.".to_owned())?
}

async fn run_page(
  request: RecruitPageRequest,
  session: SessionSnapshot,
) -> Result<RecruitResponse, String> {
  tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request(
      &RecruitPageOperationRequest {
        operation: "fetchRecruitPage",
        page: request.page,
        limit: request.limit,
        duty_name: request.duty_name.trim().to_owned(),
        duty_type: request.duty_type.trim().to_owned(),
        target_area_id: request.target_area_id,
        session,
      },
      MAX_SIDECAR_RESPONSE_BYTES,
      "Rising Stones recruitment list",
    )
  })
  .await
  .map_err(|_| "The recruitment list task stopped unexpectedly.".to_owned())?
}

async fn run_detail(id: u64, session: SessionSnapshot) -> Result<RecruitResponse, String> {
  tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request(
      &RecruitDetailOperationRequest {
        operation: "fetchRecruitDetail",
        id,
        session,
      },
      MAX_SIDECAR_RESPONSE_BYTES,
      "Rising Stones recruitment detail",
    )
  })
  .await
  .map_err(|_| "The recruitment detail task stopped unexpectedly.".to_owned())?
}

fn find_config_challenge(response: &RecruitConfigResponse) -> Option<(String, String)> {
  [
    &response.jobs,
    &response.duties,
    &response.labels,
    &response.areas,
  ]
  .into_iter()
  .find(|item| is_bot_challenge(&item.body))
  .map(|item| (item.url.clone(), item.body.clone()))
}

fn replace_config_response_body(response: &mut RecruitConfigResponse, url: &str, body: String) {
  if let Some(item) = [
    &mut response.jobs,
    &mut response.duties,
    &mut response.labels,
    &mut response.areas,
  ]
  .into_iter()
  .find(|item| item.url == url)
  {
    item.status = 200;
    item.body = body;
  }
}

fn is_bot_challenge(body: &str) -> bool {
  body.contains("__tst_status")
    || body.contains("EO_Bot_Ssid")
    || body.to_ascii_lowercase().contains("<script>function a(a)")
}

fn reject_remaining_challenge(response: &RecruitResponse) -> Result<(), String> {
  if is_bot_challenge(&response.body) {
    Err("Rising Stones automatic verification did not clear the challenge.".to_owned())
  } else {
    Ok(())
  }
}

fn validate_page_request(request: &RecruitPageRequest) -> Result<(), String> {
  if request.page == 0 || request.page > 10_000 {
    return Err("The recruitment page number is outside the allowed range.".to_owned());
  }
  if request.limit == 0 || request.limit > 50 {
    return Err("The recruitment page size must be between 1 and 50.".to_owned());
  }
  if request
    .target_area_id
    .is_some_and(|id| id == 0 || id > 1000)
  {
    return Err("The recruitment area identifier is invalid.".to_owned());
  }
  for value in [&request.duty_name, &request.duty_type] {
    if value.chars().count() > 120 || value.chars().any(char::is_control) {
      return Err("A recruitment filter is invalid.".to_owned());
    }
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  fn valid_page_request() -> RecruitPageRequest {
    RecruitPageRequest {
      page: 1,
      limit: 9,
      duty_name: String::new(),
      duty_type: "Ultimate".to_owned(),
      target_area_id: Some(1),
    }
  }

  #[test]
  fn accepts_the_public_recruitment_query_shape() {
    let mut request = valid_page_request();
    request.limit = 50;
    assert!(validate_page_request(&request).is_ok());
  }

  #[test]
  fn detects_the_edgeone_cookie_challenge() {
    assert!(is_bot_challenge(
      "<script>function a(a){} document.cookie='__tst_status=1'; document.cookie='EO_Bot_Ssid=2';</script>"
    ));
  }

  #[test]
  fn anonymous_session_starts_empty_and_accepts_complete_challenge_cookies() {
    let state = RecruitSessionState::default();
    let (before, generation) = state.snapshot().unwrap();
    assert!(before.cookies.is_empty());
    assert_eq!(generation, 0);

    state
      .merge_antibot_cookies("__tst_status=456#; EO_Bot_Ssid=123")
      .unwrap();
    let (after, generation) = state.snapshot().unwrap();
    assert_eq!(after.cookies.len(), 2);
    assert_eq!(generation, 1);
  }

  #[test]
  fn failed_recovery_temporarily_blocks_duplicate_solver_attempts() {
    let state = RecruitSessionState::default();
    assert!(!state.recovery_is_cooling_down().unwrap());
    state.mark_recovery_failure().unwrap();
    assert!(state.recovery_is_cooling_down().unwrap());
  }

  #[test]
  fn rejects_oversized_or_control_character_filters() {
    let mut request = valid_page_request();
    request.duty_name = "x".repeat(121);
    assert!(validate_page_request(&request).is_err());
    request.duty_name = "invalid\nname".to_owned();
    assert!(validate_page_request(&request).is_err());
  }
}
