/** Gearing domain module adapted from ffxiv-gearing (MIT); see licenses/ffxiv-gearing. */
import * as mobx from "mobx";
import * as mst from "mobx-state-tree";
import * as G from "../utils/game.ts";
import * as share from "../utils/share.ts";
import {
  floor,
  Setting,
  Promotion,
  GearUnion,
  GearUnionReference,
  gearData,
  gearDataOrdered,
  gearDataLoading,
  loadGearDataOfGearId,
  loadGearDataOfLevelRange,
} from ".";
import type { IGear, IFood, IGearUnion } from ".";
import {
  cancelGcdOptimizationNative,
  optimizeGcdNative,
} from "../api/optimization.ts";
import { calcEffects } from "../utils/gcdOptimizationFormula.ts";
import type {
  GcdOptimizationGearInput,
  GcdOptimizationInput,
  GcdOptimizationMode,
  GcdOptimizationResult,
  GcdOptimizationSpeedRange,
} from "../optimization.types.ts";

import type {
  ProductionMateriaOptimizationInput,
  ProductionMateriaOptimizationResult,
  ProductionMateriaStat,
} from "../production.types.ts";
import {
  cancelProductionMateriaOptimizationNative,
  optimizeProductionMateriaNative,
} from "../api/optimization.ts";

export type Mode = "edit" | "view";

export type FilterFocus = "no" | "melded" | "comparable";

function createGcdOptimizationGearInput(gear: IGear): GcdOptimizationGearInput {
  return {
    id: gear.id,
    slot: gear.slot,
    data: gear.data as G.Gear,
    materias: gear.materias.map((materia) => ({
      stat: materia.stat,
      grade: materia.grade,
    })),
    customStats: gear.customStats?.toJSON() as G.Stats | undefined,
  };
}

function createGcdOptimizationInput(
  self: Pick<
    IStore,
    | "job"
    | "jobLevel"
    | "schema"
    | "syncLevel"
    | "baseStats"
    | "equippedEffects"
    | "equippedGears"
    | "filteredIds"
    | "gears"
    | "productionMateriaBaseStats"
  >,
  targetGcd: number,
  mode: GcdOptimizationMode,
  candidateGearIds?: readonly G.GearId[],
  progressionWeeks?: number,
  speedRange?: GcdOptimizationSpeedRange,
): GcdOptimizationInput {
  const filteredIds = candidateGearIds ?? (self.filteredIds as G.GearId[]);
  const gears = new Map<G.GearId, GcdOptimizationGearInput>();
  const addGear = (gear: IGearUnion | undefined) => {
    if (gear === undefined || gear.isFood) return;
    gears.set(gear.id, createGcdOptimizationGearInput(gear));
  };

  for (const gearId of filteredIds) {
    addGear(self.gears.get(gearId.toString()) as IGearUnion | undefined);
  }

  const equippedGearIdsBySlot: [number, G.GearId][] = [];
  let currentFoodId: G.GearId | undefined;
  const fixedConsumables: G.Food[] = [];
  for (const [slotKey, gear] of self.equippedGears.entries()) {
    if (gear === undefined) continue;
    const slot = Number(slotKey);
    if (gear.isFood) {
      if (slot === -1) currentFoodId = gear.id;
      else fixedConsumables.push(gear.data as G.Food);
      continue;
    }
    addGear(gear);
    equippedGearIdsBySlot.push([slot, gear.id]);
  }

  const foods: G.Food[] = [];
  for (const item of gearData.values()) {
    if (
      item.slot === -1 &&
      G.jobCategories[item.jobCategory][self.job as G.Job]
    ) {
      foods.push(item as G.Food);
    }
  }

  return {
    mode,
    targetGcd,
    speedRange,
    progressionWeeks,
    job: self.job!,
    jobLevel: self.jobLevel,
    syncLevel: self.syncLevel,
    baseStats: self.baseStats,
    currentDamage: self.equippedEffects?.damage ?? 0,
    currentFoodId,
    filteredIds: Array.from(filteredIds),
    equippedGearIdsBySlot,
    gears: Array.from(gears.values()),
    foods,
    fixedConsumables,
  };
}

