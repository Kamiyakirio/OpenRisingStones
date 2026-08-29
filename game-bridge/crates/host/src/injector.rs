//! Windows x64 DLL loading and exported bootstrap invocation.

use crate::error::{last_windows_error, BridgeError, BridgeResult};
use std::ffi::{c_void, CString, OsStr};
use std::mem::{size_of, transmute};
use std::os::windows::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use std::ptr::{null, null_mut};
use windows_sys::Win32::Foundation::{
    CloseHandle, FreeLibrary, HANDLE, HMODULE, INVALID_HANDLE_VALUE,
};
use windows_sys::Win32::Storage::FileSystem::SYNCHRONIZE;
use windows_sys::Win32::System::Diagnostics::Debug::WriteProcessMemory;
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Module32FirstW, Module32NextW, MODULEENTRY32W, TH32CS_SNAPMODULE,
    TH32CS_SNAPMODULE32,
};
use windows_sys::Win32::System::LibraryLoader::{
    GetModuleFileNameW, GetModuleHandleExW, GetModuleHandleW, GetProcAddress, LoadLibraryExW,
    DONT_RESOLVE_DLL_REFERENCES, GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS,
    GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
};
use windows_sys::Win32::System::Memory::{
    VirtualAllocEx, VirtualFreeEx, MEM_COMMIT, MEM_RELEASE, MEM_RESERVE, PAGE_READWRITE,
};
use windows_sys::Win32::System::Threading::{
    CreateRemoteThread, GetExitCodeThread, OpenProcess, WaitForSingleObject,
    LPTHREAD_START_ROUTINE, PROCESS_CREATE_THREAD, PROCESS_QUERY_INFORMATION, PROCESS_VM_OPERATION,
    PROCESS_VM_READ, PROCESS_VM_WRITE,
};
use zeroize::Zeroize;

const REMOTE_CALL_TIMEOUT_MS: u32 = 15_000;
const WAIT_OBJECT_0_VALUE: u32 = 0;

#[repr(C)]
pub(crate) struct BootstrapArgs {
    pub struct_size: u32,
    pub protocol_version: u32,
    pub flags: u32,
    pub reserved: u32,
    pub pipe_name: [u16; 260],
    pub manifest_path: [u16; 520],
    pub auth_token: [u8; 32],
}

impl Drop for BootstrapArgs {
    fn drop(&mut self) {
        self.auth_token.zeroize();
    }
}

impl BootstrapArgs {
    pub(crate) fn new(
        pipe_name: &str,
        manifest_path: &Path,
        auth_token: [u8; 32],
    ) -> BridgeResult<Self> {
        let mut args = Self {
            struct_size: size_of::<Self>() as u32,
            protocol_version: game_bridge_protocol::PROTOCOL_VERSION,
            flags: 0,
            reserved: 0,
            pipe_name: [0; 260],
            manifest_path: [0; 520],
            auth_token,
        };
        copy_utf16(pipe_name, &mut args.pipe_name, "pipe name")?;
        copy_path_utf16(manifest_path, &mut args.manifest_path, "manifest path")?;
        Ok(args)
    }
}

/// Owns the target process handle and the loaded remote module.
pub(crate) struct InjectedPayload {
    process: HANDLE,
    process_id: u32,
    remote_module: usize,
    payload_path: PathBuf,
}

unsafe impl Send for InjectedPayload {}

impl InjectedPayload {
    pub(crate) fn inject(
        process_id: u32,
        payload_path: &Path,
        bootstrap: &BootstrapArgs,
    ) -> BridgeResult<Self> {
        let payload_path = payload_path
            .canonicalize()
            .map_err(|_| BridgeError::InvalidPath(payload_path.display().to_string()))?;
        if !payload_path.is_file() {
            return Err(BridgeError::InvalidPath(payload_path.display().to_string()));
        }

        let process = unsafe {
            OpenProcess(
                PROCESS_CREATE_THREAD
                    | PROCESS_QUERY_INFORMATION
                    | PROCESS_VM_OPERATION
                    | PROCESS_VM_READ
                    | PROCESS_VM_WRITE
                    | SYNCHRONIZE,
                0,
                process_id,
            )
        };
        if process.is_null() {
            return Err(last_windows_error("OpenProcess"));
        }

        let result =
            unsafe { Self::inject_open_process(process, process_id, &payload_path, bootstrap) };
        if result.is_err() {
            unsafe { CloseHandle(process) };
        }
        result
    }

