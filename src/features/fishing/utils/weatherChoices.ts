/** Shorten weather lists only when a spot's complete weather set is known. */
import type { Fish, FishCatalog } from "../types.ts";

/** Multiple locations need the same weather set before a shared row can exclude any. */
export function fishingWeatherTypes(
  fish: Fish,
  catalog: FishCatalog,
  spotId?: number,
): number[] | undefined {
  const locations =
    spotId == null
      ? fish.locations
      : fish.locations.filter((spot) => spot.id === spotId);
  const choices = locations.map((spot) =>
    fish.method === "ocean"
      ? catalog.oceanWeatherTypes?.[spot.id]
      : catalog.weatherRates[spot.territory]
          // Rates are cumulative; equal adjacent thresholds never produce weather.
          ?.filter(
            ([, threshold], index, rates) =>
              threshold > (rates[index - 1]?.[1] ?? 0),
          )
          .map(([id]) => id),
  );
  const first = choices[0];
  if (
    !first?.length ||
    choices.some(
      (ids) =>
        !ids ||
        ids.length !== first.length ||
        ids.some((id) => !first.includes(id)),
    )
  )
    return undefined;
  return [...new Set(first)];
}

/** Preserve unknown sets and short positive lists instead of guessing exclusions. */
export function summarizeWeatherChoices(
  allowed: number[],
  possible?: number[],
): { ids: number[]; excluded: boolean } {
  const ids = [...new Set(allowed)];
  if (
    ids.length < 3 ||
    !possible?.length ||
    ids.some((id) => !possible.includes(id))
  )
    return { ids, excluded: false };
  const excluded = [...new Set(possible)].filter((id) => !ids.includes(id));
  return excluded.length > 0 && excluded.length < ids.length
    ? { ids: excluded, excluded: true }
    : { ids, excluded: false };
}