function createProductionMateriaOptimizationInput(
  self: Pick<
    IStore,
    | "job"
    | "jobLevel"
    | "schema"
    | "syncLevel"
    | "baseStats"
    | "equippedEffects"
    | "equippedGears"
    | "filteredIds"
    | "gears"
    | "productionMateriaBaseStats"
  >,
  targets: G.Stats,
): ProductionMateriaOptimizationInput | ProductionMateriaOptimizationResult {
  if (self.job === undefined)
    return { status: "error", message: "Select a job before optimizing." };
  const stats = self.schema.stats as ProductionMateriaStat[];
  if (
    stats.length !== 3 ||
    !stats.every((stat) =>
      ["CMS", "CRL", "CP", "GTH", "PCP", "GP"].includes(stat),
    )
  ) {
    return {
      status: "error",
      message: "This job does not support production optimization.",
    };
  }
  const input: ProductionMateriaOptimizationInput = {
    stats: stats as ProductionMateriaOptimizationInput["stats"],
    baseStats: self.productionMateriaBaseStats,
    targets,
    gears: [],
  };
  for (const gear of self.equippedGears.values() as Iterable<
    IGearUnion | undefined
  >) {
    if (
      gear === undefined ||
      gear.isFood ||
      gear.syncedLevel !== undefined ||
      gear.materias.length === 0
    )
      continue;
    const baseStats: G.Stats = {};
    for (const stat of stats) {
      baseStats[stat] = gear.customizable
        ? (gear.customStats?.get(stat) ?? gear.bareStats[stat] ?? 0)
        : (gear.bareStats[stat] ?? 0);
    }
    input.gears.push({
      gearId: gear.id,
      slot: gear.slot,
      baseStats,
      caps: gear.caps,
      slots: gear.materias.map((materia) => ({
        allowedGrades: G.materiaGrades.filter(
          (grade) =>
            gear.level >= G.materiaGradeRequiredLevels[grade - 1] &&
            (materia.canRestricted || !G.materiaGradeIsRestricted[grade]),
        ),
      })),
    });
  }
  return input;
}

function isProductionMateriaResult(
  value:
    ProductionMateriaOptimizationInput | ProductionMateriaOptimizationResult,
): value is ProductionMateriaOptimizationResult {
  return "status" in value;
}