    unsafe fn inject_open_process(
        process: HANDLE,
        process_id: u32,
        payload_path: &Path,
        bootstrap: &BootstrapArgs,
    ) -> BridgeResult<Self> {
        let path_bytes = wide_null(payload_path.as_os_str());
        let remote_path = RemoteAllocation::write(process, as_bytes(&path_bytes))?;
        let load_library = remote_system_function(process_id, "kernel32.dll", "LoadLibraryW")?;
        if let Err(error) = call_remote(
            process,
            load_library,
            remote_path.address,
            REMOTE_CALL_TIMEOUT_MS,
        ) {
            if matches!(error, BridgeError::Timeout(_)) {
                remote_path.leak();
            }
            return Err(error);
        }

        let file_name = payload_path
            .file_name()
            .and_then(OsStr::to_str)
            .ok_or_else(|| BridgeError::InvalidPath(payload_path.display().to_string()))?;
        let remote_module = find_remote_module(process_id, file_name)?;
        let initialize_offset = local_export_offset(payload_path, "bridge_initialize")?;
        let remote_args =
            RemoteAllocation::write(process, as_bytes(std::slice::from_ref(bootstrap)))?;
        let initialize_code = match call_remote(
            process,
            remote_module + initialize_offset,
            remote_args.address,
            REMOTE_CALL_TIMEOUT_MS,
        ) {
            Ok(code) => code,
            Err(error) => {
                if matches!(error, BridgeError::Timeout(_)) {
                    remote_args.leak();
                }
                return Err(error);
            }
        };
        if initialize_code != 0 {
            let _ = call_remote(
                process,
                remote_system_function(process_id, "kernel32.dll", "FreeLibrary")?,
                remote_module,
                REMOTE_CALL_TIMEOUT_MS,
            );
            return Err(BridgeError::InitializationRejected(initialize_code));
        }

        Ok(Self {
            process,
            process_id,
            remote_module,
            payload_path: payload_path.to_path_buf(),
        })
    }

    pub(crate) fn unload(mut self) -> BridgeResult<()> {
        // Inspecting exports loads the DLL without resolving imports or running its entry point.
        let shutdown_offset =
            unsafe { local_export_offset(&self.payload_path, "bridge_shutdown")? };
        let shutdown_code = unsafe {
            call_remote(
                self.process,
                self.remote_module + shutdown_offset,
                0,
                REMOTE_CALL_TIMEOUT_MS,
            )?
        };
        if shutdown_code != 0 {
            return Err(BridgeError::InitializationRejected(shutdown_code));
        }

        let free_library =
            unsafe { remote_system_function(self.process_id, "kernel32.dll", "FreeLibrary")? };
        unsafe {
            let unloaded = call_remote(
                self.process,
                free_library,
                self.remote_module,
                REMOTE_CALL_TIMEOUT_MS,
            )?;
            if unloaded == 0 {
                return Err(BridgeError::Windows {
                    operation: "FreeLibrary(remote)",
                    code: 0,
                });
            }
            CloseHandle(self.process);
        }
        self.process = null_mut();
        Ok(())
    }
}

impl Drop for InjectedPayload {
    fn drop(&mut self) {
        if !self.process.is_null() {
            unsafe { CloseHandle(self.process) };
            self.process = null_mut();
        }
    }
}

struct RemoteAllocation {
    process: HANDLE,
    address: usize,
}

impl RemoteAllocation {
    unsafe fn write(process: HANDLE, bytes: &[u8]) -> BridgeResult<Self> {
        let address = VirtualAllocEx(
            process,
            null(),
            bytes.len(),
            MEM_COMMIT | MEM_RESERVE,
            PAGE_READWRITE,
        ) as usize;
        if address == 0 {
            return Err(last_windows_error("VirtualAllocEx"));
        }

        let mut written = 0;
        if WriteProcessMemory(
            process,
            address as *mut c_void,
            bytes.as_ptr().cast(),
            bytes.len(),
            &mut written,
        ) == 0
            || written != bytes.len()
        {
            VirtualFreeEx(process, address as *mut c_void, 0, MEM_RELEASE);
            return Err(last_windows_error("WriteProcessMemory"));
        }
        Ok(Self { process, address })
    }

    fn leak(self) {
        std::mem::forget(self);
    }
}

impl Drop for RemoteAllocation {
    fn drop(&mut self) {
        unsafe {
            VirtualFreeEx(self.process, self.address as *mut c_void, 0, MEM_RELEASE);
        }
    }
}

unsafe fn call_remote(
    process: HANDLE,
    function: usize,
    parameter: usize,
    timeout_ms: u32,
) -> BridgeResult<u32> {
    let start_routine = transmute::<usize, LPTHREAD_START_ROUTINE>(function);
    let thread = CreateRemoteThread(
        process,
        null(),
        0,
        start_routine,
        parameter as *const c_void,
        0,
        null_mut(),
    );
    if thread.is_null() {
        return Err(last_windows_error("CreateRemoteThread"));
    }

    let wait_result = WaitForSingleObject(thread, timeout_ms);
    if wait_result != WAIT_OBJECT_0_VALUE {
        CloseHandle(thread);
        return Err(BridgeError::Timeout("remote function"));
    }

    let mut exit_code = 0;
    if GetExitCodeThread(thread, &mut exit_code) == 0 {
        CloseHandle(thread);
        return Err(last_windows_error("GetExitCodeThread"));
    }
    CloseHandle(thread);
    Ok(exit_code)
}

