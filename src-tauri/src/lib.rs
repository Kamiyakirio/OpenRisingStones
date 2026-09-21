//! OpenRisingStones 桌面端后端入口及对前端开放的受控命令。

mod avatar;
mod chat_bridge;
#[cfg(debug_assertions)]
mod diagnostics;
mod elevation;
mod fishing_monitor;
mod fishing_timer;
#[cfg_attr(windows, path = "game_bridge.rs")]
#[cfg_attr(not(windows), path = "game_bridge_unsupported.rs")]
mod game_bridge;
mod gearing;
mod gearing_storage;
mod glamour;
mod glamour_verification;
mod owned_items;
mod process_memory;
mod python_sidecar;
mod recruit;
mod sdo_login;
mod secure_storage;
mod teleport;
mod wiki;

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

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
  #[allow(unused_mut)]
  let mut app = tauri::Builder::default()
    .setup(move |app| {
      #[cfg(debug_assertions)]
      if let Err(error) = diagnostics::initialize(app.handle()) {
        eprintln!("Debug logging is unavailable: {error}");
      }
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
      #[cfg(debug_assertions)]
      let owned_items_path = std::env::current_dir()?.join("owned-items.debug.dat");
      #[cfg(not(debug_assertions))]
      let session_path = app.path().app_local_data_dir()?.join("sdo-session.v1.dat");
      #[cfg(not(debug_assertions))]
      let owned_items_path = app.path().app_local_data_dir()?.join("owned-items.v1.dat");
      app.manage(sdo_login::LoginState::with_storage_paths(
        session_path,
        owned_items_path,
      ));
      app.manage(avatar::AvatarState::default());
      app.manage(gearing::GearingState::with_documents_path(
        app.path().app_local_data_dir()?.join("gearsets"),
      ));
      app.manage(glamour_verification::GlamourVerificationState::default());
      app.manage(recruit::RecruitSessionState::default());
      app.manage(wiki::WikiVerificationState::default());
      app.manage(fishing_monitor::FishingMonitorState::default());
      let game_bridge = game_bridge::GameBridgeState::new(app.handle().clone())?;
      let chat_bridge = chat_bridge::ChatBridgeState::new(game_bridge.manager());
      app.manage(game_bridge);
      app.manage(chat_bridge);
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      avatar::fetch_rising_stones_avatar,
      gearing::gearing_request,
      gearing::optimize_gearing,
      gearing::cancel_gearing_optimization,
      gearing::benchmark_gearing,
      gearing::gearing_benchmark_info,
      gearing::export_gearing_benchmark,
      elevation::restart_as_administrator,
      fishing_timer::open_fishing_timer,
      fishing_timer::control_fishing_timer,
      fishing_monitor::start_fishing_monitor,
      fishing_monitor::stop_fishing_monitor,
      glamour::fetch_glamour_detail,
      glamour::fetch_glamour_page,
      game_bridge::game_bridge_status,
      game_bridge::game_bridge_connect,
      game_bridge::game_bridge_prepare,
      game_bridge::game_bridge_read,
      game_bridge::game_bridge_capture_snapshot,
      game_bridge::game_bridge_capture_active_character,
      game_bridge::game_bridge_capture_inventory,
      game_bridge::game_bridge_capture_portrait_lighting,
      game_bridge::game_bridge_update_portrait_lighting,
      game_bridge::game_bridge_sync_owned_items,
      game_bridge::game_bridge_return_to_title,
      game_bridge::game_bridge_logout_to_title,
      game_bridge::game_bridge_switch_region,
      game_bridge::game_bridge_apply_teleport_region,
      game_bridge::game_bridge_trigger_login,
      game_bridge::game_bridge_disconnect,
      #[cfg(debug_assertions)]
      game_bridge::game_bridge_debug_unload_payload,
      chat_bridge::chat_bridge_status,
      chat_bridge::chat_bridge_start,
      chat_bridge::chat_bridge_stop,
      owned_items::load_owned_items_cache,
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
      sdo_login::sdo_logout,
      teleport::fetch_teleport,
      teleport::teleport_automatic_preflight,
      teleport::refresh_teleport_service_session,
      wiki::fetch_wiki_item_page,
      wiki::show_wiki_verification,
      wiki::cancel_wiki_verification,
      #[cfg(debug_assertions)]
      diagnostics::debug_log_record,
      #[cfg(debug_assertions)]
      diagnostics::debug_log_failure_count,
      #[cfg(debug_assertions)]
      diagnostics::debug_log_list,
      #[cfg(debug_assertions)]
      diagnostics::debug_log_get,
      #[cfg(debug_assertions)]
      diagnostics::debug_log_clear,
      #[cfg(debug_assertions)]
      diagnostics::debug_log_export,
      #[cfg(debug_assertions)]
      diagnostics::debug_log_save_attachment,
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
    if matches!(event, tauri::RunEvent::ExitRequested { .. }) {
      app_handle
        .state::<fishing_monitor::FishingMonitorState>()
        .stop();
      if let Some(state) = app_handle.try_state::<game_bridge::GameBridgeState>() {
        if let Some(chat_state) = app_handle.try_state::<chat_bridge::ChatBridgeState>() {
          chat_state.shutdown();
        }
        state.shutdown();
      }
    }
    #[cfg(debug_assertions)]
    if matches!(event, tauri::RunEvent::Exit) {
      diagnostics::shutdown();
    }

    // Restore normal Dock and user-initiated focus behavior after launch finishes.
    #[cfg(target_os = "macos")]
    if !should_focus && matches!(event, tauri::RunEvent::Ready) {
      app_handle
        .set_activation_policy(tauri::ActivationPolicy::Regular)
        .expect("failed to restore the macOS activation policy");
    }
  });
}
