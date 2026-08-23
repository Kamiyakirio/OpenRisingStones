//! 石之家幻化接口的受控 Python sidecar 桥接层。
//!
//! 参数只用于硬编码接口的查询字符串，不允许前端传入 URL、Cookie 或任意请求头。

use std::{
  io::Write,
  process::{Command, Stdio},
};

use serde::{Deserialize, Serialize};

const CLIENT_SCRIPT: &str = include_str!("../python/glamour_client.py");
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

/// 使用 curl_cffi 的 Chrome 模拟器读取单页投稿；Python 进程结束后不保留会话或 Cookie。
#[tauri::command]
pub async fn fetch_glamour_page(
  request: GlamourPageRequest,
) -> Result<GlamourPageResponse, String> {
  validate_request(&request)?;
  tauri::async_runtime::spawn_blocking(move || run_python_client(request))
    .await
    .map_err(|_| "幻化请求任务意外终止".to_owned())?
}

fn validate_request(request: &GlamourPageRequest) -> Result<(), String> {
  if request.page == 0 || request.page > 10_000 {
    return Err("页码超出允许范围".to_owned());
  }
  if request.limit == 0 || request.limit > 50 {
    return Err("每页数量必须在 1 到 50 之间".to_owned());
  }
  if !matches!(request.order.as_str(), "latest" | "hot") {
    return Err("排序方式无效".to_owned());
  }
  if !(1..=8).contains(&request.race_id) || !(1..=2).contains(&request.gender_id) {
    return Err("种族或性别参数无效".to_owned());
  }
  Ok(())
}

fn run_python_client(request: GlamourPageRequest) -> Result<GlamourPageResponse, String> {
  let input = serde_json::to_vec(&request).map_err(|_| "无法序列化幻化请求".to_owned())?;
  let output = execute_python("python", &["-c", CLIENT_SCRIPT], &input)
    .or_else(|error| {
      if error.starts_with("not-found:") {
        execute_python("py", &["-3", "-c", CLIENT_SCRIPT], &input)
      } else {
        Err(error)
      }
    })?;

  if output.len() > MAX_RESPONSE_BYTES {
    return Err("石之家响应超过大小限制".to_owned());
  }
  serde_json::from_slice(&output).map_err(|_| "curl_cffi 返回了无法解析的数据".to_owned())
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
      "无法启动 Python 幻化客户端".to_owned()
    }
  })?;
  child
    .stdin
    .take()
    .ok_or_else(|| "无法写入 Python 幻化客户端".to_owned())?
    .write_all(input)
    .map_err(|_| "无法写入 Python 幻化客户端".to_owned())?;

  let output = child
    .wait_with_output()
    .map_err(|_| "等待 Python 幻化客户端失败".to_owned())?;
  if !output.status.success() {
    let detail = String::from_utf8_lossy(&output.stderr);
    let detail = detail.trim().chars().take(240).collect::<String>();
    return Err(if detail.is_empty() {
      "curl_cffi 请求失败".to_owned()
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
