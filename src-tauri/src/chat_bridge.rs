//! Authenticated LAN-only HTTP bridge for viewing and sending game chat from a phone.

use axum::{
  extract::{DefaultBodyLimit, State},
  http::{header, HeaderMap, HeaderValue, StatusCode},
  response::{IntoResponse, Response, Sse},
  routing::{get, post},
  Json, Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use game_bridge_host::{BridgeManager, BridgePhase, ChatMessageSnapshot};
use qrcode::{render::svg, QrCode};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
  collections::VecDeque,
  convert::Infallible,
  net::{IpAddr, Ipv4Addr, SocketAddr},
  sync::{Arc, Mutex},
  time::{Duration, Instant},
};
use tokio::{sync::oneshot, task::JoinHandle};
use tokio_stream::wrappers::ReceiverStream;

#[cfg(not(debug_assertions))]
use axum::{body::Body, extract::Path, http::HeaderName};
#[cfg(not(debug_assertions))]
use rust_embed::RustEmbed;

const MAXIMUM_MESSAGES: usize = 500;
const MAXIMUM_MESSAGE_BYTES: usize = 500;
const PAIRING_LIFETIME: Duration = Duration::from_secs(5 * 60);
const SESSION_LIFETIME: Duration = Duration::from_secs(2 * 60 * 60);
const RATE_MINIMUM_INTERVAL: Duration = Duration::from_secs(1);
const RATE_WINDOW: Duration = Duration::from_secs(60);
const RATE_MAXIMUM: usize = 20;
const SESSION_COOKIE: &str = "ors_chat_session";

#[cfg(not(debug_assertions))]
#[derive(RustEmbed)]
#[folder = "../dist-mobile/"]
struct MobileAssets;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ChatBridgePhase {
  Stopped,
  Starting,
  Running,
  Faulted,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatBridgeStatus {
  phase: ChatBridgePhase,
  url: Option<String>,
  qr_data_url: Option<String>,
  can_send: bool,
  paired: bool,
  message_count: usize,
  dropped_count: u64,
  recent_messages: Vec<ChatMessageSnapshot>,
  error: Option<ChatBridgeApiError>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatBridgeApiError {
  code: String,
  message: String,
}

impl ChatBridgeApiError {
  fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
    Self {
      code: code.into(),
      message: message.into(),
    }
  }
}

impl IntoResponse for ChatBridgeApiError {
  fn into_response(self) -> Response {
    let status = match self.code.as_str() {
      "invalid_host" | "invalid_origin" | "not_paired" | "pairing_failed" => {
        StatusCode::UNAUTHORIZED
      }
      "rate_limited" => StatusCode::TOO_MANY_REQUESTS,
      "invalid_message" => StatusCode::BAD_REQUEST,
      _ => StatusCode::SERVICE_UNAVAILABLE,
    };
    with_api_headers((status, Json(self)).into_response())
  }
}

struct Runtime {
  phase: ChatBridgePhase,
  url: Option<String>,
  qr_data_url: Option<String>,
  error: Option<ChatBridgeApiError>,
  service: Option<Arc<ServiceState>>,
  shutdown: Option<oneshot::Sender<()>>,
  server_task: Option<JoinHandle<()>>,
  poll_task: Option<JoinHandle<()>>,
}

impl Default for Runtime {
  fn default() -> Self {
    Self {
      phase: ChatBridgePhase::Stopped,
      url: None,
      qr_data_url: None,
      error: None,
      service: None,
      shutdown: None,
      server_task: None,
      poll_task: None,
    }
  }
}

struct AuthState {
  pairing_hash: Option<[u8; 32]>,
  pairing_deadline: Instant,
  session_hash: Option<[u8; 32]>,
  session_deadline: Option<Instant>,
  paired: bool,
}

#[derive(Default)]
struct RateState {
  sends: VecDeque<Instant>,
}

struct ServiceState {
  bridge: Arc<BridgeManager>,
  can_send: bool,
  expected_host: String,
  allowed_origin: String,
  auth: Mutex<AuthState>,
  rate: Mutex<RateState>,
  messages: Mutex<VecDeque<ChatMessageSnapshot>>,
  events: tokio::sync::broadcast::Sender<MobileEvent>,
}

pub struct ChatBridgeState {
  bridge: Arc<BridgeManager>,
  runtime: Mutex<Runtime>,
}

impl ChatBridgeState {
  pub fn new(bridge: Arc<BridgeManager>) -> Self {
    Self {
      bridge,
      runtime: Mutex::new(Runtime::default()),
    }
  }

