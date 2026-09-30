/** Show a dense bait-by-bait catch distribution on a fishing spot page. */
import { FishSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { FishIcon } from "./FishIcon";
import { xivIconUrl } from "./iconUrl";
import { useSpotCatchStats } from "./useSpotCatchStats";
import type { RowContext } from "./FishingRows";

const countText = (count: number) => count.toLocaleString("zh-CN");

function percentage(part: number, total: number) {
  if (!total) return "—";
  const value = (part / total) * 100;
  if (value > 0 && value < 0.1) return "<0.1%";
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}%`;
}

function BaitIcon({ icon }: { icon?: number }) {
  const [failed, setFailed] = useState(false);
  return icon && !failed ? (
    <img
      src={xivIconUrl(icon)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <FishSimple aria-hidden="true" />
  );
}

export function SpotCatchStats({
  spotId,
  context,
}: {
  spotId: number;
  context: RowContext;
}) {
  const stats = useSpotCatchStats(spotId);
  const [selectedBaitId, setSelectedBaitId] = useState<number | null>(null);
  const bait =
    stats.data.find((item) => item.baitId === selectedBaitId) ?? stats.data[0];
  return (
    <section
      className="fish-spot-stats"
      aria-labelledby="fish-spot-stats-title"
    >
      <header className="fish-spot-stats-heading">
        <div>
          <h2 id="fish-spot-stats-title">鱼饵与钓获</h2>
          <p>选鱼饵，查看它在这个钓场钓到哪些鱼。</p>
        </div>
      </header>
      {stats.status === "ready" && bait && (
        <div
          className="fish-spot-stats-baits"
          role="group"
          aria-label="选择鱼饵"
        >
          {stats.data.map((item) => (
            <button
              key={item.baitId}
              type="button"
              className="fish-spot-stats-bait"
              aria-pressed={bait.baitId === item.baitId}
              onClick={() => setSelectedBaitId(item.baitId)}
            >
              <span className="fish-spot-stats-bait-icon" aria-hidden="true">
                <BaitIcon icon={context.catalog.itemIcons[item.baitId]} />
              </span>
              <span>
                {context.catalog.items[item.baitId] || `物品 ${item.baitId}`}
              </span>
              <small>{countText(item.total)}</small>
            </button>
          ))}
        </div>
      )}
      {stats.status === "loading" && (
        <p className="fish-inline-empty" role="status">
          正在读取钓获统计…
        </p>
      )}
      {stats.status === "error" && (
        <p className="fish-inline-empty" role="status">
          钓获统计暂时无法读取。
          <button
            className="fish-text-action"
            type="button"
            onClick={stats.retry}
          >
            重试
          </button>
        </p>
      )}
      {stats.status === "ready" && !bait && (
        <p className="fish-inline-empty">这个钓场还没有可用的鱼饵统计。</p>
      )}
      {stats.status === "ready" && bait && (
        <>
          <div className="fish-spot-stats-summary" aria-label="所选鱼饵的记录">
            <span className="fish-spot-stats-bait-icon" aria-hidden="true">
              <BaitIcon
                key={bait.baitId}
                icon={context.catalog.itemIcons[bait.baitId]}
              />
            </span>
            <strong>
              {context.catalog.items[bait.baitId] || `物品 ${bait.baitId}`}
            </strong>
            <span>样本 {countText(bait.total)} 次</span>
            <span>钓获 {countText(bait.caught)} 次</span>
            <span>脱钩等失败 {percentage(bait.missed, bait.total)}</span>
            <span>单独脱钩率 —</span>
          </div>
          <div className="fish-spot-stats-table-wrap">
            <table className="fish-spot-stats-table">
              <thead>
                <tr>
                  <th scope="col">鱼</th>
                  <th scope="col">钓获占比</th>
                  <th scope="col">样本</th>
                </tr>
              </thead>
              <tbody>
                {bait.fish.map(({ fishId, reports }) => {
                  const fish = context.fishById.get(fishId);
                  const triggerId = `spot-stats-${spotId}-${fishId}`;
                  return (
                    <tr key={fishId}>
                      <td>
                        {fish ? (
                          <button
                            id={triggerId}
                            type="button"
                            className="fish-spot-stats-fish"
                            onClick={() =>
                              context.onOpen(fish, triggerId, spotId)
                            }
                          >
                            <FishIcon fish={fish} />
                            <span>{fish.name}</span>
                          </button>
                        ) : (
                          <span className="fish-spot-stats-unknown">
                            物品 {fishId}
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{percentage(reports, bait.caught)}</strong>
                      </td>
                      <td>{countText(reports)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="fish-spot-stats-note">
            Teamcraft
            社区记录。鱼的百分比以成功钓获为分母，并非每次抛竿的咬钩率。
            失败记录合并了脱钩等结果，无法单独算脱钩率；统计也未按时间和天气拆分。
          </p>
        </>
      )}
    </section>
  );
}
