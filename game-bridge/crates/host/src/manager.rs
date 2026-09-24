//! Thread-safe bridge lifecycle and the semantic command API used by Tauri.

use crate::error::{BridgeError, BridgeResult};
use crate::world_map::WorldMap;
use game_bridge_protocol::{
    ActiveCharacterSnapshot, ChatMessageSnapshot, Command, CommandResult, GameSnapshot,
    GameStateSnapshot, PlayerInventorySnapshot, RegionTarget,
};
use serde::{Deserialize, Serialize};
#[cfg(debug_assertions)]
use serde_json::Value;
use std::path::PathBuf;
#[cfg(windows)]
use std::sync::Weak;
use std::sync::{Arc, Mutex, RwLock};

#[cfg(windows)]
use crate::injector::{BootstrapArgs, InjectedPayload};
#[cfg(windows)]
use crate::shared_memory::{SessionEvent, SharedSession};

type Observer = Arc<dyn Fn(BridgeStatus) + Send + Sync + 'static>;
#[cfg(debug_assertions)]
type CommandObserver = Arc<dyn Fn(u64, Value, Result<Value, String>, u128) + Send + Sync + 'static>;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum BridgePhase {
    Disconnected,
    Connecting,
    Ready,
    Faulted,
    ShuttingDown,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeStatus {
    pub phase: BridgePhase,
    pub process_id: Option<u32>,
    pub payload_version: Option<String>,
    pub capabilities: Vec<String>,
    pub snapshot: Option<GameSnapshot>,
    pub heartbeat_sequence: u64,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
}