  fn status(&self) -> ChatBridgeStatus {
    let runtime = self.runtime.lock().expect("chat bridge lock poisoned");
    let (can_send, paired, message_count, recent_messages) = runtime
      .service
      .as_ref()
      .map(|service| {
        let auth = service.auth.lock().expect("chat auth lock poisoned");
        let paired = auth.paired
          && auth
            .session_deadline
            .is_some_and(|deadline| Instant::now() <= deadline);
        let messages = service
          .messages
          .lock()
          .expect("chat messages lock poisoned");
        (
          service.can_send,
          paired,
          messages.len(),
          messages.iter().rev().take(80).cloned().collect::<Vec<_>>(),
        )
      })
      .unwrap_or_default();
    ChatBridgeStatus {
      phase: runtime.phase.clone(),
      url: runtime.url.clone(),
      qr_data_url: runtime.qr_data_url.clone(),
      can_send,
      paired,
      message_count,
      dropped_count: self.bridge.chat_dropped_count(),
      recent_messages: recent_messages.into_iter().rev().collect(),
      error: runtime.error.clone(),
    }
  }

  async fn start(&self) -> Result<ChatBridgeStatus, ChatBridgeApiError> {
    {
      let mut runtime = self.runtime.lock().expect("chat bridge lock poisoned");
      if matches!(runtime.phase, ChatBridgePhase::Running) {
        drop(runtime);
        return Ok(self.status());
      }
      if matches!(runtime.phase, ChatBridgePhase::Starting) {
        return Err(ChatBridgeApiError::new(
          "already_starting",
          "The chat bridge is already starting.",
        ));
      }
      *runtime = Runtime {
        phase: ChatBridgePhase::Starting,
        ..Runtime::default()
      };
    }

    let result = self.build_server().await;
    let (service, url, qr_data_url, shutdown, server_task, poll_task) = match result {
      Ok(value) => value,
      Err(error) => {
        let mut runtime = self.runtime.lock().expect("chat bridge lock poisoned");
        runtime.phase = ChatBridgePhase::Faulted;
        runtime.error = Some(error.clone());
        return Err(error);
      }
    };

    let mut runtime = self.runtime.lock().expect("chat bridge lock poisoned");
    *runtime = Runtime {
      phase: ChatBridgePhase::Running,
      url: Some(url),
      qr_data_url: Some(qr_data_url),
      error: None,
      service: Some(service),
      shutdown: Some(shutdown),
      server_task: Some(server_task),
      poll_task: Some(poll_task),
    };
    drop(runtime);
    Ok(self.status())
  }

