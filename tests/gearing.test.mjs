/** Fixed fixtures, independent small exhaustive checks, and data-contract regressions. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import "./helpers/gearing-loader.mjs";
import { validate } from "../scripts/gearing/validate.mjs";
import { installBundle } from "../scripts/gearing/install.mjs";
import { checkGearingData } from "../scripts/gearing/check.mjs";

const G = await import("../src/features/gearing/utils/game.ts");
const formula =
  await import("../src/features/gearing/utils/gcdOptimizationFormula.ts");
const share = await import("../src/features/gearing/utils/share.ts");
const { combatRequest } =
  await import("../src/features/gearing/api/optimization.ts");
const { getCustomWeaponRule } =
  await import("../src/features/gearing/utils/customWeaponRules.ts");
const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL(
        `../src/features/gearing/data/generated/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
const manifest = read("manifest");
const rules = read("rules"),
  recent = read("gears-recent");
const cargoManifest = "src-tauri/crates/gearing-engine/Cargo.toml";
execFileSync(
  "cargo",
  [
    "build",
    "--offline",
    "--release",
    "--manifest-path",
    cargoManifest,
    "--example",
    "solve",
  ],
  { stdio: "pipe" },
);
function solve(kind, input) {
  return JSON.parse(
    execFileSync(
      "src-tauri/crates/gearing-engine/target/release/examples/solve",
      [],
      {
        input: JSON.stringify({ kind, input }) + "\n",
        encoding: "utf8",
        timeout: 30000,
      },
    ).trim(),
  );
}
function base(job) {
  const schema = G.jobSchemas[job],
    level = G.jobLevelModifiers[100];
  return Object.fromEntries(
    schema.stats.map((s) => {
      const v = G.baseStats[s] ?? 0;
      return [
        s,
        typeof v === "number"
          ? v
          : Math.trunc((level[v] * (schema.statModifiers?.[s] ?? 100)) / 100) +
            (G.clanStats[s]?.[0] ?? 0),
      ];
    }),
  );
}
function inputFor(job = "SCH") {
  const data = recent.find(
    (g) =>
      g.slot === 13 &&
      g.level >= 780 &&
      G.jobCategories[g.jobCategory]?.[job] &&
      !g.customizable,
  );
  assert.ok(data);
  return {
    mode: "current",
    targetGcd: 2.5,
    job,
    jobLevel: 100,
    baseStats: base(job),
    currentDamage: 0,
    filteredIds: [data.id],
    equippedGearIdsBySlot: [[13, data.id]],
    gears: [{ id: data.id, slot: 13, data, materias: [{}, {}] }],
    foods: [],
    fixedConsumables: [],
  };
}

test("bundled data has valid references and formula contracts", () => {
  const data = Object.fromEntries(
    Object.keys(manifest.files)
      .filter((name) => name !== "rules.json")
      .map((name) => [name.slice(0, -5), read(name.slice(0, -5))]),
  );
  const contract = JSON.parse(
    readFileSync("scripts/gearing/contract.json", "utf8"),
  );
  assert.ok(validate({ data, rules }, contract) > 26000);
  const broken = { ...data, foods: [...data.foods, data.foods[0]] };
  assert.throws(() => validate({ data: broken, rules }, contract), /duplicate/);
});

test("GCD nested truncation retains the level 100 threshold", () => {
  assert.equal(formula.calcGcd(441, 100, G.jobSchemas.SCH.statModifiers), 2.5);
  assert.equal(formula.calcGcd(442, 100, G.jobSchemas.SCH.statModifiers), 2.49);
  assert.equal(
    formula.calcRequiredSpeed(2.49, 100, G.jobSchemas.SCH.statModifiers),
    442,
  );
});

test("base62 fixture round-trips and malformed codes terminate", () => {
  const code = "koj0tLf8juOkXvsDIQ4y";
  const parsed = share.parse(code);
  assert.equal(parsed.job, "WAR");
  assert.equal(share.stringify(parsed), code);
  for (const code of ["!!!!"]) {
    assert.throws(() => share.parse(code));
  }
});

test("native current gear optimization matches exhaustive two-slot materia scores", () => {
  const input = inputFor(),
    request = combatRequest(input),
    result = solve("combat", request);
  assert.equal(result.status, "ok", JSON.stringify(result));
  const raw = input.gears[0].data,
    caps = G.getCaps(raw),
    options = [
      null,
      ...[12, 11].flatMap((grade) =>
        ["CRT", "DET", "DHT", "SPS"].map((stat) => ({ stat, grade })),
      ),
    ];
  let maximum = -Infinity;
  for (const a of options)
    for (const b of options) {
      const stats = { ...raw.stats };
      for (const m of [a, b])
        if (m)
          stats[m.stat] = Math.min(
            (stats[m.stat] ?? 0) + G.materias[m.stat][m.grade - 1],
            Math.max(raw.stats[m.stat] ?? 0, caps[m.stat]),
          );
      for (const [s, v] of Object.entries(input.baseStats))
        stats[s] = (stats[s] ?? 0) + v;
      const e = formula.calcEffects(
        stats,
        input.baseStats,
        input.job,
        100,
        G.jobSchemas[input.job],
      );
      if (e.gcd <= input.targetGcd) maximum = Math.max(maximum, e.damage);
    }
  assert.ok(
    Math.abs(result.effects.damage - maximum) < 1e-10,
    `${result.effects.damage} != ${maximum}`,
  );
  assert.equal(result.plan.length, 1);
  assert.equal(result.plan[0].materias.length, 2);
  const frontend = formula.calcEffects(
    result.stats,
    input.baseStats,
    input.job,
    100,
    G.jobSchemas[input.job],
  );
  for (const key of Object.keys(frontend))
    assert.ok(Math.abs(frontend[key] - result.effects[key]) < 1e-9, key);
});

test("native solver enforces speed limits and cancellation-safe failure results", () => {
  const request = combatRequest(inputFor());
  request.targetGcd = 1.8;
  const result = solve("combat", request);
  assert.equal(result.status, "unreachable", JSON.stringify(result));
  request.speedRange = { min: 500, max: 400 };
  assert.equal(solve("combat", request).status, "error");
});

test("native automatic gear selection enforces ring source exclusivity", () => {
  const request = combatRequest(inputFor("WAR"));
  request.mode = "all";
  request.rules.schema.slots = [
    { slot: 12, name: "Ring", uiGroup: "right" },
    { slot: -12, name: "Ring", uiGroup: "right" },
  ];
  const gear = {
    ...request.gears[0],
    data: { ...request.gears[0].data, materiaSlot: 0 },
    materias: [],
    acquisition: {
      kind: "raid",
      ringExclusivityGroup: "raid",
      tomestoneCost: 0,
      raidCost: 1,
    },
  };
  request.gears = [
    { ...gear, id: 1, slot: 12 },
    { ...gear, id: -1, slot: -12 },
  ];
  request.filteredIds = [1, -1];
  request.equippedGearIdsBySlot = [];
  assert.equal(solve("combat", request).status, "error");
  request.gears.push({
    ...gear,
    id: -2,
    slot: -12,
    acquisition: { kind: "other", tomestoneCost: 0, raidCost: 0 },
  });
  request.filteredIds.push(-2);
  const result = solve("combat", request);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.deepEqual(
    result.plan.map((p) => p.gearId),
    [1, -2],
  );
});

test("production optimization minimizes count and grade before using tools", () => {
  const input = {
    stats: ["CMS", "CRL", "CP"],
    baseStats: { CMS: 0, CRL: 0, CP: 0 },
    targets: { CMS: 10, CRL: 0, CP: 0 },
    gears: [
      {
        gearId: 1,
        slot: 3,
        baseStats: {},
        caps: { CMS: 100, CRL: 100, CP: 100 },
        slots: [{ allowedGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }],
      },
    ],
    materias: rules.materias,
  };
  const result = solve("production", input);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.equal(result.usesTools, false);
  assert.deepEqual(result.plan[0].materias, [{ stat: "CMS", grade: 5 }]);
  input.targets.CMS = 1000;
  const impossible = solve("production", input);
  assert.equal(impossible.status, "unreachable");
  assert.equal(impossible.maximumStats.CMS, 33);
});

test("data installation is repeatable, check-only, atomic on failure, and reversible", () => {
  const temporary = mkdtempSync(join(tmpdir(), "gearing-import-test-"));
  try {
    const target = join(temporary, "generated");
    const data = Object.fromEntries(
      Object.keys(manifest.files)
        .filter((name) => name !== "rules.json")
        .map((name) => [name.slice(0, -5), read(name.slice(0, -5))]),
    );
    const bundle = {
      data,
      rules,
      inputs: manifest.inputs,
      gameVersion: manifest.gameVersion,
      sourceProfile: manifest.sourceProfile,
      sources: manifest.sources,
      review: manifest.review,
    };
    const contract = JSON.parse(
      readFileSync("scripts/gearing/contract.json", "utf8"),
    );
    const options = {
      target,
      contract,
    };
    installBundle(bundle, { ...options, check: true });
    assert.equal(existsSync(target), false);
    assert.throws(
      () => checkGearingData(target),
      /npm run gearing:data:update/,
    );
    installBundle(bundle, options);
    const original = readFileSync(join(target, "manifest.json"), "utf8");
    assert.equal(checkGearingData(target).dataVersion, manifest.dataVersion);
    assert.equal(JSON.parse(original).dataVersion, manifest.dataVersion);
    assert.equal(
      JSON.parse(original).parameterVersion,
      manifest.parameterVersion,
    );
    const unchanged = installBundle(bundle, options);
    assert.deepEqual(unchanged.itemChanges, {
      added: 0,
      changed: 0,
      removed: 0,
    });
    assert.equal(readFileSync(join(target, "manifest.json"), "utf8"), original);
    const changed = structuredClone(bundle);
    changed.rules.formulas.calcEffects.numbers[8] += 1;
    const preview = installBundle(changed, { ...options, check: true });
    assert.ok(preview.parameterChanges.includes("formulas"));
    assert.equal(readFileSync(join(target, "manifest.json"), "utf8"), original);
    installBundle(changed, options);
    assert.notEqual(
      readFileSync(join(target, "manifest.json"), "utf8"),
      original,
    );
    const broken = structuredClone(changed);
    broken.data.foods.push(broken.data.foods[0]);
    const before = readFileSync(join(target, "manifest.json"), "utf8");
    assert.throws(() => installBundle(broken, options), /duplicate/);
    assert.equal(readFileSync(join(target, "manifest.json"), "utf8"), before);
    installBundle(bundle, options);
    assert.equal(readFileSync(join(target, "manifest.json"), "utf8"), original);
    writeFileSync(join(target, "rules.json"), "{}\n");
    assert.throws(
      () => checkGearingData(target),
      /checksum mismatch: rules.json/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("native preparation budget charges a forced point weapon only once", () => {
  const request = combatRequest(inputFor("WAR"));
  request.mode = "all";
  request.progressionWeeks = 1;
  request.rules.schema.slots = [
    { slot: 13, name: "Weapon", uiGroup: "weapon" },
  ];
  request.gears[0].data.materiaSlot = 0;
  request.gears[0].materias = [];
  request.gears[0].acquisition = {
    kind: "tomestone",
    tomestoneCost: 0,
    raidCost: 0,
  };
  assert.equal(solve("combat", request).status, "error");
  request.progressionWeeks = 2;
  assert.equal(solve("combat", request).status, "ok");
});

test("generated shared custom weapon defaults resolve job stats and slot weights", () => {
  const rule = rules.customWeaponRules.find((rule) => rule.id === "huanjing");
  assert.ok(rule);
  const weapon = {
    customizable: true,
    source: rule.source,
    level: 795,
    slot: 13,
  };
  assert.deepEqual(getCustomWeaponRule(weapon, G.jobSchemas.SCH), {
    major: 447,
    minor: 108,
    statCandidates: ["CRT", "DET", "SPS", "PIE"],
    linkedSlotGroup: "huanjing",
  });
  const sword = getCustomWeaponRule({ ...weapon, slot: 1 }, G.jobSchemas.PLD);
  const shield = getCustomWeaponRule({ ...weapon, slot: 2 }, G.jobSchemas.PLD);
  assert.equal(sword.major, 319);
  assert.equal(sword.minor, 77);
  assert.equal(shield.major, 128);
  assert.equal(shield.minor, 31);
  assert.equal(sword.major + shield.major, 447);
  assert.equal(sword.minor + shield.minor, 108);
  assert.equal(
    getCustomWeaponRule({ ...weapon, slot: 3 }, G.jobSchemas.PLD),
    undefined,
  );
});

test("native custom paladin weapons keep generated linked stat allocations together", () => {
  const request = combatRequest(inputFor("WAR"));
  request.job = "PLD";
  request.mode = "all";
  request.rules.schema = {
    ...G.jobSchemas.PLD,
    slots: [
      { slot: 1, name: "Sword", uiGroup: "weapon" },
      { slot: 2, name: "Shield", uiGroup: "weapon" },
    ],
  };
  const template = request.gears[0];
  const source = rules.customWeaponRules.find(
    (rule) => rule.id === "huanjing",
  ).source;
  request.gears = [1, 2].map((slot) => {
    const data = {
      ...template.data,
      slot,
      level: 795,
      source,
      customizable: true,
      materiaSlot: 0,
      stats: { STR: 100, VIT: 100, PDMG: 10 },
    };
    return {
      ...template,
      id: slot,
      slot,
      data,
      materias: [],
      customRule: getCustomWeaponRule(data, G.jobSchemas.PLD),
    };
  });
  request.filteredIds = [1, 2];
  request.equippedGearIdsBySlot = [];
  const result = solve("combat", request);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.deepEqual(
    Object.keys(result.plan[0].customStats).sort(),
    Object.keys(result.plan[1].customStats).sort(),
  );
  const totals = Object.keys(result.plan[0].customStats)
    .map(
      (stat) =>
        result.plan[0].customStats[stat] + result.plan[1].customStats[stat],
    )
    .sort((a, b) => a - b);
  assert.deepEqual(totals, [108, 447, 447]);
});

test("native DET/DHT results preserve fixed melds and obey the near-optimal threshold", () => {
  const input = {
    baseStats: base("SCH"),
    level: G.jobLevelModifiers[100],
    blu: false,
    materias: rules.materias,
    gears: [
      {
        id: 1,
        stats: { DET: 0, DHT: 0 },
        caps: { DET: 1000, DHT: 1000 },
        synced: false,
        materias: [
          { stat: "CRT", grade: 12, bestGrade: 12 },
          { bestGrade: 12 },
          { bestGrade: 12 },
        ],
      },
    ],
  };
  const result = solve("det-dht", input);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.ok(result.solutions.length > 0);
  for (const solution of result.solutions) {
    assert.equal(solution.gearMateriaStats[0][1][0], "CRT");
    assert.equal(
      solution.DET + solution.DHT,
      input.baseStats.DET + input.baseStats.DHT + 108,
    );
  }
});

function schInput(allowedIds) {
  const schema = G.jobSchemas.SCH;
  const gears = recent
    .filter(
      (g) =>
        (!allowedIds || allowedIds.includes(g.id)) &&
        G.jobCategories[g.jobCategory]?.SCH &&
        g.level >= 780 &&
        g.level <= 795 &&
        !g.obsolete,
    )
    .flatMap((data) =>
      [data.slot, ...(data.slot === 12 ? [-12] : [])].map((slot) => ({
        id: slot < 0 ? -data.id : data.id,
        slot,
        data,
        materias: Array.from(
          { length: data.materiaAdvanced ? 5 : data.materiaSlot },
          () => ({}),
        ),
      })),
    )
    .sort((a, b) => a.data.level - b.data.level || a.id - b.id);
  const baseStats = base("SCH");
  return {
    mode: "all",
    targetGcd: 2.4,
    job: "SCH",
    jobLevel: 100,
    baseStats,
    currentDamage: formula.calcEffects(baseStats, baseStats, "SCH", 100, schema)
      .damage,
    filteredIds: gears.map((g) => g.id),
    equippedGearIdsBySlot: [],
    gears,
    foods: read("foods").filter(
      (f) => f.slot === -1 && G.jobCategories[f.jobCategory]?.SCH,
    ),
    fixedConsumables: [],
  };
}

test("SCH original 51 candidates at 2.40s match the supplied pre-migration result", () => {
  // Pin the original gear identities so new upstream items do not alter this historical fixture.
  const ids = [
    49512, 49551, 49552, 49553, 49554, 49555, 49564, 49569, 49574, 49579, 50878,
    50879, 50880, 50881, 50882, 51118, 51157, 51158, 51159, 51160, 51161, 51170,
    51175, 51180, 51185, 50901, 49589, 49628, 49629, 49630, 49631, 49632, 49641,
    49646, 49651, 49656, 49705, 49706, 49707, 49708, 49709, 49718, 49723, 49728,
    49733, 49666, 52307,
  ];
  const input = schInput(ids);
  const baseStats = input.baseStats;
  const schema = G.jobSchemas.SCH;
  assert.equal(input.gears.length, 51);
  const result = solve("combat", combatRequest(input));
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.equal(result.effects.gcd, 2.4);
  assert.equal(result.speed, 1237);
  assert.equal(result.effects.damage.toFixed(5), "128.48722");
  assert.equal(result.damageDelta.toFixed(5), "127.50598");
  assert.equal(result.foodId, 49244);
  assert.equal(result.plan.length, 11);
  const frontend = formula.calcEffects(
    result.stats,
    baseStats,
    "SCH",
    100,
    schema,
  );
  assert.ok(Math.abs(frontend.damage - result.effects.damage) < 1e-10);
});

test("SCH automatic optimization includes newly imported gear candidates", () => {
  const input = schInput();
  assert.ok(input.gears.length >= 51);
  const request = combatRequest(input);
  const result = solve("combat", request);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.equal(
    result.customSkipped,
    request.gears.some(
      (gear) => gear.data.customizable && !gear.customRule && !gear.customStats,
    ),
  );
  assert.equal(result.plan.length, 11);
  assert.ok(result.effects.gcd <= 2.4);
  assert.ok(result.effects.damage >= 128.48721);
  const frontend = formula.calcEffects(
    result.stats,
    input.baseStats,
    "SCH",
    100,
    G.jobSchemas.SCH,
  );
  assert.ok(Math.abs(frontend.damage - result.effects.damage) < 1e-10);
});
