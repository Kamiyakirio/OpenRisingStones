/** A spot replaces the directory view; fish details return here first. */
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { FishingRows, type RowContext } from "./FishingRows";
import { SpotCatchStats } from "./SpotCatchStats";
import type {
  FishingMapGroup,
  FishingRegionGroup,
  FishingSpotGroup,
} from "./workspace";

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
    <div className="fish-spot-page">
      <button className="fish-back" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> {backLabel}
      </button>
      <header className="fish-spot-page-heading">
        <div>
          <p>
            {region.name} / {map.name}
          </p>
          <h1 ref={heading} tabIndex={-1}>
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
      <section className="fish-spot-page-fish" aria-label="钓场鱼类">
        <header className="fish-section-heading">
          <div>
            <h2>鱼类</h2>
            <p>按图鉴记录顺序排列；图鉴外的鱼排在最后。</p>
          </div>
          <div
            className="fish-spot-view-controls"
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
          <p className="fish-inline-empty">
            这里的鱼都已记录。可切换到“全部”查看。
          </p>
        )}
      </section>
    </div>
  );
}
