//! 石之家幻化接口的受控 Python sidecar 桥接层。
//!
//! 参数只用于硬编码接口的查询字符串；登录 Cookie 从受保护的 Rust 状态读取。

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::{
  python_sidecar,
  sdo_login::{self, LoginState, SessionSnapshot},
};

const MAX_GLAMOUR_BODY_BYTES: usize = 5 * 1024 * 1024;
// A JSON string can expand each source byte into a six-byte Unicode escape.
const MAX_SIDECAR_RESPONSE_BYTES: usize = 6 * MAX_GLAMOUR_BODY_BYTES + 1024;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlamourPageRequest {
  page: u32,
  limit: u32,
  order: Option<String>,
  race_id: Option<u8>,
  gender_id: Option<u8>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GlamourPageResponse {
  status: u16,
  body: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlamourDetailRequest {
  id: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SidecarRequest {
  operation: &'static str,
  page: u32,
  limit: u32,
  #[serde(skip_serializing_if = "Option::is_none")]
  order: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  race_id: Option<u8>,
  #[serde(skip_serializing_if = "Option::is_none")]
  gender_id: Option<u8>,
  session: SessionSnapshot,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SidecarDetailRequest {
  operation: &'static str,
  id: u64,
  session: SessionSnapshot,
}

/// 使用 curl_cffi 的 Chrome 模拟器和当前受保护登录态读取单页投稿。
#[tauri::command]
pub async fn fetch_glamour_page(
  request: GlamourPageRequest,
  state: State<'_, LoginState>,
) -> Result<GlamourPageResponse, String> {
  validate_request(&request)?;
  let session = sdo_login::current_session(&state)?
    .ok_or_else(|| "请先登录石之家，再读取幻化投稿。".to_owned())?;
  tauri::async_runtime::spawn_blocking(move || run_python_client(request, session))
    .await
    .map_err(|_| "The glamour request task stopped unexpectedly.".to_owned())?
}

/// Reads one complete glamour submission with its equipment and image data.
#[tauri::command]
pub async fn fetch_glamour_detail(
  request: GlamourDetailRequest,
  state: State<'_, LoginState>,
) -> Result<GlamourPageResponse, String> {
  validate_detail_request(&request)?;
  let session = sdo_login::current_session(&state)?
    .ok_or_else(|| "请先登录石之家，再读取幻化详情。".to_owned())?;
  tauri::async_runtime::spawn_blocking(move || run_python_detail(request.id, session))
    .await
    .map_err(|_| "The glamour detail task stopped unexpectedly.".to_owned())?
}

fn validate_detail_request(request: &GlamourDetailRequest) -> Result<(), String> {
  if request.id == 0 {
    return Err("The glamour identifier is invalid.".to_owned());
  }
  Ok(())
}

fn validate_request(request: &GlamourPageRequest) -> Result<(), String> {
  if request.page == 0 || request.page > 10_000 {
    return Err("The page number is outside the allowed range.".to_owned());
  }
  if request.limit == 0 || request.limit > 50 {
    return Err("The page size must be between 1 and 50.".to_owned());
  }
  if !matches!(
    request.order.as_deref(),
    None | Some("latest") | Some("hot")
  ) {
    return Err("The requested sort order is invalid.".to_owned());
  }
  if request
    .race_id
    .is_some_and(|value| !(1..=8).contains(&value))
    || request
      .gender_id
      .is_some_and(|value| !(1..=2).contains(&value))
  {
    return Err("The race or gender filter is invalid.".to_owned());
  }
  Ok(())
}

fn run_python_client(
  request: GlamourPageRequest,
  session: SessionSnapshot,
) -> Result<GlamourPageResponse, String> {
  python_sidecar::request(
    &SidecarRequest {
      operation: "fetchGlamourPage",
      page: request.page,
      limit: request.limit,
      order: backend_order(request.order),
      race_id: request.race_id,
      gender_id: request.gender_id,
      session,
    },
    MAX_SIDECAR_RESPONSE_BYTES,
    "Rising Stones glamour",
  )
}

fn backend_order(order: Option<String>) -> Option<String> {
  order.filter(|value| value == "latest")
}

fn run_python_detail(id: u64, session: SessionSnapshot) -> Result<GlamourPageResponse, String> {
  python_sidecar::request(
    &SidecarDetailRequest {
      operation: "fetchGlamourDetail",
      id,
      session,
    },
    MAX_SIDECAR_RESPONSE_BYTES,
    "Rising Stones glamour detail",
  )
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn rejects_parameters_outside_the_public_glamour_query() {
    let mut request = GlamourPageRequest {
      page: 1,
      limit: 12,
      order: Some("latest".to_owned()),
      race_id: None,
      gender_id: None,
    };
    assert!(validate_request(&request).is_ok());
    request.race_id = Some(1);
    request.gender_id = Some(2);
    assert!(validate_request(&request).is_ok());
    request.order = Some("random".to_owned());
    assert!(validate_request(&request).is_err());
  }

  #[test]
  fn accepts_a_request_without_optional_filters() {
    let request: GlamourPageRequest = serde_json::from_value(serde_json::json!({
      "page": 1,
      "limit": 12
    }))
    .expect("request should deserialize");

    assert_eq!(request.race_id, None);
    assert_eq!(request.gender_id, None);
    assert_eq!(request.order, None);
    assert!(validate_request(&request).is_ok());
  }

  #[test]
  fn omits_hot_order_from_the_backend_request() {
    assert_eq!(backend_order(Some("hot".to_owned())), None);
    assert_eq!(
      backend_order(Some("latest".to_owned())),
      Some("latest".to_owned())
    );
  }

  #[test]
  fn rejects_an_empty_glamour_detail_identifier() {
    let request = GlamourDetailRequest { id: 0 };
    assert!(validate_detail_request(&request).is_err());
    assert!(validate_detail_request(&GlamourDetailRequest { id: 287_009 }).is_ok());
  }
}
