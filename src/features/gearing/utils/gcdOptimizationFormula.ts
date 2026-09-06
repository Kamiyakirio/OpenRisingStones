import rules from "../data/generated/rules.json";
const formulaNumbers = Object.fromEntries(
  Object.entries(rules.formulas).map(([key, value]) => [key, value.numbers]),
);
/** Gearing domain module adapted from ffxiv-gearing (MIT); see licenses/ffxiv-gearing. */
import * as G from "./game.ts";
import type { EquippedEffects } from "../optimization.types.ts";

export function floor(value: number): number {
  return Math.trunc(value + formulaNumbers.floor[0]);
}

export function calcGcd(
  speedValue: number,
  jobLevel: G.JobLevel,
  statModifiers: G.JobSchema["statModifiers"],
): number {
  const { sub, div } = G.jobLevelModifiers[jobLevel];
  return (
    floor(
      (floor(
        ((formulaNumbers.calcGcd[0] -
          floor((formulaNumbers.calcGcd[1] * (speedValue - sub)) / div)) *
          formulaNumbers.calcGcd[2]) /
          formulaNumbers.calcGcd[3],
      ) *
        ((jobLevel >= formulaNumbers.calcGcd[4] && statModifiers?.gcd) ||
          formulaNumbers.calcGcd[5])) /
        formulaNumbers.calcGcd[6],
    ) / formulaNumbers.calcGcd[7]
  );
}

export function calcRequiredSpeed(
  targetGcd: number,
  jobLevel: G.JobLevel,
  statModifiers: G.JobSchema["statModifiers"],
): number {
  if (
    !Number.isFinite(targetGcd) ||
    targetGcd <= formulaNumbers.calcRequiredSpeed[0]
  )
    return Infinity;
  let low = formulaNumbers.calcRequiredSpeed[1];
  let high = formulaNumbers.calcRequiredSpeed[2];
  while (
    calcGcd(high, jobLevel, statModifiers) > targetGcd &&
    high < formulaNumbers.calcRequiredSpeed[3]
  )
    high *= formulaNumbers.calcRequiredSpeed[4];
  if (
    high >= formulaNumbers.calcRequiredSpeed[5] &&
    calcGcd(high, jobLevel, statModifiers) > targetGcd
  )
    return Infinity;
  while (low < high) {
    const mid = floor((low + high) / formulaNumbers.calcRequiredSpeed[6]);
    if (calcGcd(mid, jobLevel, statModifiers) <= targetGcd) high = mid;
    else low = mid + formulaNumbers.calcRequiredSpeed[7];
  }
  return low;
}

export function calcEffects(
  stats: G.Stats,
  baseStats: G.Stats,
  job: G.Job,
  jobLevel: G.JobLevel,
  schema: G.JobSchema,
): EquippedEffects | undefined {
  const { statModifiers, mainStat, traitDamageMultiplier, partyBonus } = schema;
  if (
    statModifiers === undefined ||
    mainStat === undefined ||
    traitDamageMultiplier === undefined
  )
    return;
  const levelMod = G.jobLevelModifiers[jobLevel];
  const { main, sub, div, det, detTrunc } = levelMod;
  const { CRT, DET, DHT, TEN, SKS, SPS, VIT, PIE, PDMG, MDMG } = stats;
  const attackMainStat = mainStat === "VIT" ? "STR" : mainStat;
  const bluAetherialMimicry =
    job === "BLU"
      ? formulaNumbers.calcEffects[0]
      : formulaNumbers.calcEffects[1];
  const crtChance =
    floor(
      (formulaNumbers.calcEffects[2] * ((CRT ?? sub) - sub)) / div +
        formulaNumbers.calcEffects[3] +
        bluAetherialMimicry,
    ) / formulaNumbers.calcEffects[4];
  const crtDamage =
    floor(
      (formulaNumbers.calcEffects[5] * ((CRT ?? sub) - sub)) / div +
        formulaNumbers.calcEffects[6],
    ) / formulaNumbers.calcEffects[7];
  const detDamage =
    (floor(
      ((formulaNumbers.calcEffects[8] * ((DET ?? main) - main)) / det +
        formulaNumbers.calcEffects[9]) /
        detTrunc,
    ) *
      detTrunc) /
    formulaNumbers.calcEffects[10];
  const dhtChance =
    floor(
      (formulaNumbers.calcEffects[11] * ((DHT ?? sub) - sub)) / div +
        bluAetherialMimicry,
    ) / formulaNumbers.calcEffects[12];
  const tenDamage =
    floor(
      (formulaNumbers.calcEffects[13] * ((TEN ?? sub) - sub)) / div +
        formulaNumbers.calcEffects[14],
    ) / formulaNumbers.calcEffects[15];
  const tenMitigation =
    floor((formulaNumbers.calcEffects[16] * ((TEN ?? sub) - sub)) / div) /
    formulaNumbers.calcEffects[17];
  const weaponDamage =
    floor(
      (main * statModifiers[attackMainStat]!) / formulaNumbers.calcEffects[18],
    ) +
    ((mainStat === "MND" || mainStat === "INT" ? MDMG : PDMG) ??
      formulaNumbers.calcEffects[19]) +
    (job === "BLU"
      ? (G.bluMdmgAdditions[
          (stats.INT ?? formulaNumbers.calcEffects[20]) -
            (baseStats.INT ?? formulaNumbers.calcEffects[21])
        ] ?? formulaNumbers.calcEffects[22])
      : formulaNumbers.calcEffects[23]);
  const mainDamage =
    floor(
      ((mainStat === "VIT" ? levelMod.apTank : levelMod.ap) *
        (floor(
          (stats[attackMainStat] ?? formulaNumbers.calcEffects[24]) *
            (partyBonus ?? formulaNumbers.calcEffects[25]),
        ) -
          main)) /
        main +
        formulaNumbers.calcEffects[26],
    ) / formulaNumbers.calcEffects[27];
  const damage =
    formulaNumbers.calcEffects[28] *
    weaponDamage *
    mainDamage *
    detDamage *
    tenDamage *
    traitDamageMultiplier *
    ((crtDamage - formulaNumbers.calcEffects[29]) * crtChance +
      formulaNumbers.calcEffects[30]) *
    (formulaNumbers.calcEffects[31] * dhtChance +
      formulaNumbers.calcEffects[32]);
  const speedValue = SKS ?? SPS ?? sub;
  const gcd = calcGcd(speedValue, jobLevel, statModifiers);
  const ssDamage =
    floor(
      (formulaNumbers.calcEffects[33] * (speedValue - sub)) / div +
        formulaNumbers.calcEffects[34],
    ) / formulaNumbers.calcEffects[35];
  const hp =
    levelMod.hp * statModifiers.hp +
    floor(
      (mainStat === "VIT" ? levelMod.vitTank : levelMod.vit) *
        ((VIT ?? main) - main),
    );
  const mp = floor(
    (formulaNumbers.calcEffects[36] * ((PIE ?? main) - main)) / div +
      formulaNumbers.calcEffects[37],
  );
  return {
    crtChance,
    crtDamage,
    detDamage,
    dhtChance,
    tenDamage,
    tenMitigation,
    damage,
    gcd,
    ssDamage,
    hp,
    mp,
  };
}
