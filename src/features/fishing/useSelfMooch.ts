/** Share confirmed self-mooch relationships across visible fish rows. */
import { useEffect, useMemo, useState } from "react";
import { fetchSelfMooch, selfMoochKey, selfMoochRequests } from "./selfMooch";
import type { Fish } from "./types";

const cache = new Map<string, boolean>();

export function useSelfMooch(
  fish: Fish[],
  fishById: Map<number, Fish>,
  spotId?: number,
  primaryOnly = false,
) {
  const fishIds = fish.map((item) => item.id).join(",");
  const requests = useMemo(
    () =>
      selfMoochRequests(
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
  const requestKey = requests.map(selfMoochKey).join("|");
  const [snapshot, setSnapshot] = useState(() => new Map(cache));
  const [retryCount, setRetryCount] = useState(0);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    const missing = requests.filter(
      (request) => !cache.has(selfMoochKey(request)),
    );
    let disposed = false;
    if (!missing.length) {
      queueMicrotask(() => {
        if (!disposed) setSnapshot(new Map(cache));
      });
      return () => {
        disposed = true;
      };
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetchSelfMooch(missing, controller.signal)
      .then((matches) => {
        if (disposed) return;
        for (const [key, found] of matches) cache.set(key, found);
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

  const confirmed = useMemo(
    () =>
      new Set(
        requests.map(selfMoochKey).filter((key) => snapshot.get(key) === true),
      ),
    [requests, snapshot],
  );
  const status = requests.every((request) =>
    snapshot.has(selfMoochKey(request)),
  )
    ? "ready"
    : failedKey === requestKey
      ? "error"
      : "loading";
  return {
    confirmed,
    status,
    retry: () => {
      setFailedKey(null);
      setRetryCount((value) => value + 1);
    },
  } as const;
}
