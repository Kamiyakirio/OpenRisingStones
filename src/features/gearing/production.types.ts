/** Gearing domain module adapted from ffxiv-gearing (MIT); see licenses/ffxiv-gearing. */
import * as G from "./utils/game.ts";

export type ProductionMateriaStat = "CMS" | "CRL" | "CP" | "GTH" | "PCP" | "GP";

export interface ProductionMateriaSlotInput {
  allowedGrades: G.MateriaGrade[];
}

export interface ProductionMateriaGearInput {
  gearId: G.GearId;
  slot: number;
  baseStats: G.Stats;
  caps: G.Stats;
  slots: ProductionMateriaSlotInput[];
}

export interface ProductionMateriaOptimizationInput {
  stats: [ProductionMateriaStat, ProductionMateriaStat, ProductionMateriaStat];
  baseStats: G.Stats;
  targets: G.Stats;
  gears: ProductionMateriaGearInput[];
}

export interface ProductionMateriaPlanEntry {
  stat?: ProductionMateriaStat;
  grade?: G.MateriaGrade;
}

export interface ProductionMateriaGearPlan {
  gearId: G.GearId;
  slot: number;
  materias: ProductionMateriaPlanEntry[];
}

export interface ProductionMateriaOptimizationOkResult {
  status: "ok";
  stats: G.Stats;
  plan: ProductionMateriaGearPlan[];
  usesTools: boolean;
}

export interface ProductionMateriaOptimizationUnreachableResult {
  status: "unreachable";
  maximumStats: G.Stats;
}

export interface ProductionMateriaOptimizationErrorResult {
  status: "error";
  message: string;
}

export type ProductionMateriaOptimizationResult =
  | ProductionMateriaOptimizationOkResult
  | ProductionMateriaOptimizationUnreachableResult
  | ProductionMateriaOptimizationErrorResult;
