/** Coordinates consent, bridge preparation, polling, and debounced lighting updates. */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  normalizeGameBridgeError,
  prepareGameBridge,
} from "../../shared/game-bridge/api";
import type { GameBridgeApiError } from "../../shared/game-bridge/types";
import { capturePortraitLighting, updatePortraitLighting } from "./api";
import {
  grantPortraitRiskConsent,
  hasPortraitRiskConsent,
} from "./riskConsent";
import type {
  PortraitConnectionPhase,
  PortraitLighting,
  PortraitLightingUpdate,
} from "./types";

const UPDATE_DELAY_MS = 80;
const REFRESH_INTERVAL_MS = 1_000;

export function usePortraitLighting() {
  const [phase, setPhase] = useState<PortraitConnectionPhase>("idle");
  const [lighting, setLighting] = useState<PortraitLighting | null>(null);
  const [initialLighting, setInitialLighting] =
    useState<PortraitLighting | null>(null);
  const [error, setError] = useState<GameBridgeApiError | null>(null);
  const [riskOpen, setRiskOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);
  const latest = useRef<PortraitLighting | null>(null);
  const pendingFields = useRef(0);
  const updateTimer = useRef<number | null>(null);
  const writing = useRef(false);

  useEffect(() => {
    latest.current = lighting;
  }, [lighting]);

  const refresh = useCallback(async () => {
    if (writing.current || pendingFields.current !== 0) return false;
    try {
      const next = await capturePortraitLighting();
      setLighting(next);
      setInitialLighting((current) => {
        if (!next.editorOpen || !next.characterReady) return null;
        return current?.sessionId === next.sessionId ? current : next;
      });
      setError(null);
      return true;
    } catch (reason) {
      const nextError = normalizeGameBridgeError(reason);
      if (nextError.code === "portrait_lighting_unsupported") {
        setPhase("unsupported");
      }
      setError(nextError);
      return false;
    }
  }, []);

  const connect = useCallback(async () => {
    setPhase("connecting");
    setError(null);
    try {
      const status = await prepareGameBridge();
      if (!status.capabilities.includes("portrait_lighting_read")) {
        setPhase("unsupported");
        setError({
          code: "portrait_lighting_unsupported",
          message:
            "The active game manifest does not support portrait lighting.",
        });
        return;
      }
      if (!status.capabilities.includes("portrait_lighting_write")) {
        setPhase("unsupported");
        setError({
          code: "portrait_lighting_read_only",
          message: "The active game manifest cannot update portrait lighting.",
        });
        return;
      }
      setUpdateFailed(false);
      setPhase("ready");
      await refresh();
    } catch (reason) {
      setPhase("idle");
      setError(normalizeGameBridgeError(reason));
    }
  }, [refresh]);

  const requestConnect = useCallback(() => {
    if (hasPortraitRiskConsent()) void connect();
    else setRiskOpen(true);
  }, [connect]);

  const confirmRisk = useCallback(() => {
    setStorageError(!grantPortraitRiskConsent());
    setRiskOpen(false);
    void connect();
  }, [connect]);

  const flushUpdate = useCallback(async () => {
    if (writing.current || pendingFields.current === 0) return;
    writing.current = true;
    setUpdating(true);
    try {
      while (pendingFields.current !== 0) {
        const current = latest.current;
        if (!current) break;
        const fields = pendingFields.current;
        pendingFields.current = 0;
        const update: PortraitLightingUpdate = {
          fields,
          ambientColor: current.ambientColor,
          ambientBrightness: current.ambientBrightness,
          directionalColor: current.directionalColor,
          directionalBrightness: current.directionalBrightness,
          directionalVerticalAngle: current.directionalVerticalAngle,
          directionalHorizontalAngle: current.directionalHorizontalAngle,
        };
        const next = await updatePortraitLighting(update);
        setLighting(next);
      }
      setUpdateFailed(false);
      setError(null);
    } catch (reason) {
      setError(normalizeGameBridgeError(reason));
      setUpdateFailed(true);
      pendingFields.current = 0;
      if (updateTimer.current !== null) {
        window.clearTimeout(updateTimer.current);
        updateTimer.current = null;
      }
      try {
        const authoritative = await capturePortraitLighting();
        latest.current = authoritative;
        setLighting(authoritative);
        setInitialLighting((current) => {
          if (!authoritative.editorOpen || !authoritative.characterReady)
            return null;
          return current?.sessionId === authoritative.sessionId
            ? current
            : authoritative;
        });
      } catch {
        // Preserve the failed state until the user explicitly retries.
      }
    } finally {
      writing.current = false;
      setUpdating(false);
    }
  }, []);

  const changeLighting = useCallback(
    (
      fields: number,
      change: (current: PortraitLighting) => PortraitLighting,
    ) => {
      setLighting((current) => {
        if (!current) return current;
        const next = change(current);
        latest.current = next;
        return next;
      });
      pendingFields.current |= fields;
      if (updateTimer.current !== null) {
        window.clearTimeout(updateTimer.current);
      }
      updateTimer.current = window.setTimeout(() => {
        updateTimer.current = null;
        void flushUpdate();
      }, UPDATE_DELAY_MS);
    },
    [flushUpdate],
  );

  useEffect(() => {
    if (phase !== "ready") return;
    const interval = window.setInterval(
      () => void refresh(),
      REFRESH_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [phase, refresh]);

  const recover = useCallback(async () => {
    if (await refresh()) setUpdateFailed(false);
  }, [refresh]);

  useEffect(
    () => () => {
      if (updateTimer.current !== null)
        window.clearTimeout(updateTimer.current);
    },
    [],
  );

  return {
    phase,
    lighting,
    initialLighting,
    error,
    riskOpen,
    storageError,
    updating,
    updateFailed,
    requestConnect,
    confirmRisk,
    cancelRisk: () => setRiskOpen(false),
    refresh: recover,
    changeLighting,
  };
}
