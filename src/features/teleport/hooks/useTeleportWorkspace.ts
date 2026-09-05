/** Coordinates Regional Teleport authentication, selection, orders, and polling. */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  TeleportArea,
  TeleportGroup,
  TeleportOrder,
  TeleportOrderStatus,
  TeleportRole,
} from "../types";
import {
  confirmTeleportOrder,
  createTeleportOrder,
  fetchAutomaticTeleportReadiness,
  fetchTeleportOrders,
  fetchTeleportOrderStatus,
  fetchTeleportOverview,
  fetchTeleportQueueTime,
  fetchTeleportReturnGroups,
  fetchTeleportRoles,
  fetchTeleportTargets,
  submitTeleportReturn,
} from "../api/teleportApi";
import {
  applyTeleportGameRegion,
  logoutGameToTitle,
  normalizeGameBridgeError,
  prepareGameBridge,
  readGameBridge,
} from "../../../shared/game-bridge/api";
import type {
  ActiveCharacterSnapshot,
  GameSnapshot,
} from "../../../shared/game-bridge/types";

export type TeleportMode = "manual" | "automatic";
export type AutomaticTeleportStage =
  | "idle"
  | "connecting"
  | "reading_character"
  | "awaiting_logout_confirmation"
  | "logging_out"
  | "submitting"
  | "waiting_order"
  | "switching_region"
  | "ready"
  | "failed";

type Options = {
  authenticated: boolean;
  loginChecking: boolean;
};

type MemoryCharacter = ActiveCharacterSnapshot | GameSnapshot;

