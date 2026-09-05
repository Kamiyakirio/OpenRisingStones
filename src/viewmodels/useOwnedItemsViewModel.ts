/** Coordinates consent, encrypted cache hydration, item metadata, and ownership matching. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ItemSheetInfo } from "../models/item";
import type {
  OwnedItemMatch,
  OwnedItemSource,
  OwnedItemsSnapshot,
} from "../models/ownedItems";
import { normalizeGameBridgeError } from "../shared/game-bridge/api";
import {
  fetchCabinetItemIds,
  fetchItemSheetInfo,
} from "../services/itemSheetApi";
import {
  loadOwnedItemsCache,
  syncOwnedItemsFromGame,
} from "../services/ownedItems";
import {
  buildOwnedItemIndex,
  buildOwnedModelIndex,
  matchOwnedItem,
} from "../utils/ownedItems";

export type OwnedItemsStatus =
  "loading_cache" | "idle" | "syncing" | "ready" | "error";

export function useOwnedItemsViewModel(enabled: boolean) {
  const [status, setStatus] = useState<OwnedItemsStatus>(
    enabled ? "loading_cache" : "idle",
  );
  const [snapshot, setSnapshot] = useState<OwnedItemsSnapshot | null>(null);
  const [ownedItems, setOwnedItems] = useState(
    () => new Map<number, OwnedItemSource[]>(),
  );
  const [itemInfo, setItemInfo] = useState(
    () => new Map<number, ItemSheetInfo>(),
  );
  const [metadataReady, setMetadataReady] = useState(false);
  const [metadataFailed, setMetadataFailed] = useState(false);
  const [armoireMappingFailed, setArmoireMappingFailed] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const hydrate = useCallback(async (nextSnapshot: OwnedItemsSnapshot) => {
    const version = ++requestVersion.current;
    setSnapshot(nextSnapshot);
    setMetadataReady(false);
    setMetadataFailed(false);
    setArmoireMappingFailed(false);
    setItemInfo(new Map());
    let cabinetItems = new Map<number, number>();
    try {
      if (
        nextSnapshot.armoire.cached &&
        nextSnapshot.armoire.cabinetItemIds.length
      ) {
        cabinetItems = await fetchCabinetItemIds(
          nextSnapshot.armoire.cabinetItemIds,
        );
      }
    } catch {
      // Other storage locations remain useful when the public Cabinet sheet is unavailable.
      if (requestVersion.current !== version) return;
      setArmoireMappingFailed(true);
    }
    if (requestVersion.current !== version) return;
    const nextOwnedItems = buildOwnedItemIndex(nextSnapshot, cabinetItems);
    setOwnedItems(nextOwnedItems);
    setStatus("ready");
    try {
      const resolved = await fetchItemSheetInfo([...nextOwnedItems.keys()]);
      if (requestVersion.current !== version) return;
      setItemInfo((current) => new Map([...current, ...resolved]));
      setMetadataReady(true);
    } catch {
      if (requestVersion.current !== version) return;
      setMetadataFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestVersion.current += 1;
      return;
    }
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      setStatus("loading_cache");
      void loadOwnedItemsCache()
        .then((cached) => {
          if (disposed) return;
          if (cached) return hydrate(cached);
          setStatus("idle");
        })
        .catch((reason: unknown) => {
          if (disposed) return;
          setError(readOwnedItemsError(reason));
          setStatus("error");
        });
    });
    return () => {
      disposed = true;
    };
  }, [enabled, hydrate]);

  const requestSync = useCallback(() => {
    setError(null);
    setRiskOpen(true);
  }, []);
  const cancelSync = useCallback(() => setRiskOpen(false), []);
  const confirmSync = useCallback(async () => {
    setRiskOpen(false);
    setStatus("syncing");
    setError(null);
    try {
      await hydrate(await syncOwnedItemsFromGame());
    } catch (reason) {
      setError(readOwnedItemsError(reason));
      setStatus(snapshot ? "ready" : "error");
    }
  }, [hydrate, snapshot]);

  const ensureItemMetadata = useCallback(
    async (itemIds: readonly number[]) => {
      if (!snapshot || metadataFailed) return;
      const missing = [
        ...new Set(
          itemIds.filter(
            (itemId) =>
              Number.isSafeInteger(itemId) &&
              itemId > 0 &&
              !itemInfo.has(itemId),
          ),
        ),
      ];
      if (!missing.length) return;
      try {
        const resolved = await fetchItemSheetInfo(missing);
        setItemInfo((current) => new Map([...current, ...resolved]));
      } catch {
        setMetadataFailed(true);
      }
    },
    [itemInfo, metadataFailed, snapshot],
  );

  const ownedModels = useMemo(
    () => buildOwnedModelIndex(ownedItems, itemInfo),
    [itemInfo, ownedItems],
  );
  const matchItem = useCallback(
    (itemId: number): OwnedItemMatch => {
      if (!snapshot) return { kind: "unavailable" };
      if (metadataFailed && !ownedItems.has(itemId)) {
        return { kind: "metadata_unavailable" };
      }
      return matchOwnedItem(
        itemId,
        ownedItems,
        itemInfo,
        ownedModels,
        metadataReady,
      );
    },
    [
      itemInfo,
      metadataFailed,
      metadataReady,
      ownedItems,
      ownedModels,
      snapshot,
    ],
  );

  return {
    status,
    snapshot,
    itemCount: ownedItems.size,
    metadataReady,
    metadataFailed,
    armoireMappingFailed,
    riskOpen,
    error,
    requestSync,
    cancelSync,
    confirmSync,
    dismissError: () => setError(null),
    ensureItemMetadata,
    matchItem,
  };
}

export type OwnedItemsViewModel = ReturnType<typeof useOwnedItemsViewModel>;

function readOwnedItemsError(reason: unknown) {
  const bridgeError = normalizeGameBridgeError(reason);
  if (
    bridgeError.message === "AUTHENTICATION_REQUIRED" ||
    bridgeError.message === "GAME_AUTHENTICATION_REQUIRED"
  ) {
    return "当前登录信息无法解锁物品缓存，请重新登录后重试。";
  }
  const labels: Record<string, string> = {
    unsupported_platform: "物品同步仅支持 Windows 桌面端。",
    process_not_found: "未找到正在运行的 FF14 游戏客户端。",
    multiple_processes: "检测到多个游戏客户端，请只保留需要读取的一个。",
    not_in_world: "请先登录角色并等待当前区域加载完成。",
    territory_not_ready: "游戏区域仍在加载，请稍后重试。",
    login_character_mismatch:
      "当前游戏角色与石之家登录角色不一致，未保存本次读取结果。",
    cache_login_unavailable: "当前登录信息无法生成缓存密钥，请重新登录后重试。",
    bridge_asset_missing: "物品读取组件不完整，请重新安装桌面端。",
    bridge_manifest_missing: "当前版本缺少经过验证的游戏读取配置。",
    protocol_mismatch: "物品读取组件版本不一致，请更新桌面端。",
  };
  return labels[bridgeError.code] ?? bridgeError.message;
}
