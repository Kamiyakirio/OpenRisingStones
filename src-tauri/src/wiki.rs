//! Public FFXIV wiki access with a Safari sidecar and a background WebView fallback.

use std::{
  sync::{
    atomic::{AtomicU64, Ordering},
    Arc, Mutex,
  },
  time::Duration,
};

use serde::{Deserialize, Serialize};
use tauri::{
  webview::PageLoadEvent, AppHandle, Emitter, LogicalSize, Manager, State, WebviewUrl,
  WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tokio::sync::oneshot;
use url::Url;

use crate::python_sidecar;

const WIKI_HOST: &str = "ff14.huijiwiki.com";
const MAX_WIKI_BODY_BYTES: usize = 2 * 1024 * 1024;
const MAX_SIDECAR_RESPONSE_BYTES: usize = 6 * MAX_WIKI_BODY_BYTES + 1024;
const VERIFICATION_TIMEOUT: Duration = Duration::from_secs(90);
const INTERACTION_NOTICE_AFTER: u32 = 10;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WikiPageRequest {
  item_name: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WikiPageResponse {
  html: String,
  url: String,
  source: &'static str,
}

#[derive(Debug, Deserialize)]
struct WikiSidecarResponse {
  status: u16,
  body: String,
  url: String,
  challenged: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WikiSidecarRequest<'a> {
  operation: &'static str,
  item_name: &'a str,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WikiStatusEvent {
  request_id: u64,
  status: &'static str,
  message: &'static str,
}

#[derive(Debug, Deserialize)]
struct WebviewSnapshot {
  title: String,
  url: String,
  html: String,
}

type WikiCompletion = Arc<Mutex<Option<oneshot::Sender<Result<WikiPageResponse, String>>>>>;

#[derive(Clone)]
struct ActiveWikiVerification {
  request_id: u64,
  window_label: String,
  completion: WikiCompletion,
}

#[derive(Default)]
pub struct WikiVerificationState {
  next_id: AtomicU64,
  active: Mutex<Option<ActiveWikiVerification>>,
}

#[tauri::command]
pub async fn fetch_wiki_item_page(
  request: WikiPageRequest,
  app: AppHandle,
  state: State<'_, WikiVerificationState>,
) -> Result<WikiPageResponse, String> {
  let item_name = validate_item_name(&request.item_name)?;
  let sidecar_response = run_wiki_sidecar(item_name.clone()).await?;
  if !sidecar_response.challenged {
    if !(200..300).contains(&sidecar_response.status) {
      return Err(format!(
        "The FFXIV wiki returned HTTP {}.",
        sidecar_response.status
      ));
    }
    ensure_wiki_html(&sidecar_response.body, &item_name)?;
    return Ok(WikiPageResponse {
      html: sidecar_response.body,
      url: sidecar_response.url,
      source: "safari",
    });
  }

  start_background_verification(&app, &state, item_name, sidecar_response.url).await
}

#[tauri::command]
pub fn show_wiki_verification(
  app: AppHandle,
  state: State<'_, WikiVerificationState>,
) -> Result<(), String> {
  let active = state
    .active
    .lock()
    .map_err(|_| "Unable to read the wiki verification state.".to_owned())?
    .clone()
    .ok_or_else(|| "There is no active wiki verification.".to_owned())?;
  let window = app
    .get_webview_window(&active.window_label)
    .ok_or_else(|| "The wiki verification tab is unavailable.".to_owned())?;
  window
    .set_size(LogicalSize::new(620.0, 600.0))
    .and_then(|_| window.center())
    .and_then(|_| window.set_always_on_top(true))
    .map_err(|_| "Unable to prepare the wiki verification panel.".to_owned())?;
  window
    .show()
    .and_then(|_| window.set_focus())
    .map_err(|_| "Unable to show the wiki verification tab.".to_owned())?;
  emit_status(
    &app,
    active.request_id,
    "interaction_required",
    "Complete the verification in the wiki tab.",
  );
  Ok(())
}

#[tauri::command]
pub fn cancel_wiki_verification(
  app: AppHandle,
  state: State<'_, WikiVerificationState>,
) -> Result<(), String> {
  let active = state
    .active
    .lock()
    .map_err(|_| "Unable to read the wiki verification state.".to_owned())?
    .clone()
    .ok_or_else(|| "There is no active wiki verification.".to_owned())?;
  complete_with_error(&active.completion, "Wiki verification was cancelled.");
  if let Some(window) = app.get_webview_window(&active.window_label) {
    let _ = window.close();
  }
  Ok(())
}

async fn run_wiki_sidecar(item_name: String) -> Result<WikiSidecarResponse, String> {
  tauri::async_runtime::spawn_blocking(move || {
    python_sidecar::request(
      &WikiSidecarRequest {
        operation: "fetchWikiPage",
        item_name: &item_name,
      },
      MAX_SIDECAR_RESPONSE_BYTES,
      "FFXIV wiki",
    )
  })
  .await
  .map_err(|_| "The wiki request task stopped unexpectedly.".to_owned())?
}

async fn start_background_verification(
  app: &AppHandle,
  state: &WikiVerificationState,
  item_name: String,
  raw_url: String,
) -> Result<WikiPageResponse, String> {
  let url = Url::parse(&raw_url).map_err(|_| "The wiki URL is invalid.".to_owned())?;
  if !is_allowed_wiki_url(&url) {
    return Err("The wiki redirected to an unsupported address.".to_owned());
  }
  {
    let active = state
      .active
      .lock()
      .map_err(|_| "Unable to read the wiki verification state.".to_owned())?;
    if active.is_some() {
      return Err("Another wiki verification is already running.".to_owned());
    }
  }

  let request_id = state.next_id.fetch_add(1, Ordering::Relaxed) + 1;
  let window_label = format!("wiki-background-{request_id}");
  let (sender, receiver) = oneshot::channel();
  let completion: WikiCompletion = Arc::new(Mutex::new(Some(sender)));
  let navigation_item = item_name.clone();
  let page_completion = completion.clone();
  let page_app = app.clone();
  let page_window_label = window_label.clone();
  let window = WebviewWindowBuilder::new(app, &window_label, WebviewUrl::External(url))
    .title("FFXIV Wiki Verification")
    .inner_size(620.0, 600.0)
    .min_inner_size(480.0, 460.0)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)
    .focused(false)
    .devtools(false)
    .on_navigation(is_allowed_wiki_url)
    .on_page_load(move |window, payload| {
      if payload.event() == PageLoadEvent::Finished {
        inspect_wiki_webview(
          &window,
          navigation_item.clone(),
          page_completion.clone(),
          page_app.clone(),
          request_id,
          page_window_label.clone(),
        );
      }
    })
    .build()
    .map_err(|_| "Unable to create the background wiki tab.".to_owned())?;

  let close_completion = completion.clone();
  window.on_window_event(move |event| {
    if matches!(event, WindowEvent::Destroyed) {
      complete_with_error(&close_completion, "The wiki verification tab was closed.");
    }
  });
  *state
    .active
    .lock()
    .map_err(|_| "Unable to store the wiki verification state.".to_owned())? =
    Some(ActiveWikiVerification {
      request_id,
      window_label: window_label.clone(),
      completion: completion.clone(),
    });
  emit_status(
    app,
    request_id,
    "background_verification",
    "Checking access in a background wiki tab.",
  );

  let poll_window = window.clone();
  let poll_completion = completion.clone();
  let poll_app = app.clone();
  let poll_label = window_label.clone();
  tauri::async_runtime::spawn(async move {
    for attempt in 1..=120 {
      tokio::time::sleep(Duration::from_millis(750)).await;
      if completion_finished(&poll_completion) {
        return;
      }
      inspect_wiki_webview(
        &poll_window,
        item_name.clone(),
        poll_completion.clone(),
        poll_app.clone(),
        request_id,
        poll_label.clone(),
      );
      if attempt == INTERACTION_NOTICE_AFTER {
        emit_status(
          &poll_app,
          request_id,
          "interaction_required",
          "The wiki needs verification input.",
        );
      }
    }
    complete_with_error(&poll_completion, "Wiki verification timed out.");
    let _ = poll_window.close();
  });

  let result = tokio::time::timeout(VERIFICATION_TIMEOUT, receiver)
    .await
    .map_err(|_| "Wiki verification timed out.".to_owned())?
    .map_err(|_| "The wiki verification task stopped unexpectedly.".to_owned())?;
  if let Some(active) = state
    .active
    .lock()
    .map_err(|_| "Unable to clear the wiki verification state.".to_owned())?
    .as_ref()
    .filter(|active| active.request_id == request_id)
  {
    let _ = app
      .get_webview_window(&active.window_label)
      .map(|window| window.close());
  }
  *state
    .active
    .lock()
    .map_err(|_| "Unable to clear the wiki verification state.".to_owned())? = None;
  result
}

fn inspect_wiki_webview(
  window: &WebviewWindow,
  item_name: String,
  completion: WikiCompletion,
  app: AppHandle,
  request_id: u64,
  window_label: String,
) {
  if completion_finished(&completion) {
    return;
  }
  let callback_window = window.clone();
  let _ = window.eval_with_callback(
    r#"(() => {
      try {
        return {
          title: document.title || "",
          url: window.location.href,
          html: document.documentElement ? document.documentElement.outerHTML : ""
        };
      } catch (_error) {
        return { title: "", url: "", html: "" };
      }
    })()"#,
    move |serialized| {
      let Ok(snapshot) = serde_json::from_str::<WebviewSnapshot>(&serialized) else {
        return;
      };
      if !is_completed_snapshot(&snapshot, &item_name) {
        return;
      }
      let response = WikiPageResponse {
        html: snapshot.html,
        url: snapshot.url,
        source: "webview",
      };
      let completed = if let Ok(mut sender) = completion.lock() {
        if let Some(sender) = sender.take() {
          let _ = sender.send(Ok(response));
          true
        } else {
          false
        }
      } else {
        false
      };
      if completed {
        emit_status(
          &app,
          request_id,
          "complete",
          "The wiki page finished loading.",
        );
        if callback_window.label() == window_label {
          let _ = callback_window.hide();
          let _ = callback_window.close();
        }
      }
    },
  );
}

