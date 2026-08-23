//! OpenRisingStones 桌面端后端入口及对前端开放的受控命令。

mod glamour;
mod network;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
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
      glamour::fetch_glamour_page,
      network::send_network_request,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
