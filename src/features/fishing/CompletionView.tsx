/** Browse missing catches by discipline, region, map, and fishing spot. */
import { FishingSpotList } from "./FishingSpotList";
import type { RowContext } from "./FishingRows";
import {
  matchesFishingDiscipline,
  type FishingDiscipline,
  type FishingRegionGroup,
} from "./workspace";

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
      <header className="fish-completion-heading">
        <div>
          <h2>
            {context.gameLogActive ? "游戏图鉴钓获记录" : "本机的手动记录"}
          </h2>
          <p>
            {context.gameLogActive
              ? "已读取的图鉴保存在本机；进入角色后自动更新。图鉴外的鱼仍可手动记录。"
              : "Windows 桌面端进入游戏后可读取图鉴。当前显示本机标记。"}
          </p>
        </div>
        <p className="fish-completion-total">
          已记录 <strong>{activeCount.caught}</strong> / {activeCount.total}
        </p>
      </header>
      <nav className="fish-completion-methods" aria-label="图鉴钓法">
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
      <div className="fish-completion-layout">
        <div className="fish-zone-index">
          <label htmlFor="fish-region-query">地区</label>
          <input
            id="fish-region-query"
            type="search"
            value={regionQuery}
            onChange={(event) => onRegionQuery(event.target.value)}
            placeholder="搜索地区"
          />
          <div className="fish-zone-list" aria-label="地区列表">
            {visibleRegions.map((region) => (
              <button
                key={region.name}
                type="button"
                className="fish-zone-button"
                aria-pressed={region.name === activeRegion?.name}
                onClick={() => onSelectRegion(region.name)}
              >
                <span>{region.name || "地区待补"}</span>
                <small>{region.fish.length - region.caught} 未记录</small>
              </button>
            ))}
            {!visibleRegions.length && (
              <p className="fish-inline-empty">没有这个地区，请换个名称。</p>
            )}
          </div>
        </div>
        <div className="fish-map-index">
          <h2>地图</h2>
          {activeRegion ? (
            <div className="fish-map-list" aria-label="地图列表">
              {activeRegion.maps.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  className="fish-zone-button"
                  aria-pressed={map.id === activeMap?.id}
                  onClick={() => onSelectMap(map.id)}
                >
                  <span>{map.name || "地图待补"}</span>
                  <small>{map.fish.length - map.caught} 未记录</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="fish-inline-empty">先选择地区。</p>
          )}
        </div>
        <section className="fish-zone-detail" aria-label="钓场列表">
          <header className="fish-section-heading">
            <div>
              <h2>钓场</h2>
              <p>
                {activeMap?.name ?? "先选择地图"} · 已记录{" "}
                {activeMap?.caught ?? 0}/{activeMap?.fish.length ?? 0}
              </p>
            </div>
          </header>
          {activeMap && (
            <>
              <p className="fish-spot-note">
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
