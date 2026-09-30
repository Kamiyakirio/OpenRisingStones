/** Search the full catalog with the persisted fishing filters. */
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo } from "react";
import { FishFilters } from "./FishFilters";
import { FishingRows, type RowContext } from "./FishingRows";
import {
  searchFishingCatalog,
  type FishingCategory,
  type FishingSearch,
} from "./workspace";
import type { FishFilters as FishingFacets } from "./types";

const categoryOptions: { id: FishingCategory | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "timed", label: "限时窗口" },
  { id: "anytime", label: "全天可钓" },
  { id: "voyage", label: "海钓航次" },
  { id: "unknown", label: "条件待补" },
];

export function LookupView({
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
