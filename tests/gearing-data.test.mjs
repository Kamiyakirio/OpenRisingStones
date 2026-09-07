/** Synthetic conversion cases, download failures, and owned-parameter regressions. */
import assert from "node:assert/strict";
import test from "node:test";
import Papa from "papaparse";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  parseSheet,
  sourceIndex,
  statColumns,
} from "../scripts/gearing/csv.mjs";
import { downloadInputs, downloadText } from "../scripts/gearing/download.mjs";
import { buildBundle } from "../scripts/gearing/build.mjs";
import {
  formulaRules,
  expandCustomWeaponRules,
} from "../scripts/gearing/rules.mjs";
import { validate } from "../scripts/gearing/validate.mjs";
import { convert } from "../scripts/gearing/convert.mjs";
import * as game from "../scripts/gearing/config/game.mjs";

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const contract = json("scripts/gearing/contract.json");
// Build a tiny fictional data set in memory; no exported game CSV records are retained.
function fixture() {
  const indexed = (names, count) =>
    Array.from({ length: count }, (_, i) =>
      names.map((name) => `${name}[${i}]`),
    ).flat();
  const table = (columns, rows) => {
    const fields = ["#", ...columns];
    return Papa.unparse({
      fields,
      data: rows.map((row) => fields.map((field) => row[field] ?? 0)),
    });
  };
  const jobs = Object.keys(game.jobSchemas);
  const category = (id, allowed) => ({
    "#": id,
    ...Object.fromEntries(
      jobs.map((job) => [job, allowed.includes(job) ? "True" : "False"]),
    ),
  });
  const healer = ["WHM", "SCH", "AST", "SGE"];
  const casters = [...healer, "BLM", "SMN", "RDM", "PCT", "BLU"];
  const itemFields = [
    "Name",
    "Description",
    "LevelItem",
    "Rarity",
    "EquipSlotCategory",
    "BaseParamModifier",
    "ClassJobCategory",
    "LevelEquip",
    "MateriaSlotCount",
    "IsAdvancedMeldingPermitted",
    "CanBeHq",
    "DamagePhys",
    "DamageMag",
    "Delayms",
    "ItemSpecialBonus",
    "ItemAction",
    ...indexed(
      [
        "BaseParam",
        "BaseParamValue",
        "BaseParamSpecial",
        "BaseParamValueSpecial",
      ],
      6,
    ),
  ];
  const item = (id, fields) => ({
    "#": id,
    Name: `Fixture ${id}`,
    Description: "",
    CanBeHq: "False",
    IsAdvancedMeldingPermitted: "False",
    ...fields,
  });
  const items = [
    item(101, {
      LevelItem: 5,
      Rarity: 1,
      EquipSlotCategory: 3,
      BaseParamModifier: 8,
      ClassJobCategory: 31,
      LevelEquip: 5,
      "BaseParam[0]": 4,
      "BaseParamValue[0]": 1,
      "BaseParam[1]": 5,
      "BaseParamValue[1]": 1,
    }),
    item(102, {
      LevelItem: 780,
      Rarity: 2,
      EquipSlotCategory: 13,
      BaseParamModifier: 6,
      ClassJobCategory: 64,
      LevelEquip: 100,
      MateriaSlotCount: 2,
      CanBeHq: "True",
      DamageMag: 50,
      "BaseParam[0]": 3,
      "BaseParamValue[0]": 100,
      "BaseParam[1]": 5,
      "BaseParamValue[1]": 90,
      "BaseParam[2]": 6,
      "BaseParamValue[2]": 6,
      "BaseParam[3]": 44,
      "BaseParamValue[3]": 16,
      "BaseParamSpecial[0]": 3,
      "BaseParamValueSpecial[0]": 20,
      "BaseParamSpecial[1]": 5,
      "BaseParamValueSpecial[1]": 10,
      "BaseParamSpecial[2]": 6,
      "BaseParamValueSpecial[2]": 4,
      "BaseParamSpecial[3]": 44,
      "BaseParamValueSpecial[3]": 8,
      "BaseParamSpecial[4]": 13,
      "BaseParamValueSpecial[4]": 2,
    }),
    item(103, {
      LevelItem: 795,
      Rarity: 4,
      EquipSlotCategory: 13,
      BaseParamModifier: 6,
      ClassJobCategory: 64,
      LevelEquip: 100,
      DamageMag: 50,
      "BaseParam[0]": 3,
      "BaseParamValue[0]": 100,
      "BaseParam[1]": 5,
      "BaseParamValue[1]": 100,
    }),
    item(104, { LevelItem: 770, CanBeHq: "True", ItemAction: 1 }),
  ];
  const foodFields = indexed(
    ["BaseParam", "IsRelative", "ValueHQ", "MaxHQ"],
    3,
  );
  const food = { "#": 1 };
  [27, 3, 46].forEach((stat, i) =>
    Object.assign(food, {
      [`BaseParam[${i}]`]: stat,
      [`IsRelative[${i}]`]: "True",
      [`ValueHQ[${i}]`]: 10,
      [`MaxHQ[${i}]`]: [20, 30, 10][i],
    }),
  );
  const slots =
    "OneHandWeaponPercent OffHandPercent HeadPercent ChestPercent HandsPercent WaistPercent LegsPercent FeetPercent EarringPercent NecklacePercent BraceletPercent RingPercent TwoHandWeaponPercent UnderArmorPercent ChestHeadPercent ChestHeadLegsFeetPercent Unknown0 LegsFeetPercent HeadChestHandsLegsFeetPercent ChestLegsGlovesPercent ChestLegsFeetPercent Unknown1".split(
      " ",
    );
  const melds = indexed(["MeldParam"], 13);
  const caps = Object.keys(statColumns).map((id) => ({
    "#": Number(id),
    ...Object.fromEntries(slots.map((slot) => [slot, 100])),
    ...Object.fromEntries(melds.map((field, i) => [field, i === 0 ? 90 : 100])),
  }));
  const levels = [5, 780, 795].map((level) => ({
    "#": level,
    ...Object.fromEntries(
      Object.entries(statColumns).map(([id, name]) => [name, Number(id) * 100]),
    ),
  }));
  const raw = {
    "Item.csv": table(itemFields, items),
    "ClassJobCategory.csv": table(jobs, [
      category(0, []),
      category(31, casters),
      category(64, healer),
    ]),
    "ItemAction.csv": table(
      ["Action", "Data[1]"],
      [{ "#": 0 }, { "#": 1, Action: 844, "Data[1]": 1 }],
    ),
    "ItemFood.csv": table(foodFields, [food]),
    "ContentFinderCondition.csv": table(
      ["ClassJobLevelRequired", "ItemLevelRequired", "ItemLevelSync"],
      [{ "#": 0 }],
    ),
    // Reverse cap columns to check name-based access rather than incidental column positions.
    "BaseParam.csv": table([...melds].reverse().concat(slots), caps),
    "ItemLevel.csv": table(Object.values(statColumns), levels),
    "lodestone-item-id.txt": "",
  };
  return {
    raw,
    sources: { game: { release: "fixture" } },
    gameVersion: "7.55",
  };
}

