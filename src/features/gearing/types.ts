/** Legacy base62 codec types. Editor and IPC contracts live in editor/types.ts. */

export type GearId = number & { readonly brand: unique symbol };

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

export type Stat = import("./editor/types").Stat;

export type Stats = { [index in Stat]?: number };

export type StatPairs = [Stat, number][];

export type JobLevel = 50 | 60 | 70 | 80 | 90 | 100;

export type Job =
  | "PLD"
  | "WAR"
  | "DRK"
  | "GNB"
  | "WHM"
  | "SCH"
  | "AST"
  | "SGE"
  | "MNK"
  | "DRG"
  | "NIN"
  | "SAM"
  | "RPR"
  | "VPR"
  | "BRD"
  | "MCH"
  | "DNC"
  | "BLM"
  | "SMN"
  | "RDM"
  | "PCT"
  | "BLU"
  | "CRP"
  | "BSM"
  | "ARM"
  | "GSM"
  | "LTW"
  | "WVR"
  | "ALC"
  | "CUL"
  | "MIN"
  | "BTN"
  | "FSH";

export type MateriaGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
