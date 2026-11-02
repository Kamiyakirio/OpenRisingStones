/** Slot-local browsing filters never change the optimizer's independently stored scope. */
import clsx from "clsx";
import {
  gearingControlClasses,
  gearingScreenReaderClasses,
} from "../utilityClasses";
import {
  MagnifyingGlass,
  Check,
  FadersHorizontal,
} from "@phosphor-icons/react";
import type { GearingViewModel } from "./ViewModel";
import type { EditorState } from "./Editor";
import type { Stat, Slot } from "./types";
import { ItemIcon } from "./ItemIcon";
import { ItemStats } from "./ItemStats";
import { ItemName } from "./ItemName";
import {
  findQuickSourceFilterId,
  QUICK_SOURCE_FILTERS,
  sortGearSources,
  sourceIdsForQuickFilter,
  type QuickSourceFilterId,
} from "./sourceOrder";
import { foodUsage } from "./foodUsage";
import { candidateStats } from "./candidateStats";
import { PreviewActions } from "./PreviewActions";
import { useEffect, useRef } from "react";

/** Complete utility strings are shared without adding component CSS rules. */
const candidateRangeInputClasses =
  "h-10 min-h-10 w-17 min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-0 text-ink";
const candidateFilterSelectClasses =
  "h-10 min-h-10 min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-0 text-ink";
const candidateHeadingCellClasses =
  "sticky top-0 z-2 border-b border-b-line bg-surface px-2.5 py-3 text-right text-[13px] font-normal whitespace-nowrap text-muted first:text-left";
const candidateValueCellClasses =
  "border-b border-b-line px-2.5 py-3 text-right whitespace-nowrap first:text-left first:text-accent";

