/** Result aggregation compares algorithms against the best valid result for the same real case. */
import {
  BENCHMARK_SIZES,
  type BenchmarkAggregate,
  type BenchmarkAlgorithm,
  type BenchmarkSample,
} from "./types";
import type { BenchmarkVariant } from "./types";

const DAMAGE_TOLERANCE = 1e-10;

export function aggregateSamples(
  samples: BenchmarkSample[],
  algorithms: BenchmarkAlgorithm[],
): BenchmarkAggregate[] {
  return algorithms.flatMap((algorithm) =>
    BENCHMARK_SIZES.map((size) => {
      const rows = samples.filter(
        (sample) => sample.algorithm === algorithm && sample.size === size,
      );
      const completed = rows.filter((sample) => sample.result.status === "ok");
      const durations = completed
        .map((sample) => sample.durationMs)
        .sort((a, b) => a - b);
      const memory = completed.filter((sample) => sample.memory.supported);
      const comparisons =
        algorithms.length < 2
          ? []
          : rows.flatMap((sample) => {
              if (!sample.valid) return [];
              const reference = samples
                .filter(
                  (candidate) =>
                    candidate.caseId === sample.caseId &&
                    candidate.repetition === sample.repetition &&
                    candidate.valid,
                )
                .sort(
                  (a, b) =>
                    (b.result.effects?.damage ?? 0) -
                    (a.result.effects?.damage ?? 0),
                )[0];
              const damage = sample.result.effects?.damage;
              const referenceDamage = reference?.result.effects?.damage;
              if (damage === undefined || referenceDamage === undefined)
                return [];
              const difference = referenceDamage - damage;
              return [
                {
                  hit: Math.abs(difference) <= DAMAGE_TOLERANCE,
                  gap: Math.max(0, difference / referenceDamage),
                },
              ];
            });
      return {
        algorithm,
        size,
        medianMs: percentile(durations, 0.5),
        p95Ms: percentile(durations, 0.95),
        completionRate: ratio(completed.length, rows.length),
        validRate: ratio(
          rows.filter((sample) => sample.valid).length,
          rows.length,
        ),
        optimalHitRate: comparisons.length
          ? ratio(
              comparisons.filter((value) => value.hit).length,
              comparisons.length,
            )
          : null,
        meanGap: comparisons.length
          ? comparisons.reduce((sum, value) => sum + value.gap, 0) /
            comparisons.length
          : null,
        medianBeforeBytes: percentile(
          compact(memory.map((sample) => sample.memory.beforeBytes)),
          0.5,
        ),
        medianPeakBytes: percentile(
          compact(memory.map((sample) => sample.memory.peakBytes)),
          0.5,
        ),
        medianPeakDeltaBytes: percentile(
          compact(memory.map((sample) => sample.memory.peakDeltaBytes)),
          0.5,
        ),
        p95PeakDeltaBytes: percentile(
          compact(memory.map((sample) => sample.memory.peakDeltaBytes)),
          0.95,
        ),
        medianAfterBytes: percentile(
          compact(memory.map((sample) => sample.memory.afterBytes)),
          0.5,
        ),
        medianRetainedDeltaBytes: percentile(
          compact(memory.map((sample) => sample.memory.retainedDeltaBytes)),
          0.5,
        ),
      };
    }),
  );
}

export function isValidSample(
  result: BenchmarkSample["result"],
  variant: BenchmarkVariant,
) {
  const damage = result.effects?.damage;
  const gcd = result.effects?.gcd;
  const plan = result.plan ?? [];
  const gears = new Map(variant.input.gears.map((gear) => [gear.id, gear]));
  const expectedSlots = variant.input.rules.schema.slots
    .map((slot) => slot.slot)
    .filter((slot): slot is number => typeof slot === "number" && slot > 0);
  const actualSlots = new Set(plan.map((entry) => entry.slot));
  const validPlan =
    plan.length === expectedSlots.length &&
    actualSlots.size === expectedSlots.length &&
    expectedSlots.every((slot) => actualSlots.has(slot)) &&
    plan.every((entry) => gears.get(entry.gearId)?.slot === entry.slot);
  const validFood =
    result.foodId === undefined ||
    variant.input.foods.some((food) => food.id === result.foodId);
  return (
    result.status === "ok" &&
    validPlan &&
    validFood &&
    typeof damage === "number" &&
    Number.isFinite(damage) &&
    typeof gcd === "number" &&
    Number.isFinite(gcd) &&
    gcd <= variant.targetGcd + 1e-9
  );
}

function percentile(values: number[], quantile: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = Math.max(0, Math.ceil(sorted.length * quantile) - 1);
  return sorted[position];
}

function ratio(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : 0;
}

function compact(values: Array<number | null>): number[] {
  return values.filter((value): value is number => value !== null);
}
