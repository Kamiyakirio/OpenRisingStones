/** A spot replaces the directory view; fish details return here first. */
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { FishingRows, type RowContext } from "./FishingRows";
import { SpotCatchStats } from "./SpotCatchStats";
import type {
  FishingMapGroup,
  FishingRegionGroup,
  FishingSpotGroup,
} from "../utils/workspace";

export function FishingSpotPage({
  region,
  map,
  spot,
  context,
  gameLogNotice,
  showAll,
  onShowAll,
  backLabel = "返回钓场列表",
  onBack,
}: {
  region: FishingRegionGroup;
  map: FishingMapGroup;
  spot: FishingSpotGroup;
  context: RowContext;
  gameLogNotice: ReactNode;
  showAll: boolean;
  onShowAll: (showAll: boolean) => void;
  backLabel?: string;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), [spot.id]);
  const caughtIds = new Set(context.progress.caught);
  const remaining = spot.fish.filter((fish) => !caughtIds.has(fish.id));
  const visible = showAll ? spot.fish : remaining;
  return (
    <div className="fish-spot-page max-w-[1120px]">
      <button
        className={
          "fish-back [.fishing-workspace_&]:inline-flex [.fishing-workspace_&]:items-center [.fishing-workspace_&]:gap-[8px] [.fishing-workspace_&]:mb-[20px] [.fishing-workspace_&]:pl-0 [.fishing-workspace_&]:border-0 [.fishing-workspace_&]:text-accent [&_svg]:w-[19px] [&_svg]:h-[19px] [.fishing-workspace_&&&&]:[background:transparent]"
        }
        type="button"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" /> {backLabel}
      </button>
      <header
        className={
          "fish-spot-page-heading flex justify-between flex-wrap mb-[20px] [&_p]:m-0 [&_p]:text-muted [&_p]:text-[13px] [&_>_p]:tabular-nums [&&&&]:[align-items:end] [&&&&]:gap-[10px_24px] [&&&&_h1]:m-[4px_0_0]"
        }
      >
        <div>
          <p>
            {region.name} / {map.name}
          </p>
          <h1
            className="text-2xl font-bold tracking-tight"
            ref={heading}
            tabIndex={-1}
          >
            {spot.name || "钓场待补"}
          </h1>
        </div>
        <p>
          已记录 {spot.caught} / {spot.fish.length}
        </p>
      </header>
      {gameLogNotice}
      {spot.fish.some((fish) => fish.method !== "spear") && (
        <SpotCatchStats spotId={spot.id} context={context} />
      )}
      <section className="fish-spot-page-fish mt-[28px]" aria-label="钓场鱼类">
        <header
          className={
            "fish-section-heading [&_p]:text-muted flex items-baseline justify-between flex-wrap mb-[14px] [&_h2]:m-0 [&_h2]:text-lg [&_p]:text-[13px] [.fish-ocean-fish-section_&_h3]:m-0 [.fish-ocean-fish-section_&_h3]:text-lg [&&&&]:gap-[8px_20px] [&&&&_p]:m-[2px_0_0] [&&&&_p]:leading-[1.5]"
          }
        >
          <div>
            <h2 className="text-lg font-semibold">鱼类</h2>
            <p>按图鉴记录顺序排列；图鉴外的鱼排在最后。</p>
          </div>
          <div
            className={
              "fish-spot-view-controls inline-flex flex-wrap gap-[6px] [.fishing-workspace_&_button]:min-h-[36px] [.fishing-workspace_&_button]:text-[13px] [.fishing-workspace_&&&&_button]:p-[5px_12px]"
            }
            role="group"
            aria-label="鱼类范围"
          >
            <button
              type="button"
              aria-pressed={!showAll}
              onClick={() => onShowAll(false)}
            >
              未记录 {remaining.length}
            </button>
            <button
              type="button"
              aria-pressed={showAll}
              onClick={() => onShowAll(true)}
            >
              全部 {spot.fish.length}
            </button>
          </div>
        </header>
        {visible.length ? (
          <FishingRows
            fish={visible}
            idPrefix={`spot-${spot.id}`}
            context={context}
            showLocation={false}
            spotId={spot.id}
          />
        ) : (
          <p
            className={
              "fish-inline-empty m-0 text-muted [&&&&]:p-[24px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
            }
          >
            这里的鱼都已记录。可切换到“全部”查看。
          </p>
        )}
      </section>
    </div>
  );
}
