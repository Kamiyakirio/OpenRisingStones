import type {
  Gear,
  Stat,
  Stats,
  JobLevel,
  JobSchema,
  Job,
  MateriaGrade,
} from "../types.ts";
export type {
  GearId,
  GearBase,
  Gear,
  Food,
  Gearset,
  GearsetMaterias,
  Stat,
  Stats,
  StatPairs,
  JobLevel,
  SlotSchema,
  JobSchema,
  Job,
  MateriaGrade,
} from "../types.ts";
import rules from "../data/generated/rules.json";
/** Gearing domain module adapted from ffxiv-gearing (MIT); see licenses/ffxiv-gearing. */
import levelCapsData from "../data/generated/levelCaps.json";
import slotCapsData from "../data/generated/slotCaps.json";
import roleCapsData from "../data/generated/roleCaps.json";
import jobCategoriesData from "../data/generated/jobCategories.json";
import syncLevelsData from "../data/generated/syncLevels.json";
import bluMdmgAdditionsData from "../data/generated/bluMdmgAdditions.json";

export const statNames = rules.statNames as Record<
  keyof typeof rules.statNames,
  string
>;

const levelCaps = levelCapsData as { [index in Stat | "level"]: number[] };
const slotCaps = slotCapsData as { [index in Stat]: number[] };
const roleCaps = roleCapsData as { [index in Stat]: number[] };
const levelCapsIndex: { [index: number]: number } = {};
levelCaps.level.forEach((level, i) => {
  levelCapsIndex[level] = i;
});
const capsCache: { [index: string]: Stats } = {};
export function getCaps(gear: Gear, syncLevel?: number): Stats {
  const level = syncLevel ?? gear.level;
  const slot = gear.rawSlot ?? gear.slot;
  const role = gear.role;
  const cacheKey = `${level},${slot},${role}`;
  if (!(cacheKey in capsCache)) {
    const caps: Stats = {};
    for (const stat of Object.keys(statNames) as Stat[]) {
      if (stat === "main" || stat === "secondary") continue;
      caps[stat] =
        stat === "DLY"
          ? Infinity
          : Math.round(
              (levelCaps[stat][levelCapsIndex[level]] *
                slotCaps[stat][slot] *
                roleCaps[stat][role]) /
                rules.formulas.getCaps.numbers[0],
            );
    }
    capsCache[cacheKey] = caps;
  }
  return capsCache[cacheKey];
}

export const jobLevelModifiers = rules.jobLevelModifiers;

export const jobLevels = Object.keys(jobLevelModifiers).map(
  (l) => Number(l) as JobLevel,
);

export const baseStats: { [index in Stat]?: "main" | "sub" | number } =
  rules.baseStats as { [index in Stat]?: "main" | "sub" | number };

export const customStatMax = rules.customStatMax;

export const jobSchemas = rules.jobSchemas as unknown as Record<
  keyof typeof rules.jobSchemas,
  JobSchema
>;

export const jobCategories = jobCategoriesData as {
  [index in Job]?: boolean;
}[];

export const statHighlight: { [index in Stat]?: boolean } =
  rules.statHighlight as { [index in Stat]?: boolean };

export const materias: { [index in Stat]?: number[] } = rules.materias as {
  [index in Stat]?: number[];
};
export const materiaGrades = rules.materiaGrades as unknown as readonly [
  12,
  11,
  10,
  9,
  8,
  7,
  6,
  5,
  4,
  3,
  2,
  1,
];

export const materiaMinGrade = Math.min(...materiaGrades);
export const materiaMaxGrade = Math.max(...materiaGrades);
export const materiaGradeRequiredLevels: number[] =
  rules.materiaGradeRequiredLevels;
export const materiaGradeIsRestricted = rules.materiaGradeIsRestricted;

export const materiaSuccessRates: number[][] = rules.materiaSuccessRates;
export const materiaNames: { [index in Stat]?: string } =
  rules.materiaNames as { [index in Stat]?: string };
export const materiaGradeNames: string[] = rules.materiaGradeNames;
export const materiaStatNames = { ...statNames, CP: "CP", GP: "GP" };
export function getMateriaName(
  stat: Stat,
  grade: MateriaGrade,
  useStat: boolean,
  maxLength = 4,
) {
  return useStat
    ? materiaStatNames[stat].slice(0, 2) + materias[stat]![grade - 1]
    : materiaNames[stat]!.slice(
        0,
        maxLength - materiaGradeNames[grade - 1].length,
      ) + materiaGradeNames[grade - 1];
}

export const races = rules.races;

export const clans = rules.clans;

export const clanStats: { [index in Stat]?: number[] } = rules.clanStats as {
  [index in Stat]?: number[];
};

export const syncLevels = syncLevelsData as { [index in JobLevel]: number[] };
export const syncLevelIsPopular: { [index: number]: boolean } =
  rules.syncLevelIsPopular;
export const syncLevelOfJobLevels = rules.syncLevelOfJobLevels;

export const bluMdmgAdditions = bluMdmgAdditionsData as number[];
