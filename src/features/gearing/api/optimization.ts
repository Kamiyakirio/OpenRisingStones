/** Coarse-grained native optimization IPC; there is no browser search fallback. */
import type { IGear } from "../models/index.ts";
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../../shared/utils/runtime.ts";
import * as G from "../utils/game.ts";
import { getCustomWeaponRule } from "../utils/customWeaponRules.ts";
import { getGearAcquisitionPolicy } from "../utils/gcdOptimizationAcquisition.ts";
import type {
  GcdOptimizationInput,
  GcdOptimizationResult,
} from "../optimization.types.ts";
import type {
  ProductionMateriaOptimizationInput,
  ProductionMateriaOptimizationResult,
} from "../production.types.ts";
import rules from "../data/generated/rules.json";
import manifest from "../data/generated/manifest.json";

export const {
  gcdOptimizationMinTargetGcd,
  gcdOptimizationMaxTargetGcd,
  gcdOptimizationMaxSpeed,
} = rules.search;
type Kind = "combat" | "production" | "det-dht";
const active = new Map<Kind, string>();
function cancel(kind: Kind) {
  const id = active.get(kind);
  active.delete(kind);
  if (id && isTauriRuntime())
    void invoke("cancel_gearing_optimization", { requestId: id }).catch(
      () => {},
    );
}
export function cancelAllGearingOptimizations() {
  cancel("combat");
  cancel("production");
  cancel("det-dht");
}
export const cancelGcdOptimizationNative = () => cancel("combat");
export const cancelProductionMateriaOptimizationNative = () =>
  cancel("production");

/** Add lookup results only. Candidate enumeration, scoring and pruning happen in Rust. */
export function combatRequest(input: GcdOptimizationInput) {
  const schema = G.jobSchemas[input.job];
  return {
    ...input,
    gears: input.gears.map((gear) => {
      const data = gear.data,
        sync = input.syncLevel ?? Infinity;
      const jobSync = Math.min(
        data.level,
        G.syncLevelOfJobLevels[input.jobLevel],
      );
      const syncedLevel =
        sync >= data.level && input.jobLevel >= data.equipLevel
          ? undefined
          : data.equipLevelVariable
            ? Math.min(sync, jobSync)
            : sync < data.level
              ? sync
              : jobSync;
      const weapon = schema.slots.some(
        (s) => s.slot === gear.slot && s.uiGroup === "weapon",
      );
      return {
        ...gear,
        caps: G.getCaps(data),
        syncCaps:
          syncedLevel === undefined ? undefined : G.getCaps(data, syncedLevel),
        customRule: getCustomWeaponRule(data, schema),
        acquisition: getGearAcquisitionPolicy(
          data.source,
          gear.slot,
          weapon,
          false,
        ),
      };
    }),
    rules: {
      schema: {
        ...schema,
        statModifiers: Object.fromEntries(
          Object.entries(schema.statModifiers ?? {}).filter(
            ([, value]) => typeof value === "number",
          ),
        ),
      },
      level: G.jobLevelModifiers[input.jobLevel],
      jobSyncLevel: G.syncLevelOfJobLevels[input.jobLevel],
      materias: G.materias,
      materiaGrades: G.materiaGrades,
      materiaGradeRequiredLevels: G.materiaGradeRequiredLevels,
      materiaGradeIsRestricted: G.materiaGradeIsRestricted,
      bluMdmgAdditions: G.bluMdmgAdditions,
    },
  };
}
async function run<T>(
  kind: Kind,
  input: unknown,
): Promise<T | { status: "error"; message: string }> {
  cancel(kind);
  if (!isTauriRuntime())
    return {
      status: "error",
      message:
        "Native optimization is available in the desktop application only.",
    };
  const requestId = crypto.randomUUID();
  active.set(kind, requestId);
  try {
    const result = await invoke<T>("optimize_gearing", {
      kind,
      requestId,
      input,
      dataVersion: manifest.dataVersion,
      parameterVersion: manifest.parameterVersion,
    });
    if (active.get(kind) !== requestId)
      return {
        status: "error",
        message: "Optimization cancelled or superseded.",
      };
    return result;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (active.get(kind) === requestId) active.delete(kind);
  }
}
export function optimizeGcdNative(
  input: GcdOptimizationInput,
): Promise<GcdOptimizationResult> {
  return run<GcdOptimizationResult>("combat", combatRequest(input));
}
export function optimizeProductionMateriaNative(
  input: ProductionMateriaOptimizationInput,
): Promise<ProductionMateriaOptimizationResult> {
  return run<ProductionMateriaOptimizationResult>("production", {
    ...input,
    materias: G.materias,
  });
}

export type DetDhtResult =
  | {
      status: "ok";
      solutions: {
        DET: number;
        DHT: number;
        gearMateriaStats: [G.GearId, (G.Stat | null)[]][];
      }[];
    }
  | { status: "error"; message: string };
export const cancelDetDhtOptimization = () => cancel("det-dht");
export function optimizeDetDht(
  store: import("../models/index.ts").IStore,
): Promise<DetDhtResult> {
  const gears = Array.from(store.equippedGears.values())
    .filter((g): g is IGear => g !== undefined && !g.isFood)
    .map((g) => ({
      id: g.id,
      stats:
        g.syncedLevel !== undefined
          ? g.stats
          : { ...g.bareStats, ...g.customStats?.toJSON() },
      caps: g.caps,
      synced: g.syncedLevel !== undefined,
      materias: g.materias.map((m) => ({
        stat: m.stat,
        grade: m.grade,
        bestGrade: m.meldableGrades[0],
      })),
    }));
  const food = store.equippedGears.get("-1");
  return run<DetDhtResult>("det-dht", {
    baseStats: store.baseStats,
    gears,
    food: food?.isFood ? food.data : undefined,
    level: G.jobLevelModifiers[store.jobLevel],
    blu: store.job === "BLU",
    materias: G.materias,
  });
}