  async fn build_server(
    &self,
  ) -> Result<
    (
      Arc<ServiceState>,
      String,
      String,
      oneshot::Sender<()>,
      JoinHandle<()>,
      JoinHandle<()>,
    ),
    ChatBridgeApiError,
  > {
    let bridge_status = self.bridge.status();
    if !matches!(bridge_status.phase, BridgePhase::Ready) {
      return Err(ChatBridgeApiError::new(
        "bridge_not_ready",
        "The game bridge must be ready before chat sharing starts.",
      ));
    }
    if !bridge_status
      .capabilities
      .iter()
      .any(|value| value == "chat_read")
    {
      return Err(ChatBridgeApiError::new(
        "chat_unsupported",
        "The active game manifest does not provide chat reading support.",
      ));
    }
    let can_send = bridge_status
      .capabilities
      .iter()
      .any(|value| value == "chat_send");

    let ip = local_ip_address::local_ip().map_err(|error| {
      ChatBridgeApiError::new(
        "lan_unavailable",
        format!("Could not select a LAN address: {error}"),
      )
    })?;
    let IpAddr::V4(ip) = ip else {
      return Err(ChatBridgeApiError::new(
        "lan_unavailable",
        "A private IPv4 LAN address is required.",
      ));
    };
    if !is_private_lan(ip) {
      return Err(ChatBridgeApiError::new(
        "lan_unavailable",
        "The selected address is not a private LAN address.",
      ));
    }

    let (listener, public_page, expected_host, allowed_origin) = bind_server(ip).await?;

    let pairing_token = random_token();
    let url = format!("{public_page}#{pairing_token}");
    let qr_svg = QrCode::new(url.as_bytes())
      .map_err(|error| ChatBridgeApiError::new("qr_failed", error.to_string()))?
      .render::<svg::Color>()
      .min_dimensions(280, 280)
      .build();
    let qr_data_url = format!("data:image/svg+xml;base64,{}", BASE64.encode(qr_svg));
    let (events, _) = tokio::sync::broadcast::channel(128);
    let service = Arc::new(ServiceState {
      bridge: Arc::clone(&self.bridge),
      can_send,
      expected_host,
      allowed_origin,
      auth: Mutex::new(AuthState {
        pairing_hash: Some(token_hash(&pairing_token)),
        pairing_deadline: Instant::now() + PAIRING_LIFETIME,
        session_hash: None,
        session_deadline: None,
        paired: false,
      }),
      rate: Mutex::new(RateState::default()),
      messages: Mutex::new(VecDeque::new()),
      events,
    });

    let router = Router::new()
      .route("/api/pair", post(pair))
      .route("/api/state", get(api_state))
      .route("/api/events", get(api_events))
      .route("/api/messages", post(send_message))
      .route("/api/disconnect", post(disconnect_phone))
      .layer(DefaultBodyLimit::max(2_048));
    #[cfg(not(debug_assertions))]
    let router = router
      .route("/", get(index))
      .route("/*path", get(static_asset));
    let router = router.with_state(Arc::clone(&service));

    let (shutdown_tx, shutdown_rx) = oneshot::channel();
    let server_task = tokio::spawn(async move {
      let _ = axum::serve(listener, router)
        .with_graceful_shutdown(async {
          let _ = shutdown_rx.await;
        })
        .await;
    });
    let polling_service = Arc::clone(&service);
    let poll_task = tokio::spawn(async move {
      let mut interval = tokio::time::interval(Duration::from_millis(100));
      let mut was_online = true;
      loop {
        interval.tick().await;
        let online = matches!(polling_service.bridge.status().phase, BridgePhase::Ready);
        if online != was_online {
          let _ = polling_service.events.send(MobileEvent::Status { online });
          was_online = online;
        }
        if !online {
          continue;
        }
        let messages = match polling_service.bridge.poll_chat_messages() {
          Ok(messages) => messages,
          Err(_) => continue,
        };
        if messages.is_empty() {
          continue;
        }
        let mut stored = polling_service
          .messages
          .lock()
          .expect("chat messages lock poisoned");
        for message in messages {
          stored.push_back(message.clone());
          while stored.len() > MAXIMUM_MESSAGES {
            stored.pop_front();
          }
          let _ = polling_service
            .events
            .send(MobileEvent::Message { message });
        }
      }
    });

    Ok((
      service,
      url,
      qr_data_url,
      shutdown_tx,
      server_task,
      poll_task,
    ))
  }

  pub(crate) async fn stop(&self) -> ChatBridgeStatus {
    let (shutdown, server_task, poll_task) = {
      let mut runtime = self.runtime.lock().expect("chat bridge lock poisoned");
      runtime.phase = ChatBridgePhase::Stopped;
      runtime.url = None;
      runtime.qr_data_url = None;
      runtime.error = None;
      runtime.service = None;
      (
        runtime.shutdown.take(),
        runtime.server_task.take(),
        runtime.poll_task.take(),
      )
    };
    if let Some(shutdown) = shutdown {
      let _ = shutdown.send(());
    }
    if let Some(poll_task) = poll_task {
      poll_task.abort();
    }
    if let Some(server_task) = server_task {
      let _ = server_task.await;
    }
    self.status()
  }

