//! Constrained bridge for the public Rising Stones recruitment endpoints.
//!
//! Recruitment requests intentionally create an anonymous client and never read the
//! protected login state. Only the endpoint parameters represented below can cross
//! the WebView boundary.

use serde::{Deserialize, Serialize};

use crate::python_sidecar;

const MAX_RECRUIT_BODY_BYTES: usize = 5 * 1024 * 1024;
const MAX_SIDECAR_RESPONSE_BYTES: usize = 6 * MAX_RECRUIT_BODY_BYTES + 4096;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecruitPageRequest {
  page: u32,
  limit: u32,
  duty_name: String,
  duty_type: String,
  target_area_id: Option<u16>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecruitDetailRequest {
  id: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RecruitResponse {
  status: u16,
  body: String,
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
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecruitDetailOperationRequest {
  operation: &'static str,
  id: u64,
}

/// Fetches the public filter metadata without attaching an authenticated session.
#[tauri::command]
pub async fn fetch_recruit_config() -> Result<RecruitConfigResponse, String> {
  tauri::async_runtime::spawn_blocking(|| {
    python_sidecar::request(
      &RecruitOperationRequest {
        operation: "fetchRecruitConfig",
      },
      MAX_SIDECAR_RESPONSE_BYTES,
      "Rising Stones recruitment configuration",
    )
  })
  .await
  .map_err(|_| "The recruitment configuration task stopped unexpectedly.".to_owned())?
}

/// Fetches one public recruitment page using a fixed query contract.
#[tauri::command]
pub async fn fetch_recruit_page(request: RecruitPageRequest) -> Result<RecruitResponse, String> {
  validate_page_request(&request)?;
  tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request(
      &RecruitPageOperationRequest {
        operation: "fetchRecruitPage",
        page: request.page,
        limit: request.limit,
        duty_name: request.duty_name.trim().to_owned(),
        duty_type: request.duty_type.trim().to_owned(),
        target_area_id: request.target_area_id,
      },
      MAX_SIDECAR_RESPONSE_BYTES,
      "Rising Stones recruitment list",
    )
  })
  .await
  .map_err(|_| "The recruitment list task stopped unexpectedly.".to_owned())?
}

/// Fetches one public recruitment detail record by its numeric identifier.
#[tauri::command]
pub async fn fetch_recruit_detail(
  request: RecruitDetailRequest,
) -> Result<RecruitResponse, String> {
  if request.id == 0 {
    return Err("The recruitment identifier is invalid.".to_owned());
  }
  tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request(
      &RecruitDetailOperationRequest {
        operation: "fetchRecruitDetail",
        id: request.id,
      },
      MAX_SIDECAR_RESPONSE_BYTES,
      "Rising Stones recruitment detail",
    )
  })
  .await
  .map_err(|_| "The recruitment detail task stopped unexpectedly.".to_owned())?
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
  fn rejects_oversized_or_control_character_filters() {
    let mut request = valid_page_request();
    request.duty_name = "x".repeat(121);
    assert!(validate_page_request(&request).is_err());
    request.duty_name = "invalid\nname".to_owned();
    assert!(validate_page_request(&request).is_err());
  }
}