fn validate_item_name(value: &str) -> Result<String, String> {
  let value = value.trim();
  if value.is_empty() || value.chars().count() > 80 || value.chars().any(char::is_control) {
    return Err("The wiki item name is invalid.".to_owned());
  }
  Ok(value.to_owned())
}

fn ensure_wiki_html(html: &str, item_name: &str) -> Result<(), String> {
  if html.len() > MAX_WIKI_BODY_BYTES {
    return Err("The wiki page exceeded the size limit.".to_owned());
  }
  if html.is_empty() || !html.contains(item_name) || is_challenge_html(html) {
    return Err("The wiki did not return the requested item page.".to_owned());
  }
  Ok(())
}

fn is_completed_snapshot(snapshot: &WebviewSnapshot, item_name: &str) -> bool {
  if snapshot.html.len() > MAX_WIKI_BODY_BYTES || is_challenge_html(&snapshot.html) {
    return false;
  }
  let Ok(url) = Url::parse(&snapshot.url) else {
    return false;
  };
  is_allowed_wiki_url(&url)
    && snapshot.html.contains(item_name)
    && !snapshot
      .title
      .to_ascii_lowercase()
      .contains("just a moment")
}

fn is_challenge_html(html: &str) -> bool {
  let lowered = html.to_ascii_lowercase();
  lowered.contains("just a moment") || lowered.contains("cdn-cgi/challenge-platform")
}