test("CSV parsing preserves sparse IDs, quoted newlines and the last row without a newline", () => {
  const rows = parseSheet(
    'key,0,1\n#,Name,Level{Item}\nint32,str,uint16\n3,"A, ""quoted""\nitem",795',
    "Item.csv",
    ["Name", "LevelItem"],
  );
  assert.equal(rows[2], undefined);
  assert.equal(rows[3].Name, 'A, "quoted"\nitem');
  assert.equal(rows[3].LevelItem, "795");
  assert.equal(rows.length, 4);
});

test("CSV schema and scalar corruption are rejected before conversion", () => {
  assert.throws(
    () => parseSheet("#,Name\n1,Item", "Item.csv", ["LevelItem"]),
    /missing or duplicate column/,
  );
  assert.throws(
    () => parseSheet("#,Name\n1,A\n1,B", "Item.csv", ["Name"]),
    /duplicate row ID/,
  );
  assert.throws(
    () => parseSheet("#,LevelItem\n1,no-number", "Item.csv", ["LevelItem"]),
    /invalid value/,
  );
  assert.throws(
    () => parseSheet("#,CanBeHq\n1,unknown", "Item.csv", ["CanBeHq"]),
    /invalid value/,
  );
  assert.throws(
    () =>
      parseSheet('key,0\n#,Name\nint32,str\n1,"unfinished', "Item.csv", [
        "Name",
      ]),
    /quote/i,
  );
});

