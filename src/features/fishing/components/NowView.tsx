/** Show current and upcoming windows alongside saved fishing targets. */
import { useMemo } from "react";
import { FishingRows, type RowContext } from "./FishingRows";
import {
  fishingOpportunities,
  matchesNowFishScope,
  type FishingSearch,
  type NowFishScope,
} from "../utils/workspace";
import type { FishFilters as FishingFacets } from "../types";

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
  const scopeFacets = scope === "big" ? { kinds: ["big", "legendary"] } : {};
  const savedIds = new Set(context.progress.saved);
  const saved = context.catalog.fish.filter((fish) => savedIds.has(fish.id));
  return (
    <div
      className={
        "fish-now-layout grid gap-[32px] [&&&&]:grid-cols-[minmax(0,_1fr)_minmax(240px,_290px)] [&&&&]:[align-items:start] [@media(max-width:_1199px)]:[&&&&]:grid-cols-[minmax(0,_1fr)]"
      }
    >
      <div className="fish-now-main">
        <div
          className={
            "fish-now-scope flex items-center justify-between flex-wrap mb-[22px] pb-[14px] border-b border-solid border-line [&_>_span]:text-muted [&_>_span]:text-[13px] [&_>_div]:inline-flex [&_>_div]:gap-[4px] [&_>_div]:p-[3px] [&_>_div]:border [&_>_div]:border-solid [&_>_div]:border-control [&_>_div]:rounded-[var(--ors-radius-control)] [.fishing-workspace_&_button]:min-h-[32px] [.fishing-workspace_&_button]:border-0 [.fishing-workspace_&_button]:text-[13px] [.fishing-workspace_&_button]:whitespace-nowrap [.fishing-workspace_&_button[aria-pressed=true]]:bg-selected [.fishing-workspace_&_button[aria-pressed=true]]:text-accent [&&&&]:gap-[8px_16px] [.fishing-workspace_&&&&_button]:p-[5px_12px] [.fishing-workspace_&&&&_button]:[background:transparent]"
          }
        >
          <span>窗口鱼类</span>
          <div role="group" aria-label="窗口鱼类范围">
            <button
              type="button"
              aria-pressed={scope === "big"}
              onClick={() => onScopeChange("big")}
            >
              鱼王与鱼皇
            </button>
            <button
              type="button"
              aria-pressed={scope === "all"}
              onClick={() => onScopeChange("all")}
            >
              全部鱼
            </button>
          </div>
        </div>
        <section className="fish-task-section [.fish-task-section_+_&]:mt-[34px]">
          <header
            className={
              "fish-section-heading [&_p]:text-muted flex items-baseline justify-between flex-wrap mb-[14px] [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-ocean-fish-section_&_h3]:m-0 [.fish-ocean-fish-section_&_h3]:text-lg [&&&&]:gap-[8px_20px] [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
            }
          >
            <div>
              <h2 className="text-lg font-semibold">当前窗口</h2>
              <p>未记录，且已满足时间与天气条件。</p>
            </div>
            <span className="fish-count text-muted text-[13px] tabular-nums">
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
            <p
              className={
                "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
              }
            >
              {scope === "big"
                ? "当前没有窗口开放的未记录鱼王或鱼皇。"
                : "当前没有未记录且窗口开放的鱼。"}
            </p>
          )}
          {openFish.length > 6 && (
            <button
              className={
                "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
              }
              onClick={() =>
                onBrowse(
                  { category: "timed" },
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
        <section className="fish-task-section [.fish-task-section_+_&]:mt-[34px]">
          <header
            className={
              "fish-section-heading [&_p]:text-muted flex items-baseline justify-between flex-wrap mb-[14px] [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-ocean-fish-section_&_h3]:m-0 [.fish-ocean-fish-section_&_h3]:text-lg [&&&&]:gap-[8px_20px] [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
            }
          >
            <div>
              <h2 className="text-lg font-semibold">接下来开放</h2>
              <p>按本机时间排列；进入鱼的资料可查看前置天气和鱼饵。</p>
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
            <p
              className={
                "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
              }
            >
              {scope === "big"
                ? "未来一年内没有可计算的鱼王或鱼皇窗口。"
                : "未来一年内没有可计算的下一窗口。"}
            </p>
          )}
          <button
            className={
              "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
            }
            onClick={() =>
              onBrowse(
                { category: "timed", sort: "window" },
                { ...scopeFacets, completion: ["uncaught"] },
              )
            }
          >
            {scope === "big" ? "查看所有限时鱼王与鱼皇" : "查看所有限时鱼"}
          </button>
        </section>
      </div>
      <aside
        className={
          "fish-now-aside pl-[24px] border-l border-solid border-line max-[1199px]:grid max-[1199px]:gap-[20px] max-[1199px]:border-t max-[1199px]:border-solid max-[1199px]:border-line [@media(max-width:_1199px)]:[&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(max-width:_1199px)]:[&&&&]:p-[22px_0_0] [@media(max-width:_1199px)]:[&&&&]:[border-left:0] [@media(max-width:_850px)]:[&&&&]:grid-cols-[minmax(0,_1fr)]"
        }
        aria-label="其他钓鱼任务"
      >
        <section
          className={
            "fish-aside-section [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-aside-section_+_&]:mt-[26px] [.fish-aside-section_+_&]:pt-[22px] [.fish-aside-section_+_&]:border-t [.fish-aside-section_+_&]:border-solid [.fish-aside-section_+_&]:border-line [&_h2]:mb-[9px] max-[1199px]:[.fish-aside-section_+_&]:m-0 max-[1199px]:[.fish-aside-section_+_&]:p-0 max-[1199px]:[.fish-aside-section_+_&]:border-0 [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
          }
        >
          <h2 className="text-lg font-semibold">我的目标</h2>
          {saved.length ? (
            <FishingRows
              fish={saved.slice(0, 4)}
              idPrefix="now-saved"
              context={context}
            />
          ) : (
            <p>打开鱼的资料，收藏想优先钓的鱼。</p>
          )}
          {saved.length > 4 && (
            <button
              className={
                "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
              }
              onClick={() => onBrowse({}, { progress: "saved" })}
            >
              查看全部收藏
            </button>
          )}
        </section>
        <section
          className={
            "fish-aside-section [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-aside-section_+_&]:mt-[26px] [.fish-aside-section_+_&]:pt-[22px] [.fish-aside-section_+_&]:border-t [.fish-aside-section_+_&]:border-solid [.fish-aside-section_+_&]:border-line [&_h2]:mb-[9px] max-[1199px]:[.fish-aside-section_+_&]:m-0 max-[1199px]:[.fish-aside-section_+_&]:p-0 max-[1199px]:[.fish-aside-section_+_&]:border-0 [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
          }
        >
          <h2 className="text-lg font-semibold">全天可钓</h2>
          <p>
            还有 {opportunities.anytime.length} 条未记录的鱼无需等待时间窗口。
          </p>
          <button
            className={
              "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
            }
            onClick={() =>
              onBrowse({ category: "anytime" }, { completion: ["uncaught"] })
            }
          >
            查看全天可钓
          </button>
        </section>
        <section
          className={
            "fish-aside-section [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-aside-section_+_&]:mt-[26px] [.fish-aside-section_+_&]:pt-[22px] [.fish-aside-section_+_&]:border-t [.fish-aside-section_+_&]:border-solid [.fish-aside-section_+_&]:border-line [&_h2]:mb-[9px] max-[1199px]:[.fish-aside-section_+_&]:m-0 max-[1199px]:[.fish-aside-section_+_&]:p-0 max-[1199px]:[.fish-aside-section_+_&]:border-0 [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
          }
        >
          <h2 className="text-lg font-semibold">按地区查漏</h2>
          <p>逐级查看地图与钓场的未记录鱼。</p>
          <button
            className={
              "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
            }
            onClick={onCollection}
          >
            查看图鉴缺口
          </button>
        </section>
      </aside>
    </div>
  );
}
