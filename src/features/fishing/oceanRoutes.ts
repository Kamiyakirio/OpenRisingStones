/** Join game voyage stops to the catalog without counting a fish twice per route. */
import { compareFishingLogOrder } from "./workspace.ts";
import type { Fish, FishCatalog, OceanRoute, OceanRouteStop } from "./types.ts";

export type OceanRouteGroup = {
  id: number;
  name: string;
  family: OceanRoute["family"];
  variants: OceanRoute[];
  fish: Fish[];
};

export type OceanViewState = {
  family: OceanRoute["family"];
  routeId: number;
  variantId: number;
  stopIndex: number;
  scope: "all" | "missing" | "saved";
};

export const initialOceanViewState: OceanViewState = {
  family: "near",
  routeId: 1,
  variantId: 1,
  stopIndex: 0,
  scope: "all",
};

export const OCEAN_VIEW_KEY = "ors.fishing.ocean.v1";

/** Ignore stale or malformed route preferences without losing valid fields. */
export function parseOceanViewState(value: string | null): OceanViewState {
  try {
    const saved = JSON.parse(value ?? "null");
    if (!saved || typeof saved !== "object") return initialOceanViewState;
    return {
      family: saved.family === "far" ? "far" : "near",
      routeId:
        Number.isInteger(saved.routeId) && saved.routeId > 0
          ? saved.routeId
          : initialOceanViewState.routeId,
      variantId:
        Number.isInteger(saved.variantId) && saved.variantId > 0
          ? saved.variantId
          : initialOceanViewState.variantId,
      stopIndex:
        Number.isInteger(saved.stopIndex) &&
        saved.stopIndex >= 0 &&
        saved.stopIndex < 3
          ? saved.stopIndex
          : initialOceanViewState.stopIndex,
      scope: ["all", "missing", "saved"].includes(saved.scope)
        ? saved.scope
        : "all",
    };
  } catch {
    return initialOceanViewState;
  }
}

export function oceanSpotFish(
  catalog: FishCatalog,
  spotId: number,
  phase?: number,
) {
  return catalog.fish
    .filter(
      (fish) =>
        fish.method === "ocean" &&
        fish.locations.some((location) => location.id === spotId) &&
        (phase == null ||
          !catalog.oceanAvailability[`${spotId}:${fish.id}`] ||
          catalog.oceanAvailability[`${spotId}:${fish.id}`].includes(phase)),
    )
    .sort(compareFishingLogOrder);
}

export function oceanStopFish(catalog: FishCatalog, stop: OceanRouteStop) {
  return {
    main: oceanSpotFish(catalog, stop.mainSpotId, stop.phase),
    spectral: oceanSpotFish(catalog, stop.spectralSpotId, stop.phase),
  };
}

export function oceanRouteFish(catalog: FishCatalog, route: OceanRoute) {
  const fishIds = new Set(
    route.stops.flatMap((stop) => {
      const catches = oceanStopFish(catalog, stop);
      return [...catches.main, ...catches.spectral].map((fish) => fish.id);
    }),
  );
  return catalog.fish
    .filter((fish) => fishIds.has(fish.id))
    .sort(compareFishingLogOrder);
}

export function oceanRouteGroups(catalog: FishCatalog): OceanRouteGroup[] {
  const groups = new Map<string, OceanRouteGroup>();
  for (const route of catalog.oceanRoutes) {
    const key = `${route.family}:${route.name}`;
    const group = groups.get(key) ?? {
      id: route.id,
      name: route.name,
      family: route.family,
      variants: [],
      fish: [],
    };
    group.variants.push(route);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      const ids = new Set(
        group.variants.flatMap((route) =>
          oceanRouteFish(catalog, route).map((fish) => fish.id),
        ),
      );
      return {
        ...group,
        fish: catalog.fish
          .filter((fish) => ids.has(fish.id))
          .sort(compareFishingLogOrder),
      };
    })
    .sort((a, b) => a.id - b.id);
}
