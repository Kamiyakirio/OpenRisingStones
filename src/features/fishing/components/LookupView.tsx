/** Search the full catalog with the persisted fishing filters. */

import {
  fishingControlClasses,
  fishingSectionHeadingClasses,
  fishingSectionDescriptionClasses,
} from "../utilityClasses";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo } from "react";
import { FishFilters } from "./FishFilters";
import { FishingRows, type RowContext } from "./FishingRows";
import {
  searchFishingCatalog,
  type FishingCategory,
  type FishingSearch,
} from "../utils/workspace";
import type { FishFilters as FishingFacets } from "../types";

const categoryOptions: {
  id: FishingCategory | "all";
  label: string;
}[] = [
  {
    id: "all",
    label: "全部",
  },
  {
    id: "timed",
    label: "限时窗口",
  },
  {
    id: "anytime",
    label: "全天可钓",
  },
  {
    id: "voyage",
    label: "海钓航次",
  },
  {
    id: "unknown",
    label: "条件待补",
  },
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
      <div className="fish-lookup-top mb-4.5 flex items-end justify-between gap-[16px_24px] max-[620px]:block">
        <label
          className="fish-lookup-search max-w-175 flex-[1_1_520px]"
          htmlFor="fish-query"
        >
          <span className="first:block first:font-semibold">
            搜索鱼名、拼音、物品 ID 或钓点
          </span>
          <span className="fish-lookup-input relative block first:block first:font-semibold">
            <MagnifyingGlass
              className="absolute top-4.5 left-3 h-4.5 w-4.5 text-muted"
              aria-hidden="true"
            />
            <input
              className="mt-[7px] min-h-10 w-full min-w-0 rounded-control border border-solid border-control bg-surface py-2 pr-2.5 pl-9.5 text-ink"
              id="fish-query"
              type="search"
              value={search.query}
              onChange={(event) =>
                onSearch({
                  query: event.target.value,
                })
              }
              placeholder="涅普特龙 / nieputelong / 8754"
            />
          </span>
        </label>
      </div>
      <div
        className="fish-category-controls flex flex-wrap gap-1.5 border-b border-solid border-line pb-4.5 max-[620px]:flex-nowrap max-[620px]:overflow-x-auto max-[620px]:pb-3"
        aria-label="按窗口类型筛选"
      >
        {categoryOptions.map((option) => (
          <button
            className="min-h-10 rounded-control border border-solid border-line bg-surface px-3.5 py-2 text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected max-[620px]:shrink-0 max-[620px]:whitespace-nowrap pointer-coarse:min-h-11"
            key={option.id}
            type="button"
            aria-pressed={search.category === option.id}
            onClick={() =>
              onSearch({
                category: option.id,
              })
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="fish-lookup-controls flex flex-wrap items-end gap-3 px-0 pt-4.5 pb-6">
        <label className="block min-w-37.5 flex-[0_1_190px] text-[13px] font-semibold max-[620px]:flex-[1_1_140px]">
          排序
          <select
            className="mt-[5px] min-h-10 w-full min-w-0 rounded-control border border-solid border-control bg-surface px-2.5 py-2 text-[15px] font-normal text-ink"
            value={search.sort}
            onChange={(event) =>
              onSearch({
                sort: event.target.value as FishingSearch["sort"],
              })
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
            className="fish-clear-open min-h-10 rounded-control border border-solid border-[transparent] bg-transparent px-3.5 py-2 text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
            onClick={() =>
              onFacets({
                available: false,
              })
            }
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
      <div className="fish-lookup-results min-w-0">
        <header className={fishingSectionHeadingClasses}>
          <div>
            <h2 className="m-0 text-lg font-semibold">查询结果</h2>
            <p className={fishingSectionDescriptionClasses}>
              找到 {results.length} 条鱼
            </p>
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
              <button
                className="fish-text-action mt-3 min-h-9 rounded-control border-0 border-control bg-transparent px-0 py-[5px] text-left font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-transparent hover:underline disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
                onClick={onMore}
              >
                再显示 {Math.min(30, results.length - limit)} 条
              </button>
            )}
          </>
        ) : (
          <div className="fish-empty px-0 py-8 [border-block:1px_solid_var(--ors-color-line)]">
            <h3 className="mx-0 mt-0 mb-1.5 text-base font-semibold">
              没有符合条件的鱼
            </h3>
            <p className="text-muted">可修改鱼名或清除筛选。</p>
            <button className={fishingControlClasses.button} onClick={onReset}>
              清除筛选
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
