/** Reads and normalizes the public Rising Stones recruitment endpoints. */
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../../shared/utils/runtime";
import type {
  RecruitArea,
  RecruitPage,
  RecruitConfig,
  RecruitDetail,
  RecruitDuty,
  RecruitJob,
  RecruitLabel,
  RecruitPageOptions,
  RecruitSummary,
} from "../types";
import {
  RecruitRateLimitError,
  isRecruitRateLimitError,
  rateLimitMessage,
  readReasonMessage,
} from "../utils/recruitRateLimit";
import { parseRecruitSlots } from "../utils/recruitSlots";

export { RecruitRateLimitError, isRecruitRateLimitError };

type NetworkResponse = { status: number; body: string };
type RecruitConfigTransport = {
  jobs: NetworkResponse;
  duties: NetworkResponse;
  labels: NetworkResponse;
  areas: NetworkResponse;
};
type UnknownRecord = Record<string, unknown>;

const API_ORIGIN = "https://apiff14risingstones.web.sdo.com";
const REQUEST_TIMEOUT_MS = 15_000;

export async function fetchRecruitConfig(
  signal?: AbortSignal,
): Promise<RecruitConfig> {
  const transport = isTauriRuntime()
    ? await invokeWithAbort<RecruitConfigTransport>(
        "fetch_recruit_config",
        {},
        signal,
      )
    : await fetchRecruitConfigInBrowser(signal);
  const jobsPayload = parseSuccessfulPayload(transport.jobs, "职业配置");
  const dutiesPayload = parseSuccessfulPayload(transport.duties, "副本配置");
  const labelsPayload = parseSuccessfulPayload(transport.labels, "招募标签");
  const areasPayload = parseSuccessfulPayload(transport.areas, "招募大区");
  const { jobs, roleJobs } = parseJobs(jobsPayload.data);

  return {
    jobs,
    roleJobs,
    duties: readRecordArray(dutiesPayload.data)
      .map(parseDuty)
      .filter((duty): duty is RecruitDuty => duty !== null),
    labels: readRecordArray(labelsPayload.data)
      .map(parseLabel)
      .filter((label): label is RecruitLabel => label !== null),
    areas: readRecordArray(areasPayload.data)
      .map(parseArea)
      .filter((area): area is RecruitArea => area !== null),
  };
}

