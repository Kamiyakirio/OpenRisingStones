//! Login-bound encrypted persistence for the active character's owned item index.

#[cfg(all(test, not(windows)))]
use std::time::{SystemTime, UNIX_EPOCH};
#[cfg(windows)]
use std::{
  collections::{BTreeMap, BTreeSet},
  time::{SystemTime, UNIX_EPOCH},
};
use std::{fs, path::Path};

use aes_gcm::{
  aead::{Aead, KeyInit, Payload},
  Aes256Gcm, Nonce,
};
#[cfg(windows)]
use game_bridge_host::{ActiveCharacterSnapshot, PlayerInventorySnapshot};
use hkdf::Hkdf;
#[cfg(any(windows, test))]
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use tauri::State;
use zeroize::Zeroizing;

use crate::sdo_login::{self, LoginCacheContext, LoginState};

const CACHE_MAGIC: &[u8; 8] = b"ORSINV01";
const CACHE_SCHEMA_VERSION: u32 = 1;
const CACHE_SALT_BYTES: usize = 16;
const CACHE_NONCE_BYTES: usize = 12;
const CACHE_KEY_BYTES: usize = 32;
const CACHE_HEADER_BYTES: usize = CACHE_MAGIC.len() + CACHE_SALT_BYTES + CACHE_NONCE_BYTES;
const MAX_CACHE_BYTES: u64 = 2 * 1024 * 1024;
const CACHE_KDF_INFO: &[u8] = b"OpenRisingStones.OwnedItems.v1";

