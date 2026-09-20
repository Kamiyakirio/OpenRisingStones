/** Coordinates consent, game-bridge preparation, and local server lifecycle. */
import { useCallback, useEffect, useState } from "react";
import { prepareGameBridge } from "../../shared/game-bridge/api";
import {
  getChatBridgeStatus,
  normalizeChatBridgeError,
  startChatBridge,
  stopChatBridge,
} from "./api";
import { grantChatRiskConsent, hasChatRiskConsent } from "./chatRiskConsent";
import type { ChatBridgeError, ChatBridgeStatus } from "./types";

export function useChatBridge() {
  const [status, setStatus] = useState<ChatBridgeStatus | null>(null);
  const [error, setError] = useState<ChatBridgeError | null>(null);
  const [busy, setBusy] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getChatBridgeStatus());
    } catch (reason) {
      setError(normalizeChatBridgeError(reason));
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await prepareGameBridge();
      setStatus(await startChatBridge());
    } catch (reason) {
      setError(normalizeChatBridgeError(reason));
    } finally {
      setBusy(false);
    }
  }, []);

  const requestStart = useCallback(() => {
    setError(null);
    if (hasChatRiskConsent()) {
      void start();
    } else {
      setRiskOpen(true);
    }
  }, [start]);

  const confirmRisk = useCallback(() => {
    setStorageError(!grantChatRiskConsent());
    setRiskOpen(false);
    void start();
  }, [start]);

  const stop = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await stopChatBridge());
    } catch (reason) {
      setError(normalizeChatBridgeError(reason));
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    status,
    error,
    busy,
    riskOpen,
    storageError,
    requestStart,
    confirmRisk,
    cancelRisk: () => setRiskOpen(false),
    stop,
  };
}
