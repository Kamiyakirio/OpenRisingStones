/** Owns glamour discovery state, commands, filtering, and pagination. */
import { useEffect, useMemo, useRef, useState } from "react";
import { CLASS_JOB_OPTIONS } from "../data/classJobs";
import {
  countEquipmentSearchFilters,
  createEmptyEquipmentSearchFilters,
  type EquipmentClassJob,
  type EquipmentPageSize,
  type EquipmentSearchFilters,
  type EquipmentSearchItem,
  type EquipmentSearchPage,
  validateEquipmentSearchFilters,
} from "../equipment.types";
import type { Glamour, GlamourOrder } from "../types";
import type { WikiModelItem } from "../wiki.types";
import { fetchEquipmentCandidates } from "../api/equipmentApi";
import { fetchGlamours } from "../api/glamourApi";
import {
  filterGlamoursByJobs,
  GLAMOUR_FEED_BATCH_SIZE,
  JOB_FILTER_PREFETCH_COUNT,
  JOB_FILTER_REQUEST_INTERVAL_MS,
  matchesSelectedJobs,
  mergeUniqueGlamours,
  revealNextGlamourBatch,
  visibleGlamourFeed,
} from "../utils/glamourJobFilter";

const DISCOVERY_PAGE_SIZE = GLAMOUR_FEED_BATCH_SIZE;
const SEARCH_PAGE_SIZE = 20;
export const MAX_EQUIVALENT_EQUIPMENT_SELECTION = 10;

type PageInfo = {
  total: number;
  hasMore: boolean;
};

type EquipmentCandidatePage = EquipmentSearchPage & {
  cursor: string | null;
};

export type GlamourSearchMode = "title" | "equipment";

