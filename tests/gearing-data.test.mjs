/** Synthetic conversion cases, download failures, and owned-parameter regressions. */
import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./helpers/gearing-fixture.mjs";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  parseSheet,
  sourceIndex,
  statColumns,
} from "../scripts/gearing/csv.mjs";
import { downloadInputs, downloadText } from "../scripts/gearing/download.mjs";
import { buildBundle, createCatalog } from "../scripts/gearing/package.mjs";
import { expandCustomWeaponRules } from "../scripts/gearing/rules.mjs";
import { validate } from "../scripts/gearing/validate.mjs";
import { convert } from "../scripts/gearing/convert.mjs";
import * as game from "../scripts/gearing/config/game.mjs";

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const contract = json("scripts/gearing/contract.json");

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
  assert.deepEqual(
    sourceIndex({ raid: { label: "Raid", items: "10-12,20" } }),
    {
      10: "Raid",
      11: "Raid",
      12: "Raid",
      20: "Raid",
    },
  );
  assert.throws(
    () =>
      sourceIndex({
        raid: { label: "Raid", items: "10-12" },
        craft: { label: "Craft", items: "12" },
      }),
    /Conflicting item source/,
  );
  assert.throws(
    () => sourceIndex({ raid: { label: "Raid", items: "12-10" } }),
    /Invalid item source bounds/,
  );
});

test("synthetic rows produce HQ stats, consumables, custom weapons and correct role cap columns", () => {
  const bundle = buildBundle(fixture());
  assert.equal(validate(bundle, contract), 4);
  const weapon = bundle.data.items.find((item) => item.id === 102);
  assert.equal(weapon.iconId, 10_102);
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
  assert.equal(bundle.data.items.find((i) => i.slot === -1).id, 104);
  assert.equal(bundle.data.items.find((i) => i.slot === -1).iconId, 10_104);
  assert.deepEqual(bundle.data.items.find((i) => i.slot === -1).stats, {
    CRT: 20,
    VIT: 30,
    SPS: 10,
  });
  assert.deepEqual(bundle.data.items.find((i) => i.slot === -1).statRates, {
    CRT: 10,
    VIT: 10,
    SPS: 10,
  });
  assert.deepEqual(
    bundle.review.customWeapons.map((item) => item.id),
    [103],
  );
  assert.ok(!("sourceFormulas" in bundle.rules));
});

test("catalog sources preserve newest-first configuration order", () => {
  const bundle = buildBundle(fixture());
  const sourcedItem = bundle.data.items[0];
  bundle.data.items.push(
    {
      ...sourcedItem,
      id: 900_001,
      source: "Older source",
      sourceId: "older-source",
    },
    {
      ...sourcedItem,
      id: 900_002,
      source: "Newer source",
      sourceId: "newer-source",
    },
  );
  bundle.sources = {
    "older-source": { label: "Older source" },
    "newer-source": { label: "Newer source" },
  };
  const catalog = createCatalog(bundle, {});
  assert.ok(catalog.sources.every((source) => Number.isInteger(source.order)));
  assert.deepEqual(
    catalog.sources.slice(0, 2).map((source) => source.id),
    ["newer-source", "older-source"],
  );
});

test("missing source annotations are reported while valid equipment stays available", () => {
  const { data, sourcesMissing } = convert(fixture().raw, {
    rules: game,
    sources: {},
    conversion: json("scripts/gearing/config/conversion.json"),
    blueMage: json("scripts/gearing/config/blue-mage.json"),
  });
  assert.ok(data.items.some((item) => item.id === 103));
  assert.ok(Object.hasOwn(sourcesMissing, 103));
});

test("owned named coefficients are the sole runtime formula parameters", () => {
  const bundle = buildBundle(fixture());
  assert.deepEqual(
    bundle.rules.parameters,
    json("scripts/gearing/config/formulas.json"),
  );
  assert.ok(!("formulas" in bundle.rules));
  bundle.rules.parameters.gcd.resultDivisor = 0;
  assert.throws(() => validate(bundle, contract), /divisor/);
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

test("renaming a source label preserves its ID and acquisition policy", () => {
  const config = {
    rules: game,
    sources: { raid: { label: "Original raid", items: "101", kind: "raid" } },
    conversion: json("scripts/gearing/config/conversion.json"),
    blueMage: json("scripts/gearing/config/blue-mage.json"),
  };
  const before = convert(fixture().raw, config).data.items.find(
    (i) => i.id === 101,
  );
  config.sources.raid.label = "Renamed raid";
  const after = convert(fixture().raw, config).data.items.find(
    (i) => i.id === 101,
  );
  assert.equal(before.sourceId, after.sourceId);
  assert.equal(after.acquisitionKind, "raid");
  assert.notEqual(before.source, after.source);
});
