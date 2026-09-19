//! Debug-only, process-scoped capture for IPC, HTTP, and game bridge operations.

use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use base64::Engine;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, Manager};
use zeroize::Zeroizing;

const ENTRY_EVENT: &str = "debug-log://entry";
const FAILURE_EVENT: &str = "debug-log://failure";
const MAX_PAGE_SIZE: usize = 200;
const NONCE_BYTES: usize = 12;
static STORE: OnceLock<SessionStore> = OnceLock::new();

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogSummary {
  id: u64,
  timestamp_ms: u128,
  fingerprint: String,
  kind: String,
  source: String,
  name: String,
  outcome: String,
  duration_ms: Option<f64>,
  method: Option<String>,
  url: Option<String>,
  status_code: Option<u16>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogInput {
  pub kind: String,
  pub source: String,
  pub name: String,
  pub outcome: String,
  pub duration_ms: Option<f64>,
  pub request: Option<Value>,
  pub response: Option<Value>,
  pub error: Option<Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LogEntry<'a> {
  #[serde(flatten)]
  summary: &'a LogSummary,
  request: &'a Option<Value>,
  response: &'a Option<Value>,
  error: &'a Option<Value>,
}

struct IndexedEntry {
  summary: LogSummary,
  offset: u64,
  length: usize,
}

struct StoreInner {
  file: Option<File>,
  entries: Vec<IndexedEntry>,
  next_id: u64,
  key: Zeroizing<[u8; 32]>,
}

struct SessionStore<R: tauri::Runtime = tauri::Wry> {
  app: AppHandle<R>,
  directory: PathBuf,
  inner: Mutex<StoreInner>,
  failures: AtomicU64,
}

/// Starts a fresh capture before the WebView is created, discarding crash leftovers.
pub fn initialize(app: &AppHandle) -> Result<(), String> {
  let directory = app
    .path()
    .app_cache_dir()
    .map_err(|error| error.to_string())?
    .join("debug-session-log");
  if directory.exists() {
    fs::remove_dir_all(&directory).map_err(|error| error.to_string())?;
  }
  fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
  #[cfg(unix)]
  {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(&directory, fs::Permissions::from_mode(0o700))
      .map_err(|error| error.to_string())?;
  }
  let mut options = OpenOptions::new();
  options.create_new(true).read(true).write(true);
  #[cfg(unix)]
  {
    use std::os::unix::fs::OpenOptionsExt;
    options.mode(0o600);
  }
  let file = options
    .open(directory.join("session.bin"))
    .map_err(|error| error.to_string())?;
  STORE
    .set(SessionStore {
      app: app.clone(),
      directory,
      inner: Mutex::new(StoreInner {
        file: Some(file),
        entries: Vec::new(),
        next_id: 1,
        key: new_key(),
      }),
      failures: AtomicU64::new(0),
    })
    .map_err(|_| "Debug logging is already initialized.".to_owned())
}

/// Native producers use the same capture path as the frontend command.
pub fn record_native(input: LogInput) {
  if let Some(store) = STORE.get() {
    if store.record(input).is_err() {
      store.note_failure();
    }
  }
}

fn store() -> Result<&'static SessionStore, String> {
  STORE
    .get()
    .ok_or_else(|| "Debug logging is unavailable.".to_owned())
}

fn new_key() -> Zeroizing<[u8; 32]> {
  let mut key = Zeroizing::new([0; 32]);
  OsRng.fill_bytes(&mut key[..]);
  key
}

fn encrypt_entry(plaintext: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
  let cipher = Aes256Gcm::new_from_slice(key)
    .map_err(|_| "Unable to initialize debug log encryption.".to_owned())?;
  let mut nonce = [0; NONCE_BYTES];
  OsRng.fill_bytes(&mut nonce);
  let ciphertext = cipher
    .encrypt(Nonce::from_slice(&nonce), plaintext)
    .map_err(|_| "Unable to encrypt the debug log entry.".to_owned())?;
  let mut bytes = Vec::with_capacity(NONCE_BYTES + ciphertext.len());
  bytes.extend_from_slice(&nonce);
  bytes.extend_from_slice(&ciphertext);
  Ok(bytes)
}

