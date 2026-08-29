//! Authenticated, length-prefixed Named Pipe transport for the injected payload.

use crate::error::{last_windows_error, BridgeError, BridgeResult};
use game_bridge_protocol::{
    encode_token, Command, CommandResult, HostMessage, PayloadMessage, MAX_FRAME_SIZE,
    PROTOCOL_VERSION,
};
use std::collections::HashMap;
use std::os::windows::ffi::OsStrExt;
use std::os::windows::io::AsRawHandle;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::Duration;
use windows_sys::Win32::Foundation::{
    CloseHandle, ERROR_PIPE_CONNECTED, HANDLE, INVALID_HANDLE_VALUE,
};
use windows_sys::Win32::Storage::FileSystem::{
    ReadFile, WriteFile, FILE_FLAG_FIRST_PIPE_INSTANCE, PIPE_ACCESS_DUPLEX,
};
use windows_sys::Win32::System::Pipes::{
    ConnectNamedPipe, CreateNamedPipeW, DisconnectNamedPipe, PeekNamedPipe, PIPE_READMODE_BYTE,
    PIPE_REJECT_REMOTE_CLIENTS, PIPE_TYPE_BYTE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
};
use windows_sys::Win32::System::IO::CancelSynchronousIo;
use zeroize::Zeroize;

const PIPE_BUFFER_SIZE: u32 = 64 * 1024;
const COMMAND_TIMEOUT: Duration = Duration::from_secs(15);
const PIPE_POLL_INTERVAL: Duration = Duration::from_millis(5);

pub(crate) enum SessionEvent {
    Ready {
        payload_version: String,
        capabilities: Vec<String>,
    },
    Snapshot(game_bridge_protocol::GameSnapshot),
    Heartbeat(u64),
    Fault {
        code: String,
        message: String,
        fatal: bool,
    },
    Disconnected,
}

struct OutboundCommand {
    request_id: u64,
    command: Command,
    result_tx: Sender<BridgeResult<CommandResult>>,
}

