/** Domain exports without a global Store or browser lifecycle side effects. */
import type * as G from "../utils/game.ts";
declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Math {
    abs(x: G.GearId): G.GearId;
    abs(x: number): number;
  }
}

export function floor(value: number) {
  return Math.trunc(value + 1e-7);
}
export function ceil(value: number) {
  return Math.ceil(value - 1e-7);
}

export { Setting } from "./Setting.ts";
export type { ISetting } from "./Setting.ts";
export { Promotion } from "./Promotion.ts";
export type { IPromotion } from "./Promotion.ts";
export { Materia } from "./Materia.ts";
export type { IMateria } from "./Materia.ts";
export { Gear } from "./Gear.ts";
export type { IGear, GearColor } from "./Gear.ts";
export { Food } from "./Food.ts";
export type { IFood } from "./Food.ts";
export { GearUnion, GearUnionReference } from "./GearUnion.ts";
export type { IGearUnion } from "./GearUnion.ts";
export { Store } from "./Store.ts";
export type { IStore, Mode } from "./Store.ts";
export { calcGcd, calcRequiredSpeed } from "../utils/gcdOptimizationFormula.ts";
export {
  gcdOptimizationMinTargetGcd,
  gcdOptimizationMaxTargetGcd,
  gcdOptimizationMaxSpeed,
} from "../api/optimization.ts";
export type {
  GcdOptimizationMode,
  GcdOptimizationResult,
  GcdOptimizationSpeedRange,
} from "../optimization.types.ts";
export type {
  ProductionMateriaOptimizationResult,
  ProductionMateriaStat,
} from "../production.types.ts";
export {
  gearData,
  gearDataOrdered,
  gearDataLoading,
  loadGearData,
  loadGearDataOfGearId,
  loadGearDataOfLevelRange,
} from "../api/gearData.ts";