fn read_entry(
  file: &mut File,
  key: &[u8; 32],
  offset: u64,
  length: usize,
) -> Result<Vec<u8>, String> {
  if length < NONCE_BYTES {
    return Err("The debug log entry is incomplete.".to_owned());
  }
  let mut bytes = vec![0; length];
  file
    .seek(SeekFrom::Start(offset))
    .map_err(|error| error.to_string())?;
  file
    .read_exact(&mut bytes)
    .map_err(|error| error.to_string())?;
  let (nonce, ciphertext) = bytes.split_at(NONCE_BYTES);
  Aes256Gcm::new_from_slice(key)
    .map_err(|_| "Unable to initialize debug log decryption.".to_owned())?
    .decrypt(Nonce::from_slice(nonce), ciphertext)
    .map_err(|_| "Unable to decrypt the debug log entry.".to_owned())
}

fn operation_fingerprint(input: &LogInput) -> Result<String, String> {
  let bytes = serde_json::to_vec(&serde_json::json!({
    "kind": &input.kind,
    "source": &input.source,
    "name": &input.name,
    "outcome": &input.outcome,
    "request": &input.request,
    "response": &input.response,
    "error": &input.error,
  }))
  .map_err(|error| error.to_string())?;
  Ok(format!("{:x}", Sha256::digest(bytes)))
}

impl<R: tauri::Runtime> SessionStore<R> {
  fn note_failure(&self) {
    let failures = self.failures.fetch_add(1, Ordering::Relaxed) + 1;
    let _ = self.app.emit(FAILURE_EVENT, failures);
  }

  fn record(&self, input: LogInput) -> Result<(), String> {
    let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
    let id = inner.next_id;
    let fingerprint = operation_fingerprint(&input)?;
    let summary = LogSummary {
      id,
      timestamp_ms: SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis(),
      fingerprint,
      method: input
        .request
        .as_ref()
        .and_then(|request| request.get("method"))
        .and_then(Value::as_str)
        .map(str::to_owned),
      url: input
        .request
        .as_ref()
        .and_then(|request| request.get("url"))
        .and_then(Value::as_str)
        .map(str::to_owned),
      status_code: input
        .response
        .as_ref()
        .and_then(|response| response.get("status"))
        .and_then(Value::as_u64)
        .and_then(|status| u16::try_from(status).ok()),
      kind: input.kind,
      source: input.source,
      name: input.name,
      outcome: input.outcome,
      duration_ms: input.duration_ms,
    };
    let plaintext = serde_json::to_vec(&LogEntry {
      summary: &summary,
      request: &input.request,
      response: &input.response,
      error: &input.error,
    })
    .map_err(|error| error.to_string())?;
    let bytes = encrypt_entry(&plaintext, &inner.key)?;
    let file = inner
      .file
      .as_mut()
      .ok_or_else(|| "Debug logging has stopped.".to_owned())?;
    let offset = file
      .seek(SeekFrom::End(0))
      .map_err(|error| error.to_string())?;
    file.write_all(&bytes).map_err(|error| error.to_string())?;
    inner.next_id += 1;
    inner.entries.push(IndexedEntry {
      summary: summary.clone(),
      offset,
      length: bytes.len(),
    });
    drop(inner);
    let _ = self.app.emit(ENTRY_EVENT, summary);
    Ok(())
  }

  fn get(&self, id: u64) -> Result<Value, String> {
    let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
    let entry = inner
      .entries
      .iter()
      .find(|entry| entry.summary.id == id)
      .ok_or_else(|| "Log entry was not found.".to_owned())?;
    let (offset, length) = (entry.offset, entry.length);
    let StoreInner { file, key, .. } = &mut *inner;
    let file = file
      .as_mut()
      .ok_or_else(|| "Debug logging has stopped.".to_owned())?;
    let bytes = read_entry(file, key, offset, length)?;
    serde_json::from_slice(&bytes).map_err(|error| error.to_string())
  }