export function useTeleportWorkspaceViewModel({
  authenticated,
  loginChecking,
}: Options) {
  const [loading, setLoading] = useState(false);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TeleportMode>("manual");
  const [automaticRiskOpen, setAutomaticRiskOpen] = useState(false);
  const [automaticStage, setAutomaticStage] =
    useState<AutomaticTeleportStage>("idle");
  const [logoutConfirmationRequired, setLogoutConfirmationRequired] =
    useState(false);
  const [pendingAutomaticTarget, setPendingAutomaticTarget] =
    useState<TeleportGroup | null>(null);
  const [activeTravelMode, setActiveTravelMode] = useState<TeleportMode | null>(
    null,
  );
  const [activeDestination, setActiveDestination] = useState<{
    area: TeleportArea;
    group: TeleportGroup;
  } | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(
    null,
  );
  const [automaticCharacter, setAutomaticCharacter] =
    useState<MemoryCharacter | null>(null);
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
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderStatus, setActiveOrderStatus] =
    useState<TeleportOrderStatus | null>(null);
  const [orderConfirmationRequired, setOrderConfirmationRequired] =
    useState(false);
  const [returnOrder, setReturnOrder] = useState<TeleportOrder | null>(null);
  const [returnAreas, setReturnAreas] = useState<TeleportArea[]>([]);
  const [returnAreaId, setReturnAreaId] = useState<number | null>(null);
  const [returnGroupId, setReturnGroupId] = useState<number | null>(null);
  const [returnLocationOverride, setReturnLocationOverride] = useState(false);

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
  const resolvedTargetGroup = useMemo(() => {
    if (selectedTargetGroup) return selectedTargetGroup;
    return (
      [...(selectedTargetArea?.groups ?? [])].sort(
        (left, right) => left.groupId - right.groupId,
      )[0] ?? null
    );
  }, [selectedTargetArea, selectedTargetGroup]);
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
    } catch (reason) {
      setError(errorMessage(reason));
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
          setActionLoading(false);
          return;
        }
        if (status.migrationStatus === 5) {
          setActiveOrderId(null);
          if (activeTravelMode === "automatic" && activeDestination) {
            setAutomaticStage("switching_region");
            try {
              await applyTeleportGameRegion(activeDestination.area.areaName);
              if (disposed) return;
              setAutomaticStage("ready");
              setCompletionMessage(
                `超域传送已完成，实际目的地为 ${activeDestination.area.areaName} / ${activeDestination.group.groupName}。游戏连接已准备完成，现在可以登录游戏。`,
              );
            } catch (reason) {
              if (disposed) return;
              setAutomaticStage("failed");
              setError(
                `官方订单已经完成，但游戏服务器切换失败：${gameBridgeErrorMessage(reason)}`,
              );
            }
          } else if (activeDestination) {
            setCompletionMessage(
              `超域传送已完成，实际目的地为 ${activeDestination.area.areaName} / ${activeDestination.group.groupName}。`,
            );
          }
          setActionLoading(false);
          setActiveTravelMode(null);
          setActiveDestination(null);
          await refresh();
          return;
        }
        if ([-1, -2, -3, -5].includes(status.migrationStatus)) {
          setActiveOrderId(null);
          setActionLoading(false);
          if (activeTravelMode === "automatic") setAutomaticStage("failed");
          setActiveTravelMode(null);
          setActiveDestination(null);
          return;
        }
        timer = window.setTimeout(() => void poll(), 3000);
      } catch (reason) {
        if (!disposed) {
          setError(errorMessage(reason));
          setActiveOrderId(null);
          setActionLoading(false);
          if (activeTravelMode === "automatic") setAutomaticStage("failed");
          setActiveTravelMode(null);
          setActiveDestination(null);
        }
      }
    };
    void poll();
    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [
    activeDestination,
    activeOrderId,
    activeTravelMode,
    orderConfirmationRequired,
    refresh,
  ]);

  const requestMode = useCallback((nextMode: TeleportMode) => {
    if (nextMode === "automatic") {
      setAutomaticRiskOpen(true);
      return;
    }
    setMode("manual");
    setAutomaticRiskOpen(false);
    setAutomaticStage("idle");
    setAutomaticCharacter(null);
    setLogoutConfirmationRequired(false);
    setPendingAutomaticTarget(null);
  }, []);

  const cancelAutomaticRisk = useCallback(() => {
    setAutomaticRiskOpen(false);
  }, []);

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

  const resolveAutomaticSource = useCallback(
    async (character: MemoryCharacter) => {
      const preferredAreas = character.currentRegion
        ? sourceAreas.filter(
            (area) => area.areaName === character.currentRegion,
          )
        : sourceAreas;
      const candidateAreas = preferredAreas.length
        ? preferredAreas
        : sourceAreas;
      for (const area of candidateAreas) {
        for (const group of area.groups) {
          const groupRoles = await fetchTeleportRoles(
            area.areaId,
            group.groupId,
          );
          const role = groupRoles.find(
            (candidate) => candidate.roleId === character.contentId,
          );
          if (role) return { area, group, role };
        }
      }
      throw new Error("官方角色列表中没有找到当前游戏角色");
    },
    [sourceAreas],
  );

  const initializeAutomaticSource = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    setAutomaticCharacter(null);
    setSelectedSourceAreaId(null);
    setSelectedSourceGroupId(null);
    setSelectedRoleId(null);
    setSelectedTargetAreaId(null);
    setSelectedTargetGroupId(null);
    setRoles([]);
    setTargetAreas([]);
    setQueueMinutes(null);
    try {
      setAutomaticStage("connecting");
      const readiness = await fetchAutomaticTeleportReadiness();
      if (!readiness.gameAuthReady) {
        throw new Error(
          "当前主账号会话无法刷新游戏票据，请使用一键确认或扫码重新登录主账号",
        );
      }
      const bridgeStatus = await prepareGameBridge();
      setAutomaticStage("reading_character");
      const response = await readGameBridge([
        "game_state",
        "active_character",
        "selected_character",
      ]);
      if (!response.gameState) {
        throw new Error("无法判断当前游戏画面，请等待游戏稳定后重试");
      }
      if (!response.gameState.regionSwitchSupported) {
        throw new Error("当前游戏版本尚未完成自动切区验证，请使用手动模式");
      }
      const character =
        response.activeCharacter ??
        response.selectedCharacter ??
        bridgeStatus.snapshot ??
        null;
      if (!character) {
        throw new Error("无法读取当前角色，请进入游戏或角色选择画面后重试");
      }
      if (character.currentWorldId !== character.homeWorldId) {
        throw new Error("当前角色不在原始服务器，无法发起超域传送");
      }

      const source = await resolveAutomaticSource(character);
      const targets = await fetchTeleportTargets(
        source.area.areaId,
        source.group.groupId,
      );
      setAutomaticCharacter(character);
      setSelectedSourceAreaId(source.area.areaId);
      setSelectedSourceGroupId(source.group.groupId);
      setRoles([source.role]);
      setSelectedRoleId(source.role.roleId);
      setTargetAreas(
        targets.filter((area) => area.areaId !== source.area.areaId),
      );
      setAutomaticStage("idle");
    } catch (reason) {
      setAutomaticStage("failed");
      setError(gameBridgeErrorMessage(reason));
    } finally {
      setActionLoading(false);
    }
  }, [resolveAutomaticSource]);

  const confirmAutomaticRisk = useCallback(() => {
    setMode("automatic");
    setAutomaticRiskOpen(false);
    void initializeAutomaticSource();
  }, [initializeAutomaticSource]);

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

  const createOrderForTarget = useCallback(
    async (targetGroup: TeleportGroup, travelMode: TeleportMode) => {
      if (
        !selectedSourceArea ||
        !selectedSourceGroup ||
        !selectedTargetArea ||
        !selectedRole
      ) {
        throw new Error("传送选择不完整，请重新选择后再提交");
      }
      const orderId = await createTeleportOrder({
        sourceArea: selectedSourceArea,
        sourceGroup: selectedSourceGroup,
        targetArea: selectedTargetArea,
        targetGroup,
        role: selectedRole,
      });
      setSelectedTargetGroupId(targetGroup.groupId);
      setActiveDestination({ area: selectedTargetArea, group: targetGroup });
      setActiveTravelMode(travelMode);
      setActiveOrderId(orderId);
      if (travelMode === "automatic") setAutomaticStage("waiting_order");
    },
    [selectedRole, selectedSourceArea, selectedSourceGroup, selectedTargetArea],
  );

  const submitTravel = useCallback(async () => {
    if (
      !selectedSourceArea ||
      !selectedSourceGroup ||
      !selectedTargetArea ||
      !resolvedTargetGroup ||
      !selectedRole ||
      !termsAccepted
    ) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setCompletionMessage(null);
    setActiveOrderStatus(null);
    try {
      if (mode === "manual") {
        await createOrderForTarget(resolvedTargetGroup, "manual");
        return;
      }

      setAutomaticStage("connecting");
      const readiness = await fetchAutomaticTeleportReadiness();
      if (!readiness.gameAuthReady) {
        throw new Error(
          "当前主账号会话无法刷新游戏票据，请使用一键确认或扫码重新登录主账号",
        );
      }
      await prepareGameBridge();
      setAutomaticStage("reading_character");
      const response = await readGameBridge([
        "game_state",
        "active_character",
        "selected_character",
      ]);
      if (!response.gameState) {
        throw new Error("无法判断当前游戏画面，请等待游戏稳定后重试");
      }
      if (!response.gameState.regionSwitchSupported) {
        throw new Error("当前游戏版本尚未完成自动切区验证，请使用手动模式");
      }
      const character =
        response.activeCharacter ?? response.selectedCharacter ?? null;
      if (response.gameState.screen !== "title" && !character) {
        throw new Error("无法读取当前角色，请进入游戏或角色选择画面后重试");
      }
      if (character && character.contentId !== selectedRole.roleId) {
        throw new Error(
          `当前游戏角色为 ${character.characterName}，与页面所选角色不一致`,
        );
      }
      if (
        character?.currentRegion &&
        character.currentRegion !== selectedSourceArea.areaName
      ) {
        throw new Error(
          `当前游戏大区为 ${character.currentRegion}，与页面所选大区不一致`,
        );
      }
      if (response.gameState.screen === "title") {
        setAutomaticStage("submitting");
        await createOrderForTarget(resolvedTargetGroup, "automatic");
        return;
      }
      if (
        response.gameState.screen !== "in_world" &&
        response.gameState.screen !== "character_select"
      ) {
        throw new Error("游戏正在加载或切换画面，请稍后再试");
      }
      setPendingAutomaticTarget(resolvedTargetGroup);
      setLogoutConfirmationRequired(true);
      setAutomaticStage("awaiting_logout_confirmation");
      setActionLoading(false);
    } catch (reason) {
      setActionLoading(false);
      if (mode === "automatic") setAutomaticStage("failed");
      setError(errorMessage(reason));
    }
  }, [
    createOrderForTarget,
    mode,
    resolvedTargetGroup,
    selectedRole,
    selectedSourceArea,
    selectedSourceGroup,
    selectedTargetArea,
    termsAccepted,
  ]);

  const resolveLogoutConfirmation = useCallback(
    async (confirm: boolean) => {
      setLogoutConfirmationRequired(false);
      if (!confirm || !pendingAutomaticTarget) {
        setPendingAutomaticTarget(null);
        setAutomaticStage("idle");
        setActionLoading(false);
        return;
      }
      setActionLoading(true);
      setError(null);
      try {
        setAutomaticStage("logging_out");
        await logoutGameToTitle();
        setAutomaticStage("submitting");
        await createOrderForTarget(pendingAutomaticTarget, "automatic");
        setPendingAutomaticTarget(null);
      } catch (reason) {
        setActionLoading(false);
        setPendingAutomaticTarget(null);
        setAutomaticStage("failed");
        setError(gameBridgeErrorMessage(reason));
      }
    },
    [createOrderForTarget, pendingAutomaticTarget],
  );

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
          if (activeTravelMode === "automatic") setAutomaticStage("failed");
          setActiveTravelMode(null);
          setActiveDestination(null);
          await refresh();
        }
      } catch (reason) {
        setActionLoading(false);
        setError(errorMessage(reason));
      }
    },
    [activeOrderId, activeTravelMode, refresh],
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
      setReturnLocationOverride(false);
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
    setReturnLocationOverride(false);
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
    mode,
    automaticRiskOpen,
    automaticStage,
    logoutConfirmationRequired,
    completionMessage,
    automaticCharacter,
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
    resolvedTargetGroup,
    selectedSourceAreaId,
    selectedSourceGroupId,
    selectedRoleId,
    selectedTargetAreaId,
    selectedTargetGroupId,
    termsAccepted,
    queueMinutes,
    activeOrderId,
    activeOrderStatus,
    orderConfirmationRequired,
    returnOrder,
    returnAreas,
    returnAreaId,
    returnGroupId,
    selectedReturnGroup,
    returnLocationOverride,
    refresh,
    requestMode,
    confirmAutomaticRisk,
    cancelAutomaticRisk,
    initializeAutomaticSource,
    selectSourceArea,
    selectSourceGroup,
    setSelectedRoleId,
    findRolesAndTargets,
    selectTargetArea,
    selectTargetGroup,
    setTermsAccepted,
    submitTravel,
    resolveLogoutConfirmation,
    resolveOrderConfirmation,
    loadOrders,
    prepareReturn,
    selectReturnArea,
    setReturnGroupId,
    setReturnLocationOverride,
    closeReturn,
    submitReturn,
    dismissCompletion: () => setCompletionMessage(null),
  };
}

export type TeleportWorkspaceViewModel = ReturnType<
  typeof useTeleportWorkspaceViewModel
>;

function errorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : typeof reason === "string"
      ? reason
      : "超域传送请求失败，请稍后重试";
}

function gameBridgeErrorMessage(reason: unknown) {
  return normalizeGameBridgeError(reason).message;
}
