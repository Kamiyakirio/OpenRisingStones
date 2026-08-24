//! Shared process boundary for the Python API client.
//!
//! Standard builds use a system interpreter, while packaged releases enable the
//! bundled PyInstaller sidecar feature. Requests and responses stay on anonymous
//! pipes. This module owns UTF-8 configuration, cleanup, timeouts, and output limits
//! so every caller gets the same cross-platform and security behavior.

use std::{
  io::{self, Read, Write},
  process::{Child, Command, ExitStatus, Stdio},
  sync::mpsc,
  thread,
  time::{Duration, Instant},
};

use serde::{de::DeserializeOwned, Serialize};

#[cfg(not(feature = "bundled-python-sidecar"))]
const CLIENT_SCRIPT: &str = include_str!("../python/api_client.py");
#[cfg(feature = "bundled-python-sidecar")]
const BUNDLED_CLIENT_NAME: &str = "rising-stones-api-client";
const MAX_ERROR_BYTES: usize = 8 * 1024;
const MAX_DEBUG_STDERR_BYTES: usize = 16 * 1024 * 1024;
const MAX_ERROR_CHARACTERS: usize = 240;
#[cfg(debug_assertions)]
const NETWORK_CONSOLE_ENV: &str = "OPEN_RISING_STONES_NETWORK_CONSOLE";
const NETWORK_CONSOLE_PREFIX: &str = "ORS_NETWORK_CONSOLE ";
const PROCESS_TIMEOUT: Duration = Duration::from_secs(180);
const PROCESS_POLL_INTERVAL: Duration = Duration::from_millis(10);

#[cfg(not(feature = "bundled-python-sidecar"))]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct PythonInterpreter {
  program: &'static str,
  launcher_arguments: &'static [&'static str],
}

#[cfg(all(not(feature = "bundled-python-sidecar"), windows))]
const PYTHON_INTERPRETERS: &[PythonInterpreter] = &[
  PythonInterpreter {
    program: "py",
    launcher_arguments: &["-3"],
  },
  PythonInterpreter {
    program: "python",
    launcher_arguments: &[],
  },
  PythonInterpreter {
    program: "python3",
    launcher_arguments: &[],
  },
];

#[cfg(all(not(feature = "bundled-python-sidecar"), not(windows)))]
const PYTHON_INTERPRETERS: &[PythonInterpreter] = &[
  PythonInterpreter {
    program: "python3",
    launcher_arguments: &[],
  },
  PythonInterpreter {
    program: "python",
    launcher_arguments: &[],
  },
];

#[derive(Debug)]
enum ProcessError {
  ClientNotFound,
  ResponseTooLarge,
  Message(String),
}

#[derive(Debug)]
struct BoundedOutput {
  bytes: Vec<u8>,
  exceeded_limit: bool,
}

enum CapturedStream {
  Stdout(io::Result<BoundedOutput>),
  Stderr(io::Result<BoundedOutput>),
}

/// Serialize a request, run the embedded client, and deserialize its bounded response.
pub(crate) fn request<Request, Response>(
  request: &Request,
  max_response_bytes: usize,
  request_label: &str,
) -> Result<Response, String>
where
  Request: Serialize,
  Response: DeserializeOwned,
{
  let input = serde_json::to_vec(request)
    .map_err(|_| format!("Unable to serialize the {request_label} request."))?;
  let output = execute(&input, max_response_bytes).map_err(|error| match error {
    ProcessError::ResponseTooLarge => {
      format!("The {request_label} response exceeded the size limit.")
    }
    ProcessError::ClientNotFound => unavailable_client_message(),
    ProcessError::Message(message) => message,
  })?;
  serde_json::from_slice(&output)
    .map_err(|_| format!("Unable to parse the {request_label} response."))
}

#[cfg(not(feature = "bundled-python-sidecar"))]
fn unavailable_client_message() -> String {
  "Python 3 was not found. Install Python 3 and the required packages before retrying.".to_owned()
}

#[cfg(feature = "bundled-python-sidecar")]
fn unavailable_client_message() -> String {
  "The bundled Python client is missing. Reinstall the application and retry.".to_owned()
}

#[cfg(not(feature = "bundled-python-sidecar"))]
fn execute(input: &[u8], max_response_bytes: usize) -> Result<Vec<u8>, ProcessError> {
  for interpreter in PYTHON_INTERPRETERS {
    match execute_with_interpreter(interpreter, input, max_response_bytes) {
      Err(ProcessError::ClientNotFound) => continue,
      result => return result,
    }
  }
  Err(ProcessError::ClientNotFound)
}

#[cfg(feature = "bundled-python-sidecar")]
fn execute(input: &[u8], max_response_bytes: usize) -> Result<Vec<u8>, ProcessError> {
  let current_executable = std::env::current_exe().map_err(|_| ProcessError::ClientNotFound)?;
  let executable_directory = current_executable
    .parent()
    .ok_or(ProcessError::ClientNotFound)?;
  let mut client_path = executable_directory.join(BUNDLED_CLIENT_NAME);
  if cfg!(windows) {
    client_path.set_extension("exe");
  }
  execute_with_command(Command::new(client_path), input, max_response_bytes)
}

