/** Pure normalization helpers for XIVAPI Item sheet responses. */
import type { PlayerInventorySnapshot } from "../models/gameBridge";
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

/** Extracts the missing Item row reported when one ID invalidates a batch. */
export function readMissingItemId(responseBody: string) {
  const match = responseBody.match(
    /Excel row Item\/(\d+)(?::\d+)? could not be found/i,
  );
  if (!match) return null;
  const itemId = Number(match[1]);
  return Number.isSafeInteger(itemId) && itemId > 0 ? itemId : null;
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
  };
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
