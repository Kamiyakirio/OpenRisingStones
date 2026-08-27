/** Owns public recruitment configuration, continuous feed, filters, and detail state. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createEmptyRecruitFilters,
  type RecruitConfig,
  type RecruitDetail,
  type RecruitFilters,
  type RecruitSummary,
} from "../models/recruit";
import {
  fetchRecruitConfig,
  fetchRecruitDetail,
  fetchRecruitPage,
} from "../services/recruitApi";
import {
  canLoadMoreRecruitItems,
  mergeRecruitFeed,
} from "../utils/recruitFeed";
import { expandRecruitDutyChoice } from "../utils/recruitDutyGroups";

const PAGE_SIZE = 9;

export function useRecruitViewModel() {
  const [config, setConfig] = useState<RecruitConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configRetryKey, setConfigRetryKey] = useState(0);
  const [draftFilters, setDraftFilters] = useState<RecruitFilters>(
    createEmptyRecruitFilters,
  );
  const [activeFilters, setActiveFilters] = useState<RecruitFilters>(
    createEmptyRecruitFilters,
  );
  const [activeDutyNames, setActiveDutyNames] = useState<string[]>([]);
  const [items, setItems] = useState<RecruitSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedRecruit, setSelectedRecruit] = useState<RecruitSummary | null>(
    null,
  );
  const [detail, setDetail] = useState<RecruitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRetryKey, setDetailRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecruitConfig(controller.signal)
      .then(setConfig)
      .catch((reason) => {
        if (!isAbortError(reason)) setConfigError(readError(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setConfigLoading(false);
      });
    return () => controller.abort();
  }, [configRetryKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecruitPage({
      page,
      limit: PAGE_SIZE,
      filters: activeFilters,
      dutyNames: activeDutyNames,
      signal: controller.signal,
    })
      .then((result) => {
        setItems((current) =>
          page === 1 ? result.items : mergeRecruitFeed(current, result.items),
        );
        setTotal(result.total);
        setHasMore(result.hasMore);
      })
      .catch((reason) => {
        if (isAbortError(reason)) return;
        if (page === 1) setError(readError(reason));
        else setLoadMoreError(readError(reason));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        if (page === 1) setLoading(false);
        else {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      });
    return () => controller.abort();
  }, [activeDutyNames, activeFilters, page, retryKey]);

  useEffect(() => {
    if (!selectedRecruit) return;
    const controller = new AbortController();
    fetchRecruitDetail(selectedRecruit.id, controller.signal)
      .then(setDetail)
      .catch((reason) => {
        if (!isAbortError(reason)) setDetailError(readError(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedRecruit, detailRetryKey]);

  const canLoadMore = hasMore && canLoadMoreRecruitItems(items.length, total);
  const activeFilterCount = useMemo(
    () => Object.values(activeFilters).filter(Boolean).length,
    [activeFilters],
  );

  const setFilter = useCallback((key: keyof RecruitFilters, value: string) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }, []);
  const applyFilters = useCallback(() => {
    setItems([]);
    setLoading(true);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setError(null);
    setLoadMoreError(null);
    setHasMore(true);
    setPage(1);
    setActiveDutyNames(
      expandRecruitDutyChoice(draftFilters.dutyName, config?.duties ?? []),
    );
    setActiveFilters({ ...draftFilters });
  }, [config, draftFilters]);
  const clearFilters = useCallback(() => {
    const empty = createEmptyRecruitFilters();
    setDraftFilters(empty);
    setActiveFilters(empty);
    setActiveDutyNames([]);
    setItems([]);
    setLoading(true);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setError(null);
    setLoadMoreError(null);
    setHasMore(true);
    setPage(1);
  }, []);
  const loadMore = useCallback(() => {
    if (loading || loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    setPage((current) => current + 1);
  }, [hasMore, loading]);
  const retry = useCallback(() => {
    if (page === 1) {
      setLoading(true);
      setError(null);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setLoadMoreError(null);
    }
    setRetryKey((current) => current + 1);
  }, [page]);
  const retryConfig = useCallback(() => {
    setConfigLoading(true);
    setConfigError(null);
    setConfigRetryKey((current) => current + 1);
  }, []);
  const openDetail = useCallback((item: RecruitSummary) => {
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setSelectedRecruit(item);
  }, []);
  const retryDetail = useCallback(() => {
    setDetailLoading(true);
    setDetailError(null);
    setDetailRetryKey((current) => current + 1);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedRecruit(null);
    setDetail(null);
    setDetailError(null);
  }, []);

  return {
    config,
    configLoading,
    configError,
    draftFilters,
    activeFilterCount,
    items,
    total,
    loading,
    loadingMore,
    error,
    loadMoreError,
    canLoadMore,
    selectedRecruit,
    detail,
    detailLoading,
    detailError,
    setFilter,
    applyFilters,
    clearFilters,
    loadMore,
    retry,
    retryConfig,
    retryDetail,
    openDetail,
    closeDetail,
  };
}

export type RecruitViewModel = ReturnType<typeof useRecruitViewModel>;

function readError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "无法读取招募信息，请重试";
}

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError";
}
