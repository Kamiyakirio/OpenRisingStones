/** Validate owned rule coefficients and cross-table item references before installation. */
export function validate({ data, rules }, contract) {
  for (const [name, length] of Object.entries(contract.formulaLengths)) {
    const values = rules.formulas[name]?.numbers;
    if (
      !Array.isArray(values) ||
      values.length !== length ||
      values.some((value) => !Number.isFinite(value))
    )
      throw new Error(`Invalid formula parameters: ${name}`);
  }
  const gears = Object.entries(data)
    .filter(([k]) => /^gears-/.test(k))
    .flatMap(([, v]) => v);
  const ids = new Set();
  for (const gear of [...gears, ...data.foods]) {
    if (!Number.isSafeInteger(gear.id) || gear.id <= 0 || ids.has(gear.id))
      throw new Error(`Invalid or duplicate item ID: ${gear.id}`);
    ids.add(gear.id);
    if (
      !data.jobCategories[gear.jobCategory] ||
      !Number.isFinite(gear.level) ||
      !gear.stats
    )
      throw new Error(`Invalid item metadata: ${gear.id}`);
    const keys = Object.keys(gear);
    if (keys.some((k) => !contract.itemFields.includes(k)))
      throw new Error(`Unknown item fields: ${gear.id}`);
    if (
      Object.entries(gear.stats).some(
        ([k, v]) => !(k in rules.statNames) || !Number.isFinite(v),
      )
    )
      throw new Error(`Invalid item stats: ${gear.id}`);
    if (
      gear.slot > 0 &&
      (!data.gearGroups[gear.id] || !data.levelCaps.level.includes(gear.level))
    )
      throw new Error(`Missing gear index or caps: ${gear.id}`);
  }
  for (const [key, items] of Object.entries(data).filter(([k]) =>
    /^gears-/.test(k),
  ))
    for (const gear of items) {
      const group =
        key === "gears-recent"
          ? data.gearGroupBasis.at(-1)
          : Number(key.slice(6));
      if (data.gearGroups[gear.id] !== group)
        throw new Error(`Mismatched gear group: ${gear.id}`);
    }
  for (const [job, schema] of Object.entries(rules.jobSchemas)) {
    if (
      !rules.jobLevelModifiers[schema.jobLevel] ||
      schema.stats.some((s) => !(s in rules.statNames))
    )
      throw new Error(`Invalid job rules: ${job}`);
  }
  for (const [name, values] of Object.entries(rules.materias))
    if (
      values.length !== rules.materiaGrades.length ||
      values.some((v) => !Number.isFinite(v) || v < 0)
    )
      throw new Error(`Invalid materia values: ${name}`);
  for (const stat of Object.keys(data.levelCaps).filter((k) => k !== "level"))
    if (
      data.levelCaps[stat].length !== data.levelCaps.level.length ||
      !data.slotCaps[stat] ||
      !data.roleCaps[stat]
    )
      throw new Error(`Invalid cap tables: ${stat}`);
  return ids.size;
}
