/**
 * 石之家幻化列表适配器。
 * 网络请求由 Tauri Rust 层发送，前端只接收经过大小限制的 JSON 文本。
 */
import { invoke } from "@tauri-apps/api/core";
import { genderIdMap, raceIdMap } from "../models/idsToName";
import type {
  Glamour,
  GlamourDetail,
  GlamourEquipment,
  GlamourFetchOptions,
  GlamourPage,
} from "../models/glamour";
import {
  authenticationRequired,
  isSdoAuthenticationFailure,
  isSdoAuthenticationPayload,
} from "./authEvents";
import {
  findGlamourTotal,
  inferGlamourHasMore,
} from "../utils/glamourPagination";

type NetworkResponse = { status: number; body: string };
type UnknownRecord = Record<string, unknown>;

const API_ORIGIN = "https://apiff14risingstones.web.sdo.com";
const GLAMOUR_REQUEST_INTERVAL_MS = 800;
let glamourRequestQueue: Promise<void> = Promise.resolve();
let lastGlamourRequestStartedAt = 0;

export async function fetchGlamours(
  options: GlamourFetchOptions,
): Promise<GlamourPage> {
  const equipmentIds = Array.from(
    new Set(
      (options.equipmentIds ?? []).filter(
        (id) => Number.isSafeInteger(id) && id > 0,
      ),
    ),
  );
  if (equipmentIds.length > 1) {
    const perEquipmentLimit = Math.max(
      1,
      Math.ceil((options.limit ?? 12) / equipmentIds.length),
    );
    const pages = await mapWithConcurrency(equipmentIds, 3, (equipmentId) =>
      fetchSingleGlamourPage({
        ...options,
        limit: perEquipmentLimit,
        keywords: String(equipmentId),
        searchByEquipment: true,
        equipmentIds: undefined,
      }),
    );
    const merged = new Map<number, Glamour>();
    pages.forEach((page) => {
      page.items.forEach((item) => merged.set(item.id, item));
    });
    const items = [...merged.values()].sort((left, right) =>
      options.order === "hot" ? right.likes - left.likes : right.id - left.id,
    );
    const hasMore = pages.some((page) => page.hasMore);
    return {
      items,
      total: hasMore
        ? pages.reduce((sum, page) => sum + page.total, 0)
        : items.length,
      hasMore,
    };
  }
  return fetchSingleGlamourPage({
    ...options,
    ...(equipmentIds.length === 1
      ? { keywords: String(equipmentIds[0]), searchByEquipment: true }
      : {}),
  });
}

/** Limits fan-out so selecting many model variants does not burst the public API. */
async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(
          values[currentIndex],
          currentIndex,
        );
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/** Serializes API traffic and leaves enough spacing to avoid request bursts. */
async function scheduleGlamourRequest<T>(
  request: () => Promise<T>,
  signal?: AbortSignal,
) {
  const run = glamourRequestQueue.then(async () => {
    throwIfAborted(signal);
    const waitTime = Math.max(
      0,
      GLAMOUR_REQUEST_INTERVAL_MS - (Date.now() - lastGlamourRequestStartedAt),
    );
    if (waitTime > 0) {
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, waitTime),
      );
    }
    throwIfAborted(signal);
    lastGlamourRequestStartedAt = Date.now();
    const result = await request();
    throwIfAborted(signal);
    return result;
  });
  glamourRequestQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Request aborted.", "AbortError");
}

