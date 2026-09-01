/** Regression coverage for owned-item source merging and same-model matching. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOwnedItemIndex,
  buildOwnedModelIndex,
  matchOwnedItem,
} from "../src/utils/ownedItems.ts";

const snapshot = {
  items: [
    { itemId: 100, sources: ["inventory"] },
    { itemId: 200, sources: ["glamour_dresser"] },
  ],
  armoire: { cabinetItemIds: [1, 3] },
};

const itemInfo = new Map([
  [
    100,
    {
      id: 100,
      name: "Owned item",
      modelMain: 800,
      modelSub: 0,
      equipSlotCategory: 4,
    },
  ],
  [
    300,
    {
      id: 300,
      name: "Same model item",
      modelMain: 800,
      modelSub: 0,
      equipSlotCategory: 4,
    },
  ],
  [
    400,
    {
      id: 400,
      name: "Different slot item",
      modelMain: 800,
      modelSub: 0,
      equipSlotCategory: 5,
    },
  ],
]);

test("merges direct inventory records with resolved armoire rows", () => {
  const index = buildOwnedItemIndex(
    snapshot,
    new Map([
      [1, 100],
      [3, 500],
    ]),
  );

  assert.deepEqual(index.get(100), ["inventory", "armoire"]);
  assert.deepEqual(index.get(200), ["glamour_dresser"]);
  assert.deepEqual(index.get(500), ["armoire"]);
});

test("prefers exact ownership and matches shared models within the same slot", () => {
  const index = buildOwnedItemIndex(snapshot, new Map());
  const models = buildOwnedModelIndex(index, itemInfo);

  assert.deepEqual(matchOwnedItem(100, index, itemInfo, models, true), {
    kind: "exact",
    ownedItemId: 100,
    ownedItemName: "Owned item",
    sources: ["inventory"],
  });
  assert.deepEqual(matchOwnedItem(300, index, itemInfo, models, true), {
    kind: "same_model",
    ownedItemId: 100,
    ownedItemName: "Owned item",
    sources: ["inventory"],
  });
  assert.deepEqual(matchOwnedItem(400, index, itemInfo, models, true), {
    kind: "not_owned",
  });
});

test("does not report an unverified negative while metadata is loading", () => {
  assert.deepEqual(matchOwnedItem(300, new Map(), itemInfo, new Map(), false), {
    kind: "checking",
  });
});
