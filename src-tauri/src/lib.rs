//! OpenRisingStones 桌面端后端入口及对前端开放的受控命令。

mod glamour;
mod network;
mod python_sidecar;
mod sdo_login;
mod secure_storage;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let session_path = app.path().app_local_data_dir()?.join("sdo-session.v1.dat");
      app.manage(sdo_login::LoginState::with_storage_path(session_path));
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      glamour::fetch_glamour_detail,
      glamour::fetch_glamour_page,
      network::send_network_request,
      sdo_login::sdo_login_status,
      sdo_login::sdo_start_push_login,
      sdo_login::sdo_start_qr_login,
      sdo_login::sdo_poll_push_login,
      sdo_login::sdo_poll_qr_login,
      sdo_login::sdo_login_with_cookie,
      sdo_login::sdo_cancel_login,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
