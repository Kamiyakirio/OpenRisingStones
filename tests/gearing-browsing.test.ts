/** Browse order and source facets must follow player-selected scope, independent of paging. */
import assert from "node:assert/strict";
import test from "node:test";
import type { Item, Query } from "../src/features/gearing/editor/types.ts";
import type { GearingDataset } from "../src/features/gearing/editor/catalog.ts";
import { fixture } from "./helpers/gearing-fixture.ts";
import { buildBundle, createCatalog } from "../scripts/gearing/package.mjs";
import { ItemCatalog } from "../src/features/gearing/editor/catalog.ts";

const item = (
  id: number,
  level: number,
  sourceId: string,
  overrides: Partial<Item> = {},
): Item => ({
  id,
  level,
  sourceId,
  name: `Item ${id}`,
  jobs: ["SCH"],
  slotKey: "mainHand",
  kind: "equipment",
  stats: { CRT: level / 10 },
  ...overrides,
});
const catalog = new ItemCatalog({
  ...(createCatalog(buildBundle(fixture()), {
    formatVersion: 3,
    gameVersion: "fixture",
    dataVersion: "fixture",
    parameterVersion: "fixture",
  }) as GearingDataset),
  items: [
    item(1, 100, "early"),
    item(2, 200, "recent"),
    item(3, 200, "crafted"),
    item(4, 300, "tank", { jobs: ["PLD"] }),
    item(5, 200, "head", { slotKey: "head" }),
    item(6, 180, "obsolete", { obsolete: true }),
    item(7, 200, "ring", { slotKey: "ringLeft" }),
    item(8, 200, "food", { kind: "food", slotKey: "food" }),
  ],
});
const query: Query = {
  job: "SCH",
  slot: "mainHand",
  minLevel: 0,
  maxLevel: 9999,
  search: "",
  sourceIds: [],
  hideObsolete: false,
  sortStat: "",
  offset: 0,
  limit: 60,
};

test("item level and stat sorting both support ascending and descending with stable ties", () => {
  for (const sortStat of ["", "CRT"] as const) {
    assert.deepEqual(
      catalog
        .query({ ...query, sortStat, sortDirection: "asc" })
        .items.map((entry) => entry.id),
      [1, 6, 2, 3],
    );
    assert.deepEqual(
      catalog
        .query({ ...query, sortStat, sortDirection: "desc" })
        .items.map((entry) => entry.id),
      [2, 3, 6, 1],
    );
  }
});

test("sources follow job, slot, level and obsolete filtering across all pages", () => {
  const scoped = {
    ...query,
    minLevel: 150,
    maxLevel: 250,
    hideObsolete: true,
    limit: 1,
  };
  assert.deepEqual(catalog.query(scoped).availableSourceIds, [
    "recent",
    "crafted",
  ]);
  assert.deepEqual(
    catalog.query({ ...scoped, sourceIds: ["recent"], search: "Item 2" })
      .availableSourceIds,
    ["recent"],
  );
  assert.deepEqual(
    catalog.query({ ...scoped, slot: "ringRight" }).availableSourceIds,
    ["ring"],
  );
  assert.deepEqual(
    catalog.query({ ...scoped, slot: "food" }).availableSourceIds,
    ["food"],
  );
  assert.deepEqual(
    catalog.query({ ...scoped, job: "PLD" }).availableSourceIds,
    [],
  );
});

test("optimization source scope spans eligible slots without including other jobs or levels", () => {
  assert.deepEqual(
    catalog.sourceIds({ job: "SCH", minLevel: 200, maxLevel: 250 }),
    ["recent", "crafted", "head", "ring"],
  );
});
