/** Owns offline catalog loading, list context, and device-local catch progress. */
import { useEffect, useMemo, useState } from "react";
import { filterFish, parseProgress, PROGRESS_KEY, sortFish } from "./model";
import { useFishingClock } from "./clock";
import type { FishCatalog, FishFilters, FishProgress } from "./types";

export const initialFilters: FishFilters = {
  query: "",
  kind: "all",
  zone: "",
  progress: "all",
  available: false,
  patches: Array.from({ length: 6 }, (_, i) =>
    Array.from({ length: 6 }, (_, j) => `${i + 2}.${j}`),
  )
    .flat()
    .concat("unknown"),
  kinds: [
    "normal",
    "big",
    "legendary",
    "ocean-rare",
    "ocean-legendary",
    "unknown",
  ],
  waters: ["world", "ocean"],
  methods: ["rod", "spear"],
  restrictions: ["limited", "always"],
  completion: ["caught", "uncaught"],
  fishEyes: false,
  sort: "window",
};
export function useFishing() {
  const [catalog, setCatalog] = useState<FishCatalog | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const now = useFishingClock();
  const [storageError, setStorageError] = useState(false);
  const [progress, setProgress] = useState<FishProgress>(() => {
    try {
      return parseProgress(localStorage.getItem(PROGRESS_KEY));
    } catch {
      return { saved: [], caught: [] };
    }
  });
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
        setProgress(parseProgress(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const results = useMemo(
    () =>
      catalog
        ? sortFish(
            filterFish(catalog, filters, progress, now),
            catalog,
            filters.sort,
            now,
            filters.fishEyes,
          )
        : [],
    [catalog, filters, progress, now],
  );
  const selected = catalog?.fish.find((fish) => fish.id === selectedId) ?? null;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(results.length / 40) - 1),
  );
  function changeFilters(change: Partial<FishFilters>) {
    setFilters((current) => ({ ...current, ...change }));
    setPage(0);
  }
  function toggleProgress(id: number, key: keyof FishProgress) {
    const next = {
      ...progress,
      [key]: progress[key].includes(id)
        ? progress[key].filter((value) => value !== id)
        : [...progress[key], id],
    };
    setProgress(next);
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
    filters,
    changeFilters,
    page: currentPage,
    setPage,
    results,
    selected,
    setSelectedId,
    now,
    progress,
    toggleProgress,
    storageError,
  };
}
