/** Coordinates bridge lifecycle, batch reads, filtering, and retry state. */
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveCharacterSnapshot,
  GameBridgeApiError,
  GameBridgeStatus,
  GameReadFailure,
  PlayerInventorySnapshot,
} from "../models/gameBridge";
import type { ItemSheetInfo } from "../models/item";
import {
  disconnectGameBridge,
  normalizeGameBridgeError,
  observeGameBridgeStatus,
  prepareGameBridge,
  readGameBridge,
} from "../services/gameBridge";
import { fetchItemSheetInfo } from "../services/itemSheetApi";
import { collectInventoryItemIds } from "../utils/itemSheet";

export function useTeleportWorkspaceViewModel() {
  const [status, setStatus] = useState<GameBridgeStatus | null>(null);
  const [character, setCharacter] = useState<ActiveCharacterSnapshot | null>(
    null,
  );
  const [inventory, setInventory] = useState<PlayerInventorySnapshot | null>(
    null,
  );
  const [failures, setFailures] = useState<GameReadFailure[]>([]);
  const [error, setError] = useState<GameBridgeApiError | null>(null);
  const [itemDetails, setItemDetails] = useState<
    ReadonlyMap<number, ItemSheetInfo>
  >(() => new Map());
  const [itemMetadataError, setItemMetadataError] = useState<string | null>(
    null,
  );
  const [itemMetadataLoading, setItemMetadataLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("all");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const initialLoadStarted = useRef(false);
  const loadInFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(() => {
    if (loadInFlight.current) return loadInFlight.current;
    const task = (async () => {
      setLoading(true);
      setError(null);
      setFailures([]);
      setItemMetadataError(null);
      try {
        const ready = await prepareGameBridge();
        setStatus(ready);
        const response = await readGameBridge([
          "active_character",
          "inventory",
        ]);
        setCharacter(response.activeCharacter);
        setInventory(response.inventory);
        setFailures(response.failures);
        setLastUpdatedAt(new Date());
        if (response.inventory) {
          setItemMetadataLoading(true);
          try {
            setItemDetails(
              await fetchItemSheetInfo(
                collectInventoryItemIds(response.inventory),
              ),
            );
          } catch {
            setItemMetadataError(
              "无法读取物品名称和资料，当前仍显示原始物品 ID。",
            );
          } finally {
            setItemMetadataLoading(false);
          }
        } else {
          setItemDetails(new Map());
        }
      } catch (reason) {
        setError(normalizeGameBridgeError(reason));
      } finally {
        setLoading(false);
      }
    })();
    loadInFlight.current = task.finally(() => {
      loadInFlight.current = null;
    });
    return loadInFlight.current;
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    observeGameBridgeStatus((nextStatus) => {
      if (!disposed) setStatus(nextStatus);
    })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(() => {
        // The initial request reports desktop/runtime errors in the page state.
      });
    if (!initialLoadStarted.current) {
      initialLoadStarted.current = true;
      void refresh();
    }
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [refresh]);

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const nextStatus = await disconnectGameBridge();
      setStatus(nextStatus);
      setCharacter(null);
      setInventory(null);
      setFailures([]);
      setItemDetails(new Map());
      setItemMetadataError(null);
      setItemMetadataLoading(false);
      setLastUpdatedAt(null);
    } catch (reason) {
      setError(normalizeGameBridgeError(reason));
    } finally {
      setDisconnecting(false);
    }
  }, []);

  return {
    status,
    character,
    inventory,
    failures,
    error,
    itemDetails,
    itemMetadataError,
    itemMetadataLoading,
    loading,
    disconnecting,
    query,
    selectedContainer,
    lastUpdatedAt,
    refresh,
    disconnect,
    setQuery,
    setSelectedContainer,
  };
}

export type TeleportWorkspaceViewModel = ReturnType<
  typeof useTeleportWorkspaceViewModel
>;
