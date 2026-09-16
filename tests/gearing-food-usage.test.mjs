/** Food utilization must be independent of already equipped consumables. */
import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/gearing-loader.mjs";
const { foodUsage } =
  await import("../src/features/gearing/editor/foodUsage.ts");

test("food utilization removes existing food and potion before applying rates", () => {
  const item = {
    stats: { CRT: 120, VIT: 100 },
    statRates: { CRT: 10, VIT: 10 },
  };
  const result = foodUsage(item, {
    stats: { CRT: 1150, VIT: 1100 },
    slots: {
      food: { stats: { CRT: 100, VIT: 100 } },
      potion: { stats: { CRT: 50 } },
    },
  });
  assert.deepEqual(result.actual, { CRT: 100, VIT: 100 });
  assert.equal(result.utilization, (100 * 200) / 220);
});

test("food utilization caps percentage bonuses and preserves fixed bonuses", () => {
  const result = foodUsage(
    { stats: { CRT: 90, VIT: 10 }, statRates: { CRT: 10 } },
    {
      stats: { CRT: 5000 },
      slots: {},
    },
  );
  assert.deepEqual(result.actual, { CRT: 90, VIT: 10 });
  assert.equal(result.utilization, 100);
});
