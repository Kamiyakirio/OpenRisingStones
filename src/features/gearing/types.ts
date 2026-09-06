/** Core gearing contracts; parameters and calculations live with their feature logic. */
import type rules from "./data/generated/rules.json";
import type { materiaGrades } from "./utils/game.ts";

export type GearId = number & { readonly brand: unique symbol };

export interface GearBase {
  id: GearId;
  name: string;
  level: number;
  slot: number;
  jobCategory: number;
  stats: Stats;
  obsolete?: true;
}

export interface Gear extends GearBase {
  rarity: number;
  rawSlot?: number;
  role: number;
  equipLevel: number;
  equipLevelVariable?: true;
  materiaSlot: number;
  materiaAdvanced?: true;
  hq?: true;
  customizable?: true;
  occultStats?: Stats;
  source?: string;
}

export interface Food extends GearBase {
  statRates: Stats;
  statMain: Stat;
  best: boolean;
}

export interface Gearset {
  job: Job;
  jobLevel: JobLevel;
  syncLevel?: number;
  gears: {
    id: GearId;
    materias: GearsetMaterias;
    customStats?: Stats;
  }[];
}

export type GearsetMaterias = ([Stat, MateriaGrade] | null)[];

export type Stat = keyof typeof rules.statNames;

export type Stats = { [index in Stat]?: number };

export type StatPairs = [Stat, number][];

type NumericKey<T> = T extends `${infer Value extends number}` ? Value : never;

export type JobLevel = NumericKey<keyof typeof rules.jobLevelModifiers>;

export interface SlotSchema {
  slot: number;
  name: string;
  shortName?: string;
  levelWeight?: number;
  uiGroup: string;
}

export interface JobSchema {
  name: string;
  stats: Stat[];
  slots: SlotSchema[];
  defaultItemLevel: [number, number];
  jobLevel: JobLevel;
  levelSyncable?: boolean;
  statModifiers?: {
    STR?: number;
    DEX?: number;
    INT?: number;
    MND?: number;
    VIT: number;
    hp: number;
    gcd?: number;
    gcdReason?: string;
  };
  mainStat?: "STR" | "DEX" | "INT" | "MND" | "VIT";
  secondaryStat?: "TEN" | "PIE" | "DHT";
  traitDamageMultiplier?: number;
  partyBonus?: number;
  skeletonGears?: boolean; // consistent stats proportion in same slot, focus on materia melding than gear choosing
  toolMateriaDuplicates?: number;
}

export type Job = keyof typeof rules.jobSchemas;

export type MateriaGrade = (typeof materiaGrades)[number];
