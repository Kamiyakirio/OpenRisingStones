/** Fishing tasks share one catalog, including ocean voyages and their catch plans. */
import { useMemo, useState } from "react";
import {
  CompletionView,
  type SpotSelection,
} from "../features/fishing/CompletionView";
import { FishDetail } from "../features/fishing/FishDetail";
import { FishClock } from "../features/fishing/FishClock";
import {
  FISHING_FILTERS_KEY,
  FISHING_NOW_SCOPE_KEY,
  initialFishingSearch,
  parseFishingFilterPreferences,
  parseNowFishScope,
} from "../features/fishing/filterPreferences";
import { FishingSource } from "../features/fishing/FishingSource";
import { FishingSpotPage } from "../features/fishing/FishingSpotPage";
import { FishingSyncStatus } from "../features/fishing/FishingSyncStatus";
import type { RowContext } from "../features/fishing/FishingRows";
import { LookupView } from "../features/fishing/LookupView";
import { NowView } from "../features/fishing/NowView";
import { OceanRouteView } from "../features/fishing/OceanRouteView";
import { OceanScheduleView } from "../features/fishing/OceanScheduleView";
import {
  initialOceanViewState,
  OCEAN_VIEW_KEY,
  parseOceanViewState,
  type OceanViewState,
} from "../features/fishing/oceanRoutes";
import { TimerLauncher } from "../features/fishing/timer/TimerLauncher";
import { useFishing } from "../features/fishing/useFishing";
import {
  fishingRegions,
  initialFishingFacets,
  type FishingDiscipline,
  type FishingSearch,
  type NowFishScope,
} from "../features/fishing/workspace";
import type {
  Fish,
  FishFilters as FishingFacets,
  FishingLocation,
  OceanRoute,
} from "../features/fishing/types";
import { useListDetailScroll } from "../shared/hooks/useListDetailScroll";
import "../features/fishing/fishing.css";

