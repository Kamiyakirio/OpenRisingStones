//! Character-scoped Mentor roulette history and read-only legacy-site migration.

use chrono::{DateTime, FixedOffset, NaiveDateTime, TimeZone};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
  collections::HashSet,
  fs::{self, OpenOptions},
  io::Write,
  path::{Path, PathBuf},
  sync::Mutex,
  sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
  },
  thread::{self, JoinHandle},
  time::Duration,
  time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};
use zeroize::Zeroize;

use crate::{game_bridge::GameBridgeState, python_sidecar};
use game_bridge_host::{ActiveCharacterSnapshot, BridgeManager, BridgePhase, MentorDutySnapshot};

const MAX_STORE_BYTES: u64 = 12 * 1024 * 1024;
const MAX_RECORDS: usize = 20_000;
const MAX_LEGACY_RESPONSE_BYTES: usize = 6 * 1024 * 1024;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MentorResult {
  Completed,
  Exited,
  NeedsReview,
  LegacyUnknown,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MentorSource {
  Game,
  Manual,
  LegacySite,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MentorRecord {
  id: String,
  character_id: String,
  character_name: String,
  duty_id: Option<u32>,
  duty_name: String,
  job_id: Option<u8>,
  job_name: Option<String>,
  started_at_ms: i64,
  ended_at_ms: Option<i64>,
  result: MentorResult,
  source: MentorSource,
  note: String,
  legacy_key: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct MentorStore {
  #[serde(default = "store_version")]
  schema_version: u32,
  #[serde(default)]
  records: Vec<MentorRecord>,
  #[serde(default)]
  monitor_enabled: bool,
}

impl Default for MentorStore {
  fn default() -> Self {
    Self {
      schema_version: 1,
      records: Vec::new(),
      monitor_enabled: false,
    }
  }
}

fn store_version() -> u32 {
  1
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManualRecordRequest {
  character_id: String,
  character_name: String,
  duty_name: String,
  job_id: Option<u8>,
  job_name: Option<String>,
  started_at_ms: i64,
  result: MentorResult,
  note: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordCorrection {
  id: String,
  result: MentorResult,
  note: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyResponse {
  username: String,
  total_count: usize,
  records: Vec<LegacyRow>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyRow {
  id: Value,
  created_at: Value,
  duty_id: Value,
  duty_name: Value,
  job_key: Value,
  job_name: Value,
  note: Value,
}

struct PendingPreview {
  token: String,
  records: Vec<MentorRecord>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyPreview {
  token: String,
  fetched_count: usize,
  valid_count: usize,
  invalid_count: usize,
  duplicate_count: usize,
  earliest_at_ms: Option<i64>,
  latest_at_ms: Option<i64>,
  examples: Vec<MentorRecord>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyImportResult {
  imported_count: usize,
  skipped_count: usize,
}

pub struct MentorState {
  path: PathBuf,
  io_lock: Mutex<()>,
  preview: Mutex<Option<PendingPreview>>,
  monitor: Mutex<Option<JoinHandle<()>>>,
  monitor_stop: Arc<AtomicBool>,
  monitor_status: Mutex<MonitorStatus>,
  supervisor: Mutex<Option<JoinHandle<()>>>,
  supervisor_stop: Arc<AtomicBool>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorStatus {
  running: bool,
  phase: String,
  active_record_id: Option<String>,
  duty_id: Option<u32>,
  error: Option<String>,
}

impl Default for MonitorStatus {
  fn default() -> Self {
    Self {
      running: false,
      phase: "idle".into(),
      active_record_id: None,
      duty_id: None,
      error: None,
    }
  }
}

impl MentorState {
  pub fn new(path: PathBuf) -> Self {
    Self {
      path,
      io_lock: Mutex::new(()),
      preview: Mutex::new(None),
      monitor: Mutex::new(None),
      monitor_stop: Arc::new(AtomicBool::new(false)),
      monitor_status: Mutex::new(MonitorStatus::default()),
      supervisor: Mutex::new(None),
      supervisor_stop: Arc::new(AtomicBool::new(false)),
    }
  }

  fn read(&self) -> Result<MentorStore, String> {
    read_store(&self.path)
  }

  fn write(&self, store: &MentorStore) -> Result<(), String> {
    write_store(&self.path, store)
  }

  fn monitor_enabled(&self) -> Result<bool, String> {
    let _guard = self
      .io_lock
      .lock()
      .map_err(|_| "Mentor storage is unavailable.")?;
    Ok(self.read()?.monitor_enabled)
  }

  fn set_monitor_enabled(&self, enabled: bool) -> Result<(), String> {
    let _guard = self
      .io_lock
      .lock()
      .map_err(|_| "Mentor storage is unavailable.")?;
    let mut store = self.read()?;
    store.monitor_enabled = enabled;
    self.write(&store)
  }
}

#[tauri::command]
pub fn mentor_monitor_status(state: State<'_, MentorState>) -> Result<MonitorStatus, String> {
  state
    .monitor_status
    .lock()
    .map(|status| status.clone())
    .map_err(|_| "Mentor monitoring is unavailable.".into())
}

/// Start a desktop-owned worker so changing or closing the page does not interrupt tracking.
#[tauri::command]
pub fn mentor_start_monitor(
  app: AppHandle,
  state: State<'_, MentorState>,
  bridge: State<'_, GameBridgeState>,
) -> Result<MonitorStatus, String> {
  let manager = bridge.manager();
  let bridge_status = manager.status();
  if !matches!(bridge_status.phase, BridgePhase::Ready)
    || !bridge_status
      .capabilities
      .iter()
      .any(|capability| capability == "mentor_duty_read")
  {
    return Err("The connected game version cannot read Mentor duty state.".into());
  }
  state.set_monitor_enabled(true)?;
  match start_monitor_worker(app, &state, manager) {
    Ok(status) => Ok(status),
    Err(error) => {
      let _ = state.set_monitor_enabled(false);
      Err(error)
    }
  }
}

fn start_monitor_worker(
  app: AppHandle,
  state: &MentorState,
  manager: Arc<BridgeManager>,
) -> Result<MonitorStatus, String> {
  let mut worker = state
    .monitor
    .lock()
    .map_err(|_| "Mentor monitoring is unavailable.")?;
  if worker.as_ref().is_some_and(|handle| !handle.is_finished()) {
    return state
      .monitor_status
      .lock()
      .map(|status| status.clone())
      .map_err(|_| "Mentor monitoring is unavailable.".into());
  }
  if let Some(handle) = worker.take() {
    let _ = handle.join();
  }
  state.monitor_stop.store(false, Ordering::Release);
  let stop = Arc::clone(&state.monitor_stop);
  let handle = thread::Builder::new()
    .name("mentor-duty-monitor".into())
    .spawn(move || monitor_loop(app, manager, stop))
    .map_err(|_| "Unable to start Mentor monitoring.")?;
  *worker = Some(handle);
  let mut status = state
    .monitor_status
    .lock()
    .map_err(|_| "Mentor monitoring is unavailable.")?;
  *status = MonitorStatus {
    running: true,
    phase: "waiting".into(),
    ..MonitorStatus::default()
  };
  Ok(status.clone())
}

#[tauri::command]
pub fn mentor_stop_monitor(
  app: AppHandle,
  state: State<'_, MentorState>,
) -> Result<MonitorStatus, String> {
  state.set_monitor_enabled(false)?;
  state.stop_worker();
  publish_status(&app, MonitorStatus::default());
  mentor_monitor_status(state)
}

impl MentorState {
  fn stop_worker(&self) {
    self.monitor_stop.store(true, Ordering::Release);
    if let Ok(mut worker) = self.monitor.lock() {
      if let Some(handle) = worker.take() {
        let _ = handle.join();
      }
    }
  }

  pub fn shutdown(&self) {
    self.supervisor_stop.store(true, Ordering::Release);
    if let Ok(mut supervisor) = self.supervisor.lock() {
      if let Some(handle) = supervisor.take() {
        let _ = handle.join();
      }
    }
    self.stop_worker();
  }

  /// Resume an explicitly enabled monitor and reconnect after a game restart.
  pub fn start_supervisor(app: AppHandle) -> Result<(), String> {
    let state = app.state::<MentorState>();
    let mut supervisor = state
      .supervisor
      .lock()
      .map_err(|_| "Mentor monitoring is unavailable.")?;
    if supervisor.is_some() {
      return Ok(());
    }
    let stop = Arc::clone(&state.supervisor_stop);
    let thread_app = app.clone();
    let handle = thread::Builder::new()
      .name("mentor-duty-supervisor".into())
      .spawn(move || {
        while !stop.load(Ordering::Acquire) {
          let app = &thread_app;
          let state = app.state::<MentorState>();
          if state.monitor_enabled().unwrap_or(false) {
            let running = state
              .monitor
              .lock()
              .ok()
              .and_then(|worker| worker.as_ref().map(|handle| !handle.is_finished()))
              .unwrap_or(false);
            if !running {
              if let Ok(bridge) = app.state::<GameBridgeState>().prepare_for_monitor() {
                if bridge
                  .capabilities
                  .iter()
                  .any(|capability| capability == "mentor_duty_read")
                  && state.monitor_enabled().unwrap_or(false)
                {
                  let manager = app.state::<GameBridgeState>().manager();
                  let _ = start_monitor_worker(app.clone(), &state, manager);
                }
              }
            }
          }
          for _ in 0..200 {
            if stop.load(Ordering::Acquire) {
              break;
            }
            thread::sleep(Duration::from_millis(100));
          }
        }
      })
      .map_err(|_| "Unable to start Mentor monitoring service.")?;
    *supervisor = Some(handle);
    Ok(())
  }
}

fn publish_status(app: &AppHandle, status: MonitorStatus) {
  if let Ok(mut current) = app.state::<MentorState>().monitor_status.lock() {
    *current = status.clone();
  }
  let _ = app.emit("mentor://status", status);
}

fn publish_records(app: &AppHandle) {
  let _ = app.emit("mentor://records", ());
}

fn append_game_record(
  app: &AppHandle,
  duty_id: u32,
  character: &ActiveCharacterSnapshot,
) -> Result<MentorRecord, String> {
  let state = app.state::<MentorState>();
  let _guard = state
    .io_lock
    .lock()
    .map_err(|_| "Mentor storage is unavailable.")?;
  let mut store = state.read()?;
  if store.records.len() >= MAX_RECORDS {
    return Err("The mentor record limit has been reached.".into());
  }
  let record = MentorRecord {
    id: random_id(),
    character_id: character.content_id.clone(),
    character_name: character.character_name.clone(),
    duty_id: Some(duty_id),
    duty_name: format!("Duty #{duty_id}"),
    job_id: Some(character.class_job_id),
    job_name: None,
    started_at_ms: now_ms(),
    ended_at_ms: None,
    result: MentorResult::NeedsReview,
    source: MentorSource::Game,
    note: String::new(),
    legacy_key: None,
  };
  store.records.push(record.clone());
  state.write(&store)?;
  publish_records(app);
  Ok(record)
}

fn unfinished_game_record(
  app: &AppHandle,
  duty_id: u32,
  character_id: &str,
) -> Result<Option<MentorRecord>, String> {
  let state = app.state::<MentorState>();
  let _guard = state
    .io_lock
    .lock()
    .map_err(|_| "Mentor storage is unavailable.")?;
  Ok(state.read()?.records.into_iter().rev().find(|record| {
    record.source == MentorSource::Game
      && record.ended_at_ms.is_none()
      && record.result == MentorResult::NeedsReview
      && record.duty_id == Some(duty_id)
      && record.character_id == character_id
  }))
}

fn finalize_game_record(app: &AppHandle, id: &str, result: MentorResult) -> Result<(), String> {
  let state = app.state::<MentorState>();
  let _guard = state
    .io_lock
    .lock()
    .map_err(|_| "Mentor storage is unavailable.")?;
  let mut store = state.read()?;
  let record = store
    .records
    .iter_mut()
    .find(|record| record.id == id)
    .ok_or("The active Mentor record was not found.")?;
  record.result = result;
  record.ended_at_ms = Some(now_ms());
  state.write(&store)?;
  publish_records(app);
  Ok(())
}

fn observed_mentor_queue(snapshot: &MentorDutySnapshot) -> bool {
  snapshot.queued_roulette_id == 9 && (1..=4).contains(&snapshot.queue_state)
}

fn can_begin_run(
  saw_queue: bool,
  settled_duty: Option<u32>,
  snapshot: &MentorDutySnapshot,
) -> bool {
  saw_queue
    && snapshot.queue_state == 5
    && snapshot.content_finder_condition_id > 0
    && settled_duty != Some(snapshot.content_finder_condition_id)
}

fn completion_matches(
  last_sequence: Option<u64>,
  duty_id: u32,
  snapshot: &MentorDutySnapshot,
) -> bool {
  last_sequence.is_some_and(|last| snapshot.completion_sequence > last)
    && snapshot.completion_content_finder_condition_id == duty_id
}

fn monitor_loop(app: AppHandle, manager: Arc<BridgeManager>, stop: Arc<AtomicBool>) {
  let mut saw_mentor_queue = false;
  let mut active: Option<(String, u32)> = None;
  let mut settled_duty: Option<u32> = None;
  let mut last_completion_sequence: Option<u64> = None;
  let mut absent_polls = 0;
  // A saved in-progress record survives a desktop restart; do not create a second run.
  if let (Ok(duty), Ok(character)) = (
    manager.capture_mentor_duty(),
    manager.capture_active_character(),
  ) {
    if duty.queue_state == 5 && duty.content_finder_condition_id > 0 {
      if let Ok(Some(record)) = unfinished_game_record(
        &app,
        duty.content_finder_condition_id,
        &character.content_id,
      ) {
        active = Some((record.id, duty.content_finder_condition_id));
      }
    }
    last_completion_sequence = Some(duty.completion_sequence);
  }
  while !stop.load(Ordering::Acquire) {
    if !matches!(manager.status().phase, BridgePhase::Ready) {
      publish_status(
        &app,
        MonitorStatus {
          running: false,
          phase: "disconnected".into(),
          active_record_id: active.as_ref().map(|value| value.0.clone()),
          duty_id: active.as_ref().map(|value| value.1),
          error: None,
        },
      );
      break;
    }
    match manager.capture_mentor_duty() {
      Ok(snapshot) => {
        let previous_completion_sequence = last_completion_sequence;
        last_completion_sequence = Some(snapshot.completion_sequence);
        if snapshot.content_finder_condition_id == 0 && snapshot.queue_state == 0 {
          settled_duty = None;
        }
        // Require an observed Mentor queue before entry; a cold start inside a
        // completed duty must not manufacture a second record.
        if observed_mentor_queue(&snapshot) {
          saw_mentor_queue = true;
        }
        if let Some((id, duty_id)) = active.as_ref() {
          if completion_matches(previous_completion_sequence, *duty_id, &snapshot) {
            if let Err(error) = finalize_game_record(&app, id, MentorResult::Completed) {
              publish_status(
                &app,
                MonitorStatus {
                  running: false,
                  phase: "error".into(),
                  active_record_id: Some(id.clone()),
                  duty_id: Some(*duty_id),
                  error: Some(error),
                },
              );
              break;
            }
            settled_duty = Some(*duty_id);
            active = None;
            saw_mentor_queue = false;
          } else if snapshot.content_finder_condition_id == 0 {
            absent_polls += 1;
            if absent_polls >= 3 {
              if let Err(error) = finalize_game_record(&app, id, MentorResult::Exited) {
                publish_status(
                  &app,
                  MonitorStatus {
                    running: false,
                    phase: "error".into(),
                    active_record_id: Some(id.clone()),
                    duty_id: Some(*duty_id),
                    error: Some(error),
                  },
                );
                break;
              }
              settled_duty = Some(*duty_id);
              active = None;
              saw_mentor_queue = false;
              absent_polls = 0;
            }
          } else {
            absent_polls = 0;
          }
        } else if can_begin_run(saw_mentor_queue, settled_duty, &snapshot) {
          if let Ok(character) = manager.capture_active_character() {
            match append_game_record(&app, snapshot.content_finder_condition_id, &character) {
              Ok(record) => active = Some((record.id, snapshot.content_finder_condition_id)),
              Err(error) => {
                publish_status(
                  &app,
                  MonitorStatus {
                    running: false,
                    phase: "error".into(),
                    active_record_id: None,
                    duty_id: None,
                    error: Some(error),
                  },
                );
                break;
              }
            }
          }
        } else if snapshot.queue_state == 0 && snapshot.content_finder_condition_id == 0 {
          saw_mentor_queue = false;
        }
        publish_status(
          &app,
          MonitorStatus {
            running: true,
            phase: if active.is_some() {
              "in_duty"
            } else if saw_mentor_queue {
              "queued"
            } else {
              "waiting"
            }
            .into(),
            active_record_id: active.as_ref().map(|value| value.0.clone()),
            duty_id: active.as_ref().map(|value| value.1),
            error: None,
          },
        );
      }
      Err(error) => {
        publish_status(
          &app,
          MonitorStatus {
            running: false,
            phase: "error".into(),
            active_record_id: active.as_ref().map(|value| value.0.clone()),
            duty_id: active.as_ref().map(|value| value.1),
            error: Some(error.to_string()),
          },
        );
        break;
      }
    }
    for _ in 0..10 {
      if stop.load(Ordering::Acquire) {
        break;
      }
      thread::sleep(Duration::from_millis(100));
    }
  }
  // The record was created as NeedsReview and keeps its unknown end time.
  // A later monitor can resume it if the same character is still in that duty.
  if stop.load(Ordering::Acquire) {
    publish_status(&app, MonitorStatus::default());
  }
}

/// Return newest records first while keeping game and legacy data in one ledger.
#[tauri::command]
pub fn mentor_list_records(state: State<'_, MentorState>) -> Result<Vec<MentorRecord>, String> {
  let _guard = state
    .io_lock
    .lock()
    .map_err(|_| "Mentor storage is unavailable.")?;
  let mut records = state.read()?.records;
  records.sort_by(|a, b| b.started_at_ms.cmp(&a.started_at_ms));
  Ok(records)
}

#[tauri::command]
pub fn mentor_add_manual_record(
  state: State<'_, MentorState>,
  request: ManualRecordRequest,
) -> Result<MentorRecord, String> {
  validate_text(&request.duty_name, 160, "Duty name")?;
  validate_text(&request.character_name, 120, "Character name")?;
  validate_note(&request.note)?;
  if request.started_at_ms <= 0 || request.started_at_ms > now_ms() + 86_400_000 {
    return Err("The record time is invalid.".into());
  }
  if request.result == MentorResult::LegacyUnknown {
    return Err("Manual records need an explicit result.".into());
  }
  let record = MentorRecord {
    id: random_id(),
    character_id: request.character_id.trim().to_owned(),
    character_name: request.character_name.trim().to_owned(),
    duty_id: None,
    duty_name: request.duty_name.trim().to_owned(),
    job_id: request.job_id,
    job_name: request.job_name.filter(|value| !value.trim().is_empty()),
    started_at_ms: request.started_at_ms,
    ended_at_ms: None,
    result: request.result,
    source: MentorSource::Manual,
    note: request.note.trim().to_owned(),
    legacy_key: None,
  };
  let _guard = state
    .io_lock
    .lock()
    .map_err(|_| "Mentor storage is unavailable.")?;
  let mut store = state.read()?;
  if store.records.len() >= MAX_RECORDS {
    return Err("The mentor record limit has been reached.".into());
  }
  store.records.push(record.clone());
  state.write(&store)?;
  Ok(record)
}

#[tauri::command]
pub fn mentor_correct_record(
  state: State<'_, MentorState>,
  correction: RecordCorrection,
) -> Result<MentorRecord, String> {
  validate_note(&correction.note)?;
  let monitor = state
    .monitor_status
    .lock()
    .map_err(|_| "Mentor monitoring is unavailable.")?;
  if monitor.running && monitor.active_record_id.as_deref() == Some(correction.id.as_str()) {
    return Err("An active game record cannot be corrected yet.".into());
  }
  drop(monitor);
  let _guard = state
    .io_lock
    .lock()
    .map_err(|_| "Mentor storage is unavailable.")?;
  let mut store = state.read()?;
  let record = store
    .records
    .iter_mut()
    .find(|record| record.id == correction.id)
    .ok_or("The mentor record was not found.")?;
  record.result = correction.result;
  record.note = correction.note.trim().to_owned();
  let updated = record.clone();
  state.write(&store)?;
  Ok(updated)
}

#[tauri::command]
pub fn mentor_delete_record(state: State<'_, MentorState>, id: String) -> Result<(), String> {
  let monitor = state
    .monitor_status
    .lock()
    .map_err(|_| "Mentor monitoring is unavailable.")?;
  if monitor.running && monitor.active_record_id.as_deref() == Some(id.as_str()) {
    return Err("An active game record cannot be deleted yet.".into());
  }
  drop(monitor);
  let _guard = state
    .io_lock
    .lock()
    .map_err(|_| "Mentor storage is unavailable.")?;
  let mut store = state.read()?;
  let count = store.records.len();
  store.records.retain(|record| record.id != id);
  if store.records.len() == count {
    return Err("The mentor record was not found.".into());
  }
  state.write(&store)
}

/// Credentials are sent only to the fixed legacy origin and never persisted.
#[tauri::command]
pub async fn mentor_preview_legacy(
  state: State<'_, MentorState>,
  username: String,
  mut password: String,
) -> Result<LegacyPreview, String> {
  validate_text(&username, 120, "Legacy email")?;
  if password.is_empty() || password.len() > 120 {
    password.zeroize();
    return Err("The legacy password is invalid.".into());
  }
  let response = tauri::async_runtime::spawn_blocking(move || {
    let result = fetch_legacy_records(&username, &password);
    password.zeroize();
    result
  })
  .await
  .map_err(|_| "The legacy record task failed.")??;
  preview_legacy_records(&state, response)
}

fn fetch_legacy_records(username: &str, password: &str) -> Result<LegacyResponse, String> {
  #[derive(Serialize)]
  #[serde(rename_all = "camelCase")]
  struct Request<'a> {
    operation: &'static str,
    username: &'a str,
    password: &'a str,
  }
  python_sidecar::request(
    &Request {
      operation: "fetchMentorLegacyRecords",
      username: username.trim(),
      password,
    },
    MAX_LEGACY_RESPONSE_BYTES,
    "mentor legacy migration",
  )
}

fn preview_legacy_records(
  state: &MentorState,
  response: LegacyResponse,
) -> Result<LegacyPreview, String> {
  if response.records.len() != response.total_count || response.records.len() > MAX_RECORDS {
    return Err("The legacy record count is inconsistent.".into());
  }
  let account_key = format!(
    "{:x}",
    Sha256::digest(response.username.to_lowercase().as_bytes())
  );
  let known: HashSet<String> = {
    let _guard = state
      .io_lock
      .lock()
      .map_err(|_| "Mentor storage is unavailable.")?;
    state
      .read()?
      .records
      .into_iter()
      .filter_map(|record| record.legacy_key)
      .collect()
  };
  let mut valid = Vec::new();
  let mut invalid_count = 0;
  let mut duplicate_count = 0;
  let mut seen = HashSet::new();
  for row in &response.records {
    match convert_legacy_row(row, &account_key) {
      Some(record) if known.contains(record.legacy_key.as_ref().unwrap()) => duplicate_count += 1,
      Some(record) if !seen.insert(record.legacy_key.clone().unwrap()) => duplicate_count += 1,
      Some(record) => valid.push(record),
      None => invalid_count += 1,
    }
  }
  let earliest_at_ms = valid.iter().map(|record| record.started_at_ms).min();
  let latest_at_ms = valid.iter().map(|record| record.started_at_ms).max();
  let token = random_id();
  let examples = valid.iter().take(5).cloned().collect();
  let preview = LegacyPreview {
    token: token.clone(),
    fetched_count: response.total_count,
    valid_count: valid.len(),
    invalid_count,
    duplicate_count,
    earliest_at_ms,
    latest_at_ms,
    examples,
  };
  *state
    .preview
    .lock()
    .map_err(|_| "Migration preview is unavailable.")? = Some(PendingPreview {
    token,
    records: valid,
  });
  Ok(preview)
}

#[tauri::command]
pub fn mentor_import_legacy(
  state: State<'_, MentorState>,
  token: String,
  character_id: String,
  character_name: String,
  treat_as_completed: bool,
) -> Result<LegacyImportResult, String> {
  validate_text(&character_name, 120, "Character name")?;
  let mut preview = state
    .preview
    .lock()
    .map_err(|_| "Migration preview is unavailable.")?;
  let pending = preview
    .as_ref()
    .ok_or("Read legacy records before importing.")?;
  if pending.token != token {
    return Err("The migration preview has changed. Read the records again.".into());
  }
  let _guard = state
    .io_lock
    .lock()
    .map_err(|_| "Mentor storage is unavailable.")?;
  let mut store = state.read()?;
  let mut known: HashSet<String> = store
    .records
    .iter()
    .filter_map(|record| record.legacy_key.clone())
    .collect();
  let mut imported_count = 0;
  for source in &pending.records {
    if !known.insert(source.legacy_key.clone().unwrap()) {
      continue;
    }
    let mut record = source.clone();
    record.character_id = character_id.trim().to_owned();
    record.character_name = character_name.trim().to_owned();
    if treat_as_completed {
      record.result = MentorResult::Completed;
    }
    store.records.push(record);
    imported_count += 1;
  }
  if store.records.len() > MAX_RECORDS {
    return Err("The mentor record limit would be exceeded.".into());
  }
  state.write(&store)?;
  let skipped_count = pending.records.len() - imported_count;
  *preview = None;
  Ok(LegacyImportResult {
    imported_count,
    skipped_count,
  })
}

fn convert_legacy_row(row: &LegacyRow, account_key: &str) -> Option<MentorRecord> {
  let duty_name = row.duty_name.as_str()?.trim();
  if duty_name.is_empty() || duty_name.len() > 160 {
    return None;
  }
  let started_at_ms = parse_legacy_time(&row.created_at)?;
  let remote_id = match &row.id {
    Value::String(value) if !value.is_empty() => value.clone(),
    Value::Number(value) => value.to_string(),
    _ => format!(
      "fingerprint-{:x}",
      Sha256::digest(
        format!(
          "{}:{}:{}:{}",
          row.created_at, row.duty_name, row.job_key, row.note
        )
        .as_bytes()
      )
    ),
  };
  let legacy_key = format!("dlog:{account_key}:{remote_id}");
  Some(MentorRecord {
    id: random_id(),
    character_id: String::new(),
    character_name: String::new(),
    duty_id: row
      .duty_id
      .as_u64()
      .and_then(|value| u32::try_from(value).ok()),
    duty_name: duty_name.to_owned(),
    job_id: None,
    job_name: row
      .job_name
      .as_str()
      .or_else(|| row.job_key.as_str())
      .map(str::to_owned),
    started_at_ms,
    ended_at_ms: None,
    result: MentorResult::LegacyUnknown,
    source: MentorSource::LegacySite,
    note: row.note.as_str().unwrap_or("").chars().take(500).collect(),
    legacy_key: Some(legacy_key),
  })
}

fn parse_legacy_time(value: &Value) -> Option<i64> {
  if let Some(number) = value.as_i64() {
    return Some(if number < 10_000_000_000 {
      number * 1000
    } else {
      number
    });
  }
  let text = value.as_str()?;
  if let Ok(value) = DateTime::parse_from_rfc3339(text) {
    return Some(value.timestamp_millis());
  }
  let naive = NaiveDateTime::parse_from_str(text, "%Y-%m-%d %H:%M:%S").ok()?;
  FixedOffset::east_opt(8 * 3600)?
    .from_local_datetime(&naive)
    .single()
    .map(|date| date.timestamp_millis())
}

fn validate_text(value: &str, maximum: usize, label: &str) -> Result<(), String> {
  if value.trim().is_empty() || value.len() > maximum {
    return Err(format!("{label} is missing or too long."));
  }
  Ok(())
}

fn validate_note(value: &str) -> Result<(), String> {
  if value.len() > 500 {
    return Err("The record note is too long.".into());
  }
  Ok(())
}

fn random_id() -> String {
  let mut bytes = [0_u8; 16];
  rand::thread_rng().fill_bytes(&mut bytes);
  bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn now_ms() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis() as i64)
    .unwrap_or(0)
}

fn read_store(path: &Path) -> Result<MentorStore, String> {
  let metadata = match fs::metadata(path) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(MentorStore::default()),
    Err(_) => return Err("Unable to inspect mentor record storage.".into()),
  };
  if metadata.len() > MAX_STORE_BYTES {
    return Err("Mentor record storage exceeds the size limit.".into());
  }
  let bytes = fs::read(path).map_err(|_| "Unable to read mentor records.")?;
  let store: MentorStore =
    serde_json::from_slice(&bytes).map_err(|_| "Mentor records are invalid.")?;
  if store.schema_version != 1 || store.records.len() > MAX_RECORDS {
    return Err("Mentor record storage has an unsupported format.".into());
  }
  Ok(store)
}

fn write_store(path: &Path, store: &MentorStore) -> Result<(), String> {
  let bytes = serde_json::to_vec(store).map_err(|_| "Unable to encode mentor records.")?;
  if bytes.len() as u64 > MAX_STORE_BYTES {
    return Err("Mentor record storage exceeds the size limit.".into());
  }
  let parent = path.parent().ok_or("The mentor storage path is invalid.")?;
  fs::create_dir_all(parent).map_err(|_| "Unable to prepare mentor record storage.")?;
  let temporary = parent.join(format!(".mentor-{}.tmp", random_id()));
  let result = (|| -> Result<(), String> {
    let mut file = OpenOptions::new()
      .write(true)
      .create_new(true)
      .open(&temporary)
      .map_err(|_| "Unable to create temporary mentor storage.")?;
    file
      .write_all(&bytes)
      .and_then(|_| file.sync_all())
      .map_err(|_| "Unable to write mentor records.")?;
    drop(file);
    replace_file(&temporary, path)
  })();
  if result.is_err() {
    let _ = fs::remove_file(&temporary);
  }
  result
}

#[cfg(windows)]
fn replace_file(temporary: &Path, destination: &Path) -> Result<(), String> {
  use std::os::windows::ffi::OsStrExt;
  use windows_sys::Win32::Storage::FileSystem::{
    MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
  };
  let source: Vec<u16> = temporary.as_os_str().encode_wide().chain(Some(0)).collect();
  let target: Vec<u16> = destination
    .as_os_str()
    .encode_wide()
    .chain(Some(0))
    .collect();
  let moved = unsafe {
    MoveFileExW(
      source.as_ptr(),
      target.as_ptr(),
      MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
    )
  };
  if moved == 0 {
    return Err("Unable to replace mentor record storage.".into());
  }
  Ok(())
}

#[cfg(not(windows))]
fn replace_file(temporary: &Path, destination: &Path) -> Result<(), String> {
  fs::rename(temporary, destination).map_err(|_| "Unable to replace mentor record storage.".into())
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  fn duty(
    roulette: u8,
    queue: u8,
    condition: u32,
    sequence: u64,
    completed_condition: u32,
  ) -> MentorDutySnapshot {
    MentorDutySnapshot {
      queued_roulette_id: roulette,
      queue_state: queue,
      content_finder_condition_id: condition,
      completion_sequence: sequence,
      completion_content_finder_condition_id: completed_condition,
      completion_territory_id: 0,
    }
  }

  #[test]
  fn a_mentor_queue_and_matching_completion_are_required() {
    let normal_queue = duty(1, 2, 0, 0, 0);
    let mentor_queue = duty(9, 2, 0, 0, 0);
    let entered = duty(9, 5, 42, 0, 0);
    let completed = duty(9, 5, 42, 1, 42);
    assert!(!observed_mentor_queue(&normal_queue));
    assert!(observed_mentor_queue(&mentor_queue));
    assert!(!can_begin_run(false, None, &entered));
    assert!(can_begin_run(true, None, &entered));
    assert!(completion_matches(Some(0), 42, &completed));
    assert!(!completion_matches(Some(1), 42, &completed));
    assert!(!completion_matches(Some(0), 43, &completed));
    assert!(!can_begin_run(true, Some(42), &entered));
  }

  #[test]
  fn legacy_identity_is_stable_and_storage_replaces_atomically() {
    let row = LegacyRow {
      id: Value::Null,
      created_at: json!("2026-01-02T03:04:05+08:00"),
      duty_id: json!(42),
      duty_name: json!("Duty"),
      job_key: json!("PLD"),
      job_name: json!("Paladin"),
      note: json!("note"),
    };
    let first = convert_legacy_row(&row, "account").unwrap();
    let second = convert_legacy_row(&row, "account").unwrap();
    assert_eq!(first.legacy_key, second.legacy_key);
    assert_eq!(first.result, MentorResult::LegacyUnknown);
    let root = std::env::temp_dir().join(format!("mentor-test-{}", random_id()));
    let path = root.join("records.json");
    let mut store = MentorStore::default();
    store.records.push(first);
    store.monitor_enabled = true;
    write_store(&path, &store).unwrap();
    let restored = read_store(&path).unwrap();
    assert!(restored.monitor_enabled);
    assert_eq!(restored.records.len(), 1);
    store.monitor_enabled = false;
    write_store(&path, &store).unwrap();
    assert!(!read_store(&path).unwrap().monitor_enabled);
    fs::remove_dir_all(root).unwrap();
  }
}