export async function fetchRecruitPage({
  page,
  limit,
  filters,
  dutyNames,
  signal,
}: RecruitPageOptions): Promise<RecruitPage> {
  const requestedDutyNames = Array.from(
    new Set(
      (dutyNames?.length ? dutyNames : [filters.dutyName])
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  );
  if (requestedDutyNames.length > 1) {
    const pages = await Promise.all(
      requestedDutyNames.map((dutyName) =>
        fetchSingleRecruitPage({
          page,
          limit,
          filters: { ...filters, dutyName },
          signal,
        }),
      ),
    );
    const items = new Map<number, RecruitSummary>();
    pages.forEach((result) =>
      result.items.forEach((item) => items.set(item.id, item)),
    );
    return {
      items: [...items.values()],
      total: pages.reduce((sum, result) => sum + result.total, 0),
      hasMore: pages.some((result) => result.hasMore),
    };
  }
  return fetchSingleRecruitPage({
    page,
    limit,
    filters: {
      ...filters,
      dutyName: requestedDutyNames[0] ?? filters.dutyName,
    },
    signal,
  });
}

async function fetchSingleRecruitPage({
  page,
  limit,
  filters,
  signal,
}: RecruitPageOptions): Promise<RecruitPage> {
  const request = {
    page,
    limit,
    dutyName: filters.dutyName,
    dutyType: filters.dutyType,
    targetAreaId: filters.areaId ? Number(filters.areaId) : null,
  };
  const response = isTauriRuntime()
    ? await invokeWithAbort<NetworkResponse>(
        "fetch_recruit_page",
        { request },
        signal,
      )
    : await fetchPublicEndpoint(
        "/api/home/recruit/recruitFbList",
        {
          page,
          limit,
          fb_name: filters.dutyName,
          fb_type: filters.dutyType,
          position: "",
          team_composition: "",
          ...(filters.areaId ? { target_area_id: Number(filters.areaId) } : {}),
        },
        signal,
      );
  const payload = parseSuccessfulPayload(response, "招募列表");
  const data = asRecord(payload.data);

  return {
    items: readRecordArray(data.rows)
      .map(parseSummary)
      .filter((item): item is RecruitSummary => item !== null),
    total: readNumber(data, ["count", "total"]) ?? 0,
    hasMore: page * limit < (readNumber(data, ["count", "total"]) ?? 0),
  };
}

export async function fetchRecruitDetail(
  id: number,
  signal?: AbortSignal,
): Promise<RecruitDetail> {
  const response = isTauriRuntime()
    ? await invokeWithAbort<NetworkResponse>(
        "fetch_recruit_detail",
        { request: { id } },
        signal,
      )
    : await fetchPublicEndpoint(
        "/api/home/recruit/getRecruitFbDetail",
        { id },
        signal,
      );
  const payload = parseSuccessfulPayload(response, "招募详情");
  const record = asRecord(payload.data);
  const summary = parseSummary(record);
  if (!summary) throw new Error("未找到这条招募信息");
  const userInfo = asRecord(record.userInfo);

  return {
    ...summary,
    avatar: readHttpsUrl(userInfo, ["avatar"]) ?? summary.avatar,
    teamDetail: readString(record, ["team_detail_mask"]) ?? "未填写队伍说明",
    recruitRequirements:
      readString(record, ["recruit_require_mask"]) ?? "未填写招募要求",
    strategyDescription:
      readString(record, ["strategy_desc_mask"]) ?? summary.strategy,
    dueDay: readNumber(record, ["due_day"]),
    ipLocation: readString(record, ["ip_location"]) ?? "未提供",
    profile: readString(userInfo, ["profile"]) ?? "",
  };
}

async function fetchRecruitConfigInBrowser(
  signal?: AbortSignal,
): Promise<RecruitConfigTransport> {
  const [jobs, duties, labels, areas] = await Promise.all([
    fetchPublicEndpoint("/api/home/recruit/getJobConfigList", {}, signal),
    fetchPublicEndpoint("/api/home/recruit/getFbConfigList", {}, signal),
    fetchPublicEndpoint("/api/home/recruit/fbLabelList", {}, signal),
    fetchPublicEndpoint(
      "/api/home/groupAndRole/getAreaAndGroupList",
      {},
      signal,
    ),
  ]);
  return { jobs, duties, labels, areas };
}

async function fetchPublicEndpoint(
  path: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<NetworkResponse> {
  const url = new URL(path, API_ORIGIN);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, String(value)),
  );
  url.searchParams.set("tempsuid", crypto.randomUUID());
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(abort, REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    return { status: response.status, body: await response.text() };
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === "AbortError") {
      if (signal?.aborted) throw reason;
      throw new Error("读取招募信息超时，请重试", { cause: reason });
    }
    throw new Error("无法连接石之家招募服务，请检查网络后重试", {
      cause: reason,
    });
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

async function invokeWithAbort<T>(
  command: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
) {
  throwIfAborted(signal);
  try {
    const result = await invoke<T>(command, args);
    throwIfAborted(signal);
    return result;
  } catch (reason) {
    if (isRecruitRateLimitError(reason)) {
      throw new RecruitRateLimitError(readReasonMessage(reason));
    }
    throw reason;
  }
}

function parseSuccessfulPayload(response: NetworkResponse, label: string) {
  if (response.status === 403 || response.status === 429) {
    throw new RecruitRateLimitError(
      `石之家${label}接口返回 HTTP ${response.status}`,
    );
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`石之家${label}接口返回 HTTP ${response.status}`);
  }
  rejectBotChallenge(response.body);
  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error(`石之家${label}接口返回了无法解析的数据`);
  }
  const root = asRecord(payload);
  if (readNumber(root, ["code"]) !== 10_000) {
    const message = readString(root, ["msg", "message"]) ?? `无法读取${label}`;
    if (rateLimitMessage(message)) throw new RecruitRateLimitError(message);
    throw new Error(message);
  }
  return root;
}

function parseJobs(value: unknown) {
  const groups = asRecord(value);
  const jobsById = new Map<number, RecruitJob>();
  Object.values(groups).forEach((group) => {
    readRecordArray(group).forEach((record) => {
      const job = parseJob(record);
      if (job) jobsById.set(job.id, job);
    });
  });
  const roleIds = new Set(
    readRecordArray(groups["职能分类"])
      .map((record) => readNumber(record, ["id"]))
      .filter((id): id is number => id !== null),
  );
  const jobs = [...jobsById.values()];
  return {
    jobs,
    roleJobs: jobs.filter((job) => roleIds.has(job.id)),
  };
}

