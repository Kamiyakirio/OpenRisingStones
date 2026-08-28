/** Contract tests for paced list collection and bounded detail aggregation. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  ADVANCED_RECRUIT_DETAIL_CONCURRENCY,
  collectAdvancedRecruitDataset,
  rateLimitBackoffMs,
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

test("uses capped exponential backoff for repeated rate-limit probes", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7].map(rateLimitBackoffMs),
    [2000, 4000, 8000, 16000, 32000, 60000, 60000],
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
      isRateLimitError: () => false,
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

test("pauses all workers, uses one probe, and can recover repeatedly", async () => {
  class RateLimitError extends Error {}
  const waited = [];
  const progress = [];
  const probeCallsByEpisode = [0, 0];
  let episode = 0;
  let blocked = true;
  let probeWindow = false;
  let normalSuccesses = 0;

  const dataset = await collectAdvancedRecruitDataset(
    { onProgress: (value) => progress.push(value) },
    {
      random: () => 0,
      wait: async (milliseconds) => {
        waited.push(milliseconds);
        probeWindow = true;
        await Promise.resolve();
      },
      fetchPage: async () => ({
        total: 12,
        hasMore: false,
        items: Array.from({ length: 12 }, (_, index) => summary(index + 1)),
      }),
      fetchDetail: async (id) => {
        if (blocked) {
          if (!probeWindow) throw new RateLimitError();
          probeWindow = false;
          probeCallsByEpisode[episode] += 1;
          if (episode === 0 && probeCallsByEpisode[episode] < 2) {
            throw new RateLimitError();
          }
          blocked = false;
          return { ...summary(id), teamDetail: "Recovered probe" };
        }

        normalSuccesses += 1;
        if (episode === 0 && normalSuccesses === 3) {
          episode = 1;
          blocked = true;
          throw new RateLimitError();
        }
        return { ...summary(id), teamDetail: "Detail" };
      },
      isRateLimitError: (reason) => reason instanceof RateLimitError,
    },
  );

  assert.equal(dataset.items.length, 12);
  assert.equal(dataset.failedDetailCount, 0);
  assert.deepEqual(waited, [2000, 4000, 2000]);
  assert.deepEqual(probeCallsByEpisode, [2, 1]);
  assert.equal(
    progress.filter((value) => value.stage === "rate_limit").length,
    3,
  );
});
