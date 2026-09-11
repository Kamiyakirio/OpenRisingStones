/** Prepared solver contracts: Rust receives numerical inputs, never editor documents or catalog queries. */
import type {
  Effects,
  Equipment,
  Item,
  Job,
  Meld,
  Slot,
  Stat,
  Stats,
} from "./types";
import type coefficients from "../../../../scripts/gearing/config/formulas.json";
export type Coefficients = typeof coefficients;
export interface LevelModifiers {
  main: number;
  sub: number;
  div: number;
  det: number;
  detTrunc: number;
  ap: number;
  apTank: number;
  hp: number;
  vit: number;
  vitTank: number;
}
export interface JobDefinition extends Omit<Job, "id" | "combat"> {
  mainStat?: Stat;
  secondaryStat?: Stat;
  traitDamageMultiplier?: number;
  partyBonus?: number;
  toolMateriaDuplicates?: number;
  statModifiers?: Partial<Record<Stat | "hp" | "gcd", number>> & {
    gcdReason?: string;
  };
  slots: (Job["slots"][number] & { slot?: number; levelWeight?: number })[];
}
export interface WeaponRule {
  id: string;
  itemLevels: Record<number, { major: number; minor: number }>;
  slotWeights: Record<number, [number, number]>;
  statCandidates: (Stat | "speed")[];
  linkSlotAllocations: boolean;
}
export interface GameRules {
  jobSchemas: Record<string, JobDefinition>;
  jobOrder: string[];
  jobLevelModifiers: Record<number, LevelModifiers>;
  baseStats: Partial<Record<Stat, number | "main" | "sub">>;
  clanStats: Partial<Record<Stat, number[]>>;
  clans: string[];
  parameters: Coefficients;
  customWeaponRules: WeaponRule[];
  syncLevelOfJobLevels: Record<number, number>;
  materias: Partial<Record<Stat, number[]>>;
  materiaGrades: number[];
  materiaGradeRequiredLevels: number[];
  materiaGradeIsRestricted: boolean[];
  materiaSuccessRates: number[][];
  [key: string]: unknown;
}
export interface GameTables {
  levelCaps: Partial<Record<Stat, number[]>> & { level: number[] };
  slotCaps: Partial<Record<Stat, number[]>>;
  roleCaps: Partial<Record<Stat, number[]>>;
  bluMdmgAdditions: number[];
  [key: string]: unknown;
}
export interface Definition extends Item {
  slot: number;
  rawSlot?: number;
  role: number;
  equipLevel: number;
  equipLevelVariable?: boolean;
  occultStats?: Stats;
  statRates?: Stats;
  weaponFamilyId?: string;
  acquisition: Acquisition;
}
export interface Acquisition {
  kind: string;
  ringExclusivityGroup?: string;
  tomestoneCost: number;
  raidCost: number;
}
export interface CustomRule {
  major: number;
  minor: number;
  statCandidates: Stat[];
  linkedSlotGroup?: string;
}
export interface SolverGear {
  id: number;
  slot: number;
  data: Definition;
  materias: Meld[];
  customStats: Stats | null;
  caps: Stats;
  syncCaps: Stats | null;
  customRule: CustomRule | null;
  acquisition: Acquisition;
  materiaLocked: boolean;
}
export interface CombatInput {
  mode: "current" | "all";
  targetGcd: number;
  job: string;
  jobLevel: number;
  syncLevel: number | null;
  baseStats: Stats;
  currentDamage: number;
  currentFoodId: number | null;
  filteredIds: number[];
  equippedGearIdsBySlot: [number, number][];
  gears: SolverGear[];
  foods: Definition[];
  fixedConsumables: Definition[];
  speedRange?: { min: number; max: number } | null;
  progressionWeeks?: number | null;
  rules: {
    schema: JobDefinition;
    level: LevelModifiers;
    jobSyncLevel: number;
    materias: GameRules["materias"];
    materiaGrades: number[];
    materiaGradeRequiredLevels: number[];
    materiaGradeIsRestricted: boolean[];
    bluMdmgAdditions: number[];
  };
}
export interface NativeResult {
  status: "ok" | "unreachable" | "limited" | "cancelled" | "invalid" | "error";
  message?: string;
  fastestGcd?: number;
  plan?: {
    gearId: number;
    slot: number;
    materias?: Meld[];
    customStats?: Stats;
  }[];
  foodId?: number;
  effects?: Effects;
  stats?: Stats;
  speed?: number;
  damageDelta?: number;
  solutions?: {
    DET: number;
    DHT: number;
    gearMateriaStats: [number, (Stat | null)[]][];
  }[];
}
export interface PreparedEntry {
  key: Slot;
  configuration: Equipment;
  item: Definition;
  gear: SolverGear;
}
