/** Owns gallery loading, filtering, pagination, and local save feedback. */
import { useEffect, useMemo, useState } from "react";
import { PREVIEW_GLAMOURS } from "../data/previewGlamours";
import {
  fetchGlamours,
  isTauriRuntime,
  type Glamour,
  type GlamourOrder,
} from "../services/glamourApi";

const PAGE_SIZE = 12;

export function useGlamourDiscovery() {
  const preview = !isTauriRuntime();
  const [glamours, setGlamours] = useState<Glamour[]>(
    preview ? PREVIEW_GLAMOURS : [],
  );
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<GlamourOrder>("latest");
  const [raceId, setRaceId] = useState(1);
  const [genderId, setGenderId] = useState(1);
  const [saved, setSaved] = useState<number[]>([2, 6]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(preview ? PREVIEW_GLAMOURS.length : 0);
  const [loading, setLoading] = useState(!preview);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (preview) return;
    let active = true;
    fetchGlamours({ page: 1, limit: PAGE_SIZE, order, raceId, genderId })
      .then((result) => {
        if (!active) return;
        setGlamours(result.items);
        setTotal(result.total);
        setPage(1);
      })
      .catch((reason: unknown) => {
        if (active) setError(readError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [genderId, order, preview, raceId, retryKey]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matched = glamours.filter((item) =>
      [item.title, item.author, item.race, item.job, item.palette]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
    if (!preview) return matched;
    return [...matched].sort((a, b) =>
      order === "hot" ? b.likes - a.likes : b.id - a.id,
    );
  }, [glamours, order, preview, query]);

  const updateFilter = (update: () => void) => {
    if (!preview) {
      setLoading(true);
      setError(null);
    }
    update();
  };

  const loadMore = async () => {
    if (preview || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const result = await fetchGlamours({
        page: nextPage,
        limit: PAGE_SIZE,
        order,
        raceId,
        genderId,
      });
      setGlamours((current) => [...current, ...result.items]);
      setTotal(result.total);
      setPage(nextPage);
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setLoadingMore(false);
    }
  };

  const retry = () => updateFilter(() => setRetryKey((key) => key + 1));
  const toggleSave = (id: number) => {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return {
    preview,
    query,
    setQuery,
    order,
    setOrder: (next: GlamourOrder) => updateFilter(() => setOrder(next)),
    raceId,
    setRaceId: (next: number) => updateFilter(() => setRaceId(next)),
    genderId,
    setGenderId: (next: number) => updateFilter(() => setGenderId(next)),
    saved,
    results,
    featured: glamours[0] ?? PREVIEW_GLAMOURS[0],
    total,
    loading,
    loadingMore,
    error,
    canLoadMore: !preview && glamours.length < total,
    retry,
    toggleSave,
    loadMore,
  };
}

function readError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "无法读取石之家投稿，请稍后重试";
}
