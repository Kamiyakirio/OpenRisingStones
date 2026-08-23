//! 受控的异步 HTTPS 客户端，供 Tauri 前端访问公网 API。
//!
//! 每次请求都会先解析并固定公网 IP，避免 DNS 重绑定绕过内网地址检查。

use std::{
  collections::BTreeMap,
  net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr},
  time::Duration,
};

use reqwest::{header::HeaderMap, Client, Method};
use serde::{Deserialize, Serialize};
use tokio::net::lookup_host;
use tokio::time::timeout;
use url::{Host, Url};

const DEFAULT_TIMEOUT_MS: u64 = 15_000;
const MAX_TIMEOUT_MS: u64 = 30_000;
const MAX_URL_BYTES: usize = 2 * 1024;
const MAX_REQUEST_BODY_BYTES: usize = 1024 * 1024;
const MAX_RESPONSE_BODY_BYTES: usize = 5 * 1024 * 1024;
const MAX_HEADER_COUNT: usize = 32;
const MAX_HEADER_BYTES: usize = 8 * 1024;

/// 前端可使用的 HTTP 方法。刻意不开放 CONNECT、TRACE 等高风险方法。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum NetworkMethod {
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Head,
}

impl From<NetworkMethod> for Method {
  fn from(method: NetworkMethod) -> Self {
    match method {
      NetworkMethod::Get => Method::GET,
      NetworkMethod::Post => Method::POST,
      NetworkMethod::Put => Method::PUT,
      NetworkMethod::Patch => Method::PATCH,
      NetworkMethod::Delete => Method::DELETE,
      NetworkMethod::Head => Method::HEAD,
    }
  }
}

/// 从前端传入的网络请求。所有大小和时间参数仍会在 Rust 端强制校验。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkRequest {
  pub url: String,
  pub method: NetworkMethod,
  #[serde(default)]
  pub headers: BTreeMap<String, String>,
  pub body: Option<String>,
  pub timeout_ms: Option<u64>,
}

/// 可安全序列化回前端的响应，不暴露 reqwest 的内部类型。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkResponse {
  pub status: u16,
  pub headers: BTreeMap<String, String>,
  pub body: String,
}

/// 稳定的错误结构让前端无需解析依赖库的错误文本。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkError {
  pub code: &'static str,
  pub message: String,
}

impl NetworkError {
  fn new(code: &'static str, message: impl Into<String>) -> Self {
    Self {
      code,
      message: message.into(),
    }
  }
}

/// 执行单次受控网络访问。重定向由调用方显式处理，避免凭据被转发到其他主机。
#[tauri::command]
pub async fn send_network_request(
  request: NetworkRequest,
) -> Result<NetworkResponse, NetworkError> {
  validate_request_size(&request)?;

  let url = validate_url(&request.url)?;
  let host = url
    .host_str()
    .ok_or_else(|| NetworkError::new("invalid_url", "The URL is missing a host."))?
    .to_owned();
  let headers = validate_headers(&request.headers)?;
  let timeout_ms = request.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS);
  if timeout_ms == 0 || timeout_ms > MAX_TIMEOUT_MS {
    return Err(NetworkError::new(
      "invalid_timeout",
      format!("The timeout must be between 1 and {MAX_TIMEOUT_MS} milliseconds."),
    ));
  }
  let addresses = resolve_public_addresses(&url, timeout_ms).await?;

  // 将已审查的解析结果固定到客户端，消除检查与连接之间再次解析 DNS 的窗口。
  let client = Client::builder()
    .https_only(true)
    .redirect(reqwest::redirect::Policy::none())
    .no_proxy()
    .connect_timeout(Duration::from_secs(10))
    .timeout(Duration::from_millis(timeout_ms))
    .resolve_to_addrs(&host, &addresses)
    .user_agent("OpenRisingStones/0.1")
    .build()
    .map_err(|_| {
      NetworkError::new(
        "client_error",
        "Unable to initialize the secure HTTP client.",
      )
    })?;

  let mut builder = client.request(request.method.into(), url).headers(headers);
  if let Some(body) = request.body {
    builder = builder.body(body);
  }

  let mut response = builder
    .send()
    .await
    .map_err(|error| map_request_error(&error))?;
  let status = response.status().as_u16();
  let response_headers = serialize_headers(response.headers());

  if response
    .content_length()
    .is_some_and(|size| size > MAX_RESPONSE_BODY_BYTES as u64)
  {
    return Err(NetworkError::new(
      "response_too_large",
      format!("The response body cannot exceed {MAX_RESPONSE_BODY_BYTES} bytes."),
    ));
  }

  let mut bytes = Vec::new();
  while let Some(chunk) = response
    .chunk()
    .await
    .map_err(|_| NetworkError::new("read_error", "Unable to read the remote response."))?
  {
    if bytes.len() + chunk.len() > MAX_RESPONSE_BODY_BYTES {
      return Err(NetworkError::new(
        "response_too_large",
        format!("The response body cannot exceed {MAX_RESPONSE_BODY_BYTES} bytes."),
      ));
    }
    bytes.extend_from_slice(&chunk);
  }

  let body = String::from_utf8(bytes).map_err(|_| {
    NetworkError::new(
      "unsupported_response",
      "The response body is not valid UTF-8 text.",
    )
  })?;

  Ok(NetworkResponse {
    status,
    headers: response_headers,
    body,
  })
}

