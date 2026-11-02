/** Put every reported bait for a fish and spot in one scannable comparison. */

import { fishingEmptyClasses } from "../utilityClasses";
import { FishSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { formatBiteTimeRange } from "../utils/biteTimes";
import { FishBaitSource } from "./FishBaitSource";
import { xivIconUrl } from "../utils/iconUrl";
import { useBaitComparisons } from "../hooks/useBaitComparisons";
import type { Fish, FishCatalog } from "../types";

function BaitIcon({ icon }: { icon?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="fish-bait-compare-icon grid h-7 w-7 flex-[0_0_28px] place-items-center text-muted"
      aria-hidden="true"
    >
      {icon && !failed ? (
        <img
          className="h-7 w-7 object-contain"
          src={xivIconUrl(icon)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <FishSimple className="h-7 w-7 object-contain" />
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
      .map((baitId) => ({
        baitId,
        range: null,
      })),
  ];
  return (
    <section
      className="fish-bait-comparison mt-7.5 [scroll-margin-top:24px] px-0 pt-5 pb-4.5 [border-block:1px_solid_var(--ors-color-line)] max-[620px]:[scroll-margin-top:120px]"
      id="fish-bait-comparison"
    >
      <div className="fish-bait-compare-heading flex flex-wrap items-end justify-between gap-[12px_24px]">
        <div>
          <h2 className="m-0 text-lg text-[1.2rem] font-semibold">
            鱼饵时间对比
          </h2>
          <p className="mx-0 mt-[5px] mb-0 text-[13px] text-muted">
            同一条鱼换饵后，咬钩时间可能不同。这里按钓场分别查看。
          </p>
        </div>
        {fish.locations.length > 1 && (
          <label className="grid min-w-[min(100%,_220px)] gap-1 text-[13px] text-muted">
            钓场
            <select
              className="min-h-10 rounded-control border border-solid border-control bg-surface px-2.5 py-[7px] text-ink"
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
        <p className="fish-bait-compare-spot mx-0 mt-3 mb-3.5 text-[13px] text-muted">
          {spot.name} · Teamcraft 社区记录
          {comparison.status === "ready" && ` · ${baits.length} 种鱼饵`}
        </p>
      )}
      {comparison.status === "loading" && (
        <p className={fishingEmptyClasses} role="status">
          正在读取鱼饵记录…
        </p>
      )}
      {comparison.status === "error" && (
        <p className={fishingEmptyClasses} role="status">
          鱼饵记录暂时无法读取。
          <button
            className="fish-text-action mt-3 min-h-9 rounded-control border-0 border-control bg-transparent px-0 py-[5px] text-left font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-transparent hover:underline disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent"
            type="button"
            onClick={comparison.retry}
          >
            重试
          </button>
        </p>
      )}
      {comparison.status === "unavailable" && (
        <p className={fishingEmptyClasses}>这条鱼没有可用的钓场记录。</p>
      )}
      {comparison.status === "ready" &&
        (baits.length ? (
          <>
            <div
              className="fish-bait-compare-columns grid grid-cols-[minmax(0,_1fr)_minmax(130px,_auto)_minmax(96px,_auto)] items-center gap-3 px-3 py-1.5 text-xs text-muted max-[850px]:grid-cols-[minmax(0,_1fr)_auto] max-[850px]:gap-[3px_10px]"
              aria-hidden="true"
            >
              <span className="last:text-right max-[850px]:last:hidden">
                鱼饵
              </span>
              <span className="last:text-right max-[850px]:last:hidden">
                常见咬钩时间
              </span>
              <span className="last:text-right max-[850px]:last:hidden">
                样本
              </span>
            </div>
            <ul className="fish-bait-compare-list mx-0 mt-0 mb-3 list-none border-t border-solid border-line p-0">
              {baits.map(({ baitId, range }) => (
                <li
                  className="grid min-h-13.5 grid-cols-[minmax(0,_1fr)_minmax(130px,_auto)_minmax(96px,_auto)] items-center gap-3 border-b border-solid border-line px-3 py-2 max-[850px]:min-h-15.5 max-[850px]:grid-cols-[minmax(0,_1fr)_auto] max-[850px]:gap-[3px_10px]"
                  key={baitId}
                >
                  <span className="fish-bait-compare-name inline-flex min-w-0 items-center gap-[9px]">
                    <FishBaitSource baitId={baitId}>
                      <BaitIcon icon={catalog.itemIcons[baitId]} />
                      <strong className="[overflow-wrap:anywhere]">
                        {catalog.items[baitId] || `物品 ${baitId}`}
                      </strong>
                    </FishBaitSource>
                  </span>
                  <strong className="fish-bait-compare-time whitespace-nowrap tabular-nums">
                    {range ? formatBiteTimeRange(range) : "时间样本不足"}
                  </strong>
                  <span className="fish-bait-compare-samples text-right text-[13px] whitespace-nowrap text-muted tabular-nums max-[850px]:col-start-2 max-[850px]:text-xs">
                    {range
                      ? `${range.samples.toLocaleString("zh-CN")} 次`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="fish-bait-compare-note mx-0 mt-[5px] mb-0 text-[13px] text-muted">
              鱼饵来自钓法资料和社区钓获记录；时间范围取样本中间
              90%。记录次数不代表更容易钓到。
            </p>
          </>
        ) : (
          <p className={fishingEmptyClasses}>这个钓场还没有可用的鱼饵记录。</p>
        ))}
    </section>
  );
}
