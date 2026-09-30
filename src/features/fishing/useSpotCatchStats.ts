/** Load the selected spot's community catch distribution once per spot visit. */
import { useEffect, useState } from "react";
import { fetchSpotCatchStats, type SpotBaitStats } from "./spotCatchData";

type StatsState = {
  spotId: number;
  status: "loading" | "ready" | "error";
  data: SpotBaitStats[];
};

const spotStatsCache = new Map<number, SpotBaitStats[]>();

export function useSpotCatchStats(spotId: number) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<StatsState>(() => ({
    spotId,
    status: spotStatsCache.has(spotId) ? "ready" : "loading",
    data: spotStatsCache.get(spotId) ?? [],
  }));
  useEffect(() => {
    if (attempt === 0 && spotStatsCache.has(spotId)) return;
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    fetchSpotCatchStats(spotId, controller.signal)
      .then(
        (data) => {
          if (disposed) return;
          spotStatsCache.set(spotId, data);
          setState({ spotId, status: "ready", data });
        },
        () => {
          if (disposed) return;
          setState({ spotId, status: "error", data: [] });
        },
      )
      .finally(() => window.clearTimeout(timeout));
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [spotId, attempt]);
  const cached = spotStatsCache.get(spotId);
  return {
    status:
      state.spotId === spotId ? state.status : cached ? "ready" : "loading",
    data: state.spotId === spotId ? state.data : (cached ?? []),
    retry: () => {
      spotStatsCache.delete(spotId);
      setState({ spotId, status: "loading", data: [] });
      setAttempt((count) => count + 1);
    },
  };
}
