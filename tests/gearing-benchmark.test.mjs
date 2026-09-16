/** Benchmark generation uses reproducible subsets of the installed real catalog. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import "./helpers/gearing-loader.mjs";

const { ItemCatalog } =
  await import("../src/features/gearing/editor/catalog.ts");
const { generateBenchmarkDataset } =
  await import("../src/features/gearing/benchmark/generator.ts");
const { aggregateSamples, isValidSample } =
  await import("../src/features/gearing/benchmark/results.ts");
const catalog = new ItemCatalog(
  JSON.parse(
    readFileSync("src/features/gearing/data/generated/catalog.json", "utf8"),
  ),
);

test("same seed repeats and different seeds select different real equipment", () => {
  const options = { seed: "stable-seed", job: "SCH", caseCount: 2 };
  const first = generateBenchmarkDataset(catalog, options);
  const repeated = generateBenchmarkDataset(catalog, options);
  const changed = generateBenchmarkDataset(catalog, {
    ...options,
    seed: "changed-seed",
  });
  assert.deepEqual(
    first.variants.map((variant) => variant.inputChecksum),
    repeated.variants.map((variant) => variant.inputChecksum),
  );
  assert.notDeepEqual(
    first.variants.map((variant) => variant.inputChecksum),
    changed.variants.map((variant) => variant.inputChecksum),
  );
  for (const variant of first.variants) {
    const ids = Object.values(variant.candidateIdsBySlot).flat();
    assert.equal(catalog.items(ids).length, ids.length);
  }
});

test("candidate scales are nested and capped by each real slot collection", () => {
  const dataset = generateBenchmarkDataset(catalog, {
    seed: "nested-seed",
    job: "SCH",
    caseCount: 1,
  });
  for (let index = 1; index < dataset.variants.length; index++) {
    const smaller = dataset.variants[index - 1];
    const larger = dataset.variants[index];
    for (const [slot, ids] of Object.entries(smaller.candidateIdsBySlot))
      assert.deepEqual(
        larger.candidateIdsBySlot[slot].slice(0, ids.length),
        ids,
      );
  }
  const largest = dataset.variants.at(-1);
  assert.ok(
    Object.values(largest.candidateCountsBySlot).every((count) => count <= 64),
  );
});

test("result validation rejects structurally invalid solver output", () => {
  const variant = generateBenchmarkDataset(catalog, {
    seed: "result-seed",
    job: "SCH",
    caseCount: 1,
  }).variants[0];
  const result = {
    status: "ok",
    effects: { damage: 1, gcd: 2.5 },
    plan: [],
  };
  assert.equal(isValidSample(result, variant), false);
  const aggregates = aggregateSamples(
    [
      {
        algorithm: "current",
        caseId: variant.caseId,
        caseIndex: 0,
        size: 4,
        repetition: 0,
        durationMs: 12,
        diagnostics: [],
        memory: {
          supported: true,
          beforeBytes: 100,
          peakBytes: 160,
          afterBytes: 120,
          peakDeltaBytes: 60,
          retainedDeltaBytes: 20,
          samplingIntervalMs: 5,
        },
        timedOut: false,
        valid: false,
        result,
      },
    ],
    ["current"],
  );
  assert.equal(aggregates[0].completionRate, 1);
  assert.equal(aggregates[0].validRate, 0);
  assert.equal(aggregates[0].medianPeakDeltaBytes, 60);
});

test("memory summaries include timed-out samples without counting them as completed", () => {
  const aggregates = aggregateSamples(
    [
      {
        algorithm: "current",
        caseId: "timeout-memory",
        caseIndex: 0,
        size: 4,
        repetition: 0,
        durationMs: 30000,
        diagnostics: [],
        memory: {
          supported: true,
          beforeBytes: 100,
          peakBytes: 300,
          afterBytes: 200,
          peakDeltaBytes: 200,
          retainedDeltaBytes: 100,
          samplingIntervalMs: 5,
        },
        timedOut: true,
        valid: false,
        result: { status: "cancelled" },
      },
    ],
    ["current"],
  );
  assert.equal(aggregates[0].completionRate, 0);
  assert.equal(aggregates[0].medianMs, null);
  assert.equal(aggregates[0].medianPeakBytes, 300);
  assert.equal(aggregates[0].medianPeakDeltaBytes, 200);
});