function rejectBotChallenge(body: string) {
  if (
    body.includes("__tst_status") ||
    body.includes("EO_Bot_Ssid") ||
    /<script[^>]*>\s*function\s+a\(/i.test(body)
  ) {
    throw new Error("石之家触发访问频控，已暂停自动加载，请稍后重试");
  }
}

/** Performs one public Stone search request for a title or equipment identifier. */
async function fetchSingleGlamourPage(
  options: GlamourFetchOptions,
): Promise<GlamourPage> {
  const filters = {
    ...(options.order === "latest" ? { order: "latest" } : {}),
    ...(options.raceId !== null ? { raceId: options.raceId } : {}),
    ...(options.genderId !== null ? { genderId: options.genderId } : {}),
    ...(options.keywords ? { keywords: options.keywords } : {}),
    ...(options.searchByEquipment ? { searchByEquipment: true } : {}),
  };
  const response = await scheduleGlamourRequest(
    () =>
      invokeProtected<NetworkResponse>("fetch_glamour_page", {
        request: {
          page: options.page,
          limit: options.limit ?? 12,
          ...filters,
        },
      }),
    options.signal,
  );

  if (response.status < 200 || response.status >= 300) {
    if (response.status === 401) throw authenticationRequired();
    throw new Error(`石之家接口返回 HTTP ${response.status}`);
  }
  rejectBotChallenge(response.body);

  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error("石之家返回了无法解析的数据");
  }
  if (isSdoAuthenticationPayload(payload)) throw authenticationRequired();

  const records = findRecordList(payload);
  if (!records.length) {
    const message = readString(asRecord(payload), ["msg", "message"]);
    if (message) throw new Error(message);
  }

  const items = records
    .map((record, index) => toGlamour(record, index, options))
    .filter((item): item is Glamour => Boolean(item));
  const pageSize = options.limit ?? 12;
  const loadedCount = (options.page - 1) * pageSize + records.length;
  // The popular endpoint's data.count mirrors rows.length instead of the total.
  const paginationMetadata = { countIsPageSize: options.order === "hot" };
  const reportedTotal = findGlamourTotal(payload, paginationMetadata);
  const hasMore = inferGlamourHasMore(
    payload,
    records.length,
    pageSize,
    loadedCount,
    paginationMetadata,
  );
  return {
    items,
    total: reportedTotal ?? loadedCount,
    hasMore,
  };
}

/** Reads and normalizes one detail record from the authenticated Tauri bridge. */
export async function fetchGlamourDetail(id: number): Promise<GlamourDetail> {
  const response = await scheduleGlamourRequest(() =>
    invokeProtected<NetworkResponse>("fetch_glamour_detail", {
      request: { id },
    }),
  );
  if (response.status < 200 || response.status >= 300) {
    if (response.status === 401) throw authenticationRequired();
    throw new Error(`石之家详情接口返回 HTTP ${response.status}`);
  }
  rejectBotChallenge(response.body);

  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error("石之家返回了无法解析的幻化详情");
  }
  if (isSdoAuthenticationPayload(payload)) throw authenticationRequired();
  const root = asRecord(payload);
  const data = asRecord(root.data);
  if (!Object.keys(data).length) {
    throw new Error(readString(root, ["msg", "message"]) ?? "未找到幻化详情");
  }
  return toGlamourDetail(data);
}

