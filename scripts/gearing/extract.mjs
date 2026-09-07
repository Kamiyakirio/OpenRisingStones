/** Known upstream source locations forming the data and parameter import contract. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { reader, hash } from "./reader.mjs";
import { asvelRules } from "./asvel.mjs";

export const gameConstants = [
  "statNames",
  "jobLevelModifiers",
  "baseStats",
  "customStatMax",
  "jobSchemas",
  "statHighlight",
  "materias",
  "materiaGrades",
  "materiaGradeRequiredLevels",
  "materiaSuccessRates",
  "materiaNames",
  "materiaGradeNames",
  "races",
  "clans",
  "clanStats",
  "syncLevelIsPopular",
  "syncLevelOfJobLevels",
];
export function extract(source) {
  const inputs = {};
  const read = (path) => {
    const text = readFileSync(join(source, path), "utf8");
    inputs[path] = hash(text);
    return reader(text, path);
  };
  const data = {};
  const required = [
    "foods",
    "jobCategories",
    "levelCaps",
    "slotCaps",
    "roleCaps",
    "syncLevels",
    "lodestoneIds",
    "bluMdmgAdditions",
    "gearGroups",
    "gearGroupBasis",
    "gears-recent",
  ];
  const names = readdirSync(join(source, "data/out"))
    .filter((n) => n.endsWith(".js"))
    .sort();
  for (const filename of names) {
    const name = filename.slice(0, -3);
    if (!required.includes(name) && !/^gears-\d+$/.test(name))
      throw new Error(`Unknown data file: ${filename}`);
    data[name] = read(`data/out/${filename}`).exportedData();
  }
  for (const name of required)
    if (!Object.hasOwn(data, name))
      throw new Error(`Missing data file: ${name}`);
  const game = read("src/game.ts");
  const rules = Object.fromEntries(
    gameConstants.map((name) => [name, game.constant(name)]),
  );
  const restricted = game.file.statements.find(
    (s) =>
      ts.isForOfStatement(s) &&
      s.statement.getText(game.file).includes("materiaGradeIsRestricted"),
  );
  if (!restricted)
    throw new Error("Missing restricted materia grade declaration.");
  rules.materiaGradeIsRestricted = Array(
    rules.materiaGradeRequiredLevels.length + 1,
  ).fill(false);
  for (const grade of game.evaluate(restricted.expression))
    rules.materiaGradeIsRestricted[grade] = true;
  const gearPresentation = read("src/stores/Gear.ts");
  rules.colors = {
    source: gearPresentation.constant("sourceColors"),
    rarity: gearPresentation.constant("rarityColors"),
  };
  const sourceProfile = existsSync(
    join(source, "src/stores/gcdOptimizationFormula.ts"),
  )
    ? "optimizer-fork"
    : "asvel";
  if (sourceProfile === "asvel") {
    const store = read("src/stores/Store.ts");
    const policyText = readFileSync(
      new URL("./optimizer-policy.json", import.meta.url),
      "utf8",
    );
    inputs["@local/optimizer-policy.json"] = hash(policyText);
    inputs["@local/asvel.mjs"] = hash(
      readFileSync(new URL("./asvel.mjs", import.meta.url)),
    );
    const contract = JSON.parse(
      readFileSync(new URL("./contract.json", import.meta.url), "utf8"),
    );
    Object.assign(
      rules,
      asvelRules(
        {
          floor: read("src/stores/index.ts").formula("floor"),
          equippedEffects: store.formula("equippedEffects"),
          getCaps: game.formula("getCaps"),
          materiaDetDhtOptimized: store.formula("materiaDetDhtOptimized"),
        },
        JSON.parse(policyText),
        contract,
      ),
    );
  } else {
    rules.customWeaponRules = read("src/customWeaponRules.ts").constant(
      "customWeaponRules",
    );
    const acquisition = read("src/stores/gcdOptimizationAcquisition.ts");
    rules.acquisition = Object.fromEntries(
      [
        "acquisitionRules",
        "tomestoneCostsBySlot",
        "raidCostsBySlot",
        "progressionBudget",
      ].map((name) => [name, acquisition.constant(name)]),
    );
    const formulas = read("src/stores/gcdOptimizationFormula.ts");
    rules.formulas = Object.fromEntries(
      ["floor", "calcGcd", "calcRequiredSpeed", "calcEffects"].map((name) => [
        name,
        formulas.formula(name),
      ]),
    );
    rules.formulas.getCaps = game.formula("getCaps");
    rules.formulas.materiaDetDhtOptimized = read("src/stores/Store.ts").formula(
      "materiaDetDhtOptimized",
    );
    // The ordinal is pinned by the getter's structural fingerprint and contract.json.
    rules.detDhtAcceptableRatio =
      rules.formulas.materiaDetDhtOptimized.numbers[52];
    const search = read("src/stores/gcdOptimizationSearch.ts");
    rules.search = Object.fromEntries(
      [
        "gcdOptimizationMinTargetGcd",
        "gcdOptimizationMaxTargetGcd",
        "gcdOptimizationMaxSpeed",
        "gcdOptimizationFrontierLimit",
        "gcdOptimizationExactStateLimit",
        "gcdOptimizationDamageTolerance",
        "gcdOptimizationBoundTolerance",
      ].map((name) => [name, search.constant(name)]),
    );
    const production = read("src/stores/productionMateriaOptimizationCore.ts");
    rules.search.productionMateriaSearchStateLimit = production.constant(
      "productionMateriaSearchStateLimit",
    );
  }
  const changelog = readFileSync(join(source, "CHANGELOG.md"), "utf8");
  inputs["CHANGELOG.md"] = hash(changelog);
  const gameVersion =
    /\u66f4\u65b0\u6e38\u620f\u6570\u636e\u81f3(\d+\.\d+)/.exec(changelog)?.[1];
  if (!gameVersion) throw new Error("Cannot read game data version.");
  return { data, rules, inputs, gameVersion, sourceProfile };
}

export function validate({ data, rules }, contract) {
  if (rules.sourceFormulas) {
    for (const [name, expected] of Object.entries(contract.upstream.formulas))
      if (rules.sourceFormulas[name]?.structure !== expected)
        throw new Error(`Upstream calculation structure changed: ${name}`);
  }
  for (const [name, expected] of Object.entries(contract.formulas)) {
    if (rules.formulas[name]?.structure !== expected)
      throw new Error(
        `Calculation structure changed: ${name}; update the importer and implementation.`,
      );
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
