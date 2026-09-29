/** Restore lookup filters from local storage without trusting stale saved shapes. */
import {
  initialFishingFacets,
  type FishingSearch,
  type NowFishScope,
} from "./workspace.ts";
import type { FishFilters } from "./types.ts";

export const FISHING_FILTERS_KEY = "ors.fishing.filters.v1";
export const FISHING_NOW_SCOPE_KEY = "ors.fishing.now.scope.v1";

export function parseNowFishScope(value: string | null): NowFishScope {
  return value === "all" ? "all" : "big";
}

export const initialFishingSearch: FishingSearch = {
  query: "",
  category: "all",
  sort: "window",
};

export type FishingFilterPreferences = {
  search: FishingSearch;
  facets: FishFilters;
};

const fallback: FishingFilterPreferences = {
  search: initialFishingSearch,
  facets: initialFishingFacets,
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function oneOf(
  value: unknown,
  options: readonly string[],
  defaultValue: string,
) {
  return typeof value === "string" && options.includes(value)
    ? value
    : defaultValue;
}

function selected(
  value: unknown,
  options: readonly string[],
  defaultValue: string[],
) {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    return defaultValue;
  }
  return [...new Set(value.filter((item) => options.includes(item)))];
}

function selectedPatches(value: unknown) {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    return initialFishingFacets.patches;
  }
  return [
    ...new Set(
      value.filter((item) => item === "unknown" || /^\d+\.\d+$/.test(item)),
    ),
  ];
}

export function parseFishingFilterPreferences(
  text: string | null,
): FishingFilterPreferences {
  if (!text) return fallback;
  try {
    const saved: unknown = JSON.parse(text);
    if (
      !saved ||
      typeof saved !== "object" ||
      !("version" in saved) ||
      saved.version !== 1
    ) {
      return fallback;
    }
    const value = record(saved);
    const search = record(value.search);
    const facets = record(value.facets);
    const sort = oneOf(
      search.sort,
      ["window", "name", "patch", "level"],
      initialFishingSearch.sort,
    ) as FishingSearch["sort"];
    return {
      search: {
        query: typeof search.query === "string" ? search.query : "",
        category: oneOf(
          search.category,
          ["all", "timed", "anytime", "voyage", "unknown"],
          "all",
        ) as FishingSearch["category"],
        sort,
      },
      facets: {
        ...initialFishingFacets,
        query: "",
        kind: oneOf(facets.kind, ["all", "collectable", "aquarium"], "all"),
        zone: typeof facets.zone === "string" ? facets.zone : "",
        progress: oneOf(
          facets.progress,
          ["all", "saved", "caught", "uncaught"],
          "all",
        ),
        available:
          typeof facets.available === "boolean" ? facets.available : false,
        patches: selectedPatches(facets.patches),
        kinds: selected(
          facets.kinds,
          initialFishingFacets.kinds,
          initialFishingFacets.kinds,
        ),
        waters: selected(
          facets.waters,
          initialFishingFacets.waters,
          initialFishingFacets.waters,
        ),
        methods: selected(
          facets.methods,
          initialFishingFacets.methods,
          initialFishingFacets.methods,
        ),
        restrictions: selected(
          facets.restrictions,
          initialFishingFacets.restrictions,
          initialFishingFacets.restrictions,
        ),
        completion: selected(
          facets.completion,
          initialFishingFacets.completion,
          initialFishingFacets.completion,
        ),
        fishEyes:
          typeof facets.fishEyes === "boolean" ? facets.fishEyes : false,
        sort,
      },
    };
  } catch {
    return fallback;
  }
}
