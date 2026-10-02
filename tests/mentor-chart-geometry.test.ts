/** Pie sectors and chart axes cover degenerate and uneven record distributions. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  mentorBarScale,
  mentorPieSlices,
} from "../src/features/mentor/utils/chartGeometry.ts";

test("empty slices disappear and one category renders a complete circle", () => {
  assert.deepEqual(mentorPieSlices([0, 0]), [null, null]);
  const slices = mentorPieSlices([0, 7, 0]);
  assert.equal(slices[0], null);
  assert.equal(slices[2], null);
  assert.equal((slices[1]?.match(/ A /g) ?? []).length, 2);
});

test("unequal pie sectors include the correct large arc and never create invalid coordinates", () => {
  const slices = mentorPieSlices([3, 1, 0]);
  assert.match(slices[0]!, /A 90 90 0 1 1/);
  assert.match(slices[1]!, /A 90 90 0 0 1/);
  assert.equal(slices[2], null);
  for (const slice of slices.filter(Boolean))
    assert.doesNotMatch(slice!, /NaN|Infinity/);
});

test("bar axes start at zero and use whole-count ticks covering the largest value", () => {
  for (const count of [0, 1, 4, 5, 99, 1234, 20000]) {
    const scale = mentorBarScale(count);
    assert.equal(scale.ticks[0], 0);
    assert.equal(scale.ticks.at(-1), scale.limit);
    assert.ok(scale.limit >= count);
    assert.ok(scale.ticks.length >= 2 && scale.ticks.length <= 6);
    assert.ok(scale.ticks.every(Number.isInteger));
    assert.ok(
      scale.ticks.every(
        (tick, index) => !index || tick > scale.ticks[index - 1],
      ),
    );
  }
});
