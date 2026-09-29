/** Convert the game's 144-voyage rotation into upcoming local departure times. */
import type { FishCatalog, OceanRoute } from "./types.ts";

const TWO_HOURS = 2 * 60 * 60 * 1000;
export const OCEAN_BOARDING_MS = 15 * 60 * 1000;
// The observed 2026-09-29 10:00 UTC voyage is rotation row 108 in the game sheet.
const ANCHOR_TIME = Date.UTC(2026, 8, 29, 10);
const ANCHOR_ROW = 108;

export type OceanDeparture = {
  at: number;
  near: OceanRoute;
  far: OceanRoute;
};

export function upcomingOceanDepartures(
  catalog: FishCatalog,
  now: number,
  count = 12,
): OceanDeparture[] {
  const routes = new Map(catalog.oceanRoutes.map((route) => [route.id, route]));
  const first =
    (Math.floor((now - OCEAN_BOARDING_MS) / TWO_HOURS) + 1) * TWO_HOURS;
  const result: OceanDeparture[] = [];
  for (let index = 0; index < count; index++) {
    const at = first + index * TWO_HOURS;
    const row =
      (((ANCHOR_ROW + (at - ANCHOR_TIME) / TWO_HOURS) %
        catalog.oceanRouteTable.length) +
        catalog.oceanRouteTable.length) %
      catalog.oceanRouteTable.length;
    const pair = catalog.oceanRouteTable[row];
    const near = routes.get(pair.nearRouteId);
    const far = routes.get(pair.farRouteId);
    if (near && far) result.push({ at, near, far });
  }
  return result;
}
