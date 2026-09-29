/** Owns the offline catalog, manual marks, and live character catch status. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseProgress, PROGRESS_KEY } from "./model";
import { useFishingClock } from "./clock";
import { applyGameFishingLog, type GameFishingLog } from "./gameLog";
import { captureFishingLog } from "./api";
import { normalizeGameBridgeError } from "../../shared/game-bridge/api";
import { isTauriRuntime } from "../../shared/utils/runtime";
import type { FishCatalog, FishProgress } from "./types";
export function useFishing() {
  const [catalog, setCatalog] = useState<FishCatalog | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const now = useFishingClock();
  const [storageError, setStorageError] = useState(false);
  const [manualProgress, setManualProgress] = useState<FishProgress>(() => {
    try {
      return parseProgress(localStorage.getItem(PROGRESS_KEY));
    } catch {
      return { saved: [], caught: [] };
    }
  });
  const desktop = isTauriRuntime();
  const [gameLog, setGameLog] = useState<GameFishingLog | null>(null);
  const [gameLogStatus, setGameLogStatus] = useState<
    | "syncing"
    | "ready"
    | "waiting"
    | "error"
    | "unsupported"
    | "unsupported-version"
    | "access-denied"
    | "multiple-processes"
  >("waiting");
  const requestVersion = useRef(0);
  const unsupportedPlatform = useRef(false);
  const refreshGameLog = useCallback(async () => {
    if (!desktop || unsupportedPlatform.current) return;
    const version = ++requestVersion.current;
    setGameLogStatus("syncing");
    try {
      const snapshot = await captureFishingLog();
      if (version !== requestVersion.current) return;
      if (
        !snapshot.contentId ||
        !Array.isArray(snapshot.caughtFishParameterIds) ||
        !Array.isArray(snapshot.caughtSpearfishingItemIds)
      ) {
        throw new Error("Invalid fishing log snapshot.");
      }
      setGameLog(snapshot);
      setGameLogStatus("ready");
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setGameLog(null);
      const { code } = normalizeGameBridgeError(reason);
      if (code === "unsupported_platform") unsupportedPlatform.current = true;
      setGameLogStatus(
        unsupportedPlatform.current
          ? "unsupported"
          : code === "access_denied"
            ? "access-denied"
            : code === "unsupported_game_version"
              ? "unsupported-version"
              : code === "multiple_processes"
                ? "multiple-processes"
                : code === "process_not_found" ||
                    code === "character_not_loaded" ||
                    code === "game_closed"
                  ? "waiting"
                  : "error",
      );
    }
  }, [desktop]);
  useEffect(() => {
    if (!desktop) return;
    let disposed = false;
    const versionRef = requestVersion;
    queueMicrotask(() => {
      if (!disposed) void refreshGameLog();
    });
    const interval = window.setInterval(() => void refreshGameLog(), 30_000);
    const onFocus = () => void refreshGameLog();
    window.addEventListener("focus", onFocus);
    return () => {
      disposed = true;
      versionRef.current++;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [desktop, refreshGameLog]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/fishing/catalog.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Fish catalog could not be loaded.");
        return response.json();
      })
      .then((data: FishCatalog) => {
        if (
          !Array.isArray(data.fish) ||
          !data.fish.length ||
          !data.weatherRates ||
          !data.items ||
          !data.itemIcons ||
          !data.weather
        )
          throw new Error("Invalid fish catalog.");
        setCatalog(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === PROGRESS_KEY || event.key === null)
        setManualProgress(parseProgress(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const gameProgress = useMemo(
    () =>
      catalog && gameLog
        ? applyGameFishingLog(catalog, manualProgress, gameLog)
        : null,
    [catalog, gameLog, manualProgress],
  );
  // Count actual caught catalog entries; coveredIds counts every readable log row.
  const gameCaughtCount =
    gameProgress?.progress.caught.filter((id) =>
      gameProgress.coveredIds.has(id),
    ).length ?? 0;
  const progress = gameProgress?.progress ?? manualProgress;
  const selected = catalog?.fish.find((fish) => fish.id === selectedId) ?? null;
  function toggleProgress(id: number, key: keyof FishProgress) {
    if (key === "caught" && gameProgress?.coveredIds.has(id)) return;
    const next = {
      ...manualProgress,
      [key]: manualProgress[key].includes(id)
        ? manualProgress[key].filter((value) => value !== id)
        : [...manualProgress[key], id],
    };
    setManualProgress(next);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return {
    catalog,
    error,
    retry: () => {
      setError(false);
      setAttempt((value) => value + 1);
    },
    selected,
    setSelectedId,
    now,
    progress,
    gameLog,
    gameLogStatus,
    gameCaughtCount,
    gameCoveredIds: gameProgress?.coveredIds ?? new Set<number>(),
    desktop,
    refreshGameLog,
    toggleProgress,
    storageError,
  };
}
