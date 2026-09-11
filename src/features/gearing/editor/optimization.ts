/** Convert editor intent to a solver input once, then interpret the numerical result back in TS. */
import type { ItemCatalog } from "./catalog";
import type {
  CombatInput,
  NativeResult,
  PreparedEntry,
} from "./calculation.types";
import type {
  Conditions,
  GearsetDocument,
  Proposal,
  Slot,
  Stats,
} from "./types";
import { configuration } from "./compatibility";
import {
  allowedGrades,
  calculation,
  consumable,
  equipmentStats,
  evaluate,
  prepareGear,
} from "./evaluation";
import { addStats, foodBonus, requiredSpeed } from "./formulas";
export interface PreparedOptimization {
  input: unknown;
  parameters: unknown;
  interpret: (result: NativeResult) => Proposal;
}
export function prepareOptimization(
  catalog: ItemCatalog,
  doc: GearsetDocument,
  c: Conditions,
): PreparedOptimization | Proposal {
  if (!["all", "current"].includes(c.mode) || c.minLevel > c.maxLevel)
    throw new Error("Invalid optimization scope.");
  const before = evaluate(catalog, doc);
  if (before.issues.length)
    throw new Error("Resolve invalid or missing equipment before optimizing.");
  const input = calculation(catalog, doc),
    entries = new Map<number, PreparedEntry>(),
    skipped: number[] = [];
  for (const slot of input.rules.schema.slots) {
    const key = slot.key as Slot,
      current = doc.equipment[key];
    const configs =
      c.mode === "current" || c.kind !== "combat" || current?.equipmentLocked
        ? current
          ? [current]
          : []
        : catalog
            .query({
              job: doc.job,
              slot: key,
              minLevel: c.minLevel,
              maxLevel: c.maxLevel,
              sourceIds: c.sourceIds,
              search: "",
              hideObsolete: true,
              sortStat: "",
              offset: 0,
              limit: 30000,
            })
            .items.filter((item) => !c.excludedItemIds.includes(item.id))
            .map((item) =>
              current?.itemId === item.id ? current : configuration(item.id),
            );
    for (let config of configs) {
      let gear = prepareGear(catalog, input, key, config);
      if (
        c.kind === "combat" &&
        gear.data.customizable &&
        !gear.customRule &&
        !Object.values(config.customStats ?? {}).some((v) => v)
      ) {
        skipped.push(config.itemId);
        continue;
      }
      if (current?.materiaLocked) {
        config = {
          ...config,
          materias: current.materias,
          customStats: current.customStats,
          materiaLocked: true,
        };
        try {
          gear = prepareGear(catalog, input, key, config);
        } catch {
          skipped.push(config.itemId);
          continue;
        }
      }
      if (current?.itemId === config.itemId)
        input.equippedGearIdsBySlot.push([gear.slot, gear.id]);
      input.filteredIds.push(gear.id);
      input.gears.push(gear);
      entries.set(gear.id, {
        key,
        configuration: config,
        item: gear.data,
        gear,
      });
    }
    if (
      c.mode === "all" &&
      c.kind === "combat" &&
      ![...entries.values()].some((e) => e.key === key)
    )
      return {
        status: "unreachable",
        reason: "emptySlot",
        slot: key,
        excludedItems: skipped,
      };
  }
  input.mode = c.mode;
  input.currentFoodId = doc.foodId;
  input.currentDamage = before.effects?.damage ?? 0;
  if (doc.potionId)
    input.fixedConsumables.push(
      consumable(catalog, doc.job, "potion", doc.potionId),
    );
  let payload: unknown;
  if (c.kind === "combat") {
    if (!input.rules.schema.mainStat)
      throw new Error("Combat optimization is unavailable for this job.");
    input.targetGcd = c.targetGcd;
    input.speedRange = c.speedRange;
    input.progressionWeeks = c.progressionWeeks;
    if (c.exactGcd) {
      const maxSpeed = (
        catalog.rules.search as { gcdOptimizationMaxSpeed: number }
      ).gcdOptimizationMaxSpeed;
      const min = requiredSpeed(
        input,
        c.targetGcd,
        catalog.rules.parameters,
        maxSpeed,
      );
      const max =
        requiredSpeed(
          input,
          Math.round(c.targetGcd * 100 - 1) / 100,
          catalog.rules.parameters,
          maxSpeed,
        ) - 1;
      input.speedRange = {
        min: Math.max(min, c.speedRange?.min ?? 0),
        max: Math.min(max, c.speedRange?.max ?? maxSpeed),
      };
    }
    if (c.optimizeFood)
      input.foods = catalog
        .query({
          job: doc.job,
          slot: "food",
          minLevel: 0,
          maxLevel: 9999,
          search: "",
          sourceIds: [],
          hideObsolete: false,
          sortStat: "",
          offset: 0,
          limit: 30000,
        })
        .items.map((item) => catalog.item(item.id));
    else if (doc.foodId)
      input.fixedConsumables.push(
        consumable(catalog, doc.job, "food", doc.foodId),
      );
    payload = input;
  } else if (c.kind === "production")
    payload = productionInput(catalog, doc, input, c);
  else
    payload = {
      baseStats: input.baseStats,
      level: input.rules.level,
      blu: doc.job === "BLU",
      food: doc.foodId ? catalog.item(doc.foodId) : null,
      materias: input.rules.materias,
      gears: input.gears.map((g) => ({
        id: g.id,
        stats: equipmentStats(
          input,
          g.syncCaps || g.materiaLocked ? g : { ...g, materias: [] },
        ),
        caps: g.caps,
        synced: !!g.syncCaps || g.materiaLocked,
        materias: g.materias.map((m, i) => ({
          ...m,
          bestGrade: allowedGrades(catalog, g.data, i)[0],
        })),
      })),
    };
  const parameters = {
    parameters: catalog.rules.parameters,
    search: catalog.rules.search,
    acquisition: catalog.rules.acquisition,
  };
  return {
    input: payload,
    parameters,
    interpret(result) {
      const proposal: Proposal = {
        ...result,
        excludedItems: skipped,
        provenOptimal: result.status === "ok" && !skipped.length,
      };
      if (result.status !== "ok") return proposal;
      const apply = (r: NativeResult) => {
        const next = structuredClone(doc);
        for (const plan of r.plan ?? []) {
          const entry = entries.get(plan.gearId);
          if (!entry) throw new Error("Unknown gear ID in native result.");
          next.equipment[entry.key] = {
            ...structuredClone(entry.configuration),
            ...(plan.materias ? { materias: plan.materias } : {}),
            ...(plan.customStats ? { customStats: plan.customStats } : {}),
          };
        }
        if (c.kind === "combat" && c.optimizeFood)
          next.foodId = r.foodId ?? null;
        return next;
      };
      if (c.kind !== "det-dht") {
        proposal.document = apply(result);
        proposal.evaluation = evaluate(catalog, proposal.document);
      } else {
        proposal.alternatives = (result.solutions ?? []).map((solution) => {
          const next = structuredClone(doc);
          for (const [id, melds] of solution.gearMateriaStats) {
            const entry = entries.get(id);
            if (!entry)
              throw new Error("Unknown gear ID in native distribution.");
            const { key, gear: g } = entry,
              config = next.equipment[key]!;
            config.materias = melds.map((stat, i) => {
              if (!stat) return config.materias[i] ?? {};
              const free =
                !g.syncCaps &&
                !g.materiaLocked &&
                (!g.materias[i]?.stat ||
                  ["DET", "DHT"].includes(g.materias[i].stat!));
              return {
                stat,
                grade: free
                  ? allowedGrades(catalog, g.data, i)[0]
                  : config.materias[i]?.grade,
              };
            });
          }
          return { document: next, evaluation: evaluate(catalog, next) };
        });
        Object.assign(proposal, proposal.alternatives[0]);
      }
      return proposal;
    },
  };
}
function productionInput(
  catalog: ItemCatalog,
  doc: GearsetDocument,
  input: CombatInput,
  c: Conditions,
) {
  const stats = input.rules.schema.stats;
  if (
    stats.length !== 3 ||
    !stats.every((s) => ["CMS", "CRL", "CP", "GTH", "PCP", "GP"].includes(s))
  )
    throw new Error("Invalid production stats.");
  let base = input.baseStats;
  const gears = [];
  for (const g of input.gears) {
    const locked = g.materiaLocked || g.syncCaps;
    const values = equipmentStats(input, locked ? g : { ...g, materias: [] });
    base = addStats(base, values);
    if (!locked)
      gears.push({
        gearId: g.id,
        slot: g.slot,
        baseStats: values,
        caps: g.caps,
        slots: g.materias.map((_, i) => ({
          allowedGrades: allowedGrades(catalog, g.data, i),
        })),
      });
  }
  const foods = [doc.foodId, doc.potionId].flatMap((id) =>
      id ? [catalog.item(id)] : [],
    ),
    targets: Stats = {};
  for (const stat of stats) {
    const target = c.targets[stat] ?? 0;
    if (!Number.isInteger(target) || target < 0 || target > 100000)
      throw new Error("Invalid production target.");
    let low = 0,
      high = target;
    while (low < high) {
      const mid = Math.trunc((low + high) / 2),
        total =
          mid +
          foods.reduce(
            (sum, food) =>
              sum +
              (foodBonus({ [stat]: mid }, food, catalog.rules.parameters)[
                stat
              ] ?? 0),
            0,
          );
      if (total >= target) high = mid;
      else low = mid + 1;
    }
    targets[stat] = Math.max(low, base[stat] ?? 0);
  }
  return {
    stats,
    baseStats: base,
    targets,
    gears,
    materias: input.rules.materias,
  };
}
