/** Coordinates bridge lifecycle, batch reads, filtering, and retry state. */
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveCharacterSnapshot,
  GameBridgeApiError,
  GameBridgeStatus,
  GameReadFailure,
  PlayerInventorySnapshot,
} from "../models/gameBridge";
import {
  disconnectGameBridge,
  normalizeGameBridgeError,
  observeGameBridgeStatus,
  prepareGameBridge,
  readGameBridge,
} from "../services/gameBridge";

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
