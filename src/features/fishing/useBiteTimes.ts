/** Share public bite-time observations across visible rows and fish details. */
import { useEffect, useMemo, useState } from "react";
import {
  biteTimeKey,
  biteTimeRequests,
  fetchBiteTimes,
  type BiteTimeRange,
} from "./biteTimes";
import type { Fish } from "./types";

const cache = new Map<string, BiteTimeRange | null>();

export function useBiteTimes(
  fish: Fish[],
  fishById: Map<number, Fish>,
  spotId?: number,
  primaryOnly = false,
) {
  // The ID signature stays steady while the page clock updates every second.
  const fishIds = fish.map((item) => item.id).join(",");
  const requests = useMemo(
    () =>
      biteTimeRequests(
        fishIds
          .split(",")
          .filter(Boolean)
          .map((id) => fishById.get(Number(id)))
          .filter((item): item is Fish => Boolean(item)),
        fishById,
        spotId,
        primaryOnly,
      ),
    [fishIds, fishById, spotId, primaryOnly],
  );
  const requestKey = requests.map(biteTimeKey).join("|");
  const [snapshot, setSnapshot] = useState(() => new Map(cache));
  const [retryCount, setRetryCount] = useState(0);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    const missing = requests.filter(
      (request) => !cache.has(biteTimeKey(request)),
    );
    const controller = new AbortController();
    let disposed = false;
    if (!missing.length) {
      queueMicrotask(() => {
        if (!disposed) setSnapshot(new Map(cache));
      });
      return () => {
        disposed = true;
      };
    }
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetchBiteTimes(missing, controller.signal)
      .then((ranges) => {
        if (disposed) return;
        for (const [key, range] of ranges) cache.set(key, range);
        setFailedKey(null);
        setSnapshot(new Map(cache));
      })
      .catch(() => {
        if (!disposed) setFailedKey(requestKey);
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [requests, requestKey, retryCount]);

  const ranges = useMemo(() => {
    const result = new Map<string, BiteTimeRange | null>();
    for (const request of requests) {
      const key = biteTimeKey(request);
      if (snapshot.has(key)) result.set(key, snapshot.get(key) ?? null);
    }
    return result;
  }, [requests, snapshot]);
  const status =
    ranges.size === requests.length
      ? "ready"
      : failedKey === requestKey
        ? "error"
        : "loading";
  return {
    ranges,
    status,
    retry: () => {
      setFailedKey(null);
      setRetryCount((value) => value + 1);
    },
  } as const;
}
