/** Build the complete package from raw tables and this repository's owned rule configuration. */
import { readFileSync } from "node:fs";
import * as game from "./config/game.mjs";
import { formulaRules, expandCustomWeaponRules } from "./rules.mjs";
import { convert } from "./convert.mjs";
import { hash } from "./hash.mjs";

export function buildBundle({ raw, sources, gameVersion }) {
  const inputs = Object.fromEntries(
    Object.entries(raw).map(([name, text]) => [name, hash(text)]),
  );
  const read = (name) => {
    const text = readFileSync(new URL(name, import.meta.url), "utf8");
    inputs[`@local/${name}`] = hash(text);
    return name.endsWith(".json") ? JSON.parse(text) : text;
  };
  const { jobLevels: _jobLevels, ...gameRules } = game;
  const policy = read("optimizer-policy.json"),
    parameters = read("config/formulas.json");
  const rules = {
    ...gameRules,
    colors: read("config/colors.json"),
    customWeaponRules: expandCustomWeaponRules(policy, game.statNames),
    acquisition: policy.acquisition,
    search: policy.search,
    formulas: formulaRules(parameters, policy),
    detDhtAcceptableRatio: parameters.detDhtAcceptableRatio,
  };
  const config = {
    rules,
    conversion: read("config/conversion.json"),
    sources: read("config/sources.json"),
    blueMage: read("config/blue-mage.json"),
  };
  for (const name of [
    "config/game.mjs",
    "build.mjs",
    "convert.mjs",
    "csv.mjs",
    "rules.mjs",
    "download.mjs",
    "hash.mjs",
    "install.mjs",
    "validate.mjs",
    "contract.json",
  ])
    read(name);
  const { data, sourcesMissing } = convert(raw, config);
  const customWeapons = Object.entries(data)
    .filter(([name]) => name.startsWith("gears-"))
    .flatMap(([, items]) => items)
    .filter(
      (item) =>
        item.customizable &&
        Object.entries(rules.jobSchemas).some(
          ([job, schema]) =>
            data.jobCategories[item.jobCategory]?.[job] &&
            item.level >= schema.defaultItemLevel[0],
        ) &&
        !rules.customWeaponRules.some(
          (rule) =>
            rule.source === item.source &&
            rule.itemLevels[item.level] &&
            rule.slotWeights[item.slot],
        ),
    )
    .map(({ id, name, level, source }) => ({ id, name, level, source }));
  // Round-trip once to normalize sparse arrays and omitted optional fields before validation and diffing.
  return JSON.parse(
    JSON.stringify({
      data: Object.fromEntries(
        Object.entries(data).sort(([a], [b]) => a.localeCompare(b, "en")),
      ),
      rules,
      inputs,
      sources,
      gameVersion,
      sourceProfile: "raw-csv",
      review: { missingSources: sourcesMissing, customWeapons },
    }),
  );
}