type Mode = "now" | "completion" | "voyage" | "lookup";
type SelectedVoyage = { at: number; triggerId: string };
type SpotOrigin = {
  fishId: number;
  spot: SpotSelection | null;
  voyage: SelectedVoyage | null;
  mode: Mode;
};
const modes: { id: Mode; label: string; description: string }[] = [
  { id: "now", label: "可钓时间", description: "现在与下一窗口" },
  { id: "completion", label: "补图鉴", description: "地区 → 地图 → 钓场" },
  { id: "voyage", label: "海钓航线", description: "海域鱼种与钓法" },
  { id: "lookup", label: "查鱼", description: "按名称或条件查找" },
];
export function FishingPage() {
  const vm = useFishing();
  const { catalog, progress } = vm;
  const [mode, setMode] = useState<Mode>("now");
  const [voyageLimit, setVoyageLimit] = useState(6);
  const [selectedVoyage, setSelectedVoyage] = useState<SelectedVoyage | null>(
    null,
  );
  const [oceanState, setOceanState] = useState(() => {
    try {
      return parseOceanViewState(localStorage.getItem(OCEAN_VIEW_KEY));
    } catch {
      return initialOceanViewState;
    }
  });
  const [nowScope, setNowScope] = useState<NowFishScope>(() => {
    try {
      return parseNowFishScope(localStorage.getItem(FISHING_NOW_SCOPE_KEY));
    } catch {
      return "big";
    }
  });
  const [savedFilters] = useState(() => {
    try {
      return parseFishingFilterPreferences(
        localStorage.getItem(FISHING_FILTERS_KEY),
      );
    } catch {
      return parseFishingFilterPreferences(null);
    }
  });
  const [search, setSearch] = useState<FishingSearch>(savedFilters.search);
  const [facets, setFacets] = useState<FishingFacets>(savedFilters.facets);
  const [filterStorageError, setFilterStorageError] = useState(false);
  const [searchLimit, setSearchLimit] = useState(30);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [completionDiscipline, setCompletionDiscipline] =
    useState<FishingDiscipline>("fishing");
  const [regionQuery, setRegionQuery] = useState("");
  const [selectedMap, setSelectedMap] = useState<number | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<SpotSelection | null>(null);
  const [spotOrigin, setSpotOrigin] = useState<SpotOrigin | null>(null);
  const [spotShowAll, setSpotShowAll] = useState(false);
  const [openedFishSpotId, setOpenedFishSpotId] = useState<
    number | undefined
  >();
  const spotScroll = useListDetailScroll(Boolean(selectedSpot));
  const voyageScroll = useListDetailScroll(Boolean(selectedVoyage));
  const fishScroll = useListDetailScroll(Boolean(vm.selected));
  const [lastTrigger, setLastTrigger] = useState<string | null>(null);
  const [elevationFailed, setElevationFailed] = useState(false);
  const regions = useMemo(
    () =>
      catalog ? fishingRegions(catalog, progress, completionDiscipline) : [],
    [catalog, progress, completionDiscipline],
  );
  const fishById = useMemo(
    () => new Map(catalog?.fish.map((fish) => [fish.id, fish]) ?? []),
    [catalog],
  );
  const selectedRegionGroup = regions.find(
    (region) => region.name === selectedSpot?.region,
  );
  const selectedMapGroup = selectedRegionGroup?.maps.find(
    (map) => map.id === selectedSpot?.map,
  );
  const selectedSpotGroup = selectedMapGroup?.spots.find(
    (spot) => spot.id === selectedSpot?.spot,
  );
  /** Save each deliberate filter change, including reset and task shortcuts. */
  function saveFilters(nextSearch: FishingSearch, nextFacets: FishingFacets) {
    setSearch(nextSearch);
    setFacets(nextFacets);
    try {
      localStorage.setItem(
        FISHING_FILTERS_KEY,
        JSON.stringify({ version: 1, search: nextSearch, facets: nextFacets }),
      );
      setFilterStorageError(false);
    } catch {
      setFilterStorageError(true);
    }
  }
  const gameLogNotice = (
    <FishingSyncStatus
      vm={vm}
      catalogLength={catalog?.fish.length ?? 0}
      elevationFailed={elevationFailed}
      onElevationFailedChange={setElevationFailed}
    />
  );
  function changeSearch(change: Partial<FishingSearch>) {
    saveFilters({ ...search, ...change }, facets);
    setSearchLimit(30);
  }
  function changeNowScope(scope: NowFishScope) {
    setNowScope(scope);
    try {
      localStorage.setItem(FISHING_NOW_SCOPE_KEY, scope);
      setFilterStorageError(false);
    } catch {
      setFilterStorageError(true);
    }
  }
  function changeFacets(change: Partial<FishingFacets>) {
    saveFilters(search, { ...facets, ...change });
    setSearchLimit(30);
  }
  function resetLookup() {
    saveFilters(initialFishingSearch, initialFishingFacets);
    setSearchLimit(30);
  }
  function changeOceanState(next: OceanViewState) {
    setOceanState(next);
    try {
      localStorage.setItem(OCEAN_VIEW_KEY, JSON.stringify(next));
      setFilterStorageError(false);
    } catch {
      setFilterStorageError(true);
    }
  }
  /** Keep task shortcuts and the mode navigation at the same visible destination. */
  function showMode(next: Mode) {
    setMode(next);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      document
        .getElementById(`fish-mode-${next}`)
        ?.focus({ preventScroll: true }),
    );
  }
  function browse(
    change: Partial<FishingSearch>,
    facetChange: Partial<FishingFacets> = {},
  ) {
    saveFilters(
      { ...initialFishingSearch, ...change },
      { ...initialFishingFacets, ...facetChange },
    );
    setSearchLimit(30);
    showMode("lookup");
  }
  function openFish(fish: Fish, triggerId: string, spotId?: number) {
    setLastTrigger(triggerId);
    setOpenedFishSpotId(spotId);
    fishScroll.captureListPosition();
    vm.setSelectedId(fish.id);
  }
  function goBack() {
    fishScroll.requestListPositionRestore();
    vm.setSelectedId(null);
    requestAnimationFrame(() =>
      (
        document.getElementById(lastTrigger ?? "") ??
        document.querySelector<HTMLElement>(".fish-spot-page .fish-back") ??
        document.getElementById(`fish-mode-${mode}`)
      )?.focus({ preventScroll: true }),
    );
  }
  function openSpot(selection: SpotSelection) {
    spotScroll.captureListPosition();
    setSpotOrigin(null);
    setSelectedSpot(selection);
    setSpotShowAll(false);
  }
  /** Jump from a fish's active location to its spot, even from a voyage detail. */
  function openSpotFromFish(spot: FishingLocation) {
    if (!vm.selected) return;
    setSpotOrigin({
      fishId: vm.selected.id,
      spot: selectedSpot,
      voyage: selectedVoyage,
      mode,
    });
    const selection = {
      region: spot.region || "",
      map: spot.territory,
      spot: spot.id,
    };
    setCompletionDiscipline(
      vm.selected?.method === "spear" ? "spearfishing" : "fishing",
    );
    setSelectedRegion(selection.region);
    setSelectedMap(selection.map);
    setRegionQuery("");
    setSelectedSpot(selection);
    setSpotShowAll(false);
    setSelectedVoyage(null);
    setMode("completion");
    setOpenedFishSpotId(spot.id);
    window.scrollTo({ top: 0, behavior: "instant" });
    spotScroll.captureListPosition();
    vm.setSelectedId(null);
  }
  function openVoyage(route: OceanRoute, at: number, triggerId: string) {
    voyageScroll.captureListPosition();
    const firstVariant = catalog?.oceanRoutes.find(
      (item) => item.family === route.family && item.name === route.name,
    );
    changeOceanState({
      ...oceanState,
      family: route.family,
      routeId: firstVariant?.id ?? route.id,
      variantId: route.id,
      stopIndex: 0,
    });
    setSelectedVoyage({ at, triggerId });
  }
  function goBackToSchedule() {
    voyageScroll.requestListPositionRestore();
    setSelectedVoyage(null);
    requestAnimationFrame(() =>
      document
        .getElementById(selectedVoyage?.triggerId ?? "")
        ?.focus({ preventScroll: true }),
    );
  }
  function goBackToSpots() {
    const triggerId =
      selectedSpot && `fish-spot-${selectedSpot.map}-${selectedSpot.spot}`;
    spotScroll.requestListPositionRestore();
    setSelectedSpot(null);
    setSpotOrigin(null);
    requestAnimationFrame(() =>
      document.getElementById(triggerId ?? "")?.focus({ preventScroll: true }),
    );
  }
  function goBackToFishFromSpot() {
    if (!spotOrigin) return;
    setSelectedSpot(spotOrigin.spot);
    setSelectedVoyage(spotOrigin.voyage);
    setMode(spotOrigin.mode);
    vm.setSelectedId(spotOrigin.fishId);
    setSpotOrigin(null);
  }
  const context: RowContext | null = catalog && {
    catalog,
    fishById,
    progress,
    now: vm.now,
    fishEyes: mode === "lookup" && facets.fishEyes,
    gameCoveredIds: vm.gameCoveredIds,
    gameLogActive: Boolean(vm.gameLog),
    onOpen: openFish,
    onToggleSaved: (id) => vm.toggleProgress(id, "saved"),
  };
  return (
    <main className="fishing-workspace" id="top">
      {vm.storageError && (
        <p className="fish-alert" role="alert">
          无法保存本机数据；这次修改仅在当前页面有效。请检查本地存储设置。
        </p>
      )}
      {filterStorageError && (
        <p className="fish-alert" role="alert">
          无法保存筛选条件；下次打开时可能需要重新设置。
        </p>
      )}
      {!catalog ? (
        <div className="fish-loading">
          <h1>钓鱼</h1>
          {vm.error ? (
            <div role="alert">
              <p>鱼类资料加载失败。</p>
              <button onClick={vm.retry}>重新加载</button>
            </div>
          ) : (
            <p role="status">正在加载鱼类资料…</p>
          )}
        </div>
      ) : vm.selected ? (
        <FishDetail
          key={vm.selected.id}
          fish={vm.selected}
          initialSpotId={openedFishSpotId}
          catalog={catalog}
          now={vm.now}
          progress={progress}
          gameManaged={vm.gameCoveredIds.has(vm.selected.id)}
          gameLogActive={Boolean(vm.gameLog)}
          gameLogNotice={gameLogNotice}
          fishEyes={mode === "lookup" && facets.fishEyes}
          onToggle={vm.toggleProgress}
          onOpenSpot={openSpotFromFish}
          onBack={goBack}
        />
      ) : selectedVoyage && context ? (
        <OceanRouteView
          context={context}
          state={oceanState}
          departure={selectedVoyage.at}
          gameLogNotice={gameLogNotice}
          onChange={changeOceanState}
          onBack={goBackToSchedule}
        />
      ) : selectedRegionGroup &&
        selectedMapGroup &&
        selectedSpotGroup &&
        context ? (
        <FishingSpotPage
          region={selectedRegionGroup}
          map={selectedMapGroup}
          spot={selectedSpotGroup}
          context={context}
          gameLogNotice={gameLogNotice}
          showAll={spotShowAll}
          onShowAll={setSpotShowAll}
          backLabel={spotOrigin ? "返回鱼类资料" : undefined}
          onBack={spotOrigin ? goBackToFishFromSpot : goBackToSpots}
        />
      ) : (
        <>
          <header className="fish-page-heading">
            <div>
              <h1>钓鱼</h1>
              <p>鱼类资料 {catalog.fish.length} 条 · 窗口按本机时间计算</p>
            </div>
            <div className="fish-heading-tools">
              <FishClock />
              <TimerLauncher />
            </div>
          </header>
          {gameLogNotice}
          <nav className="fish-mode-nav" aria-label="钓鱼任务">
            {modes.map((item) => (
              <button
                id={`fish-mode-${item.id}`}
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                onClick={() => showMode(item.id)}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </nav>
          {context && mode === "now" && (
            <NowView
              context={context}
              scope={nowScope}
              onScopeChange={changeNowScope}
              onBrowse={browse}
              onCollection={() => showMode("completion")}
            />
          )}
          {context && mode === "completion" && (
            <CompletionView
              context={context}
              regions={regions}
              discipline={completionDiscipline}
              onDisciplineChange={(discipline) => {
                setCompletionDiscipline(discipline);
                setSelectedRegion("");
                setSelectedMap(null);
                setRegionQuery("");
              }}
              selectedRegion={selectedRegion}
              onSelectRegion={(region) => {
                setSelectedRegion(region);
                setSelectedMap(null);
              }}
              regionQuery={regionQuery}
              onRegionQuery={setRegionQuery}
              selectedMap={selectedMap}
              onSelectMap={setSelectedMap}
              onOpenSpot={openSpot}
            />
          )}
          {context && mode === "voyage" && (
            <OceanScheduleView
              context={context}
              limit={voyageLimit}
              onMore={() => setVoyageLimit((value) => value + 6)}
              onOpen={openVoyage}
            />
          )}
          {context && mode === "lookup" && (
            <LookupView
              context={context}
              search={search}
              facets={facets}
              onSearch={changeSearch}
              onFacets={changeFacets}
              onReset={resetLookup}
              limit={searchLimit}
              onMore={() => setSearchLimit((value) => value + 30)}
            />
          )}
          <FishingSource catalog={catalog} />
        </>
      )}
    </main>
  );
}
