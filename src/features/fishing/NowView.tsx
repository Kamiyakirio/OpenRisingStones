/** Show current and upcoming windows alongside saved fishing targets. */
import { useMemo } from "react";
import { FishingRows, type RowContext } from "./FishingRows";
import {
  fishingOpportunities,
  matchesNowFishScope,
  type FishingSearch,
  type NowFishScope,
} from "./workspace";
import type { FishFilters as FishingFacets } from "./types";

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
    <div className="fish-now-layout">
      <div className="fish-now-main">
        <div className="fish-now-scope">
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
        <section className="fish-task-section">
          <header className="fish-section-heading">
            <div>
              <h2>当前窗口</h2>
              <p>未记录，且已满足时间与天气条件。</p>
            </div>
            <span className="fish-count">{openFish.length} 条</span>
          </header>
          {openFish.length ? (
            <FishingRows
              fish={openFish.slice(0, 6)}
              idPrefix="now-open"
              context={context}
            />
          ) : (
            <p className="fish-inline-empty">
              {scope === "big"
                ? "当前没有窗口开放的未记录鱼王或鱼皇。"
                : "当前没有未记录且窗口开放的鱼。"}
            </p>
          )}
          {openFish.length > 6 && (
            <button
              className="fish-text-action"
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
        <section className="fish-task-section">
          <header className="fish-section-heading">
            <div>
              <h2>接下来开放</h2>
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
            <p className="fish-inline-empty">
              {scope === "big"
                ? "未来一年内没有可计算的鱼王或鱼皇窗口。"
                : "未来一年内没有可计算的下一窗口。"}
            </p>
          )}
          <button
            className="fish-text-action"
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
      <aside className="fish-now-aside" aria-label="其他钓鱼任务">
        <section className="fish-aside-section">
          <h2>我的目标</h2>
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
              className="fish-text-action"
              onClick={() => onBrowse({}, { progress: "saved" })}
            >
              查看全部收藏
            </button>
          )}
        </section>
        <section className="fish-aside-section">
          <h2>全天可钓</h2>
          <p>
            还有 {opportunities.anytime.length} 条未记录的鱼无需等待时间窗口。
          </p>
          <button
            className="fish-text-action"
            onClick={() =>
              onBrowse({ category: "anytime" }, { completion: ["uncaught"] })
            }
          >
            查看全天可钓
          </button>
        </section>
        <section className="fish-aside-section">
          <h2>按地区查漏</h2>
          <p>逐级查看地图与钓场的未记录鱼。</p>
          <button className="fish-text-action" onClick={onCollection}>
            查看图鉴缺口
          </button>
        </section>
      </aside>
    </div>
  );
}