test("curated source ranges reject ambiguous assignments", () => {
  assert.deepEqual(sourceIndex({ Raid: "10-12,20" }), {
    10: "Raid",
    11: "Raid",
    12: "Raid",
    20: "Raid",
  });
  assert.throws(
    () => sourceIndex({ Raid: "10-12", Craft: "12" }),
    /Conflicting item source/,
  );
  assert.throws(
    () => sourceIndex({ Raid: "12-10" }),
    /Invalid item source bounds/,
  );
});

test("synthetic rows produce HQ stats, consumables, custom weapons and correct role cap columns", () => {
  const bundle = buildBundle(fixture());
  assert.equal(validate(bundle, contract), 4);
  const weapon = bundle.data["gears-recent"].find((item) => item.id === 102);
  assert.equal(weapon.hq, true);
  assert.equal(weapon.materiaSlot, 2);
  assert.deepEqual(weapon.stats, {
    VIT: 120,
    MND: 100,
    PIE: 10,
    DET: 24,
    MDMG: 52,
  });
  assert.equal(bundle.data.roleCaps.STR[0], 90);
  assert.equal(bundle.data.roleCaps.STR[1], 100);
  assert.equal(bundle.data.foods[0].id, 104);
  assert.deepEqual(bundle.data.foods[0].stats, { CRT: 20, VIT: 30, SPS: 10 });
  assert.deepEqual(bundle.data.foods[0].statRates, {
    CRT: 10,
    VIT: 10,
    SPS: 10,
  });
  assert.equal(bundle.data.gearGroups[101], 1);
  assert.equal(bundle.data.gearGroups[102], 750);
  assert.deepEqual(
    bundle.review.customWeapons.map((item) => item.id),
    [103],
  );
  assert.ok(!("sourceFormulas" in bundle.rules));
});

test("missing source annotations are reported while valid equipment stays available", () => {
  const { data, sourcesMissing } = convert(fixture().raw, {
    rules: game,
    sources: {},
    conversion: json("scripts/gearing/config/conversion.json"),
    blueMage: json("scripts/gearing/config/blue-mage.json"),
  });
  assert.ok(data["gears-recent"].some((item) => item.id === 103));
  assert.ok(Object.hasOwn(sourcesMissing, 103));
});

test("owned named coefficients update the shared frontend/native parameter slots", () => {
  const parameters = json("scripts/gearing/config/formulas.json"),
    policy = json("scripts/gearing/optimizer-policy.json");
  parameters.effects.critical.chanceScale = 210;
  parameters.gcd.speedScale = 145;
  parameters.roundingEpsilon = 2e-7;
  const formulas = formulaRules(parameters, policy);
  assert.equal(formulas.calcEffects.numbers[2], 210);
  assert.equal(formulas.calcEffects.numbers[33], 130);
  assert.equal(formulas.calcGcd.numbers[1], 145);
  assert.equal(formulas.floor.numbers[0], 2e-7);
  assert.equal(formulas.calcEffects.numbers.length, 38);
});

test("custom weapons inherit shared defaults without changing source allocations", () => {
  const policy = json("scripts/gearing/optimizer-policy.json");
  const before = structuredClone(policy);
  const rules = expandCustomWeaponRules(policy, game.statNames);
  for (const rule of rules) {
    assert.deepEqual(
      rule.statCandidates,
      policy.customWeaponDefaults.statCandidates,
    );
    assert.deepEqual(rule.slotWeights, policy.customWeaponDefaults.slotWeights);
    assert.equal(rule.linkSlotAllocations, true);
  }
  assert.deepEqual(rules.find((rule) => rule.id === "manderville").itemLevels, {
    645: { major: 293, minor: 72 },
    665: { major: 306, minor: 72 },
  });
  assert.deepEqual(rules.find((rule) => rule.id === "huanjing").itemLevels, {
    795: { major: 447, minor: 108 },
  });
  rules[0].slotWeights[1][0] = 0;
  assert.equal(rules[1].slotWeights[1][0], 5);
  assert.deepEqual(policy, before);
});

