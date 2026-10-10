/** Show the short bait, bite, and hookset cues used while scanning fish rows. */
import {
  ArrowClockwise,
  Clock,
  FishSimple,
  Hand,
  WaveSine,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { FishBaitSource } from "./FishBaitSource";
import { biteTimeKey, formatBiteTimeRange } from "../utils/biteTimes";
import { xivIconUrl } from "../utils/iconUrl";
import { gigLabels, hooksetLabels, tugLabels } from "../utils/presentation";
import { fishingCatchSteps } from "../utils/technique";
import { selfMoochKey } from "../utils/selfMooch";
import type { Fish, FishCatalog } from "../types";
import type { useBiteTimes } from "../hooks/useBiteTimes";

// Action sheet icon IDs for the two Fisher hookset skills.
const hooksetIcons: Record<string, number> = {
  Powerful: 1115,
  Precision: 1116,
};

function TechniqueIcon({
  icon,
  fallback,
}: {
  icon: number | undefined;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={
        "fish-technique-icon place-items-center w-[18px] h-[18px] text-muted [&_img]:w-[18px] [&_img]:h-[18px] [&_img]:object-contain [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:object-contain [&&&&]:[display:inline-grid] [&&&&]:flex-[0_0_18px]"
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
        fallback
      )}
    </span>
  );
}

