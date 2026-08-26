/** Loads a selected glamour detail and exposes bindable UI state. */
import { useEffect, useMemo, useState } from "react";
import { createPreviewGlamourDetail } from "../data/previewGlamours";
import type { Glamour, GlamourDetail } from "../models/glamour";
import { fetchGlamourDetail } from "../services/glamourApi";
import { isTauriRuntime } from "../services/runtime";

export function useGlamourDetailViewModel(glamour: Glamour) {
  const preview = !isTauriRuntime();
  const previewDetail = useMemo(
    () => (preview ? createPreviewGlamourDetail(glamour) : null),
    [glamour, preview],
  );
  const [detail, setDetail] = useState<GlamourDetail | null>(null);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (preview) return;
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
  }, [glamour, preview, retryKey]);

  return {
    detail: preview ? previewDetail : detail,
    loading: preview ? false : loading,
    error: preview ? null : error,
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
