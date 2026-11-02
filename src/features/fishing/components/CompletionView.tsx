/** Browse missing catches by discipline, region, map, and fishing spot. */

import {
  fishingSectionDescriptionClasses,
  fishingEmptyClasses,
  fishingSectionHeadingClasses,
} from "../utilityClasses";
import { FishingSpotList } from "./FishingSpotList";
import type { RowContext } from "./FishingRows";
import {
  matchesFishingDiscipline,
  type FishingDiscipline,
  type FishingRegionGroup,
} from "../utils/workspace";

/** Complete utility strings are shared without adding component CSS rules. */
const fishZoneButtonClasses =
  "fish-zone-button flex min-h-10 w-full min-w-0 items-baseline justify-between gap-2 rounded-none border-0 border-b border-solid border-line bg-transparent px-2 py-[9px] text-left text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent max-[850px]:min-h-11 max-[850px]:w-auto max-[850px]:max-w-60 max-[850px]:shrink-0 max-[850px]:rounded-control max-[850px]:border max-[850px]:border-solid max-[850px]:border-line pointer-coarse:min-h-11";

/** Reused presentation strings stay static and are allocated once for this module. */

const zoneNameClasses =
  "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";

export type SpotSelection = {
  region: string;
  map: number;
  spot: number;
};
const completionMethods: {
  id: FishingDiscipline;
  label: string;
  description: string;
}[] = [
  {
    id: "fishing",
    label: "钓鱼",
    description: "垂钓与海钓",
  },
  {
    id: "spearfishing",
    label: "刺鱼",
    description: "捕鱼叉",
  },
];
export function CompletionView({
  context,
  regions,
  discipline,
  onDisciplineChange,
  selectedRegion,
  onSelectRegion,
  regionQuery,
  onRegionQuery,
  selectedMap,
  onSelectMap,
  onOpenSpot,
}: {
  context: RowContext;
  regions: FishingRegionGroup[];
  discipline: FishingDiscipline;
  onDisciplineChange: (discipline: FishingDiscipline) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  regionQuery: string;
  onRegionQuery: (query: string) => void;
  selectedMap: number | null;
  onSelectMap: (map: number) => void;
  onOpenSpot: (selection: SpotSelection) => void;
}) {
  const visibleRegions = regions.filter((region) =>
    region.name
      .toLocaleLowerCase()
      .includes(regionQuery.trim().toLocaleLowerCase()),
  );
  const activeRegion =
    visibleRegions.find((region) => region.name === selectedRegion) ??
    visibleRegions[0];
  const activeMap =
    activeRegion?.maps.find((map) => map.id === selectedMap) ??
    activeRegion?.maps[0];
  const caughtIds = new Set(context.progress.caught);
  const methodCounts = Object.fromEntries(
    completionMethods.map((method) => {
      const fish = context.catalog.fish.filter((item) =>
        matchesFishingDiscipline(item, method.id),
      );
      return [
        method.id,
        {
          total: fish.length,
          caught: fish.filter((item) => caughtIds.has(item.id)).length,
        },
      ];
    }),
  ) as Record<
    FishingDiscipline,
    {
      total: number;
      caught: number;
    }
  >;
  const activeCount = methodCounts[discipline];
  return (
    <div className="fish-completion">
      <header className="fish-completion-heading mb-3.5 flex items-end justify-between gap-[12px_24px]">
        <div>
          <h2 className="m-0 text-lg font-semibold">
            {context.gameLogActive ? "游戏图鉴钓获记录" : "本机的手动记录"}
          </h2>
          <p className={fishingSectionDescriptionClasses}>
            {context.gameLogActive
              ? "已读取的图鉴保存在本机；进入角色后自动更新。图鉴外的鱼仍可手动记录。"
              : "Windows 桌面端进入游戏后可读取图鉴。当前显示本机标记。"}
          </p>
        </div>
        <p className="fish-completion-total mx-0 mt-0.5 mb-0 text-[13px] leading-[1.5] whitespace-nowrap text-muted tabular-nums">
          已记录{" "}
          <strong className="text-xl text-accent">{activeCount.caught}</strong>{" "}
          / {activeCount.total}
        </p>
      </header>
      <nav
        className="fish-completion-methods mb-6.5 grid grid-cols-2 border-b border-solid border-line"
        aria-label="图鉴钓法"
      >
        {completionMethods.map((method) => (
          <button
            className="flex min-h-14.5 min-w-0 items-baseline gap-2.5 rounded-none border-0 bg-transparent px-3.5 py-3 text-left text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] [border-bottom:2px_solid_transparent] disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:[border-bottom-color:var(--ors-color-accent)] aria-pressed:bg-selected aria-pressed:text-accent max-[620px]:grid max-[620px]:content-center max-[620px]:gap-0.5 max-[620px]:px-2.5 max-[620px]:py-[9px]"
            key={method.id}
            type="button"
            aria-pressed={discipline === method.id}
            onClick={() => onDisciplineChange(method.id)}
          >
            <strong className="font-semibold">{method.label}</strong>
            <span className="text-[13px] text-muted">
              {method.description} ·{" "}
              {methodCounts[method.id].total - methodCounts[method.id].caught}{" "}
              未记录
            </span>
          </button>
        ))}
      </nav>
      <div className="fish-completion-layout grid grid-cols-[minmax(175px,_285px)_minmax(185px,_305px)_minmax(_0,_1fr_)] gap-[15px] max-[850px]:grid-cols-1">
        <div className="fish-zone-index min-w-0">
          <label className="block font-semibold" htmlFor="fish-region-query">
            地区
          </label>
          <input
            className="mt-[7px] min-h-10 w-full min-w-0 rounded-control border border-solid border-control bg-surface px-2.5 py-2 text-ink"
            id="fish-region-query"
            type="search"
            value={regionQuery}
            onChange={(event) => onRegionQuery(event.target.value)}
            placeholder="搜索地区"
          />
          <div
            className="fish-zone-list mt-3 max-h-75 [scrollbar-color:var(--ors-color-control-line)_transparent] overflow-auto max-[850px]:flex max-[850px]:max-h-none max-[850px]:gap-1.5 max-[850px]:overflow-x-auto max-[850px]:pb-2"
            aria-label="地区列表"
          >
            {visibleRegions.map((region) => (
              <button
                key={region.name}
                type="button"
                className={fishZoneButtonClasses}
                aria-pressed={region.name === activeRegion?.name}
                onClick={() => onSelectRegion(region.name)}
              >
                <span className={zoneNameClasses}>
                  {region.name || "地区待补"}
                </span>
                <small className="text-xs whitespace-nowrap text-muted">
                  {region.fish.length - region.caught} 未记录
                </small>
              </button>
            ))}
            {!visibleRegions.length && (
              <p className={fishingEmptyClasses}>没有这个地区，请换个名称。</p>
            )}
          </div>
        </div>
        <div className="fish-map-index min-w-0">
          <h2 className="mx-0 mt-0 mb-3 text-lg text-[15px] font-semibold">
            地图
          </h2>
          {activeRegion ? (
            <div
              className="fish-map-list mt-0 max-h-75 [scrollbar-color:var(--ors-color-control-line)_transparent] overflow-auto max-[850px]:mt-0 max-[850px]:flex max-[850px]:max-h-none max-[850px]:gap-1.5 max-[850px]:overflow-x-auto max-[850px]:pb-2"
              aria-label="地图列表"
            >
              {activeRegion.maps.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  className={fishZoneButtonClasses}
                  aria-pressed={map.id === activeMap?.id}
                  onClick={() => onSelectMap(map.id)}
                >
                  <span className={zoneNameClasses}>
                    {map.name || "地图待补"}
                  </span>
                  <small className="text-xs whitespace-nowrap text-muted">
                    {map.fish.length - map.caught} 未记录
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className={fishingEmptyClasses}>先选择地区。</p>
          )}
        </div>
        <section className="fish-zone-detail min-w-0" aria-label="钓场列表">
          <header className={fishingSectionHeadingClasses}>
            <div>
              <h2 className="m-0 text-lg font-semibold">钓场</h2>
              <p className={fishingSectionDescriptionClasses}>
                {activeMap?.name ?? "先选择地图"} · 已记录{" "}
                {activeMap?.caught ?? 0}/{activeMap?.fish.length ?? 0}
              </p>
            </div>
          </header>
          {activeMap && (
            <>
              <p className="fish-spot-note mx-0 mt-0 mb-3 text-[13px] text-muted">
                未记录多的钓场在前；地图和地区的数量按鱼去重。
              </p>
              <FishingSpotList
                key={`${activeRegion?.name ?? ""}:${activeMap.id}`}
                map={activeMap}
                onOpen={(spot) =>
                  onOpenSpot({
                    region: activeRegion?.name ?? "",
                    map: activeMap.id,
                    spot: spot.id,
                  })
                }
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
