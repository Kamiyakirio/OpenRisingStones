/**
 * Official Regional Teleport adapter.
 * Authentication stays inside the Tauri backend; this module normalizes public data only.
 */
import { invoke } from "@tauri-apps/api/core";
import type {
  TeleportArea,
  TeleportCreateOrderRequest,
  TeleportOrder,
  TeleportOrderStatus,
  TeleportOverview,
  TeleportRole,
} from "../models/teleport";
import {
  authenticationRequired,
  isSdoAuthenticationFailure,
} from "../features/auth/utils/authEvents";
import { isTauriRuntime } from "../shared/utils/runtime";

type UnknownRecord = Record<string, unknown>;
type ApiEnvelope = {
  return_code?: number;
  return_message?: string;
  data?: UnknownRecord;
};

const CROSS_AUTHENTICATION_CODE = -10_339_506;

export class TeleportApiError extends Error {
  readonly code: "cross_authentication_required" | "remote_error";

  constructor(
    code: "cross_authentication_required" | "remote_error",
    message: string,
  ) {
    super(message);
    this.name = "TeleportApiError";
    this.code = code;
  }
}

export async function fetchTeleportOverview(
  page = 1,
  pageSize = 10,
): Promise<TeleportOverview> {
  const payload = asRecord(
    await invokeTeleport({ action: "overview", page, pageSize }),
  );
  const pageInit = requireSuccess(payload.pageInit);
  const sources = requireSuccess(payload.sources);
  const orders = requireSuccess(payload.orders);
  return {
    balance: readNumber(pageInit, "balance"),
    migrationLimitDays: readNumber(pageInit, "migLimitDays"),
    serviceLimitDays: readNumber(pageInit, "dataMigLimitDays"),
    sources: parseEmbeddedArray(sources.groupList)
      .map(toArea)
      .filter(isPresent),
    orders: parseEmbeddedArray(orders.orderlist).map(toOrder).filter(isPresent),
    totalOrders: readNumber(orders, "totalCount"),
    totalPages: readNumber(orders, "totalPageNum"),
  };
}

export async function fetchTeleportRoles(areaId: number, groupId: number) {
  const data = requireSuccess(
    await invokeTeleport({ action: "roles", areaId, groupId }),
  );
  return parseEmbeddedArray(data.roleList).map(toRole).filter(isPresent);
}

export async function fetchTeleportTargets(areaId: number, groupId: number) {
  const data = requireSuccess(
    await invokeTeleport({ action: "targets", areaId, groupId }),
  );
  return parseEmbeddedArray(data.groupList).map(toArea).filter(isPresent);
}

export async function fetchTeleportQueueTime(
  targetAreaId: number,
  targetGroupId: number,
) {
  const data = requireSuccess(
    await invokeTeleport({
      action: "queueTime",
      targetAreaId,
      targetGroupId,
    }),
  );
  return typeof data.minutes === "number" ? data.minutes : null;
}

export async function createTeleportOrder(request: TeleportCreateOrderRequest) {
  const data = requireSuccess(
    await invokeTeleport({
      action: "createOrder",
      areaId: request.sourceArea.areaId,
      areaName: request.sourceArea.areaName,
      groupId: request.sourceGroup.groupId,
      groupCode: request.sourceGroup.groupCode,
      groupName: request.sourceGroup.groupName,
      targetAreaId: request.targetArea.areaId,
      targetAreaName: request.targetArea.areaName,
      targetGroupId: request.targetGroup.groupId,
      targetGroupCode: request.targetGroup.groupCode,
      targetGroupName: request.targetGroup.groupName,
      role: request.role,
    }),
  );
  const orderId = readString(data, "orderId");
  if (!orderId) throw new Error("超域传送接口没有返回订单编号");
  return orderId;
}

export async function fetchTeleportOrderStatus(
  orderId: string,
): Promise<TeleportOrderStatus> {
  const data = requireSuccess(
    await invokeTeleport({ action: "orderStatus", orderId }),
  );
  return {
    orderStatus: readNumber(data, "orderStatus"),
    migrationStatus: readNumber(data, "migrationStatus"),
    migrationResult: readNumber(data, "migrationResult"),
    messages: parseEmbeddedArray(data.migrationMsg).map((value) => ({
      roleId: readString(value, "roleId"),
      roleName: readString(value, "roleName"),
      checkMsg: readNullableString(value, "checkMsg"),
      migrationMsg: readNullableString(value, "migrationMsg"),
      checkErrorCode: readNumber(value, "checkErrorCode"),
      migrationErrorCode: readNumber(value, "migrationErrorCode"),
    })),
  };
}

export async function confirmTeleportOrder(orderId: string, confirm: boolean) {
  requireSuccess(
    await invokeTeleport({
      action: "confirmOrder",
      orderId,
      confirmType: confirm ? 1 : 0,
    }),
  );
}

export async function fetchTeleportOrders(page: number, pageSize = 10) {
  const data = requireSuccess(
    await invokeTeleport({ action: "orders", page, pageSize }),
  );
  return {
    items: parseEmbeddedArray(data.orderlist).map(toOrder).filter(isPresent),
    total: readNumber(data, "totalCount"),
    totalPages: readNumber(data, "totalPageNum"),
  };
}

export async function fetchTeleportReturnGroups() {
  const data = requireSuccess(await invokeTeleport({ action: "returnGroups" }));
  return parseEmbeddedArray(data.groupList).map(toArea).filter(isPresent);
}

