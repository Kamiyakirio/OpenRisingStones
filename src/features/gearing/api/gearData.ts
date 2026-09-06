/** Explicitly initialized, shared item cache; no global reactive lifecycle. */
import * as mobx from "mobx";
import type * as G from "../utils/game.ts";
import foods from "../data/generated/foods.json";
import recent from "../data/generated/gears-recent.json";
import groups from "../data/generated/gearGroups.json";
import basis from "../data/generated/gearGroupBasis.json";

export const gearData = mobx.observable.map<G.GearId, G.GearBase>(
  {},
  { deep: false },
);
const pending = mobx.observable.set<string>();
const completed = new Set<string>();
const requests = new Map<string, Promise<void>>();
export const gearDataError = mobx.observable.box<string | undefined>();
export const gearDataLoading = mobx.computed(() => pending.size > 0);
export const gearDataOrdered = mobx.computed(() =>
  Array.from(gearData.values()).sort(
    (a, b) => a.level - b.level || a.id - b.id,
  ),
);
const modules = import.meta.glob<{ default: G.GearBase[] }>([
  "../data/generated/gears-*.json",
  "!../data/generated/gears-recent.json",
]);

export function initializeGearData() {
  if (gearData.size) return;
  mobx.runInAction(() => {
    for (const item of [...foods, ...recent] as unknown as G.GearBase[])
      gearData.set(item.id, item);
  });
  completed.add(String(basis.at(-1)));
}
export function loadGearData(
  groupId: string | number | undefined,
): Promise<void> {
  initializeGearData();
  if (groupId === undefined)
    return Promise.reject(new Error("Unknown gear data group."));
  const key = String(groupId);
  if (completed.has(key)) return Promise.resolve();
  if (requests.has(key)) return requests.get(key)!;
  const load = modules[`../data/generated/gears-${key}.json`];
  if (!load)
    return Promise.reject(new Error(`Missing gear data group: ${key}`));
  mobx.runInAction(() => {
    pending.add(key);
    gearDataError.set(undefined);
  });
  const request = load()
    .then(({ default: items }) => {
      mobx.runInAction(() => {
        for (const item of items)
          if (!gearData.has(item.id)) gearData.set(item.id, item);
      });
      completed.add(key);
    })
    .catch((error) => {
      mobx.runInAction(() =>
        gearDataError.set(
          error instanceof Error ? error.message : "Could not load gear data.",
        ),
      );
      throw error;
    })
    .finally(() => {
      requests.delete(key);
      mobx.runInAction(() => pending.delete(key));
    });
  requests.set(key, request);
  return request;
}
export function loadGearDataOfGearId(id: G.GearId) {
  initializeGearData();
  // Food is bundled separately and intentionally has no equipment-group index.
  if (gearData.has(Math.abs(id) as G.GearId)) return Promise.resolve();
  return loadGearData(groups[Math.abs(id)] ?? undefined);
}
export function loadGearDataOfLevelRange(min: number, max: number) {
  for (let i = 0; i < basis.length; i++) {
    if (basis[i] <= max && (basis[i + 1] === undefined || basis[i + 1] > min))
      void loadGearData(basis[i]).catch(() => {});
  }
}
