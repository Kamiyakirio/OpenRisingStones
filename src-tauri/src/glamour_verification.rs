//! Foreground WebView recovery for Rising Stones JavaScript anti-bot cookies.

use std::{
  sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
  },
  time::Duration,
};

use serde::Deserialize;
use tauri::{
  webview::{Cookie, PageLoadEvent},
  AppHandle, LogicalSize, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tokio::sync::oneshot;
use url::Url;

use crate::sdo_login::{self, SessionSnapshot};

const GLAMOUR_API_HOST: &str = "apiff14risingstones.web.sdo.com";
const VERIFICATION_TIMEOUT: Duration = Duration::from_secs(90);
const AUTOMATIC_VERIFICATION_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Clone, Debug, Deserialize)]
struct VerificationSnapshot {
  url: String,
  body: String,
  cookie: String,
}

pub(crate) struct VerificationSolution {
  pub(crate) body: Option<String>,
  pub(crate) document_cookie: String,
}

type VerificationCompletion =
  Arc<Mutex<Option<oneshot::Sender<Result<VerificationSnapshot, String>>>>>;

struct ActiveVerification {
  request_id: u64,
  window_label: String,
}

#[derive(Default)]
pub struct GlamourVerificationState {
  next_id: AtomicU64,
  active: Mutex<Option<ActiveVerification>>,
}

/// Execute the challenge page in a foreground WebView and persist its cookies.
pub async fn verify(
  app: &AppHandle,
  state: &GlamourVerificationState,
  session: &SessionSnapshot,
  raw_url: &str,
  challenge_html: &str,
) -> Result<Option<String>, String> {
  let solution = solve_challenge(app, state, session, raw_url, challenge_html, true).await?;
  if !solution.document_cookie.is_empty() {
    let login_state = app.state::<sdo_login::LoginState>();
    sdo_login::merge_glamour_antibot_cookies(&login_state, &solution.document_cookie)?;
  }
  Ok(solution.body)
}

/// Execute an automatic challenge in a hidden WebView for an anonymous API session.
pub(crate) async fn verify_anonymous(
  app: &AppHandle,
  state: &GlamourVerificationState,
  session: &SessionSnapshot,
  raw_url: &str,
  challenge_html: &str,
) -> Result<VerificationSolution, String> {
  solve_challenge(app, state, session, raw_url, challenge_html, false).await
}

async fn solve_challenge(
  app: &AppHandle,
  state: &GlamourVerificationState,
  session: &SessionSnapshot,
  raw_url: &str,
  challenge_html: &str,
  visible: bool,
) -> Result<VerificationSolution, String> {
  let verification_timeout = if visible {
    VERIFICATION_TIMEOUT
  } else {
    AUTOMATIC_VERIFICATION_TIMEOUT
  };
  let url = Url::parse(raw_url).map_err(|_| "The verification URL is invalid.".to_owned())?;
  if !is_allowed_url(&url) {
    return Err("The verification URL is not supported.".to_owned());
  }
  if challenge_html.len() > 128 * 1024
    || !challenge_html.contains("__tst_status")
    || !challenge_html.contains("EO_Bot_Ssid")
  {
    return Err("The Rising Stones verification challenge is invalid.".to_owned());
  }
  {
    let active = state
      .active
      .lock()
      .map_err(|_| "Unable to read the verification state.".to_owned())?;
    if active.is_some() {
      return Err("Another Rising Stones verification is already running.".to_owned());
    }
  }

  let request_id = state.next_id.fetch_add(1, Ordering::Relaxed) + 1;
  let window_label = format!("rising-stones-verification-{request_id}");
  let (sender, receiver) = oneshot::channel();
  let completion: VerificationCompletion = Arc::new(Mutex::new(Some(sender)));
  let page_completion = completion.clone();
  let page_challenge = challenge_html.to_owned();
  let challenge_injected = Arc::new(AtomicBool::new(false));
  let page_challenge_injected = challenge_injected.clone();
  let blank_url =
    Url::parse("about:blank").map_err(|_| "Unable to prepare verification.".to_owned())?;
  let window = WebviewWindowBuilder::new(app, &window_label, WebviewUrl::External(blank_url))
    .title("Rising Stones Access Verification")
    .inner_size(640.0, 520.0)
    .min_inner_size(480.0, 400.0)
    .always_on_top(visible)
    .skip_taskbar(!visible)
    .visible(visible)
    .focused(visible)
    .devtools(false)
    .on_navigation(is_allowed_navigation)
    .on_page_load(move |window, payload| {
      if payload.event() == PageLoadEvent::Finished && is_allowed_url(payload.url()) {
        if !page_challenge_injected.swap(true, Ordering::Relaxed) {
          inject_challenge_html(&window, &page_challenge);
          return;
        }
        inspect_webview(&window, page_completion.clone());
      }
    })
    .build()
    .map_err(|_| "Unable to create the Rising Stones verification window.".to_owned())?;
  if let Err(error) = seed_session_cookies(&window, session) {
    let _ = window.close();
    return Err(error);
  }
  if window.navigate(url).is_err() {
    let _ = window.close();
    return Err("Unable to open the Rising Stones verification page.".to_owned());
  }
  if visible
    && window
      .set_size(LogicalSize::new(640.0, 520.0))
      .and_then(|_| window.center())
      .and_then(|_| window.set_focus())
      .is_err()
  {
    let _ = window.close();
    return Err("Unable to present the Rising Stones verification window.".to_owned());
  }

  let close_completion = completion.clone();
  window.on_window_event(move |event| {
    if matches!(event, WindowEvent::Destroyed) {
      complete_with_error(
        &close_completion,
        "The Rising Stones verification window was closed.",
      );
    }
  });
  *state
    .active
    .lock()
    .map_err(|_| "Unable to store the verification state.".to_owned())? =
    Some(ActiveVerification {
      request_id,
      window_label: window_label.clone(),
    });

  let poll_window = window.clone();
  let poll_completion = completion.clone();
  let poll_attempts = (verification_timeout.as_millis() / 500) as usize;
  tauri::async_runtime::spawn(async move {
    for _ in 0..poll_attempts {
      tokio::time::sleep(Duration::from_millis(500)).await;
      if completion_finished(&poll_completion) {
        return;
      }
      inspect_webview(&poll_window, poll_completion.clone());
    }
    complete_with_error(
      &poll_completion,
      "Rising Stones access verification timed out.",
    );
    let _ = poll_window.close();
  });

  let result = match tokio::time::timeout(verification_timeout, receiver).await {
    Ok(Ok(result)) => result,
    Ok(Err(_)) => Err("The Rising Stones verification task stopped unexpectedly.".to_owned()),
    Err(_) => Err("Rising Stones access verification timed out.".to_owned()),
  };
  if let Some(active) = state
    .active
    .lock()
    .map_err(|_| "Unable to clear the verification state.".to_owned())?
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
    .map_err(|_| "Unable to clear the verification state.".to_owned())? = None;
  let snapshot = result?;
  if has_required_cookies(&snapshot.cookie) {
    return Ok(VerificationSolution {
      body: None,
      document_cookie: snapshot.cookie,
    });
  }
  Ok(VerificationSolution {
    body: Some(snapshot.body),
    document_cookie: String::new(),
  })
}