export const Store = mst.types
  .model("Store", {
    mode: mst.types.optional(mst.types.string as mst.ISimpleType<Mode>, "edit"),
    job: mst.types.maybe(mst.types.string as mst.ISimpleType<G.Job>),
    jobLevel: mst.types.optional(
      mst.types.number as mst.ISimpleType<G.JobLevel>,
      100,
    ),
    minLevel: mst.types.optional(mst.types.number, 0),
    maxLevel: mst.types.optional(mst.types.number, 0),
    minLevelIncoming: mst.types.maybe(mst.types.number),
    maxLevelIncoming: mst.types.maybe(mst.types.number),
    syncLevel: mst.types.maybe(mst.types.number),
    filterFocus: mst.types.optional(
      mst.types.string as mst.ISimpleType<FilterFocus>,
      "no",
    ),
    showAllMaterias: mst.types.optional(mst.types.boolean, false),
    showAllFoods: mst.types.optional(mst.types.boolean, false),
    showAllPotions: mst.types.optional(mst.types.boolean, false),
    duplicateToolMateria: mst.types.optional(mst.types.boolean, true),
    gears: mst.types.map(GearUnion),
    equippedGears: mst.types.map(GearUnionReference),
  })
  .volatile(() => ({
    setting: Setting.create(),
    promotion: Promotion.create(),
    clan: 0,
    tiersShown: false,
    materiaOverallActiveTab: 0,
    autoSelectScheduled: false,
    gcdOptimizationGearSelectionActive: false,
    gcdOptimizationSelectedGearIds: [] as G.GearId[],
  }))
  .views((self) => ({
    get filteredIds(): G.GearId[] {
      console.debug("filteredIds");
      if (self.job === undefined) return [];
      if (self.mode === "view") {
        return Array.from(self.gears.keys(), (id) => Number(id) as G.GearId);
      }
      const unobservableEquippedGears = mobx.untracked(() =>
        self.equippedGears.toJSON(),
      );
      const ret: G.GearId[] = [];
      for (const gear of gearDataOrdered.get()) {
        const { job, minLevel, maxLevel } = self;
        if (
          G.jobCategories[gear.jobCategory][job!] &&
          (gear.slot === -1
            ? self.showAllFoods || "best" in gear // Foods
            : gear.slot === -2
              ? self.showAllPotions || "best" in gear // Potions
              : gear.slot === 17 ||
                (gear.slot === 2 && job === "FSH") || // Soul crystal and spearfishing gig
                (gear.level >= minLevel &&
                  gear.level <= maxLevel &&
                  !(gear.obsolete && self.setting.hideObsoleteGears)))
        ) {
          ret.push(gear.id);
          if (gear.slot === 12) {
            ret.push(-gear.id as G.GearId);
          }
        } else {
          if (unobservableEquippedGears[gear.slot] === gear.id) {
            ret.push(gear.id);
          }
          if (unobservableEquippedGears[-gear.slot] === -gear.id) {
            ret.push(-gear.id as G.GearId);
          }
        }
      }
      return ret;
    },
  }))
  .views((self) => ({
    get loadingStatus() {
      return gearDataLoading.get()
        ? self.minLevelIncoming !== undefined ||
          self.maxLevelIncoming !== undefined
          ? "appending" // keep rendered when loading
          : "loading"
        : "ready";
    },
    get isViewing(): boolean {
      return self.mode === "view";
    },
    get schema(): G.JobSchema {
      if (self.job === undefined) throw new ReferenceError();
      return G.jobSchemas[self.job];
    },
    get groupedGears(): { [index: number]: IGearUnion[] } {
      console.debug("groupedGears");
      const ret: { [index: number]: IGearUnion[] } = {};
      for (const gearId of self.filteredIds) {
        const gear = self.gears.get(gearId.toString())!;
        if (!gear.isFood && !gear.isMelded) {
          if (self.filterFocus === "melded" && !gear.isEquipped) continue;
          if (self.filterFocus === "comparable") continue;
        }
        if (!(gear.slot in ret)) {
          ret[gear.slot] = [];
        }
        ret[gear.slot].push(gear);
      }
      return ret;
    },
    get baseStats(): G.Stats {
      if (self.job === undefined) return {};
      const levelModifier = G.jobLevelModifiers[self.jobLevel];
      const stats: G.Stats = { PDMG: 0, MDMG: 0, DLY: 0 };
      for (const stat of this.schema.stats as G.Stat[]) {
        const baseStat = G.baseStats[stat] ?? 0;
        if (typeof baseStat === "number") {
          stats[stat] = baseStat;
        } else {
          stats[stat] =
            floor(
              (levelModifier[baseStat] *
                ((this.schema.statModifiers as G.Stats | undefined)?.[stat] ??
                  100)) /
                100,
            ) + (G.clanStats[stat]?.[self.clan] ?? 0);
        }
      }
      return stats;
    },
    get equippedStatsWithoutFood(): G.Stats {
      if (self.job === undefined) return {};
      const stats: G.Stats = { ...this.baseStats };
      for (const gear of self.equippedGears.values()) {
        if (gear === undefined) continue;
        if (!gear.isFood) {
          for (const stat of Object.keys(gear.stats) as G.Stat[]) {
            stats[stat] = stats[stat]! + gear.stats[stat]!;
          }
        }
      }
      return stats;
    },
    get productionMateriaBaseStats(): G.Stats {
      if (self.job === undefined) return {};
      const stats: G.Stats = { ...this.baseStats };
      for (const gear of self.equippedGears.values()) {
        if (gear === undefined || gear.isFood) continue;
        for (const stat of this.schema.stats as G.Stat[]) {
          const value = gear.customizable
            ? (gear.customStats?.get(stat) ?? gear.bareStats[stat] ?? 0)
            : (gear.bareStats[stat] ?? 0);
          stats[stat] = (stats[stat] ?? 0) + value;
        }
      }
      return stats;
    },
    get productionMateriaMaximumStats(): G.Stats {
      const stats: G.Stats = { ...this.productionMateriaBaseStats };
      if (self.job === undefined) return stats;
      for (const stat of this.schema.stats as G.Stat[]) {
        if (!(stat in G.materias)) continue;
        for (const gear of self.equippedGears.values()) {
          if (
            gear === undefined ||
            gear.isFood ||
            gear.syncedLevel !== undefined
          )
            continue;
          const base = gear.customizable
            ? (gear.customStats?.get(stat) ?? gear.bareStats[stat] ?? 0)
            : (gear.bareStats[stat] ?? 0);
          let raw = 0;
          for (const materia of gear.materias) {
            const grade = G.materiaGrades.find(
              (candidate) =>
                gear.level >= G.materiaGradeRequiredLevels[candidate - 1] &&
                (materia.canRestricted ||
                  !G.materiaGradeIsRestricted[candidate]),
            );
            if (grade !== undefined) raw += G.materias[stat]![grade - 1];
          }
          stats[stat] =
            (stats[stat] ?? 0) +
            Math.max(0, Math.min(raw, (gear.caps[stat] ?? 0) - base));
        }
      }
      return stats;
    },
    get equippedStats(): G.Stats {
      console.debug("equippedStats");
      if (self.job === undefined) return {};
      const stats = { ...this.equippedStatsWithoutFood };
      for (const slot of ["-1", "-2"]) {
        const equippedFood = self.equippedGears.get(slot) as IFood;
        if (equippedFood === undefined) continue;
        for (const stat of Object.keys(
          this.equippedStatsWithoutFood,
        ) as G.Stat[]) {
          stats[stat] =
            (stats[stat] ?? 0) + (equippedFood.effectiveStats[stat] ?? 0);
        }
      }
      return stats;
    },
    get equippedLevel(): number {
      let level = 0;
      let weight = 0;
      for (const slot of this.schema.slots) {
        level +=
          (self.equippedGears.get(slot.slot)?.level ?? 0) *
          (slot.levelWeight ?? 1);
        weight += slot.levelWeight ?? 1;
      }
      return floor(level / weight);
    },
    get isMateriaNamesSameWidth(): boolean {
      let lastWidth = -1;
      for (const gear of self.equippedGears.values()) {
        if (gear === undefined || gear.isFood) continue;
        for (const { name } of gear.materias) {
          if (name.length === 0) continue;
          let width = 0;
          for (let i = 0; i < name.length; i++) {
            width += name.charCodeAt(i) < 0x100 ? 1 : 2;
          }
          if (lastWidth !== -1 && width !== lastWidth) return false;
          lastWidth = width;
        }
      }
      return true;
    },
    get materiaConsumption() {
      const consumption: {
        [index in G.Stat]?: {
          [index in G.MateriaGrade]?: {
            safe: number;
            expectation: number;
            confidence90: number;
            confidence99: number;
            rates: number[];
          };
        };
      } = {};
      for (const gear of self.equippedGears.values()) {
        if (gear === undefined || gear.isFood) continue;
        const duplicates =
          (self.duplicateToolMateria &&
            (gear.slot === 1 || gear.slot === 2) &&
            this.schema.toolMateriaDuplicates) ||
          1;
        for (const materia of gear.materias) {
          if (materia.stat === undefined) continue;
          const consumptionStat = (consumption[materia.stat] ??= {});
          const consumptionItem = (consumptionStat[materia.grade!] ??= {
            safe: 0,
            expectation: 0,
            confidence90: 0,
            confidence99: 0,
            rates: [],
          });
          for (let i = 0; i < duplicates; i++) {
            if (materia.successRate === 100) {
              consumptionItem.safe += 1;
            } else {
              consumptionItem.expectation += 100 / materia.successRate!;
              consumptionItem.rates.push(materia.successRate! / 100);
            }
          }
        }
      }
      let advancedItemCount = 0;
      for (const consumptionOfStat of Object.values(consumption)) {
        for (const consumptionItem of Object.values(consumptionOfStat!)) {
          if (consumptionItem!.rates.length > 0) {
            advancedItemCount++;
          }
        }
      }
      const p90 = 0.9 ** (1 / advancedItemCount);
      const p99 = 0.99 ** (1 / advancedItemCount);
      const thresholds90: {
        pBelow: number;
        pAbove: number;
        increase: () => void;
      }[] = [];
      const thresholds99: {
        pBelow: number;
        pAbove: number;
        increase: () => void;
      }[] = [];
      for (const consumptionOfStat of Object.values(consumption)) {
        for (const consumptionItem of Object.values(consumptionOfStat!)) {
          consumptionItem!.expectation =
            consumptionItem!.safe + Math.round(consumptionItem!.expectation);
          const p = consumptionItem!.rates;
          if (p.length === 0) {
            consumptionItem!.confidence90 = consumptionItem!.confidence99 =
              consumptionItem!.safe;
            continue;
          }
          const pp: number[][] = p.map((pi) => [1, 1 - pi]); // pp[i][j] = (1 - p[i]) ** j, for caching
          const ps: Float64Array[] = []; // ps[n][i]: success rate of using n materias to meld slots p[i..]
          let n = 1;
          let n90 = 0;
          while (true) {
            for (let i = 0; i < p.length; i++) {
              pp[i][n] = pp[i][n - 1] * pp[i][1];
            }
            ps[n] = new Float64Array(p.length);
            ps[n][p.length - 1] = 1 - pp[p.length - 1][n];
            for (let i = p.length - 2; i >= 0; i--) {
              if (p.length - i > n) break;
              ps[n][i] = 0;
              for (let j = 1; j <= n - (p.length - i) + 1; j++) {
                ps[n][i] += pp[i][j - 1] * p[i] * ps[n - j][i + 1];
              }
            }
            if (ps[n][0] > p90 && n90 === 0) n90 = n;
            if (ps[n][0] > p99) break;
            n++;
          }
          consumptionItem!.confidence90 = consumptionItem!.safe + n90 - 1;
          consumptionItem!.confidence99 = consumptionItem!.safe + n - 1;
          thresholds90.push({
            pBelow: ps[n90 - 1][0],
            pAbove: ps[n90][0],
            increase: () => consumptionItem!.confidence90++,
          });
          thresholds99.push({
            pBelow: ps[n - 1][0],
            pAbove: ps[n][0],
            increase: () => consumptionItem!.confidence99++,
          });
        }
      }
      for (const [threshold, pTarget] of [
        [thresholds90, 0.9],
        [thresholds99, 0.99],
      ] as const) {
        threshold.sort((a, b) => a.pBelow - b.pBelow);
        let pOverall = 1;
        for (const entry of threshold) {
          pOverall *= entry.pBelow;
        }
        for (const entry of threshold) {
          entry.increase();
          pOverall = (pOverall / entry.pBelow) * entry.pAbove;
          if (pOverall > pTarget) break;
        }
      }
      return consumption;
    },
    get syncLevelText(): number | string | undefined {
      if (self.syncLevel !== undefined) {
        return self.syncLevel.toString();
      }
      if (self.jobLevel !== this.schema.jobLevel) {
        return self.jobLevel + "级";
      }
    },
    get clanText(): string {
      return `${G.races[floor(self.clan / 2)]} - ${G.clans[self.clan]}`;
    },
  }))
  .views((self) => ({
    get equippedStatsText(): string {
      let stats = self.schema.stats;
      if (stats[0] === "STR" || stats[0] === "DEX") {
        stats = stats.concat("PDMG", "DLY");
      }
      if (stats[0] === "INT" || stats[0] === "MND") {
        stats = stats.concat("MDMG");
      }
      return stats
        .map((stat) => {
          const value = self.equippedStats[stat]!;
          return `${G.statNames[stat]} ${stat !== "DLY" ? value : (value / 1000).toFixed(2)}`;
        })
        .join("\n");
    },
    get equippedEffects() {
      console.debug("equippedEffects");
      if (self.job === undefined) return;
      return calcEffects(
        self.equippedStats,
        self.baseStats,
        self.job,
        self.jobLevel,
        self.schema,
      );
    },
    get equippedTiers():
      { [index in G.Stat]?: { prev: number; next: number } } | undefined {
      if (self.job === undefined) return;
      const current = calcEffects(
        self.equippedStats,
        self.baseStats,
        self.job,
        self.jobLevel,
        self.schema,
      );
      if (!current) return;
      const fields: Partial<Record<G.Stat, (keyof typeof current)[]>> = {
        CRT: ["crtChance", "crtDamage"],
        DET: ["detDamage"],
        DHT: ["dhtChance"],
        TEN: ["tenDamage", "tenMitigation"],
        SKS: ["gcd"],
        SPS: ["gcd"],
        PIE: ["mp"],
      };
      const result: { [index in G.Stat]?: { prev: number; next: number } } = {};
      // Derive thresholds from the same parameterized formula instead of duplicating coefficients.
      for (const stat of self.schema.stats) {
        const keys = fields[stat];
        if (!keys || self.equippedStats[stat] === undefined) continue;
        const search = (direction: number) => {
          for (let delta = 1; delta <= 20000; delta++) {
            const candidate = calcEffects(
              {
                ...self.equippedStats,
                [stat]: self.equippedStats[stat]! + direction * delta,
              },
              self.baseStats,
              self.job!,
              self.jobLevel,
              self.schema,
            )!;
            if (keys.some((key) => candidate[key] !== current[key]))
              return direction * delta;
          }
          return undefined;
        };
        const prev = search(-1),
          next = search(1);
        if (prev !== undefined && next !== undefined)
          result[stat] = { prev, next };
      }
      return result;
    },
    get share(): string {
      if (self.job === undefined) return "";
      const gears: G.Gearset["gears"] = [];
      for (const slot of self.schema.slots) {
        const gear = self.equippedGears.get(slot.slot.toString());
        if (gear === undefined) continue;
        gears.push({
          id: gear.data.id,
          materias:
            gear.isFood || gear.syncedLevel !== undefined
              ? []
              : gear.materias.map((m) =>
                  m.stat !== undefined ? [m.stat, m.grade!] : null,
                ),
          customStats: (gear as IGear).customStats?.toJSON(),
        });
      }
      return share.stringify({
        job: self.job!,
        jobLevel: self.jobLevel,
        syncLevel: self.syncLevel,
        gears,
      });
    },
    get shareUrl(): string {
      return this.share;
    },
    get garlandGroup(): string {
      if (self.job === undefined) return "";
      const parts = [
        self.schema.name,
        self.equippedLevel,
        " ",
        new Date().toLocaleString(),
        "{",
      ];
      for (const slot of self.schema.slots) {
        if (slot.slot === 17 || (slot.slot === 2 && self.job === "FSH"))
          continue;
        const gear = self.equippedGears.get(slot.slot.toString());
        if (gear === undefined) continue;
        if (gear.data.id === parts.at(-2)) {
          // same rings
          parts.splice(-1, 0, "+2");
        } else {
          parts.push("item/");
          parts.push(gear.data.id);
          parts.push("|");
        }
      }
      parts[parts.length - 1] = "}";
      return `#group/${encodeURI(parts.join(""))}`;
    },
    get title(): string | undefined {
      const suffix = "最终幻想14配装器";
      if (self.job === undefined) return suffix;
      if (self.loadingStatus !== "ready") return undefined;
      const glance =
        self.schema.mainStat !== undefined
          ? `il${self.equippedLevel}/${this.equippedEffects?.gcd.toFixed(2)}s`
          : self.schema.stats.map((s) => self.equippedStats[s]).join("/");
      return `${self.schema.name}(${glance}) - ${suffix}`;
    },
  }))
  .actions((self) => ({
    createGears(): void {
      console.debug("createGears");
      for (const gearId of self.filteredIds) {
        if (!self.gears.has(gearId.toString())) {
          self.gears.put(GearUnion.create({ id: gearId }));
        }
      }
    },
    setMode(mode: Mode): void {
      self.mode = mode;
    },
    setJob(job: G.Job): void {
      const oldSchema = self.job && G.jobSchemas[self.job];
      const newSchema = G.jobSchemas[job];
      self.job = job;
      if (
        newSchema.jobLevel !== oldSchema?.jobLevel ||
        !newSchema.levelSyncable
      ) {
        self.jobLevel = newSchema.jobLevel;
        self.syncLevel = undefined;
      }
      if (newSchema.defaultItemLevel !== oldSchema?.defaultItemLevel) {
        self.minLevel = newSchema.defaultItemLevel[0];
        self.maxLevel = newSchema.defaultItemLevel[1];
        self.minLevelIncoming = undefined;
        self.maxLevelIncoming = undefined;
      }
      for (const [key, gear] of self.equippedGears.entries()) {
        if (gear !== undefined && !gear.jobs[job]) {
          self.equippedGears.delete(key);
        }
      }
      self.autoSelectScheduled = newSchema.skeletonGears ?? false;
    },
    setMinLevel(level: number): void {
      self.minLevelIncoming = level;
    },
    setMaxLevel(level: number): void {
      self.maxLevelIncoming = level;
    },
    submitIncomingLevels(): void {
      if (self.minLevelIncoming !== undefined) {
        self.minLevel = self.minLevelIncoming;
        self.minLevelIncoming = undefined;
      }
      if (self.maxLevelIncoming !== undefined) {
        self.maxLevel = self.maxLevelIncoming;
        self.maxLevelIncoming = undefined;
      }
    },
    setSyncLevel(
      level: number | undefined,
      jobLevel: G.JobLevel | undefined,
    ): void {
      self.syncLevel = level;
      self.jobLevel = jobLevel ?? self.schema.jobLevel;
    },
    setFilterFocus(filterFocus: FilterFocus) {
      self.filterFocus = filterFocus;
    },
    setMateriaOverallActiveTab(activeTab: number) {
      self.materiaOverallActiveTab = activeTab;
    },
    startGcdOptimizationGearSelection(gearIds: G.GearId[]) {
      self.gcdOptimizationSelectedGearIds = gearIds;
      self.gcdOptimizationGearSelectionActive = true;
    },
    stopGcdOptimizationGearSelection() {
      self.gcdOptimizationGearSelectionActive = false;
    },
    setGcdOptimizationSelectedGearIds(gearIds: G.GearId[]) {
      self.gcdOptimizationSelectedGearIds = gearIds;
    },
    toggleGcdOptimizationGearSelection(gearId: G.GearId) {
      if (self.gcdOptimizationSelectedGearIds.includes(gearId)) {
        self.gcdOptimizationSelectedGearIds =
          self.gcdOptimizationSelectedGearIds.filter((id) => id !== gearId);
      } else {
        const selectedIds = new Set(
          self.gcdOptimizationSelectedGearIds.concat(gearId),
        );
        self.gcdOptimizationSelectedGearIds = self.filteredIds.filter((id) =>
          selectedIds.has(id),
        );
      }
    },
    setMateriaDetDhtOptimization(
      gearMateriaStats: Map<G.GearId, G.Stat[]>,
    ): void {
      for (const [gearId, materiaStats] of gearMateriaStats.entries()) {
        const gear = self.gears.get(String(gearId)) as IGear;
        for (let i = 0; i < gear.materias.length; i++) {
          const materia = gear.materias[i];
          materia.stat = materiaStats[i];
          if (materia.stat === "DET" || materia.stat === "DHT") {
            materia.grade = materia.meldableGrades[0];
          }
        }
      }
    },
    optimizeGcdAsync(
      targetGcd: number,
      mode: GcdOptimizationMode,
      candidateGearIds?: G.GearId[],
      progressionWeeks?: number,
      speedRange?: GcdOptimizationSpeedRange,
    ): Promise<GcdOptimizationResult> {
      if (self.job === undefined)
        return Promise.resolve({
          status: "error",
          message: "Select a job before optimizing.",
        });
      if (self.loadingStatus !== "ready")
        return Promise.resolve({
          status: "error",
          message: "Gear data is still loading.",
        });
      const input = createGcdOptimizationInput(
        self,
        targetGcd,
        mode,
        candidateGearIds,
        progressionWeeks,
        speedRange,
      );
      console.log("optimizeGcdAsync params:", JSON.stringify(input));
      return optimizeGcdNative(input) as Promise<GcdOptimizationResult>;
    },
    cancelGcdOptimization(): void {
      cancelGcdOptimizationNative();
    },
    optimizeProductionMateriaAsync(
      targets: G.Stats,
    ): Promise<ProductionMateriaOptimizationResult> {
      const input = createProductionMateriaOptimizationInput(self, targets);
      if (isProductionMateriaResult(input)) return Promise.resolve(input);
      return optimizeProductionMateriaNative(input);
    },
    cancelProductionMateriaOptimization(): void {
      cancelProductionMateriaOptimizationNative();
    },
    applyProductionMateriaOptimization(
      result: ProductionMateriaOptimizationResult,
    ): void {
      if (result.status !== "ok") return;
      for (const gearPlan of result.plan) {
        const gear = self.gears.get(gearPlan.gearId.toString()) as
          IGear | undefined;
        if (gear === undefined) continue;
        for (let i = 0; i < gear.materias.length; i++) {
          gear.materias[i].meld(
            gearPlan.materias[i].stat,
            gearPlan.materias[i].grade,
          );
        }
      }
    },
    applyGcdOptimization(result: GcdOptimizationResult): void {
      if (result.status !== "ok") return;
      for (const gearPlan of result.plan) {
        let gear = self.gears.get(gearPlan.gearId.toString()) as
          IGear | undefined;
        if (gear === undefined) {
          self.gears.put(GearUnion.create({ id: gearPlan.gearId }));
          gear = self.gears.get(gearPlan.gearId.toString()) as IGear;
        }
        if (result.mode === "all") {
          self.equippedGears.set(gearPlan.slot.toString(), gear);
        }
        if (gearPlan.customStats !== undefined) {
          gear.setCustomStats(gearPlan.customStats);
        }
        if (gearPlan.materias === undefined) continue;
        for (
          let i = 0;
          i < gearPlan.materias.length && i < gear.materias.length;
          i++
        ) {
          const materia = gear.materias[i];
          const materiaPlan = gearPlan.materias[i];
          materia.stat = materiaPlan.stat;
          materia.grade = materiaPlan.grade;
        }
      }
      if (result.foodId === undefined) {
        self.equippedGears.delete("-1");
      } else {
        let food = self.gears.get(result.foodId.toString()) as
          IFood | undefined;
        if (food === undefined) {
          self.gears.put(GearUnion.create({ id: result.foodId }));
          food = self.gears.get(result.foodId.toString()) as IFood;
        }
        self.equippedGears.set("-1", food);
      }
    },
    clearMaterias(slots?: number[]): void {
      const slotSet = slots === undefined ? undefined : new Set(slots);
      for (const [slot, gear] of self.equippedGears.entries()) {
        if (gear === undefined || gear.isFood) continue;
        if (slotSet !== undefined && !slotSet.has(Number(slot))) continue;
        for (const materia of gear.materias) {
          materia.stat = undefined;
          materia.grade = undefined;
        }
      }
    },
    toggleShowAllMaterias(): void {
      self.showAllMaterias = !self.showAllMaterias;
    },
    toggleShowAllFoods(): void {
      self.showAllFoods = !self.showAllFoods;
    },
    toggleShowAllPotions(): void {
      self.showAllPotions = !self.showAllPotions;
    },
    toggleDuplicateToolMateria(): void {
      self.duplicateToolMateria = !self.duplicateToolMateria;
    },
    startEditing(): void {
      self.mode = "edit";
      let minLevel = Infinity;
      let maxLevel = -Infinity;
      for (const slot of self.schema.slots) {
        const gear = self.equippedGears.get(slot.slot.toString());
        if (gear !== undefined && slot.levelWeight !== 0 && gear.id !== 17726) {
          // 17726: Spearfishing Gig
          if (gear.level < minLevel) minLevel = gear.level;
          if (gear.level > maxLevel) maxLevel = gear.level;
        }
      }
      self.minLevel = minLevel;
      self.maxLevel = maxLevel;
      self.minLevelIncoming = undefined;
      self.maxLevelIncoming = undefined;
    },
    equip(gear: IGearUnion): void {
      const key = gear.slot.toString();
      if (self.equippedGears.get(key) === gear) {
        self.equippedGears.delete(key);
      } else {
        self.equippedGears.set(key, gear);
      }
    },
    setClan(clan: number): void {
      self.clan = clan;
    },
    toggleTiersShown(): void {
      self.tiersShown = !self.tiersShown;
    },
    autoSelect(): void {
      if (self.loadingStatus === "loading") return;
      if (!self.autoSelectScheduled) return;
      self.autoSelectScheduled = false;
      for (const [slot, gears] of Object.entries(self.groupedGears)) {
        if (self.equippedGears.get(slot) !== undefined) continue;
        let lastMeldable = gears[gears.length - 1];
        if (
          lastMeldable === undefined ||
          lastMeldable.isFood ||
          lastMeldable.slot === 17
        )
          continue;
        for (let i = gears.length - 1; i >= 0; i--) {
          if ((gears[i] as IGear).materiaAdvanced) {
            lastMeldable = gears[i];
            break;
          }
        }
        if (!lastMeldable.isEquipped) {
          this.equip(lastMeldable);
        }
      }
    },
    unprotect(): void {
      mst.unprotect(self);
    },
  }))
  .actions((self) => ({
    afterCreate(): void {
      for (const gearId of Object.values(self.equippedGears.toJSON())) {
        loadGearDataOfGearId(Math.abs(gearId as G.GearId));
      }
      self.submitIncomingLevels(); // if user refreshs during appending, we should switch to hard loading
      mst.addDisposer(
        self,
        mobx.autorun(() =>
          loadGearDataOfLevelRange(self.minLevel, self.maxLevel),
        ),
      );
      mst.addDisposer(
        self,
        mobx.autorun(() => {
          if (
            self.minLevelIncoming !== undefined ||
            self.maxLevelIncoming !== undefined
          ) {
            loadGearDataOfLevelRange(
              self.minLevelIncoming ?? self.minLevel,
              self.maxLevelIncoming ?? self.maxLevel,
            );
            mst.addDisposer(
              self,
              mobx.when(
                () => !gearDataLoading.get(),
                self.submitIncomingLevels,
              ),
            );
          }
        }),
      );
      mst.addDisposer(
        self,
        mobx.reaction(() => self.filteredIds, self.createGears, {
          fireImmediately: true,
        }),
      );
      mst.addDisposer(
        self,
        mobx.reaction(
          () => self.autoSelectScheduled && self.groupedGears,
          self.autoSelect,
        ),
      );
    },
  }));

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Preserve recursive MST instance typing.
export interface IStore extends mst.Instance<typeof Store> {}