#[derive(Clone, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum OwnedItemSource {
  Equipped,
  Inventory,
  ArmouryChest,
  GlamourDresser,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedItemRecord {
  item_id: u32,
  sources: Vec<OwnedItemSource>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedItemsCharacter {
  content_id: String,
  character_name: String,
  current_world_id: u16,
  home_world_id: u16,
  current_region: Option<String>,
  home_region: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheCoverage {
  loaded: bool,
  may_be_stale: bool,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedArmoireCache {
  cached: bool,
  may_be_stale: bool,
  cabinet_item_ids: Vec<u16>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedItemsSnapshot {
  schema_version: u32,
  character: OwnedItemsCharacter,
  captured_at_unix_ms: u64,
  items: Vec<OwnedItemRecord>,
  inventory: CacheCoverage,
  armoury_chest: CacheCoverage,
  glamour_dresser: CacheCoverage,
  armoire: OwnedArmoireCache,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PersistedOwnedItems {
  account_scope: String,
  snapshot: OwnedItemsSnapshot,
}

/// Loads a cache only after the matching authenticated login has been restored.
#[tauri::command]
pub fn load_owned_items_cache(
  login_state: State<'_, LoginState>,
) -> Result<Option<OwnedItemsSnapshot>, String> {
  let Some(path) = login_state.owned_items_path() else {
    return Ok(None);
  };
  if !path.is_file() {
    return Ok(None);
  }
  let context = sdo_login::current_cache_context(&login_state)?;
  // Authentication failures are indistinguishable from obsolete or corrupt cache files.
  Ok(load_encrypted_cache(path, &context).ok().flatten())
}

#[cfg(windows)]
pub(crate) fn build_owned_items_snapshot(
  character: ActiveCharacterSnapshot,
  inventory: PlayerInventorySnapshot,
) -> Result<OwnedItemsSnapshot, String> {
  let mut items = BTreeMap::<u32, BTreeSet<OwnedItemSource>>::new();
  for container in &inventory.containers {
    if !container.loaded {
      continue;
    }
    let source = match container.name.as_str() {
      "equipped" => OwnedItemSource::Equipped,
      name if name.starts_with("inventory_") => OwnedItemSource::Inventory,
      name if name.starts_with("armory_") => OwnedItemSource::ArmouryChest,
      _ => continue,
    };
    for item in &container.items {
      add_owned_item(&mut items, item.item_id, source.clone());
    }
  }
  if inventory.glamour_dresser.cached {
    for item in &inventory.glamour_dresser.items {
      add_owned_item(&mut items, item.item_id, OwnedItemSource::GlamourDresser);
    }
  }

  let inventory_loaded = ["inventory_1", "inventory_2", "inventory_3", "inventory_4"]
    .iter()
    .all(|name| container_loaded(&inventory, name));
  let armoury_chest_loaded = inventory
    .containers
    .iter()
    .filter(|container| container.name.starts_with("armory_"))
    .all(|container| container.loaded);
  let captured_at_unix_ms = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|_| "The system clock cannot timestamp the owned-item cache.".to_owned())?
    .as_millis()
    .try_into()
    .map_err(|_| "The owned-item cache timestamp is too large.".to_owned())?;

  Ok(OwnedItemsSnapshot {
    schema_version: CACHE_SCHEMA_VERSION,
    character: OwnedItemsCharacter {
      content_id: character.content_id,
      character_name: character.character_name,
      current_world_id: character.current_world_id,
      home_world_id: character.home_world_id,
      current_region: character.current_region,
      home_region: character.home_region,
    },
    captured_at_unix_ms,
    items: items
      .into_iter()
      .map(|(item_id, sources)| OwnedItemRecord {
        item_id,
        sources: sources.into_iter().collect(),
      })
      .collect(),
    inventory: CacheCoverage {
      loaded: inventory_loaded,
      may_be_stale: false,
    },
    armoury_chest: CacheCoverage {
      loaded: armoury_chest_loaded,
      may_be_stale: false,
    },
    glamour_dresser: CacheCoverage {
      loaded: inventory.glamour_dresser.cached,
      may_be_stale: inventory.glamour_dresser.may_be_stale,
    },
    armoire: OwnedArmoireCache {
      cached: inventory.armoire.cached,
      may_be_stale: inventory.armoire.may_be_stale,
      cabinet_item_ids: inventory.armoire.cabinet_item_ids,
    },
  })
}

#[cfg(windows)]
pub(crate) fn save_owned_items_snapshot(
  login_state: &LoginState,
  context: &LoginCacheContext,
  snapshot: &OwnedItemsSnapshot,
) -> Result<(), String> {
  let Some(path) = login_state.owned_items_path() else {
    return Ok(());
  };
  save_encrypted_cache(path, context, snapshot)
}

#[cfg(windows)]
fn add_owned_item(
  items: &mut BTreeMap<u32, BTreeSet<OwnedItemSource>>,
  item_id: u32,
  source: OwnedItemSource,
) {
  if item_id > 0 {
    items.entry(item_id).or_default().insert(source);
  }
}

#[cfg(windows)]
fn container_loaded(inventory: &PlayerInventorySnapshot, name: &str) -> bool {
  inventory
    .containers
    .iter()
    .any(|container| container.name == name && container.loaded)
}

#[cfg(any(windows, test))]
fn save_encrypted_cache(
  path: &Path,
  context: &LoginCacheContext,
  snapshot: &OwnedItemsSnapshot,
) -> Result<(), String> {
  let persisted = PersistedOwnedItems {
    account_scope: context.account_scope.clone(),
    snapshot: snapshot.clone(),
  };
  let plaintext = Zeroizing::new(
    serde_json::to_vec(&persisted)
      .map_err(|_| "Unable to serialize the owned-item cache.".to_owned())?,
  );
  let mut salt = [0_u8; CACHE_SALT_BYTES];
  let mut nonce = [0_u8; CACHE_NONCE_BYTES];
  OsRng.fill_bytes(&mut salt);
  OsRng.fill_bytes(&mut nonce);
  let key = Zeroizing::new(derive_cache_key(&context.key_material, &salt)?);
  let cipher = Aes256Gcm::new_from_slice(key.as_ref())
    .map_err(|_| "Unable to initialize owned-item encryption.".to_owned())?;
  let encrypted = cipher
    .encrypt(
      Nonce::from_slice(&nonce),
      Payload {
        msg: plaintext.as_slice(),
        aad: CACHE_MAGIC,
      },
    )
    .map_err(|_| "Unable to encrypt the owned-item cache.".to_owned());
  let encrypted = encrypted?;

  let mut output = Vec::with_capacity(CACHE_HEADER_BYTES + encrypted.len());
  output.extend_from_slice(CACHE_MAGIC);
  output.extend_from_slice(&salt);
  output.extend_from_slice(&nonce);
  output.extend_from_slice(&encrypted);
  let parent = path
    .parent()
    .ok_or_else(|| "The owned-item cache path is invalid.".to_owned())?;
  fs::create_dir_all(parent)
    .map_err(|_| "Unable to prepare owned-item cache storage.".to_owned())?;
  fs::write(path, output).map_err(|_| "Unable to save the owned-item cache.".to_owned())
}

fn load_encrypted_cache(
  path: &Path,
  context: &LoginCacheContext,
) -> Result<Option<OwnedItemsSnapshot>, String> {
  let metadata = match fs::metadata(path) {
    Ok(metadata) => metadata,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
    Err(_) => return Err("Unable to inspect the owned-item cache.".to_owned()),
  };
  if metadata.len() < CACHE_HEADER_BYTES as u64 || metadata.len() > MAX_CACHE_BYTES {
    return Err("The owned-item cache size is invalid.".to_owned());
  }
  let encrypted = fs::read(path).map_err(|_| "Unable to read the owned-item cache.".to_owned())?;
  if encrypted.get(..CACHE_MAGIC.len()) != Some(CACHE_MAGIC) {
    return Err("The owned-item cache header is invalid.".to_owned());
  }
  let salt_start = CACHE_MAGIC.len();
  let nonce_start = salt_start + CACHE_SALT_BYTES;
  let ciphertext_start = nonce_start + CACHE_NONCE_BYTES;
  let salt = &encrypted[salt_start..nonce_start];
  let nonce = &encrypted[nonce_start..ciphertext_start];
  let key = Zeroizing::new(derive_cache_key(&context.key_material, salt)?);
  let cipher = Aes256Gcm::new_from_slice(key.as_ref())
    .map_err(|_| "Unable to initialize owned-item decryption.".to_owned())?;
  let decrypted = cipher.decrypt(
    Nonce::from_slice(nonce),
    Payload {
      msg: &encrypted[ciphertext_start..],
      aad: CACHE_MAGIC,
    },
  );
  let plaintext = Zeroizing::new(
    decrypted.map_err(|_| "The owned-item cache cannot be authenticated.".to_owned())?,
  );
  let parsed = serde_json::from_slice::<PersistedOwnedItems>(&plaintext)
    .map_err(|_| "The owned-item cache payload is invalid.".to_owned());
  let persisted = parsed?;
  if persisted.account_scope != context.account_scope
    || persisted.snapshot.schema_version != CACHE_SCHEMA_VERSION
  {
    return Err("The owned-item cache belongs to another login scope.".to_owned());
  }
  Ok(Some(persisted.snapshot))
}

fn derive_cache_key(key_material: &[u8], salt: &[u8]) -> Result<[u8; CACHE_KEY_BYTES], String> {
  let hkdf = Hkdf::<Sha256>::new(Some(salt), key_material);
  let mut key = [0_u8; CACHE_KEY_BYTES];
  hkdf
    .expand(CACHE_KDF_INFO, &mut key)
    .map_err(|_| "Unable to derive the owned-item cache key.".to_owned())?;
  Ok(key)
}

#[cfg(test)]
mod tests {
  use super::*;

  fn context(secret: &[u8], scope: &str) -> LoginCacheContext {
    LoginCacheContext {
      key_material: secret.to_vec(),
      account_scope: scope.to_owned(),
      character_name: "Test Character".to_owned(),
    }
  }

  fn snapshot() -> OwnedItemsSnapshot {
    OwnedItemsSnapshot {
      schema_version: CACHE_SCHEMA_VERSION,
      character: OwnedItemsCharacter {
        content_id: "123456789".to_owned(),
        character_name: "Test Character".to_owned(),
        current_world_id: 101,
        home_world_id: 101,
        current_region: Some("Test Region".to_owned()),
        home_region: Some("Test Region".to_owned()),
      },
      captured_at_unix_ms: 42,
      items: vec![OwnedItemRecord {
        item_id: 3220,
        sources: vec![OwnedItemSource::Inventory],
      }],
      inventory: CacheCoverage {
        loaded: true,
        may_be_stale: false,
      },
      armoury_chest: CacheCoverage {
        loaded: true,
        may_be_stale: false,
      },
      glamour_dresser: CacheCoverage {
        loaded: true,
        may_be_stale: true,
      },
      armoire: OwnedArmoireCache {
        cached: true,
        may_be_stale: true,
        cabinet_item_ids: vec![1, 3],
      },
    }
  }

  #[test]
  fn encrypted_cache_round_trips_without_plaintext_identifiers() {
    let path = std::env::temp_dir().join(format!(
      "open-rising-stones-owned-items-{}-{}.dat",
      std::process::id(),
      SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos()
    ));
    let context = context(b"authenticated-game-login", "account-scope");
    let expected = snapshot();

    save_encrypted_cache(&path, &context, &expected).unwrap();
    let bytes = fs::read(&path).unwrap();
    assert!(!bytes
      .windows(b"Test Character".len())
      .any(|value| value == b"Test Character"));
    assert!(!bytes.windows(b"3220".len()).any(|value| value == b"3220"));
    assert_eq!(
      load_encrypted_cache(&path, &context).unwrap(),
      Some(expected)
    );
    fs::remove_file(path).unwrap();
  }

  #[test]
  fn encrypted_cache_rejects_a_different_login() {
    let path = std::env::temp_dir().join(format!(
      "open-rising-stones-owned-items-wrong-key-{}.dat",
      std::process::id()
    ));
    save_encrypted_cache(&path, &context(b"first-login", "scope"), &snapshot()).unwrap();

    assert!(load_encrypted_cache(&path, &context(b"second-login", "scope")).is_err());
    fs::remove_file(path).unwrap();
  }
}
