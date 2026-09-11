/** Candidate columns retain job speed without displacing core secondaries. */
import assert from "node:assert/strict";
import test from "node:test";
import { candidateStats } from "../src/features/gearing/editor/candidateStats.ts";

test("shows healer and physical speed as the fourth candidate stat", () => {
  assert.deepEqual(
    candidateStats(["MND", "CRT", "DET", "DHT", "SPS", "PIE", "VIT"]),
    ["CRT", "DET", "DHT", "SPS"],
  );
  assert.deepEqual(
    candidateStats(["STR", "CRT", "DET", "DHT", "SKS", "TEN", "VIT"]),
    ["CRT", "DET", "DHT", "SKS"],
  );
});

test("keeps all three production attributes", () => {
  assert.deepEqual(candidateStats(["CMS", "CRL", "CP"]), ["CMS", "CRL", "CP"]);
});
