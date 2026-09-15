//! Owns a single local timer window; opening it also recovers mouse passthrough.
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WindowEvent};

const LABEL: &str = "fishing-timer";

#[derive(Deserialize, Serialize)]
struct Geometry {
  x: i32,
  y: i32,
  width: f64,
  height: f64,
}

fn save_geometry(window: &WebviewWindow) {
  let Ok(position) = window.outer_position() else {
    return;
  };
  let Ok(size) = window.inner_size() else {
    return;
  };
  let Ok(scale) = window.scale_factor() else {
    return;
  };
  let Ok(directory) = window.app_handle().path().app_local_data_dir() else {
    return;
  };
  let geometry = Geometry {
    x: position.x,
    y: position.y,
    width: f64::from(size.width) / scale,
    height: f64::from(size.height) / scale,
  };
  if let Ok(json) = serde_json::to_vec(&geometry) {
    let _ = std::fs::create_dir_all(&directory);
    let _ = std::fs::write(directory.join("fishing-timer-window.json"), json);
  }
}

#[tauri::command]
pub async fn open_fishing_timer(app: AppHandle) -> Result<(), String> {
  if let Some(window) = app.get_webview_window(LABEL) {
    window
      .set_ignore_cursor_events(false)
      .map_err(|e| e.to_string())?;
    window.set_focusable(true).map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    // A native event resets the window's controls after recovering passthrough.
    use tauri::Emitter;
    window
      .emit("fishing-timer://unlocked", ())
      .map_err(|e| e.to_string())?;
    return Ok(());
  }
  let geometry = app
    .path()
    .app_local_data_dir()
    .ok()
    .and_then(|directory| std::fs::read(directory.join("fishing-timer-window.json")).ok())
    .and_then(|bytes| serde_json::from_slice::<Geometry>(&bytes).ok());
  let (width, height) = geometry
    .as_ref()
    .map(|g| (g.width.clamp(360.0, 800.0), g.height.clamp(260.0, 700.0)))
    .unwrap_or((420.0, 300.0));
  let window = tauri::WebviewWindowBuilder::new(
    &app,
    LABEL,
    WebviewUrl::App("index.html?window=fishing-timer".into()),
  )
  .title("Fishing timer")
  .inner_size(width, height)
  .min_inner_size(360.0, 260.0)
  .decorations(false)
  .always_on_top(true)
  .skip_taskbar(true)
  .focused(false)
  .visible(false)
  .build()
  .map_err(|e| e.to_string())?;
  // Restore only positions that leave the title controls accessible on an attached monitor.
  if let Some(g) = geometry {
    let visible = window
      .available_monitors()
      .unwrap_or_default()
      .iter()
      .any(|monitor| {
        let p = monitor.position();
        let s = monitor.size();
        i64::from(g.x) >= i64::from(p.x)
          && i64::from(g.y) >= i64::from(p.y)
          && i64::from(g.x) + 360 < i64::from(p.x) + i64::from(s.width)
          && i64::from(g.y) + 80 < i64::from(p.y) + i64::from(s.height)
      });
    if visible {
      let _ = window.set_position(PhysicalPosition::new(g.x, g.y));
    } else {
      let _ = window.center();
    }
  } else {
    let _ = window.center();
  }
  let observed = window.clone();
  window.on_window_event(move |event| {
    if matches!(event, WindowEvent::CloseRequested { .. }) {
      save_geometry(&observed);
    }
    if matches!(event, WindowEvent::Destroyed) {
      observed
        .state::<crate::fishing_monitor::FishingMonitorState>()
        .stop();
    }
  });
  window.show().map_err(|e| e.to_string())
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimerWindowAction {
  Pin,
  Unpin,
  Lock,
  Close,
}

#[tauri::command]
pub fn control_fishing_timer(
  window: WebviewWindow,
  action: TimerWindowAction,
) -> Result<(), String> {
  if window.label() != LABEL {
    return Err("Timer controls require the timer window.".into());
  }
  match action {
    TimerWindowAction::Pin => window.set_always_on_top(true),
    TimerWindowAction::Unpin => window.set_always_on_top(false),
    TimerWindowAction::Lock => window.set_ignore_cursor_events(true),
    TimerWindowAction::Close => window.close(),
  }
  .map_err(|e| e.to_string())
}
