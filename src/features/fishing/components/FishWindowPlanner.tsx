/** Filter future fishing windows by local dates, weekdays, and daily time. */

import { fishingControlClasses, fishingEmptyClasses } from "../utilityClasses";
import { Funnel } from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { nextWindows } from "../utils/model";
import { windowDurationText } from "../utils/presentation";
import type { Fish, FishCatalog } from "../types";
import {
  hasWindowFilters,
  initialWindowFilters,
  invalidWindowDateRange,
  parseWindowFilters,
  WINDOW_FILTERS_KEY,
  windowMatchesFilters,
  windowSearchHorizonDays,
  type WindowFilters,
} from "../utils/windowFilters";

/** Complete utility strings are shared without adding component CSS rules. */
const plannerModeButtonClasses =
  "min-h-8.5 rounded-control border border-solid border-control bg-transparent px-[9px] py-1 text-xs text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent";

/** Reused presentation strings stay static and are allocated once for this module. */
const plannerTimeCaptionClasses =
  "border-l border-solid border-line pl-[7px] text-xs text-muted";
const plannerRangeClasses = "m-0 grid min-w-0 grid-cols-2 gap-2 border-0 p-0";
const plannerInputClasses =
  "min-h-9 pointer-coarse:min-h-11 w-full min-w-0 px-[7px] text-[13px]";

const plannerErrorClasses =
  "fish-window-filter-error mx-0 mt-[9px] mb-0 text-xs leading-[1.5] text-muted";

