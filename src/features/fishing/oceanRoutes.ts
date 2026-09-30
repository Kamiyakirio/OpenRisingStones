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

export type OceanRouteTarget =
  | { type: "blue"; fish: Fish }
  | { type: "achievement"; missionType: string; fish: Fish };

type OceanGoal =
  | { type: "blue"; fishId: number }
  | { type: "achievement"; missionType: string; fishId: number };

// These are route objectives, not a ranking by the number of eligible fish.
// Source: https://ffxiv.oceanfishing.boats/indigo/ and /ruby/ (optional objectives).
// Achievement fish IDs are eligible examples used only for their item icons.
const oceanRouteGoals: Record<number, OceanGoal[]> = {
  1: [{ type: "achievement", missionType: "Octopus", fishId: 29734 }],
  2: [
    { type: "blue", fishId: 29788 },
    { type: "blue", fishId: 29791 },
  ],
  3: [
    { type: "achievement", missionType: "Seadragon", fishId: 29740 },
    { type: "blue", fishId: 29789 },
  ],
  4: [{ type: "achievement", missionType: "Jellyfish", fishId: 29739 }],
  5: [
    { type: "achievement", missionType: "Shark", fishId: 28942 },
    { type: "blue", fishId: 29789 },
  ],
  6: [
    { type: "blue", fishId: 29788 },
    { type: "blue", fishId: 29790 },
  ],
  7: [{ type: "achievement", missionType: "Manta", fishId: 32058 }],
  8: [
    { type: "achievement", missionType: "Crab", fishId: 29741 },
    { type: "blue", fishId: 32094 },
  ],
  9: [
    { type: "blue", fishId: 32074 },
    { type: "blue", fishId: 29791 },
  ],
  10: [
    { type: "achievement", missionType: "Fugu", fishId: 32095 },
    { type: "blue", fishId: 29790 },
  ],
  11: [
    { type: "achievement", missionType: "Fugu", fishId: 32095 },
    { type: "achievement", missionType: "Manta", fishId: 32058 },
  ],
  12: [
    { type: "blue", fishId: 32074 },
    { type: "blue", fishId: 32114 },
  ],
  13: [
    { type: "achievement", missionType: "Shellfish", fishId: 40522 },
    { type: "blue", fishId: 40540 },
  ],
  14: [
    { type: "blue", fishId: 40560 },
    { type: "blue", fishId: 40600 },
  ],
  15: [
    { type: "achievement", missionType: "Shellfish", fishId: 40522 },
    { type: "achievement", missionType: "Shrimp", fishId: 40543 },
  ],
  16: [
    { type: "achievement", missionType: "Squid", fishId: 40523 },
    { type: "blue", fishId: 40540 },
  ],
  17: [
    { type: "achievement", missionType: "Squid", fishId: 40523 },
    { type: "blue", fishId: 40560 },
  ],
  18: [
    { type: "achievement", missionType: "Shrimp", fishId: 40543 },
    { type: "blue", fishId: 40580 },
  ],
  19: [
    { type: "achievement", missionType: "MantisShrimp", fishId: 40538 },
    { type: "blue", fishId: 51247 },
  ],
  20: [
    { type: "achievement", missionType: "PrehistoricWavekin", fishId: 40536 },
    { type: "blue", fishId: 51228 },
  ],
  21: [
    { type: "achievement", missionType: "MantisShrimp", fishId: 40538 },
    { type: "blue", fishId: 40540 },
  ],
};

/** Resolve a voyage's curated goals only when their example fish is available. */
export function oceanRouteTargets(
  route: OceanRoute,
  fish: Fish[],
  limit = 2,
): OceanRouteTarget[] {
  const available = new Map(fish.map((item) => [item.id, item]));
  return (oceanRouteGoals[route.id] ?? [])
    .flatMap((goal): OceanRouteTarget[] => {
      const item = available.get(goal.fishId);
      if (!item || (goal.type === "blue" && item.kind !== "ocean-legendary"))
        return [];
      return goal.type === "blue"
        ? [{ type: "blue", fish: item }]
        : [{ type: "achievement", missionType: goal.missionType, fish: item }];
    })
    .slice(0, limit);
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
