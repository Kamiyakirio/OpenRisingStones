/** Batched, cached access to the Chinese XIVAPI Item sheet. */
import type { ItemSheetInfo } from "../item.types";
import {
  buildCabinetSheetUrl,
  buildDresserSetSheetUrl,
  parseDresserSetSheetResponse,
  buildItemSheetUrl,
  parseCabinetSheetResponse,
  parseItemSheetResponse,
  readMissingItemId,
  readMissingSheetRowId,
} from "../utils/itemSheet";

type NetworkResponse = { status: number; body: string };

const ITEM_BATCH_SIZE = 100;
const MAX_ITEM_IDS = 12_000;
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
  if (requestedIds.length > 5_120) {
    throw new Error("An armoire lookup cannot exceed 5120 Cabinet row IDs.");
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

  const response = await fetchSheetResponse(url);
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
  const response = await fetchSheetResponse(url);
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

/** Fetch public sheet data through the WebView in desktop and browser builds. */
async function fetchSheetResponse(url: URL): Promise<NetworkResponse> {
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

let dresserSetsRequest: Promise<Map<number, readonly number[]>> | undefined;

/** Fetch the compact public outfit catalogue once; failed requests may be retried. */
export function fetchDresserSets() {
  dresserSetsRequest ??= fetchDresserSetCatalogue().catch((error: unknown) => {
    dresserSetsRequest = undefined;
    throw error;
  });
  return dresserSetsRequest;
}

async function fetchDresserSetCatalogue() {
  const result = new Map<number, readonly number[]>();
  let after = 0;
  for (let page = 0; page < 20; page += 1) {
    const url = buildDresserSetSheetUrl(after);
    const response = await fetchSheetResponse(url);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`The outfit sheet returned HTTP ${response.status}.`);
    }
    const rows = parseDresserSetSheetResponse(JSON.parse(response.body));
    for (const row of rows) result.set(row.setId, row.itemIds);
    if (rows.length < 500) return result;
    const next = rows.at(-1)!.setId;
    if (next <= after)
      throw new Error("The outfit sheet pagination did not advance.");
    after = next;
  }
  throw new Error("The outfit catalogue exceeds the page limit.");
}
