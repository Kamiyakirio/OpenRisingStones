/** Catalog installation, legacy compatibility, and async editor regressions without game snapshots. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  readFileSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import "./helpers/gearing-loader.mjs";
import { fixture } from "./helpers/gearing-fixture.mjs";
import { buildBundle, installBundle } from "../scripts/gearing/package.mjs";
import { checkGearingData } from "../scripts/check-gearing-data.mjs";
const { GearingViewModel } =
  await import("../src/features/gearing/editor/ViewModel.ts");
const {
  migrateLegacy,
  newDocument,
  configuration,
  shareDocument,
  importShare,
} = await import("../src/features/gearing/editor/compatibility.ts");
const codec = await import("../src/features/gearing/utils/share.ts");
const { findQuickSourceFilterId, sourceIdsForQuickFilter } =
  await import("../src/features/gearing/editor/sourceOrder.ts");
const contract = JSON.parse(readFileSync("scripts/gearing/contract.json"));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
function storage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  return map;
}
const evaluation = {
  stats: { SPS: 420 },
  baseStats: { SPS: 420 },
  effects: { damage: 1, gcd: 2.5 },
  slots: {},
  issues: [],
  tiers: {},
  itemLevel: 0,
  dataVersion: "test",
};
function api() {
  const documents = new Map();
  return {
    documents,
    bootstrap: async () => ({
      manifest: {
        dataVersion: "test",
        parameterVersion: "test",
        gameVersion: "7.55",
      },
      jobs: [
        {
          id: "SCH",
          name: "Scholar",
          defaultItemLevel: [780, 795],
          slots: [{ key: "mainHand", name: "Weapon" }],
          combat: true,
          jobLevel: 100,
        },
      ],
    }),
    list: async () => ({
      documents: [...documents.values()].map((d) => ({
        id: d.id,
        name: d.name,
        job: d.job,
      })),
      issues: [],
    }),
    load: async (id) => documents.get(id),
    save: async (d) => {
      documents.set(d.id, d);
      return { id: d.id };
    },
    query: async () => ({ items: [], total: 0 }),
    sourceIds: async () => [],
    items: async () => [],
    evaluate: async (d, revision) => ({ revision, evaluation }),
    cancel: async () => {},
    optimize: async () => ({ status: "ok" }),
  };
}

test("common source shortcuts include their upgraded and base variants", () => {
  const sources = [
    { id: "ultimate", label: "绝境战/妖星乱舞", order: 9 },
    { id: "savage", label: "零式/重量级", order: 8 },
    { id: "augmented", label: "点数强化/记忆", order: 7 },
    { id: "tomestone", label: "点数/记忆", order: 6 },
    { id: "dungeon", label: "迷宫挑战/雾之迹", order: 5 },
    { id: "crafted", label: "生产制作", order: 4 },
    { id: "augmented-crafted", label: "制作装强化", order: 3 },
    { id: "trial-crafted", label: "生产制作/海德林武器", order: 2 },
  ];
  assert.deepEqual(sourceIdsForQuickFilter(sources, "tomestone"), [
    "augmented",
    "tomestone",
  ]);
  assert.deepEqual(sourceIdsForQuickFilter(sources, "crafted"), [
    "crafted",
    "augmented-crafted",
  ]);
  assert.equal(
    findQuickSourceFilterId(sources, ["tomestone", "augmented"]),
    "tomestone",
  );
});

test("consumables and specialist stones use independent browsing ranges", async () => {
  storage();
  const vm = new GearingViewModel(api());
  await vm.initialize();
  if (!vm.getSnapshot().document && !vm.getSnapshot().migrationIssue)
    await vm.create("Test plan", "SCH");
  vm.filter({
    minLevel: 780,
    maxLevel: 795,
    sourceIds: ["raid"],
    search: "weapon",
  });
  vm.select("food");
  assert.equal(vm.getSnapshot().query.minLevel, 0);
  assert.equal(vm.getSnapshot().query.maxLevel, 9999);
  assert.deepEqual(vm.getSnapshot().query.sourceIds, []);
  vm.select("mainHand");
  assert.equal(vm.getSnapshot().query.minLevel, 780);
  assert.deepEqual(vm.getSnapshot().query.sourceIds, ["raid"]);
  assert.equal(vm.getSnapshot().query.search, "");
  vm.select("soul");
  assert.equal(vm.getSnapshot().query.minLevel, 0);
  vm.resetFilters();
  assert.equal(vm.getSnapshot().query.hideObsolete, false);
  vm.dispose();
});

test("cancelling a pending preview rejects its late evaluation", async () => {
  storage();
  const service = api();
  const vm = new GearingViewModel(service);
  await vm.initialize();
  if (!vm.getSnapshot().document && !vm.getSnapshot().migrationIssue)
    await vm.create("Test plan", "SCH");
  await pause(50);
  const pending = deferred();
  service.evaluate = () => pending.promise;
  const preview = vm.preview({ id: 10, kind: "equipment" });
  vm.cancelPreview();
  pending.resolve({ evaluation });
  await preview;
  assert.equal(vm.getSnapshot().preview, null);
  assert.equal(vm.getSnapshot().previewEvaluation, null);
  assert.equal(vm.getSnapshot().previewing, false);
  assert.equal(vm.getSnapshot().canUndo, false);
  vm.dispose();
});

test("empty job changes retain identity and new plans retain the selected job", async () => {
  storage();
  const service = api();
  const bootstrap = service.bootstrap;
  service.bootstrap = async () => {
    const data = await bootstrap();
    data.jobs.push({ ...data.jobs[0], id: "PLD", name: "Paladin" });
    return data;
  };
  const vm = new GearingViewModel(service);
  await vm.initialize();
  if (!vm.getSnapshot().document && !vm.getSnapshot().migrationIssue)
    await vm.create("Test plan", "SCH");
  const original = vm.getSnapshot().document.id;
  await vm.changeJob("PLD");
  assert.equal(vm.getSnapshot().document.id, original);
  assert.equal(service.documents.size, 0);
  vm.edit((draft) => {
    draft.equipment.mainHand = configuration(10);
  });
  await vm.save();
  await vm.changeJob("SCH");
  assert.notEqual(vm.getSnapshot().document.id, original);
  assert.equal(service.documents.get(original).equipment.mainHand.itemId, 10);
  await vm.changeJob("PLD");
  await vm.create("Another plan");
  assert.equal(vm.getSnapshot().document.job, "PLD");
  vm.dispose();
});

test("retrying failed storage clears the stale error without losing the draft", async () => {
  storage();
  const service = api();
  const vm = new GearingViewModel(service);
  await vm.initialize();
  if (!vm.getSnapshot().document && !vm.getSnapshot().migrationIssue)
    await vm.create("Test plan", "SCH");
  const save = service.save;
  service.save = async () => {
    throw new Error("Storage unavailable.");
  };
  vm.edit((draft) => {
    draft.name = "Retained draft";
  });
  await vm.save();
  assert.equal(vm.getSnapshot().saving, "error");
  service.save = save;
  await vm.save();
  assert.equal(vm.getSnapshot().saving, "saved");
  assert.equal(vm.getSnapshot().error, null);
  assert.equal(
    service.documents.get(vm.getSnapshot().document.id).name,
    "Retained draft",
  );
  vm.dispose();
});

test("JSON is the only generated data asset and installation is atomic, repeatable and reversible", () => {
  const root = mkdtempSync(join(tmpdir(), "gearing-catalog-"));
  const target = join(root, "generated");
  try {
    const bundle = buildBundle(fixture());
    const first = installBundle(bundle, { target, contract });
    assert.deepEqual(readdirSync(target).sort(), [
      "catalog.json",
      "manifest.json",
    ]);
    const before = readFileSync(join(target, "catalog.json"));
    assert.equal(checkGearingData(target).dataVersion, first.dataVersion);
    const repeated = installBundle(bundle, { target, contract });
    assert.equal(repeated.dataVersion, first.dataVersion);
    assert.deepEqual(repeated.itemChanges, {
      added: 0,
      changed: 0,
      removed: 0,
    });
    assert.deepEqual(readFileSync(join(target, "catalog.json")), before);
    const changed = structuredClone(bundle);
    changed.data.items[0].name = "Synthetic rename";
    const preview = installBundle(changed, { target, contract, check: true });
    assert.equal(preview.itemChanges.changed, 1);
    assert.deepEqual(readFileSync(join(target, "catalog.json")), before);
    const invalid = structuredClone(bundle);
    invalid.data.items.push(invalid.data.items[0]);
    assert.throws(
      () => installBundle(invalid, { target, contract }),
      /duplicate/,
    );
    assert.deepEqual(readFileSync(join(target, "catalog.json")), before);
    installBundle(changed, { target, contract });
    installBundle(bundle, { target, contract });
    assert.deepEqual(readFileSync(join(target, "catalog.json")), before);
    const stored = JSON.parse(
      readFileSync(join(target, "catalog.json"), "utf8"),
    );
    assert.ok(stored.rules.parameters);
    assert.equal(stored.rules.formulas, undefined);
    writeFileSync(join(target, "catalog.json"), "broken");
    assert.throws(() => checkGearingData(target), /checksum/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("base62 fixed protocol fixture survives without generated-data imports", () => {
  const code = "koj0tLf8juOkXvsDIQ4y";
  const parsed = codec.parse(code);
  assert.equal(parsed.job, "WAR");
  assert.equal(codec.stringify(parsed), code);
  assert.throws(() => codec.parse("!!!!"));
});

test("legacy drafts use positive IDs and explicit ring slots, retaining edited alternatives", () => {
  const doc = migrateLegacy(
    JSON.stringify({
      version: 1,
      clan: 2,
      snapshot: {
        job: "SCH",
        jobLevel: 100,
        syncLevel: 700,
        gears: {
          10: { id: 10, materias: [{ stat: "CRT", grade: 12 }] },
          "-10": { id: -10, materias: [] },
          20: { id: 20, customStats: { DET: 100 } },
        },
        equippedGears: { 12: 10, "-12": -10, "-1": 104 },
      },
    }),
    "Recovered",
  );
  assert.equal(doc.equipment.ringLeft.itemId, 10);
  assert.equal(doc.equipment.ringRight.itemId, 10);
  assert.equal(doc.foodId, 104);
  assert.equal(doc.clan, 2);
  assert.equal(doc.syncLevel, 700);
  assert.equal(doc.alternatives["legacy:20"][0].customStats.DET, 100);
  assert.throws(() => migrateLegacy(JSON.stringify({ version: 3 }), "Invalid"));
});

test("sharing preserves rings, food and custom values and rejects unrepresentable values", async () => {
  const doc = newDocument("Named plan");
  doc.equipment.ringLeft = {
    itemId: 12345,
    materias: [{ stat: "CRT", grade: 12 }],
    equipmentLocked: true,
    materiaLocked: false,
  };
  doc.equipment.ringRight = {
    itemId: 12346,
    materias: [{ stat: "DET", grade: 12 }],
    equipmentLocked: false,
    materiaLocked: false,
  };
  doc.foodId = 12347;
  const items = [
    { id: 12345, kind: "equipment", slotKey: "ringLeft", materiaSlot: 2 },
    { id: 12346, kind: "equipment", slotKey: "ringLeft", materiaSlot: 2 },
    { id: 12347, kind: "food", slotKey: "food" },
  ];
  const code = shareDocument(doc, new Map(items.map((i) => [i.id, i])));
  const restored = await importShare(code, "Imported", {
    items: async () => items,
    evaluate: async () => ({ evaluation }),
  });
  assert.equal(restored.equipment.ringLeft.itemId, 12345);
  assert.equal(restored.equipment.ringRight.itemId, 12346);
  assert.equal(restored.foodId, 12347);
  assert.equal(restored.equipment.ringLeft.equipmentLocked, false);
  doc.syncLevel = 800;
  assert.throws(
    () => shareDocument(doc, new Map(items.map((i) => [i.id, i]))),
    /protocol/,
  );
});

test("StrictMode-like first use waits for an explicit job before saving", async () => {
  storage();
  const transport = api();
  const a = deferred();
  let count = 0;
  const bootstrap = transport.bootstrap;
  transport.bootstrap = () => (++count === 1 ? a.promise : bootstrap());
  const vm = new GearingViewModel(transport);
  const first = vm.initialize();
  vm.dispose();
  await vm.initialize();
  a.resolve(await bootstrap());
  await first;
  assert.equal(transport.documents.size, 0);
  assert.equal(vm.getSnapshot().needsSetup, true);
  assert.equal(vm.getSnapshot().document, null);
  await vm.create("Chosen plan", "SCH");
  assert.equal(transport.documents.size, 0);
  assert.equal(vm.getSnapshot().query.minLevel, 0);
  assert.equal(vm.getSnapshot().query.maxLevel, 9999);
  assert.equal(vm.getSnapshot().query.hideObsolete, false);
  vm.dispose();
});

test("creation, edits, undo and opening a saved plan never write without explicit save", async () => {
  storage();
  const service = api();
  let writes = 0;
  const save = service.save;
  service.save = async (document) => {
    writes++;
    return save(document);
  };
  const vm = new GearingViewModel(service);
  await vm.initialize();
  await vm.create("Draft", "SCH");
  vm.edit((draft) => {
    draft.name = "Edited";
  });
  assert.equal(writes, 0);
  assert.equal(vm.hasUnsavedChanges(), true);
  await vm.save();
  assert.equal(writes, 1);
  assert.equal(vm.hasUnsavedChanges(), false);
  vm.edit((draft) => {
    draft.name = "Unsaved";
  });
  assert.equal(
    service.documents.get(vm.getSnapshot().document.id).name,
    "Edited",
  );
  vm.undo();
  assert.equal(vm.hasUnsavedChanges(), false);
  assert.equal(vm.getSnapshot().saving, "saved");
  await vm.load(vm.getSnapshot().document.id);
  assert.equal(writes, 1);
  vm.dispose();
});

test("stale evaluations and optimization results cannot overwrite newer edits", async () => {
  storage();
  const transport = api();
  const vm = new GearingViewModel(transport);
  await vm.initialize();
  if (!vm.getSnapshot().document && !vm.getSnapshot().migrationIssue)
    await vm.create("Test plan", "SCH");
  await pause(60);
  const old = deferred();
  transport.evaluate = () => old.promise;
  vm.edit((d) => {
    d.name = "Older";
  });
  await pause(50);
  const revision = vm.getSnapshot().revision;
  transport.evaluate = async (d, revision) => ({
    revision,
    evaluation: { ...evaluation, itemLevel: 10 },
  });
  vm.edit((d) => {
    d.name = "Newer";
  });
  await pause(60);
  old.resolve({ revision, evaluation: { ...evaluation, itemLevel: 999 } });
  await pause(0);
  assert.equal(vm.getSnapshot().evaluation.itemLevel, 10);
  const search = deferred();
  transport.optimize = () => search.promise;
  const optimizing = vm.optimize();
  vm.edit((d) => {
    d.name = "Changed during optimization";
  });
  search.resolve({ status: "ok", document: newDocument("Stale") });
  await optimizing;
  assert.equal(vm.getSnapshot().proposal, null);
  assert.equal(vm.getSnapshot().document.name, "Changed during optimization");
  vm.dispose();
});

test("preview, apply, undo and independent optimizer scope preserve user intent", async () => {
  storage();
  const transport = api();
  const vm = new GearingViewModel(transport);
  await vm.initialize();
  if (!vm.getSnapshot().document && !vm.getSnapshot().migrationIssue)
    await vm.create("Test plan", "SCH");
  await pause(50);
  const item = {
    id: 100,
    name: "Synthetic",
    kind: "equipment",
    slotKey: "mainHand",
  };
  await vm.preview(item);
  assert.equal(vm.getSnapshot().document.equipment.mainHand, undefined);
  vm.applyPreview();
  assert.equal(vm.getSnapshot().document.equipment.mainHand.itemId, 100);
  vm.undo();
  assert.equal(vm.getSnapshot().document.equipment.mainHand, undefined);
  vm.redo();
  assert.equal(vm.getSnapshot().document.equipment.mainHand.itemId, 100);
  vm.filter({ minLevel: 500, sourceIds: ["test"] });
  assert.equal(vm.getSnapshot().conditions.minLevel, 780);
  assert.deepEqual(vm.getSnapshot().conditions.sourceIds, []);
  vm.dispose();
});

test("failed legacy migration retains raw data and never creates a replacement automatically", async () => {
  const store = storage();
  store.set("open-rising-stones.gearing.v1", "{invalid");
  const transport = api();
  const vm = new GearingViewModel(transport);
  await vm.initialize();
  if (!vm.getSnapshot().document && !vm.getSnapshot().migrationIssue)
    await vm.create("Test plan", "SCH");
  assert.equal(vm.getSnapshot().migrationIssue, true);
  assert.equal(transport.documents.size, 0);
  assert.equal(store.get("open-rising-stones.gearing.v1"), "{invalid");
  vm.dispose();
});

test("explicit cancellation remains visible and rejects a late successful proposal", async () => {
  storage();
  const transport = api();
  const pending = deferred();
  let cancelled;
  transport.optimize = () => pending.promise;
  transport.cancel = async (id) => {
    cancelled = id;
  };
  const vm = new GearingViewModel(transport);
  await vm.initialize();
  if (!vm.getSnapshot().document && !vm.getSnapshot().migrationIssue)
    await vm.create("Test plan", "SCH");
  const running = vm.optimize();
  vm.cancel(true);
  assert.equal(vm.getSnapshot().proposal.status, "cancelled");
  assert.ok(cancelled);
  pending.resolve({ status: "ok", document: newDocument("Late") });
  await running;
  assert.equal(vm.getSnapshot().proposal.status, "cancelled");
  assert.equal(vm.getSnapshot().running, false);
  vm.dispose();
});

test("browsing and item lookup stay in TS without any IPC, and reuse one data load", async () => {
  const { ItemCatalog } =
    await import("../src/features/gearing/editor/catalog.ts");
  const { GearingApi } = await import("../src/features/gearing/editor/api.ts");
  const { createCatalog } = await import("../scripts/gearing/package.mjs");
  const dataset = createCatalog(buildBundle(fixture()), {
    formatVersion: 3,
    dataVersion: "fixture",
    parameterVersion: "fixture",
    gameVersion: "7.55",
  });
  const calls = [];
  let loads = 0;
  const service = new GearingApi(
    async () => {
      loads++;
      return new ItemCatalog(dataset);
    },
    async (command, args) => {
      calls.push({ command, args });
      return { status: "ok" };
    },
  );
  await Promise.all([service.bootstrap(), service.bootstrap()]);
  const definition = dataset.items.find((i) => i.id === 102);
  const query = {
    job: definition.jobs[0],
    slot: definition.slotKey,
    minLevel: 0,
    maxLevel: 9999,
    search: "",
    sourceIds: [],
    hideObsolete: false,
    sortStat: "",
    offset: 0,
    limit: 100,
  };
  const original = await service.query(query);
  assert.ok(original.items.some((i) => i.id === 102));
  for (let i = 0; i < 20; i++) {
    await service.query({
      ...query,
      search: i % 2 ? definition.name : "does-not-exist",
      sortStat: "DET",
      offset: i % 2,
    });
    await service.items([102]);
  }
  assert.equal(loads, 1);
  assert.deepEqual(calls, []);
  const doc = newDocument("Packet", query.job);
  doc.equipment[query.slot] = {
    itemId: 102,
    materias: [],
    equipmentLocked: false,
    materiaLocked: false,
  };
  await service.evaluate(doc, 42);
  assert.equal(calls.length, 0);
  const local = await service.evaluate(doc, 42);
  assert.equal(local.revision, 42);
  assert.ok(local.evaluation.stats);
  assert.equal(calls.length, 0);
});

test("optimization sends one self-contained candidate snapshot, independent of browsing filters", async () => {
  const { ItemCatalog } =
    await import("../src/features/gearing/editor/catalog.ts");
  const { GearingApi } = await import("../src/features/gearing/editor/api.ts");
  const dataset = JSON.parse(
    readFileSync("src/features/gearing/data/generated/catalog.json", "utf8"),
  );
  const catalog = new ItemCatalog(dataset);
  const calls = [];
  const service = new GearingApi(
    async () => catalog,
    async (command, args) => {
      calls.push({ command, args });
      return { status: "ok" };
    },
  );
  const doc = newDocument("SCH packet");
  doc.equipment.mainHand = {
    itemId: 49512,
    materias: [],
    equipmentLocked: true,
    materiaLocked: false,
  };
  const conditions = {
    kind: "combat",
    mode: "all",
    targetGcd: 2.4,
    exactGcd: true,
    minLevel: 780,
    maxLevel: 795,
    sourceIds: [],
    excludedItemIds: [],
    optimizeFood: true,
    targets: {},
  };
  await service.query({
    job: "SCH",
    slot: "head",
    minLevel: 1,
    maxLevel: 1,
    sourceIds: [],
    search: "unrelated",
    hideObsolete: true,
    sortStat: "",
    offset: 0,
    limit: 60,
  });
  await service.optimize(doc, conditions, "one-request");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "optimize_gearing");
  const input = calls[0].args.input;
  assert.ok(input.gears.length < dataset.items.length);
  assert.ok(input.gears.some((g) => g.data.id === 49512));
  assert.ok(input.foods.some((i) => i.id === 49244));
  assert.ok(input.gears.every((g) => g.data.jobs.includes("SCH")));
  assert.equal(input.job, "SCH");
  assert.ok(calls[0].args.parameters.parameters);
  assert.ok(input.gears[0].caps);
  assert.equal(input.document, undefined);
});

test("TS document validation rejects malformed records before storage IPC", async () => {
  const { parseDocument } =
    await import("../src/features/gearing/editor/document.ts");
  const { GearingApi } = await import("../src/features/gearing/editor/api.ts");
  const doc = newDocument("Valid");
  doc.equipment.mainHand = {
    itemId: 49512,
    materias: [],
    equipmentLocked: false,
    materiaLocked: false,
  };
  assert.equal(parseDocument(doc, doc.id).id, doc.id);
  assert.throws(
    () => parseDocument({ ...doc, id: undefined }),
    /document version or ID/,
  );
  const corrupt = structuredClone(doc);
  corrupt.equipment.mainHand.materias = [null];
  assert.throws(() => parseDocument(corrupt), /materia/);
  const calls = [];
  const api = new GearingApi(
    async () => null,
    async (cmd, args) => {
      calls.push([cmd, args]);
    },
  );
  assert.throws(() => api.save(corrupt));
  assert.equal(calls.length, 0);
  const mismatch = structuredClone(doc);
  mismatch.id = "../outside";
  assert.throws(() => parseDocument(mismatch));
});

test("data verifier imports without local data while its CLI fails clearly", () => {
  const root = mkdtempSync(join(tmpdir(), "gearing-check-entry-"));
  try {
    mkdirSync(join(root, "scripts"));
    const script = join(root, "scripts/check-gearing-data.mjs");
    copyFileSync("scripts/check-gearing-data.mjs", script);
    const imported = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `const module=await import(${JSON.stringify(pathToFileURL(script).href)}); console.log(typeof module.checkGearingData);`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal(imported.stdout.trim(), "function");
    const command = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(command.status, 1);
    assert.match(command.stderr, /npm run gearing:data:update/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
