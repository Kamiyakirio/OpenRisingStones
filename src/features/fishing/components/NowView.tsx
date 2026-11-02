/** Show current and upcoming windows alongside saved fishing targets. */

import {
  fishingSectionHeadingClasses,
  fishingSectionDescriptionClasses,
  fishingEmptyClasses,
} from "../utilityClasses";
import { useMemo } from "react";
import { FishingRows, type RowContext } from "./FishingRows";
import {
  fishingOpportunities,
  matchesNowFishScope,
  type FishingSearch,
  type NowFishScope,
} from "../utils/workspace";
import type { FishFilters as FishingFacets } from "../types";

/** Complete utility strings are shared without adding component CSS rules. */
const nowViewToggleClasses =
  "min-h-8 rounded-control border-0 border-control bg-transparent px-3 py-[5px] text-[13px] whitespace-nowrap text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent";
const fishTextActionClasses =
  "fish-text-action mt-3 min-h-9 rounded-control border-0 border-control bg-transparent px-0 py-[5px] text-left font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-transparent hover:underline disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent";

/** Reused presentation strings stay static and are allocated once for this module. */

const asideDescriptionClasses = "mx-0 mt-0.5 mb-0 text-[13px] leading-[1.5]";
const asideSectionClasses =
  "fish-aside-section mt-6.5 border-t border-solid border-line pt-5.5 max-[1199px]:m-0 max-[1199px]:border-0 max-[1199px]:p-0";

export function NowView({
  context,
  scope,
  onScopeChange,
  onBrowse,
  onCollection,
}: {
  context: RowContext;
  scope: NowFishScope;
  onScopeChange: (scope: NowFishScope) => void;
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
  const openFish = opportunities.open.filter((fish) =>
    matchesNowFishScope(fish, scope),
  );
  const upcomingFish = opportunities.upcoming.filter((fish) =>
    matchesNowFishScope(fish, scope),
  );
  const scopeFacets =
    scope === "big"
      ? {
          kinds: ["big", "legendary"],
        }
      : {};
  const savedIds = new Set(context.progress.saved);
  const saved = context.catalog.fish.filter((fish) => savedIds.has(fish.id));
  return (
    <div className="fish-now-layout grid grid-cols-[minmax(0,_1fr)_minmax(240px,_290px)] items-start gap-8 max-[1199px]:grid-cols-1">
      <div className="fish-now-main">
        <div className="fish-now-scope mb-5.5 flex flex-wrap items-center justify-between gap-[8px_16px] border-b border-solid border-line pb-3.5">
          <span className="text-[13px] text-muted">窗口鱼类</span>
          <div
            className="inline-flex gap-1 rounded-control border border-solid border-control p-[3px]"
            role="group"
            aria-label="窗口鱼类范围"
          >
            <button
              className={nowViewToggleClasses}
              type="button"
              aria-pressed={scope === "big"}
              onClick={() => onScopeChange("big")}
            >
              鱼王与鱼皇
            </button>
            <button
              className={nowViewToggleClasses}
              type="button"
              aria-pressed={scope === "all"}
              onClick={() => onScopeChange("all")}
            >
              全部鱼
            </button>
          </div>
        </div>
        <section className="fish-task-section">
          <header className={fishingSectionHeadingClasses}>
            <div>
              <h2 className="m-0 text-lg font-semibold">当前窗口</h2>
              <p className={fishingSectionDescriptionClasses}>
                未记录，且已满足时间与天气条件。
              </p>
            </div>
            <span className="fish-count text-[13px] text-muted tabular-nums">
              {openFish.length} 条
            </span>
          </header>
          {openFish.length ? (
            <FishingRows
              fish={openFish.slice(0, 6)}
              idPrefix="now-open"
              context={context}
            />
          ) : (
            <p className={fishingEmptyClasses}>
              {scope === "big"
                ? "当前没有窗口开放的未记录鱼王或鱼皇。"
                : "当前没有未记录且窗口开放的鱼。"}
            </p>
          )}
          {openFish.length > 6 && (
            <button
              className={fishTextActionClasses}
              onClick={() =>
                onBrowse(
                  {
                    category: "timed",
                  },
                  {
                    ...scopeFacets,
                    completion: ["uncaught"],
                    available: true,
                  },
                )
              }
            >
              查看全部当前窗口
            </button>
          )}
        </section>
        <section className="fish-task-section mt-8.5">
          <header className={fishingSectionHeadingClasses}>
            <div>
              <h2 className="m-0 text-lg font-semibold">接下来开放</h2>
              <p className={fishingSectionDescriptionClasses}>
                按本机时间排列；进入鱼的资料可查看前置天气和鱼饵。
              </p>
            </div>
          </header>
          {upcomingFish.length ? (
            <FishingRows
              fish={upcomingFish.slice(0, 6)}
              idPrefix="now-next"
              context={context}
              showNextCountdown
            />
          ) : (
            <p className={fishingEmptyClasses}>
              {scope === "big"
                ? "未来一年内没有可计算的鱼王或鱼皇窗口。"
                : "未来一年内没有可计算的下一窗口。"}
            </p>
          )}
          <button
            className={fishTextActionClasses}
            onClick={() =>
              onBrowse(
                {
                  category: "timed",
                  sort: "window",
                },
                {
                  ...scopeFacets,
                  completion: ["uncaught"],
                },
              )
            }
          >
            {scope === "big" ? "查看所有限时鱼王与鱼皇" : "查看所有限时鱼"}
          </button>
        </section>
      </div>
      <aside
        className="fish-now-aside border-l border-solid border-line pl-6 max-[1199px]:grid max-[1199px]:grid-cols-3 max-[1199px]:gap-5 max-[1199px]:border-t max-[1199px]:border-solid max-[1199px]:border-line max-[1199px]:px-0 max-[1199px]:pt-5.5 max-[1199px]:pb-0 max-[1199px]:[border-left:0] max-[850px]:grid-cols-1"
        aria-label="其他钓鱼任务"
      >
        <section className="fish-aside-section">
          <h2 className="m-0 mb-[9px] text-lg font-semibold">我的目标</h2>
          {saved.length ? (
            <FishingRows
              fish={saved.slice(0, 4)}
              idPrefix="now-saved"
              context={context}
              layout="now-aside"
            />
          ) : (
            <p className={asideDescriptionClasses}>
              打开鱼的资料，收藏想优先钓的鱼。
            </p>
          )}
          {saved.length > 4 && (
            <button
              className={fishTextActionClasses}
              onClick={() =>
                onBrowse(
                  {},
                  {
                    progress: "saved",
                  },
                )
              }
            >
              查看全部收藏
            </button>
          )}
        </section>
        <section className={asideSectionClasses}>
          <h2 className="m-0 mb-[9px] text-lg font-semibold">全天可钓</h2>
          <p className={asideDescriptionClasses}>
            还有 {opportunities.anytime.length} 条未记录的鱼无需等待时间窗口。
          </p>
          <button
            className={fishTextActionClasses}
            onClick={() =>
              onBrowse(
                {
                  category: "anytime",
                },
                {
                  completion: ["uncaught"],
                },
              )
            }
          >
            查看全天可钓
          </button>
        </section>
        <section className={asideSectionClasses}>
          <h2 className="m-0 mb-[9px] text-lg font-semibold">按地区查漏</h2>
          <p className={asideDescriptionClasses}>
            逐级查看地图与钓场的未记录鱼。
          </p>
          <button className={fishTextActionClasses} onClick={onCollection}>
            查看图鉴缺口
          </button>
        </section>
      </aside>
    </div>
  );
}
