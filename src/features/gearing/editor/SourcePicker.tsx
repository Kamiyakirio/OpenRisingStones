/** Searchable multi-source scope; an empty array means all sources, never an accidental empty set. */
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
        aria-label="查找优化获取途径"
        placeholder="查找途径"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="gear-source-shortcuts" aria-label="常用获取途径">
        <span>常用获取途径</span>
        {quickFilters.map((filter) => (
          <button
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
      <div className="gear-run">
        <button type="button" onClick={() => onChange([])}>
          全选
        </button>
        <button type="button" onClick={() => onChange(["none"])}>
          全不选
        </button>
      </div>
      {value.some(
        (id) =>
          id !== "none" && !orderedSources.some((source) => source.id === id),
      ) && (
        <p className="gear-muted">
          有已选途径不在当前品级范围内。调整品级或点击全选可重新选择。
        </p>
      )}
      <div className="gear-source-options">
        {!orderedSources.some((source) => source.label.includes(search)) && (
          <p className="gear-muted">没有匹配的获取途径，请修改搜索词。</p>
        )}
        {orderedSources
          .filter((source) => source.label.includes(search))
          .map((source) => (
            <label className="gear-check" key={source.id}>
              <input
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
