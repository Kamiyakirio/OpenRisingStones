/** Searches the Chinese FFXIV item sheet and normalizes selectable equipment. */
import { invoke } from "@tauri-apps/api/core";
import {
  EQUIPMENT_PAGE_SIZES,
  countEquipmentSearchFilters,
  type EquipmentPageSize,
  type EquipmentSearchFilters,
  type EquipmentSearchItem,
  type EquipmentSearchPage,
  validateEquipmentSearchFilters,
} from "../equipment.types";
import { isTauriRuntime } from "../../../shared/utils/runtime";

type NetworkResponse = { status: number; body: string };
type UnknownRecord = Record<string, unknown>;

const XIVAPI_ORIGIN = "https://xivapi-v2.xivcdn.com";
export async function fetchEquipmentCandidates(
  searchTerm: string,
  filters: EquipmentSearchFilters,
  cursor?: string,
  limit: EquipmentPageSize = 12,
): Promise<EquipmentSearchPage> {
  const query = searchTerm.trim();
  if (query.length > 80) {
    throw new Error("装备名称不能超过 80 个字符");
  }
  const filterError = validateEquipmentSearchFilters(filters);
  if (filterError) throw new Error(filterError);
  if (!query && countEquipmentSearchFilters(filters) === 0) {
    throw new Error("请输入装备名称或至少选择一个筛选条件");
  }
  if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor)) {
    throw new Error("装备搜索分页信息无效，请重新搜索");
  }
  if (!EQUIPMENT_PAGE_SIZES.includes(limit)) {
    throw new Error("装备搜索的每页数量无效");
  }

  const url = new URL("/api/search", XIVAPI_ORIGIN);
  url.search = new URLSearchParams({
    ...(cursor
      ? { cursor }
      : {
          sheets: "Item",
          query: buildEquipmentSearchQuery(query, filters),
        }),
    fields: "Name,Icon,ItemUICategory.Name,LevelEquip,LevelItem@as(raw)",
    language: "chs",
    limit: String(limit),
  }).toString();

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

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`装备资料接口返回 HTTP ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error("装备资料接口返回了无法解析的数据");
  }
  const root = asRecord(payload);
  if (!Array.isArray(root.results)) {
    throw new Error(readString(root, "message") ?? "无法读取装备资料");
  }

  return {
    items: root.results
      .map(toEquipmentSearchItem)
      .filter((item): item is EquipmentSearchItem => item !== null),
    nextCursor: readString(root, "next"),
  };
}

async function fetchInBrowser(url: URL): Promise<NetworkResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    return { status: response.status, body: await response.text() };
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === "AbortError") {
      throw new Error("搜索装备超时，请重试", { cause: reason });
    }
    throw new Error("无法连接装备资料服务，请检查网络后重试", {
      cause: reason,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function toEquipmentSearchItem(value: unknown): EquipmentSearchItem | null {
  const result = asRecord(value);
  const fields = asRecord(result.fields);
  const icon = asRecord(fields.Icon);
  const category = asRecord(asRecord(fields.ItemUICategory).fields);
  const id = readNumber(result, "row_id");
  const name = readString(fields, "Name");
  const iconPath = readString(icon, "path_hr1") ?? readString(icon, "path");
  if (id === null || id <= 0 || !name || !iconPath) return null;

  const iconUrl = new URL("/api/asset", XIVAPI_ORIGIN);
  iconUrl.search = new URLSearchParams({
    path: iconPath,
    format: "png",
  }).toString();
  return {
    id,
    name,
    category: readString(category, "Name") ?? "装备",
    icon: iconUrl.toString(),
    levelEquip: readNumber(fields, "LevelEquip") ?? undefined,
    levelItem: readNumber(fields, "LevelItem@as(raw)") ?? undefined,
  };
}

/** Builds required XIVAPI clauses so every selected control narrows results. */
export function buildEquipmentSearchQuery(
  searchTerm: string,
  filters: EquipmentSearchFilters,
) {
  const clauses = ["+EquipSlotCategory>0"];
  const name = searchTerm.trim();
  const category = filters.itemUiCategory.trim();
  if (name) clauses.unshift(`+Name~"${escapeQueryValue(name)}"`);
  if (filters.equipSlot) {
    clauses.push(`+EquipSlotCategory.${filters.equipSlot}>0`);
  }
  if (filters.minEquipLevel !== null) {
    clauses.push(`+LevelEquip>=${filters.minEquipLevel}`);
  }
  if (filters.maxEquipLevel !== null) {
    clauses.push(`+LevelEquip<=${filters.maxEquipLevel}`);
  }
  if (filters.minItemLevel !== null) {
    clauses.push(`+LevelItem>=${filters.minItemLevel}`);
  }
  if (filters.maxItemLevel !== null) {
    clauses.push(`+LevelItem<=${filters.maxItemLevel}`);
  }
  if (category) {
    clauses.push(`+ItemUICategory.Name="${escapeQueryValue(category)}"`);
  }
  if (filters.classJob) {
    clauses.push(`+ClassJobCategory.${filters.classJob}=true`);
  }
  return clauses.join(" ");
}

function escapeQueryValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
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
