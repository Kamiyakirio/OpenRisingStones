/** Browse missing catches by discipline, region, map, and fishing spot. */
import { FishingSpotList } from "./FishingSpotList";
import type { RowContext } from "./FishingRows";
import {
  matchesFishingDiscipline,
  type FishingDiscipline,
  type FishingRegionGroup,
} from "../utils/workspace";

export type SpotSelection = { region: string; map: number; spot: number };
const completionMethods: {
  id: FishingDiscipline;
  label: string;
  description: string;
}[] = [
  { id: "fishing", label: "钓鱼", description: "垂钓与海钓" },
  { id: "spearfishing", label: "刺鱼", description: "捕鱼叉" },
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
  ) as Record<FishingDiscipline, { total: number; caught: number }>;
  const activeCount = methodCounts[discipline];
  return (
    <div className="fish-completion">
      <header
        className={
          "fish-completion-heading [&_p]:text-muted [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] flex justify-between mb-[14px] [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5] [&&&&]:[align-items:end] [&&&&]:gap-[12px_24px]"
        }
      >
        <div>
          <h2 className="text-lg font-semibold">
            {context.gameLogActive ? "游戏图鉴钓获记录" : "本机的手动记录"}
          </h2>
          <p>
            {context.gameLogActive
              ? "已读取的图鉴保存在本机；进入角色后自动更新。图鉴外的鱼仍可手动记录。"
              : "Windows 桌面端进入游戏后可读取图鉴。当前显示本机标记。"}
          </p>
        </div>
        <p className="fish-completion-total tabular-nums whitespace-nowrap [&_strong]:text-accent [&_strong]:text-xl">
          已记录 <strong>{activeCount.caught}</strong> / {activeCount.total}
        </p>
      </header>
      <nav
        className={
          'fish-completion-methods grid mb-[26px] border-b border-solid border-line [.fishing-workspace_&_button]:flex [.fishing-workspace_&_button]:items-baseline [.fishing-workspace_&_button]:gap-[10px] [.fishing-workspace_&_button]:min-w-0 [.fishing-workspace_&_button]:min-h-[58px] [.fishing-workspace_&_button]:border-0 [.fishing-workspace_&_button]:rounded-none [.fishing-workspace_&_button]:text-left [.fishing-workspace_&_button[aria-pressed=true]]:bg-selected [.fishing-workspace_&_button[aria-pressed=true]]:text-accent [&_strong]:font-semibold [&_span]:text-muted [&_span]:text-[13px] max-[620px]:[.fishing-workspace_&_button]:grid max-[620px]:[.fishing-workspace_&_button]:gap-[2px] [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [.fishing-workspace_&&&&_button]:p-[12px_14px] [.fishing-workspace_&&&&_button]:[border-bottom:2px_solid_transparent] [.fishing-workspace_&&&&_button]:[background:transparent] [.fishing-workspace_&&&&_button[aria-pressed="true"]]:[border-bottom-color:var(--ors-color-accent)] [@media(max-width:_620px)]:[.fishing-workspace_&&&&_button]:[align-content:center] [@media(max-width:_620px)]:[.fishing-workspace_&&&&_button]:p-[9px_10px]'
        }
        aria-label="图鉴钓法"
      >
        {completionMethods.map((method) => (
          <button
            key={method.id}
            type="button"
            aria-pressed={discipline === method.id}
            onClick={() => onDisciplineChange(method.id)}
          >
            <strong>{method.label}</strong>
            <span>
              {method.description} ·{" "}
              {methodCounts[method.id].total - methodCounts[method.id].caught}{" "}
              未记录
            </span>
          </button>
        ))}
      </nav>
      <div
        className={
          "fish-completion-layout grid gap-[15px] [&&&&]:grid-cols-[minmax(175px,_285px)_minmax(185px,_305px)_minmax(_0,_1fr_)] [@media(max-width:_850px)]:[&&&&]:grid-cols-[minmax(0,_1fr)]"
        }
      >
        <div
          className={
            "fish-zone-index min-w-0 [&_>_label]:block [&_>_label]:font-semibold [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[40px] [&_input]:mt-[7px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:bg-surface [&_input]:text-ink [&&&&_input]:p-[8px_10px]"
          }
        >
          <label htmlFor="fish-region-query">地区</label>
          <input
            id="fish-region-query"
            type="search"
            value={regionQuery}
            onChange={(event) => onRegionQuery(event.target.value)}
            placeholder="搜索地区"
          />
          <div
            className={
              "fish-zone-list max-h-[300px] overflow-auto mt-[12px] max-[850px]:flex max-[850px]:overflow-x-auto max-[850px]:gap-[6px] max-[850px]:pb-[8px] [&&&&]:[scrollbar-color:var(--ors-color-control-line)_transparent] [@media(max-width:_850px)]:[&&&&]:max-h-[none]"
            }
            aria-label="地区列表"
          >
            {visibleRegions.map((region) => (
              <button
                key={region.name}
                type="button"
                className={
                  "fish-zone-button [.fishing-workspace_&]:flex [.fishing-workspace_&]:items-baseline [.fishing-workspace_&]:justify-between [.fishing-workspace_&]:gap-[8px] [.fishing-workspace_&]:w-full [.fishing-workspace_&]:min-w-0 [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:border-b [.fishing-workspace_&]:border-solid [.fishing-workspace_&]:border-line [.fishing-workspace_&]:rounded-none [.fishing-workspace_&]:text-left [.fishing-workspace_&[aria-pressed=true]]:text-accent [.fishing-workspace_&[aria-pressed=true]]:bg-selected [&_span]:min-w-0 [&_span]:overflow-hidden [&_span]:whitespace-nowrap [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap max-[850px]:[.fishing-workspace_&]:max-w-[240px] max-[850px]:[.fishing-workspace_&]:min-h-[44px] max-[850px]:[.fishing-workspace_&]:border max-[850px]:[.fishing-workspace_&]:border-solid max-[850px]:[.fishing-workspace_&]:border-line max-[850px]:[.fishing-workspace_&]:rounded-[var(--ors-radius-control)] [.fishing-workspace_&&&&]:p-[9px_8px] [.fishing-workspace_&&&&]:[background:transparent] [&&&&_span]:[text-overflow:ellipsis] [@media(max-width:_850px)]:[.fishing-workspace_&&&&]:flex-[0_0_auto] [@media(max-width:_850px)]:[.fishing-workspace_&&&&]:w-[auto]"
                }
                aria-pressed={region.name === activeRegion?.name}
                onClick={() => onSelectRegion(region.name)}
              >
                <span>{region.name || "地区待补"}</span>
                <small>{region.fish.length - region.caught} 未记录</small>
              </button>
            ))}
            {!visibleRegions.length && (
              <p
                className={
                  "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
                }
              >
                没有这个地区，请换个名称。
              </p>
            )}
          </div>
        </div>
        <div
          className={
            "fish-map-index min-w-0 [&_h2]:text-[15px] [&&&&_h2]:m-[0_0_12px]"
          }
        >
          <h2 className="text-lg font-semibold">地图</h2>
          {activeRegion ? (
            <div
              className={
                "fish-map-list max-h-[300px] overflow-auto mt-0 max-[850px]:flex max-[850px]:overflow-x-auto max-[850px]:gap-[6px] max-[850px]:pb-[8px] max-[850px]:mt-0 [&&&&]:[scrollbar-color:var(--ors-color-control-line)_transparent] [@media(max-width:_850px)]:[&&&&]:max-h-[none]"
              }
              aria-label="地图列表"
            >
              {activeRegion.maps.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  className={
                    "fish-zone-button [.fishing-workspace_&]:flex [.fishing-workspace_&]:items-baseline [.fishing-workspace_&]:justify-between [.fishing-workspace_&]:gap-[8px] [.fishing-workspace_&]:w-full [.fishing-workspace_&]:min-w-0 [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:border-b [.fishing-workspace_&]:border-solid [.fishing-workspace_&]:border-line [.fishing-workspace_&]:rounded-none [.fishing-workspace_&]:text-left [.fishing-workspace_&[aria-pressed=true]]:text-accent [.fishing-workspace_&[aria-pressed=true]]:bg-selected [&_span]:min-w-0 [&_span]:overflow-hidden [&_span]:whitespace-nowrap [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap max-[850px]:[.fishing-workspace_&]:max-w-[240px] max-[850px]:[.fishing-workspace_&]:min-h-[44px] max-[850px]:[.fishing-workspace_&]:border max-[850px]:[.fishing-workspace_&]:border-solid max-[850px]:[.fishing-workspace_&]:border-line max-[850px]:[.fishing-workspace_&]:rounded-[var(--ors-radius-control)] [.fishing-workspace_&&&&]:p-[9px_8px] [.fishing-workspace_&&&&]:[background:transparent] [&&&&_span]:[text-overflow:ellipsis] [@media(max-width:_850px)]:[.fishing-workspace_&&&&]:flex-[0_0_auto] [@media(max-width:_850px)]:[.fishing-workspace_&&&&]:w-[auto]"
                  }
                  aria-pressed={map.id === activeMap?.id}
                  onClick={() => onSelectMap(map.id)}
                >
                  <span>{map.name || "地图待补"}</span>
                  <small>{map.fish.length - map.caught} 未记录</small>
                </button>
              ))}
            </div>
          ) : (
            <p
              className={
                "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
              }
            >
              先选择地区。
            </p>
          )}
        </div>
        <section
          className="fish-zone-detail [&_p]:text-muted min-w-0"
          aria-label="钓场列表"
        >
          <header
            className={
              "fish-section-heading [&_p]:text-muted flex items-baseline justify-between flex-wrap mb-[14px] [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-ocean-fish-section_&_h3]:m-0 [.fish-ocean-fish-section_&_h3]:text-lg [&&&&]:gap-[8px_20px] [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
            }
          >
            <div>
              <h2 className="text-lg font-semibold">钓场</h2>
              <p>
                {activeMap?.name ?? "先选择地图"} · 已记录{" "}
                {activeMap?.caught ?? 0}/{activeMap?.fish.length ?? 0}
              </p>
            </div>
          </header>
          {activeMap && (
            <>
              <p className={"fish-spot-note text-[13px] [&&&&]:m-[0_0_12px]"}>
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
