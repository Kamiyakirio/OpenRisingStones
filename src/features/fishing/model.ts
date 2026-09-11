/** Pure search and weather calculations, using real milliseconds and half-open windows. */
import type { Fish, FishCatalog, FishFilters, FishProgress } from "./types.ts";

export const EORZEA_HOUR = 175000;
const WEATHER_PERIOD = EORZEA_HOUR * 8;
export const PROGRESS_KEY = "ors.fishing.progress.v1";

/** The game's deterministic forecast seed; bitwise operations intentionally use uint32. */
export function forecastTarget(time: number) {
  const seconds = Math.floor(time / 1000);
  const bell = seconds / 175;
  const increment = (bell + 8 - (bell % 8)) % 24;
  const base = Math.floor(seconds / 4200) * 100 + increment;
  const first = ((base << 11) ^ base) >>> 0;
  return (((first >>> 8) ^ first) >>> 0) % 100;
}
export function weatherAt(
  catalog: FishCatalog,
  territory: number,
  time: number,
) {
  const target = forecastTarget(time);
  return catalog.weatherRates[territory]?.find(
    ([, rate]) => target < rate,
  )?.[0];
}
export function eorzeaHour(time: number) {
  return (time / EORZEA_HOUR) % 24;
}

/** Availability means only time/weather eligibility, never a guarantee of catching the fish. */
export function isWindowOpen(
  fish: Fish,
  catalog: FishCatalog,
  time: number,
  fishEyes = false,
): boolean | null {
  const condition = fish.conditions;
  if (!condition || fish.method === "ocean") return null;
  const hour = eorzeaHour(time);
  const { startHour: start, endHour: end } = condition;
  if (start == null || end == null) return null;
  const inTime =
    start === end ||
    (start < end ? hour >= start && hour < end : hour >= start || hour < end);
  if (
    !inTime &&
    !(fishEyes && fish.method === "rod" && condition.fishEyes === true)
  )
    return false;
  if (!condition.weather || !condition.previousWeather) return null;
  if (!condition.weather.length && !condition.previousWeather.length)
    return true;
  const territory = fish.locations[0]?.territory;
  if (territory == null || !catalog.weatherRates[territory]) return null;
  const current = weatherAt(catalog, territory, time);
  const previous = weatherAt(catalog, territory, time - WEATHER_PERIOD);
  return (
    (!condition.weather.length || condition.weather.includes(current!)) &&
    (!condition.previousWeather.length ||
      condition.previousWeather.includes(previous!))
  );
}

/** Fish Eyes changes time eligibility only for explicitly supported rod fish. */
export function isUnrestricted(fish: Fish, fishEyes = false) {
  const c = fish.conditions;
  return (
    fish.method !== "ocean" &&
    Boolean(
      c &&
      ((c.startHour != null &&
        c.endHour != null &&
        (c.startHour === c.endHour ||
          (c.startHour === 0 && c.endHour === 24))) ||
        (fishEyes && fish.method === "rod" && c.fishEyes === true)) &&
      c.weather?.length === 0 &&
      c.previousWeather?.length === 0,
    )
  );
}
export type FishWindow = { start: number; end: number };

/** Scan chronologically and stop once complete windows are found; never invent an end at the search horizon. */
export function nextWindows(
  fish: Fish,
  catalog: FishCatalog,
  now: number,
  limit = 10,
  fishEyes = false,
  horizonDays = 365,
): FishWindow[] {
  const c = fish.conditions;
  if (
    !c ||
    fish.method === "ocean" ||
    c.startHour == null ||
    c.endHour == null ||
    !c.weather ||
    !c.previousWeather ||
    limit <= 0
  )
    return [];
  if (isUnrestricted(fish, fishEyes)) return [{ start: now, end: Infinity }];
  const hours = [...new Set([0, 8, 16, 24, c.startHour, c.endHour])].sort(
    (a, b) => a - b,
  );
  const stop = now + horizonDays * 86400000;
  const windows: FishWindow[] = [];
  let active: number | null = null;
  let point = now;
  const visit = (next: number) => {
    if (isWindowOpen(fish, catalog, point, fishEyes)) {
      active ??= point;
    } else if (active !== null) {
      windows.push({ start: active, end: point });
      active = null;
    }
    point = next;
  };
  for (
    let day = Math.floor(now / (24 * EORZEA_HOUR));
    day * 24 * EORZEA_HOUR < stop;
    day++
  ) {
    for (const hour of hours) {
      const next = (day * 24 + hour) * EORZEA_HOUR;
      if (next <= point) continue;
      if (next > stop) return windows;
      visit(next);
      if (windows.length >= limit) return windows;
    }
  }
  return windows;
}