export function useGlamourDiscoveryViewModel(enabled = true) {
  const [glamours, setGlamours] = useState<Glamour[]>([]);
  const [searchMode, setSearchModeState] = useState<GlamourSearchMode>("title");
  const [titleQuery, setTitleQuery] = useState("");
  const [activeTitleQuery, setActiveTitleQuery] = useState("");
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [equipmentPages, setEquipmentPages] = useState<
    EquipmentCandidatePage[]
  >([]);
  const [equipmentPageIndex, setEquipmentPageIndex] = useState(0);
  const [equipmentPageSize, setEquipmentPageSize] =
    useState<EquipmentPageSize>(12);
  const [equipmentFilters, setEquipmentFilters] =
    useState<EquipmentSearchFilters>(createEmptyEquipmentSearchFilters);
  const [activeEquipmentFilters, setActiveEquipmentFilters] =
    useState<EquipmentSearchFilters>(createEmptyEquipmentSearchFilters);
  const [equipmentResultsOpen, setEquipmentResultsOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] =
    useState<EquipmentSearchItem | null>(null);
  const [equipmentModelCandidates, setEquipmentModelCandidates] = useState<
    WikiModelItem[]
  >([]);
  const [selectedEquipmentModelIds, setSelectedEquipmentModelIds] = useState<
    number[]
  >([]);
  const [equipmentRangeUpdating, setEquipmentRangeUpdating] = useState(false);
  const [equipmentSearchLoading, setEquipmentSearchLoading] = useState(false);
  const [equipmentSearchError, setEquipmentSearchError] = useState<
    string | null
  >(null);
  const equipmentRequest = useRef(0);
  const selectedEquipmentId = useRef<number | null>(null);
  const [order, setOrder] = useState<GlamourOrder>("latest");
  const [raceId, setRaceId] = useState<number | null>(null);
  const [genderId, setGenderId] = useState<number | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<EquipmentClassJob[]>([]);
  const [saved, setSaved] = useState<number[]>([2, 6]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState<PageInfo | number>(0);
  const [loading, setLoading] = useState(enabled);
  const [initialized, setInitialized] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const feedRequestVersion = useRef(0);
  const feedAbortController = useRef<AbortController | null>(null);
  const jobBufferRef = useRef<Glamour[]>([]);
  const jobVisibleCountRef = useRef(GLAMOUR_FEED_BATCH_SIZE);
  const jobScanHasMoreRef = useRef(false);
  const resumeJobScanRef = useRef<() => void>(() => undefined);
  const [jobVisibleCount, setJobVisibleCount] = useState(
    GLAMOUR_FEED_BATCH_SIZE,
  );
  const [jobScanHasMore, setJobScanHasMore] = useState(false);
  const [jobScanRunning, setJobScanRunning] = useState(false);
  const [jobRevealWaiting, setJobRevealWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // A numeric value can survive Fast Refresh from the earlier total-only state.
  const total = typeof pageInfo === "number" ? pageInfo : pageInfo.total;
  const hasMore = typeof pageInfo === "number" ? false : pageInfo.hasMore;
  const query = searchMode === "title" ? titleQuery : equipmentQuery;
  const activeQuery =
    searchMode === "title" ? activeTitleQuery : (selectedEquipment?.name ?? "");
  const requestKeywords = searchMode === "title" ? activeTitleQuery : "";
  const searchByEquipment = searchMode === "equipment" && !!selectedEquipment;
  const selectedJobIds = useMemo(
    () =>
      CLASS_JOB_OPTIONS.filter((option) =>
        selectedJobs.includes(option.value),
      ).map((option) => option.glamourId),
    [selectedJobs],
  );
  const jobFilterActive = selectedJobIds.length > 0;
  const equipmentSearchIds = useMemo(
    () =>
      selectedEquipment
        ? [selectedEquipment.id, ...selectedEquipmentModelIds]
        : [],
    [selectedEquipment, selectedEquipmentModelIds],
  );
  const pageSize =
    requestKeywords || searchByEquipment
      ? SEARCH_PAGE_SIZE
      : DISCOVERY_PAGE_SIZE;
  const equipmentPage = equipmentPages[equipmentPageIndex] ?? null;
  const canSubmitSearch =
    searchMode === "title"
      ? Boolean(query.trim() || activeQuery)
      : Boolean(
          (equipmentQuery.trim() ||
            countEquipmentSearchFilters(equipmentFilters)) &&
          !validateEquipmentSearchFilters(equipmentFilters),
        );

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    feedAbortController.current?.abort();
    const controller = new AbortController();
    feedAbortController.current = controller;
    const requestVersion = ++feedRequestVersion.current;

    if (jobFilterActive) {
      let nextPage = 1;
      let hasMorePages = true;
      let scanRunning = false;
      let initialSettled = false;
      const seenPageItemIds = new Set<number>();

      loadingMoreRef.current = false;
      jobBufferRef.current = [];
      jobVisibleCountRef.current = GLAMOUR_FEED_BATCH_SIZE;
      jobScanHasMoreRef.current = true;

      const settleInitialLoad = () => {
        if (
          initialSettled ||
          !active ||
          feedRequestVersion.current !== requestVersion
        ) {
          return;
        }
        initialSettled = true;
        setLoading(false);
        setInitialized(true);
        setEquipmentRangeUpdating(false);
      };

      const scan = async () => {
        if (scanRunning || !active || !hasMorePages) return;
        scanRunning = true;
        setJobScanRunning(true);
        try {
          while (
            active &&
            feedRequestVersion.current === requestVersion &&
            hasMorePages &&
            jobBufferRef.current.length <
              jobVisibleCountRef.current + JOB_FILTER_PREFETCH_COUNT
          ) {
            if (nextPage > 1) {
              await waitForJobFilterInterval(controller.signal);
            }
            const requestedPage = nextPage;
            const result = await fetchGlamours({
              page: requestedPage,
              limit: pageSize,
              order,
              raceId,
              genderId,
              keywords: requestKeywords || undefined,
              searchByEquipment,
              equipmentIds: searchByEquipment ? equipmentSearchIds : undefined,
              signal: controller.signal,
            });
            if (!active || feedRequestVersion.current !== requestVersion) {
              return;
            }

            const hasNewPageItems = result.items.some(
              (item) => !seenPageItemIds.has(item.id),
            );
            result.items.forEach((item) => seenPageItemIds.add(item.id));
            const matchingItems = filterGlamoursByJobs(
              result.items,
              selectedJobIds,
            );
            const merged = mergeUniqueGlamours(
              jobBufferRef.current,
              matchingItems,
            );
            jobBufferRef.current = merged;
            setGlamours(merged);

            nextPage = requestedPage + 1;
            hasMorePages = result.hasMore && hasNewPageItems;
            jobScanHasMoreRef.current = hasMorePages;
            setJobScanHasMore(hasMorePages);
            setPage(requestedPage);
            setPageInfo({ total: merged.length, hasMore: hasMorePages });
            setJobRevealWaiting(
              merged.length < jobVisibleCountRef.current && hasMorePages,
            );

            if (merged.length || !hasMorePages) settleInitialLoad();
          }
        } catch (reason) {
          if (isAbortError(reason)) return;
          if (active && feedRequestVersion.current === requestVersion) {
            hasMorePages = false;
            jobScanHasMoreRef.current = false;
            setJobScanHasMore(false);
            setJobRevealWaiting(false);
            setError(readError(reason));
            settleInitialLoad();
          }
        } finally {
          if (active && feedRequestVersion.current === requestVersion) {
            scanRunning = false;
            setJobScanRunning(false);
            if (!hasMorePages) setJobRevealWaiting(false);
            if (!initialSettled) settleInitialLoad();
          }
        }
      };

      resumeJobScanRef.current = () => void scan();
      void Promise.resolve().then(() => {
        if (!active || feedRequestVersion.current !== requestVersion) return;
        setGlamours([]);
        setPage(0);
        setPageInfo({ total: 0, hasMore: true });
        setLoading(true);
        setLoadingMore(false);
        setJobVisibleCount(GLAMOUR_FEED_BATCH_SIZE);
        setJobScanHasMore(true);
        setJobScanRunning(false);
        setJobRevealWaiting(true);
        setError(null);
        void scan();
      });

      return () => {
        active = false;
        resumeJobScanRef.current = () => undefined;
        controller.abort();
        if (feedAbortController.current === controller) {
          feedAbortController.current = null;
        }
      };
    }

    jobBufferRef.current = [];
    jobScanHasMoreRef.current = false;
    resumeJobScanRef.current = () => undefined;
    void Promise.resolve().then(() => {
      if (!active || feedRequestVersion.current !== requestVersion) return;
      setJobScanHasMore(false);
      setJobScanRunning(false);
      setJobRevealWaiting(false);
    });
    fetchGlamours({
      page: 1,
      limit: pageSize,
      order,
      raceId,
      genderId,
      keywords: requestKeywords || undefined,
      searchByEquipment,
      equipmentIds: searchByEquipment ? equipmentSearchIds : undefined,
      signal: controller.signal,
    })
      .then((result) => {
        if (!active || feedRequestVersion.current !== requestVersion) return;
        setGlamours(result.items);
        setPageInfo({ total: result.total, hasMore: result.hasMore });
        setPage(1);
      })
      .catch((reason: unknown) => {
        if (isAbortError(reason)) return;
        if (active && feedRequestVersion.current === requestVersion) {
          setError(readError(reason));
        }
      })
      .finally(() => {
        if (active && feedRequestVersion.current === requestVersion) {
          setLoading(false);
          setInitialized(true);
          setEquipmentRangeUpdating(false);
        }
      });
    return () => {
      active = false;
      controller.abort();
      if (feedAbortController.current === controller) {
        feedAbortController.current = null;
      }
    };
  }, [
    genderId,
    equipmentSearchIds,
    enabled,
    jobFilterActive,
    order,
    pageSize,
    raceId,
    requestKeywords,
    retryKey,
    searchByEquipment,
    selectedJobIds,
  ]);

  const results = useMemo(() => {
    const normalized =
      searchMode === "title" ? activeTitleQuery.toLocaleLowerCase("zh-CN") : "";
    const matched = glamours.filter(
      (item) =>
        (!normalized ||
          item.title.toLocaleLowerCase("zh-CN").includes(normalized)) &&
        matchesId(item.raceIds, raceId) &&
        matchesId(item.genderIds, genderId) &&
        matchesSelectedJobs(item.jobIds, selectedJobIds),
    );
    return jobFilterActive
      ? visibleGlamourFeed(matched, jobVisibleCount)
      : matched;
  }, [
    activeTitleQuery,
    genderId,
    glamours,
    jobFilterActive,
    jobVisibleCount,
    raceId,
    searchMode,
    selectedJobIds,
  ]);

  const updateFilter = (update: () => void) => {
    setLoading(true);
    setError(null);
    update();
  };

  const loadMore = async () => {
    if (!enabled) return;
    if (jobFilterActive) {
      if (jobRevealWaiting) return;
      const bufferedCount = jobBufferRef.current.length;
      const currentLimit = jobVisibleCountRef.current;
      if (bufferedCount <= currentLimit && !jobScanHasMoreRef.current) return;

      const nextLimit = revealNextGlamourBatch(currentLimit);
      jobVisibleCountRef.current = nextLimit;
      setJobVisibleCount(nextLimit);
      setJobRevealWaiting(
        bufferedCount < nextLimit && jobScanHasMoreRef.current,
      );
      setError(null);
      resumeJobScanRef.current();
      return;
    }
    if (loadingMoreRef.current) return;
    const requestVersion = feedRequestVersion.current;
    const signal = feedAbortController.current?.signal;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const result = await fetchGlamours({
        page: nextPage,
        limit: pageSize,
        order,
        raceId,
        genderId,
        keywords: requestKeywords || undefined,
        searchByEquipment,
        equipmentIds: searchByEquipment ? equipmentSearchIds : undefined,
        signal,
      });
      if (feedRequestVersion.current !== requestVersion) return;
      const currentIds = new Set(glamours.map((item) => item.id));
      const hasNewItems = result.items.some((item) => !currentIds.has(item.id));
      setGlamours((current) => {
        const merged = new Map(current.map((item) => [item.id, item]));
        result.items.forEach((item) => merged.set(item.id, item));
        return [...merged.values()];
      });
      setPageInfo({
        total: result.total,
        hasMore: result.hasMore && hasNewItems,
      });
      setPage(nextPage);
    } catch (reason) {
      if (isAbortError(reason)) return;
      if (feedRequestVersion.current === requestVersion) {
        setError(readError(reason));
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const retry = () => updateFilter(() => setRetryKey((key) => key + 1));
  const requestEquipmentPage = (
    nextQuery: string,
    nextFilters: EquipmentSearchFilters,
    cursor: string | null,
    targetIndex: number,
    limit: EquipmentPageSize = equipmentPageSize,
  ) => {
    const requestId = ++equipmentRequest.current;
    setEquipmentSearchLoading(true);
    setEquipmentSearchError(null);
    setEquipmentPages((current) => {
      const pages = current.slice(0, targetIndex);
      pages[targetIndex] = { items: [], nextCursor: null, cursor };
      return pages;
    });
    setEquipmentPageIndex(targetIndex);
    void fetchEquipmentCandidates(
      nextQuery,
      nextFilters,
      cursor ?? undefined,
      limit,
    )
      .then((pageResult) => {
        if (equipmentRequest.current !== requestId) return;
        setEquipmentPages((current) => {
          const pages = current.slice(0, targetIndex);
          pages[targetIndex] = { ...pageResult, cursor };
          return pages;
        });
        setEquipmentPageIndex(targetIndex);
      })
      .catch((reason: unknown) => {
        if (equipmentRequest.current === requestId) {
          setEquipmentSearchError(readError(reason));
        }
      })
      .finally(() => {
        if (equipmentRequest.current === requestId) {
          setEquipmentSearchLoading(false);
        }
      });
  };
  const submitSearch = () => {
    if (searchMode === "title") {
      const nextQuery = titleQuery.trim();
      setTitleQuery(nextQuery);
      if (nextQuery === activeTitleQuery) {
        if (nextQuery) retry();
        return;
      }
      updateFilter(() => setActiveTitleQuery(nextQuery));
      return;
    }

    const nextQuery = equipmentQuery.trim();
    const nextFilters = {
      ...equipmentFilters,
      itemUiCategory: equipmentFilters.itemUiCategory.trim(),
    };
    setEquipmentQuery(nextQuery);
    setEquipmentFilters(nextFilters);
    if (validateEquipmentSearchFilters(nextFilters)) return;
    if (!nextQuery && !countEquipmentSearchFilters(nextFilters)) return;
    setEquipmentResultsOpen(true);
    setEquipmentPages([]);
    setEquipmentPageIndex(0);
    setActiveEquipmentFilters(nextFilters);
    if (selectedEquipment) {
      selectedEquipmentId.current = null;
      updateFilter(() => {
        setEquipmentModelCandidates([]);
        setSelectedEquipmentModelIds([]);
        setSelectedEquipment(null);
      });
    }
    requestEquipmentPage(nextQuery, nextFilters, null, 0);
  };
  const clearEquipmentSearch = () => {
    equipmentRequest.current += 1;
    setEquipmentQuery("");
    setEquipmentPages([]);
    setEquipmentPageIndex(0);
    setEquipmentFilters(createEmptyEquipmentSearchFilters());
    setActiveEquipmentFilters(createEmptyEquipmentSearchFilters());
    setEquipmentResultsOpen(false);
    setEquipmentSearchError(null);
    setEquipmentSearchLoading(false);
    selectedEquipmentId.current = null;
    setEquipmentModelCandidates([]);
    setSelectedEquipmentModelIds([]);
    setEquipmentRangeUpdating(false);
    if (selectedEquipment) updateFilter(() => setSelectedEquipment(null));
  };
  const clearSearch = () => {
    if (searchMode === "equipment") {
      clearEquipmentSearch();
      return;
    }
    setTitleQuery("");
    if (activeTitleQuery) updateFilter(() => setActiveTitleQuery(""));
  };
  const selectEquipment = (equipment: EquipmentSearchItem) => {
    equipmentRequest.current += 1;
    setEquipmentQuery(equipment.name);
    setEquipmentResultsOpen(false);
    setEquipmentSearchError(null);
    setEquipmentSearchLoading(false);
    selectedEquipmentId.current = equipment.id;
    updateFilter(() => {
      setEquipmentModelCandidates([]);
      setSelectedEquipmentModelIds([]);
      setEquipmentRangeUpdating(false);
      setSelectedEquipment(equipment);
      setSearchModeState("equipment");
    });
    window.scrollTo({ top: 0 });
  };
  const registerEquivalentEquipment = (
    equipmentId: number,
    modelItems: WikiModelItem[],
  ) => {
    if (selectedEquipmentId.current !== equipmentId) return;
    const seen = new Set<string>();
    const candidates = modelItems
      .filter(
        (model) =>
          model.relation !== "current" &&
          model.id !== selectedEquipmentId.current,
      )
      .filter((model) => {
        const key = model.id === null ? model.name : String(model.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) =>
        left.relation === right.relation
          ? 0
          : left.relation === "identical"
            ? -1
            : 1,
      );
    setEquipmentModelCandidates(candidates);
    setSelectedEquipmentModelIds([]);
    setEquipmentRangeUpdating(false);
  };
  const toggleEquivalentEquipment = (equipmentId: number) => {
    const candidate = equipmentModelCandidates.find(
      (model) => model.id === equipmentId,
    );
    if (!candidate || candidate.unobtainable) return;
    setError(null);
    if (selectedEquipmentModelIds.includes(equipmentId)) {
      setEquipmentRangeUpdating(true);
      setSelectedEquipmentModelIds((current) =>
        current.filter((id) => id !== equipmentId),
      );
      return;
    }
    if (
      selectedEquipmentModelIds.length >= MAX_EQUIVALENT_EQUIPMENT_SELECTION
    ) {
      return;
    }
    setError(null);
    setEquipmentRangeUpdating(true);
    setSelectedEquipmentModelIds((current) => [...current, equipmentId]);
  };
  const selectAllEquivalentEquipment = () => {
    const nextIds = equipmentModelCandidates
      .flatMap((model) =>
        model.id === null || model.unobtainable ? [] : [model.id],
      )
      .slice(0, MAX_EQUIVALENT_EQUIPMENT_SELECTION);
    if (
      nextIds.length === selectedEquipmentModelIds.length &&
      nextIds.every((id, index) => selectedEquipmentModelIds[index] === id)
    ) {
      return;
    }
    setEquipmentRangeUpdating(true);
    setSelectedEquipmentModelIds(nextIds);
  };
  const clearEquivalentEquipment = () => {
    if (!selectedEquipmentModelIds.length) return;
    setError(null);
    setEquipmentRangeUpdating(true);
    setSelectedEquipmentModelIds([]);
  };
  const closeEquipmentResults = () => {
    setEquipmentResultsOpen(false);
    window.scrollTo({ top: 0 });
  };
  const showPreviousEquipmentPage = () => {
    if (equipmentPageIndex === 0 || equipmentSearchLoading) return;
    setEquipmentPageIndex((current) => current - 1);
    window.scrollTo({ top: 0 });
  };
  const showNextEquipmentPage = () => {
    if (equipmentSearchLoading || !equipmentPage) return;
    if (equipmentPages[equipmentPageIndex + 1]) {
      setEquipmentPageIndex((current) => current + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    if (!equipmentPage.nextCursor) return;
    requestEquipmentPage(
      equipmentQuery,
      activeEquipmentFilters,
      equipmentPage.nextCursor,
      equipmentPageIndex + 1,
    );
    window.scrollTo({ top: 0 });
  };
  const retryEquipmentSearch = () => {
    requestEquipmentPage(
      equipmentQuery,
      activeEquipmentFilters,
      equipmentPage?.cursor ?? null,
      equipmentPageIndex,
    );
  };
  const changeEquipmentPageSize = (nextSize: EquipmentPageSize) => {
    if (nextSize === equipmentPageSize || equipmentSearchLoading) return;
    setEquipmentPageSize(nextSize);
    setEquipmentPages([]);
    setEquipmentPageIndex(0);
    requestEquipmentPage(
      equipmentQuery,
      activeEquipmentFilters,
      null,
      0,
      nextSize,
    );
    window.scrollTo({ top: 0 });
  };
  const changeSearchMode = (nextMode: GlamourSearchMode) => {
    if (nextMode === searchMode) return;
    const nextKeywords =
      nextMode === "title"
        ? activeTitleQuery
        : selectedEquipment
          ? String(selectedEquipment.id)
          : "";
    const nextSearchByEquipment =
      nextMode === "equipment" && !!selectedEquipment;
    if (
      nextKeywords !== requestKeywords ||
      nextSearchByEquipment !== searchByEquipment
    ) {
      updateFilter(() => setSearchModeState(nextMode));
      return;
    }
    setSearchModeState(nextMode);
  };
  const toggleJob = (job: EquipmentClassJob) => {
    updateFilter(() =>
      setSelectedJobs((current) =>
        current.includes(job)
          ? current.filter((item) => item !== job)
          : [...current, job],
      ),
    );
  };
  const clearJobs = () => {
    if (!selectedJobs.length) return;
    updateFilter(() => setSelectedJobs([]));
  };
  const toggleSave = (id: number) => {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };
  const canLoadMore =
    enabled &&
    (jobFilterActive
      ? glamours.length > jobVisibleCount || jobScanHasMore || jobScanRunning
      : hasMore);

  return {
    searchMode,
    setSearchMode: changeSearchMode,
    query,
    setQuery: searchMode === "title" ? setTitleQuery : setEquipmentQuery,
    activeQuery,
    canSubmitSearch,
    submitSearch,
    clearSearch,
    equipmentResultsOpen,
    equipmentCandidates: equipmentPage?.items ?? [],
    equipmentPage: equipmentPageIndex + 1,
    equipmentPageSize,
    equipmentFilters,
    activeEquipmentFilters,
    canShowPreviousEquipmentPage: equipmentPageIndex > 0,
    canShowNextEquipmentPage: Boolean(
      equipmentPages[equipmentPageIndex + 1] || equipmentPage?.nextCursor,
    ),
    selectedEquipment,
    equipmentModelCandidates,
    selectedEquipmentModelIds,
    equipmentRangeUpdating,
    equipmentSearchLoading,
    equipmentSearchError,
    selectEquipment,
    registerEquivalentEquipment,
    toggleEquivalentEquipment,
    selectAllEquivalentEquipment,
    clearEquivalentEquipment,
    closeEquipmentResults,
    showPreviousEquipmentPage,
    showNextEquipmentPage,
    retryEquipmentSearch,
    changeEquipmentPageSize,
    setEquipmentFilters,
    clearEquipmentFilters: () =>
      setEquipmentFilters(createEmptyEquipmentSearchFilters()),
    order,
    setOrder: (next: GlamourOrder) => updateFilter(() => setOrder(next)),
    raceId,
    setRaceId: (next: number | null) => updateFilter(() => setRaceId(next)),
    genderId,
    setGenderId: (next: number | null) => updateFilter(() => setGenderId(next)),
    selectedJobs,
    toggleJob,
    clearJobs,
    saved,
    results,
    total: jobFilterActive || !hasMore ? results.length : total,
    loading: loading || (!initialized && enabled),
    loadingMore: jobFilterActive ? jobRevealWaiting : loadingMore,
    error,
    canLoadMore,
    retry,
    toggleSave,
    loadMore,
  };
}

function matchesId(ids: number[], selectedId: number | null) {
  return selectedId === null || ids.includes(selectedId);
}

function waitForJobFilterInterval(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Request aborted.", "AbortError"));
      return;
    }
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, JOB_FILTER_REQUEST_INTERVAL_MS);
    const abort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Request aborted.", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

function readError(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  if (
    typeof reason === "object" &&
    reason !== null &&
    "message" in reason &&
    typeof reason.message === "string"
  ) {
    return reason.message;
  }
  return "无法读取石之家投稿，请稍后重试";
}

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError";
}
