/** Validate and transactionally install generated data; shared by the CLI and regression tests. */
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
import { validate } from "./validate.mjs";
import { hash } from "./hash.mjs";

export function installBundle(bundle, { target, contract, check = false }) {
  const count = validate(bundle, contract);
  const previous = existsSync(join(target, "manifest.json"))
    ? JSON.parse(readFileSync(join(target, "manifest.json"), "utf8"))
    : null;
  const contents = {
    ...Object.fromEntries(
      Object.entries(bundle.data).map(([key, value]) => [
        `${key}.json`,
        JSON.stringify(value, null, 2) + "\n",
      ]),
    ),
    "rules.json": JSON.stringify(bundle.rules, null, 2) + "\n",
  };
  const files = Object.fromEntries(
    Object.entries(contents).map(([key, value]) => [key, hash(value)]),
  );
  const manifest = {
    formatVersion: 1,
    generatorVersion: 1,
    sourceProfile: "raw-csv",
    gameVersion: bundle.gameVersion,
    sources: bundle.sources,
    inputs: bundle.inputs,
    review: bundle.review,
    dataVersion: hash(JSON.stringify(files)),
    parameterVersion: hash(contents["rules.json"]),
    files,
  };
  contents["manifest.json"] = JSON.stringify(manifest, null, 2) + "\n";
  const changes = { added: [], changed: [], removed: [] };
  for (const [name, digest] of Object.entries(files)) {
    if (!previous?.files[name]) changes.added.push(name);
    else if (previous.files[name] !== digest) changes.changed.push(name);
  }
  for (const name of Object.keys(previous?.files ?? {}))
    if (!files[name]) changes.removed.push(name);
  const isItems = (name) => name === "foods.json" || /^gears-/.test(name);
  const oldItems = new Map(
    Object.keys(previous?.files ?? {})
      .filter(isItems)
      .flatMap((name) => JSON.parse(readFileSync(join(target, name), "utf8")))
      .map((item) => [item.id, JSON.stringify(item)]),
  );
  const newItems = new Map(
    Object.entries(bundle.data)
      .filter(([name]) => isItems(`${name}.json`))
      .flatMap(([, items]) => items)
      .map((item) => [item.id, JSON.stringify(item)]),
  );
  const itemChanges = { added: 0, changed: 0, removed: 0 };
  for (const [id, value] of newItems) {
    if (!oldItems.has(id)) itemChanges.added++;
    else if (oldItems.get(id) !== value) itemChanges.changed++;
  }
  for (const id of oldItems.keys())
    if (!newItems.has(id)) itemChanges.removed++;
  const oldRules = previous
    ? JSON.parse(readFileSync(join(target, "rules.json"), "utf8"))
    : {};
  const parameterChanges = [
    ...new Set([...Object.keys(oldRules), ...Object.keys(bundle.rules)]),
  ].filter(
    (key) =>
      JSON.stringify(oldRules[key]) !== JSON.stringify(bundle.rules[key]),
  );
  const report = {
    mode: check ? "check" : "import",
    sourceProfile: manifest.sourceProfile,
    items: count,
    gameVersion: bundle.gameVersion,
    dataVersion: manifest.dataVersion,
    itemChanges,
    parameterChanges,
    review: bundle.review,
    ...changes,
  };
  if (check) return report;
  mkdirSync(dirname(target), { recursive: true });
  const stage = mkdtempSync(join(dirname(target), ".import-")),
    backup = `${stage}.previous`;
  let moved = false;
  try {
    for (const [name, text] of Object.entries(contents))
      writeFileSync(join(stage, name), text);
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
  } finally {
    if (existsSync(stage)) rmSync(stage, { recursive: true });
  }
  return report;
}
