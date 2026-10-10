/** Share the fish row and its spot-specific bite data across fishing tasks. */
import { FishingRow } from "./FishingRow";
import { FishBaitSourceProvider } from "./FishBaitSource";
import { useBiteTimes } from "../hooks/useBiteTimes";
import { useSelfMooch } from "../hooks/useSelfMooch";
import type { Fish, FishCatalog, FishProgress } from "../types";

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
}) {
  const caught = new Set(context.progress.caught);
  const saved = new Set(context.progress.saved);
  const biteTimes = useBiteTimes(fish, context.fishById, spotId, true);
  const selfMooch = useSelfMooch(fish, context.fishById, spotId, true);
  return (
    <FishBaitSourceProvider catalog={context.catalog}>
      <div className="fish-entry-list border-t border-solid border-line">
        {biteTimes.status === "error" && (
          <p
            className={
              "fish-bite-error text-muted text-[13px] [&_button]:ml-[6px] [&_button]:text-accent [&&&&]:m-[10px_0] [&&&&]:p-[0_8px] [&&&&_button]:[text-decoration:underline]"
            }
            role="status"
          >
            咬钩时间暂时无法读取。
            <button type="button" onClick={biteTimes.retry}>
              重试
            </button>
          </p>
        )}
        {selfMooch.status === "error" && (
          <p
            className={
              "fish-bite-error text-muted text-[13px] [&_button]:ml-[6px] [&_button]:text-accent [&&&&]:m-[10px_0] [&&&&]:p-[0_8px] [&&&&_button]:[text-decoration:underline]"
            }
            role="status"
          >
            回转记录暂时无法读取。
            <button type="button" onClick={selfMooch.retry}>
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
          />
        ))}
      </div>
    </FishBaitSourceProvider>
  );
}