export function FishingTechnique({
  fish,
  catalog,
  fishById,
  biteTimes,
  selfMooch,
  spotId,
  showAlternatives = true,
  showBaitSources = false,
}: {
  fish: Fish;
  catalog: FishCatalog;
  fishById: Map<number, Fish>;
  biteTimes: ReturnType<typeof useBiteTimes>;
  selfMooch: ReadonlySet<string>;
  spotId?: number;
  showAlternatives?: boolean;
  showBaitSources?: boolean;
}) {
  const condition = fish.conditions;
  if (fish.method === "spear") {
    return (
      <div
        className={
          'fish-entry-technique grid gap-[5px] min-w-0 text-[13px] [.fish-now-aside_&]:pl-[46px] [.fish-detail-subsection_&]:p-0 [&&&&]:[grid-column:1_/_-1] [&&&&]:[grid-row:3] [&&&&]:p-[0_8px_10px_56px] [&&&&]:leading-[1.45] [.fish-entry[data-conditions="false"]_&&&&]:[grid-row:2] [@media(max-width:_620px)]:[&&&&]:[grid-column:1] [@media(max-width:_620px)]:[&&&&]:[grid-row:3] [@media(max-width:_620px)]:[&&&&]:p-[4px_0_6px_48px] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-column:1_/_-1] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-row:3]'
        }
      >
        <span
          className={
            "fish-technique-field inline-flex items-center flex-wrap gap-[4px] min-w-0 [&_>_svg]:place-items-center [&_>_svg]:w-[18px] [&_>_svg]:h-[18px] [&_>_svg]:text-muted [&_strong]:font-semibold [&&&&_>_svg]:[display:inline-grid] [&&&&_>_svg]:flex-[0_0_18px]"
          }
        >
          <FishSimple aria-hidden="true" />
          <span className="fish-technique-label text-muted">鱼影</span>
          <strong>{gigLabels[condition?.gig || ""] || "大小未收录"}</strong>
        </span>
        <span className="fish-technique-note text-muted">
          刺鱼不使用鱼饵或提钩
        </span>
      </div>
    );
  }

  const steps = fishingCatchSteps(fish, fishById);
  const hasMoochChain = steps.some((step) => step.kind === "mooch");
  return (
    <div
      className={
        'fish-entry-technique grid gap-[5px] min-w-0 text-[13px] [.fish-now-aside_&]:pl-[46px] [.fish-detail-subsection_&]:p-0 [&&&&]:[grid-column:1_/_-1] [&&&&]:[grid-row:3] [&&&&]:p-[0_8px_10px_28px] [&&&&]:leading-[1.45] [.fish-entry[data-conditions="false"]_&&&&]:[grid-row:2] [@media(max-width:_620px)]:[&&&&]:[grid-column:1] [@media(max-width:_620px)]:[&&&&]:[grid-row:3] [@media(max-width:_620px)]:[&&&&]:p-[4px_0_6px_48px] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-column:1_/_-1] [@media(min-width:_480px)_and_(max-width:_620px)]:[.fish-spot-page_&&&&]:[grid-row:3]'
      }
    >
      {steps.map((step, index) => {
        const sourceIds = showAlternatives
          ? step.sourceIds
          : step.sourceIds.slice(0, 1);
        // A single fish used as bait is also a mooch, even without a recorded lead-in step.
        const isMoochStep =
          step.kind === "mooch" ||
          (sourceIds.length > 0 && sourceIds.every((id) => fishById.has(id)));
        const showCatchTarget = hasMoochChain || isMoochStep;
        const targetCondition = step.target?.conditions;
        const hookset = targetCondition?.hookset || "";
        const referenceSpot = spotId ?? fish.locations[0]?.id;
        const observations = sourceIds.map((baitId) => ({
          baitId,
          range: referenceSpot
            ? biteTimes.ranges.get(
                biteTimeKey({
                  fishId: step.targetId,
                  spotId: referenceSpot,
                  baitId,
                }),
              )
            : undefined,
        }));
        return (
          <span
            className={
              "fish-technique-step flex items-center flex-wrap min-w-0 [&&&&]:gap-[5px_16px] [.fish-now-aside_&&&&]:gap-[5px_8px]"
            }
            key={`${index}-${step.targetId}`}
          >
            <span className="fish-technique-label text-muted">
              {isMoochStep
                ? "以小钓大"
                : showAlternatives
                  ? "鱼饵"
                  : "推荐鱼饵"}
            </span>
            <span className="fish-technique-catch inline-flex items-center flex-wrap gap-[4px] min-w-0">
              {sourceIds.length ? (
                sourceIds.map((id, sourceIndex) => {
                  const baitLabel = (
                    <>
                      <TechniqueIcon
                        icon={catalog.itemIcons[id]}
                        fallback={<FishSimple />}
                      />
                      <strong>
                        {catalog.items[id] ||
                          fishById.get(id)?.name ||
                          String(id)}
                      </strong>
                    </>
                  );
                  return (
                    <span
                      className="fish-technique-item inline-flex items-center flex-wrap gap-[4px] min-w-0 [&_strong]:font-semibold"
                      key={id}
                    >
                      {sourceIndex > 0 && (
                        <span className="fish-technique-divider text-muted">
                          /
                        </span>
                      )}
                      {showBaitSources ? (
                        <FishBaitSource baitId={id}>{baitLabel}</FishBaitSource>
                      ) : (
                        baitLabel
                      )}
                      {referenceSpot &&
                        selfMooch.has(
                          selfMoochKey({ fishId: id, spotId: referenceSpot }),
                        ) && (
                          <span
                            className={
                              "fish-technique-loop place-items-center w-[20px] h-[20px] bg-selected text-accent [&_svg]:w-[14px] [&_svg]:h-[14px] [&&&&]:[display:inline-grid] [&&&&]:flex-[0_0_20px] [&&&&]:rounded-[50%]"
                            }
                            role="img"
                            aria-label={`${catalog.items[id] || fishById.get(id)?.name || id}可回转钓起自身`}
                            title="可回转钓起自身"
                          >
                            <ArrowClockwise weight="bold" aria-hidden="true" />
                          </span>
                        )}
                    </span>
                  );
                })
              ) : (
                <strong className="fish-technique-missing text-muted">
                  未收录
                </strong>
              )}
              {showCatchTarget && (
                <>
                  <span className="fish-technique-divider text-muted">钓</span>
                  <span className="fish-technique-item inline-flex items-center flex-wrap gap-[4px] min-w-0 [&_strong]:font-semibold">
                    <TechniqueIcon
                      icon={
                        Number(step.target?.icon) ||
                        catalog.itemIcons[step.targetId]
                      }
                      fallback={<FishSimple />}
                    />
                    <strong>
                      {step.target?.name ||
                        catalog.items[step.targetId] ||
                        step.targetId}
                    </strong>
                  </span>
                </>
              )}
            </span>
            <span
              className={
                "fish-technique-field fish-technique-time inline-flex items-center flex-wrap gap-[4px] min-w-0 [&_>_svg]:place-items-center [&_>_svg]:w-[18px] [&_>_svg]:h-[18px] [&_>_svg]:text-muted [&_strong]:font-semibold [&_>_strong]:inline-flex [&_>_strong]:flex-col [&_>_strong]:gap-[2px] [&_>_strong]:min-w-0 [&_>_strong]:tabular-nums [&&&&_>_svg]:[display:inline-grid] [&&&&_>_svg]:flex-[0_0_18px]"
              }
              title="Teamcraft 社区同钓场、同鱼饵的实测记录；常见范围取样本中间 90%，技能和装备可能影响时间"
            >
              <Clock aria-hidden="true" />
              <span className="fish-technique-label text-muted">咬钩时间</span>
              <strong>
                {!referenceSpot || !observations.length
                  ? "暂无可比数据"
                  : biteTimes.status === "error"
                    ? "暂不可用"
                    : observations.map(({ baitId, range }) => (
                        <span
                          key={baitId}
                          className="fish-technique-time-option block"
                        >
                          {observations.length > 1 &&
                            `${catalog.items[baitId] || fishById.get(baitId)?.name || baitId} `}
                          {
                            /*range
                            ? `${formatBiteTimeRange(range)} · ${range.samples.toLocaleString("zh-CN")} 次记录`
                            : biteTimes.status === "loading"
                              ? "读取中"
                              : "此钓场暂无样本"*/
                            range
                              ? `${formatBiteTimeRange(range)}`
                              : biteTimes.status === "loading"
                                ? "读取中"
                                : "此钓场暂无样本"
                          }
                        </span>
                      ))}
              </strong>
            </span>
            {!targetCondition?.tug && !hookset ? (
              <span className="fish-technique-note text-muted">
                咬钩、提钩资料待补
              </span>
            ) : (
              <>
                <span
                  className={
                    "fish-technique-field inline-flex items-center flex-wrap gap-[4px] min-w-0 [&_>_svg]:place-items-center [&_>_svg]:w-[18px] [&_>_svg]:h-[18px] [&_>_svg]:text-muted [&_strong]:font-semibold [&&&&_>_svg]:[display:inline-grid] [&&&&_>_svg]:flex-[0_0_18px]"
                  }
                >
                  <WaveSine aria-hidden="true" />
                  <span className="fish-technique-label text-muted">咬钩</span>
                  <strong>
                    {tugLabels[targetCondition?.tug || ""] || "待补"}
                  </strong>
                </span>
                <span
                  className={
                    "fish-technique-field inline-flex items-center flex-wrap gap-[4px] min-w-0 [&_>_svg]:place-items-center [&_>_svg]:w-[18px] [&_>_svg]:h-[18px] [&_>_svg]:text-muted [&_strong]:font-semibold [&&&&_>_svg]:[display:inline-grid] [&&&&_>_svg]:flex-[0_0_18px]"
                  }
                >
                  <TechniqueIcon
                    icon={hooksetIcons[hookset]}
                    fallback={<Hand />}
                  />
                  <span className="fish-technique-label text-muted">提钩</span>
                  <strong>{hooksetLabels[hookset] || "待补"}</strong>
                </span>
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}
