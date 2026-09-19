/** Strict Mode presentation grouping keeps each raw operation reachable. */
import assert from "node:assert/strict";
import test from "node:test";
import { groupSimilarLogs } from "../src/features/diagnostics/grouping.ts";

function entry(id, timestampMs, fingerprint, name = "sdo_login_status") {
  return {
    id,
    timestampMs,
    fingerprint,
    kind: "invoke",
    source: "webview",
    name,
    outcome: "success",
  };
}

test("folds adjacent identical operations but preserves both occurrence IDs", () => {
  const groups = groupSimilarLogs([
    entry(2, 1_400, "same"),
    entry(1, 1_000, "same"),
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].occurrences.map((item) => item.id),
    [2, 1],
  );
});

test("keeps different payloads and later legitimate calls separate", () => {
  const groups = groupSimilarLogs([
    entry(4, 3_000, "same"),
    entry(3, 2_000, "same"),
    entry(2, 1_400, "second-payload"),
    entry(1, 1_000, "first-payload"),
  ]);
  assert.equal(groups.length, 4);
});