impl Default for BridgeStatus {
    fn default() -> Self {
        Self {
            phase: BridgePhase::Disconnected,
            process_id: None,
            payload_version: None,
            capabilities: Vec::new(),
            snapshot: None,
            heartbeat_sequence: 0,
            error_code: None,
            error_message: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectOptions {
    pub process_id: Option<u32>,
    pub payload_path: PathBuf,
    pub manifest_path: PathBuf,
    pub world_map_path: PathBuf,
}

struct Inner {
    status: BridgeStatus,
    #[cfg(windows)]
    next_request_id: u64,
    world_map: WorldMap,
    #[cfg(windows)]
    session: Option<SharedSession>,
    #[cfg(windows)]
    payload: Option<InjectedPayload>,
}

impl Default for Inner {
    fn default() -> Self {
        Self {
            status: BridgeStatus::default(),
            #[cfg(windows)]
            next_request_id: 1,
            world_map: WorldMap::default(),
            #[cfg(windows)]
            session: None,
            #[cfg(windows)]
            payload: None,
        }
    }
}

pub struct BridgeManager {
    inner: Mutex<Inner>,
    observers: RwLock<Vec<Observer>>,
    #[cfg(debug_assertions)]
    command_observers: RwLock<Vec<CommandObserver>>,
}

impl Default for BridgeManager {
    fn default() -> Self {
        Self {
            inner: Mutex::new(Inner::default()),
            observers: RwLock::new(Vec::new()),
            #[cfg(debug_assertions)]
            command_observers: RwLock::new(Vec::new()),
        }
    }
}

impl Drop for BridgeManager {
    fn drop(&mut self) {
        #[cfg(windows)]
        {
            let inner = self
                .inner
                .get_mut()
                .unwrap_or_else(|poisoned| poisoned.into_inner());
            if let Some(session) = inner.session.take() {
                session.close();
            }
            if let Some(payload) = inner.payload.take() {
                let _ = payload.unload();
            }
        }
    }
}

impl BridgeManager {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    pub fn observe(&self, observer: Observer) {
        self.observers
            .write()
            .expect("observer lock poisoned")
            .push(observer);
    }

    /// Observe actual host-to-payload commands only in debug builds.
    #[cfg(debug_assertions)]
    pub fn observe_commands(&self, observer: CommandObserver) {
        self.command_observers
            .write()
            .expect("command observer lock poisoned")
            .push(observer);
    }

    pub fn status(&self) -> BridgeStatus {
        self.inner
            .lock()
            .expect("bridge lock poisoned")
            .status
            .clone()
    }

    /// Performs an explicitly confirmed Debug-only cleanup of an owned or orphaned payload.
    #[cfg(all(windows, debug_assertions))]
    pub fn debug_unload_payload(
        &self,
        process_id: Option<u32>,
        payload_path: &std::path::Path,
    ) -> BridgeResult<(bool, u32, BridgeStatus)> {
        let owns_payload = {
            let inner = self.inner.lock().expect("bridge lock poisoned");
            inner.session.is_some() || inner.payload.is_some()
        };
        let process_id = match process_id.or_else(|| self.status().process_id) {
            Some(process_id) => process_id,
            None => crate::process::resolve_process_id(None)?,
        };
        if owns_payload {
            return self.disconnect().map(|status| (true, process_id, status));
        }

        let unloaded = InjectedPayload::unload_existing(process_id, payload_path)?;
        let status = {
            let mut inner = self.inner.lock().expect("bridge lock poisoned");
            inner.status = BridgeStatus::default();
            inner.status.clone()
        };
        self.notify();
        Ok((unloaded, process_id, status))
    }

    #[cfg(windows)]
    pub fn connect(self: &Arc<Self>, options: ConnectOptions) -> BridgeResult<BridgeStatus> {
        {
            let inner = self.inner.lock().expect("bridge lock poisoned");
            if inner.session.is_some()
                || inner.payload.is_some()
                || !matches!(
                    inner.status.phase,
                    BridgePhase::Disconnected | BridgePhase::Faulted
                )
            {
                return Err(BridgeError::AlreadyConnected);
            }
        }

        let world_map = WorldMap::load(&options.world_map_path)?;
        let process_id = crate::process::resolve_process_id(options.process_id)?;
        let manifest_path = options
            .manifest_path
            .canonicalize()
            .map_err(|_| BridgeError::InvalidPath(options.manifest_path.display().to_string()))?;

        let (event_tx, event_rx) = std::sync::mpsc::channel();
        let session = SharedSession::create(event_tx)?;
        session.configure_game_api(&manifest_path, process_id)?;
        let shared_memory_handle = session.duplicate_into(process_id)?;
        let bootstrap = BootstrapArgs::new(shared_memory_handle);
        {
            let mut inner = self.inner.lock().expect("bridge lock poisoned");
            inner.world_map = world_map;
            inner.status = BridgeStatus {
                phase: BridgePhase::Connecting,
                process_id: Some(process_id),
                ..BridgeStatus::default()
            };
            inner.session = Some(session);
        }
        self.notify();

        let weak_manager = Arc::downgrade(self);
        if let Err(error) = std::thread::Builder::new()
            .name("game-bridge-events".to_owned())
            .spawn(move || run_event_loop(weak_manager, event_rx))
        {
            if let Some(session) = self
                .inner
                .lock()
                .expect("bridge lock poisoned")
                .session
                .take()
            {
                session.close();
            }
            self.set_fault("event_monitor_failed", error.to_string());
            return Err(error.into());
        }

        let payload = match InjectedPayload::inject(process_id, &options.payload_path, &bootstrap) {
            Ok(payload) => payload,
            Err(error) => {
                let error = if let Some(session) = self
                    .inner
                    .lock()
                    .expect("bridge lock poisoned")
                    .session
                    .take()
                {
                    let error = session.initialization_error(error);
                    session.close();
                    error
                } else {
                    error
                };
                self.set_fault("injection_failed", error.to_string());
                return Err(error);
            }
        };

        let status = {
            let mut inner = self.inner.lock().expect("bridge lock poisoned");
            inner.payload = Some(payload);
            if inner.status.payload_version.is_some() {
                inner.status.phase = BridgePhase::Ready;
            }
            inner.status.clone()
        };
        self.notify();
        Ok(status)
    }

    #[cfg(not(windows))]
    pub fn connect(self: &Arc<Self>, _options: ConnectOptions) -> BridgeResult<BridgeStatus> {
        Err(BridgeError::UnsupportedPlatform)
    }

    pub fn capture_snapshot(&self) -> BridgeResult<GameSnapshot> {
        match self.send_command(Command::CaptureSnapshot)? {
            CommandResult::Snapshot { mut snapshot } => {
                {
                    let mut inner = self.inner.lock().expect("bridge lock poisoned");
                    inner.world_map.enrich(&mut snapshot);
                    inner.status.snapshot = Some(snapshot.clone());
                }
                self.notify();
                Ok(snapshot)
            }
            _ => Err(BridgeError::InvalidData(
                "unexpected capture response".to_owned(),
            )),
        }
    }

    pub fn capture_active_character(&self) -> BridgeResult<ActiveCharacterSnapshot> {
        match self.send_command(Command::CaptureActiveCharacter)? {
            CommandResult::ActiveCharacter { mut character } => {
                self.inner
                    .lock()
                    .expect("bridge lock poisoned")
                    .world_map
                    .enrich_active(&mut character);
                Ok(character)
            }
            _ => Err(BridgeError::InvalidData(
                "unexpected active character response".to_owned(),
            )),
        }
    }

    pub fn capture_inventory(&self) -> BridgeResult<PlayerInventorySnapshot> {
        match self.send_command(Command::CaptureInventory)? {
            CommandResult::Inventory { inventory } => Ok(inventory),
            _ => Err(BridgeError::InvalidData(
                "unexpected inventory response".to_owned(),
            )),
        }
    }

    pub fn capture_game_state(&self) -> BridgeResult<GameStateSnapshot> {
        match self.send_command(Command::CaptureGameState)? {
            CommandResult::GameState { state } => Ok(state),
            _ => Err(BridgeError::InvalidData(
                "unexpected game-state response".to_owned(),
            )),
        }
    }

    pub fn capture_portrait_lighting(
        &self,
    ) -> BridgeResult<game_bridge_protocol::PortraitLightingSnapshot> {
        match self.send_command(Command::CapturePortraitLighting)? {
            CommandResult::PortraitLighting { lighting } => Ok(lighting),
            _ => Err(BridgeError::InvalidData(
                "unexpected portrait-lighting response".to_owned(),
            )),
        }
    }

    pub fn update_portrait_lighting(
        &self,
        update: game_bridge_protocol::PortraitLightingUpdate,
    ) -> BridgeResult<game_bridge_protocol::PortraitLightingSnapshot> {
        if update.fields == 0 || update.fields & !0x1f != 0 {
            return Err(BridgeError::InvalidData(
                "portrait lighting update contains an invalid field mask".to_owned(),
            ));
        }
        if !(-180..=180).contains(&update.directional_vertical_angle)
            || !(-180..=180).contains(&update.directional_horizontal_angle)
        {
            return Err(BridgeError::InvalidData(
                "portrait lighting angles must be between -180 and 180 degrees".to_owned(),
            ));
        }
        match self.send_command(Command::UpdatePortraitLighting { update })? {
            CommandResult::PortraitLighting { lighting } => Ok(lighting),
            _ => Err(BridgeError::InvalidData(
                "unexpected portrait-lighting update response".to_owned(),
            )),
        }
    }

    pub fn update_portrait_animation(
        &self,
        update: game_bridge_protocol::PortraitAnimationUpdate,
    ) -> BridgeResult<game_bridge_protocol::PortraitLightingSnapshot> {
        if update.fields == 0 || update.fields & !0x03 != 0 || !update.time.is_finite() {
            return Err(BridgeError::InvalidData(
                "portrait animation update contains invalid values".to_owned(),
            ));
        }
        match self.send_command(Command::UpdatePortraitAnimation { update })? {
            CommandResult::PortraitLighting { lighting } => Ok(lighting),
            _ => Err(BridgeError::InvalidData(
                "unexpected portrait-animation update response".to_owned(),
            )),
        }
    }

    pub fn logout_to_title(&self) -> BridgeResult<()> {
        expect_ack(self.send_command(Command::LogoutToTitle)?)
    }

    pub fn return_to_title(&self) -> BridgeResult<()> {
        expect_ack(self.send_command(Command::ReturnToTitle)?)
    }

    pub fn switch_region(&self, target: RegionTarget) -> BridgeResult<String> {
        match self.send_command(Command::SwitchRegion { target })? {
            CommandResult::RegionSwitched { region_name } => Ok(region_name),
            _ => Err(BridgeError::InvalidData(
                "unexpected switch response".to_owned(),
            )),
        }
    }

    pub fn trigger_login(&self) -> BridgeResult<()> {
        expect_ack(self.send_command(Command::TriggerLogin)?)
    }

    pub fn send_chat(&self, message: String) -> BridgeResult<()> {
        if message.is_empty() || message.len() > 500 {
            return Err(BridgeError::InvalidData(
                "chat message must contain between 1 and 500 UTF-8 bytes".to_owned(),
            ));
        }
        if message.starts_with('/') {
            return Err(BridgeError::InvalidData(
                "slash commands are not allowed through the chat bridge".to_owned(),
            ));
        }
        expect_ack(self.send_command(Command::SendChat { message })?)
    }

    #[cfg(windows)]
    pub fn poll_chat_messages(&self) -> BridgeResult<Vec<ChatMessageSnapshot>> {
        let inner = self.inner.lock().expect("bridge lock poisoned");
        if !matches!(inner.status.phase, BridgePhase::Ready) {
            return Err(BridgeError::NotConnected);
        }
        inner
            .session
            .as_ref()
            .ok_or(BridgeError::NotConnected)?
            .poll_chat_messages()
    }

    #[cfg(not(windows))]
    pub fn poll_chat_messages(&self) -> BridgeResult<Vec<ChatMessageSnapshot>> {
        Err(BridgeError::UnsupportedPlatform)
    }

    #[cfg(windows)]
    pub fn chat_dropped_count(&self) -> u64 {
        self.inner
            .lock()
            .expect("bridge lock poisoned")
            .session
            .as_ref()
            .map_or(0, SharedSession::chat_dropped_count)
    }

    #[cfg(not(windows))]
    pub fn chat_dropped_count(&self) -> u64 {
        0
    }

    #[cfg(windows)]
    pub fn disconnect(&self) -> BridgeResult<BridgeStatus> {
        {
            let mut inner = self.inner.lock().expect("bridge lock poisoned");
            if inner.session.is_none() && inner.payload.is_none() {
                return Ok(inner.status.clone());
            }
            inner.status.phase = BridgePhase::ShuttingDown;
        }
        self.notify();

        let _ = self.send_command(Command::Shutdown);
        let (session, payload) = {
            let mut inner = self.inner.lock().expect("bridge lock poisoned");
            (inner.session.take(), inner.payload.take())
        };
        if let Some(session) = session {
            session.close();
        }
        if let Some(payload) = payload {
            payload.unload()?;
        }

        let status = {
            let mut inner = self.inner.lock().expect("bridge lock poisoned");
            inner.status = BridgeStatus::default();
            inner.status.clone()
        };
        self.notify();
        Ok(status)
    }

    #[cfg(not(windows))]
    pub fn disconnect(&self) -> BridgeResult<BridgeStatus> {
        Err(BridgeError::UnsupportedPlatform)
    }

    #[cfg(windows)]
    fn send_command(&self, command: Command) -> BridgeResult<CommandResult> {
        #[cfg(debug_assertions)]
        let started = std::time::Instant::now();
        #[cfg(debug_assertions)]
        let request = serde_json::to_value(&command).unwrap_or(Value::Null);
        let mut inner = self.inner.lock().expect("bridge lock poisoned");
        if !matches!(
            inner.status.phase,
            BridgePhase::Ready | BridgePhase::ShuttingDown
        ) {
            return Err(BridgeError::NotConnected);
        }
        let request_id = inner.next_request_id;
        inner.next_request_id = inner.next_request_id.wrapping_add(1).max(1);
        let session = inner.session.as_ref().ok_or(BridgeError::NotConnected)?;
        let result = session.send(request_id, command);
        drop(inner);
        #[cfg(debug_assertions)]
        {
            let response = result
                .as_ref()
                .map(|value| serde_json::to_value(value).unwrap_or(Value::Null))
                .map_err(ToString::to_string);
            for observer in self
                .command_observers
                .read()
                .expect("command observer lock poisoned")
                .iter()
            {
                observer(
                    request_id,
                    request.clone(),
                    response.clone(),
                    started.elapsed().as_millis(),
                );
            }
        }
        result
    }

    #[cfg(not(windows))]
    fn send_command(&self, _command: Command) -> BridgeResult<CommandResult> {
        Err(BridgeError::UnsupportedPlatform)
    }

    #[cfg(windows)]
    fn handle_event(&self, event: SessionEvent) {
        let mut should_notify = false;
        {
            let mut inner = self.inner.lock().expect("bridge lock poisoned");
            match event {
                SessionEvent::Ready {
                    payload_version,
                    capabilities,
                } => {
                    inner.status.payload_version = Some(payload_version);
                    inner.status.capabilities = capabilities;
                    inner.status.error_code = None;
                    inner.status.error_message = None;
                    if inner.payload.is_some() {
                        inner.status.phase = BridgePhase::Ready;
                        should_notify = true;
                    }
                }
                SessionEvent::Snapshot(mut snapshot) => {
                    inner.world_map.enrich(&mut snapshot);
                    inner.status.snapshot = Some(snapshot);
                    should_notify = true;
                }
                SessionEvent::Heartbeat(sequence) => {
                    inner.status.heartbeat_sequence = sequence;
                }
                SessionEvent::Fault {
                    code,
                    message,
                    fatal,
                } => {
                    inner.status.error_code = Some(code);
                    inner.status.error_message = Some(message);
                    if fatal {
                        inner.status.phase = BridgePhase::Faulted;
                    }
                    should_notify = true;
                }
                SessionEvent::Disconnected => {
                    if !matches!(inner.status.phase, BridgePhase::ShuttingDown) {
                        inner.status.phase = BridgePhase::Faulted;
                        inner.status.error_code = Some("connection_closed".to_owned());
                        inner.status.error_message =
                            Some("The payload connection closed.".to_owned());
                        should_notify = true;
                    }
                }
            }
        }
        if should_notify {
            self.notify();
        }
    }

    #[cfg(windows)]
    fn set_fault(&self, code: &str, message: String) {
        {
            let mut inner = self.inner.lock().expect("bridge lock poisoned");
            inner.status.phase = BridgePhase::Faulted;
            inner.status.error_code = Some(code.to_owned());
            inner.status.error_message = Some(message);
        }
        self.notify();
    }

    fn notify(&self) {
        let status = self.status();
        let observers = self
            .observers
            .read()
            .expect("observer lock poisoned")
            .clone();
        for observer in observers {
            observer(status.clone());
        }
    }
}

fn expect_ack(result: CommandResult) -> BridgeResult<()> {
    match result {
        CommandResult::Ack | CommandResult::ShutdownReady => Ok(()),
        _ => Err(BridgeError::InvalidData(
            "unexpected acknowledgement response".to_owned(),
        )),
    }
}

#[cfg(windows)]
fn run_event_loop(manager: Weak<BridgeManager>, event_rx: std::sync::mpsc::Receiver<SessionEvent>) {
    while let Ok(event) = event_rx.recv() {
        let Some(manager) = manager.upgrade() else {
            break;
        };
        manager.handle_event(event);
    }
}
