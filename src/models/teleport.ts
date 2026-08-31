/** Domain contracts for the official Regional Teleport service. */
export type TeleportGroup = {
  groupId: number;
  groupName: string;
  groupCode: string;
  amount: number;
  queueTime?: number;
};

export type TeleportArea = {
  areaId: number;
  areaName: string;
  state?: number;
  groups: TeleportGroup[];
};

export type TeleportRole = {
  roleId: string;
  roleName: string;
  key: number;
};

export type TeleportOrderDetail = {
  roleId: string;
  roleName: string;
  checkErrorMsg: string | null;
  migrationErrorMsg: string | null;
};

export type TeleportOrder = {
  orderId: string;
  migrationType: number;
  migrationStatus: number;
  migrationStatusDesc: string;
  travelStatus: number;
  status: number;
  createTime: string;
  areaId: number;
  areaName: string;
  groupId: number;
  groupName: string;
  groupCode: string;
  targetAreaId: number;
  targetAreaName: string;
  targetGroupId: number;
  targetGroupName: string;
  targetGroupCode: string;
  migrationDetailList: TeleportOrderDetail[];
};

export type TeleportOverview = {
  balance: number;
  migrationLimitDays: number;
  serviceLimitDays: number;
  sources: TeleportArea[];
  orders: TeleportOrder[];
  totalOrders: number;
  totalPages: number;
};

export type TeleportOrderStatus = {
  orderStatus: number;
  migrationStatus: number;
  migrationResult: number;
  messages: Array<{
    roleId: string;
    roleName: string;
    checkMsg: string | null;
    migrationMsg: string | null;
    checkErrorCode: number;
    migrationErrorCode: number;
  }>;
};

export type TeleportCreateOrderRequest = {
  sourceArea: TeleportArea;
  sourceGroup: TeleportGroup;
  targetArea: TeleportArea;
  targetGroup: TeleportGroup;
  role: TeleportRole;
};

export type TeleportLoginMethod = "push" | "qr";

export type TeleportLoginStart = {
  loginId: number;
  status: "awaiting_confirmation" | "awaiting_scan" | "scanned";
  expiresInSeconds: number;
  qrImageDataUrl: string | null;
};

export type TeleportLoginPoll = {
  status: "awaiting_confirmation" | "awaiting_scan" | "scanned" | "success";
};
