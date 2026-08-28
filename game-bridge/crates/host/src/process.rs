//! Windows target-process discovery with strict executable-name validation.

use crate::error::{last_windows_error, BridgeError, BridgeResult};
use std::mem::size_of;
use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};

const TARGET_EXECUTABLE: &str = "ffxiv_dx11.exe";

pub(crate) fn resolve_process_id(requested: Option<u32>) -> BridgeResult<u32> {
    let processes = enumerate_target_processes()?;
    match requested {
        Some(process_id) if processes.contains(&process_id) => Ok(process_id),
        Some(_) => Err(BridgeError::UnexpectedProcess),
        None if processes.is_empty() => Err(BridgeError::ProcessNotFound),
        None if processes.len() > 1 => Err(BridgeError::MultipleProcesses),
        None => Ok(processes[0]),
    }
}

fn enumerate_target_processes() -> BridgeResult<Vec<u32>> {
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
    if snapshot == INVALID_HANDLE_VALUE {
        return Err(last_windows_error("CreateToolhelp32Snapshot(process)"));
    }

    let mut entry = PROCESSENTRY32W {
        dwSize: size_of::<PROCESSENTRY32W>() as u32,
        ..unsafe { std::mem::zeroed() }
    };
    let mut matches = Vec::new();
    let mut has_entry = unsafe { Process32FirstW(snapshot, &mut entry) } != 0;
    while has_entry {
        let length = entry
            .szExeFile
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(entry.szExeFile.len());
        let executable = String::from_utf16_lossy(&entry.szExeFile[..length]);
        if executable.eq_ignore_ascii_case(TARGET_EXECUTABLE) {
            matches.push(entry.th32ProcessID);
        }
        has_entry = unsafe { Process32NextW(snapshot, &mut entry) } != 0;
    }

    unsafe { CloseHandle(snapshot) };
    Ok(matches)
}
