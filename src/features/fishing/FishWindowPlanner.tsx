/** Filter future fishing windows by local dates, weekdays, and daily time. */
import { Funnel } from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { nextWindows } from "./model";
import { windowDurationText } from "./presentation";
import type { Fish, FishCatalog } from "./types";
import {
  hasWindowFilters,
  initialWindowFilters,
  invalidWindowDateRange,
  parseWindowFilters,
  WINDOW_FILTERS_KEY,
  windowMatchesFilters,
  windowSearchHorizonDays,
  type WindowFilters,
} from "./windowFilters";

const weekdays = [
  { id: 1, label: "周一" },
  { id: 2, label: "周二" },
  { id: 3, label: "周三" },
  { id: 4, label: "周四" },
  { id: 5, label: "周五" },
  { id: 6, label: "周六" },
  { id: 0, label: "周日" },
];
const localTime = (time: number) =>
  new Date(time).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export function FishWindowPlanner({
  fish,
  catalog,
  now,
  fishEyes,
  onFishEyesChange,
  origin,
  unrestricted,
}: {
  fish: Fish;
  catalog: FishCatalog;
  now: number;
  fishEyes: boolean;
  onFishEyesChange: (enabled: boolean) => void;
  origin: number;
  unrestricted: boolean;
}) {
  const [filters, setFilters] = useState<WindowFilters>(() => {
    try {
      return parseWindowFilters(localStorage.getItem(WINDOW_FILTERS_KEY));
    } catch {
      return initialWindowFilters;
    }
  });
  const [storageError, setStorageError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [windowCount, setWindowCount] = useState(10);
  const [searchDays, setSearchDays] = useState(365);
  const filterPanelId = useId();
  const filterAnchor = useRef<HTMLDivElement>(null);
  const filterPanel = useRef<HTMLDivElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const windowScroll = useRef<HTMLDivElement>(null);
  const pendingMore = useRef<number | null>(null);
  const canFishEyes =
    fish.method === "rod" && fish.conditions?.fishEyes === true;
  const invalidRange = invalidWindowDateRange(filters);
  const horizonDays = windowSearchHorizonDays(origin, searchDays, filters);
  const matches = useMemo(
    () =>
      invalidRange || unrestricted
        ? []
        : nextWindows(
            fish,
            catalog,
            origin,
            windowCount + 1,
            fishEyes,
            horizonDays,
            (window) => windowMatchesFilters(window, filters),
          ),
    [
      fish,
      catalog,
      origin,
      windowCount,
      fishEyes,
      horizonDays,
      filters,
      invalidRange,
      unrestricted,
    ],
  );
  const windows = matches.slice(0, windowCount);
  const hasMore = matches.length > windowCount;

  useEffect(() => {
    if (!filtersOpen) return;
    filterPanel.current?.focus({ preventScroll: true });
    const onPointerDown = (event: PointerEvent) => {
      if (!filterAnchor.current?.contains(event.target as Node))
        setFiltersOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFiltersOpen(false);
      filterTrigger.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [filtersOpen]);

  /** Reveal new rows only after a deliberate request to extend the results. */
  useLayoutEffect(() => {
    const firstNewIndex = pendingMore.current;
    if (firstNewIndex === null) return;
    pendingMore.current = null;
    const viewport = windowScroll.current;
    const firstNew = viewport?.querySelectorAll("li")[firstNewIndex];
    if (!viewport || !firstNew) return;
    viewport.scrollTo({
      top:
        viewport.scrollTop +
        firstNew.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top,
      behavior: "instant",
    });
  }, [windows.length, searchDays, windowCount]);

  function changeFilters(next: WindowFilters) {
    setFilters(next);
    setWindowCount(10);
    setSearchDays(365);
    pendingMore.current = null;
    windowScroll.current?.scrollTo({ top: 0 });
    try {
      localStorage.setItem(WINDOW_FILTERS_KEY, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  function toggleWeekday(day: number) {
    changeFilters({
      ...filters,
      weekdays: filters.weekdays.includes(day)
        ? filters.weekdays.filter((item) => item !== day)
        : [...filters.weekdays, day].sort((a, b) => a - b),
    });
  }
  function loadMore() {
    pendingMore.current = windows.length;
    if (hasMore) setWindowCount((count) => count + 10);
    else setSearchDays((days) => days + 365);
  }

  return (
    <div className="fish-window-planner">
      {(canFishEyes || !unrestricted) && (
        <div className="fish-window-tools">
          {canFishEyes && (
            <label className="fish-eyes-toggle">
              <input
                type="checkbox"
                checked={fishEyes}
                onChange={(event) => onFishEyesChange(event.target.checked)}
              />
              按鱼眼计算时间
            </label>
          )}
          {!unrestricted && (
            <div className="fish-window-filter-anchor" ref={filterAnchor}>
              <button
                ref={filterTrigger}
                type="button"
                className="fish-window-filter-toggle"
                aria-expanded={filtersOpen}
                aria-controls={filtersOpen ? filterPanelId : undefined}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Funnel aria-hidden="true" />
                筛选窗口
                {invalidRange ? (
                  <span>条件有误</span>
                ) : hasWindowFilters(filters) ? (
                  <span>已筛选</span>
                ) : null}
              </button>
              {filtersOpen && (
                <div
                  id={filterPanelId}
                  className="fish-window-filters"
                  role="dialog"
                  aria-label="筛选可钓窗口"
                  tabIndex={-1}
                  ref={filterPanel}
                >
                  <div className="fish-window-filter-heading">
                    <h3>筛选窗口</h3>
                    {hasWindowFilters(filters) && (
                      <button
                        type="button"
                        className="fish-text-action"
                        onClick={() => changeFilters(initialWindowFilters)}
                      >
                        清除条件
                      </button>
                    )}
                  </div>
                  <div className="fish-window-filter-fields">
                    <fieldset>
                      <legend>日期范围</legend>
                      <label>
                        从
                        <input
                          type="date"
                          aria-label="开始日期"
                          value={filters.fromDate}
                          onChange={(event) =>
                            changeFilters({
                              ...filters,
                              fromDate: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        至
                        <input
                          type="date"
                          aria-label="结束日期"
                          value={filters.toDate}
                          onChange={(event) =>
                            changeFilters({
                              ...filters,
                              toDate: event.target.value,
                            })
                          }
                        />
                      </label>
                    </fieldset>
                    <fieldset>
                      <legend>每天的本地时间</legend>
                      <label>
                        从
                        <input
                          type="time"
                          aria-label="开始时间"
                          value={filters.fromTime}
                          onChange={(event) =>
                            changeFilters({
                              ...filters,
                              fromTime: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        至
                        <input
                          type="time"
                          aria-label="结束时间"
                          value={filters.toTime}
                          onChange={(event) =>
                            changeFilters({
                              ...filters,
                              toTime: event.target.value,
                            })
                          }
                        />
                      </label>
                    </fieldset>
                  </div>
                  <fieldset className="fish-window-weekdays">
                    <legend>星期</legend>
                    <div>
                      <button
                        type="button"
                        aria-pressed={!filters.weekdays.length}
                        onClick={() =>
                          changeFilters({ ...filters, weekdays: [] })
                        }
                      >
                        全部
                      </button>
                      {weekdays.map((day) => (
                        <button
                          key={day.id}
                          type="button"
                          aria-pressed={filters.weekdays.includes(day.id)}
                          onClick={() => toggleWeekday(day.id)}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <p>
                    窗口与所选日期、星期、时段有交集时显示；跨午夜按实际日期计算。
                  </p>
                  {invalidRange && (
                    <p className="fish-window-filter-error" role="alert">
                      结束日期不能早于开始日期。
                    </p>
                  )}
                  {storageError && (
                    <p className="fish-window-filter-error" role="alert">
                      筛选条件无法保存到本机。
                    </p>
                  )}
                  <div className="fish-window-filter-footer">
                    <button
                      type="button"
                      onClick={() => {
                        setFiltersOpen(false);
                        filterTrigger.current?.focus({ preventScroll: true });
                      }}
                    >
                      完成
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {unrestricted ? (
        <p>全天开放，不受天气限制。</p>
      ) : (
        <>
          {invalidRange && !filtersOpen && (
            <p className="fish-window-filter-error" role="alert">
              结束日期不能早于开始日期。请打开筛选窗口修改。
            </p>
          )}
          {windows.length ? (
            <div
              className="fish-window-scroll"
              role="region"
              aria-label="可钓窗口时间表"
              tabIndex={0}
              ref={windowScroll}
            >
              <div className="fish-window-head" aria-hidden="true">
                <span>开始</span>
                <span>结束</span>
                <span>时长</span>
              </div>
              <ol className="fish-windows">
                {windows.map((window) => (
                  <li key={window.start}>
                    <strong>
                      {window.start <= now
                        ? "当前窗口"
                        : localTime(window.start)}
                    </strong>
                    <span>至 {localTime(window.end)}</span>
                    <span className="fish-window-duration">
                      {window.start <= now && "剩余 "}
                      {windowDurationText(
                        window.end - Math.max(window.start, now),
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : !invalidRange ? (
            <p className="fish-inline-empty" role="status">
              {filters.toDate
                ? "所选日期内没有符合条件的完整窗口。"
                : `未来 ${horizonDays} 天内没有符合条件的完整窗口。`}
            </p>
          ) : null}
          {(hasMore || !filters.toDate) && !invalidRange && (
            <button
              className="fish-text-action"
              type="button"
              onClick={loadMore}
            >
              {hasMore ? "再显示 10 个窗口" : "继续向后查找"}
            </button>
          )}
          {(hasWindowFilters(filters) || searchDays > 365) && !invalidRange && (
            <p className="fish-window-progress fish-muted" role="status">
              已查询未来 {horizonDays} 天，找到 {windows.length} 个匹配窗口。
            </p>
          )}
        </>
      )}
    </div>
  );
}
