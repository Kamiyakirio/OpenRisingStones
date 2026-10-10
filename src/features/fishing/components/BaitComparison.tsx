/** Put every reported bait for a fish and spot in one scannable comparison. */
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
      className={
        "fish-bait-compare-icon grid place-items-center w-[28px] h-[28px] text-muted [&_:is(img,_svg)]:w-[28px] [&_:is(img,_svg)]:h-[28px] [&_:is(img,_svg)]:object-contain [&&&&]:flex-[0_0_28px]"
      }
      aria-hidden="true"
    >
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
    <section
      className={
        "fish-bait-comparison mt-[30px] [&&&&]:p-[20px_0_18px] [&&&&]:[border-block:1px_solid_var(--ors-color-line)] [&&&&]:[scroll-margin-top:24px] [@media(max-width:_620px)]:[&&&&]:[scroll-margin-top:120px]"
      }
      id="fish-bait-comparison"
    >
      <div
        className={
          "fish-bait-compare-heading flex justify-between flex-wrap [&_h2]:m-0 [&_p]:text-muted [&_p]:text-[13px] [&_label]:grid [&_label]:gap-[4px] [&_label]:text-muted [&_label]:text-[13px] [&_select]:min-h-[40px] [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[var(--ors-radius-control)] [&_select]:bg-surface [&_select]:text-ink [&&&&]:[align-items:end] [&&&&]:gap-[12px_24px] [&&&&_h2]:text-[1.2rem] [&&&&_p]:m-[5px_0_0] [&&&&_label]:min-w-[min(100%,_220px)] [&&&&_select]:p-[7px_10px]"
        }
      >
        <div>
          <h2 className="text-lg font-semibold">鱼饵时间对比</h2>
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
        <p
          className={
            "fish-bait-compare-spot text-muted text-[13px] [&&&&]:m-[12px_0_14px]"
          }
        >
          {spot.name} · Teamcraft 社区记录
          {comparison.status === "ready" && ` · ${baits.length} 种鱼饵`}
        </p>
      )}
      {comparison.status === "loading" && (
        <p
          className={
            "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
          }
          role="status"
        >
          正在读取鱼饵记录…
        </p>
      )}
      {comparison.status === "error" && (
        <p
          className={
            "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
          }
          role="status"
        >
          鱼饵记录暂时无法读取。
          <button
            className={
              "fish-text-action [.fishing-workspace_&]:min-h-[36px] [.fishing-workspace_&]:mt-[12px] [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:font-semibold [.fishing-workspace_&]:text-left [.fishing-workspace_&&&&]:p-[5px_0] [.fishing-workspace_&&&&]:[background:transparent] [.fishing-workspace_&&&&:hover]:[background:transparent] [.fishing-workspace_&&&&:hover]:[text-decoration:underline]"
            }
            type="button"
            onClick={comparison.retry}
          >
            重试
          </button>
        </p>
      )}
      {comparison.status === "unavailable" && (
        <p
          className={
            "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
          }
        >
          这条鱼没有可用的钓场记录。
        </p>
      )}
      {comparison.status === "ready" &&
        (baits.length ? (
          <>
            <div
              className={
                "fish-bait-compare-columns grid items-center gap-[12px] text-muted text-xs [&_>_:last-child]:text-right max-[850px]:[&_>_:last-child]:hidden [&&&&]:grid-cols-[minmax(0,_1fr)_minmax(130px,_auto)_minmax(96px,_auto)] [&&&&]:p-[6px_12px] [@media(max-width:_850px)]:[&&&&]:grid-cols-[minmax(0,_1fr)_auto] [@media(max-width:_850px)]:[&&&&]:gap-[3px_10px]"
              }
              aria-hidden="true"
            >
              <span>鱼饵</span>
              <span>常见咬钩时间</span>
              <span>样本</span>
            </div>
            <ul
              className={
                "fish-bait-compare-list [&_li]:grid [&_li]:items-center [&_li]:gap-[12px] p-0 border-t border-solid border-line [&_li]:min-h-[54px] [&_li]:border-b [&_li]:border-solid [&_li]:border-line max-[850px]:[&_li]:min-h-[62px] [&&&&_li]:grid-cols-[minmax(0,_1fr)_minmax(130px,_auto)_minmax(96px,_auto)] [&&&&]:m-[0_0_12px] [&&&&]:[list-style:none] [&&&&_li]:p-[8px_12px] [@media(max-width:_850px)]:[&&&&_li]:grid-cols-[minmax(0,_1fr)_auto] [@media(max-width:_850px)]:[&&&&_li]:gap-[3px_10px]"
              }
            >
              {baits.map(({ baitId, range }) => (
                <li key={baitId}>
                  <span
                    className={
                      "fish-bait-compare-name inline-flex items-center gap-[9px] min-w-0 [&&&&_strong]:[overflow-wrap:anywhere]"
                    }
                  >
                    <FishBaitSource baitId={baitId}>
                      <BaitIcon icon={catalog.itemIcons[baitId]} />
                      <strong>
                        {catalog.items[baitId] || `物品 ${baitId}`}
                      </strong>
                    </FishBaitSource>
                  </span>
                  <strong className="fish-bait-compare-time tabular-nums whitespace-nowrap">
                    {range ? formatBiteTimeRange(range) : "时间样本不足"}
                  </strong>
                  <span
                    className={
                      "fish-bait-compare-samples text-right tabular-nums whitespace-nowrap text-muted text-[13px] max-[850px]:text-xs [@media(max-width:_850px)]:[&&&&]:[grid-column:2]"
                    }
                  >
                    {range
                      ? `${range.samples.toLocaleString("zh-CN")} 次`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <p
              className={
                "fish-bait-compare-note text-muted text-[13px] mt-[12px] [&&&&]:m-[5px_0_0]"
              }
            >
              鱼饵来自钓法资料和社区钓获记录；时间范围取样本中间
              90%。记录次数不代表更容易钓到。
            </p>
          </>
        ) : (
          <p
            className={
              "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
            }
          >
            这个钓场还没有可用的鱼饵记录。
          </p>
        ))}
    </section>
  );
}
