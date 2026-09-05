/** Tauri transport for encrypted owned-item cache reads and explicit game scans. */
import { invoke } from "@tauri-apps/api/core";
import type { OwnedItemsSnapshot } from "../ownedItems.types";
import { isTauriRuntime } from "../../../shared/utils/runtime";

export async function loadOwnedItemsCache() {
  if (!isTauriRuntime()) return null;
  return invoke<OwnedItemsSnapshot | null>("load_owned_items_cache");
}

export async function syncOwnedItemsFromGame() {
  if (!isTauriRuntime()) {
    throw new Error("Owned-item sync requires the Windows desktop runtime.");
  }
  return invoke<OwnedItemsSnapshot>("game_bridge_sync_owned_items");
}
