/** Legacy protocol/state adapters are the only place that interprets signed equipment references. */
import * as codec from "../utils/share";
function extractShareCode(input: string) {
  const value = input.trim();
  const code = value.includes("://")
    ? new URL(value).search.slice(1)
    : value.replace(/^\?/, "");
  if (!/^[a-zA-Z0-9]{4,4096}$/.test(code))
    throw new Error("Invalid gearing share code.");
  return code;
}
import type { Equipment, GearsetDocument, Item, Slot } from "./types";
import type { GearingApi } from "./api";
import type { Gearset, Job, JobLevel, GearId, GearsetMaterias } from "../types";
const legacySlots: Record<string, Slot> = {
  1: "mainHand",
  13: "mainHand",
  2: "offHand",
  3: "head",
  4: "body",
  5: "hands",
  6: "waist",
  7: "legs",
  8: "feet",
  9: "ears",
  10: "neck",
  11: "wrists",
  12: "ringLeft",
  "-12": "ringRight",
  17: "soul",
};
export function newDocument(
  name: string,
  job = "SCH",
  jobLevel = 100,
): GearsetDocument {
  return {
    duplicateToolMateria: true,
    formatVersion: 2,
    id: crypto.randomUUID(),
    name,
    job,
    jobLevel,
    clan: 0,
    syncLevel: null,
    equipment: {},
    foodId: null,
    potionId: null,
    alternatives: {},
  };
}
export function configuration(itemId: number): Equipment {
  return {
    itemId,
    materias: [],
    customStats: null,
    equipmentLocked: false,
    materiaLocked: false,
  };
}
export function migrateLegacy(raw: string, name: string): GearsetDocument {
  const value = JSON.parse(raw);
  if (
    value.version !== 1 ||
    !value.snapshot ||
    typeof value.snapshot !== "object"
  )
    throw new Error("Unsupported legacy gearing draft.");
  const snapshot = value.snapshot;
  const doc = newDocument(
    name,
    snapshot.job || "SCH",
    snapshot.jobLevel ?? 100,
  );
  doc.clan = value.clan ?? 0;
  doc.duplicateToolMateria = snapshot.duplicateToolMateria ?? true;
  doc.syncLevel = snapshot.syncLevel ?? null;
  const configs = new Map<string, Equipment>();
  for (const [id, gear] of Object.entries(snapshot.gears ?? {}) as [
    string,
    {
      id: number;
      materias?: Equipment["materias"];
      customStats?: Equipment["customStats"];
    },
  ][]) {
    if (!Number.isSafeInteger(gear.id) || gear.id === 0)
      throw new Error("Invalid legacy equipment ID.");
    configs.set(id, {
      ...configuration(Math.abs(gear.id)),
      materias: gear.materias ?? [],
      customStats: gear.customStats ?? null,
    });
  }
  for (const [slot, id] of Object.entries(snapshot.equippedGears ?? {})) {
    if (id === null || id === undefined) continue;
    if (slot === "-1") {
      doc.foodId = Math.abs(Number(id));
      continue;
    }
    if (slot === "-2") {
      doc.potionId = Math.abs(Number(id));
      continue;
    }
    const key = legacySlots[slot];
    const config = configs.get(String(id));
    if (!key || !config)
      throw new Error("Cannot resolve legacy equipped item.");
    doc.equipment[key] = config;
  }
  // Retain deliberately edited alternatives; plain catalog browsing instances are discarded.
  for (const [id, c] of configs) {
    if (
      !c.materias.some((m) => m.stat) &&
      !Object.keys(c.customStats ?? {}).length
    )
      continue;
    if (Object.values(doc.equipment).some((e) => e === c)) continue;
    // The legacy state stores no reliable slot on each instance; resolve these IDs during migration.
    (doc.alternatives as Record<string, Equipment[]>)[`legacy:${id}`] = [c];
  }
  return doc;
}
export async function resolveLegacyAlternatives(
  doc: GearsetDocument,
  api: GearingApi,
) {
  for (const key of Object.keys(doc.alternatives)) {
    if (!key.startsWith("legacy:")) continue;
    const configs = (doc.alternatives as Record<string, Equipment[]>)[key];
    const [item] = await api.items([configs[0].itemId]);
    const slot =
      key.includes("-") && item.slotKey === "ringLeft"
        ? "ringRight"
        : item.slotKey;
    if (item.kind !== "equipment")
      throw new Error("Unsupported edited legacy consumable.");
    delete (doc.alternatives as Record<string, Equipment[]>)[key];
    doc.alternatives[slot as Slot] = [
      ...(doc.alternatives[slot as Slot] ?? []),
      ...configs,
    ];
  }
  return doc;
}
export async function importShare(
  text: string,
  name: string,
  api: GearingApi,
): Promise<GearsetDocument> {
  const code = extractShareCode(text);
  const parsed = codec.parse(code);
  if (typeof parsed === "string")
    throw new Error("Unsupported legacy share version.");
  if (codec.stringify(parsed) !== code)
    throw new Error("Noncanonical or invalid share code.");
  const doc = newDocument(name, parsed.job, parsed.jobLevel);
  doc.syncLevel = parsed.syncLevel ?? null;
  const definitions = await api.items([
    ...new Set(parsed.gears.map((g) => g.id)),
  ]);
  const items = new Map(definitions.map((i) => [i.id, i]));
  for (const gear of parsed.gears) {
    const item = items.get(gear.id);
    if (!item) throw new Error("Shared item is missing from the catalog.");
    if (item.kind === "food") {
      if (doc.foodId) throw new Error("Duplicate food.");
      doc.foodId = item.id;
      continue;
    }
    if (item.kind === "potion") {
      if (doc.potionId) throw new Error("Duplicate potion.");
      doc.potionId = item.id;
      continue;
    }
    let slot = item.slotKey as Slot;
    if (slot === "ringLeft" && doc.equipment.ringLeft) slot = "ringRight";
    if (doc.equipment[slot]) throw new Error("Duplicate equipment slot.");
    doc.equipment[slot] = {
      ...configuration(item.id),
      materias: gear.materias.map((m) =>
        m ? { stat: m[0], grade: m[1] } : {},
      ),
      customStats: gear.customStats ?? null,
    };
  }
  const { evaluation } = await api.evaluate(doc, 0);
  if (evaluation.issues.length)
    throw new Error("Shared gearset contains invalid equipment.");
  return doc;
}
export function shareDocument(
  doc: GearsetDocument,
  items: Map<number, Item>,
): string {
  const gears: Gearset["gears"] = [];
  const order: Slot[] = [
    "mainHand",
    "offHand",
    "head",
    "body",
    "hands",
    "waist",
    "legs",
    "feet",
    "ears",
    "neck",
    "wrists",
    "ringLeft",
    "ringRight",
    "soul",
  ];
  for (const slot of order) {
    const gear = doc.equipment[slot];
    if (!gear) continue;
    const item = items.get(gear.itemId);
    if (!item) throw new Error("Cannot share unresolved equipment.");
    if (
      gear.itemId >= 60000 ||
      Object.values(gear.customStats ?? {}).some((v) => v! >= 1001)
    )
      throw new Error("This configuration exceeds the share protocol range.");
    const count = item.materiaAdvanced ? 5 : (item.materiaSlot ?? 0);
    const materias = Array.from({ length: count }, (_, i) =>
      gear.materias[i]?.stat
        ? [gear.materias[i].stat!, gear.materias[i].grade!]
        : null,
    ) as GearsetMaterias;
    gears.push({
      id: gear.itemId as GearId,
      materias,
      customStats: item.customizable ? (gear.customStats ?? {}) : undefined,
    });
  }
  for (const id of [doc.foodId, doc.potionId])
    if (id) gears.push({ id: id as GearId, materias: [] });
  if ((doc.syncLevel ?? 0) >= 800)
    throw new Error("Sync level exceeds the share protocol range.");
  const shared: Gearset = {
    job: doc.job as Job,
    jobLevel: doc.jobLevel as JobLevel,
    syncLevel: doc.syncLevel ?? undefined,
    gears,
  };
  const code = codec.stringify(shared);
  if (!code) return code;
  const decoded = codec.parse(code);
  const normalized = (items: Gearset["gears"]) =>
    items
      .map((g) =>
        JSON.stringify({
          id: g.id,
          materias: g.materias,
          customStats: g.customStats
            ? Object.fromEntries(
                Object.entries(g.customStats)
                  .filter(([, v]) => v)
                  .sort(([a], [b]) => a.localeCompare(b)),
              )
            : undefined,
        }),
      )
      .sort();
  if (
    typeof decoded === "string" ||
    JSON.stringify(normalized(decoded.gears)) !==
      JSON.stringify(normalized(shared.gears))
  )
    throw new Error(
      "Some equipment settings cannot be represented by the web share protocol.",
    );
  return code;
}
