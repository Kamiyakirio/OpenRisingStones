/** Show the short bait, bite, and hookset cues used while scanning fish rows. */
import clsx from "clsx";
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

/** Reused presentation strings stay static and are allocated once for this module. */
const techniqueFieldClasses =
  "fish-technique-field inline-flex min-w-0 flex-wrap items-center gap-1";
const techniqueIconClasses =
  "inline-grid h-4.5 w-4.5 flex-[0_0_18px] place-items-center text-muted";
const techniqueItemClasses =
  "fish-technique-item inline-flex min-w-0 flex-wrap items-center gap-1";

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
      className="fish-technique-icon inline-grid h-4.5 w-4.5 flex-[0_0_18px] place-items-center text-muted"
      aria-hidden="true"
    >
      {icon && !failed ? (
        <img
          className="h-4.5 w-4.5 object-contain"
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
  layout,
}: {
  fish: Fish;
  catalog: FishCatalog;
  fishById: Map<number, Fish>;
  biteTimes: ReturnType<typeof useBiteTimes>;
  selfMooch: ReadonlySet<string>;
  spotId?: number;
  showAlternatives?: boolean;
  showBaitSources?: boolean;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "detail-subsection" | "now-aside" | "spot-page";
}) {
  const condition = fish.conditions;
  // Select complete inset sets so detail resets never compete with row padding utilities.
  const insetClasses =
    layout === "detail-subsection"
      ? "p-0"
      : layout === "now-aside"
        ? "pt-0 pr-0 pb-2.5 pl-13"
        : "pt-0 pr-2 pb-2.5 pl-14 max-[620px]:pt-1 max-[620px]:pr-0 max-[620px]:pb-1.5 max-[620px]:pl-12";
  if (fish.method === "spear") {
    return (
      <div
        className={clsx(
          "fish-entry-technique col-span-full row-start-3 grid min-w-0 gap-[5px] text-[13px] leading-[1.45] group-data-[conditions=false]/fish-entry:row-start-2 max-[620px]:col-start-1 max-[620px]:row-start-3",
          insetClasses,
          layout === "spot-page" &&
            "[@media(min-width:_480px)_and_(max-width:_620px)]:col-span-full [@media(min-width:_480px)_and_(max-width:_620px)]:row-start-3",
        )}
      >
        <span className={techniqueFieldClasses}>
          <FishSimple className={techniqueIconClasses} aria-hidden="true" />
          <span className="fish-technique-label text-muted">鱼影</span>
          <strong className="font-semibold">
            {gigLabels[condition?.gig || ""] || "大小未收录"}
          </strong>
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
      className={clsx(
        "fish-entry-technique col-span-full row-start-3 grid min-w-0 gap-[5px] text-[13px] leading-[1.45] group-data-[conditions=false]/fish-entry:row-start-2 max-[620px]:col-start-1 max-[620px]:row-start-3",
        insetClasses,
        layout === "spot-page" &&
          "[@media(min-width:_480px)_and_(max-width:_620px)]:col-span-full [@media(min-width:_480px)_and_(max-width:_620px)]:row-start-3",
      )}
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
            className={clsx(
              "fish-technique-step flex min-w-0 flex-wrap items-center gap-y-[5px]",
              layout === "now-aside" ? "gap-x-2" : "gap-x-4",
            )}
            key={`${index}-${step.targetId}`}
          >
            <span className="fish-technique-label text-muted">
              {isMoochStep
                ? "以小钓大"
                : showAlternatives
                  ? "鱼饵"
                  : "推荐鱼饵"}
            </span>
            <span className="fish-technique-catch inline-flex min-w-0 flex-wrap items-center gap-1">
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
                    <span className={techniqueItemClasses} key={id}>
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
                          selfMoochKey({
                            fishId: id,
                            spotId: referenceSpot,
                          }),
                        ) && (
                          <span
                            className="fish-technique-loop inline-grid h-5 w-5 flex-[0_0_20px] place-items-center rounded-[50%] bg-selected text-accent"
                            role="img"
                            aria-label={`${catalog.items[id] || fishById.get(id)?.name || id}可回转钓起自身`}
                            title="可回转钓起自身"
                          >
                            <ArrowClockwise
                              className="h-3.5 w-3.5"
                              weight="bold"
                              aria-hidden="true"
                            />
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
                  <span className={techniqueItemClasses}>
                    <TechniqueIcon
                      icon={
                        Number(step.target?.icon) ||
                        catalog.itemIcons[step.targetId]
                      }
                      fallback={
                        <FishSimple className="h-4.5 w-4.5 object-contain" />
                      }
                    />
                    <strong className="font-semibold">
                      {step.target?.name ||
                        catalog.items[step.targetId] ||
                        step.targetId}
                    </strong>
                  </span>
                </>
              )}
            </span>
            <span
              className="fish-technique-field fish-technique-time inline-flex min-w-0 flex-wrap items-center gap-1"
              title="Teamcraft 社区同钓场、同鱼饵的实测记录；常见范围取样本中间 90%，技能和装备可能影响时间"
            >
              <Clock className={techniqueIconClasses} aria-hidden="true" />
              <span className="fish-technique-label text-muted">咬钩时间</span>
              <strong className="inline-flex min-w-0 flex-col gap-0.5 font-semibold tabular-nums">
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
                <span className={techniqueFieldClasses}>
                  <WaveSine
                    className={techniqueIconClasses}
                    aria-hidden="true"
                  />
                  <span className="fish-technique-label text-muted">咬钩</span>
                  <strong className="font-semibold">
                    {tugLabels[targetCondition?.tug || ""] || "待补"}
                  </strong>
                </span>
                <span className={techniqueFieldClasses}>
                  <TechniqueIcon
                    icon={hooksetIcons[hookset]}
                    fallback={<Hand className="h-4.5 w-4.5 object-contain" />}
                  />
                  <span className="fish-technique-label text-muted">提钩</span>
                  <strong className="font-semibold">
                    {hooksetLabels[hookset] || "待补"}
                  </strong>
                </span>
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}
