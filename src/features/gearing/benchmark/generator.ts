/** Seeded sampling builds nested benchmark inputs exclusively from the real item catalog. */
import { prepareOptimization } from "../editor/optimization";
import type { CombatInput, SolverGear } from "../editor/calculation.types";
import type { ItemCatalog } from "../editor/catalog";
import type { Conditions, GearsetDocument, Slot } from "../editor/types";
import {
  BENCHMARK_SIZES,
  type BenchmarkDataset,
  type BenchmarkSize,
  type BenchmarkVariant,
} from "./types";

export const BENCHMARK_GENERATOR_VERSION = "1";
const FOOD_LIMIT = 8;

export function randomBenchmarkSeed(): string {
  const values = crypto.getRandomValues(new Uint32Array(2));
  return [...values]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

export function generateBenchmarkDataset(
  catalog: ItemCatalog,
  options: { seed: string; job: string; caseCount: number },
): BenchmarkDataset {
  const seed = options.seed.trim();
  if (!seed || seed.length > 100)
    throw new Error("Seed must contain 1 to 100 characters.");
  if (
    !Number.isInteger(options.caseCount) ||
    options.caseCount < 1 ||
    options.caseCount > 20
  )
    throw new Error("Case count must be an integer from 1 to 20.");
  const job = catalog
    .bootstrap()
    .jobs.find((value) => value.id === options.job && value.combat);
  if (!job) throw new Error("Benchmark requires a supported combat job.");
  const minItemLevel = Math.max(0, job.defaultItemLevel[1] - 295);
  const maxItemLevel = job.defaultItemLevel[1];
  const variants = Array.from({ length: options.caseCount }, (_, caseIndex) =>
    generateCaseVariants(catalog, {
      caseIndex,
      job: job.id,
      jobLevel: job.jobLevel,
      maxItemLevel,
      minItemLevel,
      seed,
    }),
  ).flat();
  return {
    schemaVersion: 1,
    generatorVersion: BENCHMARK_GENERATOR_VERSION,
    seed,
    job: job.id,
    jobName: job.name,
    gameVersion: catalog.manifest.gameVersion,
    dataVersion: catalog.manifest.dataVersion,
    parameterVersion: catalog.manifest.parameterVersion,
    minItemLevel,
    maxItemLevel,
    variants,
  };
}

function generateCaseVariants(
  catalog: ItemCatalog,
  options: {
    seed: string;
    caseIndex: number;
    job: string;
    jobLevel: number;
    minItemLevel: number;
    maxItemLevel: number;
  },
): BenchmarkVariant[] {
  const document = benchmarkDocument(
    options.job,
    options.jobLevel,
    options.seed,
    options.caseIndex,
  );
  const conditions: Conditions = {
    kind: "combat",
    mode: "all",
    targetGcd: 2.5,
    exactGcd: false,
    speedRange: null,
    progressionWeeks: null,
    minLevel: options.minItemLevel,
    maxLevel: options.maxItemLevel,
    sourceIds: [],
    excludedItemIds: [],
    optimizeFood: true,
    targets: {},
  };
  const prepared = prepareOptimization(catalog, document, conditions);
  if ("status" in prepared)
    throw new Error("Cannot prepare a complete benchmark input.");
  const base = prepared.input as CombatInput;
  const groups = groupBySlot(base.gears);
  const slotOrders = new Map(
    [...groups].map(([slot, gears]) => [
      slot,
      shuffled(
        [...gears].sort((a, b) => a.id - b.id),
        `${options.seed}:${options.caseIndex}:slot:${slot}`,
      ),
    ]),
  );
  const foods = shuffled(
    [...base.foods].sort((a, b) => a.id - b.id),
    `${options.seed}:${options.caseIndex}:food`,
  ).slice(0, FOOD_LIMIT);
  return BENCHMARK_SIZES.map((size) =>
    variant(base, prepared.parameters, slotOrders, foods, options, size),
  );
}

function variant(
  base: CombatInput,
  parameters: unknown,
  slotOrders: Map<number, SolverGear[]>,
  foods: CombatInput["foods"],
  options: {
    seed: string;
    caseIndex: number;
    job: string;
  },
  size: BenchmarkSize,
): BenchmarkVariant {
  const selected = [...slotOrders.values()].flatMap((gears) =>
    gears.slice(0, Math.min(size, gears.length)),
  );
  const input: CombatInput = {
    ...structuredClone(base),
    gears: structuredClone(selected),
    filteredIds: selected.map((gear) => gear.id),
    foods: structuredClone(foods),
  };
  const candidateIdsBySlot = Object.fromEntries(
    [...slotOrders].map(([slot, gears]) => [
      String(slot),
      gears.slice(0, Math.min(size, gears.length)).map((gear) => gear.data.id),
    ]),
  );
  const candidateCountsBySlot = Object.fromEntries(
    Object.entries(candidateIdsBySlot).map(([slot, ids]) => [slot, ids.length]),
  );
  const caseId = `${options.seed}-${options.caseIndex + 1}-${size}`;
  return {
    caseId,
    caseIndex: options.caseIndex,
    size,
    targetGcd: input.targetGcd,
    input,
    parameters,
    candidateIdsBySlot,
    candidateCountsBySlot,
    foodIds: foods.map((food) => food.id),
    inputChecksum: checksum(
      JSON.stringify({
        caseId,
        job: options.job,
        candidates: candidateIdsBySlot,
        foods: foods.map((food) => food.id),
        targetGcd: input.targetGcd,
      }),
    ),
  };
}

function benchmarkDocument(
  job: string,
  jobLevel: number,
  seed: string,
  caseIndex: number,
): GearsetDocument {
  return {
    duplicateToolMateria: true,
    formatVersion: 2,
    id: `benchmark-${checksum(`${seed}:${caseIndex}`)}`,
    name: "Benchmark",
    job,
    jobLevel,
    clan: 0,
    syncLevel: null,
    equipment: {},
    foodId: null,
    potionId: null,
    alternatives: {} as Partial<Record<Slot, never[]>>,
  };
}

function groupBySlot(gears: SolverGear[]) {
  const groups = new Map<number, SolverGear[]>();
  for (const gear of gears) {
    const group = groups.get(gear.slot) ?? [];
    group.push(gear);
    groups.set(gear.slot, group);
  }
  if (!groups.size || [...groups.values()].some((gears) => !gears.length))
    throw new Error(
      "The real catalog does not contain a complete benchmark scope.",
    );
  return groups;
}

function shuffled<T>(values: T[], seed: string): T[] {
  const random = mulberry32(hash(seed));
  for (let index = values.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

function checksum(value: string): string {
  return hash(value).toString(16).padStart(8, "0");
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
