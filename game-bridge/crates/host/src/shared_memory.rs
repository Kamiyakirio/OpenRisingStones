//! Anonymous shared-memory transport; all policy and serialization remain in Rust.

use crate::error::{last_windows_error, BridgeError, BridgeResult};
use game_bridge_protocol::{
    ActiveCharacterSnapshot, Command, CommandResult, GameSnapshot, GlamourDresserItemSnapshot,
    GlamourDresserSnapshot, InventoryContainerSnapshot, InventoryItemSnapshot,
    PlayerInventorySnapshot, Position3,
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::ffi::c_void;
use std::fs;
use std::mem::size_of;
use std::path::Path;
use std::ptr::{null, null_mut};
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::mpsc::Sender;
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use windows_sys::Win32::Foundation::{
    CloseHandle, DuplicateHandle, DUPLICATE_SAME_ACCESS, HANDLE, INVALID_HANDLE_VALUE,
};
use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcess, PROCESS_DUP_HANDLE};

const SHARED_MAGIC: u32 = 0x4752_424F;
const SHARED_ABI_VERSION: u32 = 1;
const PAYLOAD_STATE_READY: u32 = 1;
const PAYLOAD_STATE_FAULTED: u32 = 2;
const COMMAND_TIMEOUT: Duration = Duration::from_secs(15);
const MAXIMUM_CONTAINERS: usize = 18;
const MAXIMUM_ITEMS: usize = 1024;
const MAXIMUM_DRESSER_ITEMS: usize = 800;
const PAGE_READWRITE: u32 = 0x04;
const FILE_MAP_ALL_ACCESS: u32 = 0x000F_001F;

const COMMAND_CAPTURE_SNAPSHOT: u32 = 1;
const COMMAND_CAPTURE_ACTIVE_CHARACTER: u32 = 2;
const COMMAND_CAPTURE_INVENTORY: u32 = 3;
const COMMAND_RETURN_TO_TITLE: u32 = 4;
const COMMAND_SWITCH_REGION: u32 = 5;
const COMMAND_TRIGGER_LOGIN: u32 = 6;
const COMMAND_SHUTDOWN: u32 = 7;

const RESPONSE_SUCCESS: u32 = 1;
const RESPONSE_ERROR: u32 = 2;

#[link(name = "kernel32")]
extern "system" {
    fn CreateFileMappingW(
        file: HANDLE,
        attributes: *const c_void,
        protect: u32,
        maximum_size_high: u32,
        maximum_size_low: u32,
        name: *const u16,
    ) -> HANDLE;
    fn MapViewOfFile(
        mapping: HANDLE,
        desired_access: u32,
        file_offset_high: u32,
        file_offset_low: u32,
        bytes_to_map: usize,
    ) -> *mut c_void;
    fn UnmapViewOfFile(base_address: *const c_void) -> i32;
}

#[repr(C)]
struct SharedGameLayout {
    framework_tick_vtable_index: u32,
    framework_network_module_proxy: u32,
    framework_dev_config: u32,
    network_module_proxy_network_module: u32,
    network_lobby_hosts: u32,
    network_save_data_bank_host: u32,
    network_active_lobby_host: u32,
    agent_lobby_data: u32,
    agent_game_session: u32,
    agent_selected_character_index: u32,
    agent_selected_content_id: u32,
    lobby_entries_vector: u32,
    lobby_ui_client: u32,
    lobby_context: u32,
    lobby_state: u32,
    entry_content_id: u32,
    entry_login_flags: u32,
    entry_current_world_id: u32,
    entry_home_world_id: u32,
    entry_name: u32,
    entry_name_capacity: u32,
    config_count: u32,
    config_entries: u32,
    config_entry_size: u32,
    config_entry_name: u32,
    config_entry_value: u32,
    rapture_atk_unit_manager: u32,
    component_res_node: u32,
    res_node_event: u32,
    receive_event_vtable_index: u32,
    active_character_name: u32,
    active_character_name_capacity: u32,
    active_character_entity_id: u32,
    active_character_position: u32,
    active_character_data: u32,
    active_character_health: u32,
    active_character_max_health: u32,
    active_character_mana: u32,
    active_character_max_mana: u32,
    active_character_class_job: u32,
    active_character_level: u32,
    active_character_content_id: u32,
    active_character_current_world: u32,
    active_character_home_world: u32,
    game_main_connected_to_zone: u32,
    game_main_territory_load_state: u32,
    game_main_current_territory: u32,
    get_item_finder_module_vtable_index: u32,
    inventory_container_items: u32,
    inventory_container_type: u32,
    inventory_container_size: u32,
    inventory_container_loaded: u32,
    inventory_item_size: u32,
    inventory_item_container: u32,
    inventory_item_slot: u32,
    inventory_item_symbolic: u32,
    inventory_item_id: u32,
    inventory_item_linked_slot: u32,
    inventory_item_linked_type: u32,
    inventory_item_quantity: u32,
    inventory_item_spiritbond: u32,
    inventory_item_condition: u32,
    inventory_item_flags: u32,
    inventory_item_materia: u32,
    inventory_item_materia_grades: u32,
    inventory_item_stains: u32,
    inventory_item_glamour_id: u32,
    item_finder_glamour_cached: u32,
    item_finder_glamour_item_ids: u32,
    item_finder_glamour_unlock_bits: u32,
    item_finder_glamour_capacity: u32,
}