async function invokeProtected<T>(
  command: string,
  args: Record<string, unknown>,
) {
  try {
    return await invoke<T>(command, args);
  } catch (reason) {
    if (isSdoAuthenticationFailure(reason)) throw authenticationRequired();
    throw reason;
  }
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
  const raceIds = readNumberArray(record, ["race_ids", "raceIds"]);
  const genderIds = readNumberArray(record, ["gender_ids", "genderIds"]);
  const raceId =
    readNumber(record, ["race_id", "raceId"]) ?? raceIds[0] ?? filters.raceId;
  const genderId =
    readNumber(record, ["gender_id", "genderId"]) ??
    genderIds[0] ??
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
    raceIds: raceIds.length ? raceIds : raceId ? [raceId] : [],
    genderIds: genderIds.length ? genderIds : genderId ? [genderId] : [],
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

function toGlamourDetail(record: UnknownRecord): GlamourDetail {
  const mainImage = readImage(record);
  if (!mainImage) throw new Error("该投稿没有可显示的主图");
  const raceIds = readNumberArray(record, ["race_ids", "raceIds"]);
  const raceRecords = readRecordArray(record.race_ids);
  const raceName = raceRecords
    .map((race) => readString(race, ["name"]))
    .filter(Boolean)
    .join("、");
  const genderIds = Array.isArray(record.gender_ids)
    ? record.gender_ids.filter((value): value is number =>
        Number.isFinite(value),
      )
    : [];
  const equipment = readRecordArray(record.equipments).map(toEquipment);
  const ornament = asRecord(record.ortInfo);
  const glassesId = readNumber(ornament, ["glasses_id"]);
  if (glassesId !== null && glassesId > 0) {
    equipment.push({
      slot: "FACE",
      equipmentId: glassesId,
      name: readString(ornament, ["glasses_name"]),
      icon: buildEquipmentIcon(readString(ornament, ["glasses_icon"])),
      dyes: [],
      isFashion: true,
    });
  }
  const user = asRecord(record.userInfo);
  const extraImages = (readString(record, ["images"]) ?? "")
    .split(",")
    .map((image) => image.trim())
    .filter(Boolean)
    .map(normalizeImageUrl);
  const genderName = genderIds
    .map((id) => genderIdMap[id])
    .filter(Boolean)
    .join("、");

  return {
    id: readNumber(record, ["id"]) ?? 0,
    title: readString(record, ["title"]) ?? "未命名幻化",
    author:
      readString(record, ["character_name", "nickname", "username"]) ??
      "匿名冒险者",
    race: [raceName, genderName].filter(Boolean).join(" ") || "种族不限",
    raceIds,
    genderIds,
    job: readNamedList(record.job_ids) || "全职业",
    palette: readPrimaryDye(equipment) ?? "配色未标注",
    image: mainImage,
    likes: readNumber(record, ["likes"]) ?? 0,
    saved: readNumber(record, ["favorites"]) ?? 0,
    description: readString(record, ["desc", "description"]) ?? "",
    images: [mainImage, ...extraImages.filter((image) => image !== mainImage)],
    createdAt: readString(record, ["created_at", "createdAt"]) ?? "",
    areaName:
      readString(record, ["area_name"]) ??
      readString(user, ["area_name"]) ??
      "服务器未公开",
    groupName:
      readString(record, ["group_name"]) ??
      readString(user, ["group_name"]) ??
      "大区未公开",
    avatar: readString(user, ["avatar"]),
    equipments: equipment,
  };
}

function toEquipment(record: UnknownRecord): GlamourEquipment {
  const equipmentId = readNumber(record, ["equipment_id"]) ?? -1;
  return {
    slot: readString(record, ["slot"]) ?? "UNKNOWN",
    equipmentId,
    name: readString(record, ["name"]),
    icon: buildEquipmentIcon(readString(record, ["icon_id"])),
    dyes: readRecordArray(record.dyes).map((dye) => ({
      id: readNumber(dye, ["id"]) ?? -1,
      name: readString(dye, ["name"]) ?? "未命名染剂",
      color: readString(dye, ["color"]),
    })),
    isFashion: readNumber(record, ["is_fashion"]) === 1,
  };
}

function buildEquipmentIcon(iconId: string | null) {
  if (!iconId || !/^\d{6}$/.test(iconId)) return null;
  const group = `${iconId.slice(0, 3)}000`;
  return `https://ff14-eo.web.sdo.com/ffstones/item/icon/dcsvv4fowz2m/${group}/${iconId}_hr1.png`;
}

function readPrimaryDye(equipment: GlamourEquipment[]) {
  return equipment.find((item) => item.dyes.length)?.dyes[0]?.name ?? null;
}

function readNamedList(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => (isRecord(item) ? readString(item, ["name"]) : null))
    .filter(Boolean)
    .join("、");
}

function readRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
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

function readNumberArray(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) continue;
    return value
      .map((item) => {
        if (typeof item === "number" && Number.isFinite(item)) return item;
        if (typeof item === "string" && Number.isFinite(Number(item))) {
          return Number(item);
        }
        return null;
      })
      .filter((item): item is number => item !== null);
  }
  return [];
}

function normalizeImageUrl(value: string) {
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${API_ORIGIN}${value}`;
  return value;
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
