//! 石之家幻化接口的受控 Python sidecar 桥接层。
//!
//! 参数只用于硬编码接口的查询字符串；登录 Cookie 从受保护的 Rust 状态读取。

use std::{
  io::Write,
  process::{Command, Stdio},
};

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::sdo_login::{self, LoginState, SessionSnapshot};

const CLIENT_SCRIPT: &str = include_str!("../python/api_client.py");
const MAX_RESPONSE_BYTES: usize = 5 * 1024 * 1024;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlamourPageRequest {
  page: u32,
  limit: u32,
  order: String,
  race_id: u8,
  gender_id: u8,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GlamourPageResponse {
  status: u16,
  body: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SidecarRequest {
  operation: &'static str,
  page: u32,
  limit: u32,
  order: String,
  race_id: u8,
  gender_id: u8,
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

fn validate_request(request: &GlamourPageRequest) -> Result<(), String> {
  if request.page == 0 || request.page > 10_000 {
    return Err("The page number is outside the allowed range.".to_owned());
  }
  if request.limit == 0 || request.limit > 50 {
    return Err("The page size must be between 1 and 50.".to_owned());
  }
  if !matches!(request.order.as_str(), "latest" | "hot") {
    return Err("The requested sort order is invalid.".to_owned());
  }
  if !(1..=8).contains(&request.race_id) || !(1..=2).contains(&request.gender_id) {
    return Err("The race or gender filter is invalid.".to_owned());
  }
  Ok(())
}

fn run_python_client(
  request: GlamourPageRequest,
  session: SessionSnapshot,
) -> Result<GlamourPageResponse, String> {
  let input = serde_json::to_vec(&SidecarRequest {
    operation: "fetchGlamourPage",
    page: request.page,
    limit: request.limit,
    order: request.order,
    race_id: request.race_id,
    gender_id: request.gender_id,
    session,
  })
  .map_err(|_| "Unable to serialize the glamour request.".to_owned())?;
  let output = execute_python("python", &["-c", CLIENT_SCRIPT], &input).or_else(|error| {
    if error.starts_with("not-found:") {
      execute_python("py", &["-3", "-c", CLIENT_SCRIPT], &input)
    } else {
      Err(error)
    }
  })?;

  if output.len() > MAX_RESPONSE_BYTES {
    return Err("The Rising Stones response exceeded the size limit.".to_owned());
  }
  serde_json::from_slice(&output).map_err(|_| "Unable to parse the curl_cffi response.".to_owned())
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
      "Unable to start the Python glamour client.".to_owned()
    }
  })?;
  child
    .stdin
    .take()
    .ok_or_else(|| "Unable to open stdin for the Python glamour client.".to_owned())?
    .write_all(input)
    .map_err(|_| "Unable to write to the Python glamour client.".to_owned())?;

  let output = child
    .wait_with_output()
    .map_err(|_| "Unable to wait for the Python glamour client.".to_owned())?;
  if !output.status.success() {
    let detail = String::from_utf8_lossy(&output.stderr);
    let detail = detail.trim().chars().take(240).collect::<String>();
    return Err(if detail.is_empty() {
      "The curl_cffi request failed.".to_owned()
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
  fn rejects_parameters_outside_the_public_glamour_query() {
    let mut request = GlamourPageRequest {
      page: 1,
      limit: 12,
      order: "latest".to_owned(),
      race_id: 1,
      gender_id: 1,
    };
    assert!(validate_request(&request).is_ok());
    request.order = "random".to_owned();
    assert!(validate_request(&request).is_err());
  }
}
