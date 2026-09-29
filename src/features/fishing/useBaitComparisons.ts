/** Load every observed bait for one fish and spot when its detail is open. */
import { useEffect, useState } from "react";
import { fetchBaitComparisons, type BaitComparison } from "./biteTimes";

const cache = new Map<string, BaitComparison[]>();

export function useBaitComparisons(fishId: number, spotId?: number) {
  const key = spotId ? `${fishId}:${spotId}` : "";
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data: BaitComparison[];
  } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!key || !spotId) return;
    let disposed = false;
    const cached = cache.get(key);
    if (cached) {
      queueMicrotask(() => {
        if (!disposed) setSnapshot({ key, data: cached });
      });
      return () => {
        disposed = true;
      };
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetchBaitComparisons(fishId, spotId, controller.signal)
      .then((data) => {
        if (disposed) return;
        cache.set(key, data);
        setFailedKey(null);
        setSnapshot({ key, data });
      })
      .catch(() => {
        if (!disposed) setFailedKey(key);
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [fishId, spotId, key, retryCount]);

  const status = !key
    ? "unavailable"
    : snapshot?.key === key
      ? "ready"
      : failedKey === key
        ? "error"
        : "loading";
  return {
    status,
    data: snapshot?.key === key ? snapshot.data : [],
    retry: () => {
      setFailedKey(null);
      setRetryCount((value) => value + 1);
    },
  } as const;
}
