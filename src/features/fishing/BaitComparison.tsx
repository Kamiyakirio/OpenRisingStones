/** Put every reported bait for a fish and spot in one scannable comparison. */
import { FishSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { formatBiteTimeRange } from "./biteTimes";
import { FishBaitSource } from "./FishBaitSource";
import { xivIconUrl } from "./iconUrl";
import { useBaitComparisons } from "./useBaitComparisons";
import type { Fish, FishCatalog } from "./types";

function BaitIcon({ icon }: { icon?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="fish-bait-compare-icon" aria-hidden="true">
      {icon && !failed ? (
        <img
          src={xivIconUrl(icon)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <FishSimple />
      )}
    </span>
  );
}

export function BaitComparison({
  fish,
  catalog,
  spotId,
  onSelectSpot,
}: {
  fish: Fish;
  catalog: FishCatalog;
  spotId?: number;
  onSelectSpot: (spotId: number) => void;
}) {
  const spot = fish.locations.find((location) => location.id === spotId);
  const comparison = useBaitComparisons(fish.id, spot?.id);
  const finalBait = fish.conditions?.bait.at(-1);
  const guideBaitIds =
    finalBait == null ? [] : Array.isArray(finalBait) ? finalBait : [finalBait];
  const reportedIds = new Set(comparison.data.map(({ baitId }) => baitId));
  const baits = [
    ...comparison.data,
    ...guideBaitIds
      .filter((baitId) => !reportedIds.has(baitId))
      .map((baitId) => ({ baitId, range: null })),
  ];
  return (
    <section className="fish-bait-comparison" id="fish-bait-comparison">
      <div className="fish-bait-compare-heading">
        <div>
          <h2>鱼饵时间对比</h2>
          <p>同一条鱼换饵后，咬钩时间可能不同。这里按钓场分别查看。</p>
        </div>
        {fish.locations.length > 1 && (
          <label>
            钓场
            <select
              value={spotId ?? ""}
              onChange={(event) => onSelectSpot(Number(event.target.value))}
            >
              {fish.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {spot && (
        <p className="fish-bait-compare-spot">
          {spot.name} · Teamcraft 社区记录
          {comparison.status === "ready" && ` · ${baits.length} 种鱼饵`}
        </p>
      )}
      {comparison.status === "loading" && (
        <p className="fish-inline-empty" role="status">
          正在读取鱼饵记录…
        </p>
      )}
      {comparison.status === "error" && (
        <p className="fish-inline-empty" role="status">
          鱼饵记录暂时无法读取。
          <button
            className="fish-text-action"
            type="button"
            onClick={comparison.retry}
          >
            重试
          </button>
        </p>
      )}
      {comparison.status === "unavailable" && (
        <p className="fish-inline-empty">这条鱼没有可用的钓场记录。</p>
      )}
      {comparison.status === "ready" &&
        (baits.length ? (
          <>
            <div className="fish-bait-compare-columns" aria-hidden="true">
              <span>鱼饵</span>
              <span>常见咬钩时间</span>
              <span>样本</span>
            </div>
            <ul className="fish-bait-compare-list">
              {baits.map(({ baitId, range }) => (
                <li key={baitId}>
                  <span className="fish-bait-compare-name">
                    <FishBaitSource baitId={baitId}>
                      <BaitIcon icon={catalog.itemIcons[baitId]} />
                      <strong>
                        {catalog.items[baitId] || `物品 ${baitId}`}
                      </strong>
                    </FishBaitSource>
                  </span>
                  <strong className="fish-bait-compare-time">
                    {range ? formatBiteTimeRange(range) : "时间样本不足"}
                  </strong>
                  <span className="fish-bait-compare-samples">
                    {range
                      ? `${range.samples.toLocaleString("zh-CN")} 次`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="fish-bait-compare-note">
              鱼饵来自钓法资料和社区钓获记录；时间范围取样本中间
              90%。记录次数不代表更容易钓到。
            </p>
          </>
        ) : (
          <p className="fish-inline-empty">这个钓场还没有可用的鱼饵记录。</p>
        ))}
    </section>
  );
}
