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
import { biteTimeKey, formatBiteTimeRange } from "./biteTimes";
import { xivIconUrl } from "./iconUrl";
import { gigLabels, hooksetLabels, tugLabels } from "./presentation";
import { fishingCatchSteps } from "./technique";
import { selfMoochKey } from "./selfMooch";
import type { Fish, FishCatalog } from "./types";
import type { useBiteTimes } from "./useBiteTimes";

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
    <span className="fish-technique-icon" aria-hidden="true">
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
      <div className="fish-entry-technique">
        <span className="fish-technique-field">
          <FishSimple aria-hidden="true" />
          <span className="fish-technique-label">鱼影</span>
          <strong>{gigLabels[condition?.gig || ""] || "大小未收录"}</strong>
        </span>
        <span className="fish-technique-note">刺鱼不使用鱼饵或提钩</span>
      </div>
    );
  }

  const steps = fishingCatchSteps(fish, fishById);
  const hasMoochChain = steps.some((step) => step.kind === "mooch");
  return (
    <div className="fish-entry-technique">
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
            className="fish-technique-step"
            key={`${index}-${step.targetId}`}
          >
            <span className="fish-technique-label">
              {isMoochStep
                ? "以小钓大"
                : showAlternatives
                  ? "鱼饵"
                  : "推荐鱼饵"}
            </span>
            <span className="fish-technique-catch">
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
                    <span className="fish-technique-item" key={id}>
                      {sourceIndex > 0 && (
                        <span className="fish-technique-divider">/</span>
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
                            className="fish-technique-loop"
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
                <strong className="fish-technique-missing">未收录</strong>
              )}
              {showCatchTarget && (
                <>
                  <span className="fish-technique-divider">钓</span>
                  <span className="fish-technique-item">
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
              className="fish-technique-field fish-technique-time"
              title="Teamcraft 社区同钓场、同鱼饵的实测记录；常见范围取样本中间 90%，技能和装备可能影响时间"
            >
              <Clock aria-hidden="true" />
              <span className="fish-technique-label">咬钩时间</span>
              <strong>
                {!referenceSpot || !observations.length
                  ? "暂无可比数据"
                  : biteTimes.status === "error"
                    ? "暂不可用"
                    : observations.map(({ baitId, range }) => (
                        <span
                          key={baitId}
                          className="fish-technique-time-option"
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
              <span className="fish-technique-note">咬钩、提钩资料待补</span>
            ) : (
              <>
                <span className="fish-technique-field">
                  <WaveSine aria-hidden="true" />
                  <span className="fish-technique-label">咬钩</span>
                  <strong>
                    {tugLabels[targetCondition?.tug || ""] || "待补"}
                  </strong>
                </span>
                <span className="fish-technique-field">
                  <TechniqueIcon
                    icon={hooksetIcons[hookset]}
                    fallback={<Hand />}
                  />
                  <span className="fish-technique-label">提钩</span>
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