// A countdown tick reuses the forecast until its next boundary, rather than scanning every fish again.
const forecasts = new WeakMap<
  FishCatalog,
  Map<string, { from: number; until: number; window?: FishWindow }>
>();
export function upcomingWindow(
  fish: Fish,
  catalog: FishCatalog,
  now: number,
  fishEyes = false,
) {
  let cache = forecasts.get(catalog);
  if (!cache) {
    cache = new Map();
    forecasts.set(catalog, cache);
  }
  const key = fish.id + ":" + fishEyes;
  const hit = cache.get(key);
  if (hit && now >= hit.from && now < hit.until) return hit.window;
  const window = nextWindows(fish, catalog, now, 1, fishEyes)[0];
  cache.set(key, {
    from: now,
    until: window
      ? window.start > now
        ? window.start
        : window.end
      : now + WEATHER_PERIOD,
    window,
  });
  return window;
}
export function sortFish(
  fish: Fish[],
  catalog: FishCatalog,
  sort: FishFilters["sort"],
  now: number,
  fishEyes = false,
) {
  const ranks = new Map<number, [number, number]>();
  if (sort === "window")
    for (const item of fish) {
      const w = upcomingWindow(item, catalog, now, fishEyes);
      ranks.set(
        item.id,
        !w
          ? [3, Infinity]
          : !Number.isFinite(w.end)
            ? [2, Infinity]
            : w.start <= now
              ? [0, w.end]
              : [1, w.start],
      );
    }
  return [...fish].sort((a, b) => {
    if (sort === "window") {
      const x = ranks.get(a.id)!;
      const y = ranks.get(b.id)!;
      if (x[0] !== y[0]) return x[0] - y[0];
      if (x[1] !== y[1]) return x[1] - y[1];
    }
    if (sort === "patch" && a.patch !== b.patch)
      return (b.patch ?? -1) - (a.patch ?? -1);
    if (sort === "level" && a.level !== b.level)
      return (b.level ?? -1) - (a.level ?? -1);
    return a.name.localeCompare(b.name, "zh-CN") || a.id - b.id;
  });
}
export function patchGroup(patch: number | null) {
  return patch == null
    ? "unknown"
    : (Math.floor((patch + 0.00001) * 10) / 10).toFixed(1);
}
export function filterFish(
  catalog: FishCatalog,
  filters: FishFilters,
  progress: FishProgress,
  now: number,
) {
  const query = filters.query.trim().toLocaleLowerCase();
  const includes = (values: string[] | undefined, value: string) =>
    !values || values.includes(value);
  return catalog.fish.filter(
    (fish) =>
      includes(filters.patches, patchGroup(fish.patch)) &&
      includes(filters.kinds, fish.kind) &&
      includes(filters.waters, fish.method === "ocean" ? "ocean" : "world") &&
      includes(filters.methods, fish.method === "spear" ? "spear" : "rod") &&
      includes(
        filters.completion,
        progress.caught.includes(fish.id) ? "caught" : "uncaught",
      ) &&
      includes(
        filters.restrictions,
        isUnrestricted(fish) ? "always" : "limited",
      ) &&
      (!query ||
        [
          fish.name,
          fish.nameEn,
          String(fish.id),
          fish.zone,
          ...fish.locations.map((spot) => spot.name),
        ].some((value) => value.toLocaleLowerCase().includes(query))) &&
      (filters.kind === "all" ||
        (filters.kind === "collectable"
          ? fish.collectable
          : filters.kind === "aquarium"
            ? Boolean(fish.aquarium)
            : fish.kind === filters.kind)) &&
      (!filters.zone ||
        fish.zone === filters.zone ||
        fish.locations.some((spot) => spot.zone === filters.zone)) &&
      (filters.progress === "all" ||
        (filters.progress === "saved"
          ? progress.saved.includes(fish.id)
          : filters.progress === "caught"
            ? progress.caught.includes(fish.id)
            : !progress.caught.includes(fish.id))) &&
      (!filters.available ||
        isWindowOpen(fish, catalog, now, filters.fishEyes) === true),
  );
}
export function parseProgress(text: string | null): FishProgress {
  try {
    const value = JSON.parse(text || "{}");
    const ids = (value: unknown) =>
      Array.isArray(value)
        ? [
            ...new Set(
              value.filter(
                (id): id is number => Number.isSafeInteger(id) && id > 0,
              ),
            ),
          ]
        : [];
    return { saved: ids(value?.saved), caught: ids(value?.caught) };
  } catch {
    return { saved: [], caught: [] };
  }
}
