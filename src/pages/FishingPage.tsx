/** Three fishing tasks share one catalog: current windows, missing catches, and direct lookup. */
import { ArrowsClockwise, MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { FishDetail } from "../features/fishing/FishDetail";
import { FishClock } from "../features/fishing/FishClock";
import { FishFilters } from "../features/fishing/FishFilters";
import { FishingRow } from "../features/fishing/FishingRow";
import { TimerLauncher } from "../features/fishing/timer/TimerLauncher";
import { useFishing } from "../features/fishing/useFishing";
import {
  fishingOpportunities,
  fishingZones,
  initialFishingFacets,
  searchFishingCatalog,
  type FishingCategory,
  type FishingSearch,
} from "../features/fishing/workspace";
import type {
  Fish,
  FishCatalog,
  FishProgress,
  FishFilters as FishingFacets,
} from "../features/fishing/types";
import { useListDetailScroll } from "../shared/hooks/useListDetailScroll";
import "../features/fishing/fishing.css";

type Mode = "now" | "completion" | "lookup";
const modes: { id: Mode; label: string; description: string }[] = [
  { id: "now", label: "可钓时间", description: "现在与下一窗口" },
  { id: "completion", label: "补图鉴", description: "按地区查看未钓获" },
  { id: "lookup", label: "查鱼", description: "按名称或条件查找" },
];
const categoryOptions: { id: FishingCategory | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "timed", label: "限时窗口" },
  { id: "anytime", label: "全天可钓" },
  { id: "voyage", label: "海钓航次" },
  { id: "unknown", label: "条件待补" },
];
const initialSearch: FishingSearch = {
  query: "",
  category: "all",
  sort: "window",
};

type RowContext = {
  catalog: FishCatalog;
  progress: FishProgress;
  now: number;
  fishEyes: boolean;
  gameCoveredIds: Set<number>;
  gameLogActive: boolean;
  onOpen: (fish: Fish, triggerId: string) => void;
  onToggleSaved: (id: number) => void;
};

function FishingRows({
  fish,
  idPrefix,
  context,
}: {
  fish: Fish[];
  idPrefix: string;
  context: RowContext;
}) {
  const caught = new Set(context.progress.caught);
  const saved = new Set(context.progress.saved);
  return (
    <div className="fish-entry-list">
      {fish.map((item) => (
        <FishingRow
          key={item.id}
          fish={item}
          catalog={context.catalog}
          now={context.now}
          fishEyes={context.fishEyes}
          caught={caught.has(item.id)}
          saved={saved.has(item.id)}
          gameManaged={context.gameCoveredIds.has(item.id)}
          gameLogActive={context.gameLogActive}
          idPrefix={idPrefix}
          onOpen={context.onOpen}
          onToggleSaved={context.onToggleSaved}
        />
      ))}
    </div>
  );
}

