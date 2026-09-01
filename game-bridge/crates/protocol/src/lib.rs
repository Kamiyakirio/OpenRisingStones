//! Versioned wire types shared by the desktop host and the native payload.

use serde::{Deserialize, Serialize};
use std::fmt;
use zeroize::Zeroize;

/// A serialized secret that is always redacted from debug output and cleared on drop.
#[derive(Deserialize, Serialize)]
#[serde(transparent)]
pub struct SecretValue(String);

impl SecretValue {
    pub fn new(value: String) -> Self {
        Self(value)
    }

    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for SecretValue {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("[redacted]")
    }
}

impl Drop for SecretValue {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSnapshot {
    pub content_id: String,
    pub character_name: String,
    pub current_world_id: u16,
    pub home_world_id: u16,
    pub login_flags: u8,
    pub current_region: Option<String>,
    pub home_region: Option<String>,
    pub sequence: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Position3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveCharacterSnapshot {
    pub content_id: String,
    pub character_name: String,
    pub entity_id: u32,
    pub current_world_id: u16,
    pub home_world_id: u16,
    pub current_region: Option<String>,
    pub home_region: Option<String>,
    pub class_job_id: u8,
    pub level: u8,
    pub current_hp: u32,
    pub max_hp: u32,
    pub current_mp: u32,
    pub max_mp: u32,
    pub position: Position3,
    pub territory_id: u32,
    pub territory_load_state: u32,
    pub connected_to_zone: bool,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum GameScreen {
    InWorld,
    LoggingOut,
    CharacterSelect,
    Title,
    Loading,
    Unknown,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStateSnapshot {
    pub screen: GameScreen,
    pub logged_in: bool,
    pub logged_into_zone: bool,
    pub connected_to_zone: bool,
    pub region_switch_supported: bool,
    pub territory_load_state: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItemSnapshot {
    pub inventory_type: u32,
    pub slot: i16,
    pub item_id: u32,
    pub quantity: i32,
    pub spiritbond_or_collectability: u16,
    pub condition: u16,
    pub flags: u8,
    pub glamour_id: u32,
    pub stains: [u8; 2],
    pub materia: [u16; 5],
    pub materia_grades: [u8; 5],
    pub is_symbolic: bool,
    pub linked_inventory_type: Option<u16>,
    pub linked_slot: Option<u16>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryContainerSnapshot {
    pub name: String,
    pub inventory_type: u32,
    pub loaded: bool,
    pub size: i32,
    pub items: Vec<InventoryItemSnapshot>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlamourDresserItemSnapshot {
    pub slot: u16,
    pub item_id: u32,
    pub set_unlock_bits: u16,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlamourDresserSnapshot {
    pub cached: bool,
    pub may_be_stale: bool,
    pub items: Vec<GlamourDresserItemSnapshot>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerInventorySnapshot {
    pub containers: Vec<InventoryContainerSnapshot>,
    pub glamour_dresser: GlamourDresserSnapshot,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegionTarget {
    pub region_name: String,
    pub lobby_host: String,
    pub save_data_host: String,
    pub gm_host: String,
    pub game_session: SecretValue,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Command {
    CaptureSnapshot,
    CaptureActiveCharacter,
    CaptureInventory,
    CaptureGameState,
    LogoutToTitle,
    ReturnToTitle,
    SwitchRegion { target: RegionTarget },
    TriggerLogin,
    Shutdown,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CommandResult {
    Ack,
    Snapshot {
        snapshot: GameSnapshot,
    },
    ActiveCharacter {
        character: ActiveCharacterSnapshot,
    },
    Inventory {
        inventory: PlayerInventorySnapshot,
    },
    GameState {
        state: GameStateSnapshot,
    },
    RegionSwitched {
        #[serde(rename = "regionName")]
        region_name: String,
    },
    ShutdownReady,
}
