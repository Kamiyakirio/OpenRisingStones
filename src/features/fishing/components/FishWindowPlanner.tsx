/** Filter future fishing windows by local dates, weekdays, and daily time. */
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
    <div className="fish-window-planner mt-0">
      <div className={"fish-window-tools grid gap-[10px] mb-[12px]"}>
        {/* Share the status row and popover anchor; keep Fish Eyes below on narrow screens. */}
        <div
          className={
            "fish-window-status-row fish-window-filter-anchor relative flex items-center justify-between gap-[12px] [&_>_span]:min-w-0"
          }
          ref={filterAnchor}
        >
          {status}
          {!unrestricted && (
            <>
              <button
                ref={filterTrigger}
                type="button"
                className={
                  "fish-window-filter-toggle shrink-0 [.fishing-workspace_&]:inline-flex [.fishing-workspace_&]:items-center [.fishing-workspace_&]:gap-[7px] [.fishing-workspace_&]:min-h-[34px] [.fishing-workspace_&]:text-accent [.fishing-workspace_&]:text-[13px] [.fishing-workspace_&]:whitespace-nowrap [&_svg]:w-[16px] [&_svg]:h-[16px] [&_span]:pl-[7px] [&_span]:border-l [&_span]:border-solid [&_span]:border-line [&_span]:text-muted [&_span]:text-xs [.fishing-workspace_&&&&]:p-[5px_10px] [.fishing-workspace_&&&&]:[background:transparent]"
                }
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
                  className={
                    "fish-window-filters absolute overflow-auto p-[16px] border border-solid border-line rounded-[var(--ors-radius-panel)] bg-surface [&_fieldset]:min-w-0 [&_fieldset]:m-0 [&_fieldset]:p-0 [&_fieldset]:border-0 [&_legend]:mb-[6px] [&_legend]:text-muted [&_legend]:text-xs [&_>_p]:text-muted [&_>_p]:text-xs [&&&&]:z-[30] [&&&&]:top-[calc(100%_+_6px)] [&&&&]:right-[0] [&&&&]:w-[min(480px,_calc(100vw_-_40px))] [&&&&]:max-h-[min(65vh,_560px)] [&&&&]:shadow-[var(--ors-shadow-popover)] [&&&&_>_p]:m-[9px_0_0] [&&&&_>_p]:leading-[1.5]"
                  }
                  role="dialog"
                  aria-label="筛选可钓窗口"
                  tabIndex={-1}
                  ref={filterPanel}
                >
                  <div
                    className={
                      "fish-window-filter-heading flex items-baseline justify-between gap-[12px] [&_h3]:text-sm [.fishing-workspace_&_button]:min-h-0 [.fishing-workspace_&_button]:p-0 [.fishing-workspace_&_button]:border-0 [.fishing-workspace_&_button]:text-accent [&&&&_h3]:m-[0_0_12px] [.fishing-workspace_&&&&_button]:[background:transparent]"
                    }
                  >
                    <h3 className="text-base font-semibold">筛选窗口</h3>
                    {hasWindowFilters(filters) && (
                      <button
                        type="button"
                        className={
                          "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
                        }
                        onClick={() => changeFilters(initialWindowFilters)}
                      >
                        清除条件
                      </button>
                    )}
                  </div>
                  <div
                    className={
                      "fish-window-filter-fields grid gap-[16px] [&_fieldset]:grid [&_fieldset]:gap-[8px] [&_label]:grid [&_label]:min-w-0 [&_label]:gap-[4px] [&_label]:text-muted [&_label]:text-xs [&_input]:w-full [&_input]:min-w-0 [&_input]:px-[7px] [&_input]:text-[13px] [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&&&_fieldset]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&&&_legend]:[grid-column:1_/_-1] [@media(max-width:_680px)]:[&&&&]:grid-cols-[minmax(0,_1fr)]"
                    }
                  >
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
                  <fieldset
                    className={
                      "fish-window-weekdays [&_>_div]:flex [&_>_div]:flex-wrap [&_>_div]:gap-[6px] [.fishing-workspace_&_button]:min-h-[34px] [.fishing-workspace_&_button]:text-xs [&&&&]:[margin-top:12px]! [.fishing-workspace_&&&&_button]:p-[4px_9px] [.fishing-workspace_&&&&_button]:[background:transparent]"
                    }
                  >
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
                    <p
                      className={
                        "fish-window-filter-error text-danger text-[13px] [&&&&]:m-[8px_0]"
                      }
                      role="alert"
                    >
                      结束日期不能早于开始日期。
                    </p>
                  )}
                  {storageError && (
                    <p
                      className={
                        "fish-window-filter-error text-danger text-[13px] [&&&&]:m-[8px_0]"
                      }
                      role="alert"
                    >
                      筛选条件无法保存到本机。
                    </p>
                  )}
                  <div className="fish-window-filter-footer flex justify-end mt-[12px] pt-[12px] border-t border-solid border-line">
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
            </>
          )}
        </div>
        {canFishEyes && (
          <label className="fish-eyes-toggle flex items-center gap-[8px] [&_input]:w-[17px] [&_input]:h-[17px] [.fish-window-tools_&]:whitespace-nowrap">
            <input
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
              className={
                "fish-window-filter-error text-danger text-[13px] [&&&&]:m-[8px_0]"
              }
              role="alert"
            >
              结束日期不能早于开始日期。请打开筛选窗口修改。
            </p>
          )}
          {windows.length ? (
            <div
              className={
                "fish-window-scroll max-h-[360px] overflow-y-auto [&&&&]:[scrollbar-gutter:stable] [&&&&]:[scrollbar-width:thin] [&&&&]:[scrollbar-color:var(--ors-color-control-line)_transparent] [&&&&]:[padding-inline-end:14px]"
              }
              role="region"
              aria-label="可钓窗口时间表"
              tabIndex={0}
              ref={windowScroll}
            >
              <div
                className={
                  "fish-window-head grid items-baseline gap-[10px] border-b border-solid border-line text-muted text-xs [&_span:last-child]:text-right max-[620px]:gap-[6px] max-[620px]:text-[13px] [&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&&&]:p-[10px_0]"
                }
                aria-hidden="true"
              >
                <span>开始</span>
                <span>结束</span>
                <span>时长</span>
              </div>
              <ol
                className={
                  "fish-windows m-0 p-0 tabular-nums [&_li]:grid [&_li]:items-baseline [&_li]:gap-[10px] [&_li]:border-b [&_li]:border-solid [&_li]:border-line [&_span]:text-muted max-[620px]:[&_li]:gap-[6px] max-[620px]:[&_li]:text-[13px] [&&&&]:[list-style:none] [&&&&_li]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&&&_li]:p-[10px_0]"
                }
              >
                {windows.map((window) => (
                  <li key={window.start}>
                    <strong>
                      {window.start <= now
                        ? "当前窗口"
                        : localTime(window.start)}
                    </strong>
                    <span>至 {localTime(window.end)}</span>
                    <span
                      className={
                        "fish-window-duration text-right whitespace-nowrap [@media(max-width:_620px)]:[&&&&]:[grid-column:3]"
                      }
                    >
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
            <p
              className={
                "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
              }
              role="status"
            >
              {filters.toDate
                ? "所选日期内没有符合条件的完整窗口。"
                : `未来 ${horizonDays} 天内没有符合条件的完整窗口。`}
            </p>
          ) : null}
          {(hasMore || !filters.toDate) && !invalidRange && (
            <button
              className={
                "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
              }
              type="button"
              onClick={loadMore}
            >
              {hasMore ? "再显示 10 个窗口" : "继续向后查找"}
            </button>
          )}
          {(hasWindowFilters(filters) || searchDays > 365) && !invalidRange && (
            <p
              className={
                "fish-window-progress fish-muted text-[13px] text-muted [.fish-forecast_>_div_>_&]:text-[13px] [.fish-forecast_>_div_>_&]:tabular-nums [&&&&]:m-[4px_0_0]"
              }
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
