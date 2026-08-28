/** Regression coverage for job matching, request pacing, and feed buffering. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  filterGlamoursByJobs,
  GLAMOUR_FEED_BATCH_SIZE,
  JOB_FILTER_PREFETCH_COUNT,
  JOB_FILTER_REQUEST_INTERVAL_MS,
  matchesSelectedJobs,
  mergeUniqueGlamours,
  revealNextGlamourBatch,
  visibleGlamourFeed,
} from "../src/utils/glamourJobFilter.ts";

const glamour = (id, jobIds) => ({ id, jobIds });

test("keeps background requests within the required interval", () => {
  assert.ok(JOB_FILTER_REQUEST_INTERVAL_MS >= 1_000);
  assert.ok(JOB_FILTER_REQUEST_INTERVAL_MS <= 5_000);
});

test("matches unrestricted and selected-job submissions", () => {
  assert.equal(matchesSelectedJobs([], [28]), true);
  assert.equal(matchesSelectedJobs([28], [19, 28]), true);
  assert.equal(matchesSelectedJobs([28], [19, 21]), false);
});

test("filters one page with multi-select union semantics", () => {
  const items = [glamour(1, []), glamour(2, [28]), glamour(3, [38])];

  assert.deepEqual(
    filterGlamoursByJobs(items, [28, 38]).map((item) => item.id),
    [1, 2, 3],
  );
  assert.deepEqual(
    filterGlamoursByJobs(items, [28]).map((item) => item.id),
    [1, 2],
  );
});

test("merges scanned pages without duplicate feed entries", () => {
  const merged = mergeUniqueGlamours(
    [glamour(1, [28]), glamour(2, [38])],
    [glamour(2, [38]), glamour(3, [])],
  );

  assert.deepEqual(
    merged.map((item) => item.id),
    [1, 2, 3],
  );
});

test("keeps prefetched matches hidden until the next feed batch", () => {
  const buffered = Array.from(
    { length: GLAMOUR_FEED_BATCH_SIZE + JOB_FILTER_PREFETCH_COUNT },
    (_, index) => glamour(index + 1, []),
  );
  const initial = visibleGlamourFeed(buffered, GLAMOUR_FEED_BATCH_SIZE);
  const nextLimit = revealNextGlamourBatch(GLAMOUR_FEED_BATCH_SIZE);

  assert.equal(initial.length, GLAMOUR_FEED_BATCH_SIZE);
  assert.equal(visibleGlamourFeed(buffered, nextLimit).length, nextLimit);
  assert.ok(buffered.length > nextLimit);
});
