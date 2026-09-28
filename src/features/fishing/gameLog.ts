/** Maps character fishing-log sheet rows onto the offline Item-ID catalog. */
import type { FishCatalog, FishProgress } from "./types";

export type GameFishingLog = {
  contentId: string;
  characterName: string;
  caughtFishParameterIds: number[];
  caughtSpearfishingItemIds: number[];
};

export function applyGameFishingLog(
  catalog: FishCatalog,
  manual: FishProgress,
  log: GameFishingLog,
) {
  const rod = new Set(log.caughtFishParameterIds);
  const spear = new Set(log.caughtSpearfishingItemIds);
  const manualCaught = new Set(manual.caught);
  const coveredIds = new Set<number>();
  const caught: number[] = [];
  for (const fish of catalog.fish) {
    const hasRod = fish.fishParameterId !== null;
    const hasSpear = fish.spearfishingItemId !== null;
    if (hasRod || hasSpear) {
      coveredIds.add(fish.id);
      if (
        (hasRod && rod.has(fish.fishParameterId!)) ||
        (hasSpear && spear.has(fish.spearfishingItemId!))
      ) {
        caught.push(fish.id);
      }
    } else if (manualCaught.has(fish.id)) {
      // Entries absent from the game log keep their local manual mark.
      caught.push(fish.id);
    }
  }
  return { progress: { saved: manual.saved, caught }, coveredIds };
}