fn inspect_webview(window: &WebviewWindow, completion: VerificationCompletion) {
  if completion_finished(&completion) {
    return;
  }
  let callback_window = window.clone();
  let _ = window.eval_with_callback(
    r#"(() => {
      try {
        return {
          url: window.location.href,
          body: document.body ? document.body.innerText : "",
          cookie: document.cookie || ""
        };
      } catch (_error) {
        return { url: "", body: "", cookie: "" };
      }
    })()"#,
    move |serialized| {
      let Ok(snapshot) = serde_json::from_str::<VerificationSnapshot>(&serialized) else {
        return;
      };
      if !is_completed_snapshot(&snapshot) {
        return;
      }
      let completed = if let Ok(mut sender) = completion.lock() {
        if let Some(sender) = sender.take() {
          let _ = sender.send(Ok(snapshot));
          true
        } else {
          false
        }
      } else {
        false
      };
      if completed {
        let _ = callback_window.hide();
      }
    },
  );
}

fn inject_challenge_html(window: &WebviewWindow, challenge_html: &str) {
  let Ok(serialized) = serde_json::to_string(challenge_html) else {
    return;
  };
  let script =
    format!("(() => {{ document.open(); document.write({serialized}); document.close(); }})()");
  let _ = window.eval(&script);
}

fn is_completed_snapshot(snapshot: &VerificationSnapshot) -> bool {
  let Ok(url) = Url::parse(&snapshot.url) else {
    return false;
  };
  let body = snapshot.body.trim_start();
  is_allowed_url(&url)
    && (has_required_cookies(&snapshot.cookie)
      || ((body.starts_with('{') || body.starts_with('['))
        && snapshot.body.len() <= 5 * 1024 * 1024))
}

fn has_required_cookies(cookie: &str) -> bool {
  ["__tst_status=", "EO_Bot_Ssid="].iter().all(|required| {
    cookie
      .split(';')
      .any(|part| part.trim().starts_with(required))
  })
}

fn is_allowed_url(url: &Url) -> bool {
  url.scheme() == "https" && url.host_str() == Some(GLAMOUR_API_HOST)
}

fn is_allowed_navigation(url: &Url) -> bool {
  url.as_str() == "about:blank" || is_allowed_url(url)
}

fn seed_session_cookies(window: &WebviewWindow, session: &SessionSnapshot) -> Result<(), String> {
  for source in session.cookies.iter().filter(|cookie| {
    cookie.domain.trim_start_matches('.').ends_with("sdo.com")
      && !cookie.name.is_empty()
      && !cookie.value.is_empty()
  }) {
    let cookie = Cookie::build((source.name.clone(), source.value.clone()))
      .domain(source.domain.clone())
      .path(source.path.clone())
      .secure(source.secure)
      .build();
    window
      .set_cookie(cookie)
      .map_err(|_| "Unable to prepare the verification session.".to_owned())?;
  }
  Ok(())
}

fn completion_finished(completion: &VerificationCompletion) -> bool {
  completion.lock().map_or(true, |sender| sender.is_none())
}

fn complete_with_error(completion: &VerificationCompletion, message: &str) {
  if let Ok(mut sender) = completion.lock() {
    if let Some(sender) = sender.take() {
      let _ = sender.send(Err(message.to_owned()));
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn accepts_only_completed_api_snapshots() {
    let completed = VerificationSnapshot {
      url: "https://apiff14risingstones.web.sdo.com/api/common/search?page=1".to_owned(),
      body: "<script>challenge</script>".to_owned(),
      cookie: "__tst_status=123#; EO_Bot_Ssid=456".to_owned(),
    };
    assert!(is_completed_snapshot(&completed));
    assert!(!is_completed_snapshot(&VerificationSnapshot {
      cookie: "EO_Bot_Ssid=456".to_owned(),
      body: "not json".to_owned(),
      ..completed.clone()
    }));
    assert!(is_completed_snapshot(&VerificationSnapshot {
      cookie: String::new(),
      body: "{\"code\":0}".to_owned(),
      ..completed
    }));
    assert!(!is_allowed_url(
      &Url::parse("https://example.com/api/common/search").unwrap()
    ));
  }
}