  fn clear(&self) -> Result<(), String> {
    let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
    let file = inner
      .file
      .as_mut()
      .ok_or_else(|| "Debug logging has stopped.".to_owned())?;
    file.set_len(0).map_err(|error| error.to_string())?;
    file
      .seek(SeekFrom::Start(0))
      .map_err(|error| error.to_string())?;
    inner.entries.clear();
    inner.key = new_key();
    self.failures.store(0, Ordering::Relaxed);
    drop(inner);
    let _ = self.app.emit(FAILURE_EVENT, 0_u64);
    Ok(())
  }

  fn export_to(&self, destination: &Path) -> Result<(), String> {
    let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
    let positions = inner
      .entries
      .iter()
      .map(|entry| (entry.offset, entry.length))
      .collect::<Vec<_>>();
    let StoreInner { file, key, .. } = &mut *inner;
    let file = file
      .as_mut()
      .ok_or_else(|| "Debug logging has stopped.".to_owned())?;
    file.flush().map_err(|error| error.to_string())?;
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
      use std::os::unix::fs::OpenOptionsExt;
      options.mode(0o600);
    }
    let mut exported = options
      .open(destination)
      .map_err(|error| error.to_string())?;
    let result = (|| -> Result<(), String> {
      for (offset, length) in positions {
        let plaintext = read_entry(file, key, offset, length)?;
        exported
          .write_all(&plaintext)
          .and_then(|_| exported.write_all(b"\n"))
          .map_err(|error| error.to_string())?;
      }
      exported.flush().map_err(|error| error.to_string())
    })();
    drop(exported);
    if let Err(error) = result {
      let _ = fs::remove_file(destination);
      return Err(error);
    }
    Ok(())
  }
}

#[tauri::command]
pub fn debug_log_record(entry: LogInput) -> Result<(), String> {
  let store = store()?;
  let result = store.record(entry);
  if result.is_err() {
    store.note_failure();
  }
  result
}

#[tauri::command]
pub fn debug_log_failure_count() -> Result<u64, String> {
  Ok(store()?.failures.load(Ordering::Relaxed))
}

#[tauri::command]
pub fn debug_log_list(
  before_id: Option<u64>,
  limit: Option<usize>,
  search: Option<String>,
  kind: Option<String>,
) -> Result<Vec<LogSummary>, String> {
  let inner = store()?.inner.lock().map_err(|error| error.to_string())?;
  let search = search.unwrap_or_default().to_lowercase();
  Ok(
    inner
      .entries
      .iter()
      .rev()
      .filter(|entry| before_id.is_none_or(|id| entry.summary.id < id))
      .filter(|entry| kind.as_ref().is_none_or(|kind| entry.summary.kind == *kind))
      .filter(|entry| {
        search.is_empty()
          || entry.summary.name.to_lowercase().contains(&search)
          || entry
            .summary
            .url
            .as_ref()
            .is_some_and(|url| url.to_lowercase().contains(&search))
      })
      .take(limit.unwrap_or(100).clamp(1, MAX_PAGE_SIZE))
      .map(|entry| entry.summary.clone())
      .collect(),
  )
}

#[tauri::command]
pub fn debug_log_get(id: u64) -> Result<Value, String> {
  store()?.get(id)
}

#[tauri::command]
pub fn debug_log_clear() -> Result<(), String> {
  clear_session()
}

/// The existing clear-all-data action uses this without an IPC round trip.
pub fn clear_session() -> Result<(), String> {
  store()?.clear()
}

#[tauri::command]
pub fn debug_log_export(app: AppHandle) -> Result<String, String> {
  let store = store()?;
  let timestamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|error| error.to_string())?
    .as_millis();
  let destination = app
    .path()
    .download_dir()
    .map_err(|error| error.to_string())?
    .join(format!("open-rising-stones-debug-{timestamp}.jsonl"));
  store.export_to(&destination)?;
  Ok(destination.to_string_lossy().into_owned())
}

