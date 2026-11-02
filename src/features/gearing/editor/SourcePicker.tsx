/** Searchable multi-source scope; an empty array means all sources, never an accidental empty set. */

import { gearingControlClasses, gearingHintClasses } from "../utilityClasses";
import { useMemo, useState } from "react";
import {
  findQuickSourceFilterId,
  QUICK_SOURCE_FILTERS,
  sortGearSources,
  sourceIdsForQuickFilter,
  type GearSource,
} from "./sourceOrder";

export function SourcePicker({
  sources,
  value,
  onChange,
}: {
  sources: GearSource[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const orderedSources = useMemo(() => sortGearSources(sources), [sources]);
  const activeQuickSource = findQuickSourceFilterId(orderedSources, value);
  const quickFilters = QUICK_SOURCE_FILTERS.map((filter) => ({
    ...filter,
    sourceIds: sourceIdsForQuickFilter(orderedSources, filter.id),
  })).filter((filter) => filter.sourceIds.length);
  const activeQuickSourceLabel = quickFilters.find(
    (filter) => filter.id === activeQuickSource,
  )?.label;
  const selected = value.length
    ? new Set(value)
    : new Set(orderedSources.map((source) => source.id));
  return (
    <details className="gear-source-picker">
      <summary>
        获取途径 ·{" "}
        {value.length
          ? (activeQuickSourceLabel ??
            `${orderedSources.filter((source) => selected.has(source.id)).length} 项`)
          : "全部"}
      </summary>
      <input
        className="min-h-10 w-full min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-2 text-ink pointer-coarse:min-h-11"
        aria-label="查找优化获取途径"
        placeholder="查找途径"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div
        className="gear-source-shortcuts mx-0 mt-2.5 mb-1 flex flex-wrap gap-1.5"
        aria-label="常用获取途径"
      >
        <span className="flex-[1_0_100%] text-xs text-muted">常用获取途径</span>
        {quickFilters.map((filter) => (
          <button
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-control border border-solid border-control bg-surface px-2.5 py-[5px] text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:border-accent aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected"
            key={filter.id}
            type="button"
            aria-pressed={activeQuickSource === filter.id}
            onClick={() =>
              onChange(activeQuickSource === filter.id ? [] : filter.sourceIds)
            }
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="gear-run mx-0 my-3 flex flex-wrap gap-2">
        <button
          className={gearingControlClasses.button}
          type="button"
          onClick={() => onChange([])}
        >
          全选
        </button>
        <button
          className={gearingControlClasses.button}
          type="button"
          onClick={() => onChange(["none"])}
        >
          全不选
        </button>
      </div>
      {value.some(
        (id) =>
          id !== "none" && !orderedSources.some((source) => source.id === id),
      ) && (
        <p className={gearingHintClasses}>
          有已选途径不在当前品级范围内。调整品级或点击全选可重新选择。
        </p>
      )}
      <div className="gear-source-options grid max-h-50 gap-2 overflow-y-auto">
        {!orderedSources.some((source) => source.label.includes(search)) && (
          <p className={gearingHintClasses}>
            没有匹配的获取途径，请修改搜索词。
          </p>
        )}
        {orderedSources
          .filter((source) => source.label.includes(search))
          .map((source) => (
            <label
              className="gear-check flex items-center gap-2 text-xs leading-[1.5]"
              key={source.id}
            >
              <input
                className="size-[15px] shrink-0 basis-[15px] [accent-color:var(--ors-color-accent)]"
                type="checkbox"
                checked={selected.has(source.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  next.delete("none");
                  if (e.target.checked) next.add(source.id);
                  else next.delete(source.id);
                  onChange(next.size ? [...next] : ["none"]);
                }}
              />
              {source.label}
            </label>
          ))}
      </div>
    </details>
  );
}
