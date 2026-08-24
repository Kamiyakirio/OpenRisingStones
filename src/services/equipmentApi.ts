/** Searches the Chinese FFXIV item sheet and normalizes selectable equipment. */
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./glamourApi";

export type EquipmentSearchItem = {
  id: number;
  name: string;
  category: string;
  icon: string;
};

export type EquipmentSearchPage = {
  items: EquipmentSearchItem[];
  nextCursor: string | null;
};

export const EQUIPMENT_PAGE_SIZES = [12, 24, 48] as const;
export type EquipmentPageSize = (typeof EQUIPMENT_PAGE_SIZES)[number];

type NetworkResponse = { status: number; body: string };
type UnknownRecord = Record<string, unknown>;

const XIVAPI_ORIGIN = "https://xivapi-v2.xivcdn.com";
export async function fetchEquipmentCandidates(
  searchTerm: string,
  cursor?: string,
  limit: EquipmentPageSize = 12,
): Promise<EquipmentSearchPage> {
  const query = searchTerm.trim();
  if (!query || query.length > 80) {
    throw new Error("请输入 1 至 80 个字符的装备名称");
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
          query: `+Name~"${escapeQueryValue(query)}" +EquipSlotCategory>0`,
        }),
    fields: "Name,Icon,ItemUICategory.Name",
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
  };
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
