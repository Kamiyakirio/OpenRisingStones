/** Batched, cached access to the Chinese XIVAPI Item sheet. */
import { invoke } from "@tauri-apps/api/core";
import type { ItemSheetInfo } from "../models/item";
import {
  buildCabinetSheetUrl,
  buildItemSheetUrl,
  parseCabinetSheetResponse,
  parseItemSheetResponse,
  readMissingItemId,
  readMissingSheetRowId,
} from "../utils/itemSheet";
import { isTauriRuntime } from "../shared/utils/runtime";

type NetworkResponse = { status: number; body: string };

const ITEM_BATCH_SIZE = 100;
const MAX_ITEM_IDS = 6_000;
const itemCache = new Map<number, ItemSheetInfo>();
const missingItemCache = new Set<number>();
const cabinetItemCache = new Map<number, number>();
const missingCabinetCache = new Set<number>();

/** Resolves Item sheet rows while preserving input IDs that have no known row. */
export async function fetchItemSheetInfo(itemIds: readonly number[]) {
  const requestedIds = [
    ...new Set(itemIds.filter((id) => Number.isSafeInteger(id) && id > 0)),
  ];
  if (requestedIds.length > MAX_ITEM_IDS) {
    throw new Error(
      `An inventory lookup cannot exceed ${MAX_ITEM_IDS} item IDs.`,
    );
  }

  const uncachedIds = requestedIds.filter(
    (id) => !itemCache.has(id) && !missingItemCache.has(id),
  );
  for (let offset = 0; offset < uncachedIds.length; offset += ITEM_BATCH_SIZE) {
    const batch = uncachedIds.slice(offset, offset + ITEM_BATCH_SIZE);
    const items = await fetchItemBatch(batch);
    const returnedIds = new Set(items.map((item) => item.id));
    for (const item of items) itemCache.set(item.id, item);
    for (const id of batch) {
      if (!returnedIds.has(id)) missingItemCache.add(id);
    }
  }

  return new Map(
    requestedIds.flatMap((id) => {
      const item = itemCache.get(id);
      return item ? [[id, item] as const] : [];
    }),
  );
}

/** Resolves cached armoire bit indexes through the Cabinet sheet. */
export async function fetchCabinetItemIds(cabinetIds: readonly number[]) {
  const requestedIds = [
    ...new Set(cabinetIds.filter((id) => Number.isSafeInteger(id) && id > 0)),
  ];
  if (requestedIds.length > 4_000) {
    throw new Error("An armoire lookup cannot exceed 4000 Cabinet row IDs.");
  }

  const uncachedIds = requestedIds.filter(
    (id) => !cabinetItemCache.has(id) && !missingCabinetCache.has(id),
  );
  for (let offset = 0; offset < uncachedIds.length; offset += ITEM_BATCH_SIZE) {
    const batch = uncachedIds.slice(offset, offset + ITEM_BATCH_SIZE);
    const mappings = await fetchCabinetBatch(batch);
    const returnedIds = new Set(mappings.map((mapping) => mapping.cabinetId));
    for (const mapping of mappings) {
      cabinetItemCache.set(mapping.cabinetId, mapping.itemId);
    }
    for (const id of batch) {
      if (!returnedIds.has(id)) missingCabinetCache.add(id);
    }
  }

  return new Map(
    requestedIds.flatMap((id) => {
      const itemId = cabinetItemCache.get(id);
      return itemId ? [[id, itemId] as const] : [];
    }),
  );
}

async function fetchItemBatch(itemIds: number[]) {
  if (!itemIds.length) return [];
  const url = buildItemSheetUrl(itemIds);

  const response = isTauriRuntime()
    ? await invoke<NetworkResponse>("send_network_request", {
        request: {
          url: url.toString(),
          method: "GET",
          headers: { Accept: "application/json" },
          body: null,
          timeoutMs: 15_000,
        },
      })
    : await fetchInBrowser(url);
  if (response.status === 404) {
    const missingItemId = readMissingItemId(response.body);
    if (missingItemId !== null && itemIds.includes(missingItemId)) {
      // The API identifies the one missing row that invalidated the whole batch.
      return fetchItemBatch(itemIds.filter((id) => id !== missingItemId));
    }
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`The Item sheet returned HTTP ${response.status}.`);
  }

  try {
    return parseItemSheetResponse(JSON.parse(response.body));
  } catch (reason) {
    throw new Error("The Item sheet returned invalid data.", { cause: reason });
  }
}

async function fetchCabinetBatch(cabinetIds: number[]) {
  if (!cabinetIds.length) return [];
  const url = buildCabinetSheetUrl(cabinetIds);
  const response = isTauriRuntime()
    ? await invoke<NetworkResponse>("send_network_request", {
        request: {
          url: url.toString(),
          method: "GET",
          headers: { Accept: "application/json" },
          body: null,
          timeoutMs: 15_000,
        },
      })
    : await fetchInBrowser(url);
  if (response.status === 404) {
    const missingCabinetId = readMissingSheetRowId(response.body, "Cabinet");
    if (missingCabinetId !== null && cabinetIds.includes(missingCabinetId)) {
      return fetchCabinetBatch(
        cabinetIds.filter((id) => id !== missingCabinetId),
      );
    }
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`The Cabinet sheet returned HTTP ${response.status}.`);
  }
  try {
    return parseCabinetSheetResponse(JSON.parse(response.body));
  } catch (reason) {
    throw new Error("The Cabinet sheet returned invalid data.", {
      cause: reason,
    });
  }
}

async function fetchInBrowser(url: URL): Promise<NetworkResponse> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    return { status: response.status, body: await response.text() };
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
