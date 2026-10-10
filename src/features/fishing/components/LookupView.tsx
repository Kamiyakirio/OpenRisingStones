/** Search the full catalog with the persisted fishing filters. */
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
      <div
        className={
          "fish-lookup-top [&_p]:text-muted flex justify-between mb-[18px] [&_p]:max-w-[210px] [&_p]:text-[13px] max-[620px]:block max-[620px]:[&_p]:mt-[9px] [&&&&]:[align-items:end] [&&&&]:gap-[16px_24px] [&&&&_p]:m-[0_0_6px] [@media(max-width:_620px)]:[&&&&_p]:max-w-[none]"
        }
      >
        <label
          className={
            "fish-lookup-search [&_>_span:first-child]:block [&_>_span:first-child]:font-semibold max-w-[700px] [&&&&]:flex-[1_1_520px]"
          }
          htmlFor="fish-query"
        >
          <span>搜索鱼名、拼音、物品 ID 或钓点</span>
          <span
            className={
              "fish-lookup-input [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[40px] [&_input]:mt-[7px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:bg-surface [&_input]:text-ink relative block [&_svg]:absolute [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:text-muted [&_input]:pl-[38px] [&&&&_input]:p-[8px_10px_8px_38px] [&&&&_svg]:left-[12px] [&&&&_svg]:top-[18px]"
            }
          >
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
      <div
        className={
          "fish-category-controls flex flex-wrap gap-[6px] pb-[18px] border-b border-solid border-line [.fishing-workspace_&_button]:border-line max-[620px]:flex-nowrap max-[620px]:overflow-x-auto max-[620px]:pb-[12px] max-[620px]:[&_button]:whitespace-nowrap [@media(max-width:_620px)]:[&&&&_button]:flex-[0_0_auto]"
        }
        aria-label="按窗口类型筛选"
      >
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
      <div
        className={
          "fish-lookup-controls [&_label]:block [&_label]:font-semibold [&_select]:w-full [&_select]:min-w-0 [&_select]:min-h-[40px] [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[var(--ors-radius-control)] [&_select]:bg-surface [&_select]:text-ink flex flex-wrap gap-[12px] [&_label]:min-w-[150px] [&_label]:text-[13px] [&_select]:mt-[5px] [&_select]:text-[15px] [&_select]:font-normal [&&&&_select]:p-[8px_10px] [&&&&]:[align-items:end] [&&&&]:p-[18px_0_24px] [&&&&_label]:flex-[0_1_190px] [@media(max-width:_620px)]:[&&&&_label]:flex-[1_1_140px]"
        }
      >
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
            className={
              "fish-clear-open [.fishing-workspace_&]:min-h-[40px] [.fishing-workspace_&]:text-accent [.fishing-workspace_&&&&]:[border-color:transparent] [.fishing-workspace_&&&&]:[background:transparent]"
            }
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
      <div className="fish-lookup-results min-w-0">
        <header
          className={
            "fish-section-heading [&_p]:text-muted flex items-baseline justify-between flex-wrap mb-[14px] [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-ocean-fish-section_&_h3]:m-0 [.fish-ocean-fish-section_&_h3]:text-lg [&&&&]:gap-[8px_20px] [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
          }
        >
          <div>
            <h2 className="text-lg font-semibold">查询结果</h2>
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
              <button
                className={
                  "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
                }
                onClick={onMore}
              >
                再显示 {Math.min(30, results.length - limit)} 条
              </button>
            )}
          </>
        ) : (
          <div
            className={
              "fish-empty [&_p]:text-muted [&&&&]:p-[32px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)] [&&&&_h3]:m-[0_0_6px]"
            }
          >
            <h3 className="text-base font-semibold">没有符合条件的鱼</h3>
            <p>可修改鱼名或清除筛选。</p>
            <button onClick={onReset}>清除筛选</button>
          </div>
        )}
      </div>
    </div>
  );
}
