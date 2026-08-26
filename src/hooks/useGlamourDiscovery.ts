/** Owns gallery loading, filtering, pagination, and local save feedback. */
import { useEffect, useMemo, useRef, useState } from "react";
import { PREVIEW_GLAMOURS } from "../data/previewGlamours";
import {
  type EquipmentPageSize,
  fetchEquipmentCandidates,
  type EquipmentSearchItem,
  type EquipmentSearchPage,
} from "../services/equipmentApi";
import {
  fetchGlamours,
  isTauriRuntime,
  type Glamour,
  type GlamourOrder,
} from "../services/glamourApi";
import type { WikiModelItem } from "../services/wikiApi";

const DISCOVERY_PAGE_SIZE = 12;
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

export function useGlamourDiscovery() {
  const preview = !isTauriRuntime();
  const [glamours, setGlamours] = useState<Glamour[]>(
    preview ? PREVIEW_GLAMOURS : [],
  );
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
  const [saved, setSaved] = useState<number[]>([2, 6]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState<PageInfo | number>(
    preview ? PREVIEW_GLAMOURS.length : 0,
  );
  const [loading, setLoading] = useState(!preview);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const feedRequestVersion = useRef(0);
  const feedAbortController = useRef<AbortController | null>(null);
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

  useEffect(() => {
    if (preview) return;
    let active = true;
    feedAbortController.current?.abort();
    const controller = new AbortController();
    feedAbortController.current = controller;
    const requestVersion = ++feedRequestVersion.current;
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
    order,
    pageSize,
    preview,
    raceId,
    requestKeywords,
    retryKey,
    searchByEquipment,
  ]);

  const results = useMemo(() => {
    const normalized =
      searchMode === "title" ? activeTitleQuery.toLocaleLowerCase("zh-CN") : "";
    const matched = glamours.filter(
      (item) =>
        (!normalized ||
          item.title.toLocaleLowerCase("zh-CN").includes(normalized)) &&
        matchesId(item.raceIds, raceId) &&
        matchesId(item.genderIds, genderId),
    );
    if (!preview) return matched;
    return [...matched].sort((a, b) =>
      order === "hot" ? b.likes - a.likes : b.id - a.id,
    );
  }, [
    activeTitleQuery,
    genderId,
    glamours,
    order,
    preview,
    raceId,
    searchMode,
  ]);

  const updateFilter = (update: () => void) => {
    if (!preview) {
      setLoading(true);
      setError(null);
    }
    update();
  };

  const loadMore = async () => {
    if (preview || loadingMoreRef.current) return;
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
    void fetchEquipmentCandidates(nextQuery, cursor ?? undefined, limit)
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
    setEquipmentQuery(nextQuery);
    if (!nextQuery) {
      clearEquipmentSearch();
      return;
    }
    setEquipmentResultsOpen(true);
    setEquipmentPages([]);
    setEquipmentPageIndex(0);
    if (selectedEquipment) {
      selectedEquipmentId.current = null;
      updateFilter(() => {
        setEquipmentModelCandidates([]);
        setSelectedEquipmentModelIds([]);
        setSelectedEquipment(null);
      });
    }
    requestEquipmentPage(nextQuery, null, 0);
  };
  const clearEquipmentSearch = () => {
    equipmentRequest.current += 1;
    setEquipmentQuery("");
    setEquipmentPages([]);
    setEquipmentPageIndex(0);
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
      if (!preview) setEquipmentRangeUpdating(true);
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
    if (!preview) setEquipmentRangeUpdating(true);
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
    if (!preview) setEquipmentRangeUpdating(true);
    setSelectedEquipmentModelIds(nextIds);
  };
  const clearEquivalentEquipment = () => {
    if (!selectedEquipmentModelIds.length) return;
    setError(null);
    if (!preview) setEquipmentRangeUpdating(true);
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
      equipmentPage.nextCursor,
      equipmentPageIndex + 1,
    );
    window.scrollTo({ top: 0 });
  };
  const retryEquipmentSearch = () => {
    requestEquipmentPage(
      equipmentQuery,
      equipmentPage?.cursor ?? null,
      equipmentPageIndex,
    );
  };
  const changeEquipmentPageSize = (nextSize: EquipmentPageSize) => {
    if (nextSize === equipmentPageSize || equipmentSearchLoading) return;
    setEquipmentPageSize(nextSize);
    setEquipmentPages([]);
    setEquipmentPageIndex(0);
    requestEquipmentPage(equipmentQuery, null, 0, nextSize);
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
  const toggleSave = (id: number) => {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return {
    preview,
    searchMode,
    setSearchMode: changeSearchMode,
    query,
    setQuery: searchMode === "title" ? setTitleQuery : setEquipmentQuery,
    activeQuery,
    submitSearch,
    clearSearch,
    equipmentResultsOpen,
    equipmentCandidates: equipmentPage?.items ?? [],
    equipmentPage: equipmentPageIndex + 1,
    equipmentPageSize,
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
    order,
    setOrder: (next: GlamourOrder) => updateFilter(() => setOrder(next)),
    raceId,
    setRaceId: (next: number | null) => updateFilter(() => setRaceId(next)),
    genderId,
    setGenderId: (next: number | null) => updateFilter(() => setGenderId(next)),
    saved,
    results,
    featured: results[0] ?? glamours[0] ?? PREVIEW_GLAMOURS[0],
    total: preview || !hasMore ? results.length : total,
    loading,
    loadingMore,
    error,
    canLoadMore: !preview && hasMore,
    retry,
    toggleSave,
    loadMore,
  };
}

function matchesId(ids: number[], selectedId: number | null) {
  return selectedId === null || ids.includes(selectedId);
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
