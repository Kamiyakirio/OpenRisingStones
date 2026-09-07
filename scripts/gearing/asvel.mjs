/** Map official upstream coefficients into the desktop solver's existing parameter order. */
export function asvelRules(sourceFormulas, policy, contract) {
  for (const [name, expected] of Object.entries(contract.upstream.formulas)) {
    if (sourceFormulas[name]?.structure !== expected)
      throw new Error(
        `Upstream calculation structure changed: ${name}; review the coefficient mapping.`,
      );
  }
  const effects = sourceFormulas.equippedEffects.numbers;
  const formula = (name, numbers) => ({
    numbers,
    structure: contract.formulas[name],
  });
  return {
    customWeaponRules: policy.customWeaponRules,
    acquisition: policy.acquisition,
    search: policy.search,
    sourceFormulas,
    formulas: {
      floor: formula("floor", sourceFormulas.floor.numbers),
      calcGcd: formula("calcGcd", effects.slice(31, 39)),
      calcRequiredSpeed: formula(
        "calcRequiredSpeed",
        policy.requiredSpeedSearch,
      ),
      // Desktop formulas add two zero defaults for BLU stats and split out the embedded GCD formula.
      calcEffects: formula("calcEffects", [
        ...effects.slice(0, 20),
        0,
        0,
        ...effects.slice(20, 31),
        ...effects.slice(39),
      ]),
      getCaps: formula("getCaps", sourceFormulas.getCaps.numbers),
      materiaDetDhtOptimized: formula(
        "materiaDetDhtOptimized",
        sourceFormulas.materiaDetDhtOptimized.numbers,
      ),
    },
    detDhtAcceptableRatio:
      sourceFormulas.materiaDetDhtOptimized.numbers[
        contract.parameters.detDhtAcceptableRatioIndex
      ],
  };
}