fn validate_request_size(request: &NetworkRequest) -> Result<(), NetworkError> {
  if request
    .body
    .as_ref()
    .is_some_and(|body| body.len() > MAX_REQUEST_BODY_BYTES)
  {
    return Err(NetworkError::new(
      "request_too_large",
      format!("The request body cannot exceed {MAX_REQUEST_BODY_BYTES} bytes."),
    ));
  }
  Ok(())
}

fn validate_url(raw_url: &str) -> Result<Url, NetworkError> {
  if raw_url.len() > MAX_URL_BYTES {
    return Err(NetworkError::new(
      "invalid_url",
      format!("The URL cannot exceed {MAX_URL_BYTES} bytes."),
    ));
  }
  let url = Url::parse(raw_url)
    .map_err(|_| NetworkError::new("invalid_url", "The URL format is invalid."))?;

  if url.scheme() != "https" {
    return Err(NetworkError::new(
      "insecure_scheme",
      "Only HTTPS requests are allowed.",
    ));
  }
  if !url.username().is_empty() || url.password().is_some() {
    return Err(NetworkError::new(
      "invalid_url",
      "The URL cannot contain user credentials.",
    ));
  }
  if url.fragment().is_some() {
    return Err(NetworkError::new(
      "invalid_url",
      "The URL cannot contain a fragment.",
    ));
  }
  if url.port_or_known_default() != Some(443) {
    return Err(NetworkError::new(
      "invalid_port",
      "Only the default HTTPS port 443 is allowed.",
    ));
  }

  match url.host() {
    Some(Host::Domain(domain)) if domain.eq_ignore_ascii_case("localhost") => Err(
      NetworkError::new("blocked_host", "Localhost access is not allowed."),
    ),
    Some(Host::Ipv4(address)) if !is_public_ip(IpAddr::V4(address)) => Err(NetworkError::new(
      "blocked_host",
      "Private and reserved addresses are not allowed.",
    )),
    Some(Host::Ipv6(address)) if !is_public_ip(IpAddr::V6(address)) => Err(NetworkError::new(
      "blocked_host",
      "Private and reserved addresses are not allowed.",
    )),
    Some(_) => Ok(url),
    None => Err(NetworkError::new(
      "invalid_url",
      "The URL is missing a host.",
    )),
  }
}

async fn resolve_public_addresses(
  url: &Url,
  timeout_ms: u64,
) -> Result<Vec<SocketAddr>, NetworkError> {
  // 字面 IP 已由 validate_url 审查，直接固定，避免将 IPv6 的方括号形式交给 DNS。
  match url.host() {
    Some(Host::Ipv4(address)) => return Ok(vec![SocketAddr::new(address.into(), 443)]),
    Some(Host::Ipv6(address)) => return Ok(vec![SocketAddr::new(address.into(), 443)]),
    _ => {}
  }

  let host = url
    .host_str()
    .ok_or_else(|| NetworkError::new("invalid_url", "The URL is missing a host."))?;
  let dns_timeout = Duration::from_millis(timeout_ms.min(10_000));
  let resolved: Vec<_> = timeout(dns_timeout, lookup_host((host, 443)))
    .await
    .map_err(|_| NetworkError::new("timeout", "DNS resolution timed out."))?
    .map_err(|_| NetworkError::new("dns_error", "Unable to resolve the remote host."))?
    .collect();

  if resolved.is_empty() {
    return Err(NetworkError::new(
      "dns_error",
      "The remote host has no usable addresses.",
    ));
  }
  if resolved.iter().any(|address| !is_public_ip(address.ip())) {
    return Err(NetworkError::new(
      "blocked_host",
      "The remote host resolved to a private or reserved address.",
    ));
  }
  Ok(resolved)
}

