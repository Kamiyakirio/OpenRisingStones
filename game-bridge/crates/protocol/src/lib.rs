//! Versioned wire types shared by the desktop host and the native payload.

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;
use zeroize::Zeroize;

pub const PROTOCOL_VERSION: u32 = 2;
pub const MAX_FRAME_SIZE: usize = 1024 * 1024;
pub const PAYLOAD_VERSION: &str = env!("CARGO_PKG_VERSION");

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
    ReturnToTitle,
    SwitchRegion { target: RegionTarget },
    TriggerLogin,
    Shutdown,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum HostMessage {
    HelloAck {
        #[serde(rename = "protocolVersion")]
        protocol_version: u32,
    },
    Command {
        #[serde(rename = "requestId")]
        request_id: u64,
        command: Command,
    },
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
    RegionSwitched {
        #[serde(rename = "regionName")]
        region_name: String,
    },
    ShutdownReady,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PayloadMessage {
    Hello {
        #[serde(rename = "protocolVersion")]
        protocol_version: u32,
        #[serde(rename = "payloadVersion")]
        payload_version: String,
        #[serde(rename = "authToken")]
        auth_token: String,
        capabilities: Vec<String>,
    },
    Snapshot {
        snapshot: GameSnapshot,
    },
    Response {
        #[serde(rename = "requestId")]
        request_id: u64,
        result: Option<CommandResult>,
        error: Option<CommandError>,
    },
    Heartbeat {
        sequence: u64,
    },
    Fault {
        code: String,
        message: String,
        fatal: bool,
    },
}

/// Serializes a fixed authentication token without allocating intermediate data.
pub fn encode_token(token: &[u8; 32]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut encoded = String::with_capacity(token.len() * 2);
    for value in token {
        encoded.push(HEX[(value >> 4) as usize] as char);
        encoded.push(HEX[(value & 0x0f) as usize] as char);
    }
    encoded
}

/// Prevents accidental deserialization of a non-string secret in custom adapters.
pub fn deserialize_secret<'de, D>(deserializer: D) -> Result<SecretValue, D::Error>
where
    D: Deserializer<'de>,
{
    String::deserialize(deserializer).map(SecretValue::new)
}

/// Provides an explicit serializer for callers that avoid deriving protocol wrappers.
pub fn serialize_secret<S>(secret: &SecretValue, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(secret.expose())
}