export function Candidates({
  vm,
  state,
  title,
  optimizeScope,
  visible = true,
  onBack,
  onApply,
}: {
  vm: GearingViewModel;
  state: EditorState;
  title: string;
  optimizeScope: boolean;
  /** The caller owns which editing panel is visible. */
  visible?: boolean;
  onBack: () => void;
  onApply: () => void;
}) {
  const { data, document: doc, query } = state;
  const table = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Paging or changing scope starts at the first result, never halfway through a new list.
    if (table.current) table.current.scrollTop = 0;
  }, [query]);
  if (!data || !doc) return null;
  const job = data.jobs.find((j) => j.id === doc.job)!;
  const consumable = state.selection === "food" || state.selection === "potion";
  const stats = consumable
    ? ([
        ...new Set(state.items.flatMap((item) => Object.keys(item.stats))),
      ] as Stat[])
    : candidateStats(job.stats);
  const sourceMap = new Map(data.sources.map((s) => [s.id, s.label]));
  const orderedAvailableSources = sortGearSources(
    data.sources.filter((source) =>
      state.availableSourceIds.includes(source.id),
    ),
  );
  const activeQuickSource = findQuickSourceFilterId(
    data.sources,
    query.sourceIds,
  );
  const activeQuickSourceLabel = QUICK_SOURCE_FILTERS.find(
    (filter) => filter.id === activeQuickSource,
  )?.label;
  const sourceSelectValue = activeQuickSource
    ? `quick:${activeQuickSource}`
    : query.sourceIds.length === 1
      ? query.sourceIds[0]
      : query.sourceIds.length
        ? "custom"
        : "";
  const equipped =
    doc.equipment[state.selection as Slot]?.itemId ??
    (state.selection === "food"
      ? doc.foodId
      : state.selection === "potion"
        ? doc.potionId
        : null);
  return (
    <section
      className={clsx(
        "gear-candidates min-w-0 flex-col bg-surface min-[768px]:min-h-0 min-[1200px]:group-data-[compact=candidates]/gear-columns:min-h-0 min-[1200px]:group-data-[compact=candidates]/gear-columns:overflow-y-auto",
        visible ? "flex" : "hidden",
      )}
      aria-label={`${title}候选装备`}
    >
      <div className="gear-section-heading flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-solid border-line bg-tool-soft px-3 py-2.5 text-tool min-[768px]:shrink-0 min-[1200px]:shrink-0">
        <button
          className="gear-back inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-control bg-surface px-3 py-2 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
          onClick={onBack}
        >
          {optimizeScope ? "返回优化" : "返回配装"}
        </button>
        <label className={gearingControlClasses.label}>
          部位
          <select
            className={gearingControlClasses.select}
            aria-label="选择部位"
            value={state.selection}
            onChange={(event) =>
              vm.select(event.target.value as typeof state.selection)
            }
          >
            {job.slots.map((slot) => (
              <option key={slot.key} value={slot.key}>
                {slot.name}
              </option>
            ))}
          </select>
        </label>
        <h2 className="gear-sr-only absolute h-px w-px overflow-hidden text-lg font-semibold whitespace-nowrap [clip-path:inset(50%)]">
          {title}
        </h2>
        <span className="text-xs text-muted">
          {state.querying ? "正在查询…" : `${state.total} 件`}
        </span>
      </div>
      {/* Align equipment context and filter feedback with the candidate toolbar. */}
      <div className="gear-current-item flex flex-wrap items-center gap-3 border-b border-line p-3 min-[1200px]:shrink-0">
        <span className="flex-[1_1_180px] [overflow-wrap:anywhere]">
          当前：
          <strong>
            {state.evaluation?.slots[state.selection] ? (
              <ItemName
                item={state.evaluation.slots[state.selection]!.item}
                sources={data.sources}
              />
            ) : (
              "尚未装备"
            )}
          </strong>
        </span>
        {equipped && (
          <button
            className={gearingControlClasses.button}
            onClick={() => vm.remove()}
          >
            移除
          </button>
        )}
        <button
          className={gearingControlClasses.button}
          disabled={job.slots.at(-1)?.key === state.selection}
          onClick={() => {
            const next =
              job.slots[
                job.slots.findIndex((slot) => slot.key === state.selection) + 1
              ];
            if (next) vm.select(next.key);
          }}
        >
          下一部位
        </button>
        <ItemStats
          item={state.evaluation?.slots[state.selection]}
          data={data}
          busy={state.evaluating}
          label="当前装备生效属性"
          layout="current-item"
        />
      </div>
      <div className="gear-candidate-filters relative grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-2 border-b border-solid border-line p-3 text-xs min-[768px]:shrink-0 min-[1200px]:shrink-0">
        <label className="gear-search relative flex items-center gap-2">
          <MagnifyingGlass className="absolute left-[9px] h-4.5 w-4.5 shrink-0 text-muted" />
          <span className={gearingScreenReaderClasses}>搜索装备名称</span>
          <input
            className="min-h-10 w-full min-w-0 rounded-control border border-solid border-control bg-surface py-2 pr-3 [padding-left:34px]! text-ink pointer-coarse:min-h-11"
            placeholder="搜索装备名称"
            value={query.search}
            onChange={(e) =>
              vm.filter({
                search: e.target.value,
              })
            }
          />
        </label>
        <details className="gear-filter-details group/gear-filter-details m-0 open:col-span-full max-[767px]:open:col-span-full">
          <summary className="flex min-h-10 list-none items-center gap-[7px] rounded-control border border-solid border-control px-[11px] py-[7px] text-ink group-open/gear-filter-details:bg-selected group-open/gear-filter-details:text-accent [&::-webkit-details-marker]:hidden">
            <FadersHorizontal
              className={gearingControlClasses.icon}
              aria-hidden="true"
            />
            筛选
          </summary>
          <div className="gear-filter-options static mt-2 flex w-full flex-wrap items-center gap-2 rounded-panel border border-solid border-line bg-surface p-3.5 max-[767px]:static max-[767px]:mt-2 max-[767px]:flex max-[767px]:w-full max-[767px]:flex-wrap max-[767px]:shadow-[none]">
            <label className="flex min-h-10 items-center gap-2">
              品级
              <input
                className={candidateRangeInputClasses}
                type="number"
                aria-label="浏览最低品级"
                value={query.minLevel || ""}
                placeholder="不限"
                min={0}
                max={9999}
                onChange={(e) =>
                  vm.filter({
                    minLevel: Number(e.target.value),
                  })
                }
              />
            </label>
            <span>至</span>
            <input
              className={candidateRangeInputClasses}
              type="number"
              aria-label="浏览最高品级"
              value={query.maxLevel === 9999 ? "" : query.maxLevel}
              placeholder="不限"
              min={0}
              max={9999}
              onChange={(e) =>
                vm.filter({
                  maxLevel: e.target.value ? Number(e.target.value) : 9999,
                })
              }
            />
            <label className="gear-candidate-source flex min-h-10 min-w-30 flex-1 items-center gap-2 max-[767px]:flex-[1_1_100%]">
              <span className={gearingScreenReaderClasses}>浏览获取途径</span>
              <select
                className="h-10 min-h-10 w-full min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-0 text-ink"
                value={sourceSelectValue}
                onChange={(event) => {
                  const value = event.target.value;
                  vm.filter({
                    sourceIds: value.startsWith("quick:")
                      ? sourceIdsForQuickFilter(
                          data.sources,
                          value.slice("quick:".length) as QuickSourceFilterId,
                        )
                      : value && value !== "custom"
                        ? [value]
                        : [],
                  });
                }}
              >
                <option value="">全部获取途径</option>
                {query.sourceIds.length > 1 && !activeQuickSource && (
                  <option value="custom" disabled>
                    已选择多个获取途径
                  </option>
                )}
                <optgroup label="常用获取途径">
                  {QUICK_SOURCE_FILTERS.map((filter) => (
                    <option
                      key={filter.id}
                      value={`quick:${filter.id}`}
                      disabled={
                        sourceIdsForQuickFilter(
                          orderedAvailableSources,
                          filter.id,
                        ).length === 0
                      }
                    >
                      {filter.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="全部来源">
                  {!activeQuickSource &&
                    query.sourceIds
                      .filter((id) => !state.availableSourceIds.includes(id))
                      .map((id) => (
                        <option key={id} value={id} disabled>
                          {sourceMap.get(id)}（无匹配）
                        </option>
                      ))}
                  {orderedAvailableSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="flex min-h-10 items-center gap-2">
              <span className={gearingScreenReaderClasses}>候选排序</span>
              <select
                className={candidateFilterSelectClasses}
                value={query.sortStat}
                onChange={(e) =>
                  vm.filter({
                    sortStat: e.target.value as Stat | "",
                  })
                }
              >
                <option value="">品级排序</option>
                {job.stats.map((s) => (
                  <option key={s} value={s}>
                    {data.statNames[s]}排序
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-10 items-center gap-2">
              顺序
              <select
                className={candidateFilterSelectClasses}
                aria-label="排序方向"
                value={query.sortDirection ?? "desc"}
                onChange={(event) =>
                  vm.filter({
                    sortDirection: event.target.value as "asc" | "desc",
                  })
                }
              >
                <option value="desc">降序（从高到低）</option>
                <option value="asc">升序（从低到高）</option>
              </select>
            </label>
            <label className="gear-check flex min-h-10 items-center gap-2 text-xs leading-[1.5]">
              <input
                className="h-[15px] w-[15px] [accent-color:var(--ors-color-accent)]"
                type="checkbox"
                checked={query.hideObsolete}
                onChange={(e) =>
                  vm.filter({
                    hideObsolete: e.target.checked,
                  })
                }
              />
              隐藏过时装备
            </label>
          </div>
        </details>
      </div>
      <div className="gear-filter-summary flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px] text-muted min-[1200px]:shrink-0">
        <span className="flex-[1_1_180px] [overflow-wrap:anywhere]">
          {query.minLevel === 0 && query.maxLevel === 9999
            ? "不限品级"
            : query.maxLevel === 9999
              ? `i${query.minLevel} 及以上`
              : query.minLevel === 0
                ? `i${query.maxLevel} 及以下`
                : `i${query.minLevel}–${query.maxLevel}`}
          {query.hideObsolete ? " · 隐藏过时装备" : ""}
          {` · ${query.sortStat ? data.statNames[query.sortStat] : "品级"}${query.sortDirection === "asc" ? "升序" : "降序"}`}
          {query.sourceIds.length
            ? ` · ${activeQuickSourceLabel ?? query.sourceIds.map((id) => sourceMap.get(id)).join("、")}`
            : ""}
        </span>
        <button
          className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-control border-0 border-control bg-transparent px-3 py-2 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent"
          onClick={() => vm.resetFilters()}
        >
          清除搜索和筛选
        </button>
      </div>
      {!!query.sourceIds.length &&
        !state.querying &&
        query.sourceIds.every(
          (id) => !state.availableSourceIds.includes(id),
        ) && (
          <p
            className="gear-muted gear-source-reset text-xs leading-[1.7] text-muted min-[1200px]:shrink-0"
            role="status"
          >
            已选获取途径没有匹配。可以调整条件或清除获取途径筛选。
            <button
              className={gearingControlClasses.button}
              onClick={() =>
                vm.filter({
                  sourceIds: [],
                })
              }
            >
              清除获取途径
            </button>
          </p>
        )}
      <PreviewActions
        vm={vm}
        state={state}
        onApply={onApply}
        layout="candidates"
      />
      {/* Keep result space stable while the current-item and preview controls grow. */}
      <div
        ref={table}
        className="gear-candidate-table max-h-[max(320px,_50dvh)] min-h-80 overflow-auto min-[1200px]:group-data-[compact=candidates]/gear-columns:h-[clamp(480px,_60dvh,_880px)] min-[1200px]:group-data-[compact=candidates]/gear-columns:max-h-none min-[1200px]:group-data-[compact=candidates]/gear-columns:shrink-0 min-[1200px]:group-data-[compact=candidates]/gear-columns:grow min-[1200px]:group-data-[compact=candidates]/gear-columns:[scrollbar-gutter:stable]"
        tabIndex={0}
        role="region"
        aria-label="候选装备列表"
        aria-busy={state.querying}
      >
        <table className="w-full [border-collapse:separate] [border-spacing:0] tabular-nums max-[767px]:min-w-130">
          <thead>
            <tr>
              {optimizeScope && (
                <th className={candidateHeadingCellClasses}>参与</th>
              )}
              <th className="gear-name-column sticky top-0 z-2 border-b border-b-line bg-surface py-3 pr-2.5 pl-2.5 text-left text-[13px] font-normal whitespace-nowrap text-muted first:text-left">
                {consumable ? "消耗品" : "装备"}
              </th>
              {stats.map((s) => (
                <th className={candidateHeadingCellClasses} key={s}>
                  {data.statNames[s]}
                </th>
              ))}
              <th
                className={candidateHeadingCellClasses}
                title={
                  consumable
                    ? "当前配装的实际加成总和 ÷ 加成上限总和"
                    : undefined
                }
              >
                {consumable ? "利用率" : "魔晶石"}
              </th>
            </tr>
          </thead>
          <tbody>
            {state.items.map((item) => {
              const usage =
                consumable && state.evaluation
                  ? foodUsage(item, state.evaluation)
                  : null;
              return (
                <tr
                  key={item.id}
                  className={
                    state.preview?.id === item.id
                      ? "is-preview bg-selected"
                      : item.id === equipped
                        ? "is-equipped"
                        : ""
                  }
                >
                  {optimizeScope && (
                    <td className={candidateValueCellClasses}>
                      <input
                        className="h-4 w-4"
                        type="checkbox"
                        aria-label={`${item.name}参与优化`}
                        checked={
                          !state.conditions.excludedItemIds.includes(item.id)
                        }
                        onChange={(e) =>
                          vm.setConditions({
                            excludedItemIds: e.target.checked
                              ? state.conditions.excludedItemIds.filter(
                                  (id) => id !== item.id,
                                )
                              : [...state.conditions.excludedItemIds, item.id],
                          })
                        }
                      />
                    </td>
                  )}
                  <td className="gear-name-column border-b border-b-line px-2.5 py-3 text-left whitespace-nowrap first:text-left first:text-accent">
                    <button
                      className="gear-candidate-name grid min-h-10 w-full min-w-52.5 grid-cols-[40px_minmax(155px,_1fr)] items-center justify-center gap-3 rounded-control border-0 border-control bg-transparent px-0 py-0.5 text-left whitespace-normal text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent pointer-coarse:min-h-11"
                      aria-pressed={state.preview?.id === item.id}
                      disabled={state.querying || item.id === equipped}
                      onClick={() => void vm.preview(item)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          state.preview?.id === item.id &&
                          state.previewEvaluation
                        ) {
                          event.preventDefault();
                          onApply();
                        }
                      }}
                    >
                      <ItemIcon item={item} />
                      <span className="gear-candidate-copy">
                        <span className="first:block first:leading-[1.65] first:[overflow-wrap:anywhere]">
                          {item.id === equipped && (
                            <Check
                              className="mr-1 h-[13px] w-[13px] shrink-0 [vertical-align:middle]"
                              aria-label="当前装备"
                            />
                          )}
                          <ItemName item={item} sources={data.sources} />
                          {item.hq && (
                            <small className="gear-hq ml-1.5 inline-block [vertical-align:1px] text-[0.65rem] font-medium text-muted">
                              HQ
                            </small>
                          )}
                        </span>
                        <span className="gear-item-description mt-[3px] block text-[0.7rem] leading-[1.6] text-muted first:block first:leading-[1.65] first:[overflow-wrap:anywhere]">
                          i{item.level} ·{" "}
                          {item.sourceId
                            ? sourceMap.get(item.sourceId)
                            : item.kind === "equipment"
                              ? "其他来源"
                              : "消耗品"}
                        </span>
                      </span>
                    </button>
                  </td>
                  {stats.map((s) => (
                    <td className={candidateValueCellClasses} key={s}>
                      {consumable && item.stats[s] !== undefined ? (
                        <span title={`实际加成，上限 ${item.stats[s]}`}>
                          {state.evaluating ? "…" : (usage?.actual[s] ?? "—")}
                        </span>
                      ) : (
                        (item.stats[s] ?? "—")
                      )}
                    </td>
                  ))}
                  <td className={candidateValueCellClasses}>
                    {consumable ? (
                      <span
                        className="gear-food-utilization"
                        title="当前配装的实际加成总和 ÷ 加成上限总和"
                      >
                        {state.evaluating || !usage
                          ? "—"
                          : `${usage.utilization.toFixed(1)}%`}
                      </span>
                    ) : (
                      <span
                        className="gear-candidate-melds grid grid-cols-[repeat(5,_8px)] gap-1"
                        aria-label={`${item.materiaSlot ?? 0} 个保证孔${item.materiaAdvanced ? "，支持禁断" : ""}`}
                      >
                        {Array.from(
                          {
                            length: 5,
                          },
                          (_, i) => (
                            <span
                              key={i}
                              className={clsx(
                                "h-2 w-2 rounded-[50%] border border-solid border-control",
                                i >= (item.materiaSlot ?? 0)
                                  ? "is-advanced [border-style:dashed]"
                                  : "",
                                i >=
                                  (item.materiaAdvanced
                                    ? 5
                                    : (item.materiaSlot ?? 0))
                                  ? "is-absent [visibility:hidden]"
                                  : "",
                              )}
                            />
                          ),
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!state.items.length && !state.querying && (
          <p className="gear-empty px-4 py-8 leading-[1.8] text-muted">
            {query.minLevel > query.maxLevel
              ? "最低品级不能高于最高品级。"
              : "没有匹配的装备。修改名称或筛选条件。"}
          </p>
        )}
      </div>
      <div className="gear-pagination [margin-top:auto] flex items-center justify-between gap-2 p-3 text-xs min-[768px]:shrink-0 min-[1200px]:shrink-0">
        <button
          className={gearingControlClasses.button}
          disabled={query.offset === 0 || state.querying}
          onClick={() =>
            vm.filter({
              offset: Math.max(0, query.offset - query.limit),
            })
          }
        >
          上一页
        </button>
        <span>
          {state.total
            ? `${query.offset + 1}–${Math.min(query.offset + query.limit, state.total)}`
            : "0"}{" "}
          / {state.total}
        </span>
        <button
          className={gearingControlClasses.button}
          disabled={query.offset + query.limit >= state.total || state.querying}
          onClick={() =>
            vm.filter({
              offset: query.offset + query.limit,
            })
          }
        >
          下一页
        </button>
      </div>
    </section>
  );
}
