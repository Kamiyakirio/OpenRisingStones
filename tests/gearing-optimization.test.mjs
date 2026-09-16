/** Regression through TS business preparation and the real Rust search executable, without data fixtures. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import "./helpers/gearing-loader.mjs";
const { ItemCatalog } =
  await import("../src/features/gearing/editor/catalog.ts");
const { newDocument, configuration } =
  await import("../src/features/gearing/editor/compatibility.ts");
const { calculation, prepareGear, evaluate, customRule } =
  await import("../src/features/gearing/editor/evaluation.ts");
const { prepareOptimization } =
  await import("../src/features/gearing/editor/optimization.ts");
const { generateBenchmarkDataset } =
  await import("../src/features/gearing/benchmark/generator.ts");
const { isValidSample } =
  await import("../src/features/gearing/benchmark/results.ts");
const dataset = JSON.parse(
  readFileSync("src/features/gearing/data/generated/catalog.json", "utf8"),
);
const catalog = new ItemCatalog(dataset);
execFileSync(
  "cargo",
  [
    "build",
    "--offline",
    "--release",
    "--manifest-path",
    "src-tauri/crates/gearing-engine/Cargo.toml",
    "--example",
    "solve",
  ],
  { stdio: "pipe" },
);
function solve(kind, input, parameters = catalog.rules) {
  return JSON.parse(
    execFileSync(
      "src-tauri/crates/gearing-engine/target/release/examples/solve",
      [],
      {
        input: JSON.stringify({ kind, input, parameters }) + "\n",
        encoding: "utf8",
        timeout: 30000,
      },
    ).trim(),
  );
}
const conditions = () => ({
  kind: "combat",
  mode: "all",
  targetGcd: 2.4,
  exactGcd: false,
  minLevel: 780,
  maxLevel: 795,
  sourceIds: [],
  excludedItemIds: [],
  optimizeFood: true,
  targets: {},
});
function optimize(doc, c) {
  const prepared = prepareOptimization(catalog, doc, c);
  if ("status" in prepared) return prepared;
  return prepared.interpret(solve(c.kind, prepared.input, prepared.parameters));
}
const query = (job, slot, minLevel = 780, maxLevel = 795) => ({
  job,
  slot,
  minLevel,
  maxLevel,
  sourceIds: [],
  search: "",
  hideObsolete: true,
  sortStat: "",
  offset: 0,
  limit: 30000,
});

test("real-catalog optimization emits structured, internally consistent stage diagnostics", () => {
  const variant = generateBenchmarkDataset(catalog, {
    job: "SCH",
    seed: "alpha",
    caseCount: 1,
  }).variants[0];
  const run = spawnSync(
    "src-tauri/crates/gearing-engine/target/release/examples/solve",
    [],
    {
      input:
        JSON.stringify({
          kind: "combat",
          input: variant.input,
          parameters: variant.parameters,
        }) + "\n",
      encoding: "utf8",
      env: { ...process.env, ORS_GEARING_TRACE: "1" },
      timeout: 30000,
    },
  );
  assert.equal(run.status, 0, run.stderr);
  const tracedResult = JSON.parse(run.stdout);
  assert.equal(tracedResult.status, "ok");
  assert.deepEqual(
    tracedResult,
    solve("combat", variant.input, variant.parameters),
  );
  const events = run.stderr
    .trim()
    .split("\n")
    .filter((line) => line.startsWith("ORS_GEARING_TRACE "))
    .map((line) => JSON.parse(line.slice("ORS_GEARING_TRACE ".length)));
  assert.ok(events.length > 3);
  assert.ok(events.every((event) => event.schemaVersion === 1));
  assert.ok(events.some((event) => event.event === "slot_preparation"));
  assert.equal(
    events.find((event) => event.event === "solver_input")?.gearCount,
    44,
  );
  assert.ok(events.some((event) => event.event === "food_filter"));
  assert.ok(events.some((event) => event.event === "exact_food"));
  for (const event of events.filter(
    (value) => value.event === "frontier_round",
  )) {
    assert.ok(event.retainedStates <= event.combinedStates);
    assert.ok(event.elapsedMs >= 0);
  }
  for (const event of events.filter((value) => value.event === "exact_food")) {
    assert.ok(event.visited >= event.nodes);
    assert.ok(event.searchMs >= 0);
  }
});

test("hard seeded combat scopes finish with exact valid plans", () => {
  for (const [job, seed, size, checksum, damage] of [
    ["WAR", "4a2a7df5bdba969c", 4, "1ab375ac", 55.90690263834694],
    ["BRD", "8abced29", 64, "b7352779", 123.93222657074288],
    ["BLU", "20260916", 4, "248e9a03", 22.63197486552473],
  ]) {
    const variant = generateBenchmarkDataset(catalog, {
      job,
      seed,
      caseCount: 1,
    }).variants.find((entry) => entry.size === size);
    assert.ok(variant);
    assert.equal(variant.inputChecksum, checksum);
    const result = solve("combat", variant.input, variant.parameters);
    assert.equal(result.status, "ok");
    assert.equal(isValidSample(result, variant), true);
    assert.ok(Math.abs(result.effects.damage - damage) < 1e-10);
  }
});

test("original SCH 51 candidates retain the supplied result across TS and Rust", () => {
  const ids = [
    49512, 49551, 49552, 49553, 49554, 49555, 49564, 49569, 49574, 49579, 50878,
    50879, 50880, 50881, 50882, 51118, 51157, 51158, 51159, 51160, 51161, 51170,
    51175, 51180, 51185, 50901, 49589, 49628, 49629, 49630, 49631, 49632, 49641,
    49646, 49651, 49656, 49705, 49706, 49707, 49708, 49709, 49718, 49723, 49728,
    49733, 49666, 52307,
  ];
  const doc = newDocument("Original"),
    c = conditions();
  let count = 0;
  for (const slot of catalog.rules.jobSchemas.SCH.slots.filter(
    (s) => s.slot > 0,
  )) {
    for (const item of catalog.query(query("SCH", slot.key)).items) {
      if (ids.includes(item.id)) count++;
      else c.excludedItemIds.push(item.id);
    }
  }
  assert.equal(count, 51);
  const result = optimize(doc, c);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.equal(result.speed, 1237);
  assert.equal(result.effects.damage.toFixed(5), "128.48722");
  assert.equal(result.foodId, 49244);
  assert.equal(Object.keys(result.document.equipment).length, 11);
  assert.deepEqual(result.stats, result.evaluation.stats);
  assert.deepEqual(result.effects, result.evaluation.effects);
});

test("complete scope retains new weapons and exact GCD", () => {
  const c = conditions();
  c.exactGcd = true;
  const result = optimize(newDocument("All"), c);
  assert.equal(result.status, "ok");
  assert.equal(result.evaluation.effects.gcd, 2.4);
  assert.ok(result.evaluation.effects.damage >= 128.48721);
  assert.deepEqual(result.effects, result.evaluation.effects);
});

test("current native search matches small exhaustive TS evaluation", () => {
  const doc = newDocument("Small");
  doc.equipment.mainHand = configuration(49512);
  const c = {
    ...conditions(),
    mode: "current",
    targetGcd: 2.5,
    optimizeFood: false,
  };
  const result = optimize(doc, c);
  assert.equal(result.status, "ok");
  const options = [
    {},
    ...[12, 11].flatMap((grade) =>
      ["CRT", "DET", "DHT", "SPS"].map((stat) => ({ stat, grade })),
    ),
  ];
  let maximum = -Infinity;
  for (const a of options)
    for (const b of options) {
      doc.equipment.mainHand.materias = [a, b];
      const e = evaluate(catalog, doc);
      assert.equal(e.issues.length, 0);
      maximum = Math.max(maximum, e.effects.damage);
    }
  assert.ok(Math.abs(maximum - result.effects.damage) < 1e-10);
});

test("locks and unreachable targets preserve current equipment", () => {
  const doc = newDocument("Locked");
  doc.equipment.mainHand = {
    ...configuration(49512),
    equipmentLocked: true,
    materiaLocked: true,
    materias: [{ stat: "DET", grade: 12 }],
  };
  const c = {
    ...conditions(),
    mode: "current",
    targetGcd: 2.5,
    optimizeFood: false,
  };
  const result = optimize(doc, c);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.document.equipment.mainHand.materias[0], {
    stat: "DET",
    grade: 12,
  });
  c.targetGcd = 1.8;
  assert.equal(optimize(doc, c).status, "unreachable");
});

test("custom paladin weapons preserve linked 447/108 allocations", () => {
  const doc = newDocument("Paladin", "PLD");
  for (const slot of ["mainHand", "offHand"]) {
    const item = catalog
      .query(query("PLD", slot))
      .items.find((i) => i.level === 795 && i.weaponFamilyId === "huanjing");
    assert.ok(item);
    doc.equipment[slot] = configuration(item.id);
  }
  const result = optimize(doc, {
    ...conditions(),
    mode: "current",
    targetGcd: 2.5,
    optimizeFood: false,
  });
  assert.equal(result.status, "ok");
  const { mainHand: a, offHand: b } = result.document.equipment;
  assert.deepEqual(
    Object.keys(a.customStats).sort(),
    Object.keys(b.customStats).sort(),
  );
  assert.deepEqual(
    Object.keys(a.customStats)
      .map((s) => a.customStats[s] + b.customStats[s])
      .sort((a, b) => a - b),
    [108, 447, 447],
  );
  assert.equal(
    customRule(catalog, catalog.item(a.itemId), catalog.rules.jobSchemas.PLD)
      .major,
    319,
  );
});

test("local evaluation handles missing items, known tiers and HQ components", () => {
  const doc = newDocument("Broken");
  doc.equipment.head = configuration(999999);
  const e = evaluate(catalog, doc);
  assert.equal(e.issues[0].itemId, 999999);
  assert.throws(
    () => prepareOptimization(catalog, doc, conditions()),
    /missing equipment/,
  );
  assert.equal(
    evaluate(catalog, newDocument("Tiers"), true).tiers.SPS.next,
    22,
  );
  const item = catalog.query(query("SCH", "mainHand")).items.find((i) => i.hq);
  for (const [stat, value] of Object.entries(item.stats))
    assert.equal(value, item.baseStats[stat] + (item.hqStats[stat] ?? 0));
});

test("production preparation handles targets and legal overmelds", () => {
  const doc = newDocument("Craft", "CRP"),
    item = catalog
      .query(query("CRP", "mainHand", 600, 9999))
      .items.find((i) => i.materiaAdvanced);
  doc.equipment.mainHand = configuration(item.id);
  const before = evaluate(catalog, doc);
  const c = {
    ...conditions(),
    kind: "production",
    mode: "current",
    targets: { CMS: before.stats.CMS + 10 },
  };
  const result = optimize(doc, c);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.equal(result.evaluation.issues.length, 0);
  assert.ok(result.evaluation.stats.CMS >= c.targets.CMS);
  assert.ok(result.evaluation.consumption.length);
});

test("DET/DHT interpretation applies the solver grade and preserves locks", () => {
  const doc = newDocument("Distribution");
  doc.equipment.mainHand = {
    ...configuration(49512),
    materias: [{ stat: "DET", grade: 11 }],
  };
  const c = { ...conditions(), kind: "det-dht", mode: "current" };
  let r = optimize(doc, c);
  assert.equal(r.status, "ok");
  r.alternatives.forEach((a, i) => {
    assert.equal(r.solutions[i].DET, a.evaluation.stats.DET);
    assert.equal(r.solutions[i].DHT, a.evaluation.stats.DHT);
  });
  doc.equipment.mainHand.materiaLocked = true;
  r = optimize(doc, c);
  assert.deepEqual(r.evaluation.stats, evaluate(catalog, doc).stats);
});

test("solver constraints retain ring exclusivity and shared weapon budget", () => {
  const doc = newDocument("Constraints", "PLD"),
    input = calculation(catalog, doc);
  const item = catalog.query(query("PLD", "mainHand")).items[0];
  const gear = prepareGear(catalog, input, "mainHand", configuration(item.id));
  gear.data = {
    ...gear.data,
    materiaSlot: 0,
    materiaAdvanced: false,
    customizable: false,
  };
  gear.materias = [];
  gear.customRule = null;
  input.mode = "all";
  input.targetGcd = 2.5;
  input.rules.schema.slots = [
    { slot: 12, name: "Left ring", uiGroup: "right" },
    { slot: 24, name: "Right ring", uiGroup: "right" },
  ];
  gear.id = 1;
  gear.slot = 12;
  gear.acquisition = {
    kind: "raid",
    ringExclusivityGroup: "raid",
    tomestoneCost: 0,
    raidCost: 1,
  };
  input.gears = [gear, { ...gear, id: 2, slot: 24 }];
  input.filteredIds = [1, 2];
  assert.equal(solve("combat", input).status, "error");
  input.gears.push({
    ...gear,
    id: 3,
    slot: 24,
    acquisition: { kind: "other", tomestoneCost: 0, raidCost: 0 },
  });
  input.filteredIds.push(3);
  let result = solve("combat", input);
  assert.equal(result.status, "ok");
  assert.equal(result.plan[1].gearId, 3);
  input.rules.schema.slots = [
    { slot: 1, name: "Sword", uiGroup: "weapon" },
    { slot: 2, name: "Shield", uiGroup: "weapon" },
  ];
  gear.slot = 1;
  gear.acquisition = { kind: "tomestone", tomestoneCost: 0, raidCost: 0 };
  input.gears = [gear, { ...gear, id: 2, slot: 2 }];
  input.filteredIds = [1, 2];
  input.progressionWeeks = 1;
  assert.equal(solve("combat", input).status, "error");
  input.progressionWeeks = 2;
  assert.equal(solve("combat", input).status, "ok");
});
