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

export type FishingZone = {
  name: string;
  fish: Fish[];
  caught: number;
};

export function fishingZones(catalog: FishCatalog, progress: FishProgress) {
  const caught = new Set(progress.caught);
  const groups = new Map<string, Fish[]>();
  for (const fish of catalog.fish) {
    const name = fish.zone || "区域未收录";
    const group = groups.get(name) ?? [];
    group.push(fish);
    groups.set(name, group);
  }
  return [...groups].map(([name, fish]) => ({
    name,
    fish,
    caught: fish.filter((item) => caught.has(item.id)).length,
  }));
}