test("custom weapon overrides replace candidates, merge slot weights and preserve false", () => {
  const policy = json("scripts/gearing/optimizer-policy.json");
  policy.customWeaponRules = [
    {
      ...policy.customWeaponRules[0],
      statCandidates: ["CRT", "DET", "DHT"],
      slotWeights: { 13: [1, 2] },
      linkSlotAllocations: false,
    },
  ];
  const [rule] = expandCustomWeaponRules(policy, game.statNames);
  assert.deepEqual(rule.statCandidates, ["CRT", "DET", "DHT"]);
  assert.deepEqual(rule.slotWeights, { 1: [5, 7], 2: [2, 7], 13: [1, 2] });
  assert.equal(rule.linkSlotAllocations, false);
});

test("invalid inherited custom weapon rules fail before generation", () => {
  const policy = json("scripts/gearing/optimizer-policy.json");
  policy.customWeaponDefaults.slotWeights[13] = [1, 0];
  assert.throws(
    () => expandCustomWeaponRules(policy, game.statNames),
    /slot ratio/,
  );
  policy.customWeaponDefaults.slotWeights[13] = [1, 1];
  policy.customWeaponRules.push({ ...policy.customWeaponRules[0] });
  assert.throws(
    () => expandCustomWeaponRules(policy, game.statNames),
    /unique IDs/,
  );
});

test("downloads reject HTTP failures, empty files and oversized responses", async () => {
  await assert.rejects(
    downloadText(
      "https://example.invalid/data",
      async () => new Response("missing", { status: 404 }),
    ),
    /404/,
  );
  await assert.rejects(
    downloadText("https://example.invalid/data", async () => new Response("")),
    /Empty download/,
  );
  await assert.rejects(
    downloadText(
      "https://example.invalid/data",
      async () => new Response("12345"),
      4,
    ),
    /size limit/,
  );
  await assert.rejects(
    downloadText(
      "https://example.invalid/data",
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error("truncated transfer"));
            },
          }),
        ),
    ),
    /truncated transfer/,
  );
});

test("release resolution pins every raw download and resolves the actual CN source", async () => {
  const calls = [],
    index = "a".repeat(40),
    cn = "b".repeat(40),
    lodestone = "c".repeat(40);
  const fetcher = async (url) => {
    calls.push(url);
    const feed = (sha, title) =>
      new Response(
        `<feed><entry><id>tag:github.com,2008:Grit::Commit/${sha}</id><title>${title}</title></entry></feed>`,
      );
    if (url.endsWith("/csv/cn.atom")) return feed(index, "7.55h2 (#116)");
    if (url.endsWith("/master.atom")) return feed(lodestone, "7.55 update");
    if (url.endsWith("/.gitmodules"))
      return new Response(
        '[submodule "cn"]\n  path = csv/cn\n  url = https://github.com/thewakingsands/ffxiv-datamining-cn\n',
      );
    if (url.endsWith(".patch"))
      return new Response(
        `diff --git a/csv/cn b/csv/cn\n+Subproject commit ${cn}\n`,
      );
    return new Response("#,Name\n0,Fixture\n");
  };
  const result = await downloadInputs({ fetcher });
  assert.equal(result.gameVersion, "7.55");
  assert.equal(result.sources.game.release, "7.55h2");
  assert.equal(Object.keys(result.raw).length, 8);
  const raw = calls.filter((url) => url.includes("raw.githubusercontent.com"));
  assert.ok(raw.every((url) => !url.includes("/master/")));
  assert.ok(raw.some((url) => url.endsWith(`/${index}/csv/en/BaseParam.csv`)));
  assert.ok(raw.some((url) => url.endsWith(`/${cn}/Item.csv`)));
  assert.ok(
    !calls.some(
      (url) =>
        url.includes("/ffxiv-gearing/") || url.includes("api.github.com"),
    ),
  );
});

test("unknown releases fail before downloading raw data", async () => {
  await assert.rejects(
    downloadInputs({ fetcher: async () => Response.json([]) }),
    /Cannot identify/,
  );
});

test("removed local repository arguments are rejected without modifying generated data", () => {
  const before = readFileSync(
    "src/features/gearing/data/generated/manifest.json",
    "utf8",
  );
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        ["scripts/update-gearing-data.mjs", "--source", "/unavailable"],
        { stdio: "pipe" },
      ),
    /Usage/,
  );
  assert.equal(
    readFileSync("src/features/gearing/data/generated/manifest.json", "utf8"),
    before,
  );
});