pub(crate) struct PipeSession {
    command_tx: Sender<OutboundCommand>,
    stopping: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl PipeSession {
    pub(crate) fn bind(
        pipe_name: &str,
        auth_token: [u8; 32],
        event_tx: Sender<SessionEvent>,
    ) -> BridgeResult<Self> {
        let pipe_wide: Vec<u16> = std::ffi::OsStr::new(pipe_name)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let handle = unsafe {
            CreateNamedPipeW(
                pipe_wide.as_ptr(),
                PIPE_ACCESS_DUPLEX | FILE_FLAG_FIRST_PIPE_INSTANCE,
                PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
                PIPE_UNLIMITED_INSTANCES,
                PIPE_BUFFER_SIZE,
                PIPE_BUFFER_SIZE,
                0,
                std::ptr::null(),
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            return Err(last_windows_error("CreateNamedPipeW"));
        }

        let (command_tx, command_rx) = mpsc::channel();
        let stopping = Arc::new(AtomicBool::new(false));
        let thread_stopping = Arc::clone(&stopping);
        // The worker exclusively owns the pipe handle and closes it before exiting.
        let worker_handle = handle as usize;
        let thread = match thread::Builder::new()
            .name("game-bridge-pipe".to_owned())
            .spawn(move || {
                run_pipe_loop(
                    worker_handle as HANDLE,
                    auth_token,
                    command_rx,
                    event_tx,
                    thread_stopping,
                );
            }) {
            Ok(thread) => thread,
            Err(error) => {
                unsafe { CloseHandle(handle) };
                return Err(error.into());
            }
        };

        Ok(Self {
            command_tx,
            stopping,
            thread: Some(thread),
        })
    }

    pub(crate) fn send(&self, request_id: u64, command: Command) -> BridgeResult<CommandResult> {
        let (result_tx, result_rx) = mpsc::channel();
        self.command_tx
            .send(OutboundCommand {
                request_id,
                command,
                result_tx,
            })
            .map_err(|_| BridgeError::ConnectionClosed)?;
        result_rx
            .recv_timeout(COMMAND_TIMEOUT)
            .map_err(|error| match error {
                RecvTimeoutError::Timeout => BridgeError::Timeout("payload command"),
                RecvTimeoutError::Disconnected => BridgeError::ConnectionClosed,
            })?
    }

    pub(crate) fn close(mut self) {
        self.stop();
    }

    fn stop(&mut self) {
        if self.stopping.swap(true, Ordering::AcqRel) {
            return;
        }
        if let Some(thread) = self.thread.take() {
            unsafe {
                CancelSynchronousIo(thread.as_raw_handle() as HANDLE);
            }
            let _ = thread.join();
        }
    }
}

impl Drop for PipeSession {
    fn drop(&mut self) {
        self.stop();
    }
}

fn run_pipe_loop(
    handle: HANDLE,
    mut auth_token: [u8; 32],
    command_rx: Receiver<OutboundCommand>,
    event_tx: Sender<SessionEvent>,
    stopping: Arc<AtomicBool>,
) {
    let connected = unsafe { ConnectNamedPipe(handle, std::ptr::null_mut()) } != 0
        || unsafe { windows_sys::Win32::Foundation::GetLastError() } == ERROR_PIPE_CONNECTED;
    if !connected {
        let _ = event_tx.send(SessionEvent::Disconnected);
        close_pipe(handle);
        return;
    }

    let mut expected_token = encode_token(&auth_token);
    auth_token.zeroize();
    let hello = read_payload_message(handle);
    let (payload_version, capabilities) = match hello {
        Ok(PayloadMessage::Hello {
            protocol_version,
            payload_version,
            auth_token,
            capabilities,
        }) if protocol_version == PROTOCOL_VERSION && auth_token == expected_token => {
            (payload_version, capabilities)
        }
        _ => {
            expected_token.zeroize();
            let _ = event_tx.send(SessionEvent::Fault {
                code: "handshake_rejected".to_owned(),
                message: "The payload handshake was rejected.".to_owned(),
                fatal: true,
            });
            close_pipe(handle);
            return;
        }
    };
    expected_token.zeroize();

    if write_host_message(
        handle,
        &HostMessage::HelloAck {
            protocol_version: PROTOCOL_VERSION,
        },
    )
    .is_err()
    {
        let _ = event_tx.send(SessionEvent::Disconnected);
        close_pipe(handle);
        return;
    }
    let _ = event_tx.send(SessionEvent::Ready {
        payload_version,
        capabilities,
    });

    let mut pending: HashMap<u64, Sender<BridgeResult<CommandResult>>> = HashMap::new();
    while !stopping.load(Ordering::Acquire) {
        while let Ok(outbound) = command_rx.try_recv() {
            let request_id = outbound.request_id;
            let message = HostMessage::Command {
                request_id,
                command: outbound.command,
            };
            match write_host_message(handle, &message) {
                Ok(()) => {
                    pending.insert(request_id, outbound.result_tx);
                }
                Err(error) => {
                    let _ = outbound.result_tx.send(Err(error));
                    stopping.store(true, Ordering::Release);
                    break;
                }
            }
        }
        if stopping.load(Ordering::Acquire) {
            break;
        }

        // A blocking ReadFile would prevent newly queued commands from being written until the
        // payload happens to publish another event. Polling keeps command latency independent of
        // the heartbeat interval while preserving exclusive handle ownership on this worker.
        let mut available = 0;
        if unsafe {
            PeekNamedPipe(
                handle,
                std::ptr::null_mut(),
                0,
                std::ptr::null_mut(),
                &mut available,
                std::ptr::null_mut(),
            )
        } == 0
        {
            break;
        }
        if available == 0 {
            thread::sleep(PIPE_POLL_INTERVAL);
            continue;
        }

        match read_payload_message(handle) {
            Ok(PayloadMessage::Snapshot { snapshot }) => {
                let _ = event_tx.send(SessionEvent::Snapshot(snapshot));
            }
            Ok(PayloadMessage::Heartbeat { sequence }) => {
                let _ = event_tx.send(SessionEvent::Heartbeat(sequence));
            }
            Ok(PayloadMessage::Fault {
                code,
                message,
                fatal,
            }) => {
                let _ = event_tx.send(SessionEvent::Fault {
                    code,
                    message,
                    fatal,
                });
                if fatal {
                    break;
                }
            }
            Ok(PayloadMessage::Response {
                request_id,
                result,
                error,
            }) => {
                if let Some(result_tx) = pending.remove(&request_id) {
                    let result = match (result, error) {
                        (Some(result), None) => Ok(result),
                        (_, Some(error)) => Err(BridgeError::CommandRejected {
                            code: error.code,
                            message: error.message,
                        }),
                        _ => Err(BridgeError::InvalidData(
                            "payload response has neither result nor error".to_owned(),
                        )),
                    };
                    let _ = result_tx.send(result);
                }
            }
            Ok(PayloadMessage::Hello { .. }) => break,
            Err(_) => break,
        }
    }

    for (_, result_tx) in pending {
        let _ = result_tx.send(Err(BridgeError::ConnectionClosed));
    }
    let _ = event_tx.send(SessionEvent::Disconnected);
    close_pipe(handle);
}

fn read_payload_message(handle: HANDLE) -> BridgeResult<PayloadMessage> {
    let frame = read_frame(handle)?;
    Ok(serde_json::from_slice(&frame)?)
}

fn write_host_message(handle: HANDLE, message: &HostMessage) -> BridgeResult<()> {
    let mut frame = serde_json::to_vec(message)?;
    let result = write_frame(handle, &frame);
    frame.zeroize();
    result
}

fn read_frame(handle: HANDLE) -> BridgeResult<Vec<u8>> {
    let mut length_bytes = [0u8; 4];
    read_exact(handle, &mut length_bytes)?;
    let length = u32::from_le_bytes(length_bytes) as usize;
    if length == 0 || length > MAX_FRAME_SIZE {
        return Err(BridgeError::InvalidData(format!(
            "invalid IPC frame size: {length}"
        )));
    }
    let mut frame = vec![0; length];
    read_exact(handle, &mut frame)?;
    Ok(frame)
}

fn write_frame(handle: HANDLE, frame: &[u8]) -> BridgeResult<()> {
    if frame.is_empty() || frame.len() > MAX_FRAME_SIZE {
        return Err(BridgeError::InvalidData(
            "invalid IPC frame size".to_owned(),
        ));
    }
    write_all(handle, &(frame.len() as u32).to_le_bytes())?;
    write_all(handle, frame)
}

fn read_exact(handle: HANDLE, target: &mut [u8]) -> BridgeResult<()> {
    let mut offset = 0;
    while offset < target.len() {
        let mut read = 0;
        let success = unsafe {
            ReadFile(
                handle,
                target[offset..].as_mut_ptr(),
                (target.len() - offset) as u32,
                &mut read,
                std::ptr::null_mut(),
            )
        };
        if success == 0 || read == 0 {
            return Err(last_windows_error("ReadFile(pipe)"));
        }
        offset += read as usize;
    }
    Ok(())
}

fn write_all(handle: HANDLE, source: &[u8]) -> BridgeResult<()> {
    let mut offset = 0;
    while offset < source.len() {
        let mut written = 0;
        let success = unsafe {
            WriteFile(
                handle,
                source[offset..].as_ptr(),
                (source.len() - offset) as u32,
                &mut written,
                std::ptr::null_mut(),
            )
        };
        if success == 0 || written == 0 {
            return Err(last_windows_error("WriteFile(pipe)"));
        }
        offset += written as usize;
    }
    Ok(())
}

fn close_pipe(handle: HANDLE) {
    unsafe {
        DisconnectNamedPipe(handle);
        CloseHandle(handle);
    }
}
