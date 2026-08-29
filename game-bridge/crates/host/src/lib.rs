//! Desktop-side process control, IPC monitoring, and semantic game commands.

mod error;
mod manager;
mod world_map;

#[cfg(windows)]
mod injector;
#[cfg(windows)]
mod ipc;
#[cfg(windows)]
mod process;

pub use error::{BridgeError, BridgeResult};
pub use game_bridge_protocol::{
    ActiveCharacterSnapshot, Command, CommandError, CommandResult, GameSnapshot, Position3,
    RegionTarget, SecretValue,
};
pub use manager::{BridgeManager, BridgePhase, BridgeStatus, ConnectOptions};
