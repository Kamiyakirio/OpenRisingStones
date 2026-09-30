/** Maps character fishing-log sheet rows onto the offline Item-ID catalog. */
import type { FishCatalog, FishProgress } from "./types";

export type GameFishingLog = {
  contentId: string;
  characterName: string;
  caughtFishParameterIds: number[];
  caughtSpearfishingItemIds: number[];
};

export const GAME_LOG_CACHE_KEY = "ors.fishing.gameLog.v1";
export type CachedGameFishingLog = { log: GameFishingLog; capturedAt: number };
export type GameFishingLogCache = {
  activeContentId: string | null;
  entries: Record<string, CachedGameFishingLog>;
};

export const emptyGameFishingLogCache = (): GameFishingLogCache => ({
  activeContentId: null,
  entries: {},
});

/** Reject malformed snapshots before they can replace a character's saved log. */
export function isGameFishingLog(value: unknown): value is GameFishingLog {
  if (!value || typeof value !== "object") return false;
  const log = value as Partial<GameFishingLog>;
  const validIds = (ids: unknown) =>
    Array.isArray(ids) &&
    ids.every((id) => Number.isSafeInteger(id) && id >= 0);
  return (
    typeof log.contentId === "string" &&
    log.contentId.length > 0 &&
    typeof log.characterName === "string" &&
    validIds(log.caughtFishParameterIds) &&
    validIds(log.caughtSpearfishingItemIds)
  );
}

/** Keep one cached fishing log per character, with the last used character active. */
export function parseGameFishingLogCache(
  text: string | null,
): GameFishingLogCache {
  try {
    const value = JSON.parse(text ?? "null");
    if (
      value?.version !== 1 ||
      !value.entries ||
      typeof value.entries !== "object" ||
      Array.isArray(value.entries)
    )
      return emptyGameFishingLogCache();
    const entries: GameFishingLogCache["entries"] = Object.create(null);
    for (const [contentId, entry] of Object.entries(value.entries)) {
      const cached = entry as Partial<CachedGameFishingLog>;
      if (
        isGameFishingLog(cached?.log) &&
        cached.log.contentId === contentId &&
        Number.isSafeInteger(cached.capturedAt) &&
        (cached.capturedAt ?? 0) > 0
      ) {
        entries[contentId] = cached as CachedGameFishingLog;
      }
    }
    const activeContentId =
      typeof value.activeContentId === "string" &&
      Object.hasOwn(entries, value.activeContentId)
        ? value.activeContentId
        : null;
    return { activeContentId, entries };
  } catch {
    return emptyGameFishingLogCache();
  }
}

export function cacheGameFishingLog(
  current: GameFishingLogCache,
  log: GameFishingLog,
  capturedAt: number,
): GameFishingLogCache {
  return {
    activeContentId: log.contentId,
    entries: {
      ...current.entries,
      [log.contentId]: { log, capturedAt },
    },
  };
}

export function serializeGameFishingLogCache(cache: GameFishingLogCache) {
  return JSON.stringify({ version: 1, ...cache });
}

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
