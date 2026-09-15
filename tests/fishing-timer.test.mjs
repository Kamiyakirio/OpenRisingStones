/** Stopwatch correctness is independent of the rendering timer and its throttling. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  elapsedTime,
  idleTimer,
  timerProgress,
  timerReducer,
} from "../src/features/fishing/timer/model.ts";

test("a delayed render measures actual elapsed time and bite freezes it", () => {
  const casting = timerReducer(idleTimer, { type: "cast", at: 100 });
  assert.equal(elapsedTime(casting, 73100), 73000);
  const bite = timerReducer(casting, { type: "stop", at: 5600, tug: "heavy" });
  assert.equal(bite.tug, "heavy");
  assert.equal(elapsedTime(bite, 1000000), 5500);
  assert.strictEqual(timerReducer(bite, { type: "stop", at: 1000001 }), bite);
  assert.deepEqual(timerReducer(bite, { type: "reset" }), idleTimer);
});
test("recasting starts a new measurement and early frames cannot report negative time", () => {
  const first = timerReducer(idleTimer, { type: "cast", at: 100 });
  const next = timerReducer(first, { type: "cast", at: 200 });
  assert.equal(elapsedTime(next, 150), 0);
  assert.equal(elapsedTime(next, 600), 400);
  assert.strictEqual(
    timerReducer(idleTimer, { type: "stop", at: 100 }),
    idleTimer,
  );
});
test("short-cast scaling is continuous at ten seconds and saturates at fifty", () => {
  assert.equal(timerProgress(10000, true), 30 / 70);
  assert.equal(timerProgress(10000, false), 0.2);
  assert.ok(timerProgress(9999, true) < timerProgress(10000, true));
  assert.equal(timerProgress(50000, true), 1);
  assert.equal(timerProgress(99000, true), 1);
  assert.equal(timerProgress(-100, true), 0);
});
