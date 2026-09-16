/** Panel formulas adapted from ffxiv-gearing (MIT); named coefficients are shared with native scoring. */
import type {
  CombatInput,
  Coefficients,
  Definition,
} from "./calculation.types";
import type { Effects, Stats } from "./types";
export const truncate = (value: number, p: Coefficients) =>
  Math.trunc(value + p.roundingEpsilon);
export function gcd(
  input: CombatInput,
  speed: number,
  p: Coefficients,
): number {
  const g = p.gcd,
    l = input.rules.level,
    f = (v: number) => truncate(v, p);
  const modifier =
    input.jobLevel >= g.modifierLevel
      ? (input.rules.schema.statModifiers?.gcd ?? g.defaultModifier)
      : g.defaultModifier;
  return (
    f(
      (f(
        ((g.base - f((g.speedScale * (speed - l.sub)) / l.div)) * g.timeUnits) /
          g.baseDivisor,
      ) *
        modifier) /
        g.modifierDivisor,
    ) / g.resultDivisor
  );
}
export function requiredSpeed(
  input: CombatInput,
  target: number,
  p: Coefficients,
  maxSpeed: number,
): number {
  let low = 0,
    high = 1000;
  while (gcd(input, high, p) > target && high < maxSpeed) high *= 2;
  while (low < high) {
    const mid = Math.trunc((low + high) / 2);
    if (gcd(input, mid, p) <= target) high = mid;
    else low = mid + 1;
  }
  return low;
}
export function effects(
  input: CombatInput,
  s: Stats,
  parameters: Coefficients,
): Effects {
  const p = parameters.effects,
    l = input.rules.level,
    schema = input.rules.schema,
    f = (n: number) => truncate(n, parameters);
  const main = schema.mainStat ?? "STR",
    tank = main === "VIT",
    attack = tank ? "STR" : main,
    mod = schema.statModifiers ?? {};
  const blu = input.job === "BLU" ? p.blueMimicry : 0,
    c = p.critical,
    d = p.determination,
    h = p.directHit,
    t = p.tenacity;
  const crtChance =
    f(
      (c.chanceScale * ((s.CRT ?? l.sub) - l.sub)) / l.div + c.chanceBase + blu,
    ) / c.divisor;
  const crtDamage =
    f((c.damageScale * ((s.CRT ?? l.sub) - l.sub)) / l.div + c.damageBase) /
    c.divisor;
  const detDamage =
    (f(
      ((d.scale * ((s.DET ?? l.main) - l.main)) / l.det + d.base) / l.detTrunc,
    ) *
      l.detTrunc) /
    d.divisor;
  const dhtChance =
    f((h.chanceScale * ((s.DHT ?? l.sub) - l.sub)) / l.div + blu) / h.divisor;
  const tenDamage =
    f((t.damageScale * ((s.TEN ?? l.sub) - l.sub)) / l.div + t.damageBase) /
    t.divisor;
  const tenMitigation =
    f((t.mitigationScale * ((s.TEN ?? l.sub) - l.sub)) / l.div) / t.divisor;
  const delta = (s.INT ?? 0) - (input.baseStats.INT ?? 0);
  const weapon =
    f((l.main * (mod[attack] ?? 100)) / p.weaponDivisor) +
    (s[main === "MND" || main === "INT" ? "MDMG" : "PDMG"] ?? 0) +
    (input.job === "BLU" && delta >= 0
      ? (input.rules.bluMdmgAdditions[delta] ?? 0)
      : 0);
  const mainDamage =
    f(
      ((tank ? l.apTank : l.ap) *
        (f((s[attack] ?? 0) * (schema.partyBonus ?? p.main.partyBonus)) -
          l.main)) /
        l.main +
        p.main.damageBase,
    ) / p.main.divisor;
  const damage =
    p.potencyScale *
    weapon *
    mainDamage *
    detDamage *
    tenDamage *
    (schema.traitDamageMultiplier ?? 1) *
    ((crtDamage - 1) * crtChance + 1) *
    (h.damageBonus * dhtChance + 1);
  const speed = s.SKS ?? s.SPS ?? l.sub;
  return {
    crtChance,
    crtDamage,
    detDamage,
    dhtChance,
    tenDamage,
    tenMitigation,
    damage,
    gcd: gcd(input, speed, parameters),
    ssDamage:
      f((p.speed.scale * (speed - l.sub)) / l.div + p.speed.base) /
      p.speed.divisor,
    hp:
      l.hp * (mod.hp ?? 100) +
      f((tank ? l.vitTank : l.vit) * ((s.VIT ?? l.main) - l.main)),
    mp: f((p.mp.scale * ((s.PIE ?? l.main) - l.main)) / l.div + p.mp.base),
  };
}
export function addStats(a: Stats, b: Stats): Stats {
  const result = { ...a };
  for (const [name, value] of Object.entries(b)) {
    const stat = name as keyof Stats;
    result[stat] = (result[stat] ?? 0) + value!;
  }
  return result;
}
export function foodBonus(
  stats: Stats,
  food: Pick<Definition, "stats" | "statRates">,
  p: Coefficients,
): Stats {
  return Object.fromEntries(
    Object.entries(food.stats).map(([stat, value]) => [
      stat,
      food.statRates?.[stat as keyof Stats] !== undefined
        ? Math.min(
            value!,
            truncate(
              ((stats[stat as keyof Stats] ?? 0) *
                food.statRates[stat as keyof Stats]!) /
                100,
              p,
            ),
          )
        : value,
    ]),
  );
}
