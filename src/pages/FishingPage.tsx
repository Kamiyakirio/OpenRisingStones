/** Fishing tasks share one catalog, including ocean voyages and their catch plans. */
import {
  ArrowLeft,
  ArrowsClockwise,
  CaretRight,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FishDetail } from "../features/fishing/FishDetail";
import { FishClock } from "../features/fishing/FishClock";
import { FishFilters } from "../features/fishing/FishFilters";
import {
  FISHING_FILTERS_KEY,
  FISHING_NOW_SCOPE_KEY,
  initialFishingSearch,
  parseFishingFilterPreferences,
  parseNowFishScope,
} from "../features/fishing/filterPreferences";
import { FishingRows, type RowContext } from "../features/fishing/FishingRows";
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
  fishingOpportunities,
  fishingRegions,
  initialFishingFacets,
  matchesFishingDiscipline,
  matchesNowFishScope,
  searchFishingCatalog,
  type FishingCategory,
  type FishingDiscipline,
  type FishingMapGroup,
  type FishingRegionGroup,
  type FishingSearch,
  type FishingSpotGroup,
  type NowFishScope,
} from "../features/fishing/workspace";
import type {
  Fish,
  FishFilters as FishingFacets,
  OceanRoute,
} from "../features/fishing/types";
import { useListDetailScroll } from "../shared/hooks/useListDetailScroll";
import { restartAsAdministrator } from "../shared/game-bridge/api";
import "../features/fishing/fishing.css";

