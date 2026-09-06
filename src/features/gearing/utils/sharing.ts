/** Decode compatible base62 shares and validate every item before modifying a draft. */
import * as mst from "mobx-state-tree";
import * as G from "./game.ts";
import { parse, stringify } from "./share.ts";
import type { IStore } from "../models/index.ts";
import { gearData, loadGearDataOfGearId } from "../api/gearData.ts";

export function readShareCode(input: string) {
  const value = input.trim();
  const code = value.includes("://")
    ? new URL(value).search.slice(1)
    : value.replace(/^\?/, "");
  if (!/^[a-zA-Z0-9]{4,4096}$/.test(code))
    throw new Error("Invalid gearing share code.");
  return code;
}
export async function importGearingShare(store: IStore, input: string) {
  const code = readShareCode(input),
    set = parse(code);
  if (typeof set === "string" || !set || !(set.job in G.jobSchemas))
    throw new Error("Unsupported gearing share version.");
  if (set.gears.length > 20 || !(set.jobLevel in G.jobLevelModifiers))
    throw new Error("Invalid gearset metadata.");
  await Promise.all(
    set.gears
      .filter((g) => !gearData.has(g.id))
      .map((g) => loadGearDataOfGearId(g.id)),
  );
  const snapshot: Partial<mst.SnapshotOut<IStore>> = {
    mode: "view",
    job: set.job,
    jobLevel: set.jobLevel,
    syncLevel: set.syncLevel,
    gears: {},
    equippedGears: {},
  };
  const occupied = new Set<number>();
  for (const gear of set.gears) {
    const data = gearData.get(gear.id);
    if (!data || !G.jobCategories[data.jobCategory]?.[set.job])
      throw new Error(`Missing or incompatible item: ${gear.id}`);
    const slot = occupied.has(data.slot) && data.slot === 12 ? -12 : data.slot;
    if (
      occupied.has(slot) ||
      !G.jobSchemas[set.job].slots.some((s) => s.slot === slot)
    )
      throw new Error("Duplicate or incompatible equipment slot.");
    occupied.add(slot);
    const id = slot === -12 ? -gear.id : gear.id;
    const materias = gear.materias.map((m) => {
      if (m !== null && (!G.materias[m[0]] || !G.materiaGrades.includes(m[1])))
        throw new Error("Invalid materia in share code.");
      return { stat: m?.[0], grade: m?.[1] };
    });
    if (materias.length > 5) throw new Error("Too many materia slots.");
    snapshot.gears![id] = {
      id: id as G.GearId,
      materias,
      customStats: gear.customStats,
    };
    snapshot.equippedGears![slot] = id;
  }
  // Validate serialization before the single mutation; malformed codes leave the current draft intact.
  if (stringify(set) !== code)
    throw new Error("Noncanonical or invalid gearing share code.");
  mst.applySnapshot(store, snapshot);
}