fn validate_headers(headers: &BTreeMap<String, String>) -> Result<HeaderMap, NetworkError> {
  if headers.len() > MAX_HEADER_COUNT {
    return Err(NetworkError::new(
      "invalid_headers",
      format!("The request cannot contain more than {MAX_HEADER_COUNT} headers."),
    ));
  }

  let total_size: usize = headers
    .iter()
    .map(|(name, value)| name.len() + value.len())
    .sum();
  if total_size > MAX_HEADER_BYTES {
    return Err(NetworkError::new(
      "invalid_headers",
      format!("The total header size cannot exceed {MAX_HEADER_BYTES} bytes."),
    ));
  }

  let mut result = HeaderMap::new();
  for (name, value) in headers {
    let lower_name = name.to_ascii_lowercase();
    if is_blocked_header(&lower_name) {
      return Err(NetworkError::new(
        "blocked_header",
        format!("The request header {name} is not allowed."),
      ));
    }
    let header_name = reqwest::header::HeaderName::from_bytes(name.as_bytes())
      .map_err(|_| NetworkError::new("invalid_headers", "A request header name is invalid."))?;
    let header_value = reqwest::header::HeaderValue::from_str(value)
      .map_err(|_| NetworkError::new("invalid_headers", "A request header value is invalid."))?;
    result.insert(header_name, header_value);
  }
  Ok(result)
}

fn is_blocked_header(name: &str) -> bool {
  matches!(
    name,
    "connection"
      | "content-length"
      | "cookie"
      | "host"
      | "proxy-authenticate"
      | "proxy-authorization"
      | "te"
      | "trailer"
      | "transfer-encoding"
      | "upgrade"
  ) || name.starts_with("proxy-")
    || name.starts_with("sec-")
}

fn serialize_headers(headers: &HeaderMap) -> BTreeMap<String, String> {
  headers
    .iter()
    .filter_map(|(name, value)| {
      value
        .to_str()
        .ok()
        .map(|value| (name.as_str().to_owned(), value.to_owned()))
    })
    .collect()
}

fn map_request_error(error: &reqwest::Error) -> NetworkError {
  if error.is_timeout() {
    NetworkError::new("timeout", "The network request timed out.")
  } else if error.is_connect() {
    NetworkError::new("connection_error", "Unable to connect to the remote host.")
  } else {
    // 不直接返回依赖库错误，避免其中携带 URL、查询参数或凭据信息。
    NetworkError::new("request_error", "The network request failed.")
  }
}

fn is_public_ip(ip: IpAddr) -> bool {
  match ip {
    IpAddr::V4(ip) => is_public_ipv4(ip),
    IpAddr::V6(ip) => is_public_ipv6(ip),
  }
}

fn is_public_ipv4(ip: Ipv4Addr) -> bool {
  let [a, b, c, _] = ip.octets();
  !(a == 0
    || a == 10
    || a == 127
    || (a == 100 && (64..=127).contains(&b))
    || (a == 169 && b == 254)
    || (a == 172 && (16..=31).contains(&b))
    || (a == 192 && b == 0 && c == 0)
    || (a == 192 && b == 0 && c == 2)
    || (a == 192 && b == 168)
    || (a == 198 && (b == 18 || b == 19))
    || (a == 198 && b == 51 && c == 100)
    || (a == 203 && b == 0 && c == 113)
    || a >= 224)
}

fn is_public_ipv6(ip: Ipv6Addr) -> bool {
  if let Some(ipv4) = ip.to_ipv4_mapped() {
    return is_public_ipv4(ipv4);
  }

  let segments = ip.segments();
  // 公网单播位于 2000::/3；额外排除文档专用的 2001:db8::/32。
  (segments[0] & 0xe000) == 0x2000 && !(segments[0] == 0x2001 && segments[1] == 0x0db8)
}

#[cfg(test)]
mod tests {
  use super::*;

  fn request(body: Option<String>) -> NetworkRequest {
    NetworkRequest {
      url: "https://example.com/api".to_owned(),
      method: NetworkMethod::Post,
      headers: BTreeMap::new(),
      body,
      timeout_ms: None,
    }
  }

  #[test]
  fn only_accepts_https_default_port_without_credentials() {
    assert!(validate_url("https://example.com/path").is_ok());
    assert!(validate_url("http://example.com").is_err());
    assert!(validate_url("https://user:secret@example.com").is_err());
    assert!(validate_url("https://example.com:8443").is_err());
  }

  #[test]
  fn blocks_local_and_reserved_ip_addresses() {
    for url in [
      "https://localhost",
      "https://127.0.0.1",
      "https://10.1.2.3",
      "https://169.254.169.254",
      "https://[::1]",
      "https://[fc00::1]",
      "https://[::ffff:192.168.1.1]",
      "https://[::192.168.1.1]",
    ] {
      assert!(validate_url(url).is_err(), "{url} should be blocked");
    }
    assert!(validate_url("https://1.1.1.1").is_ok());
    assert!(validate_url("https://[2606:4700:4700::1111]").is_ok());
  }

  #[test]
  fn rejects_oversized_body_and_managed_headers() {
    let oversized = "x".repeat(MAX_REQUEST_BODY_BYTES + 1);
    assert!(validate_request_size(&request(Some(oversized))).is_err());

    let mut headers = BTreeMap::new();
    headers.insert("Host".to_owned(), "internal.example".to_owned());
    assert!(validate_headers(&headers).is_err());
  }
}
