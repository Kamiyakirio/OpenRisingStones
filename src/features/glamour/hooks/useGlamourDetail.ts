/** Loads a selected glamour detail and exposes bindable UI state. */
import { useEffect, useState } from "react";
import type { Glamour, GlamourDetail } from "../types";
import { fetchGlamourDetail } from "../api/glamourApi";

export function useGlamourDetailViewModel(glamour: Glamour) {
  const [detail, setDetail] = useState<GlamourDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchGlamourDetail(glamour.id)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(readDetailError(reason));
        setDetail(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [glamour, retryKey]);

  return {
    detail,
    loading,
    error,
    retry: () => {
      setLoading(true);
      setError(null);
      setRetryKey((key) => key + 1);
    },
  };
}

function readDetailError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "无法读取幻化详情，请稍后重试";
}