fn save_attachment_to(directory: &Path, data: &str, content_type: &str) -> Result<PathBuf, String> {
  let bytes = base64::engine::general_purpose::STANDARD
    .decode(data)
    .map_err(|_| "The debug attachment is not valid base64.".to_owned())?;
  let extension = match content_type.split(';').next().unwrap_or("").trim() {
    "image/png" => "png",
    "image/jpeg" => "jpg",
    "image/webp" => "webp",
    "image/gif" => "gif",
    "image/avif" => "avif",
    "application/json" => "json",
    "application/pdf" => "pdf",
    "text/plain" => "txt",
    _ => "bin",
  };
  let timestamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|error| error.to_string())?
    .as_nanos();
  let path = directory.join(format!(
    "open-rising-stones-debug-attachment-{}-{timestamp}.{extension}",
    std::process::id()
  ));
  let mut options = OpenOptions::new();
  options.write(true).create_new(true);
  #[cfg(unix)]
  {
    use std::os::unix::fs::OpenOptionsExt;
    options.mode(0o600);
  }
  let mut file = options.open(&path).map_err(|error| error.to_string())?;
  let result = file.write_all(&bytes);
  drop(file);
  if let Err(error) = result {
    let _ = fs::remove_file(&path);
    return Err(error.to_string());
  }
  Ok(path)
}

#[tauri::command]
pub fn debug_log_save_attachment(
  app: AppHandle,
  data: String,
  content_type: String,
) -> Result<String, String> {
  let directory = app
    .path()
    .download_dir()
    .map_err(|error| error.to_string())?;
  save_attachment_to(&directory, &data, &content_type)
    .map(|path| path.to_string_lossy().into_owned())
}

/// Removes the process-scoped file after closing its writer on normal exit.
pub fn shutdown() {
  if let Some(store) = STORE.get() {
    if let Ok(mut inner) = store.inner.lock() {
      inner.file.take();
      inner.key.fill(0);
      let _ = fs::remove_dir_all(&store.directory);
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn session_store_round_trips_raw_values_and_clears_them() {
    let app = tauri::test::mock_builder()
      .build(tauri::test::mock_context(tauri::test::noop_assets()))
      .unwrap();
    let directory = std::env::temp_dir().join(format!(
      "ors-diagnostic-test-{}-{}",
      std::process::id(),
      SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos()
    ));
    fs::create_dir(&directory).unwrap();
    let file = OpenOptions::new()
      .create_new(true)
      .read(true)
      .write(true)
      .open(directory.join("session.bin"))
      .unwrap();
    let store = SessionStore {
      app: app.handle().clone(),
      directory: directory.clone(),
      inner: Mutex::new(StoreInner {
        file: Some(file),
        entries: Vec::new(),
        next_id: 1,
        key: new_key(),
      }),
      failures: AtomicU64::new(0),
    };
    store
      .record(LogInput {
        kind: "invoke".to_owned(),
        source: "webview".to_owned(),
        name: "example_command".to_owned(),
        outcome: "success".to_owned(),
        duration_ms: Some(4.0),
        request: Some(serde_json::json!({ "token": "debug-only-value" })),
        response: Some(serde_json::json!({ "count": 2 })),
        error: None,
      })
      .unwrap();
    let entry = store.get(1).unwrap();
    assert_eq!(entry["request"]["token"], "debug-only-value");
    assert_eq!(entry["response"]["count"], 2);
    let export_path = directory.join("export.jsonl");
    store.export_to(&export_path).unwrap();
    let exported: Value =
      serde_json::from_str(fs::read_to_string(export_path).unwrap().trim()).unwrap();
    assert_eq!(exported["request"]["token"], "debug-only-value");
    let encrypted = fs::read(directory.join("session.bin")).unwrap();
    assert!(!encrypted
      .windows(b"debug-only-value".len())
      .any(|window| window == b"debug-only-value"));
    store.clear().unwrap();
    assert!(store.get(1).is_err());
    assert_eq!(
      fs::metadata(directory.join("session.bin")).unwrap().len(),
      0
    );
    let attachment = save_attachment_to(&directory, "aGVsbG8=", "text/plain").unwrap();
    assert_eq!(fs::read(attachment).unwrap(), b"hello");
    drop(store);
    fs::remove_dir_all(directory).unwrap();
  }
}
