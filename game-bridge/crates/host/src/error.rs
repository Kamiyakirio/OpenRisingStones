//! Stable host errors exposed to the Tauri adapter.

use thiserror::Error;

pub type BridgeResult<T> = Result<T, BridgeError>;

#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("the game bridge is only supported on Windows")]
    UnsupportedPlatform,
    #[error("the game bridge is already connected")]
    AlreadyConnected,
    #[error("the game bridge is not connected")]
    NotConnected,
    #[error("no target game process was found")]
    ProcessNotFound,
    #[error("multiple target game processes were found; provide a process id")]
    MultipleProcesses,
    #[error("the selected process is not the expected game executable")]
    UnexpectedProcess,
    #[error("invalid bridge path: {0}")]
    InvalidPath(String),
    #[error("the payload rejected initialization with code {0}")]
    InitializationRejected(u32),
    #[error("the bridge protocol is incompatible: host={host}, payload={payload}")]
    ProtocolMismatch { host: u32, payload: u32 },
    #[error("the bridge operation timed out: {0}")]
    Timeout(&'static str),
    #[error("the bridge connection closed unexpectedly")]
    ConnectionClosed,
    #[error("the payload rejected the command: {code}: {message}")]
    CommandRejected { code: String, message: String },
    #[error("invalid bridge data: {0}")]
    InvalidData(String),
    #[error("Windows operation failed: {operation}, code={code}")]
    Windows { operation: &'static str, code: u32 },
    #[error("I/O operation failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON operation failed: {0}")]
    Json(#[from] serde_json::Error),
}

#[cfg(windows)]
pub(crate) fn last_windows_error(operation: &'static str) -> BridgeError {
    BridgeError::Windows {
        operation,
        code: unsafe { windows_sys::Win32::Foundation::GetLastError() },
    }
}