#[repr(C)]
struct SharedGameApi {
    private_layout_verified: u32,
    reserved: u32,
    framework_instance_slot: u64,
    local_player_slot: u64,
    game_main_instance: u64,
    inventory_manager_instance: u64,
    get_inventory_container: u64,
    get_ui_module: u64,
    get_agent_by_internal_id: u64,
    utf8_set_string: u64,
    release_lobby_context: u64,
    return_to_title: u64,
    get_addon_by_name: u64,
    get_component_button_by_id: u64,
    layout: SharedGameLayout,
}

#[repr(C)]
struct SharedSwitchRegion {
    region_name_length: u32,
    lobby_host_length: u32,
    save_data_host_length: u32,
    gm_host_length: u32,
    game_session_length: u32,
    region_name: [u8; 64],
    lobby_host: [u8; 256],
    save_data_host: [u8; 256],
    gm_host: [u8; 256],
    game_session: [u8; 4096],
}

#[repr(C)]
struct SharedCommand {
    request_id: u64,
    kind: u32,
    reserved: u32,
    switch_region: SharedSwitchRegion,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct SharedGameSnapshot {
    content_id: u64,
    character_name: [u8; 64],
    current_world_id: u16,
    home_world_id: u16,
    login_flags: u8,
    reserved: [u8; 3],
    sequence: u64,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct SharedPosition3 {
    x: f32,
    y: f32,
    z: f32,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct SharedActiveCharacter {
    content_id: u64,
    character_name: [u8; 64],
    entity_id: u32,
    current_world_id: u16,
    home_world_id: u16,
    class_job_id: u8,
    level: u8,
    reserved: [u8; 2],
    current_hp: u32,
    max_hp: u32,
    current_mp: u32,
    max_mp: u32,
    position: SharedPosition3,
    territory_id: u32,
    territory_load_state: u32,
    connected_to_zone: u8,
    trailing_reserved: [u8; 3],
}

#[repr(C)]
#[derive(Clone, Copy)]
struct SharedInventoryItem {
    inventory_type: u32,
    slot: i16,
    flags: u8,
    is_symbolic: u8,
    item_id: u32,
    quantity: i32,
    spiritbond_or_collectability: u16,
    condition: u16,
    glamour_id: u32,
    stains: [u8; 2],
    materia: [u16; 5],
    materia_grades: [u8; 5],
    reserved: u8,
    linked_inventory_type: u16,
    linked_slot: u16,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct SharedInventoryContainer {
    name: [u8; 32],
    inventory_type: u32,
    loaded: u8,
    reserved: [u8; 3],
    size: i32,
    item_start: u32,
    item_count: u32,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct SharedDresserItem {
    slot: u16,
    set_unlock_bits: u16,
    item_id: u32,
}

#[repr(C)]
struct SharedInventorySnapshot {
    container_count: u32,
    item_count: u32,
    dresser_item_count: u32,
    dresser_cached: u8,
    dresser_may_be_stale: u8,
    reserved: [u8; 2],
    containers: [SharedInventoryContainer; MAXIMUM_CONTAINERS],
    items: [SharedInventoryItem; MAXIMUM_ITEMS],
    dresser_items: [SharedDresserItem; MAXIMUM_DRESSER_ITEMS],
}

#[repr(C)]
struct SharedResponse {
    request_id: u64,
    status: u32,
    kind: u32,
    error_code: [u8; 64],
    error_message: [u8; 256],
    snapshot: SharedGameSnapshot,
    active_character: SharedActiveCharacter,
    inventory: SharedInventorySnapshot,
}

#[repr(C)]
struct SharedBridge {
    magic: u32,
    abi_version: u32,
    struct_size: u32,
    payload_state: AtomicU32,
    heartbeat: AtomicU64,
    request_sequence: AtomicU64,
    response_sequence: AtomicU64,
    snapshot_sequence: AtomicU64,
    fatal_code: [u8; 64],
    fatal_message: [u8; 256],
    game_api: SharedGameApi,
    command: SharedCommand,
    response: SharedResponse,
    latest_snapshot: SharedGameSnapshot,
}

const _: [(); 4948] = [(); size_of::<SharedSwitchRegion>()];
const _: [(); 284] = [(); size_of::<SharedGameLayout>()];
const _: [(); 392] = [(); size_of::<SharedGameApi>()];
const _: [(); 4968] = [(); size_of::<SharedCommand>()];
const _: [(); 88] = [(); size_of::<SharedGameSnapshot>()];
const _: [(); 128] = [(); size_of::<SharedActiveCharacter>()];
const _: [(); 48] = [(); size_of::<SharedInventoryItem>()];
const _: [(); 52] = [(); size_of::<SharedInventoryContainer>()];
const _: [(); 56504] = [(); size_of::<SharedInventorySnapshot>()];
const _: [(); 57056] = [(); size_of::<SharedResponse>()];
const _: [(); 62872] = [(); size_of::<SharedBridge>()];

pub(crate) enum SessionEvent {
    Ready {
        payload_version: String,
        capabilities: Vec<String>,
    },
    Snapshot(GameSnapshot),
    Heartbeat(u64),
    Fault {
        code: String,
        message: String,
        fatal: bool,
    },
    Disconnected,
}

struct SharedMapping {
    handle: HANDLE,
    view: *mut SharedBridge,
}

unsafe impl Send for SharedMapping {}
unsafe impl Sync for SharedMapping {}

impl Drop for SharedMapping {
    fn drop(&mut self) {
        unsafe {
            UnmapViewOfFile(self.view.cast());
            CloseHandle(self.handle);
        }
    }
}

pub(crate) struct SharedSession {
    mapping: Arc<SharedMapping>,
    stopping: Arc<AtomicBool>,
    monitor: Option<JoinHandle<()>>,
}

unsafe impl Send for SharedSession {}

impl SharedSession {
    pub(crate) fn create(event_tx: Sender<SessionEvent>) -> BridgeResult<Self> {
        let mapping_size = size_of::<SharedBridge>();
        let handle = unsafe {
            CreateFileMappingW(
                INVALID_HANDLE_VALUE,
                null(),
                PAGE_READWRITE,
                0,
                mapping_size as u32,
                null(),
            )
        };
        if handle.is_null() {
            return Err(last_windows_error("CreateFileMappingW"));
        }
        let view = unsafe { MapViewOfFile(handle, FILE_MAP_ALL_ACCESS, 0, 0, mapping_size) }
            .cast::<SharedBridge>();
        if view.is_null() {
            unsafe { CloseHandle(handle) };
            return Err(last_windows_error("MapViewOfFile"));
        }

        unsafe {
            std::ptr::write_bytes(view.cast::<u8>(), 0, mapping_size);
            (*view).magic = SHARED_MAGIC;
            (*view).abi_version = SHARED_ABI_VERSION;
            (*view).struct_size = mapping_size as u32;
        }
        let mapping = Arc::new(SharedMapping { handle, view });
        let stopping = Arc::new(AtomicBool::new(false));
        let monitor_mapping = Arc::clone(&mapping);
        let monitor_stopping = Arc::clone(&stopping);
        let monitor = thread::Builder::new()
            .name("game-bridge-shared-monitor".to_owned())
            .spawn(move || monitor_shared_memory(monitor_mapping, monitor_stopping, event_tx))?;
        Ok(Self {
            mapping,
            stopping,
            monitor: Some(monitor),
        })
    }

    pub(crate) fn configure_game_api(
        &self,
        manifest_path: &Path,
        process_id: u32,
    ) -> BridgeResult<()> {
        let game_api = resolve_game_api(manifest_path, process_id)?;
        unsafe {
            (*self.mapping.view).game_api = game_api;
        }
        Ok(())
    }

    pub(crate) fn duplicate_into(&self, process_id: u32) -> BridgeResult<usize> {
        let process = unsafe { OpenProcess(PROCESS_DUP_HANDLE, 0, process_id) };
        if process.is_null() {
            return Err(last_windows_error("OpenProcess(shared memory)"));
        }
        let mut remote_handle: HANDLE = null_mut();
        let duplicated = unsafe {
            DuplicateHandle(
                GetCurrentProcess(),
                self.mapping.handle,
                process,
                &mut remote_handle,
                0,
                0,
                DUPLICATE_SAME_ACCESS,
            )
        };
        let duplicate_error = (duplicated == 0 || remote_handle.is_null())
            .then(|| last_windows_error("DuplicateHandle(shared memory)"));
        unsafe { CloseHandle(process) };
        if let Some(error) = duplicate_error {
            return Err(error);
        }
        Ok(remote_handle as usize)
    }

    pub(crate) fn send(&self, request_id: u64, command: Command) -> BridgeResult<CommandResult> {
        let shared = unsafe { &*self.mapping.view };
        if shared.payload_state.load(Ordering::Acquire) != PAYLOAD_STATE_READY {
            return Err(BridgeError::NotConnected);
        }

        let mut switched_region = None;
        unsafe {
            std::ptr::write_bytes(
                std::ptr::addr_of_mut!((*self.mapping.view).command).cast::<u8>(),
                0,
                size_of::<SharedCommand>(),
            );
            let target = &mut (*self.mapping.view).command;
            target.request_id = request_id;
            target.kind = match command {
                Command::CaptureSnapshot => COMMAND_CAPTURE_SNAPSHOT,
                Command::CaptureActiveCharacter => COMMAND_CAPTURE_ACTIVE_CHARACTER,
                Command::CaptureInventory => COMMAND_CAPTURE_INVENTORY,
                Command::ReturnToTitle => COMMAND_RETURN_TO_TITLE,
                Command::SwitchRegion { target: region } => {
                    switched_region = Some(region.region_name.clone());
                    write_switch_region(&mut target.switch_region, &region)?;
                    COMMAND_SWITCH_REGION
                }
                Command::TriggerLogin => COMMAND_TRIGGER_LOGIN,
                Command::Shutdown => COMMAND_SHUTDOWN,
            };
        }

        let sequence = shared.request_sequence.fetch_add(1, Ordering::AcqRel) + 1;
        let deadline = Instant::now() + COMMAND_TIMEOUT;
        loop {
            if shared.payload_state.load(Ordering::Acquire) == PAYLOAD_STATE_FAULTED {
                clear_command(self.mapping.view);
                return Err(BridgeError::InvalidData(format!(
                    "payload fault: {}: {}",
                    read_string(&shared.fatal_code),
                    read_string(&shared.fatal_message)
                )));
            }
            if shared.response_sequence.load(Ordering::Acquire) >= sequence {
                let response = unsafe { &(*self.mapping.view).response };
                if response.request_id != request_id {
                    return Err(BridgeError::InvalidData(
                        "shared response request id mismatch".to_owned(),
                    ));
                }
                let result = decode_response(response, switched_region);
                clear_command(self.mapping.view);
                return result;
            }
            if Instant::now() >= deadline {
                clear_command(self.mapping.view);
                return Err(BridgeError::Timeout("shared-memory command"));
            }
            thread::sleep(Duration::from_millis(5));
        }
    }

    pub(crate) fn close(mut self) {
        self.stop();
    }

    fn stop(&mut self) {
        if self.stopping.swap(true, Ordering::AcqRel) {
            return;
        }
        if let Some(monitor) = self.monitor.take() {
            let _ = monitor.join();
        }
    }
}

impl Drop for SharedSession {
    fn drop(&mut self) {
        self.stop();
    }
}

fn monitor_shared_memory(
    mapping: Arc<SharedMapping>,
    stopping: Arc<AtomicBool>,
    event_tx: Sender<SessionEvent>,
) {
    let shared = unsafe { &*mapping.view };
    let mut ready_sent = false;
    let mut fault_sent = false;
    let mut last_heartbeat = 0;
    let mut last_snapshot = 0;
    while !stopping.load(Ordering::Acquire) {
        let state = shared.payload_state.load(Ordering::Acquire);
        if state == PAYLOAD_STATE_READY && !ready_sent {
            ready_sent = true;
            let _ = event_tx.send(SessionEvent::Ready {
                payload_version: "0.1.0".to_owned(),
                capabilities: vec![
                    "capture_snapshot".to_owned(),
                    "capture_active_character".to_owned(),
                    "capture_inventory".to_owned(),
                    "return_to_title".to_owned(),
                    "switch_region".to_owned(),
                    "trigger_login".to_owned(),
                ],
            });
        }
        if state == PAYLOAD_STATE_FAULTED && !fault_sent {
            fault_sent = true;
            let _ = event_tx.send(SessionEvent::Fault {
                code: read_string(&shared.fatal_code),
                message: read_string(&shared.fatal_message),
                fatal: true,
            });
        }

        let heartbeat = shared.heartbeat.load(Ordering::Acquire);
        if heartbeat != last_heartbeat {
            last_heartbeat = heartbeat;
            let _ = event_tx.send(SessionEvent::Heartbeat(heartbeat));
        }
        let snapshot_sequence = shared.snapshot_sequence.load(Ordering::Acquire);
        if snapshot_sequence != 0 && snapshot_sequence != last_snapshot {
            last_snapshot = snapshot_sequence;
            let snapshot = unsafe { (*mapping.view).latest_snapshot };
            let _ = event_tx.send(SessionEvent::Snapshot(decode_snapshot(&snapshot)));
        }
        thread::sleep(Duration::from_millis(50));
    }
    let _ = event_tx.send(SessionEvent::Disconnected);
}

fn write_switch_region(
    output: &mut SharedSwitchRegion,
    target: &game_bridge_protocol::RegionTarget,
) -> BridgeResult<()> {
    output.region_name_length = copy_string(&target.region_name, &mut output.region_name)?;
    output.lobby_host_length = copy_string(&target.lobby_host, &mut output.lobby_host)?;
    output.save_data_host_length = copy_string(&target.save_data_host, &mut output.save_data_host)?;
    output.gm_host_length = copy_string(&target.gm_host, &mut output.gm_host)?;
    output.game_session_length =
        copy_string(target.game_session.expose(), &mut output.game_session)?;
    Ok(())
}

fn copy_string<const N: usize>(value: &str, output: &mut [u8; N]) -> BridgeResult<u32> {
    let bytes = value.as_bytes();
    if bytes.is_empty() || bytes.len() >= N {
        return Err(BridgeError::InvalidData(
            "shared-memory string is empty or too long".to_owned(),
        ));
    }
    output[..bytes.len()].copy_from_slice(bytes);
    Ok(bytes.len() as u32)
}

fn clear_command(shared: *mut SharedBridge) {
    unsafe {
        std::ptr::write_bytes(
            std::ptr::addr_of_mut!((*shared).command).cast::<u8>(),
            0,
            size_of::<SharedCommand>(),
        );
    }
}

fn decode_response(
    response: &SharedResponse,
    switched_region: Option<String>,
) -> BridgeResult<CommandResult> {
    if response.status == RESPONSE_ERROR {
        return Err(BridgeError::CommandRejected {
            code: read_string(&response.error_code),
            message: read_string(&response.error_message),
        });
    }
    if response.status != RESPONSE_SUCCESS {
        return Err(BridgeError::InvalidData(
            "shared response has invalid status".to_owned(),
        ));
    }
    match response.kind {
        COMMAND_CAPTURE_SNAPSHOT => Ok(CommandResult::Snapshot {
            snapshot: decode_snapshot(&response.snapshot),
        }),
        COMMAND_CAPTURE_ACTIVE_CHARACTER => Ok(CommandResult::ActiveCharacter {
            character: decode_active_character(&response.active_character),
        }),
        COMMAND_CAPTURE_INVENTORY => Ok(CommandResult::Inventory {
            inventory: decode_inventory(&response.inventory)?,
        }),
        COMMAND_SWITCH_REGION => Ok(CommandResult::RegionSwitched {
            region_name: switched_region.ok_or_else(|| {
                BridgeError::InvalidData("missing switched region name".to_owned())
            })?,
        }),
        COMMAND_SHUTDOWN => Ok(CommandResult::ShutdownReady),
        COMMAND_RETURN_TO_TITLE | COMMAND_TRIGGER_LOGIN => Ok(CommandResult::Ack),
        _ => Err(BridgeError::InvalidData(
            "shared response has invalid command kind".to_owned(),
        )),
    }
}

fn decode_snapshot(value: &SharedGameSnapshot) -> GameSnapshot {
    GameSnapshot {
        content_id: value.content_id.to_string(),
        character_name: read_string(&value.character_name),
        current_world_id: value.current_world_id,
        home_world_id: value.home_world_id,
        login_flags: value.login_flags,
        current_region: None,
        home_region: None,
        sequence: value.sequence,
    }
}

fn decode_active_character(value: &SharedActiveCharacter) -> ActiveCharacterSnapshot {
    ActiveCharacterSnapshot {
        content_id: value.content_id.to_string(),
        character_name: read_string(&value.character_name),
        entity_id: value.entity_id,
        current_world_id: value.current_world_id,
        home_world_id: value.home_world_id,
        current_region: None,
        home_region: None,
        class_job_id: value.class_job_id,
        level: value.level,
        current_hp: value.current_hp,
        max_hp: value.max_hp,
        current_mp: value.current_mp,
        max_mp: value.max_mp,
        position: Position3 {
            x: value.position.x,
            y: value.position.y,
            z: value.position.z,
        },
        territory_id: value.territory_id,
        territory_load_state: value.territory_load_state,
        connected_to_zone: value.connected_to_zone != 0,
    }
}

fn decode_inventory(value: &SharedInventorySnapshot) -> BridgeResult<PlayerInventorySnapshot> {
    let container_count = value.container_count as usize;
    let item_count = value.item_count as usize;
    let dresser_count = value.dresser_item_count as usize;
    if container_count > MAXIMUM_CONTAINERS
        || item_count > MAXIMUM_ITEMS
        || dresser_count > MAXIMUM_DRESSER_ITEMS
    {
        return Err(BridgeError::InvalidData(
            "shared inventory counts exceed ABI limits".to_owned(),
        ));
    }

    let mut containers = Vec::with_capacity(container_count);
    for container in &value.containers[..container_count] {
        let start = container.item_start as usize;
        let count = container.item_count as usize;
        if start > item_count || count > item_count - start {
            return Err(BridgeError::InvalidData(
                "shared inventory container range is invalid".to_owned(),
            ));
        }
        let items = value.items[start..start + count]
            .iter()
            .map(|item| InventoryItemSnapshot {
                inventory_type: item.inventory_type,
                slot: item.slot,
                item_id: item.item_id,
                quantity: item.quantity,
                spiritbond_or_collectability: item.spiritbond_or_collectability,
                condition: item.condition,
                flags: item.flags,
                glamour_id: item.glamour_id,
                stains: item.stains,
                materia: item.materia,
                materia_grades: item.materia_grades,
                is_symbolic: item.is_symbolic != 0,
                linked_inventory_type: (item.is_symbolic != 0)
                    .then_some(item.linked_inventory_type),
                linked_slot: (item.is_symbolic != 0).then_some(item.linked_slot),
            })
            .collect();
        containers.push(InventoryContainerSnapshot {
            name: read_string(&container.name),
            inventory_type: container.inventory_type,
            loaded: container.loaded != 0,
            size: container.size,
            items,
        });
    }

    let glamour_dresser = GlamourDresserSnapshot {
        cached: value.dresser_cached != 0,
        may_be_stale: value.dresser_may_be_stale != 0,
        items: value.dresser_items[..dresser_count]
            .iter()
            .map(|item| GlamourDresserItemSnapshot {
                slot: item.slot,
                item_id: item.item_id,
                set_unlock_bits: item.set_unlock_bits,
            })
            .collect(),
    };
    Ok(PlayerInventorySnapshot {
        containers,
        glamour_dresser,
    })
}

fn read_string(bytes: &[u8]) -> String {
    let length = bytes
        .iter()
        .position(|value| *value == 0)
        .unwrap_or(bytes.len());
    String::from_utf8_lossy(&bytes[..length]).into_owned()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeManifest {
    schema_version: u32,
    private_layout_verified: bool,
    game_version: String,
    module: RuntimeModule,
    functions: HashMap<String, RuntimeFunction>,
    layout: serde_json::Map<String, serde_json::Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeModule {
    name: String,
    text_sha256: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeFunction {
    pattern: String,
    resolve: String,
    #[serde(default)]
    offset: usize,
    #[serde(default)]
    next_instruction: usize,
}

struct PeImage {
    image_size: usize,
    text_rva: usize,
    raw_text: Vec<u8>,
    scan_text: Vec<u8>,
}

fn resolve_game_api(manifest_path: &Path, process_id: u32) -> BridgeResult<SharedGameApi> {
    let manifest: RuntimeManifest = serde_json::from_slice(&fs::read(manifest_path)?)?;
    if manifest.schema_version != 4 {
        return Err(BridgeError::InvalidData(format!(
            "unsupported manifest schema: {}",
            manifest.schema_version
        )));
    }
    let module = crate::process::target_module_info(process_id)?;
    let module_name = module
        .path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| BridgeError::InvalidData("invalid game executable path".to_owned()))?;
    if !module_name.eq_ignore_ascii_case(&manifest.module.name) {
        return Err(BridgeError::InvalidData(
            "manifest module name does not match the target process".to_owned(),
        ));
    }
    let version_path = module.path.with_file_name("ffxivgame.ver");
    let game_version = fs::read_to_string(version_path)?.trim().to_owned();
    if game_version != manifest.game_version {
        return Err(BridgeError::InvalidData(format!(
            "game version mismatch: expected={}, actual={game_version}",
            manifest.game_version
        )));
    }

    let image = parse_pe_image(&fs::read(&module.path)?)?;
    if image.image_size != module.image_size {
        return Err(BridgeError::InvalidData(
            "mapped image size does not match the executable".to_owned(),
        ));
    }
    let text_hash = format!("{:x}", Sha256::digest(&image.raw_text));
    if !text_hash.eq_ignore_ascii_case(&manifest.module.text_sha256) {
        return Err(BridgeError::InvalidData(
            "executable text hash does not match the manifest".to_owned(),
        ));
    }

    let resolve = |name: &str| -> BridgeResult<u64> {
        let spec = manifest.functions.get(name).ok_or_else(|| {
            BridgeError::InvalidData(format!("missing manifest function: {name}"))
        })?;
        let rva = resolve_function_rva(&image, spec)?;
        module
            .base_address
            .checked_add(rva)
            .map(|value| value as u64)
            .ok_or_else(|| BridgeError::InvalidData("resolved address overflow".to_owned()))
    };

    let mut api: SharedGameApi = unsafe { std::mem::zeroed() };
    api.private_layout_verified = manifest.private_layout_verified as u32;
    api.framework_instance_slot = resolve("frameworkInstance")?;
    api.local_player_slot = resolve("localPlayer")?;
    api.game_main_instance = resolve("gameMain")?;
    api.inventory_manager_instance = resolve("inventoryManager")?;
    api.get_inventory_container = resolve("getInventoryContainer")?;
    api.get_ui_module = resolve("getUiModule")?;
    api.get_agent_by_internal_id = resolve("getAgentByInternalId")?;
    api.utf8_set_string = resolve("utf8SetString")?;
    api.release_lobby_context = resolve("releaseLobbyContext")?;
    api.return_to_title = resolve("returnToTitle")?;
    api.get_addon_by_name = resolve("getAddonByName")?;
    api.get_component_button_by_id = resolve("getComponentButtonById")?;

    macro_rules! layout {
        ($field:ident, $name:literal) => {
            api.layout.$field = read_layout(&manifest.layout, $name)?;
        };
    }
    layout!(framework_tick_vtable_index, "frameworkTickVtableIndex");
    layout!(
        framework_network_module_proxy,
        "frameworkNetworkModuleProxy"
    );
    layout!(framework_dev_config, "frameworkDevConfig");
    layout!(
        network_module_proxy_network_module,
        "networkModuleProxyNetworkModule"
    );
    layout!(network_lobby_hosts, "networkLobbyHosts");
    layout!(network_save_data_bank_host, "networkSaveDataBankHost");
    layout!(network_active_lobby_host, "networkActiveLobbyHost");
    layout!(agent_lobby_data, "agentLobbyData");
    layout!(agent_game_session, "agentGameSession");
    layout!(
        agent_selected_character_index,
        "agentSelectedCharacterIndex"
    );
    layout!(agent_selected_content_id, "agentSelectedContentId");
    layout!(lobby_entries_vector, "lobbyEntriesVector");
    layout!(lobby_ui_client, "lobbyUiClient");
    layout!(lobby_context, "lobbyContext");
    layout!(lobby_state, "lobbyState");
    layout!(entry_content_id, "entryContentId");
    layout!(entry_login_flags, "entryLoginFlags");
    layout!(entry_current_world_id, "entryCurrentWorldId");
    layout!(entry_home_world_id, "entryHomeWorldId");
    layout!(entry_name, "entryName");
    layout!(entry_name_capacity, "entryNameCapacity");
    layout!(config_count, "configCount");
    layout!(config_entries, "configEntries");
    layout!(config_entry_size, "configEntrySize");
    layout!(config_entry_name, "configEntryName");
    layout!(config_entry_value, "configEntryValue");
    layout!(rapture_atk_unit_manager, "raptureAtkUnitManager");
    layout!(component_res_node, "componentResNode");
    layout!(res_node_event, "resNodeEvent");
    layout!(receive_event_vtable_index, "receiveEventVtableIndex");
    layout!(active_character_name, "activeCharacterName");
    layout!(
        active_character_name_capacity,
        "activeCharacterNameCapacity"
    );
    layout!(active_character_entity_id, "activeCharacterEntityId");
    layout!(active_character_position, "activeCharacterPosition");
    layout!(active_character_data, "activeCharacterData");
    layout!(active_character_health, "activeCharacterHealth");
    layout!(active_character_max_health, "activeCharacterMaxHealth");
    layout!(active_character_mana, "activeCharacterMana");
    layout!(active_character_max_mana, "activeCharacterMaxMana");
    layout!(active_character_class_job, "activeCharacterClassJob");
    layout!(active_character_level, "activeCharacterLevel");
    layout!(active_character_content_id, "activeCharacterContentId");
    layout!(
        active_character_current_world,
        "activeCharacterCurrentWorld"
    );
    layout!(active_character_home_world, "activeCharacterHomeWorld");
    layout!(game_main_connected_to_zone, "gameMainConnectedToZone");
    layout!(game_main_territory_load_state, "gameMainTerritoryLoadState");
    layout!(game_main_current_territory, "gameMainCurrentTerritory");
    layout!(
        get_item_finder_module_vtable_index,
        "getItemFinderModuleVtableIndex"
    );
    layout!(inventory_container_items, "inventoryContainerItems");
    layout!(inventory_container_type, "inventoryContainerType");
    layout!(inventory_container_size, "inventoryContainerSize");
    layout!(inventory_container_loaded, "inventoryContainerLoaded");
    layout!(inventory_item_size, "inventoryItemSize");
    layout!(inventory_item_container, "inventoryItemContainer");
    layout!(inventory_item_slot, "inventoryItemSlot");
    layout!(inventory_item_symbolic, "inventoryItemSymbolic");
    layout!(inventory_item_id, "inventoryItemId");
    layout!(inventory_item_linked_slot, "inventoryItemLinkedSlot");
    layout!(inventory_item_linked_type, "inventoryItemLinkedType");
    layout!(inventory_item_quantity, "inventoryItemQuantity");
    layout!(inventory_item_spiritbond, "inventoryItemSpiritbond");
    layout!(inventory_item_condition, "inventoryItemCondition");
    layout!(inventory_item_flags, "inventoryItemFlags");
    layout!(inventory_item_materia, "inventoryItemMateria");
    layout!(inventory_item_materia_grades, "inventoryItemMateriaGrades");
    layout!(inventory_item_stains, "inventoryItemStains");
    layout!(inventory_item_glamour_id, "inventoryItemGlamourId");
    layout!(item_finder_glamour_cached, "itemFinderGlamourCached");
    layout!(item_finder_glamour_item_ids, "itemFinderGlamourItemIds");
    layout!(
        item_finder_glamour_unlock_bits,
        "itemFinderGlamourUnlockBits"
    );
    layout!(item_finder_glamour_capacity, "itemFinderGlamourCapacity");
    Ok(api)
}

fn read_layout(
    layout: &serde_json::Map<String, serde_json::Value>,
    name: &str,
) -> BridgeResult<u32> {
    let value = layout
        .get(name)
        .ok_or_else(|| BridgeError::InvalidData(format!("missing layout field: {name}")))?;
    if let Some(number) = value.as_u64() {
        return u32::try_from(number)
            .map_err(|_| BridgeError::InvalidData(format!("layout field is too large: {name}")));
    }
    let text = value
        .as_str()
        .ok_or_else(|| BridgeError::InvalidData(format!("invalid layout field: {name}")))?;
    let number = if let Some(hex) = text.strip_prefix("0x").or_else(|| text.strip_prefix("0X")) {
        u64::from_str_radix(hex, 16)
    } else {
        text.parse::<u64>()
    }
    .map_err(|_| BridgeError::InvalidData(format!("invalid layout value: {name}")))?;
    u32::try_from(number)
        .map_err(|_| BridgeError::InvalidData(format!("layout field is too large: {name}")))
}

fn parse_pe_image(bytes: &[u8]) -> BridgeResult<PeImage> {
    if read_u16(bytes, 0, "DOS signature")? != 0x5A4D {
        return Err(BridgeError::InvalidData("invalid DOS signature".to_owned()));
    }
    let pe_offset = read_u32(bytes, 0x3C, "PE offset")? as usize;
    if read_u32(bytes, pe_offset, "PE signature")? != 0x0000_4550
        || read_u16(bytes, pe_offset + 4, "machine")? != 0x8664
    {
        return Err(BridgeError::InvalidData(
            "invalid Windows x64 PE image".to_owned(),
        ));
    }
    let section_count = read_u16(bytes, pe_offset + 6, "section count")? as usize;
    let optional_size = read_u16(bytes, pe_offset + 20, "optional header size")? as usize;
    let optional_offset = pe_offset + 24;
    if read_u16(bytes, optional_offset, "optional header magic")? != 0x020B {
        return Err(BridgeError::InvalidData(
            "invalid PE32+ optional header".to_owned(),
        ));
    }
    let image_size = read_u32(bytes, optional_offset + 56, "image size")? as usize;
    let section_table = optional_offset
        .checked_add(optional_size)
        .ok_or_else(|| BridgeError::InvalidData("section table overflow".to_owned()))?;
    checked_range(bytes, section_table, section_count * 40, "section table")?;

    for index in 0..section_count {
        let offset = section_table + index * 40;
        let name_end = bytes[offset..offset + 8]
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(8);
        if &bytes[offset..offset + name_end] != b".text" {
            continue;
        }
        let virtual_size = read_u32(bytes, offset + 8, "text virtual size")? as usize;
        let text_rva = read_u32(bytes, offset + 12, "text RVA")? as usize;
        let raw_size = read_u32(bytes, offset + 16, "text raw size")? as usize;
        let raw_offset = read_u32(bytes, offset + 20, "text raw offset")? as usize;
        checked_range(bytes, raw_offset, raw_size, "text raw data")?;
        if raw_size == 0 || virtual_size == 0 {
            return Err(BridgeError::InvalidData("empty text section".to_owned()));
        }
        let raw_text = bytes[raw_offset..raw_offset + raw_size].to_vec();
        let mut scan_text = vec![0; virtual_size];
        let copy_length = raw_size.min(virtual_size);
        scan_text[..copy_length].copy_from_slice(&raw_text[..copy_length]);
        return Ok(PeImage {
            image_size,
            text_rva,
            raw_text,
            scan_text,
        });
    }
    Err(BridgeError::InvalidData(
        "text section not found".to_owned(),
    ))
}

fn resolve_function_rva(image: &PeImage, spec: &RuntimeFunction) -> BridgeResult<usize> {
    let pattern = parse_pattern(&spec.pattern)?;
    if pattern.len() > image.scan_text.len() {
        return Err(BridgeError::InvalidData(
            "signature is too large".to_owned(),
        ));
    }
    let mut match_offset = None;
    for offset in 0..=image.scan_text.len() - pattern.len() {
        if pattern.iter().enumerate().all(|(index, value)| {
            value.is_none() || value == &Some(image.scan_text[offset + index])
        }) {
            if match_offset.replace(offset).is_some() {
                return Err(BridgeError::InvalidData(
                    "signature matched more than once".to_owned(),
                ));
            }
        }
    }
    let match_offset = match_offset
        .ok_or_else(|| BridgeError::InvalidData("signature did not match".to_owned()))?;
    let match_rva = image.text_rva + match_offset;
    let resolved = match spec.resolve.as_str() {
        "direct" => match_rva.checked_add(spec.offset),
        "relative32" | "rip_relative" => {
            let displacement_offset = match_offset.checked_add(spec.offset).ok_or_else(|| {
                BridgeError::InvalidData("signature displacement overflow".to_owned())
            })?;
            let displacement = read_i32(&image.scan_text, displacement_offset, "displacement")?;
            let base = match_rva
                .checked_add(spec.next_instruction)
                .ok_or_else(|| BridgeError::InvalidData("signature target overflow".to_owned()))?;
            if displacement >= 0 {
                base.checked_add(displacement as usize)
            } else {
                base.checked_sub(displacement.unsigned_abs() as usize)
            }
        }
        _ => {
            return Err(BridgeError::InvalidData(format!(
                "unsupported resolve kind: {}",
                spec.resolve
            )))
        }
    }
    .ok_or_else(|| BridgeError::InvalidData("signature target overflow".to_owned()))?;
    if resolved >= image.image_size {
        return Err(BridgeError::InvalidData(
            "signature resolved outside the image".to_owned(),
        ));
    }
    Ok(resolved)
}

fn parse_pattern(text: &str) -> BridgeResult<Vec<Option<u8>>> {
    text.split_whitespace()
        .map(|token| {
            if token == "?" || token == "??" {
                Ok(None)
            } else if token.len() == 2 {
                u8::from_str_radix(token, 16).map(Some).map_err(|_| {
                    BridgeError::InvalidData(format!("invalid signature token: {token}"))
                })
            } else {
                Err(BridgeError::InvalidData(format!(
                    "invalid signature token: {token}"
                )))
            }
        })
        .collect()
}

fn checked_range(bytes: &[u8], offset: usize, length: usize, label: &str) -> BridgeResult<()> {
    if offset > bytes.len() || length > bytes.len() - offset {
        return Err(BridgeError::InvalidData(format!(
            "{label} is outside the executable"
        )));
    }
    Ok(())
}

fn read_u16(bytes: &[u8], offset: usize, label: &str) -> BridgeResult<u16> {
    checked_range(bytes, offset, 2, label)?;
    Ok(u16::from_le_bytes([bytes[offset], bytes[offset + 1]]))
}

fn read_u32(bytes: &[u8], offset: usize, label: &str) -> BridgeResult<u32> {
    checked_range(bytes, offset, 4, label)?;
    Ok(u32::from_le_bytes(
        bytes[offset..offset + 4].try_into().expect("fixed slice"),
    ))
}

fn read_i32(bytes: &[u8], offset: usize, label: &str) -> BridgeResult<i32> {
    checked_range(bytes, offset, 4, label)?;
    Ok(i32::from_le_bytes(
        bytes[offset..offset + 4].try_into().expect("fixed slice"),
    ))
}
