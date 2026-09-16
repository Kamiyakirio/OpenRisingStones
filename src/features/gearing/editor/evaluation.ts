/** Local gearset evaluation and solver preparation share item caps, validation and stat resolution. */
import type { ItemCatalog } from "./catalog";
import type {
  CombatInput,
  CustomRule,
  Definition,
  JobDefinition,
  SolverGear,
} from "./calculation.types";
import type {
  Equipment,
  Evaluation,
  GearsetDocument,
  Selection,
  Slot,
  Stat,
  Stats,
} from "./types";
import { parseDocument } from "./document";
import { addStats, effects, foodBonus, truncate } from "./formulas";
import { materiaConsumption } from "./consumption";
export function calculation(
  catalog: ItemCatalog,
  doc: GearsetDocument,
): CombatInput {
  parseDocument(doc);
  const r = catalog.rules,
    schema = r.jobSchemas[doc.job],
    level = r.jobLevelModifiers[doc.jobLevel];
  if (!schema || !level || doc.clan < 0 || doc.clan >= r.clans.length)
    throw new Error("Unsupported job, level or clan.");
  if (
    doc.syncLevel != null &&
    !catalog.tables.levelCaps.level.includes(doc.syncLevel)
  )
    throw new Error("Unsupported item-level sync.");
  const concrete = {
    ...schema,
    slots: schema.slots.filter((s) => s.slot !== undefined && s.slot > 0),
    statModifiers: Object.fromEntries(
      Object.entries(schema.statModifiers ?? {}).filter(
        ([, v]) => typeof v === "number",
      ),
    ),
  };
  const baseStats: Stats = { PDMG: 0, MDMG: 0, DLY: 0 };
  for (const stat of schema.stats) {
    const base = r.baseStats[stat] ?? 0;
    baseStats[stat] =
      typeof base === "number"
        ? base
        : truncate(
            (level[base] * Number(concrete.statModifiers[stat] ?? 100)) / 100,
            r.parameters,
          ) + (r.clanStats[stat]?.[doc.clan] ?? 0);
  }
  return {
    mode: "current",
    targetGcd: 2.5,
    job: doc.job,
    jobLevel: doc.jobLevel,
    syncLevel: doc.syncLevel ?? null,
    baseStats,
    currentDamage: 0,
    currentFoodId: null,
    filteredIds: [],
    equippedGearIdsBySlot: [],
    gears: [],
    foods: [],
    fixedConsumables: [],
    rules: {
      schema: concrete,
      level,
      jobSyncLevel: r.syncLevelOfJobLevels[doc.jobLevel],
      materias: r.materias,
      materiaGrades: r.materiaGrades,
      materiaGradeRequiredLevels: r.materiaGradeRequiredLevels,
      materiaGradeIsRestricted: r.materiaGradeIsRestricted,
      bluMdmgAdditions:
        doc.job === "BLU" ? catalog.tables.bluMdmgAdditions : [],
    },
  };
}
export function caps(
  catalog: ItemCatalog,
  item: Definition,
  level = item.level,
): Stats {
  const t = catalog.tables,
    index = t.levelCaps.level.indexOf(level),
    slot = item.rawSlot ?? item.slot;
  if (index < 0) throw new Error("Missing item level cap.");
  return Object.fromEntries(
    Object.keys(t.levelCaps)
      .filter((s) => !["level", "DLY", "main", "secondary"].includes(s))
      .map((name) => {
        const stat = name as Stat,
          a = t.levelCaps[stat]?.[index],
          b = t.slotCaps[stat]?.[slot],
          c = t.roleCaps[stat]?.[item.role];
        if (a == null || b == null || c == null)
          throw new Error("Missing item cap value.");
        return [
          stat,
          Math.round((a * b * c) / catalog.rules.parameters.capDivisor),
        ];
      }),
  );
}
export function syncedLevel(
  input: CombatInput,
  item: Definition,
): number | null {
  const sync = input.syncLevel ?? Infinity;
  if (sync >= item.level && input.jobLevel >= item.equipLevel) return null;
  const job = Math.min(item.level, input.rules.jobSyncLevel);
  return item.equipLevelVariable
    ? Math.min(sync, job)
    : sync < item.level
      ? sync
      : job;
}
export function allowedGrades(
  catalog: ItemCatalog,
  item: Definition,
  index: number,
): number[] {
  const r = catalog.rules;
  return r.materiaGrades.filter(
    (grade) =>
      grade > 0 &&
      item.level >= r.materiaGradeRequiredLevels[grade - 1] &&
      (index <= (item.materiaSlot ?? 0) || !r.materiaGradeIsRestricted[grade]),
  );
}
export function customRule(
  catalog: ItemCatalog,
  item: Definition,
  schema: JobDefinition,
): CustomRule | null {
  if (!item.customizable) return null;
  const rule = catalog.rules.customWeaponRules.find(
      (r) => r.id === item.weaponFamilyId,
    ),
    allocation = rule?.itemLevels[item.level],
    weight = rule?.slotWeights[item.slot];
  if (!rule || !allocation || !weight) return null;
  const names = rule.statCandidates
    .map((s) =>
      s === "speed"
        ? schema.stats.includes("SPS")
          ? "SPS"
          : "SKS"
        : s === "secondary"
          ? schema.secondaryStat
          : s,
    )
    .filter((s): s is Stat => !!s && schema.stats.includes(s));
  return {
    major: Math.round((allocation.major * weight[0]) / weight[1]),
    minor: Math.round((allocation.minor * weight[0]) / weight[1]),
    statCandidates: [...new Set(names)],
    linkedSlotGroup: rule.linkSlotAllocations ? rule.id : undefined,
  };
}
export function prepareGear(
  catalog: ItemCatalog,
  input: CombatInput,
  key: Slot,
  config: Equipment,
): SolverGear {
  const item = catalog.item(config.itemId),
    slot = input.rules.schema.slots.find((s) => s.key === key)?.slot;
  if (
    !slot ||
    item.kind !== "equipment" ||
    !item.jobs.includes(input.job) ||
    (item.slotKey !== key &&
      !(key === "ringRight" && item.slotKey === "ringLeft"))
  )
    throw new Error("Item and equipment slot or job do not match.");
  if (
    Object.keys(config.customStats ?? {}).some(
      (stat) => !(stat in catalog.rules.statNames),
    )
  )
    throw new Error("Unknown custom stat.");
  const count = item.materiaAdvanced ? 5 : (item.materiaSlot ?? 0);
  if (config.materias.length > count)
    throw new Error("Too many materia slots for this item.");
  const materias = Array.from(
    { length: count },
    (_, i) => config.materias[i] ?? {},
  );
  for (const [index, m] of materias.entries()) {
    if (m.stat === undefined && m.grade === undefined) continue;
    if (
      !m.stat ||
      !m.grade ||
      !input.rules.schema.stats.includes(m.stat) ||
      !catalog.rules.materias[m.stat] ||
      !allowedGrades(catalog, item, index).includes(m.grade)
    )
      throw new Error("Invalid materia stat or grade for this slot.");
  }
  if (!item.customizable && Object.keys(config.customStats ?? {}).length)
    throw new Error("Item does not support custom stats.");
  const sync = syncedLevel(input, item);
  return {
    id: config.itemId * 32 + slot,
    slot,
    data: item,
    materias,
    customStats: config.customStats ?? null,
    caps: caps(catalog, item),
    syncCaps: sync === null ? null : caps(catalog, item, sync),
    customRule: customRule(catalog, item, input.rules.schema),
    acquisition: item.acquisition,
    materiaLocked: config.materiaLocked,
  };
}
export function equipmentStats(input: CombatInput, g: SolverGear): Stats {
  const s: Stats = {},
    concrete = (key: Stat): Stat =>
      key === "main"
        ? (input.rules.schema.mainStat ?? key)
        : key === "secondary"
          ? (input.rules.schema.secondaryStat ?? key)
          : key;
  for (const [name, value] of Object.entries(g.data.stats))
    s[concrete(name as Stat)] = value;
  if (g.data.customizable) Object.assign(s, g.customStats);
  if (g.syncCaps) {
    for (const name of Object.keys(s) as Stat[])
      s[name] = Math.min(s[name]!, g.syncCaps[name] ?? Infinity);
    if (syncedLevel(input, g.data) === 700)
      for (const [name, value] of Object.entries(g.data.occultStats ?? {})) {
        const stat = concrete(name as Stat);
        s[stat] = (s[stat] ?? 0) + value;
      }
  } else
    for (const m of g.materias)
      if (m.stat && m.grade) {
        const base = s[m.stat] ?? 0;
        s[m.stat] = Math.min(
          base + (input.rules.materias[m.stat]?.[m.grade - 1] ?? 0),
          Math.max(base, g.caps[m.stat] ?? 0),
        );
      }
  return s;
}
export function consumable(
  catalog: ItemCatalog,
  job: string,
  kind: "food" | "potion",
  id: number,
): Definition {
  const item = catalog.item(id);
  if (item.kind !== kind || !item.jobs.includes(job))
    throw new Error("Consumable is not valid for this job.");
  return item;
}
export function evaluate(
  catalog: ItemCatalog,
  doc: GearsetDocument,
  showTiers = false,
): Evaluation {
  const input = calculation(catalog, doc),
    schema = input.rules.schema;
  let stats = input.baseStats,
    levelSum = 0,
    weightSum = 0;
  const slots: Evaluation["slots"] = {},
    issues: Evaluation["issues"] = [];
  for (const slot of schema.slots) {
    const key = slot.key as Slot,
      weight = slot.levelWeight ?? 1;
    weightSum += weight;
    const config = doc.equipment[key];
    if (!config) continue;
    try {
      const g = prepareGear(catalog, input, key, config),
        values = equipmentStats(input, g);
      // Compare the same item without melds to respect caps, custom stats and sync.
      const withoutMateria = equipmentStats(input, { ...g, materias: [] });
      const materiaStats: Stats = {};
      for (const stat of Object.keys(values) as Stat[]) {
        const bonus = (values[stat] ?? 0) - (withoutMateria[stat] ?? 0);
        if (bonus > 0) materiaStats[stat] = bonus;
      }
      stats = addStats(stats, values);
      levelSum += g.data.level * weight;
      slots[key] = {
        item: g.data,
        stats: values,
        materiaStats,
        caps: g.caps,
        synced: !!g.syncCaps,
        allowedGrades: g.materias.map((_, i) =>
          allowedGrades(catalog, g.data, i),
        ),
        customRule: g.customRule
          ? {
              major: g.customRule.major,
              minor: g.customRule.minor,
              stats: g.customRule.statCandidates,
              family: g.customRule.linkedSlotGroup,
            }
          : null,
      };
    } catch (error) {
      issues.push({
        slot: key,
        itemId: config.itemId,
        message: String(error instanceof Error ? error.message : error),
      });
    }
  }
  for (const key of Object.keys(doc.equipment))
    if (!schema.slots.some((s) => s.key === key))
      issues.push({
        slot: key as Selection,
        message: "Unsupported equipment slot.",
      });
  const bare = stats;
  for (const [kind, id] of [
    ["food", doc.foodId],
    ["potion", doc.potionId],
  ] as const)
    if (id) {
      try {
        const item = consumable(catalog, doc.job, kind, id);
        // Reuse the applied bonus so inline consumable stats match gearset totals.
        const bonus = foodBonus(bare, item, catalog.rules.parameters);
        stats = addStats(stats, bonus);
        slots[kind] = { item, stats: bonus };
      } catch (error) {
        issues.push({
          slot: kind,
          itemId: id,
          message: String(error instanceof Error ? error.message : error),
        });
      }
    }
  const result = schema.mainStat
    ? effects(input, stats, catalog.rules.parameters)
    : null;
  return {
    stats,
    baseStats: input.baseStats,
    effects: result,
    slots,
    issues,
    itemLevel: weightSum ? Math.floor(levelSum / weightSum) : 0,
    dataVersion: catalog.manifest.dataVersion,
    tiers: showTiers && result ? tiers(catalog, input, stats) : {},
    consumption: materiaConsumption(catalog, doc),
  };
}
function tiers(
  catalog: ItemCatalog,
  input: CombatInput,
  stats: Stats,
): Evaluation["tiers"] {
  return Object.fromEntries(
    input.rules.schema.stats.map((stat) => {
      const effect = (value: number) => {
        const e = effects(
          input,
          { ...stats, [stat]: value },
          catalog.rules.parameters,
        );
        return (
          (
            {
              CRT: e.crtChance,
              DHT: e.dhtChance,
              DET: e.detDamage,
              TEN: e.tenDamage,
              SPS: e.gcd,
              SKS: e.gcd,
              PIE: e.mp,
              VIT: e.hp,
            } as Partial<Record<Stat, number>>
          )[stat] ?? e.damage
        );
      };
      const current = stats[stat] ?? 0,
        baseline = effect(current);
      const delta = (direction: number) => {
        const max = direction < 0 ? current : 20000;
        let high = 1;
        while (high < max && effect(current + direction * high) === baseline)
          high = Math.min(high * 2, max);
        if (!max || effect(current + direction * high) === baseline)
          return null;
        let low = 1;
        while (low < high) {
          const mid = Math.trunc((low + high) / 2);
          if (effect(current + direction * mid) === baseline) low = mid + 1;
          else high = mid;
        }
        return direction * low;
      };
      return [stat, { previous: delta(-1), next: delta(1) }];
    }),
  );
}
