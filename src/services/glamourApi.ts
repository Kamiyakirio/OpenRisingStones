/**
 * 石之家幻化列表适配器。
 * 网络请求由 Tauri Rust 层发送，前端只接收经过大小限制的 JSON 文本。
 */
import { invoke } from "@tauri-apps/api/core";
import { genderIdMap, raceIdMap } from "../models/idsToName";

export type Glamour = {
  id: number;
  title: string;
  author: string;
  race: string;
  job: string;
  palette: string;
  image: string;
  likes: number;
  saved: number;
  featured?: boolean;
};

export type GlamourOrder = "latest" | "hot";

type NetworkResponse = { status: number; body: string };
type UnknownRecord = Record<string, unknown>;
type GlamourPage = { items: Glamour[]; total: number; hasMore: boolean };

const API_ORIGIN = "https://apiff14risingstones.web.sdo.com";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export async function fetchGlamours(options: {
  page: number;
  limit?: number;
  order: GlamourOrder;
  raceId: number | null;
  genderId: number | null;
}): Promise<GlamourPage> {
  const filters = {
    ...(options.raceId !== null ? { raceId: options.raceId } : {}),
    ...(options.genderId !== null ? { genderId: options.genderId } : {}),
  };
  const response = await invoke<NetworkResponse>("fetch_glamour_page", {
    request: {
      page: options.page,
      limit: options.limit ?? 12,
      order: options.order,
      ...filters,
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`石之家接口返回 HTTP ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error("石之家返回了无法解析的数据");
  }

  const records = findRecordList(payload);
  if (!records.length) {
    const message = readString(asRecord(payload), ["msg", "message"]);
    if (message) throw new Error(message);
  }

  const items = records
    .map((record, index) => toGlamour(record, index, options))
    .filter((item): item is Glamour => Boolean(item));
  const loadedTotal = (options.page - 1) * (options.limit ?? 12) + items.length;
  return {
    items,
    total: findTotal(payload) ?? loadedTotal,
    hasMore: records.length === (options.limit ?? 12),
  };
}

/** 兼容接口包装层可能使用的 data/list/rows/items 字段。 */
function findRecordList(value: unknown, depth = 0): UnknownRecord[] {
  if (depth > 4) return [];
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  for (const key of ["list", "rows", "items", "records", "glamours"]) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested.filter(isRecord);
  }
  for (const key of ["data", "result", "payload"]) {
    const records = findRecordList(value[key], depth + 1);
    if (records.length) return records;
  }
  return [];
}

function toGlamour(
  record: UnknownRecord,
  index: number,
  filters: { raceId: number | null; genderId: number | null },
): Glamour | null {
  const image = readImage(record);
  if (!image) return null;
  const raceId =
    readNumber(record, ["race_id", "raceId"]) ??
    readFirstNumber(record, ["race_ids", "raceIds"]) ??
    filters.raceId;
  const genderId =
    readNumber(record, ["gender_id", "genderId"]) ??
    readFirstNumber(record, ["gender_ids", "genderIds"]) ??
    filters.genderId;
  const raceName = readString(record, ["race_name", "raceName", "race"]);
  const genderName = readString(record, [
    "gender_name",
    "genderName",
    "gender",
  ]);

  return {
    id:
      readNumber(record, ["id", "glamour_id", "glamourId", "article_id"]) ??
      index,
    title:
      readString(record, ["title", "name", "glamour_name", "glamourName"]) ??
      "未命名幻化",
    author:
      readString(record, [
        "nickname",
        "user_name",
        "username",
        "author",
        "character_name",
      ]) ?? "匿名冒险者",
    race:
      [
        raceName ?? raceIdMap[raceId ?? 0],
        genderName ?? genderIdMap[genderId ?? 0],
      ]
        .filter(Boolean)
        .join(" ") || "种族不限",
    job:
      readString(record, [
        "job_name",
        "jobName",
        "job",
        "class_name",
        "profession",
      ]) ?? "全职业",
    palette:
      readString(record, ["color_name", "colorName", "color", "dye_name"]) ??
      "配色未标注",
    image,
    likes:
      readNumber(record, [
        "like_count",
        "likeCount",
        "likes",
        "praise_count",
        "like_num",
      ]) ?? 0,
    saved:
      readNumber(record, [
        "collect_count",
        "collectCount",
        "favorites",
        "favorite_count",
      ]) ?? 0,
    featured: index === 0,
  };
}

function readImage(record: UnknownRecord) {
  const direct = readString(record, [
    "cover",
    "main_image",
    "cover_url",
    "coverUrl",
    "image",
    "image_url",
    "imageUrl",
    "pic",
    "picture",
    "thumb",
    "thumbnail",
    "first_img",
    "firstImg",
  ]);
  if (direct) return normalizeImageUrl(direct);
  for (const key of ["images", "imgs", "pictures", "screenshots"]) {
    const candidates = record[key];
    if (!Array.isArray(candidates) || !candidates.length) continue;
    const first = candidates[0];
    if (typeof first === "string") return normalizeImageUrl(first);
    if (isRecord(first)) {
      const nested = readString(first, ["url", "src", "image_url", "imageUrl"]);
      if (nested) return normalizeImageUrl(nested);
    }
  }
  return null;
}

function readFirstNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value) || !value.length) continue;
    const first = value[0];
    if (typeof first === "number" && Number.isFinite(first)) return first;
    if (typeof first === "string" && Number.isFinite(Number(first))) {
      return Number(first);
    }
  }
  return null;
}

function normalizeImageUrl(value: string) {
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${API_ORIGIN}${value}`;
  return value;
}

function findTotal(value: unknown, depth = 0): number | null {
  if (depth > 4 || !isRecord(value)) return null;
  const direct = readNumber(value, [
    "total",
    "total_count",
    "totalCount",
    "count",
  ]);
  if (direct !== null) return direct;
  for (const key of ["data", "result", "payload"]) {
    const nested = findTotal(value[key], depth + 1);
    if (nested !== null) return nested;
  }
  return null;
}

function readString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    )
      return Number(value);
  }
  return null;
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