const weekdays = [
  {
    id: 1,
    label: "周一",
  },
  {
    id: 2,
    label: "周二",
  },
  {
    id: 3,
    label: "周三",
  },
  {
    id: 4,
    label: "周四",
  },
  {
    id: 5,
    label: "周五",
  },
  {
    id: 6,
    label: "周六",
  },
  {
    id: 0,
    label: "周日",
  },
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
  status,
}: {
  fish: Fish;
  catalog: FishCatalog;
  now: number;
  fishEyes: boolean;
  onFishEyesChange: (enabled: boolean) => void;
  origin: number;
  unrestricted: boolean;
  status: ReactNode;
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
    filterPanel.current?.focus({
      preventScroll: true,
    });
    const onPointerDown = (event: PointerEvent) => {
      if (!filterAnchor.current?.contains(event.target as Node))
        setFiltersOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFiltersOpen(false);
      filterTrigger.current?.focus({
        preventScroll: true,
      });
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
    windowScroll.current?.scrollTo({
      top: 0,
    });
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
    <div className="fish-window-planner mt-0">
      <div className="fish-window-tools mb-3 grid gap-2.5">
        {/* Share the status row and popover anchor; keep Fish Eyes below on narrow screens. */}
        <div
          className="fish-window-status-row fish-window-filter-anchor relative flex items-center justify-between gap-3"
          ref={filterAnchor}
        >
          {status}
          {!unrestricted && (
            <>
              <button
                ref={filterTrigger}
                type="button"
                className="fish-window-filter-toggle inline-flex min-h-8.5 shrink-0 items-center gap-[7px] rounded-control border border-solid border-control bg-transparent px-2.5 py-[5px] text-[13px] whitespace-nowrap text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
                aria-expanded={filtersOpen}
                aria-controls={filtersOpen ? filterPanelId : undefined}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Funnel className="h-4 w-4" aria-hidden="true" />
                筛选窗口
                {invalidRange ? (
                  <span className={plannerTimeCaptionClasses}>条件有误</span>
                ) : hasWindowFilters(filters) ? (
                  <span className={plannerTimeCaptionClasses}>已筛选</span>
                ) : null}
              </button>
              {filtersOpen && (
                <div
                  id={filterPanelId}
                  className="fish-window-filters absolute top-[calc(100%_+_6px)] right-0 z-30 max-h-[min(65vh,_560px)] w-[min(480px,_calc(100vw_-_40px))] overflow-auto rounded-panel border border-solid border-line bg-surface p-4 shadow-[var(--ors-shadow-popover)]"
                  role="dialog"
                  aria-label="筛选可钓窗口"
                  tabIndex={-1}
                  ref={filterPanel}
                >
                  <div className="fish-window-filter-heading mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="m-0 text-sm font-semibold">筛选窗口</h3>
                    {hasWindowFilters(filters) && (
                      <button
                        type="button"
                        className={
                          "fish-text-action min-h-9 rounded-control border-0 border-control bg-transparent px-0 py-[5px] text-left font-semibold text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-transparent hover:underline disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
                        }
                        onClick={() => changeFilters(initialWindowFilters)}
                      >
                        清除条件
                      </button>
                    )}
                  </div>
                  <div className="fish-window-filter-fields grid grid-cols-2 gap-4 max-[680px]:grid-cols-1">
                    <fieldset className={plannerRangeClasses}>
                      <legend className="col-span-full mb-1.5 text-xs text-muted">
                        日期范围
                      </legend>
                      <label className="grid min-w-0 gap-1 text-xs text-muted">
                        从
                        <input
                          className={plannerInputClasses}
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
                      <label className="grid min-w-0 gap-1 text-xs text-muted">
                        至
                        <input
                          className={plannerInputClasses}
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
                    <fieldset className={plannerRangeClasses}>
                      <legend className="col-span-full mb-1.5 text-xs text-muted">
                        每天的本地时间
                      </legend>
                      <label className="grid min-w-0 gap-1 text-xs text-muted">
                        从
                        <input
                          className={plannerInputClasses}
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
                      <label className="grid min-w-0 gap-1 text-xs text-muted">
                        至
                        <input
                          className={plannerInputClasses}
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
                  <fieldset className="fish-window-weekdays m-0 [margin-top:12px]! min-w-0 border-0 p-0">
                    <legend className="mb-1.5 text-xs text-muted">星期</legend>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        className={plannerModeButtonClasses}
                        type="button"
                        aria-pressed={!filters.weekdays.length}
                        onClick={() =>
                          changeFilters({
                            ...filters,
                            weekdays: [],
                          })
                        }
                      >
                        全部
                      </button>
                      {weekdays.map((day) => (
                        <button
                          className={plannerModeButtonClasses}
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
                  <p className="mx-0 mt-[9px] mb-0 text-xs leading-[1.5] text-muted">
                    窗口与所选日期、星期、时段有交集时显示；跨午夜按实际日期计算。
                  </p>
                  {invalidRange && (
                    <p className={plannerErrorClasses} role="alert">
                      结束日期不能早于开始日期。
                    </p>
                  )}
                  {storageError && (
                    <p className={plannerErrorClasses} role="alert">
                      筛选条件无法保存到本机。
                    </p>
                  )}
                  <div className="fish-window-filter-footer mt-3 flex justify-end border-t border-solid border-line pt-3">
                    <button
                      className={fishingControlClasses.button}
                      type="button"
                      onClick={() => {
                        setFiltersOpen(false);
                        filterTrigger.current?.focus({
                          preventScroll: true,
                        });
                      }}
                    >
                      完成
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {canFishEyes && (
          <label className="fish-eyes-toggle flex items-center gap-2 whitespace-nowrap">
            <input
              className="h-[17px] w-[17px]"
              type="checkbox"
              checked={fishEyes}
              onChange={(event) => onFishEyesChange(event.target.checked)}
            />
            按鱼眼计算时间
          </label>
        )}
      </div>
      {unrestricted ? (
        <p>全天开放，不受天气限制。</p>
      ) : (
        <>
          {invalidRange && !filtersOpen && (
            <p
              className="fish-window-filter-error mx-0 my-2 text-[13px] text-danger"
              role="alert"
            >
              结束日期不能早于开始日期。请打开筛选窗口修改。
            </p>
          )}
          {windows.length ? (
            <div
              className="fish-window-scroll max-h-90 [scrollbar-width:thin] [scrollbar-color:var(--ors-color-control-line)_transparent] [scrollbar-gutter:stable] overflow-y-auto [padding-inline-end:14px]"
              role="region"
              aria-label="可钓窗口时间表"
              tabIndex={0}
              ref={windowScroll}
            >
              <div
                className="fish-window-head grid grid-cols-3 items-baseline gap-2.5 border-b border-solid border-line px-0 py-2.5 text-xs text-muted max-[620px]:gap-1.5 max-[620px]:text-[13px]"
                aria-hidden="true"
              >
                <span className="last:text-right">开始</span>
                <span className="last:text-right">结束</span>
                <span className="last:text-right">时长</span>
              </div>
              <ol className="fish-windows m-0 list-none p-0 tabular-nums">
                {windows.map((window) => (
                  <li
                    className="grid grid-cols-3 items-baseline gap-2.5 border-b border-solid border-line px-0 py-2.5 max-[620px]:gap-1.5 max-[620px]:text-[13px]"
                    key={window.start}
                  >
                    <strong>
                      {window.start <= now
                        ? "当前窗口"
                        : localTime(window.start)}
                    </strong>
                    <span className="text-muted">
                      至 {localTime(window.end)}
                    </span>
                    <span className="fish-window-duration text-right whitespace-nowrap text-muted max-[620px]:col-start-3">
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
            <p className={fishingEmptyClasses} role="status">
              {filters.toDate
                ? "所选日期内没有符合条件的完整窗口。"
                : `未来 ${horizonDays} 天内没有符合条件的完整窗口。`}
            </p>
          ) : null}
          {(hasMore || !filters.toDate) && !invalidRange && (
            <button
              className="fish-text-action mt-3 min-h-9 rounded-control border-0 border-control bg-transparent px-0 py-[5px] text-left font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-transparent hover:underline disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
              type="button"
              onClick={loadMore}
            >
              {hasMore ? "再显示 10 个窗口" : "继续向后查找"}
            </button>
          )}
          {(hasWindowFilters(filters) || searchDays > 365) && !invalidRange && (
            <p
              className="fish-window-progress fish-muted mx-0 mt-1 mb-0 text-[13px] text-muted"
              role="status"
            >
              已查询未来 {horizonDays} 天，找到 {windows.length} 个匹配窗口。
            </p>
          )}
        </>
      )}
    </div>
  );
}
