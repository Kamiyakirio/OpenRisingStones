//! Windows UAC relaunch support exposed through a narrow Tauri command.

use serde::Serialize;
use tauri::AppHandle;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ElevationError {
  code: &'static str,
  message: String,
}

impl ElevationError {
  fn new(code: &'static str, message: impl Into<String>) -> Self {
    Self {
      code,
      message: message.into(),
    }
  }
}

/// Starts a new elevated process through the Windows `runas` verb.
#[tauri::command]
pub fn restart_as_administrator(app: AppHandle) -> Result<(), ElevationError> {
  #[cfg(windows)]
  {
    relaunch_elevated()?;
    app.exit(0);
    Ok(())
  }

  #[cfg(not(windows))]
  {
    let _ = app;
    Err(ElevationError::new(
      "unsupported_platform",
      "Administrator relaunch is only supported on Windows.",
    ))
  }
}

#[cfg(windows)]
fn relaunch_elevated() -> Result<(), ElevationError> {
  use std::ptr::null;
  use windows_sys::Win32::UI::Shell::ShellExecuteW;
  use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

  let executable = std::env::current_exe().map_err(|error| {
    ElevationError::new(
      "elevation_launch_failed",
      format!("Could not locate the current executable: {error}"),
    )
  })?;
  let working_directory = std::env::current_dir().map_err(|error| {
    ElevationError::new(
      "elevation_launch_failed",
      format!("Could not resolve the current working directory: {error}"),
    )
  })?;
  let verb = wide_null(std::ffi::OsStr::new("runas"));
  let executable = wide_null(executable.as_os_str());
  let working_directory = wide_null(working_directory.as_os_str());
  let result = unsafe {
    ShellExecuteW(
      std::ptr::null_mut(),
      verb.as_ptr(),
      executable.as_ptr(),
      null(),
      working_directory.as_ptr(),
      SW_SHOWNORMAL,
    )
  } as isize;

  if result > 32 {
    Ok(())
  } else {
    Err(ElevationError::new(
      if result == 5 {
        "elevation_denied"
      } else {
        "elevation_launch_failed"
      },
      format!("Windows rejected the elevated relaunch with code {result}."),
    ))
  }
}

#[cfg(windows)]
fn wide_null(value: &std::ffi::OsStr) -> Vec<u16> {
  use std::os::windows::ffi::OsStrExt;

  value.encode_wide().chain(std::iter::once(0)).collect()
}
