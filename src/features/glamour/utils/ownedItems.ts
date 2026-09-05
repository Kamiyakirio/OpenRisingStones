/** Pure owned-item indexing and shared-model matching helpers. */
import type { ItemSheetInfo } from "../item.types";
import type {
  OwnedItemMatch,
  OwnedItemSource,
  OwnedItemsSnapshot,
} from "../ownedItems.types";

export type OwnedItemIndex = Map<number, OwnedItemSource[]>;

export function buildOwnedItemIndex(
  snapshot: OwnedItemsSnapshot,
  cabinetItems: ReadonlyMap<number, number>,
) {
  const index: OwnedItemIndex = new Map();
  for (const item of snapshot.items) {
    mergeSources(index, item.itemId, item.sources);
  }
  for (const cabinetId of snapshot.armoire.cabinetItemIds) {
    const itemId = cabinetItems.get(cabinetId);
    if (itemId) mergeSources(index, itemId, ["armoire"]);
  }
  return index;
}

export function buildOwnedModelIndex(
  ownedItems: OwnedItemIndex,
  itemInfo: ReadonlyMap<number, ItemSheetInfo>,
) {
  const models = new Map<string, number>();
  for (const itemId of ownedItems.keys()) {
    const info = itemInfo.get(itemId);
    const key = info ? modelKey(info) : null;
    if (key && !models.has(key)) models.set(key, itemId);
  }
  return models;
}

export function matchOwnedItem(
  itemId: number,
  ownedItems: OwnedItemIndex,
  itemInfo: ReadonlyMap<number, ItemSheetInfo>,
  ownedModels: ReadonlyMap<string, number>,
  metadataReady: boolean,
): OwnedItemMatch {
  const exactSources = ownedItems.get(itemId);
  if (exactSources?.length) {
    return {
      kind: "exact",
      ownedItemId: itemId,
      ownedItemName: itemInfo.get(itemId)?.name ?? null,
      sources: exactSources,
    };
  }
  if (!metadataReady || !itemInfo.has(itemId)) return { kind: "checking" };
  const targetModelKey = modelKey(itemInfo.get(itemId)!);
  const ownedItemId = targetModelKey
    ? ownedModels.get(targetModelKey)
    : undefined;
  if (!ownedItemId) return { kind: "not_owned" };
  return {
    kind: "same_model",
    ownedItemId,
    ownedItemName: itemInfo.get(ownedItemId)?.name ?? null,
    sources: ownedItems.get(ownedItemId) ?? [],
  };
}

function modelKey(item: ItemSheetInfo) {
  if (item.modelMain <= 0 || item.equipSlotCategory <= 0) return null;
  return `${item.equipSlotCategory}:${item.modelMain}:${item.modelSub}`;
}

function mergeSources(
  index: OwnedItemIndex,
  itemId: number,
  sources: readonly OwnedItemSource[],
) {
  if (!Number.isSafeInteger(itemId) || itemId <= 0) return;
  const merged = new Set(index.get(itemId) ?? []);
  sources.forEach((source) => merged.add(source));
  index.set(itemId, [...merged]);
}