#[cfg(not(feature = "bundled-python-sidecar"))]
fn execute_with_interpreter(
  interpreter: &PythonInterpreter,
  input: &[u8],
  max_response_bytes: usize,
) -> Result<Vec<u8>, ProcessError> {
  let mut command = Command::new(interpreter.program);
  command
    .args(interpreter.launcher_arguments)
    .args(["-c", CLIENT_SCRIPT]);
  execute_with_command(command, input, max_response_bytes)
}

fn execute_with_command(
  mut command: Command,
  input: &[u8],
  max_response_bytes: usize,
) -> Result<Vec<u8>, ProcessError> {
  command
    .env("PYTHONUTF8", "1")
    .env("PYTHONIOENCODING", "utf-8")
    .env("PYTHONUNBUFFERED", "1")
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());

  #[cfg(debug_assertions)]
  command.env(NETWORK_CONSOLE_ENV, "1");

  #[cfg(windows)]
  {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
  }

  let mut child = command.spawn().map_err(|error| {
    if error.kind() == io::ErrorKind::NotFound {
      ProcessError::ClientNotFound
    } else {
      ProcessError::Message("Unable to start the Python client.".to_owned())
    }
  })?;

  let mut stdin = take_pipe(child.stdin.take(), &mut child, "open stdin for")?;
  let stdout = take_pipe(child.stdout.take(), &mut child, "open stdout for")?;
  let stderr = take_pipe(child.stderr.take(), &mut child, "open stderr for")?;

  let (sender, receiver) = mpsc::channel();
  let stdout_sender = sender.clone();
  // Read both pipes concurrently so a noisy child cannot block while Rust waits for it.
  // Stdout stops at the protocol limit; stderr is drained but only retains a safe prefix.
  let stdout_thread = thread::spawn(move || {
    let _ = stdout_sender.send(CapturedStream::Stdout(read_bounded(
      stdout,
      max_response_bytes,
    )));
  });
  let stderr_thread = thread::spawn(move || {
    let _ = sender.send(CapturedStream::Stderr(read_truncated(
      stderr,
      if cfg!(debug_assertions) {
        MAX_DEBUG_STDERR_BYTES
      } else {
        MAX_ERROR_BYTES
      },
    )));
  });

  if stdin.write_all(input).is_err() {
    drop(stdin);
    terminate(&mut child);
    drop(receiver);
    let _ = stdout_thread.join();
    let _ = stderr_thread.join();
    return Err(ProcessError::Message(
      "Unable to write to the Python client.".to_owned(),
    ));
  }
  drop(stdin);

  let started_at = Instant::now();
  let mut stdout_capture = None;
  let mut stderr_capture = None;
  let status = loop {
    drain_captures(&receiver, &mut stdout_capture, &mut stderr_capture);
    if capture_exceeded_limit(&stdout_capture) {
      terminate(&mut child);
      break Err(ProcessError::ResponseTooLarge);
    }

    match child.try_wait() {
      Ok(Some(status)) => break Ok(status),
      Ok(None) => {}
      Err(_) => {
        terminate(&mut child);
        break Err(ProcessError::Message(
          "Unable to wait for the Python client.".to_owned(),
        ));
      }
    }
    if started_at.elapsed() >= PROCESS_TIMEOUT {
      terminate(&mut child);
      break Err(ProcessError::Message(
        "The Python client timed out.".to_owned(),
      ));
    }
    thread::sleep(PROCESS_POLL_INTERVAL);
  };

  let stdout_joined = stdout_thread.join().is_ok();
  let stderr_joined = stderr_thread.join().is_ok();
  drain_captures(&receiver, &mut stdout_capture, &mut stderr_capture);

  let status = status?;
  if !stdout_joined || !stderr_joined {
    return Err(ProcessError::Message(
      "Unable to read the Python client output.".to_owned(),
    ));
  }
  let stdout = capture_result(stdout_capture, "response")?;
  let stderr = capture_result(stderr_capture, "error output")?;
  if stdout.exceeded_limit {
    return Err(ProcessError::ResponseTooLarge);
  }
  let error_output = forward_network_console(&stderr.bytes);
  validate_status(status, &error_output)?;
  Ok(stdout.bytes)
}

fn take_pipe<T>(pipe: Option<T>, child: &mut Child, description: &str) -> Result<T, ProcessError> {
  pipe.ok_or_else(|| {
    terminate(child);
    ProcessError::Message(format!("Unable to {description} the Python client."))
  })
}

fn read_bounded(reader: impl Read, limit: usize) -> io::Result<BoundedOutput> {
  let read_limit = (limit as u64).saturating_add(1);
  let mut bytes = Vec::with_capacity(limit.min(8 * 1024));
  reader.take(read_limit).read_to_end(&mut bytes)?;
  let exceeded_limit = bytes.len() > limit;
  if exceeded_limit {
    bytes.truncate(limit);
  }
  Ok(BoundedOutput {
    bytes,
    exceeded_limit,
  })
}

