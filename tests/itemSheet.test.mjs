/** Regression coverage for Item sheet normalization and inventory ID collection. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCabinetSheetUrl,
  buildItemSheetUrl,
  collectInventoryItemIds,
  itemModelKey,
  parseCabinetSheetResponse,
  parseItemSheetResponse,
  readMissingItemId,
  readMissingSheetRowId,
} from "../src/features/glamour/utils/itemSheet.ts";

test("builds bounded Chinese Item sheet batch requests", () => {
  const url = buildItemSheetUrl(
    Array.from({ length: 100 }, (_, index) => 90_000 + index),
  );

  assert.equal(url.origin, "https://xivapi-v2.xivcdn.com");
  assert.equal(url.pathname, "/api/sheet/Item");
  assert.equal(url.searchParams.get("language"), "chs");
  assert.equal(url.searchParams.get("rows")?.split(",").length, 100);
  assert.match(url.searchParams.get("fields") ?? "", /Name/);
  assert.ok(url.toString().length < 2_048);
});

test("normalizes Item sheet fields and asset URLs", () => {
  const [item] = parseItemSheetResponse({
    rows: [
      {
        row_id: 42,
        fields: {
          Name: "Test item",
          Description: "Test description",
          Icon: { path_hr1: "ui/icon/000000/000001_hr1.tex" },
          ItemUICategory: { fields: { Name: "Test category" } },
          LevelEquip: 10,
          "LevelItem@as(raw)": 15,
          Rarity: 2,
          StackSize: 99,
          ModelMain: 65578,
          ModelSub: 0,
          "EquipSlotCategory@as(raw)": 4,
        },
      },
    ],
  });

  assert.deepEqual(item, {
    id: 42,
    name: "Test item",
    description: "Test description",
    category: "Test category",
    iconUrl:
      "https://xivapi-v2.xivcdn.com/api/asset?path=ui%2Ficon%2F000000%2F000001_hr1.tex&format=png",
    levelEquip: 10,
    levelItem: 15,
    rarity: 2,
    stackSize: 99,
    modelMain: 65578,
    modelSub: 0,
    equipSlotCategory: 4,
  });
  assert.equal(itemModelKey(item), "4:65578:0");
});

test("identifies a missing Item row without treating every 404 as missing data", () => {
  assert.equal(
    readMissingItemId(
      "not found: the Excel row Item/999999:0 could not be found",
    ),
    999999,
  );
  assert.equal(readMissingItemId("route not found"), null);
  assert.equal(
    readMissingSheetRowId(
      "not found: the Excel row Cabinet/123 could not be found",
      "Cabinet",
    ),
    123,
  );
});

test("builds and parses compact Cabinet item mappings", () => {
  const url = buildCabinetSheetUrl([1, 3]);
  assert.equal(url.pathname, "/api/sheet/Cabinet");
  assert.equal(url.searchParams.get("fields"), "Item@as(raw)");
  assert.deepEqual(
    parseCabinetSheetResponse({
      rows: [
        { row_id: 1, fields: { "Item@as(raw)": 3220 } },
        { row_id: 3, fields: { "Item@as(raw)": 3682 } },
      ],
    }),
    [
      { cabinetId: 1, itemId: 3220 },
      { cabinetId: 3, itemId: 3682 },
    ],
  );
});

test("collects unique concrete item and glamour IDs", () => {
  const inventory = {
    containers: [
      {
        items: [
          { itemId: 42, glamourId: 84 },
          { itemId: 42, glamourId: 0 },
        ],
      },
    ],
    glamourDresser: { items: [{ itemId: 126 }] },
    armoire: { cabinetItemIds: [1, 2] },
  };

  assert.deepEqual(collectInventoryItemIds(inventory), [42, 84, 126]);
});
