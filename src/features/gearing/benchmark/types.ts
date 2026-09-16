/** Stable benchmark contracts keep generated inputs separate from measured results. */
import type { CombatInput, NativeResult } from "../editor/calculation.types";

export const BENCHMARK_SIZES = [4, 16, 32, 64] as const;
export const BENCHMARK_ALGORITHMS = ["current"] as const;
export type BenchmarkSize = (typeof BENCHMARK_SIZES)[number];
export type BenchmarkAlgorithm = (typeof BENCHMARK_ALGORITHMS)[number];

export const algorithmNames: Record<BenchmarkAlgorithm, string> = {
  current: "当前算法",
};

export interface BenchmarkInfo {
  appVersion: string;
  architecture: string;
  buildProfile: string;
  logicalCpus: number;
  operatingSystem: string;
}

export interface BenchmarkMemory {
  supported: boolean;
  beforeBytes: number | null;
  peakBytes: number | null;
  afterBytes: number | null;
  peakDeltaBytes: number | null;
  retainedDeltaBytes: number | null;
  samplingIntervalMs: number;
}

export interface BenchmarkDiagnostic {
  schemaVersion: number;
  event: string;
  [key: string]: unknown;
}

export interface BenchmarkVariant {
  caseId: string;
  caseIndex: number;
  size: BenchmarkSize;
  targetGcd: number;
  input: CombatInput;
  parameters: unknown;
  candidateIdsBySlot: Record<string, number[]>;
  candidateCountsBySlot: Record<string, number>;
  foodIds: number[];
  inputChecksum: string;
}

export interface BenchmarkDataset {
  schemaVersion: 1;
  generatorVersion: string;
  seed: string;
  job: string;
  jobName: string;
  gameVersion: string;
  dataVersion: string;
  parameterVersion: string;
  minItemLevel: number;
  maxItemLevel: number;
  variants: BenchmarkVariant[];
}

export interface BenchmarkSample {
  algorithm: BenchmarkAlgorithm;
  caseId: string;
  caseIndex: number;
  size: BenchmarkSize;
  repetition: number;
  durationMs: number;
  memory: BenchmarkMemory;
  diagnostics: BenchmarkDiagnostic[];
  timedOut: boolean;
  valid: boolean;
  result: NativeResult;
}

export interface BenchmarkAggregate {
  algorithm: BenchmarkAlgorithm;
  size: BenchmarkSize;
  medianMs: number | null;
  p95Ms: number | null;
  completionRate: number;
  validRate: number;
  optimalHitRate: number | null;
  meanGap: number | null;
  medianBeforeBytes: number | null;
  medianPeakBytes: number | null;
  medianPeakDeltaBytes: number | null;
  p95PeakDeltaBytes: number | null;
  medianAfterBytes: number | null;
  medianRetainedDeltaBytes: number | null;
}

export interface BenchmarkResult {
  schemaVersion: 1;
  generatedAt: string;
  device: BenchmarkInfo & { userAgent: string };
  configuration: {
    algorithms: BenchmarkAlgorithm[];
    repetitions: number;
    timeoutMs: number;
  };
  dataset: Omit<BenchmarkDataset, "variants"> & {
    cases: Array<
      Omit<BenchmarkVariant, "input" | "parameters"> & {
        totalCandidates: number;
      }
    >;
  };
  samples: BenchmarkSample[];
  aggregates: BenchmarkAggregate[];
}
