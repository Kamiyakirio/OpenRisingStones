/** Owns settings confirmation and local-data clearing state. */
import { useCallback, useState } from "react";
import { clearAllLocalData } from "../api/localData";

export function useSettingsDialog(onClose: () => void) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  const startConfirmation = () => {
    setConfirming(true);
    setError(null);
  };

  const cancelConfirmation = () => {
    setConfirming(false);
    setError(null);
  };

  const clearData = async () => {
    setBusy(true);
    setError(null);
    try {
      await clearAllLocalData();
    } catch (reason) {
      setError(readError(reason));
      setBusy(false);
    }
  };

  return {
    confirming,
    busy,
    error,
    close,
    startConfirmation,
    cancelConfirmation,
    clearData,
  };
}

function readError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "无法清除本地数据，请稍后重试";
}
