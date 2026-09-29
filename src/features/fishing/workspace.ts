/** Task-based fish grouping for planning, completion, and direct lookup. */
import {
  filterFish,
  isUnrestricted,
  isWindowOpen,
  sortFish,
  upcomingWindow,
} from "./model.ts";
import type { Fish, FishCatalog, FishProgress, FishFilters } from "./types";

export type FishingCategory = "timed" | "anytime" | "voyage" | "unknown";
export type FishingDiscipline = "fishing" | "spearfishing";
export type NowFishScope = "big" | "all";

/** Fish king and fish emperor are distinct from ocean-voyage rarity labels. */
export function matchesNowFishScope(fish: Fish, scope: NowFishScope) {
  return scope === "all" || fish.kind === "big" || fish.kind === "legendary";
}

/** Completion treats rod and ocean catches as fishing, separate from spear catches. */
export function matchesFishingDiscipline(
  fish: Fish,
  discipline: FishingDiscipline,
) {
  return discipline === "spearfishing"
    ? fish.method === "spear"
    : fish.method !== "spear";
}

/** Full legacy facets remain available beside the task-based top-level category. */
export const initialFishingFacets: FishFilters = {
  query: "",
  kind: "all",
  zone: "",
  progress: "all",
  available: false,
  patches: Array.from({ length: 6 }, (_, i) =>
    Array.from({ length: 6 }, (_, j) => `${i + 2}.${j}`),
  )
    .flat()
    .concat("unknown"),
  kinds: [
    "normal",
    "big",
    "legendary",
    "ocean-rare",
    "ocean-legendary",
    "unknown",
  ],
  waters: ["world", "ocean"],
  methods: ["rod", "spear"],
  restrictions: ["limited", "always"],
  completion: ["caught", "uncaught"],
  fishEyes: false,
  sort: "window",
};

export function fishingCategory(
  fish: Fish,
  catalog: FishCatalog,
  now: number,
): FishingCategory {
  if (fish.method === "ocean") return "voyage";
  if (isUnrestricted(fish)) return "anytime";
  return isWindowOpen(fish, catalog, now) === null ? "unknown" : "timed";
}

export function fishingOpportunities(
  catalog: FishCatalog,
  progress: FishProgress,
  now: number,
) {
  const caught = new Set(progress.caught);
  const open: Fish[] = [];
  const upcoming: Fish[] = [];
  const anytime: Fish[] = [];
  const voyage: Fish[] = [];
  for (const fish of catalog.fish) {
    if (caught.has(fish.id)) continue;
    switch (fishingCategory(fish, catalog, now)) {
      case "timed":
        if (isWindowOpen(fish, catalog, now)) open.push(fish);
        else if (upcomingWindow(fish, catalog, now)) upcoming.push(fish);
        break;
      case "anytime":
        anytime.push(fish);
        break;
      case "voyage":
        voyage.push(fish);
        break;
      case "unknown":
        break;
    }
  }
  open.sort(
    (a, b) =>
      (upcomingWindow(a, catalog, now)?.end ?? Infinity) -
      (upcomingWindow(b, catalog, now)?.end ?? Infinity),
  );
  upcoming.sort(
    (a, b) =>
      (upcomingWindow(a, catalog, now)?.start ?? Infinity) -
      (upcomingWindow(b, catalog, now)?.start ?? Infinity),
  );
  anytime.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return { open, upcoming, anytime, voyage };
}

export type FishingSearch = {
  query: string;
  category: FishingCategory | "all";
  sort: FishFilters["sort"];
};

