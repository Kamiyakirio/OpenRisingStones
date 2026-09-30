/** Regression coverage for pagination metadata and popular-feed page counts. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  findGlamourTotal,
  inferGlamourHasMore,
} from "../src/features/glamour/utils/glamourPagination.ts";

test("ignores the popular feed's page-local count", () => {
  const payload = { data: { count: 12, rows: Array.from({ length: 12 }) } };

  assert.equal(findGlamourTotal(payload, { countIsPageSize: true }), null);
  assert.equal(
    inferGlamourHasMore(payload, 12, 12, 12, { countIsPageSize: true }),
    true,
  );
});

test("stops a partial standard batch without pagination metadata", () => {
  assert.equal(inferGlamourHasMore({}, 3, 12, 3), false);
});

test("explicit pagination metadata wins over the popular-feed fallback", () => {
  assert.equal(
    inferGlamourHasMore({ data: { hasMore: false } }, 12, 12, 12, {
      countIsPageSize: true,
    }),
    false,
  );
  assert.equal(
    inferGlamourHasMore({ data: { total: 24 } }, 12, 12, 12, {
      countIsPageSize: true,
    }),
    true,
  );
});

test("an empty response always stops pagination", () => {
  assert.equal(
    inferGlamourHasMore({}, 0, 12, 12, { countIsPageSize: true }),
    false,
  );
});

test("reads total values from nested response variants", () => {
  assert.equal(findGlamourTotal({ result: { total_rows: "24" } }), 24);
  assert.equal(findGlamourTotal({ result: { count: 24 } }), 24);
});
