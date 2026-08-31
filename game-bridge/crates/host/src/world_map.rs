//! Build-time world metadata used to enrich raw game snapshots outside the game process.

#[cfg(windows)]
use crate::{BridgeError, BridgeResult};
use game_bridge_protocol::{ActiveCharacterSnapshot, GameSnapshot};
#[cfg(windows)]
use serde::Deserialize;
use std::collections::HashMap;
#[cfg(windows)]
use std::fs;
#[cfg(windows)]
use std::path::Path;

#[derive(Default)]
pub(crate) struct WorldMap {
    regions: HashMap<u16, String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg(windows)]
struct WorldMapFile {
    schema_version: u32,
    worlds: HashMap<String, WorldEntry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg(windows)]
struct WorldEntry {
    region_name: String,
}

impl WorldMap {
    #[cfg(windows)]
    pub(crate) fn load(path: &Path) -> BridgeResult<Self> {
        let bytes = fs::read(path)?;
        let file: WorldMapFile = serde_json::from_slice(&bytes)?;
        if file.schema_version != 1 {
            return Err(BridgeError::InvalidData(format!(
                "unsupported world map schema: {}",
                file.schema_version
            )));
        }

        let mut regions = HashMap::with_capacity(file.worlds.len());
        for (world_id, entry) in file.worlds {
            let world_id = world_id.parse::<u16>().map_err(|_| {
                BridgeError::InvalidData(format!("invalid world id in world map: {world_id}"))
            })?;
            if entry.region_name.trim().is_empty() {
                return Err(BridgeError::InvalidData(format!(
                    "empty region name for world id: {world_id}"
                )));
            }
            regions.insert(world_id, entry.region_name);
        }
        Ok(Self { regions })
    }

    pub(crate) fn enrich(&self, snapshot: &mut GameSnapshot) {
        snapshot.current_region = self.regions.get(&snapshot.current_world_id).cloned();
        snapshot.home_region = self.regions.get(&snapshot.home_world_id).cloned();
    }

    pub(crate) fn enrich_active(&self, snapshot: &mut ActiveCharacterSnapshot) {
        snapshot.current_region = self.regions.get(&snapshot.current_world_id).cloned();
        snapshot.home_region = self.regions.get(&snapshot.home_world_id).cloned();
    }
}