fn is_allowed_wiki_url(url: &Url) -> bool {
  url.scheme() == "https" && url.host_str() == Some(WIKI_HOST)
}

fn completion_finished(completion: &WikiCompletion) -> bool {
  completion.lock().map_or(true, |sender| sender.is_none())
}

fn complete_with_error(completion: &WikiCompletion, message: &str) {
  if let Ok(mut sender) = completion.lock() {
    if let Some(sender) = sender.take() {
      let _ = sender.send(Err(message.to_owned()));
    }
  }
}

fn emit_status(app: &AppHandle, request_id: u64, status: &'static str, message: &'static str) {
  let _ = app.emit_to(
    "main",
    "wiki://status",
    WikiStatusEvent {
      request_id,
      status,
      message,
    },
  );
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn validates_item_names_and_wiki_navigation() {
    assert!(validate_item_name("Vana'diel Healing Gloves").is_ok());
    assert!(validate_item_name(" ").is_err());
    assert!(is_allowed_wiki_url(
      &Url::parse("https://ff14.huijiwiki.com/wiki/item").unwrap()
    ));
    assert!(!is_allowed_wiki_url(
      &Url::parse("https://example.com/wiki/item").unwrap()
    ));
  }

  #[test]
  fn distinguishes_challenges_from_completed_pages() {
    assert!(is_challenge_html(
      "<title>Just a moment...</title><script src='/cdn-cgi/challenge-platform/x'></script>"
    ));
    let snapshot = WebviewSnapshot {
      title: "Item:Test Gloves".to_owned(),
      url: "https://ff14.huijiwiki.com/wiki/item".to_owned(),
      html: "<html><body>Test Gloves</body></html>".to_owned(),
    };
    assert!(is_completed_snapshot(&snapshot, "Test Gloves"));
  }
}