type Mode = "now" | "completion" | "voyage" | "lookup";
type SpotSelection = { region: string; map: number; spot: number };
const modes: { id: Mode; label: string; description: string }[] = [
  { id: "now", label: "可钓时间", description: "现在与下一窗口" },
  { id: "completion", label: "补图鉴", description: "地区 → 地图 → 钓场" },
  { id: "voyage", label: "海钓航线", description: "海域鱼种与钓法" },
  { id: "lookup", label: "查鱼", description: "按名称或条件查找" },
];
const categoryOptions: { id: FishingCategory | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "timed", label: "限时窗口" },
  { id: "anytime", label: "全天可钓" },
  { id: "voyage", label: "海钓航次" },
  { id: "unknown", label: "条件待补" },
];
const completionMethods: {
  id: FishingDiscipline;
  label: string;
  description: string;
}[] = [
  { id: "fishing", label: "钓鱼", description: "垂钓与海钓" },
  { id: "spearfishing", label: "刺鱼", description: "捕鱼叉" },
];
function NowView({
  context,
  scope,
  onScopeChange,
  onBrowse,
  onCollection,
}: {
  context: RowContext;
  scope: NowFishScope;
  onScopeChange: (scope: NowFishScope) => void;
  onBrowse: (
    change: Partial<FishingSearch>,
    facets?: Partial<FishingFacets>,
  ) => void;
  onCollection: () => void;
}) {
  const opportunities = useMemo(
    () => fishingOpportunities(context.catalog, context.progress, context.now),
    [context.catalog, context.progress, context.now],
  );
  const openFish = opportunities.open.filter((fish) =>
    matchesNowFishScope(fish, scope),
  );
  const upcomingFish = opportunities.upcoming.filter((fish) =>
    matchesNowFishScope(fish, scope),
  );
  const scopeFacets = scope === "big" ? { kinds: ["big", "legendary"] } : {};
  const savedIds = new Set(context.progress.saved);
  const saved = context.catalog.fish.filter((fish) => savedIds.has(fish.id));
  return (
    <div className="fish-now-layout">
      <div className="fish-now-main">
        <div className="fish-now-scope">
          <span>窗口鱼类</span>
          <div role="group" aria-label="窗口鱼类范围">
            <button
              type="button"
              aria-pressed={scope === "big"}
              onClick={() => onScopeChange("big")}
            >
              鱼王与鱼皇
            </button>
            <button
              type="button"
              aria-pressed={scope === "all"}
              onClick={() => onScopeChange("all")}
            >
              全部鱼
            </button>
          </div>
        </div>
        <section className="fish-task-section">
          <header className="fish-section-heading">
            <div>
              <h2>当前窗口</h2>
              <p>未记录，且已满足时间与天气条件。</p>
            </div>
            <span className="fish-count">{openFish.length} 条</span>
          </header>
          {openFish.length ? (
            <FishingRows
              fish={openFish.slice(0, 6)}
              idPrefix="now-open"
              context={context}
            />
          ) : (
            <p className="fish-inline-empty">
              {scope === "big"
                ? "当前没有窗口开放的未记录鱼王或鱼皇。"
                : "当前没有未记录且窗口开放的鱼。"}
            </p>
          )}
          {openFish.length > 6 && (
            <button
              className="fish-text-action"
              onClick={() =>
                onBrowse(
                  { category: "timed" },
                  {
                    ...scopeFacets,
                    completion: ["uncaught"],
                    available: true,
                  },
                )
              }
            >
              查看全部当前窗口
            </button>
          )}
        </section>
        <section className="fish-task-section">
          <header className="fish-section-heading">
            <div>
              <h2>接下来开放</h2>
              <p>按本机时间排列；进入鱼的资料可查看前置天气和鱼饵。</p>
            </div>
          </header>
          {upcomingFish.length ? (
            <FishingRows
              fish={upcomingFish.slice(0, 6)}
              idPrefix="now-next"
              context={context}
              showNextCountdown
            />
          ) : (
            <p className="fish-inline-empty">
              {scope === "big"
                ? "未来一年内没有可计算的鱼王或鱼皇窗口。"
                : "未来一年内没有可计算的下一窗口。"}
            </p>
          )}
          <button
            className="fish-text-action"
            onClick={() =>
              onBrowse(
                { category: "timed", sort: "window" },
                { ...scopeFacets, completion: ["uncaught"] },
              )
            }
          >
            {scope === "big" ? "查看所有限时鱼王与鱼皇" : "查看所有限时鱼"}
          </button>
        </section>
      </div>
      <aside className="fish-now-aside" aria-label="其他钓鱼任务">
        <section className="fish-aside-section">
          <h2>我的目标</h2>
          {saved.length ? (
            <FishingRows
              fish={saved.slice(0, 4)}
              idPrefix="now-saved"
              context={context}
            />
          ) : (
            <p>打开鱼的资料，收藏想优先钓的鱼。</p>
          )}
          {saved.length > 4 && (
            <button
              className="fish-text-action"
              onClick={() => onBrowse({}, { progress: "saved" })}
            >
              查看全部收藏
            </button>
          )}
        </section>
        <section className="fish-aside-section">
          <h2>全天可钓</h2>
          <p>
            还有 {opportunities.anytime.length} 条未记录的鱼无需等待时间窗口。
          </p>
          <button
            className="fish-text-action"
            onClick={() =>
              onBrowse({ category: "anytime" }, { completion: ["uncaught"] })
            }
          >
            查看全天可钓
          </button>
        </section>
        <section className="fish-aside-section">
          <h2>按地区查漏</h2>
          <p>逐级查看地图与钓场的未记录鱼。</p>
          <button className="fish-text-action" onClick={onCollection}>
            查看图鉴缺口
          </button>
        </section>
      </aside>
    </div>
  );
}

