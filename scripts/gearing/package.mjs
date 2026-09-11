/** Assemble, normalize and atomically publish gearing data; downloaded tables remain transient. */
import { createHash } from "node:crypto";
import {
  readFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import * as game from "./config/game.mjs";
import { expandCustomWeaponRules } from "./rules.mjs";
import { convert } from "./convert.mjs";
import { validate } from "./validate.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");

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
    parameters,
    colors: read("config/colors.json"),
    customWeaponRules: expandCustomWeaponRules(policy, game.statNames),
    acquisition: policy.acquisition,
    search: policy.search,
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
    "package.mjs",
    "convert.mjs",
    "csv.mjs",
    "rules.mjs",
    "download.mjs",
    "validate.mjs",
    "contract.json",
  ])
    read(name);
  const { data, sourcesMissing } = convert(raw, config);
  const customWeapons = data.items
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
            rule.sourceId === item.sourceId &&
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

/** Convert validated tables into the single frontend data asset. */
const slotKey = (slot) =>
  ({
    0: "retired",
    1: "mainHand",
    2: "offHand",
    3: "head",
    4: "body",
    5: "hands",
    6: "waist",
    7: "legs",
    8: "feet",
    9: "ears",
    10: "neck",
    11: "wrists",
    12: "ringLeft",
    "-12": "ringRight",
    13: "mainHand",
    17: "soul",
    "-1": "food",
    "-2": "potion",
  })[slot];

export function createCatalog(bundle, manifest) {
  const {
    items,
    jobCategories: _categories,
    lodestoneIds: _links,
    ...tables
  } = bundle.data;
  const sourceIds = new Map();
  const records = [];
  for (const item of items) {
    let sourceId = null;
    if (item.source) {
      sourceId = item.sourceId;
      if (!sourceId) throw new Error(`Missing stable source ID: ${item.id}`);
      if (!sourceIds.has(item.source)) {
        sourceIds.set(item.source, sourceId);
      }
    }
    const kind =
      item.slot === -1 ? "food" : item.slot === -2 ? "potion" : "equipment";
    const { source, jobCategory, ...definition } = item;
    definition.sourceId = sourceId;
    definition.lodestoneId = bundle.data.lodestoneIds[item.id];
    definition.kind = kind;
    if (kind !== "equipment") delete definition.slot;
    definition.slotKey = slotKey(item.slot);
    if (!definition.slotKey)
      throw new Error(`Unsupported item slot: ${item.slot}`);
    definition.jobs = Object.keys(
      bundle.data.jobCategories[jobCategory] ?? {},
    ).sort();
    definition.acquisition = acquisition(item, bundle.rules.acquisition);
    definition.weaponFamilyId = bundle.rules.customWeaponRules.find(
      (rule) => rule.sourceId === sourceId,
    )?.id;
    records.push(definition);
  }
  const rules = structuredClone(bundle.rules);
  rules.jobOrder = Object.keys(rules.jobSchemas);
  delete rules.formulas;
  for (const schema of Object.values(rules.jobSchemas))
    schema.slots = schema.slots.map((slot) => ({
      ...slot,
      key: slotKey(slot.slot),
      slot: slot.slot === -12 ? 24 : slot.slot > 0 ? slot.slot : undefined,
    }));
  return {
    manifest,
    items: records.sort((a, b) => a.id - b.id),
    rules,
    tables,
    sources: [...sourceIds]
      .map(([label, id]) => ({ id, label }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function acquisition(item, policy) {
  const kind = item.acquisitionKind ?? "other";
  return {
    kind,
    ringExclusivityGroup: [
      "tomestone",
      "augmentedTomestone",
      "raid",
      "dungeon",
    ].includes(kind)
      ? kind
      : undefined,
    tomestoneCost:
      kind === "tomestone" ? (policy.tomestoneCostsBySlot[item.slot] ?? 0) : 0,
    raidCost: kind === "raid" ? (policy.raidCostsBySlot[item.slot] ?? 0) : 0,
  };
}

function previousCatalog(target) {
  const path = join(target, "catalog.json");
  if (!existsSync(path)) return { items: new Map(), rules: {} };
  const data = JSON.parse(readFileSync(path, "utf8"));
  return {
    items: new Map(data.items.map((item) => [item.id, item])),
    rules: data.rules,
  };
}
export function installBundle(bundle, { target, contract, check = false }) {
  const count = validate(bundle, contract);
  const previous = previousCatalog(target);
  const canonical = JSON.stringify({ data: bundle.data, rules: bundle.rules });
  const manifest = {
    formatVersion: 3,
    generatorVersion: 3,
    sourceProfile: "raw-csv",
    gameVersion: bundle.gameVersion,
    sources: bundle.sources,
    inputs: bundle.inputs,
    review: bundle.review,
    dataVersion: hash(canonical),
    parameterVersion: hash(JSON.stringify(bundle.rules)),
  };
  mkdirSync(dirname(target), { recursive: true });
  const stage = mkdtempSync(join(dirname(target), ".catalog-")),
    backup = `${stage}.previous`;
  let moved = false;
  try {
    const asset = join(stage, "catalog.json");
    writeFileSync(
      asset,
      JSON.stringify(createCatalog(bundle, manifest)) + "\n",
    );
    const next = previousCatalog(stage);
    const itemChanges = { added: 0, changed: 0, removed: 0 };
    for (const [id, item] of next.items) {
      if (!previous.items.has(id)) itemChanges.added++;
      else if (JSON.stringify(previous.items.get(id)) !== JSON.stringify(item))
        itemChanges.changed++;
    }
    for (const id of previous.items.keys())
      if (!next.items.has(id)) itemChanges.removed++;
    const parameterChanges = [
      ...new Set([...Object.keys(previous.rules), ...Object.keys(next.rules)]),
    ].filter(
      (key) =>
        JSON.stringify(previous.rules[key]) !== JSON.stringify(next.rules[key]),
    );
    const report = {
      mode: check ? "check" : "update",
      sourceProfile: manifest.sourceProfile,
      items: count,
      gameVersion: bundle.gameVersion,
      dataVersion: manifest.dataVersion,
      itemChanges,
      parameterChanges,
      review: bundle.review,
    };
    if (check) return report;
    const files = { "catalog.json": hash(readFileSync(asset)) };
    writeFileSync(
      join(stage, "manifest.json"),
      JSON.stringify({ ...manifest, files }, null, 2) + "\n",
    );
    if (existsSync(target)) {
      renameSync(target, backup);
      moved = true;
    }
    try {
      renameSync(stage, target);
    } catch (error) {
      if (moved) renameSync(backup, target);
      throw error;
    }
    if (moved) rmSync(backup, { recursive: true });
    return report;
  } finally {
    if (existsSync(stage)) rmSync(stage, { recursive: true });
  }
}
