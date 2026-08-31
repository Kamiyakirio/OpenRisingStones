//! Windows target-process discovery with strict executable-name validation.

use crate::error::{last_windows_error, BridgeError, BridgeResult};
use std::mem::size_of;
use std::path::PathBuf;
use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Module32FirstW, Module32NextW, Process32FirstW, Process32NextW,
    MODULEENTRY32W, PROCESSENTRY32W, TH32CS_SNAPMODULE, TH32CS_SNAPMODULE32, TH32CS_SNAPPROCESS,
};

const TARGET_EXECUTABLE: &str = "ffxiv_dx11.exe";

pub(crate) struct TargetModuleInfo {
    pub path: PathBuf,
    pub base_address: usize,
    pub image_size: usize,
}

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

pub(crate) fn target_module_info(process_id: u32) -> BridgeResult<TargetModuleInfo> {
    let snapshot =
        unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, process_id) };
    if snapshot == INVALID_HANDLE_VALUE {
        return Err(last_windows_error(
            "CreateToolhelp32Snapshot(target module)",
        ));
    }

    let mut entry = MODULEENTRY32W {
        dwSize: size_of::<MODULEENTRY32W>() as u32,
        ..unsafe { std::mem::zeroed() }
    };
    let mut has_entry = unsafe { Module32FirstW(snapshot, &mut entry) } != 0;
    while has_entry {
        let name_length = entry
            .szModule
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(entry.szModule.len());
        let module_name = String::from_utf16_lossy(&entry.szModule[..name_length]);
        if module_name.eq_ignore_ascii_case(TARGET_EXECUTABLE) {
            let path_length = entry
                .szExePath
                .iter()
                .position(|value| *value == 0)
                .unwrap_or(entry.szExePath.len());
            let result = TargetModuleInfo {
                path: PathBuf::from(String::from_utf16_lossy(&entry.szExePath[..path_length])),
                base_address: entry.modBaseAddr as usize,
                image_size: entry.modBaseSize as usize,
            };
            unsafe { CloseHandle(snapshot) };
            return Ok(result);
        }
        has_entry = unsafe { Module32NextW(snapshot, &mut entry) } != 0;
    }

    unsafe { CloseHandle(snapshot) };
    Err(BridgeError::UnexpectedProcess)
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