export function searchFishingCatalog(
  catalog: FishCatalog,
  progress: FishProgress,
  now: number,
  search: FishingSearch,
  facets: FishFilters,
) {
  const query = search.query.trim().toLocaleLowerCase();
  const latinQuery = /^[a-z\s'-]+$/.test(query)
    ? query.replace(/[\s'-]/g, "")
    : "";
  const matching = filterFish(
    catalog,
    { ...facets, query: "", sort: search.sort },
    progress,
    now,
  ).filter((fish) => {
    if (
      search.category !== "all" &&
      fishingCategory(fish, catalog, now) !== search.category
    )
      return false;
    return (
      !query ||
      [
        fish.name,
        fish.nameEn,
        String(fish.id),
        fish.zone,
        ...fish.locations.map((spot) => spot.name),
      ].some((value) => value.toLocaleLowerCase().includes(query)) ||
      Boolean(
        latinQuery &&
        (fish.namePinyin.includes(latinQuery) ||
          fish.nameInitials.includes(latinQuery)),
      )
    );
  });
  return sortFish(matching, catalog, search.sort, now, facets.fishEyes);
}

type FishingGroup = {
  fish: Fish[];
  caught: number;
};

export type FishingSpotGroup = FishingGroup & {
  id: number;
  name: string;
};

export type FishingMapGroup = FishingGroup & {
  id: number;
  name: string;
  spots: FishingSpotGroup[];
};

export type FishingRegionGroup = FishingGroup & {
  name: string;
  maps: FishingMapGroup[];
};

type GroupData = { fish: Map<number, Fish> };
type SpotData = GroupData & { id: number; name: string };
type MapData = GroupData & {
  id: number;
  name: string;
  spots: Map<number, SpotData>;
};
type RegionData = GroupData & { name: string; maps: Map<number, MapData> };

/** Fishing and spearfishing use separate in-game log rows. */
export function compareFishingLogOrder(a: Fish, b: Fish) {
  const logKey = (fish: Fish) =>
    fish.fishParameterId !== null
      ? [0, fish.fishParameterId]
      : fish.spearfishingItemId !== null
        ? [1, fish.spearfishingItemId]
        : [2, fish.id];
  const left = logKey(a);
  const right = logKey(b);
  return left[0] - right[0] || left[1] - right[1] || a.id - b.id;
}

/** A fish may appear at several spots, so each level counts distinct Item IDs. */
export function fishingRegions(
  catalog: FishCatalog,
  progress: FishProgress,
  discipline?: FishingDiscipline,
) {
  const caught = new Set(progress.caught);
  const regions = new Map<string, RegionData>();
  for (const fish of catalog.fish) {
    if (discipline && !matchesFishingDiscipline(fish, discipline)) continue;
    const locations = fish.locations.length
      ? fish.locations
      : [{ id: 0, name: "", region: "", zone: fish.zone, territory: 0 }];
    for (const location of locations) {
      const regionName = location.region || "";
      const region = regions.get(regionName) ?? {
        name: regionName,
        fish: new Map<number, Fish>(),
        maps: new Map<number, MapData>(),
      };
      regions.set(regionName, region);
      const map = region.maps.get(location.territory) ?? {
        id: location.territory,
        name: location.zone,
        fish: new Map<number, Fish>(),
        spots: new Map<number, SpotData>(),
      };
      region.maps.set(location.territory, map);
      const spot = map.spots.get(location.id) ?? {
        id: location.id,
        name: location.name,
        fish: new Map<number, Fish>(),
      };
      map.spots.set(location.id, spot);
      region.fish.set(fish.id, fish);
      map.fish.set(fish.id, fish);
      spot.fish.set(fish.id, fish);
    }
  }
  const finish = (group: GroupData) => {
    const fish = [...group.fish.values()].sort(compareFishingLogOrder);
    return { fish, caught: fish.filter((item) => caught.has(item.id)).length };
  };
  const byMissing = (
    a: FishingGroup & { name: string },
    b: FishingGroup & { name: string },
  ) =>
    b.fish.length - b.caught - (a.fish.length - a.caught) ||
    a.name.localeCompare(b.name, "zh-CN");
  return [...regions.values()]
    .map((region): FishingRegionGroup => ({
      name: region.name,
      ...finish(region),
      maps: [...region.maps.values()]
        .map((map): FishingMapGroup => ({
          id: map.id,
          name: map.name,
          ...finish(map),
          spots: [...map.spots.values()]
            .map((spot): FishingSpotGroup => ({
              id: spot.id,
              name: spot.name,
              ...finish(spot),
            }))
            .sort(byMissing),
        }))
        .sort((a, b) => a.id - b.id),
    }))
    .sort((a, b) => {
      // Keep voyage-only and unplaced groups after the land regions.
      const order = (region: FishingRegionGroup) =>
        !region.name || region.fish.every((fish) => fish.method === "ocean")
          ? Infinity
          : Math.min(...region.maps.map((map) => map.id));
      return order(a) - order(b) || a.name.localeCompare(b.name, "zh-CN");
    });
}
