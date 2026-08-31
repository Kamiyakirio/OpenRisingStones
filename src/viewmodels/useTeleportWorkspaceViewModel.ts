/** Coordinates Regional Teleport authentication, selection, orders, and polling. */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  TeleportArea,
  TeleportLoginMethod,
  TeleportLoginStart,
  TeleportOrder,
  TeleportOrderStatus,
  TeleportRole,
} from "../models/teleport";
import {
  confirmTeleportOrder,
  createTeleportOrder,
  fetchTeleportOrders,
  fetchTeleportOrderStatus,
  fetchTeleportOverview,
  fetchTeleportQueueTime,
  fetchTeleportReturnGroups,
  fetchTeleportRoles,
  fetchTeleportTargets,
  pollTeleportPushLogin,
  pollTeleportQrLogin,
  startTeleportPushLogin,
  startTeleportQrLogin,
  submitTeleportReturn,
  TeleportApiError,
} from "../services/teleportApi";

type Options = {
  authenticated: boolean;
  loginChecking: boolean;
  account: string;
};

export function useTeleportWorkspaceViewModel({
  authenticated,
  loginChecking,
  account,
}: Options) {
  const [loading, setLoading] = useState(false);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crossAuthenticationRequired, setCrossAuthenticationRequired] =
    useState(false);
  const [balance, setBalance] = useState(0);
  const [migrationLimitDays, setMigrationLimitDays] = useState(0);
  const [serviceLimitDays, setServiceLimitDays] = useState(0);
  const [sourceAreas, setSourceAreas] = useState<TeleportArea[]>([]);
  const [targetAreas, setTargetAreas] = useState<TeleportArea[]>([]);
  const [roles, setRoles] = useState<TeleportRole[]>([]);
  const [orders, setOrders] = useState<TeleportOrder[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalOrderPages, setTotalOrderPages] = useState(0);
  const [selectedSourceAreaId, setSelectedSourceAreaId] = useState<
    number | null
  >(null);
  const [selectedSourceGroupId, setSelectedSourceGroupId] = useState<
    number | null
  >(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedTargetAreaId, setSelectedTargetAreaId] = useState<
    number | null
  >(null);
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<
    number | null
  >(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [queueMinutes, setQueueMinutes] = useState<number | null>(null);
  const [crossAccountOverride, setCrossAccount] = useState<string | null>(null);
  const crossAccount = crossAccountOverride ?? usableAccount(account);
  const [crossLogin, setCrossLogin] = useState<TeleportLoginStart | null>(null);
  const [crossLoginMethod, setCrossLoginMethod] =
    useState<TeleportLoginMethod | null>(null);
  const [crossLoginProgress, setCrossLoginProgress] = useState<
    "awaiting_confirmation" | "awaiting_scan" | "scanned" | null
  >(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderStatus, setActiveOrderStatus] =
    useState<TeleportOrderStatus | null>(null);
  const [orderConfirmationRequired, setOrderConfirmationRequired] =
    useState(false);
  const [returnOrder, setReturnOrder] = useState<TeleportOrder | null>(null);
  const [returnAreas, setReturnAreas] = useState<TeleportArea[]>([]);
  const [returnAreaId, setReturnAreaId] = useState<number | null>(null);
  const [returnGroupId, setReturnGroupId] = useState<number | null>(null);

  const selectedSourceArea = useMemo(
    () =>
      sourceAreas.find((area) => area.areaId === selectedSourceAreaId) ?? null,
    [selectedSourceAreaId, sourceAreas],
  );
  const selectedSourceGroup = useMemo(
    () =>
      selectedSourceArea?.groups.find(
        (group) => group.groupId === selectedSourceGroupId,
      ) ?? null,
    [selectedSourceArea, selectedSourceGroupId],
  );
  const selectedRole = useMemo(
    () => roles.find((role) => role.roleId === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );
  const selectedTargetArea = useMemo(
    () =>
      targetAreas.find((area) => area.areaId === selectedTargetAreaId) ?? null,
    [selectedTargetAreaId, targetAreas],
  );
  const selectedTargetGroup = useMemo(
    () =>
      selectedTargetArea?.groups.find(
        (group) => group.groupId === selectedTargetGroupId,
      ) ?? null,
    [selectedTargetArea, selectedTargetGroupId],
  );
  const selectedReturnArea = useMemo(
    () => returnAreas.find((area) => area.areaId === returnAreaId) ?? null,
    [returnAreaId, returnAreas],
  );
  const selectedReturnGroup = useMemo(
    () =>
      selectedReturnArea?.groups.find(
        (group) => group.groupId === returnGroupId,
      ) ?? null,
    [returnGroupId, selectedReturnArea],
  );

  const refresh = useCallback(async () => {
    if (!authenticated || loginChecking) return;
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchTeleportOverview(1, 10);
      setBalance(overview.balance);
      setMigrationLimitDays(overview.migrationLimitDays);
      setServiceLimitDays(overview.serviceLimitDays);
      setSourceAreas(overview.sources);
      setOrders(overview.orders);
      setOrdersPage(1);
      setTotalOrders(overview.totalOrders);
      setTotalOrderPages(overview.totalPages);
      setCrossAuthenticationRequired(false);
    } catch (reason) {
      if (
        reason instanceof TeleportApiError &&
        reason.code === "cross_authentication_required"
      ) {
        setCrossAuthenticationRequired(true);
      } else {
        setError(errorMessage(reason));
      }
    } finally {
      setLoading(false);
    }
  }, [authenticated, loginChecking]);

  useEffect(() => {
    if (!authenticated || loginChecking) return;
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void refresh();
    });
    return () => {
      disposed = true;
    };
  }, [authenticated, loginChecking, refresh]);

  useEffect(() => {
    if (!crossLogin || !crossLoginMethod) return;
    let disposed = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const result = await (crossLoginMethod === "push"
          ? pollTeleportPushLogin(crossLogin.loginId)
          : pollTeleportQrLogin(crossLogin.loginId));
        if (disposed) return;
        if (result.status === "success") {
          setCrossLogin(null);
          setCrossLoginMethod(null);
          setCrossLoginProgress(null);
          setCrossAuthenticationRequired(false);
          await refresh();
          return;
        }
        setCrossLoginProgress(result.status);
        timer = window.setTimeout(() => void poll(), 1500);
      } catch (reason) {
        if (!disposed) {
          setCrossLogin(null);
          setCrossLoginMethod(null);
          setCrossLoginProgress(null);
          setError(errorMessage(reason));
        }
      }
    };
    timer = window.setTimeout(() => void poll(), 1000);
    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [crossLogin, crossLoginMethod, refresh]);

  useEffect(() => {
    if (!activeOrderId || orderConfirmationRequired) return;
    let disposed = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const status = await fetchTeleportOrderStatus(activeOrderId);
        if (disposed) return;
        setActiveOrderStatus(status);
        if (status.migrationStatus === 2) {
          setOrderConfirmationRequired(true);
          return;
        }
        if (status.migrationStatus === 5) {
          setActiveOrderId(null);
          setActionLoading(false);
          await refresh();
          return;
        }
        if ([-1, -2, -3, -5].includes(status.migrationStatus)) {
          setActiveOrderId(null);
          setActionLoading(false);
          return;
        }
        timer = window.setTimeout(() => void poll(), 3000);
      } catch (reason) {
        if (!disposed) {
          setError(errorMessage(reason));
          setActiveOrderId(null);
          setActionLoading(false);
        }
      }
    };
    void poll();
    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [activeOrderId, orderConfirmationRequired, refresh]);

  const startCrossAuthentication = useCallback(
    async (method: TeleportLoginMethod) => {
      const normalizedAccount = crossAccount.trim();
      if (method === "push" && normalizedAccount.length < 5) {
        setError("请输入完整的盛趣账号或手机号");
        return;
      }
      setActionLoading(true);
      setError(null);
      try {
        const started =
          method === "push"
            ? await startTeleportPushLogin(normalizedAccount)
            : await startTeleportQrLogin();
        setCrossLogin(started);
        setCrossLoginMethod(method);
        setCrossLoginProgress(started.status);
      } catch (reason) {
        setError(errorMessage(reason));
      } finally {
        setActionLoading(false);
      }
    },
    [crossAccount],
  );

  const selectSourceArea = useCallback((areaId: number | null) => {
    setSelectedSourceAreaId(areaId);
    setSelectedSourceGroupId(null);
    setSelectedRoleId(null);
    setSelectedTargetAreaId(null);
    setSelectedTargetGroupId(null);
    setRoles([]);
    setTargetAreas([]);
    setQueueMinutes(null);
  }, []);

  const selectSourceGroup = useCallback((groupId: number | null) => {
    setSelectedSourceGroupId(groupId);
    setSelectedRoleId(null);
    setSelectedTargetAreaId(null);
    setSelectedTargetGroupId(null);
    setRoles([]);
    setTargetAreas([]);
    setQueueMinutes(null);
  }, []);

  const findRolesAndTargets = useCallback(async () => {
    if (!selectedSourceArea || !selectedSourceGroup) return;
    setSelectionLoading(true);
    setError(null);
    try {
      const [nextRoles, nextTargets] = await Promise.all([
        fetchTeleportRoles(
          selectedSourceArea.areaId,
          selectedSourceGroup.groupId,
        ),
        fetchTeleportTargets(
          selectedSourceArea.areaId,
          selectedSourceGroup.groupId,
        ),
      ]);
      setRoles(nextRoles);
      setTargetAreas(
        nextTargets.filter((area) => area.areaId !== selectedSourceArea.areaId),
      );
      setSelectedRoleId(null);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSelectionLoading(false);
    }
  }, [selectedSourceArea, selectedSourceGroup]);

  const selectTargetArea = useCallback((areaId: number | null) => {
    setSelectedTargetAreaId(areaId);
    setSelectedTargetGroupId(null);
    setQueueMinutes(null);
  }, []);

  const selectTargetGroup = useCallback(
    async (groupId: number | null) => {
      setSelectedTargetGroupId(groupId);
      setQueueMinutes(null);
      if (!selectedTargetArea || groupId === null) return;
      try {
        setQueueMinutes(
          await fetchTeleportQueueTime(selectedTargetArea.areaId, groupId),
        );
      } catch {
        // Queue estimates are optional and must not block a valid order.
      }
    },
    [selectedTargetArea],
  );

  const submitTravel = useCallback(async () => {
    if (
      !selectedSourceArea ||
      !selectedSourceGroup ||
      !selectedTargetArea ||
      !selectedTargetGroup ||
      !selectedRole ||
      !termsAccepted
    ) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setActiveOrderStatus(null);
    try {
      const orderId = await createTeleportOrder({
        sourceArea: selectedSourceArea,
        sourceGroup: selectedSourceGroup,
        targetArea: selectedTargetArea,
        targetGroup: selectedTargetGroup,
        role: selectedRole,
      });
      setActiveOrderId(orderId);
    } catch (reason) {
      setActionLoading(false);
      setError(errorMessage(reason));
    }
  }, [
    selectedRole,
    selectedSourceArea,
    selectedSourceGroup,
    selectedTargetArea,
    selectedTargetGroup,
    termsAccepted,
  ]);

  const resolveOrderConfirmation = useCallback(
    async (confirm: boolean) => {
      if (!activeOrderId) return;
      setActionLoading(true);
      setError(null);
      try {
        await confirmTeleportOrder(activeOrderId, confirm);
        setOrderConfirmationRequired(false);
        if (!confirm) {
          setActiveOrderId(null);
          setActionLoading(false);
          await refresh();
        }
      } catch (reason) {
        setActionLoading(false);
        setError(errorMessage(reason));
      }
    },
    [activeOrderId, refresh],
  );

  const loadOrders = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTeleportOrders(page, 10);
      setOrders(result.items);
      setOrdersPage(page);
      setTotalOrders(result.total);
      setTotalOrderPages(result.totalPages);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  const prepareReturn = useCallback(async (order: TeleportOrder) => {
    setActionLoading(true);
    setError(null);
    try {
      const areas = await fetchTeleportReturnGroups();
      const initialArea =
        areas.find((area) => area.areaId === order.targetAreaId) ??
        areas[0] ??
        null;
      const initialGroup =
        initialArea?.groups.find(
          (group) => group.groupId === order.targetGroupId,
        ) ??
        initialArea?.groups[0] ??
        null;
      setReturnAreas(areas);
      setReturnOrder(order);
      setReturnAreaId(initialArea?.areaId ?? null);
      setReturnGroupId(initialGroup?.groupId ?? null);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setActionLoading(false);
    }
  }, []);

  const selectReturnArea = useCallback(
    (areaId: number | null) => {
      const area = returnAreas.find((item) => item.areaId === areaId) ?? null;
      setReturnAreaId(areaId);
      setReturnGroupId(area?.groups[0]?.groupId ?? null);
    },
    [returnAreas],
  );

  const closeReturn = useCallback(() => {
    setReturnOrder(null);
    setReturnAreas([]);
    setReturnAreaId(null);
    setReturnGroupId(null);
  }, []);

  const submitReturn = useCallback(async () => {
    if (!returnOrder || !selectedReturnGroup) return;
    setActionLoading(true);
    setError(null);
    try {
      await submitTeleportReturn(returnOrder.orderId, selectedReturnGroup);
      closeReturn();
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setActionLoading(false);
    }
  }, [closeReturn, refresh, returnOrder, selectedReturnGroup]);

  return {
    authenticated,
    loginChecking,
    loading,
    selectionLoading,
    actionLoading,
    error,
    crossAuthenticationRequired,
    balance,
    migrationLimitDays,
    serviceLimitDays,
    sourceAreas,
    targetAreas,
    roles,
    orders,
    ordersPage,
    totalOrders,
    totalOrderPages,
    selectedSourceArea,
    selectedSourceGroup,
    selectedRole,
    selectedTargetArea,
    selectedTargetGroup,
    selectedSourceAreaId,
    selectedSourceGroupId,
    selectedRoleId,
    selectedTargetAreaId,
    selectedTargetGroupId,
    termsAccepted,
    queueMinutes,
    crossAccount,
    crossLogin,
    crossLoginMethod,
    crossLoginProgress,
    activeOrderId,
    activeOrderStatus,
    orderConfirmationRequired,
    returnOrder,
    returnAreas,
    returnAreaId,
    returnGroupId,
    selectedReturnGroup,
    refresh,
    setCrossAccount,
    startCrossAuthentication,
    selectSourceArea,
    selectSourceGroup,
    setSelectedRoleId,
    findRolesAndTargets,
    selectTargetArea,
    selectTargetGroup,
    setTermsAccepted,
    submitTravel,
    resolveOrderConfirmation,
    loadOrders,
    prepareReturn,
    selectReturnArea,
    setReturnGroupId,
    closeReturn,
    submitReturn,
  };
}

export type TeleportWorkspaceViewModel = ReturnType<
  typeof useTeleportWorkspaceViewModel
>;

function usableAccount(account: string) {
  const normalized = account.trim();
  return normalized.includes("*") ? "" : normalized;
}

function errorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : typeof reason === "string"
      ? reason
      : "超域传送请求失败，请稍后重试";
}
