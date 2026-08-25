//! OpenRisingStones 桌面端后端入口及对前端开放的受控命令。

mod glamour;
mod glamour_verification;
mod network;
mod python_sidecar;
mod sdo_login;
mod secure_storage;
mod wiki;

use tauri::Manager;
#[cfg(debug_assertions)]
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      #[cfg(debug_assertions)]
      let session_path = std::env::current_dir()?.join("sdo-session.debug.json");
      #[cfg(not(debug_assertions))]
      let session_path = app.path().app_local_data_dir()?.join("sdo-session.v1.dat");
      app.manage(sdo_login::LoginState::with_storage_path(session_path));
      app.manage(glamour_verification::GlamourVerificationState::default());
      app.manage(wiki::WikiVerificationState::default());
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
      glamour::fetch_glamour_detail,
      glamour::fetch_glamour_page,
      network::send_network_request,
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
