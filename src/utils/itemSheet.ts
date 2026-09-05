/** Pure normalization helpers for XIVAPI Item sheet responses. */
import type { PlayerInventorySnapshot } from "../shared/game-bridge/types";
import type { ItemSheetInfo } from "../models/item";

type UnknownRecord = Record<string, unknown>;

const XIVAPI_ORIGIN = "https://xivapi-v2.xivcdn.com";
const ITEM_FIELDS = [
  "Name",
  "Description",
  "Icon",
  "ItemUICategory.Name",
  "LevelEquip",
  "LevelItem@as(raw)",
  "Rarity",
  "StackSize",
  "ModelMain",
  "ModelSub",
  "EquipSlotCategory@as(raw)",
].join(",");

/** Builds the documented multi-row Item sheet request used by each batch. */
export function buildItemSheetUrl(itemIds: readonly number[]) {
  const url = new URL("/api/sheet/Item", XIVAPI_ORIGIN);
  url.search = new URLSearchParams({
    rows: itemIds.join(","),
    fields: ITEM_FIELDS,
    language: "chs",
  }).toString();
  return url;
}

/** Builds a compact Cabinet RowId to Item RowId mapping request. */
export function buildCabinetSheetUrl(cabinetIds: readonly number[]) {
  const url = new URL("/api/sheet/Cabinet", XIVAPI_ORIGIN);
  url.search = new URLSearchParams({
    rows: cabinetIds.join(","),
    fields: "Item@as(raw)",
  }).toString();
  return url;
}

/** Extracts the missing Item row reported when one ID invalidates a batch. */
export function readMissingItemId(responseBody: string) {
  return readMissingSheetRowId(responseBody, "Item");
}

/** Extracts one missing row reported by the sheet endpoint. */
export function readMissingSheetRowId(responseBody: string, sheet: string) {
  const escapedSheet = sheet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = responseBody.match(
    new RegExp(
      `Excel row ${escapedSheet}\\/(\\d+)(?::\\d+)? could not be found`,
      "i",
    ),
  );
  if (!match) return null;
  const itemId = Number(match[1]);
  return Number.isSafeInteger(itemId) && itemId > 0 ? itemId : null;
}

/** Parses Cabinet sheet rows without expanding their linked Item records. */
export function parseCabinetSheetResponse(payload: unknown) {
  const root = asRecord(payload);
  if (!Array.isArray(root.rows)) {
    throw new Error("The Cabinet sheet response does not contain rows.");
  }
  return root.rows.flatMap((value) => {
    const row = asRecord(value);
    const fields = asRecord(row.fields);
    const cabinetId = readNumber(row, "row_id");
    const itemId = readNumber(fields, "Item@as(raw)");
    return cabinetId !== null && cabinetId > 0 && itemId !== null && itemId > 0
      ? [{ cabinetId, itemId }]
      : [];
  });
}

/** Collects every concrete item and glamour ID present in one inventory read. */
export function collectInventoryItemIds(inventory: PlayerInventorySnapshot) {
  const ids = new Set<number>();
  for (const container of inventory.containers) {
    for (const item of container.items) {
      addItemId(ids, item.itemId);
      addItemId(ids, item.glamourId);
    }
  }
  for (const item of inventory.glamourDresser.items) {
    addItemId(ids, item.itemId);
  }
  return [...ids].sort((left, right) => left - right);
}

/** Parses only the stable fields requested by the inventory workspace. */
export function parseItemSheetResponse(payload: unknown): ItemSheetInfo[] {
  const root = asRecord(payload);
  if (!Array.isArray(root.rows)) {
    throw new Error("The Item sheet response does not contain rows.");
  }
  return root.rows
    .map(parseItemRow)
    .filter((item): item is ItemSheetInfo => item !== null);
}

function parseItemRow(value: unknown): ItemSheetInfo | null {
  const row = asRecord(value);
  const fields = asRecord(row.fields);
  const category = asRecord(asRecord(fields.ItemUICategory).fields);
  const icon = asRecord(fields.Icon);
  const id = readNumber(row, "row_id");
  const name = readString(fields, "Name");
  if (id === null || id <= 0 || !name) return null;

  const iconPath = readString(icon, "path_hr1") ?? readString(icon, "path");
  return {
    id,
    name,
    description: readString(fields, "Description") ?? "",
    category: readString(category, "Name") ?? "",
    iconUrl: iconPath ? buildAssetUrl(iconPath) : null,
    levelEquip: readNumber(fields, "LevelEquip") ?? 0,
    levelItem: readNumber(fields, "LevelItem@as(raw)") ?? 0,
    rarity: readNumber(fields, "Rarity") ?? 0,
    stackSize: readNumber(fields, "StackSize") ?? 0,
    modelMain: readNumber(fields, "ModelMain") ?? 0,
    modelSub: readNumber(fields, "ModelSub") ?? 0,
    equipSlotCategory: readNumber(fields, "EquipSlotCategory@as(raw)") ?? 0,
  };
}

/** Stable appearance key used to match role variants that share a rendered model. */
export function itemModelKey(item: ItemSheetInfo) {
  if (item.modelMain <= 0 || item.equipSlotCategory <= 0) return null;
  return `${item.equipSlotCategory}:${item.modelMain}:${item.modelSub}`;
}

function addItemId(ids: Set<number>, value: number) {
  if (Number.isSafeInteger(value) && value > 0) ids.add(value);
}

function buildAssetUrl(path: string) {
  const url = new URL("/api/asset", XIVAPI_ORIGIN);
  url.search = new URLSearchParams({ path, format: "png" }).toString();
  return url.toString();
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function readString(record: UnknownRecord, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(record: UnknownRecord, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
