//! OpenRisingStones 桌面端后端入口及对前端开放的受控命令。

mod avatar;
mod glamour;
mod glamour_verification;
mod game_bridge;
mod network;
mod python_sidecar;
mod recruit;
mod sdo_login;
mod secure_storage;
mod wiki;

use std::fs;
use std::path::PathBuf;
use tauri::Manager;
#[cfg(debug_assertions)]
use tauri_plugin_log::{Target, TargetKind};

/// Returns whether the main window should take focus when it is created.
///
/// A new `tauri dev` session removes the marker in `beforeDevCommand`. Rust
/// watcher restarts keep it, so only the first process in that session focuses.
fn should_focus_main_window() -> bool {
  if !cfg!(debug_assertions) {
    return true;
  }

  let marker_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".tauri-dev-started");
  if marker_path.exists() {
    false
  } else {
    let _ = fs::write(marker_path, "");
    true
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let should_focus = should_focus_main_window();
  let mut app = tauri::Builder::default()
    .setup(move |app| {
      let main_window_config = app.config().app.windows.first().ok_or_else(|| {
        std::io::Error::new(
          std::io::ErrorKind::NotFound,
          "main window configuration is missing",
        )
      })?;
      tauri::WebviewWindowBuilder::from_config(app.handle(), main_window_config)?
        .focused(should_focus)
        .build()?;

      #[cfg(debug_assertions)]
      let session_path = std::env::current_dir()?.join("sdo-session.debug.json");
      #[cfg(not(debug_assertions))]
      let session_path = app.path().app_local_data_dir()?.join("sdo-session.v1.dat");
      app.manage(sdo_login::LoginState::with_storage_path(session_path));
      app.manage(avatar::AvatarState::default());
      app.manage(glamour_verification::GlamourVerificationState::default());
      app.manage(recruit::RecruitSessionState::default());
      app.manage(wiki::WikiVerificationState::default());
      app.manage(game_bridge::GameBridgeState::new(app.handle().clone())?);
      #[cfg(debug_assertions)]
      {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .targets([
              Target::new(TargetKind::Stdout)
                .filter(|metadata| metadata.target() != "network_console"),
              Target::new(TargetKind::LogDir { file_name: None })
                .filter(|metadata| metadata.target() != "network_console"),
              Target::new(TargetKind::Webview)
                .filter(|metadata| metadata.target() == "network_console")
                .format(|callback, message, _record| {
                  callback.finish(format_args!("{message}"));
                }),
            ])
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      avatar::fetch_rising_stones_avatar,
      glamour::fetch_glamour_detail,
      glamour::fetch_glamour_page,
      game_bridge::game_bridge_status,
      game_bridge::game_bridge_connect,
      game_bridge::game_bridge_capture_snapshot,
      game_bridge::game_bridge_capture_active_character,
      game_bridge::game_bridge_return_to_title,
      game_bridge::game_bridge_switch_region,
      game_bridge::game_bridge_trigger_login,
      game_bridge::game_bridge_disconnect,
      network::send_network_request,
      recruit::fetch_recruit_config,
      recruit::fetch_recruit_detail,
      recruit::fetch_recruit_page,
      sdo_login::clear_all_local_data,
      sdo_login::sdo_login_status,
      sdo_login::sdo_start_push_login,
      sdo_login::sdo_start_qr_login,
      sdo_login::sdo_poll_push_login,
      sdo_login::sdo_poll_qr_login,
      sdo_login::sdo_login_with_cookie,
      sdo_login::sdo_cancel_login,
      wiki::fetch_wiki_item_page,
      wiki::show_wiki_verification,
      wiki::cancel_wiki_verification,
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  // macOS activates each newly launched process independently of window focus.
  // Temporarily prohibit activation so a watcher restart stays in the background.
  #[cfg(target_os = "macos")]
  if !should_focus {
    app.set_activation_policy(tauri::ActivationPolicy::Prohibited);
  }

  app.run(move |app_handle, event| {
    // Restore normal Dock and user-initiated focus behavior after launch finishes.
    #[cfg(target_os = "macos")]
    if !should_focus && matches!(event, tauri::RunEvent::Ready) {
      app_handle
        .set_activation_policy(tauri::ActivationPolicy::Regular)
        .expect("failed to restore the macOS activation policy");
    }
  });
}
