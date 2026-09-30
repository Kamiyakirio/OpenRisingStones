/** Complete owned-cache records let tests vary membership without weakening the cache contract. */
import type { ItemSheetInfo } from "../../src/features/glamour/item.types.ts";
import type { OwnedItemsSnapshot } from "../../src/features/glamour/ownedItems.types.ts";

type SnapshotOverrides = Omit<Partial<OwnedItemsSnapshot>, "armoire"> & {
  armoire?: Partial<OwnedItemsSnapshot["armoire"]>;
};

export function ownedSnapshot(
  overrides: SnapshotOverrides = {},
): OwnedItemsSnapshot {
  return {
    schemaVersion: 1,
    character: {
      contentId: "1",
      characterName: "Player",
      currentWorldId: 1,
      homeWorldId: 1,
      currentRegion: null,
      homeRegion: null,
    },
    capturedAtUnixMs: 0,
    items: [],
    inventory: { loaded: true, mayBeStale: false },
    armouryChest: { loaded: true, mayBeStale: false },
    glamourDresser: { loaded: true, mayBeStale: false },
    ...overrides,
    armoire: {
      cached: true,
      mayBeStale: false,
      cabinetItemIds: [],
      ...overrides.armoire,
    },
  };
}

export function itemInfo(overrides: Partial<ItemSheetInfo>): ItemSheetInfo {
  return {
    id: 1,
    name: "Item",
    description: "",
    category: "",
    iconUrl: null,
    levelEquip: 0,
    levelItem: 0,
    rarity: 1,
    stackSize: 1,
    modelMain: 0,
    modelSub: 0,
    equipSlotCategory: 0,
    ...overrides,
  };
}
