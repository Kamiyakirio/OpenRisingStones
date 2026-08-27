/** Contract tests for paced list collection and bounded detail aggregation. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  ADVANCED_RECRUIT_DETAIL_CONCURRENCY,
  collectAdvancedRecruitDataset,
  recruitListIntervalMs,
} from "../src/utils/advancedRecruitAggregation.ts";

const summary = (id) => ({ id, dutyName: `Duty ${id}` });

test("keeps list request intervals inside the declared one-to-five-second range", () => {
  assert.equal(
    recruitListIntervalMs(() => 0),
    1000,
  );
  assert.equal(
    recruitListIntervalMs(() => 1),
    5000,
  );
});

test("paces list pages and loads details with bounded parallelism", async () => {
  const waited = [];
  const progress = [];
  let activeDetails = 0;
  let maxActiveDetails = 0;
  const dataset = await collectAdvancedRecruitDataset(
    { onProgress: (value) => progress.push(value) },
    {
      random: () => 0.5,
      wait: async (milliseconds) => {
        waited.push(milliseconds);
      },
      fetchPage: async ({ page }) => ({
        total: 60,
        hasMore: page === 1,
        items:
          page === 1
            ? Array.from({ length: 50 }, (_, index) => summary(index + 1))
            : Array.from({ length: 10 }, (_, index) => summary(index + 51)),
      }),
      fetchDetail: async (id) => {
        activeDetails += 1;
        maxActiveDetails = Math.max(maxActiveDetails, activeDetails);
        await Promise.resolve();
        activeDetails -= 1;
        return { ...summary(id), teamDetail: "Detail" };
      },
    },
  );

  assert.deepEqual(waited, [3000]);
  assert.equal(dataset.items.length, 60);
  assert.equal(dataset.failedDetailCount, 0);
  assert.equal(maxActiveDetails, ADVANCED_RECRUIT_DETAIL_CONCURRENCY);
  assert.deepEqual(progress.at(-1), {
    stage: "detail",
    completed: 60,
    total: 60,
    overallCompleted: 62,
    overallTotal: 62,
  });
});
