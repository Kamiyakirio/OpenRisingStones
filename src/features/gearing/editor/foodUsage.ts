/** Candidate utilization uses uneaten stats, so equipped food never boosts itself. */
import coefficients from "../../../../scripts/gearing/config/formulas.json";
import { foodBonus } from "./formulas";
import type { Evaluation, Item, Stat, Stats } from "./types";

export function foodUsage(item: Item, evaluation: Evaluation) {
  const bare: Stats = { ...evaluation.stats };
  for (const slot of ["food", "potion"] as const)
    for (const [stat, value] of Object.entries(
      evaluation.slots[slot]?.stats ?? {},
    ))
      bare[stat as Stat] = (bare[stat as Stat] ?? 0) - value;
  const actual = foodBonus(bare, item, coefficients);
  const maximum = Object.values(item.stats).reduce(
    (sum, value) => sum + value,
    0,
  );
  const total = Object.values(actual).reduce((sum, value) => sum + value, 0);
  return {
    actual,
    utilization: maximum ? Math.min(100, (100 * total) / maximum) : 0,
  };
}
