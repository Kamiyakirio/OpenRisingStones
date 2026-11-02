/** A spot replaces the directory view; fish details return here first. */

import {
  fishingSectionHeadingClasses,
  fishingSectionDescriptionClasses,
  fishingEmptyClasses,
} from "../utilityClasses";
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { FishingRows, type RowContext } from "./FishingRows";
import { SpotCatchStats } from "./SpotCatchStats";
import type {
  FishingMapGroup,
  FishingRegionGroup,
  FishingSpotGroup,
} from "../utils/workspace";

/** Complete utility strings are shared without adding component CSS rules. */
const spotViewToggleClasses =
  "min-h-9 rounded-control border border-solid border-control bg-surface px-3 py-[5px] text-[13px] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected";

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
  useEffect(
    () =>
      heading.current?.focus({
        preventScroll: true,
      }),
    [spot.id],
  );
  const caughtIds = new Set(context.progress.caught);
  const remaining = spot.fish.filter((fish) => !caughtIds.has(fish.id));
  const visible = showAll ? spot.fish : remaining;
  return (
    <div className="fish-spot-page max-w-280">
      <button
        className="fish-back mb-5 inline-flex min-h-10 items-center gap-2 rounded-control border-0 border-control bg-transparent py-2 pr-3.5 pl-0 text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent pointer-coarse:min-h-11"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft className="h-[19px] w-[19px]" aria-hidden="true" />{" "}
        {backLabel}
      </button>
      <header className="fish-spot-page-heading mb-5 flex flex-wrap items-end justify-between gap-[10px_24px]">
        <div>
          <p className="m-0 text-[13px] text-muted">
            {region.name} / {map.name}
          </p>
          <h1
            className="mx-0 mt-1 mb-0 text-2xl font-bold tracking-tight"
            ref={heading}
            tabIndex={-1}
          >
            {spot.name || "钓场待补"}
          </h1>
        </div>
        <p className="m-0 text-[13px] text-muted tabular-nums">
          已记录 {spot.caught} / {spot.fish.length}
        </p>
      </header>
      {gameLogNotice}
      {spot.fish.some((fish) => fish.method !== "spear") && (
        <SpotCatchStats spotId={spot.id} context={context} />
      )}
      <section className="fish-spot-page-fish mt-7" aria-label="钓场鱼类">
        <header className={fishingSectionHeadingClasses}>
          <div>
            <h2 className="m-0 text-lg font-semibold">鱼类</h2>
            <p className={fishingSectionDescriptionClasses}>
              按图鉴记录顺序排列；图鉴外的鱼排在最后。
            </p>
          </div>
          <div
            className="fish-spot-view-controls inline-flex flex-wrap gap-1.5"
            role="group"
            aria-label="鱼类范围"
          >
            <button
              className={spotViewToggleClasses}
              type="button"
              aria-pressed={!showAll}
              onClick={() => onShowAll(false)}
            >
              未记录 {remaining.length}
            </button>
            <button
              className={spotViewToggleClasses}
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
            layout="spot-page"
          />
        ) : (
          <p className={fishingEmptyClasses}>
            这里的鱼都已记录。可切换到“全部”查看。
          </p>
        )}
      </section>
    </div>
  );
}
