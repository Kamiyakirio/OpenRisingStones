/** Regression coverage for continuous recruitment feed page merging. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  canLoadMoreRecruitItems,
  mergeRecruitFeed,
} from "../src/features/recruit/utils/recruitFeed.ts";

const recruit = (id, title) => ({ id, dutyName: title });

test("appends later recruitment pages in feed order", () => {
  const merged = mergeRecruitFeed(
    [recruit(1, "First"), recruit(2, "Second")],
    [recruit(3, "Third")],
  );

  assert.deepEqual(
    merged.map((item) => item.id),
    [1, 2, 3],
  );
});

test("updates duplicates without adding repeated feed cards", () => {
  const merged = mergeRecruitFeed(
    [recruit(1, "Old"), recruit(2, "Second")],
    [recruit(1, "Updated"), recruit(3, "Third")],
  );

  assert.deepEqual(
    merged.map((item) => [item.id, item.dutyName]),
    [
      [1, "Updated"],
      [2, "Second"],
      [3, "Third"],
    ],
  );
});

test("loads more only when a non-empty feed is incomplete", () => {
  assert.equal(canLoadMoreRecruitItems(9, 347), true);
  assert.equal(canLoadMoreRecruitItems(347, 347), false);
  assert.equal(canLoadMoreRecruitItems(0, 347), false);
});