fn read_truncated(mut reader: impl Read, limit: usize) -> io::Result<BoundedOutput> {
  let mut bytes = Vec::with_capacity(limit.min(8 * 1024));
  let mut buffer = [0; 8 * 1024];
  let mut exceeded_limit = false;
  loop {
    let count = reader.read(&mut buffer)?;
    if count == 0 {
      break;
    }
    let retained = count.min(limit.saturating_sub(bytes.len()));
    bytes.extend_from_slice(&buffer[..retained]);
    exceeded_limit |= retained < count;
  }
  Ok(BoundedOutput {
    bytes,
    exceeded_limit,
  })
}

fn drain_captures(
  receiver: &mpsc::Receiver<CapturedStream>,
  stdout: &mut Option<io::Result<BoundedOutput>>,
  stderr: &mut Option<io::Result<BoundedOutput>>,
) {
  while let Ok(capture) = receiver.try_recv() {
    match capture {
      CapturedStream::Stdout(result) => *stdout = Some(result),
      CapturedStream::Stderr(result) => *stderr = Some(result),
    }
  }
}

fn capture_exceeded_limit(capture: &Option<io::Result<BoundedOutput>>) -> bool {
  matches!(capture, Some(Ok(output)) if output.exceeded_limit)
}

fn capture_result(
  capture: Option<io::Result<BoundedOutput>>,
  description: &str,
) -> Result<BoundedOutput, ProcessError> {
  capture
    .ok_or_else(|| {
      ProcessError::Message(format!("Unable to read the Python client {description}."))
    })?
    .map_err(|_| ProcessError::Message(format!("Unable to read the Python client {description}.")))
}

fn forward_network_console(stderr: &[u8]) -> Vec<u8> {
  let mut error_lines = Vec::new();
  let stderr = String::from_utf8_lossy(stderr);
  for line in stderr.lines() {
    let Some(payload) = line.strip_prefix(NETWORK_CONSOLE_PREFIX) else {
      if !line.trim().is_empty() {
        error_lines.push(line);
      }
      continue;
    };
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(payload) {
      log::info!(target: "network_console", "{value}");
    }
  }
  error_lines.join("\n").into_bytes()
}

fn validate_status(status: ExitStatus, stderr: &[u8]) -> Result<(), ProcessError> {
  if status.success() {
    return Ok(());
  }
  let detail = String::from_utf8_lossy(stderr);
  let detail = detail
    .trim()
    .chars()
    .take(MAX_ERROR_CHARACTERS)
    .collect::<String>();
  Err(ProcessError::Message(if detail.is_empty() {
    "The Python client request failed.".to_owned()
  } else {
    detail
  }))
}

fn terminate(child: &mut Child) {
  let _ = child.kill();
  let _ = child.wait();
}

#[cfg(test)]
mod tests {
  use std::io::Cursor;

  use super::*;

  #[test]
  fn bounded_reader_accepts_the_exact_limit() {
    let output = read_bounded(Cursor::new(b"1234"), 4).unwrap();

    assert_eq!(output.bytes, b"1234");
    assert!(!output.exceeded_limit);
  }

  #[test]
  fn bounded_reader_detects_and_truncates_oversized_output() {
    let output = read_bounded(Cursor::new(b"12345"), 4).unwrap();

    assert_eq!(output.bytes, b"1234");
    assert!(output.exceeded_limit);
  }

  #[test]
  fn truncated_reader_drains_but_only_retains_the_limit() {
    let output = read_truncated(Cursor::new(b"12345678"), 4).unwrap();

    assert_eq!(output.bytes, b"1234");
    assert!(output.exceeded_limit);
  }

  #[test]
  fn network_console_records_do_not_leak_into_user_facing_errors() {
    let stderr = b"ORS_NETWORK_CONSOLE {\"phase\":\"request\",\"body\":\"secret\"}\nSafe error";

    let error_output = forward_network_console(stderr);

    assert_eq!(error_output, b"Safe error");
  }

  #[test]
  #[cfg(not(feature = "bundled-python-sidecar"))]
  fn interpreter_candidates_are_unique() {
    for (index, interpreter) in PYTHON_INTERPRETERS.iter().enumerate() {
      assert!(PYTHON_INTERPRETERS[index + 1..]
        .iter()
        .all(|candidate| candidate.program != interpreter.program));
    }
  }

  #[cfg(all(not(feature = "bundled-python-sidecar"), not(windows)))]
  #[test]
  fn unix_prefers_the_python_three_executable() {
    assert_eq!(PYTHON_INTERPRETERS[0].program, "python3");
  }

  #[cfg(all(not(feature = "bundled-python-sidecar"), windows))]
  #[test]
  fn windows_prefers_the_python_three_launcher() {
    assert_eq!(PYTHON_INTERPRETERS[0].program, "py");
    assert_eq!(PYTHON_INTERPRETERS[0].launcher_arguments, &["-3"]);
  }
}
