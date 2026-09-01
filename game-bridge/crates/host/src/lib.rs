//! Desktop-side process control, IPC monitoring, and semantic game commands.

mod error;
mod manager;
mod world_map;

#[cfg(windows)]
mod injector;
#[cfg(windows)]
mod process;
#[cfg(windows)]
mod shared_memory;

pub use error::{BridgeError, BridgeResult};
pub use game_bridge_protocol::{
    ActiveCharacterSnapshot, Command, CommandResult, GameScreen, GameSnapshot, GameStateSnapshot,
    GlamourDresserItemSnapshot, GlamourDresserSnapshot, InventoryContainerSnapshot,
    InventoryItemSnapshot, PlayerInventorySnapshot, Position3, RegionTarget, SecretValue,
};
pub use manager::{BridgeManager, BridgePhase, BridgeStatus, ConnectOptions};