unsafe fn remote_system_function(
    process_id: u32,
    module_name: &str,
    export_name: &str,
) -> BridgeResult<usize> {
    let module_wide = wide_null(OsStr::new(module_name));
    let local_module = GetModuleHandleW(module_wide.as_ptr());
    if local_module.is_null() {
        return Err(last_windows_error("GetModuleHandleW"));
    }
    let export = CString::new(export_name).expect("static export name");
    let local_function = GetProcAddress(local_module, export.as_ptr().cast())
        .ok_or_else(|| last_windows_error("GetProcAddress(system)"))?
        as usize;
    let mut owner_module = null_mut();
    if GetModuleHandleExW(
        GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
        local_function as *const u16,
        &mut owner_module,
    ) == 0
    {
        return Err(last_windows_error("GetModuleHandleExW(function owner)"));
    }
    let mut owner_path = [0u16; 32768];
    let owner_length = GetModuleFileNameW(
        owner_module,
        owner_path.as_mut_ptr(),
        owner_path.len() as u32,
    ) as usize;
    if owner_length == 0 || owner_length >= owner_path.len() {
        return Err(last_windows_error("GetModuleFileNameW(function owner)"));
    }
    let owner_name = Path::new(&String::from_utf16_lossy(&owner_path[..owner_length]))
        .file_name()
        .and_then(OsStr::to_str)
        .ok_or_else(|| BridgeError::InvalidData("invalid system module path".to_owned()))?
        .to_owned();
    let remote_module = find_remote_module(process_id, &owner_name)?;
    Ok(remote_module + (local_function - owner_module as usize))
}

unsafe fn local_export_offset(path: &Path, export_name: &str) -> BridgeResult<usize> {
    let wide_path = wide_null(path.as_os_str());
    let module: HMODULE =
        LoadLibraryExW(wide_path.as_ptr(), null_mut(), DONT_RESOLVE_DLL_REFERENCES);
    if module.is_null() {
        return Err(last_windows_error(
            "LoadLibraryExW(local export inspection)",
        ));
    }
    let export = CString::new(export_name).expect("static export name");
    let address = match GetProcAddress(module, export.as_ptr().cast()) {
        Some(address) => address as usize,
        None => {
            let error = last_windows_error("GetProcAddress(payload)");
            FreeLibrary(module);
            return Err(error);
        }
    };
    let offset = address - module as usize;
    FreeLibrary(module);
    Ok(offset)
}

unsafe fn find_remote_module(process_id: u32, module_name: &str) -> BridgeResult<usize> {
    let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, process_id);
    if snapshot == INVALID_HANDLE_VALUE {
        return Err(last_windows_error("CreateToolhelp32Snapshot(module)"));
    }
    let mut entry = MODULEENTRY32W {
        dwSize: size_of::<MODULEENTRY32W>() as u32,
        ..std::mem::zeroed()
    };
    let mut has_entry = Module32FirstW(snapshot, &mut entry) != 0;
    while has_entry {
        let length = entry
            .szModule
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(entry.szModule.len());
        let current_name = String::from_utf16_lossy(&entry.szModule[..length]);
        if current_name.eq_ignore_ascii_case(module_name) {
            CloseHandle(snapshot);
            return Ok(entry.modBaseAddr as usize);
        }
        has_entry = Module32NextW(snapshot, &mut entry) != 0;
    }
    CloseHandle(snapshot);
    Err(BridgeError::InvalidData(format!(
        "remote module not found: {module_name}"
    )))
}

fn copy_utf16(value: &str, target: &mut [u16], label: &str) -> BridgeResult<()> {
    let encoded: Vec<u16> = value.encode_utf16().collect();
    if encoded.len() >= target.len() {
        return Err(BridgeError::InvalidData(format!("{label} is too long")));
    }
    target[..encoded.len()].copy_from_slice(&encoded);
    Ok(())
}

fn copy_path_utf16(path: &Path, target: &mut [u16], label: &str) -> BridgeResult<()> {
    let encoded: Vec<u16> = path.as_os_str().encode_wide().collect();
    if encoded.len() >= target.len() {
        return Err(BridgeError::InvalidData(format!("{label} is too long")));
    }
    target[..encoded.len()].copy_from_slice(&encoded);
    Ok(())
}

fn wide_null(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(std::iter::once(0)).collect()
}

unsafe fn as_bytes<T>(values: &[T]) -> &[u8] {
    std::slice::from_raw_parts(values.as_ptr().cast(), std::mem::size_of_val(values))
}