function parseJob(
  record: UnknownRecord,
  fallbackId?: number,
): RecruitJob | null {
  const id = readNumber(record, ["id"]) ?? fallbackId ?? null;
  const name = readString(record, ["value", "name"]);
  if (id === null || !name) return null;
  return {
    id,
    name,
    icon: readHttpsUrl(record, ["job_pic_url"]),
    category: readString(record, ["job_type"]) ?? "职业",
  };
}

function parseDuty(record: UnknownRecord): RecruitDuty | null {
  const id = readNumber(record, ["id"]);
  const type = readString(record, ["fb_type"]);
  const name = readString(record, ["fb_name"]);
  if (id === null || !type || !name) return null;
  return {
    id,
    type,
    name,
    teamComposition: readString(record, ["team_composition"]) ?? "",
  };
}

function parseLabel(record: UnknownRecord): RecruitLabel | null {
  const name = readString(record, ["name"]);
  if (!name) return null;
  return { id: readNumber(record, ["id"]), name };
}

function parseArea(record: UnknownRecord): RecruitArea | null {
  const id = readNumber(record, ["AreaID", "area_id"]);
  const name = readString(record, ["AreaName", "area_name"]);
  return id !== null && name ? { id, name } : null;
}

function parseSummary(record: UnknownRecord): RecruitSummary | null {
  const id = readNumber(record, ["id"]);
  const dutyName = readString(record, ["fb_name"]);
  if (id === null || !dutyName) return null;
  const userInfo = asRecord(record.userInfo);
  const needJobIds = readNumberArray(record.need_job);
  const jobs = readRecordArray(record.jobInfo)
    .map((job, index) => parseJob(job, needJobIds[index]))
    .filter((job): job is RecruitJob => job !== null);

  return {
    id,
    author: readString(record, ["character_name"]) ?? "匿名冒险者",
    avatar:
      readHttpsUrl(record, ["avatar"]) ?? readHttpsUrl(userInfo, ["avatar"]),
    areaName: readString(record, ["area_name"]) ?? "",
    groupName: readString(record, ["group_name"]) ?? "",
    targetAreaName: readString(record, ["target_area_name"]) ?? "",
    dutyType: readString(record, ["fb_type"]) ?? "其他",
    dutyName,
    schedule: readString(record, ["fb_time"]) ?? "时间待定",
    teamComposition:
      readString(record, ["team_composition"]) ?? "队伍规模未注明",
    progress: readString(record, ["progress"]) ?? "未填写当前进度",
    strategy: readString(record, ["strategy"]) ?? "攻略待定",
    labels: readRecordArray(record.labelInfo)
      .map(parseLabel)
      .filter((label): label is RecruitLabel => label !== null),
    customLabel: readString(record, ["custom_label"]),
    needJobs: jobs,
    slots: parseRecruitSlots(record),
    responseCount: readNumber(record, ["response_num"]) ?? 0,
    publishedAt: readTimestamp(record, ["created_at"]),
    expiresAt: readTimestamp(record, ["end_time"]),
    updatedAt: readString(record, ["updated_at"]) ?? "",
  };
}

function rejectBotChallenge(body: string) {
  if (
    body.includes("__tst_status") ||
    body.includes("EO_Bot_Ssid") ||
    /<script[^>]*>\s*function\s+a\(/i.test(body)
  ) {
    throw new RecruitRateLimitError("石之家触发访问频控，请稍后重试");
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Request aborted.", "AbortError");
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function readRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is UnknownRecord =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

function readNumberArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== "number" && typeof item !== "string") return null;
      const number = Number(item);
      return Number.isFinite(number) ? number : null;
    })
    .filter((item): item is number => item !== null);
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
    if (typeof value !== "number" && typeof value !== "string") continue;
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function readTimestamp(record: UnknownRecord, keys: string[]) {
  const value = readString(record, keys);
  if (value) return value;
  const number = readNumber(record, keys);
  return number === null ? "" : String(number);
}

function readHttpsUrl(record: UnknownRecord, keys: string[]) {
  const value = readString(record, keys);
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