export async function submitTeleportReturn(
  orderId: string,
  group: { groupId: number; groupCode: string; groupName: string },
) {
  const data = requireSuccess(
    await invokeTeleport({
      action: "travelBack",
      orderId,
      groupId: group.groupId,
      groupCode: group.groupCode,
      groupName: group.groupName,
    }),
  );
  const returnOrderId = readString(data, "orderId");
  if (!returnOrderId) throw new Error("返回申请没有生成订单编号");
  return returnOrderId;
}

export async function fetchAutomaticTeleportReadiness() {
  requireDesktopRuntime();
  return invoke<{ gameAuthReady: boolean }>("teleport_automatic_preflight");
}

async function invokeTeleport(request: Record<string, unknown>) {
  requireDesktopRuntime();
  try {
    const response = await invoke<unknown>("fetch_teleport", { request });
    if (!hasCrossAuthenticationFailure(response)) return response;
    await invoke<void>("refresh_teleport_service_session");
    return await invoke<unknown>("fetch_teleport", { request });
  } catch (reason) {
    if (isSdoAuthenticationFailure(reason)) throw authenticationRequired();
    throw reason;
  }
}

function hasCrossAuthenticationFailure(value: unknown, depth = 0): boolean {
  if (depth > 4 || typeof value !== "object" || value === null) return false;
  if (Array.isArray(value)) {
    return value.some((item) => hasCrossAuthenticationFailure(item, depth + 1));
  }
  const record = value as UnknownRecord;
  if (Number(record.return_code) === CROSS_AUTHENTICATION_CODE) return true;
  return Object.values(record).some((item) =>
    hasCrossAuthenticationFailure(item, depth + 1),
  );
}

function requireDesktopRuntime() {
  if (!isTauriRuntime())
    throw new Error("请在 OpenRisingStones 桌面端使用超域传送");
}

function requireSuccess(value: unknown) {
  const envelope = asRecord(value) as ApiEnvelope;
  const code = Number(envelope.return_code ?? Number.NaN);
  if (code === 0 && envelope.data) return envelope.data;
  const message = String(envelope.return_message || "超域传送服务返回失败");
  if (code === CROSS_AUTHENTICATION_CODE) {
    throw new TeleportApiError("cross_authentication_required", message);
  }
  throw new TeleportApiError("remote_error", message);
}

function parseEmbeddedArray(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.map(asRecord);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(asRecord) : [];
  } catch {
    throw new Error("超域传送接口返回了无法解析的数据");
  }
}

function toArea(value: UnknownRecord): TeleportArea | null {
  const areaId = readNumber(value, "areaId");
  const areaName = readString(value, "areaName");
  if (!areaId || !areaName) return null;
  return {
    areaId,
    areaName,
    state: typeof value.state === "number" ? value.state : undefined,
    groups: Array.isArray(value.groups)
      ? value.groups.map(asRecord).map(toGroup).filter(isPresent)
      : [],
  };
}

function toGroup(value: UnknownRecord) {
  const groupId = readNumber(value, "groupId");
  const groupName = readString(value, "groupName");
  const groupCode = readString(value, "groupCode");
  if (!groupId || !groupName || !groupCode) return null;
  return {
    groupId,
    groupName,
    groupCode,
    amount: readNumber(value, "amount"),
    queueTime:
      typeof value.queueTime === "number" ? value.queueTime : undefined,
  };
}

function toRole(value: UnknownRecord): TeleportRole | null {
  const roleId = readString(value, "roleId");
  const roleName = readString(value, "roleName");
  if (!roleId || !roleName) return null;
  return { roleId, roleName, key: readNumber(value, "key") };
}

function toOrder(value: UnknownRecord): TeleportOrder | null {
  const orderId = readString(value, "orderId");
  if (!orderId) return null;
  const details = Array.isArray(value.migrationDetailList)
    ? value.migrationDetailList.map(asRecord)
    : [];
  return {
    orderId,
    migrationType: readNumber(value, "migrationType"),
    migrationStatus: readNumber(value, "migrationStatus"),
    migrationStatusDesc: readString(value, "migrationStatusDesc"),
    travelStatus: readNumber(value, "travelStatus"),
    status: readNumber(value, "status"),
    createTime: readString(value, "createTime"),
    areaId: readNumber(value, "areaId"),
    areaName: readString(value, "areaName"),
    groupId: readNumber(value, "groupId"),
    groupName: readString(value, "groupName"),
    groupCode: readString(value, "groupCode"),
    targetAreaId: readNumber(value, "targetAreaId"),
    targetAreaName: readString(value, "targetAreaName"),
    targetGroupId: readNumber(value, "targetGroupId"),
    targetGroupName: readString(value, "targetGroupName"),
    targetGroupCode: readString(value, "targetGroupCode"),
    migrationDetailList: details.map((detail) => ({
      roleId: readString(detail, "roleId"),
      roleName: readString(detail, "roleName"),
      checkErrorMsg: readNullableString(detail, "checkErrorMsg"),
      migrationErrorMsg: readNullableString(detail, "migrationErrorMsg"),
    })),
  };
}

function readString(record: UnknownRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(record: UnknownRecord, key: string) {
  const value = readString(record, key);
  return value || null;
}

function readNumber(record: UnknownRecord, key: string) {
  const value = Number(record[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
