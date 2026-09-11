/** Expand shared optimizer defaults and translate named coefficients into runtime rules. */
export function expandCustomWeaponRules(policy, statNames) {
  const isObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const defaults = policy.customWeaponDefaults ?? {};
  if (!isObject(defaults) || !Array.isArray(policy.customWeaponRules))
    throw new Error("Invalid custom weapon defaults or rule list.");
  const ids = new Set(),
    allocations = new Set();
  return policy.customWeaponRules.map((rule) => {
    if (
      !isObject(rule) ||
      typeof rule.id !== "string" ||
      !rule.id.trim() ||
      ids.has(rule.id) ||
      typeof rule.sourceId !== "string" ||
      !rule.sourceId.trim()
    )
      throw new Error(
        "Custom weapon rules require unique IDs and nonempty sources.",
      );
    ids.add(rule.id);
    // Arrays replace defaults, slot weights override by slot, and explicit false must remain false.
    const candidates = Object.hasOwn(rule, "statCandidates")
      ? rule.statCandidates
      : defaults.statCandidates;
    const linked = Object.hasOwn(rule, "linkSlotAllocations")
      ? rule.linkSlotAllocations
      : (defaults.linkSlotAllocations ?? false);
    if (
      !Array.isArray(candidates) ||
      new Set(candidates).size < 3 ||
      candidates.some(
        (stat) =>
          !["speed", "secondary"].includes(stat) &&
          !Object.hasOwn(statNames, stat),
      ) ||
      typeof linked !== "boolean"
    )
      throw new Error(
        `Invalid custom weapon candidates or linkage: ${rule.id}`,
      );
    if (
      (defaults.slotWeights !== undefined && !isObject(defaults.slotWeights)) ||
      (rule.slotWeights !== undefined && !isObject(rule.slotWeights))
    )
      throw new Error(`Invalid custom weapon slot weights: ${rule.id}`);
    const weights = { ...defaults.slotWeights, ...rule.slotWeights };
    if (
      !Object.keys(weights).length ||
      Object.entries(weights).some(
        ([slot, pair]) =>
          !Number.isSafeInteger(Number(slot)) ||
          Number(slot) <= 0 ||
          !Array.isArray(pair) ||
          pair.length !== 2 ||
          !pair.every(Number.isSafeInteger) ||
          pair[0] < 0 ||
          pair[1] <= 0,
      )
    )
      throw new Error(`Invalid custom weapon slot ratio: ${rule.id}`);
    if (!isObject(rule.itemLevels) || !Object.keys(rule.itemLevels).length)
      throw new Error(`Missing custom weapon item levels: ${rule.id}`);
    for (const [level, allocation] of Object.entries(rule.itemLevels)) {
      const key = `${rule.sourceId}:${level}`;
      if (
        !Number.isSafeInteger(Number(level)) ||
        Number(level) <= 0 ||
        !isObject(allocation) ||
        !Number.isSafeInteger(allocation.major) ||
        allocation.major < 0 ||
        !Number.isSafeInteger(allocation.minor) ||
        allocation.minor < 0 ||
        allocations.has(key)
      )
        throw new Error(
          `Invalid or duplicate custom weapon allocation: ${rule.id}/${level}`,
        );
      allocations.add(key);
    }
    // Emit a complete independent rule so frontend and native callers share one interpretation.
    return {
      id: rule.id,
      sourceId: rule.sourceId,
      itemLevels: Object.fromEntries(
        Object.entries(rule.itemLevels).map(([level, allocation]) => [
          level,
          { ...allocation },
        ]),
      ),
      statCandidates: [...candidates],
      slotWeights: Object.fromEntries(
        Object.entries(weights).map(([slot, pair]) => [slot, [...pair]]),
      ),
      linkSlotAllocations: linked,
    };
  });
}