  pub fn shutdown(&self) {
    let mut runtime = self.runtime.lock().expect("chat bridge lock poisoned");
    if let Some(shutdown) = runtime.shutdown.take() {
      let _ = shutdown.send(());
    }
    if let Some(task) = runtime.poll_task.take() {
      task.abort();
    }
    if let Some(task) = runtime.server_task.take() {
      task.abort();
    }
    *runtime = Runtime::default();
  }
}

#[derive(Deserialize)]
struct PairRequest {
  token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PairResponse {
  paired: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MobileState {
  paired: bool,
  online: bool,
  can_send: bool,
  messages: Vec<ChatMessageSnapshot>,
}

#[derive(Clone, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum MobileEvent {
  Message { message: ChatMessageSnapshot },
  Status { online: bool },
}

#[derive(Deserialize)]
struct SendMessageRequest {
  message: String,
}

#[cfg(not(debug_assertions))]
async fn index(
  State(state): State<Arc<ServiceState>>,
  headers: HeaderMap,
) -> Result<Response, ChatBridgeApiError> {
  validate_host(&state, &headers)?;
  embedded_response("mobile.html")
}

#[cfg(not(debug_assertions))]
async fn static_asset(
  State(state): State<Arc<ServiceState>>,
  Path(path): Path<String>,
  headers: HeaderMap,
) -> Result<Response, ChatBridgeApiError> {
  validate_host(&state, &headers)?;
  embedded_response(&path)
}

#[cfg(not(debug_assertions))]
fn embedded_response(path: &str) -> Result<Response, ChatBridgeApiError> {
  let asset = MobileAssets::get(path).ok_or_else(|| {
    ChatBridgeApiError::new(
      "asset_not_found",
      "The requested mobile asset was not found.",
    )
  })?;
  let content_type = mime_guess::from_path(path)
    .first_or_octet_stream()
    .as_ref()
    .to_owned();
  let mut response = Response::new(Body::from(asset.data.into_owned()));
  response.headers_mut().insert(
    header::CONTENT_TYPE,
    HeaderValue::from_str(&content_type).expect("MIME type is valid"),
  );
  response.headers_mut().insert(
    header::REFERRER_POLICY,
    HeaderValue::from_static("no-referrer"),
  );
  response
    .headers_mut()
    .insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
  response.headers_mut().insert(
    HeaderName::from_static("permissions-policy"),
    HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
  );
  response.headers_mut().insert(
    header::CONTENT_SECURITY_POLICY,
    HeaderValue::from_static(
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    ),
  );
  response.headers_mut().insert(
    header::X_CONTENT_TYPE_OPTIONS,
    HeaderValue::from_static("nosniff"),
  );
  response
    .headers_mut()
    .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
  Ok(response)
}

#[cfg(debug_assertions)]
async fn bind_server(
  lan_ip: Ipv4Addr,
) -> Result<(tokio::net::TcpListener, String, String, String), ChatBridgeApiError> {
  let address = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 1421);
  let listener = tokio::net::TcpListener::bind(address)
    .await
    .map_err(|error| {
      ChatBridgeApiError::new(
        "server_bind_failed",
        format!("Could not bind Debug API server: {error}"),
      )
    })?;
  let origin = format!("http://{lan_ip}:1420");
  Ok((
    listener,
    format!("{origin}/mobile.html"),
    "127.0.0.1:1421".to_owned(),
    origin,
  ))
}

#[cfg(not(debug_assertions))]
async fn bind_server(
  lan_ip: Ipv4Addr,
) -> Result<(tokio::net::TcpListener, String, String, String), ChatBridgeApiError> {
  let listener = tokio::net::TcpListener::bind(SocketAddr::new(IpAddr::V4(lan_ip), 0))
    .await
    .map_err(|error| {
      ChatBridgeApiError::new(
        "server_bind_failed",
        format!("Could not bind server: {error}"),
      )
    })?;
  let address = listener.local_addr().map_err(|error| {
    ChatBridgeApiError::new(
      "server_bind_failed",
      format!("Could not read server address: {error}"),
    )
  })?;
  let host = format!("{}:{}", address.ip(), address.port());
  let origin = format!("http://{host}");
  Ok((listener, format!("{origin}/"), host, origin))
}

async fn pair(
  State(state): State<Arc<ServiceState>>,
  headers: HeaderMap,
  Json(request): Json<PairRequest>,
) -> Result<Response, ChatBridgeApiError> {
  validate_host(&state, &headers)?;
  let mut auth = state.auth.lock().expect("chat auth lock poisoned");
  if auth.paired || Instant::now() > auth.pairing_deadline {
    return Err(ChatBridgeApiError::new(
      "pairing_failed",
      "The pairing code is expired or already used.",
    ));
  }
  let Some(pairing_hash) = auth.pairing_hash else {
    return Err(ChatBridgeApiError::new(
      "pairing_failed",
      "The pairing code is expired or already used.",
    ));
  };
  if !constant_time_equal(&token_hash(&request.token), &pairing_hash) {
    return Err(ChatBridgeApiError::new(
      "pairing_failed",
      "The pairing code is invalid.",
    ));
  }
  let session_token = random_token();
  auth.pairing_hash = None;
  auth.session_hash = Some(token_hash(&session_token));
  auth.session_deadline = Some(Instant::now() + SESSION_LIFETIME);
  auth.paired = true;
  drop(auth);

  let mut response = Json(PairResponse { paired: true }).into_response();
  response.headers_mut().insert(
    header::SET_COOKIE,
    HeaderValue::from_str(&format!(
      "{SESSION_COOKIE}={session_token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=7200"
    ))
    .expect("session cookie is valid"),
  );
  Ok(with_api_headers(response))
}

async fn api_state(
  State(state): State<Arc<ServiceState>>,
  headers: HeaderMap,
) -> Result<Response, ChatBridgeApiError> {
  authorize(&state, &headers)?;
  let messages = state
    .messages
    .lock()
    .expect("chat messages lock poisoned")
    .iter()
    .cloned()
    .collect();
  Ok(with_api_headers(
    Json(MobileState {
      paired: true,
      online: matches!(state.bridge.status().phase, BridgePhase::Ready),
      can_send: state.can_send,
      messages,
    })
    .into_response(),
  ))
}

async fn api_events(
  State(state): State<Arc<ServiceState>>,
  headers: HeaderMap,
) -> Result<impl IntoResponse, ChatBridgeApiError> {
  authorize(&state, &headers)?;
  let mut source = state.events.subscribe();
  let (sender, receiver) = tokio::sync::mpsc::channel(32);
  tokio::spawn(async move {
    loop {
      match source.recv().await {
        Ok(message) => {
          let Ok(json) = serde_json::to_string(&message) else {
            continue;
          };
          if sender
            .send(Ok::<_, Infallible>(
              axum::response::sse::Event::default().data(json),
            ))
            .await
            .is_err()
          {
            break;
          }
        }
        Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
        Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
      }
    }
  });
  Ok(
    Sse::new(ReceiverStream::new(receiver)).keep_alive(
      axum::response::sse::KeepAlive::new()
        .interval(Duration::from_secs(15))
        .text("keep-alive"),
    ),
  )
}

async fn send_message(
  State(state): State<Arc<ServiceState>>,
  headers: HeaderMap,
  Json(request): Json<SendMessageRequest>,
) -> Result<Response, ChatBridgeApiError> {
  authorize(&state, &headers)?;
  if !state.can_send {
    return Err(ChatBridgeApiError::new(
      "send_unavailable",
      "Chat sending is temporarily disabled while the native game call is being verified.",
    ));
  }
  if request.message.is_empty()
    || request.message.len() > MAXIMUM_MESSAGE_BYTES
    || request.message.starts_with('/')
  {
    return Err(ChatBridgeApiError::new(
      "invalid_message",
      "Messages must contain 1 to 500 UTF-8 bytes and cannot be slash commands.",
    ));
  }
  enforce_rate_limit(&state)?;
  let bridge = Arc::clone(&state.bridge);
  tauri::async_runtime::spawn_blocking(move || bridge.send_chat(request.message))
    .await
    .map_err(|error| ChatBridgeApiError::new("task_failed", error.to_string()))?
    .map_err(|error| ChatBridgeApiError::new("send_failed", error.to_string()))?;
  Ok(with_api_headers(StatusCode::NO_CONTENT.into_response()))
}

async fn disconnect_phone(
  State(state): State<Arc<ServiceState>>,
  headers: HeaderMap,
) -> Result<Response, ChatBridgeApiError> {
  authorize(&state, &headers)?;
  let mut auth = state.auth.lock().expect("chat auth lock poisoned");
  auth.session_hash = None;
  auth.session_deadline = None;
  auth.paired = false;
  let mut response = StatusCode::NO_CONTENT.into_response();
  response.headers_mut().insert(
    header::SET_COOKIE,
    HeaderValue::from_static("ors_chat_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"),
  );
  Ok(with_api_headers(response))
}

fn validate_host(state: &ServiceState, headers: &HeaderMap) -> Result<(), ChatBridgeApiError> {
  let host = headers
    .get(header::HOST)
    .and_then(|value| value.to_str().ok())
    .unwrap_or_default();
  if host != state.expected_host {
    return Err(ChatBridgeApiError::new(
      "invalid_host",
      "The request host is not allowed.",
    ));
  }
  if let Some(origin) = headers
    .get(header::ORIGIN)
    .and_then(|value| value.to_str().ok())
  {
    if origin != state.allowed_origin {
      return Err(ChatBridgeApiError::new(
        "invalid_origin",
        "The request origin is not allowed.",
      ));
    }
  }
  Ok(())
}

fn authorize(state: &ServiceState, headers: &HeaderMap) -> Result<(), ChatBridgeApiError> {
  validate_host(state, headers)?;
  let token = headers
    .get(header::COOKIE)
    .and_then(|value| value.to_str().ok())
    .and_then(|cookies| {
      cookies.split(';').find_map(|cookie| {
        let (name, value) = cookie.trim().split_once('=')?;
        (name == SESSION_COOKIE).then_some(value)
      })
    })
    .ok_or_else(|| ChatBridgeApiError::new("not_paired", "This phone is not paired."))?;
  let auth = state.auth.lock().expect("chat auth lock poisoned");
  let Some(expected) = auth.session_hash else {
    return Err(ChatBridgeApiError::new(
      "not_paired",
      "This phone is not paired.",
    ));
  };
  if auth
    .session_deadline
    .map_or(true, |deadline| Instant::now() > deadline)
  {
    return Err(ChatBridgeApiError::new(
      "not_paired",
      "This phone session has expired.",
    ));
  }
  if !constant_time_equal(&token_hash(token), &expected) {
    return Err(ChatBridgeApiError::new(
      "not_paired",
      "This phone is not paired.",
    ));
  }
  Ok(())
}

fn enforce_rate_limit(state: &ServiceState) -> Result<(), ChatBridgeApiError> {
  let now = Instant::now();
  let mut rate = state.rate.lock().expect("chat rate lock poisoned");
  while rate
    .sends
    .front()
    .is_some_and(|timestamp| now.duration_since(*timestamp) >= RATE_WINDOW)
  {
    rate.sends.pop_front();
  }
  if rate
    .sends
    .back()
    .is_some_and(|timestamp| now.duration_since(*timestamp) < RATE_MINIMUM_INTERVAL)
  {
    return Err(ChatBridgeApiError::new(
      "rate_limited",
      "Please wait one second before sending another message.",
    ));
  }
  if rate.sends.len() >= RATE_MAXIMUM {
    return Err(ChatBridgeApiError::new(
      "rate_limited",
      "Too many messages were sent. Please wait a moment.",
    ));
  }
  rate.sends.push_back(now);
  Ok(())
}

fn is_private_lan(ip: Ipv4Addr) -> bool {
  ip.is_private() && !ip.is_loopback() && !ip.is_link_local()
}

fn random_token() -> String {
  let mut bytes = [0u8; 32];
  OsRng.fill_bytes(&mut bytes);
  bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn token_hash(token: &str) -> [u8; 32] {
  Sha256::digest(token.as_bytes()).into()
}

fn constant_time_equal(left: &[u8; 32], right: &[u8; 32]) -> bool {
  left
    .iter()
    .zip(right.iter())
    .fold(0u8, |difference, (left, right)| difference | (left ^ right))
    == 0
}

fn with_api_headers(mut response: Response) -> Response {
  response
    .headers_mut()
    .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
  response.headers_mut().insert(
    header::X_CONTENT_TYPE_OPTIONS,
    HeaderValue::from_static("nosniff"),
  );
  response
}

#[tauri::command]
pub fn chat_bridge_status(state: tauri::State<'_, ChatBridgeState>) -> ChatBridgeStatus {
  state.status()
}

#[tauri::command]
pub async fn chat_bridge_start(
  state: tauri::State<'_, ChatBridgeState>,
) -> Result<ChatBridgeStatus, ChatBridgeApiError> {
  state.start().await
}

#[tauri::command]
pub async fn chat_bridge_stop(
  state: tauri::State<'_, ChatBridgeState>,
) -> Result<ChatBridgeStatus, ChatBridgeApiError> {
  Ok(state.stop().await)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn accepts_only_private_non_loopback_ipv4_addresses() {
    assert!(is_private_lan(Ipv4Addr::new(192, 168, 1, 2)));
    assert!(is_private_lan(Ipv4Addr::new(10, 0, 0, 2)));
    assert!(!is_private_lan(Ipv4Addr::LOCALHOST));
    assert!(!is_private_lan(Ipv4Addr::new(8, 8, 8, 8)));
  }

  #[test]
  fn token_comparison_rejects_different_values() {
    let first = token_hash("first");
    assert!(constant_time_equal(&first, &token_hash("first")));
    assert!(!constant_time_equal(&first, &token_hash("second")));
  }
}