function FishingSpotList({
  map,
  onOpen,
}: {
  map: FishingMapGroup;
  onOpen: (spot: FishingSpotGroup) => void;
}) {
  return (
    <div className="fish-spot-list">
      {map.spots.map((spot) => (
        <button
          className="fish-spot-link"
          id={`fish-spot-${map.id}-${spot.id}`}
          key={spot.id}
          type="button"
          onClick={() => onOpen(spot)}
        >
          <strong>{spot.name || "钓场待补"}</strong>
          <span>
            {spot.fish.length === spot.caught
              ? "已齐"
              : `${spot.fish.length - spot.caught} 未记录`}
          </span>
          <CaretRight aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/** A spot replaces the directory view; fish details return here first. */
function FishingSpotPage({
  region,
  map,
  spot,
  context,
  gameLogNotice,
  showAll,
  onShowAll,
  onBack,
}: {
  region: FishingRegionGroup;
  map: FishingMapGroup;
  spot: FishingSpotGroup;
  context: RowContext;
  gameLogNotice: ReactNode;
  showAll: boolean;
  onShowAll: (showAll: boolean) => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), [spot.id]);
  const caughtIds = new Set(context.progress.caught);
  const remaining = spot.fish.filter((fish) => !caughtIds.has(fish.id));
  const visible = showAll ? spot.fish : remaining;
  return (
    <div className="fish-spot-page">
      <button className="fish-back" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> 返回钓场列表
      </button>
      <header className="fish-spot-page-heading">
        <div>
          <p>
            {region.name} / {map.name}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {spot.name || "钓场待补"}
          </h1>
        </div>
        <p>
          已记录 {spot.caught} / {spot.fish.length}
        </p>
      </header>
      {gameLogNotice}
      <section className="fish-spot-page-fish" aria-label="钓场鱼类">
        <header className="fish-section-heading">
          <div>
            <h2>鱼类</h2>
            <p>按图鉴记录顺序排列；图鉴外的鱼排在最后。</p>
          </div>
          <div
            className="fish-spot-view-controls"
            role="group"
            aria-label="鱼类范围"
          >
            <button
              type="button"
              aria-pressed={!showAll}
              onClick={() => onShowAll(false)}
            >
              未记录 {remaining.length}
            </button>
            <button
              type="button"
              aria-pressed={showAll}
              onClick={() => onShowAll(true)}
            >
              全部 {spot.fish.length}
            </button>
          </div>
        </header>
        {visible.length ? (
          <FishingRows
            fish={visible}
            idPrefix={`spot-${spot.id}`}
            context={context}
            showLocation={false}
            spotId={spot.id}
          />
        ) : (
          <p className="fish-inline-empty">
            这里的鱼都已记录。可切换到“全部”查看。
          </p>
        )}
      </section>
    </div>
  );
}

function CompletionView({
  context,
  regions,
  discipline,
  onDisciplineChange,
  selectedRegion,
  onSelectRegion,
  regionQuery,
  onRegionQuery,
  selectedMap,
  onSelectMap,
  onOpenSpot,
}: {
  context: RowContext;
  regions: FishingRegionGroup[];
  discipline: FishingDiscipline;
  onDisciplineChange: (discipline: FishingDiscipline) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  regionQuery: string;
  onRegionQuery: (query: string) => void;
  selectedMap: number | null;
  onSelectMap: (map: number) => void;
  onOpenSpot: (selection: SpotSelection) => void;
}) {
  const visibleRegions = regions.filter((region) =>
    region.name
      .toLocaleLowerCase()
      .includes(regionQuery.trim().toLocaleLowerCase()),
  );
  const activeRegion =
    visibleRegions.find((region) => region.name === selectedRegion) ??
    visibleRegions[0];
  const activeMap =
    activeRegion?.maps.find((map) => map.id === selectedMap) ??
    activeRegion?.maps[0];
  const caughtIds = new Set(context.progress.caught);
  const methodCounts = Object.fromEntries(
    completionMethods.map((method) => {
      const fish = context.catalog.fish.filter((item) =>
        matchesFishingDiscipline(item, method.id),
      );
      return [
        method.id,
        {
          total: fish.length,
          caught: fish.filter((item) => caughtIds.has(item.id)).length,
        },
      ];
    }),
  ) as Record<FishingDiscipline, { total: number; caught: number }>;
  const activeCount = methodCounts[discipline];
  return (
    <div className="fish-completion">
      <header className="fish-completion-heading">
        <div>
          <h2>
            {context.gameLogActive ? "当前角色的钓获记录" : "本机的手动记录"}
          </h2>
          <p>
            {context.gameLogActive
              ? "游戏图鉴内的鱼自动更新；图鉴外的鱼仍可手动记录。"
              : "Windows 桌面端进入游戏后可读取图鉴。当前显示本机标记。"}
          </p>
        </div>
        <p className="fish-completion-total">
          已记录 <strong>{activeCount.caught}</strong> / {activeCount.total}
        </p>
      </header>
      <nav className="fish-completion-methods" aria-label="图鉴钓法">
        {completionMethods.map((method) => (
          <button
            key={method.id}
            type="button"
            aria-pressed={discipline === method.id}
            onClick={() => onDisciplineChange(method.id)}
          >
            <strong>{method.label}</strong>
            <span>
              {method.description} ·{" "}
              {methodCounts[method.id].total - methodCounts[method.id].caught}{" "}
              未记录
            </span>
          </button>
        ))}
      </nav>
      <div className="fish-completion-layout">
        <div className="fish-zone-index">
          <label htmlFor="fish-region-query">地区</label>
          <input
            id="fish-region-query"
            type="search"
            value={regionQuery}
            onChange={(event) => onRegionQuery(event.target.value)}
            placeholder="搜索地区"
          />
          <div className="fish-zone-list" aria-label="地区列表">
            {visibleRegions.map((region) => (
              <button
                key={region.name}
                type="button"
                className="fish-zone-button"
                aria-pressed={region.name === activeRegion?.name}
                onClick={() => onSelectRegion(region.name)}
              >
                <span>{region.name || "地区待补"}</span>
                <small>{region.fish.length - region.caught} 未记录</small>
              </button>
            ))}
            {!visibleRegions.length && (
              <p className="fish-inline-empty">没有这个地区，请换个名称。</p>
            )}
          </div>
        </div>
        <div className="fish-map-index">
          <h2>地图</h2>
          {activeRegion ? (
            <div className="fish-map-list" aria-label="地图列表">
              {activeRegion.maps.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  className="fish-zone-button"
                  aria-pressed={map.id === activeMap?.id}
                  onClick={() => onSelectMap(map.id)}
                >
                  <span>{map.name || "地图待补"}</span>
                  <small>{map.fish.length - map.caught} 未记录</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="fish-inline-empty">先选择地区。</p>
          )}
        </div>
        <section className="fish-zone-detail" aria-label="钓场列表">
          <header className="fish-section-heading">
            <div>
              <h2>钓场</h2>
              <p>
                {activeMap?.name ?? "先选择地图"} · 已记录{" "}
                {activeMap?.caught ?? 0}/{activeMap?.fish.length ?? 0}
              </p>
            </div>
          </header>
          {activeMap && (
            <>
              <p className="fish-spot-note">
                未记录多的钓场在前；地图和地区的数量按鱼去重。
              </p>
              <FishingSpotList
                key={`${activeRegion?.name ?? ""}:${activeMap.id}`}
                map={activeMap}
                onOpen={(spot) =>
                  onOpenSpot({
                    region: activeRegion?.name ?? "",
                    map: activeMap.id,
                    spot: spot.id,
                  })
                }
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function LookupView({
  context,
  search,
  facets,
  onSearch,
  onFacets,
  onReset,
  limit,
  onMore,
}: {
  context: RowContext;
  search: FishingSearch;
  facets: FishingFacets;
  onSearch: (change: Partial<FishingSearch>) => void;
  onFacets: (change: Partial<FishingFacets>) => void;
  onReset: () => void;
  limit: number;
  onMore: () => void;
}) {
  const results = useMemo(
    () =>
      searchFishingCatalog(
        context.catalog,
        context.progress,
        context.now,
        search,
        facets,
      ),
    [context.catalog, context.progress, context.now, search, facets],
  );
  return (
    <div className="fish-lookup">
      <div className="fish-lookup-top">
        <label className="fish-lookup-search" htmlFor="fish-query">
          <span>搜索鱼名、拼音、物品 ID 或钓点</span>
          <span className="fish-lookup-input">
            <MagnifyingGlass aria-hidden="true" />
            <input
              id="fish-query"
              type="search"
              value={search.query}
              onChange={(event) => onSearch({ query: event.target.value })}
              placeholder="涅普特龙 / nieputelong / 8754"
            />
          </span>
        </label>
      </div>
      <div className="fish-category-controls" aria-label="按窗口类型筛选">
        {categoryOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={search.category === option.id}
            onClick={() => onSearch({ category: option.id })}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="fish-lookup-controls">
        <label>
          排序
          <select
            value={search.sort}
            onChange={(event) =>
              onSearch({ sort: event.target.value as FishingSearch["sort"] })
            }
          >
            <option value="window">下一窗口</option>
            <option value="name">鱼名</option>
            <option value="patch">版本：新到旧</option>
            <option value="level">等级：高到低</option>
          </select>
        </label>
        {facets.available && (
          <button
            className="fish-clear-open"
            onClick={() => onFacets({ available: false })}
          >
            取消“仅看当前可钓”
          </button>
        )}
      </div>
      <FishFilters
        catalog={context.catalog}
        filters={facets}
        gameLogActive={context.gameLogActive}
        onChange={onFacets}
        onReset={onReset}
      />
      <div className="fish-lookup-results">
        <header className="fish-section-heading">
          <div>
            <h2>查询结果</h2>
            <p>找到 {results.length} 条鱼</p>
          </div>
        </header>
        {results.length ? (
          <>
            <FishingRows
              fish={results.slice(0, limit)}
              idPrefix="lookup"
              context={context}
            />
            {results.length > limit && (
              <button className="fish-text-action" onClick={onMore}>
                再显示 {Math.min(30, results.length - limit)} 条
              </button>
            )}
          </>
        ) : (
          <div className="fish-empty">
            <h3>没有符合条件的鱼</h3>
            <p>可修改鱼名或清除筛选。</p>
            <button onClick={onReset}>清除筛选</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FishingPage() {
  const vm = useFishing();
  const { catalog, progress } = vm;
  const [mode, setMode] = useState<Mode>("now");
  const [voyageLimit, setVoyageLimit] = useState(6);
  const [selectedVoyage, setSelectedVoyage] = useState<{
    at: number;
    triggerId: string;
  } | null>(null);
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
  const [spotShowAll, setSpotShowAll] = useState(false);
  const [openedFishSpotId, setOpenedFishSpotId] = useState<
    number | undefined
  >();
  const spotScroll = useListDetailScroll(Boolean(selectedSpot));
  const voyageScroll = useListDetailScroll(Boolean(selectedVoyage));
  const fishScroll = useListDetailScroll(Boolean(vm.selected));
  const [lastTrigger, setLastTrigger] = useState<string | null>(null);
  const [elevationFailed, setElevationFailed] = useState(false);
  const debugAccessDenied =
    __DEBUG_BUILD__ && vm.gameLogStatus === "access-denied";
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
  const gameUnmapped = catalog
    ? catalog.fish.length - vm.gameCoveredIds.size
    : 0;
  const gameLogStatus = vm.desktop && (
    <div className="fish-sync" role="status">
      <span
        className="fish-sync-indicator"
        data-ready={vm.gameLogStatus === "ready"}
      />
      <div>
        <strong>
          {vm.gameLog ? `${vm.gameLog.characterName} · 游戏图鉴` : "游戏图鉴"}
        </strong>
        <span>
          {vm.gameLogStatus === "ready"
            ? `已从游戏读取 ${vm.gameCaughtCount} 条已钓记录；${gameUnmapped} 条图鉴外鱼需手动记录。`
            : vm.gameLogStatus === "unsupported"
              ? "自动读取仅支持 Windows 桌面版。"
              : vm.gameLogStatus === "access-denied"
                ? debugAccessDenied
                  ? "调试模式下请关闭应用，在管理员终端运行 npm run tauri dev 后重试。"
                  : elevationFailed
                    ? "Windows 未能以管理员身份重启应用，请检查权限后重试。"
                    : "Windows 拒绝读取游戏进程，请以管理员身份重启应用后重试。"
                : vm.gameLogStatus === "multiple-processes"
                  ? "检测到多个游戏进程，请只保留一个后重新读取。"
                  : vm.gameLogStatus === "unsupported-version"
                    ? "当前游戏版本无法读取图鉴，请更新应用后重试。"
                    : vm.gameLogStatus === "error"
                      ? "读取游戏图鉴失败，请重试。"
                      : vm.gameLogStatus === "syncing"
                        ? "正在读取当前角色的图鉴…"
                        : "进入游戏角色后自动读取；当前显示本机记录。"}
        </span>
      </div>
      {!debugAccessDenied && (
        <button
          type="button"
          onClick={() => {
            if (vm.gameLogStatus === "access-denied") {
              setElevationFailed(false);
              void restartAsAdministrator().catch(() =>
                setElevationFailed(true),
              );
            } else {
              void vm.refreshGameLog();
            }
          }}
          disabled={
            vm.gameLogStatus === "syncing" || vm.gameLogStatus === "unsupported"
          }
        >
          <ArrowsClockwise aria-hidden="true" />
          {vm.gameLogStatus === "access-denied"
            ? "以管理员身份重启"
            : "重新读取"}
        </button>
      )}
    </div>
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
    setSelectedSpot(selection);
    setSpotShowAll(false);
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
    requestAnimationFrame(() =>
      document.getElementById(triggerId ?? "")?.focus({ preventScroll: true }),
    );
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
          无法保存本机标记；这次修改仅在当前页面有效。请检查本地存储设置。
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
          gameLogNotice={gameLogStatus}
          fishEyes={mode === "lookup" && facets.fishEyes}
          onToggle={vm.toggleProgress}
          onBack={goBack}
        />
      ) : selectedVoyage && context ? (
        <OceanRouteView
          context={context}
          state={oceanState}
          departure={selectedVoyage.at}
          gameLogNotice={gameLogStatus}
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
          gameLogNotice={gameLogStatus}
          showAll={spotShowAll}
          onShowAll={setSpotShowAll}
          onBack={goBackToSpots}
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
          {gameLogStatus}
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
          <details className="fish-source">
            <summary>数据来源与覆盖范围</summary>
            <p>
              本地收录 {catalog.fish.length} 条鱼类资料，生成于{" "}
              {new Date(catalog.generatedAt).toLocaleDateString("zh-CN")}。
              时间与天气仅用于规划窗口；海钓班次按游戏航线轮换推算，出发前请在游戏中核对。
              鱼识和未收录条件也需在游戏中确认。
              图鉴外的任务鱼无法读取历史钓获状态。
            </p>
            <p>
              资料来自{" "}
              <a
                href="https://github.com/icykoneko/ff14-fish-tracker-app"
                target="_blank"
                rel="noreferrer"
              >
                FF14 Fish Tracker
              </a>
              、
              <a
                href="https://github.com/ffxiv-teamcraft/ffxiv-teamcraft"
                target="_blank"
                rel="noreferrer"
              >
                Teamcraft
              </a>{" "}
              和
              <a
                href="https://github.com/thewakingsands/ffxiv-datamining-cn"
                target="_blank"
                rel="noreferrer"
              >
                FFXIV 中文游戏数据
              </a>
              和
              <a
                href="https://github.com/NotNite/DistantSeas"
                target="_blank"
                rel="noreferrer"
              >
                DistantSeas
              </a>
              ；图标通过 XIVAPI 加载。本机标记会随“清除本地数据”一起删除。
            </p>
            <p>
              咬钩时间实时读取 Teamcraft 社区记录，按鱼、钓场和鱼饵匹配。
              显示的是样本中间 90% 的范围和记录次数；技能与装备会影响实际时间。
            </p>
          </details>
        </>
      )}
    </main>
  );
}
