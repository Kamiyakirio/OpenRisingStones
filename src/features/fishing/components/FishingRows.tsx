/** Share the fish row and its spot-specific bite data across fishing tasks. */

import { fishingBiteErrorClasses } from "../utilityClasses";
import { FishingRow } from "./FishingRow";
import { FishBaitSourceProvider } from "./FishBaitSource";
import { useBiteTimes } from "../hooks/useBiteTimes";
import { useSelfMooch } from "../hooks/useSelfMooch";
import type { Fish, FishCatalog, FishProgress } from "../types";

/** Complete utility strings are shared without adding component CSS rules. */
const rowsRetryButtonClasses =
  "ml-1.5 min-h-10 rounded-control border border-solid border-control bg-surface px-3.5 py-2 text-accent underline transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11";

export type RowContext = {
  catalog: FishCatalog;
  fishById: Map<number, Fish>;
  progress: FishProgress;
  now: number;
  fishEyes: boolean;
  gameCoveredIds: Set<number>;
  gameLogActive: boolean;
  onOpen: (fish: Fish, triggerId: string, spotId?: number) => void;
  onToggleSaved: (id: number) => void;
};
export function FishingRows({
  fish,
  idPrefix,
  context,
  showLocation = true,
  showConditions = true,
  inSpectralCurrent = false,
  showTiming = true,
  spotId,
  showNextCountdown = false,
  layout,
}: {
  fish: Fish[];
  idPrefix: string;
  context: RowContext;
  showLocation?: boolean;
  showConditions?: boolean;
  inSpectralCurrent?: boolean;
  showTiming?: boolean;
  spotId?: number;
  showNextCountdown?: boolean;
  layout?: "now-aside" | "spot-page";
}) {
  const caught = new Set(context.progress.caught);
  const saved = new Set(context.progress.saved);
  const biteTimes = useBiteTimes(fish, context.fishById, spotId, true);
  const selfMooch = useSelfMooch(fish, context.fishById, spotId, true);
  return (
    <FishBaitSourceProvider catalog={context.catalog}>
      <div className="fish-entry-list border-t border-solid border-line">
        {biteTimes.status === "error" && (
          <p className={fishingBiteErrorClasses} role="status">
            咬钩时间暂时无法读取。
            <button
              className={rowsRetryButtonClasses}
              type="button"
              onClick={biteTimes.retry}
            >
              重试
            </button>
          </p>
        )}
        {selfMooch.status === "error" && (
          <p className={fishingBiteErrorClasses} role="status">
            回转记录暂时无法读取。
            <button
              className={rowsRetryButtonClasses}
              type="button"
              onClick={selfMooch.retry}
            >
              重试
            </button>
          </p>
        )}
        {fish.map((item) => (
          <FishingRow
            key={item.id}
            fish={item}
            catalog={context.catalog}
            fishById={context.fishById}
            biteTimes={biteTimes}
            selfMooch={selfMooch.confirmed}
            spotId={spotId}
            now={context.now}
            fishEyes={context.fishEyes}
            caught={caught.has(item.id)}
            saved={saved.has(item.id)}
            gameManaged={context.gameCoveredIds.has(item.id)}
            gameLogActive={context.gameLogActive}
            idPrefix={idPrefix}
            showLocation={showLocation}
            showConditions={showConditions}
            inSpectralCurrent={inSpectralCurrent}
            showTiming={showTiming}
            showNextCountdown={showNextCountdown}
            onOpen={context.onOpen}
            onToggleSaved={context.onToggleSaved}
            layout={layout}
          />
        ))}
      </div>
    </FishBaitSourceProvider>
  );
}