function NowView({
  context,
  onBrowse,
  onCollection,
}: {
  context: RowContext;
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
  const savedIds = new Set(context.progress.saved);
  const saved = context.catalog.fish.filter((fish) => savedIds.has(fish.id));
  return (
    <div className="fish-now-layout">
      <div className="fish-now-main">
        <section className="fish-task-section">
          <header className="fish-section-heading">
            <div>
              <h2>当前窗口</h2>
              <p>未记录，且已满足时间与天气条件。</p>
            </div>
            <span className="fish-count">{opportunities.open.length} 条</span>
          </header>
          {opportunities.open.length ? (
            <FishingRows
              fish={opportunities.open.slice(0, 6)}
              idPrefix="now-open"
              context={context}
            />
          ) : (
            <p className="fish-inline-empty">当前没有未记录且窗口开放的鱼。</p>
          )}
          {opportunities.open.length > 6 && (
            <button
              className="fish-text-action"
              onClick={() =>
                onBrowse(
                  { category: "timed" },
                  { completion: ["uncaught"], available: true },
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
          {opportunities.upcoming.length ? (
            <FishingRows
              fish={opportunities.upcoming.slice(0, 6)}
              idPrefix="now-next"
              context={context}
            />
          ) : (
            <p className="fish-inline-empty">
              未来一年内没有可计算的下一窗口。
            </p>
          )}
          <button
            className="fish-text-action"
            onClick={() =>
              onBrowse(
                { category: "timed", sort: "window" },
                { completion: ["uncaught"] },
              )
            }
          >
            查看所有限时鱼
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
          <p>查看各地区尚未记录的鱼。</p>
          <button className="fish-text-action" onClick={onCollection}>
            查看图鉴缺口
          </button>
        </section>
      </aside>
    </div>
  );
}

function CompletionView({
  context,
  selectedZone,
  onSelectZone,
  zoneQuery,
  onZoneQuery,
  limit,
  onMore,
}: {
  context: RowContext;
  selectedZone: string;
  onSelectZone: (zone: string) => void;
  zoneQuery: string;
  onZoneQuery: (query: string) => void;
  limit: number;
  onMore: () => void;
}) {
  const zones = useMemo(
    () =>
      fishingZones(context.catalog, context.progress).sort(
        (a, b) =>
          b.fish.length - b.caught - (a.fish.length - a.caught) ||
          a.name.localeCompare(b.name, "zh-CN"),
      ),
    [context.catalog, context.progress],
  );
  const visibleZones = zones.filter((zone) =>
    zone.name
      .toLocaleLowerCase()
      .includes(zoneQuery.trim().toLocaleLowerCase()),
  );
  const active =
    visibleZones.find((zone) => zone.name === selectedZone) ?? visibleZones[0];
  const remaining =
    active?.fish.filter((fish) => !context.progress.caught.includes(fish.id)) ??
    [];
  const caughtCount = context.catalog.fish.filter((fish) =>
    context.progress.caught.includes(fish.id),
  ).length;
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
          已记录 <strong>{caughtCount}</strong> / {context.catalog.fish.length}
        </p>
      </header>
      <div className="fish-completion-layout">
        <div className="fish-zone-index">
          <label htmlFor="fish-zone-query">按地区查看</label>
          <input
            id="fish-zone-query"
            type="search"
            value={zoneQuery}
            onChange={(event) => onZoneQuery(event.target.value)}
            placeholder="搜索地区"
          />
          <div className="fish-zone-list">
            {visibleZones.map((zone) => (
              <button
                key={zone.name}
                type="button"
                className="fish-zone-button"
                aria-pressed={zone.name === active?.name}
                onClick={() => onSelectZone(zone.name)}
              >
                <span>{zone.name}</span>
                <small>{zone.fish.length - zone.caught} 未记录</small>
              </button>
            ))}
            {!visibleZones.length && (
              <p className="fish-inline-empty">没有这个地区，请换个名称。</p>
            )}
          </div>
        </div>
        <section className="fish-zone-detail">
          <header className="fish-section-heading">
            <div>
              <h2>{active?.name ?? "地区"}</h2>
              <p>
                已记录 {active?.caught ?? 0} / {active?.fish.length ?? 0} ·
                以下是尚未记录的鱼
              </p>
            </div>
          </header>
          {remaining.length ? (
            <>
              <FishingRows
                fish={remaining.slice(0, limit)}
                idPrefix="completion"
                context={context}
              />
              {remaining.length > limit && (
                <button className="fish-text-action" onClick={onMore}>
                  再显示 {Math.min(20, remaining.length - limit)} 条
                </button>
              )}
            </>
          ) : active ? (
            <p className="fish-inline-empty">
              这个地区的鱼都已记录。可以选择其他地区继续查看。
            </p>
          ) : (
            <p className="fish-inline-empty">没有这个地区，请换个名称。</p>
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
  const [search, setSearch] = useState<FishingSearch>(initialSearch);
  const [facets, setFacets] = useState<FishingFacets>(initialFishingFacets);
  const [searchLimit, setSearchLimit] = useState(30);
  const [selectedZone, setSelectedZone] = useState("");
  const [zoneQuery, setZoneQuery] = useState("");
  const [zoneLimit, setZoneLimit] = useState(20);
  const scroll = useListDetailScroll(Boolean(vm.selected));
  const [lastTrigger, setLastTrigger] = useState<string | null>(null);
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
            ? `已读取 ${vm.gameCoveredIds.size} 条记录；${gameUnmapped} 条图鉴外鱼需手动记录。`
            : vm.gameLogStatus === "unsupported"
              ? "自动读取仅支持 Windows 桌面版。"
              : vm.gameLogStatus === "error"
                ? "当前游戏版本无法读取图鉴，请更新应用后重试。"
                : vm.gameLogStatus === "syncing"
                  ? "正在读取当前角色的图鉴…"
                  : "进入游戏角色后自动读取；当前显示本机记录。"}
        </span>
      </div>
      <button
        type="button"
        onClick={() => void vm.refreshGameLog()}
        disabled={
          vm.gameLogStatus === "syncing" || vm.gameLogStatus === "unsupported"
        }
      >
        <ArrowsClockwise aria-hidden="true" />
        重新读取
      </button>
    </div>
  );
  function changeSearch(change: Partial<FishingSearch>) {
    setSearch((current) => ({ ...current, ...change }));
    setSearchLimit(30);
  }
  function changeFacets(change: Partial<FishingFacets>) {
    setFacets((current) => ({ ...current, ...change }));
    setSearchLimit(30);
  }
  function resetLookup() {
    setSearch(initialSearch);
    setFacets(initialFishingFacets);
    setSearchLimit(30);
  }
  function browse(
    change: Partial<FishingSearch>,
    facetChange: Partial<FishingFacets> = {},
  ) {
    setSearch({ ...initialSearch, ...change });
    setFacets({ ...initialFishingFacets, ...facetChange });
    setSearchLimit(30);
    setMode("lookup");
    window.scrollTo({ top: 0 });
  }
  function openFish(fish: Fish, triggerId: string) {
    setLastTrigger(triggerId);
    scroll.captureListPosition();
    vm.setSelectedId(fish.id);
  }
  function goBack() {
    scroll.requestListPositionRestore();
    vm.setSelectedId(null);
    requestAnimationFrame(() =>
      (
        document.getElementById(lastTrigger ?? "") ??
        document.getElementById(`fish-mode-${mode}`)
      )?.focus({ preventScroll: true }),
    );
  }
  const context: RowContext | null = catalog && {
    catalog,
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
                onClick={() => {
                  setMode(item.id);
                  window.scrollTo({ top: 0 });
                }}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </nav>
          {context && mode === "now" && (
            <NowView
              context={context}
              onBrowse={browse}
              onCollection={() => setMode("completion")}
            />
          )}
          {context && mode === "completion" && (
            <CompletionView
              context={context}
              selectedZone={selectedZone}
              onSelectZone={(zone) => {
                setSelectedZone(zone);
                setZoneLimit(20);
              }}
              zoneQuery={zoneQuery}
              onZoneQuery={setZoneQuery}
              limit={zoneLimit}
              onMore={() => setZoneLimit((value) => value + 20)}
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
              时间与天气仅用于规划窗口；海钓航次、鱼识和未收录条件需在游戏中确认。
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
              ； 图标通过 XIVAPI 加载。本机标记会随“清除本地数据”一起删除。
            </p>
          </details>
        </>
      )}
    </main>
  );
}
