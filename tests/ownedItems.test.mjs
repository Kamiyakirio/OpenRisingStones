/** Regression coverage for owned-item source merging and same-model matching. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOwnedItemIndex,
  buildOwnedModelIndex,
  matchOwnedItem,
} from "../src/features/glamour/utils/ownedItems.ts";

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

test("matches HQ dresser equipment using the base item ID", () => {
  const index = buildOwnedItemIndex(
    {
      items: [
        { itemId: 1044432, sources: ["glamour_dresser"] },
        { itemId: 44432, sources: ["armoury_chest"] },
      ],
      armoire: { cabinetItemIds: [] },
    },
    new Map(),
  );
  assert.deepEqual(index.get(44432), ["glamour_dresser", "armoury_chest"]);
  assert.equal(index.has(1044432), false);
  assert.equal(
    matchOwnedItem(44432, index, new Map(), new Map(), false).kind,
    "exact",
  );
});

test("expands only stored outfit pieces without shifting empty columns", () => {
  const sets = new Map([
    [47704, [0, 0, 47202, 47203, 47204, 47205, 47206, 0, 0, 0, 0]],
  ]);
  const index = buildOwnedItemIndex(
    {
      items: [{ itemId: 47704, sources: ["glamour_dresser"] }],
      dresserItems: [{ itemId: 47704, setUnlockBits: 0x7ff ^ (1 << 4) }],
      armoire: { cabinetItemIds: [] },
    },
    new Map(),
    sets,
  );
  assert.deepEqual([...index], [[47204, ["glamour_dresser"]]]);
});

test("HQ outfit IDs normalize and absent entries or all missing bits grant no pieces", () => {
  const sets = new Map([
    [47704, [0, 0, 47202, 47203, 47204, 47205, 47206, 0, 0, 0, 0]],
  ]);
  for (const dresserItems of [
    undefined,
    [{ itemId: 1047704, setUnlockBits: 0x7ff }],
  ]) {
    const index = buildOwnedItemIndex(
      {
        items: [{ itemId: 1047704, sources: ["glamour_dresser"] }],
        dresserItems,
        armoire: { cabinetItemIds: [] },
      },
      new Map(),
      sets,
    );
    assert.equal(index.size, 0);
  }
  const index = buildOwnedItemIndex(
    {
      items: [],
      dresserItems: [{ itemId: 1047704, setUnlockBits: 0x7ff ^ (1 << 4) }],
      armoire: { cabinetItemIds: [] },
    },
    new Map(),
    sets,
  );
  assert.deepEqual(index.get(47204), ["glamour_dresser"]);
});

test("zero missing bits grant the full Yang armor outfit including boots 43373", () => {
  const index = buildOwnedItemIndex(
    {
      items: [{ itemId: 50705, sources: ["glamour_dresser"] }],
      dresserItems: [{ itemId: 50705, setUnlockBits: 0 }],
      armoire: { cabinetItemIds: [] },
    },
    new Map(),
    new Map([[50705, [0, 0, 43369, 43370, 43371, 43372, 43373, 0, 0, 0, 0]]]),
  );
  assert.deepEqual([...index.keys()], [43369, 43370, 43371, 43372, 43373]);
  assert.equal(
    matchOwnedItem(43373, index, new Map(), new Map(), false).kind,
    "exact",
  );
});
