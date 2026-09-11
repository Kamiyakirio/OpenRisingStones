/** Shopping estimates from exact geometric-attempt distributions, outside the native optimizer. */
import type { ItemCatalog } from "./catalog";
import type { Evaluation, GearsetDocument, Stat } from "./types";
export function materiaConsumption(
  catalog: ItemCatalog,
  doc: GearsetDocument,
): NonNullable<Evaluation["consumption"]> {
  const groups = new Map<
    string,
    { stat: Stat; grade: number; safe: number; rates: number[] }
  >();
  for (const [slot, gear] of Object.entries(doc.equipment)) {
    let item;
    try {
      item = catalog.item(gear.itemId);
    } catch {
      continue;
    }
    const count = item.materiaSlot ?? 0;
    const duplicates =
      doc.duplicateToolMateria && ["mainHand", "offHand"].includes(slot)
        ? (catalog.rules.jobSchemas[doc.job].toolMateriaDuplicates ?? 1)
        : 1;
    for (const [index, m] of gear.materias.entries()) {
      if (!m.stat || !m.grade) continue;
      const value = catalog.rules.materias[m.stat]?.[m.grade - 1];
      if (
        value === undefined ||
        item.level < catalog.rules.materiaGradeRequiredLevels[m.grade - 1] ||
        (index > count && catalog.rules.materiaGradeIsRestricted[m.grade])
      )
        continue;
      const key = `${m.stat}:${m.grade}`;
      let group = groups.get(key);
      if (!group) {
        group = { stat: m.stat, grade: m.grade, safe: 0, rates: [] };
        groups.set(key, group);
      }
      if (index < count) group.safe += duplicates;
      else {
        const rate =
          (catalog.rules.materiaSuccessRates[index - count]?.[m.grade - 1] ??
            0) / 100;
        if (rate <= 0 || rate > 1) continue;
        for (let i = 0; i < duplicates; i++) group.rates.push(rate);
      }
    }
  }
  const advanced = Math.max(
    1,
    [...groups.values()].filter((g) => g.rates.length).length,
  );
  return [...groups.values()].map(({ stat, grade, safe, rates }) => {
    const expected = Math.round(
      safe + rates.reduce((sum, p) => sum + 1 / p, 0),
    );
    const targets = [0.9 ** (1 / advanced), 0.99 ** (1 / advanced)],
      confidence = [safe, safe];
    if (rates.length) {
      const k = rates.length;
      let probability = new Array<number>(k + 1).fill(0);
      probability[0] = 1;
      for (let attempts = 1; attempts <= 20000; attempts++) {
        const next = new Array<number>(k + 1).fill(0);
        next[k] = probability[k];
        for (let i = 0; i < k; i++) {
          next[i] += probability[i] * (1 - rates[i]);
          next[i + 1] += probability[i] * rates[i];
        }
        probability = next;
        for (let i = 0; i < 2; i++)
          if (confidence[i] === safe && probability[k] >= targets[i])
            confidence[i] = safe + attempts;
        if (confidence[1] > safe) break;
      }
      if (confidence[1] === safe)
        throw new Error("Materia confidence calculation exceeded its bound.");
    }
    return {
      stat,
      grade,
      guaranteed: safe,
      expected,
      confidence90: confidence[0],
      confidence99: confidence[1],
    };
  });
}
