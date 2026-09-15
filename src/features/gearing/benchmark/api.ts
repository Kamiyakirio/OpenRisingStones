/** Native benchmark calls keep catalog preparation outside measured solver time. */
import { invoke } from "@tauri-apps/api/core";
import type { NativeResult } from "../editor/calculation.types";
import type {
  BenchmarkAlgorithm,
  BenchmarkInfo,
  BenchmarkMemory,
  BenchmarkVariant,
} from "./types";

export function loadBenchmarkInfo() {
  return invoke<BenchmarkInfo>("gearing_benchmark_info");
}

export function runBenchmarkSample(
  algorithm: BenchmarkAlgorithm,
  variant: BenchmarkVariant,
  requestId: string,
) {
  return invoke<{
    durationMs: number;
    memory: BenchmarkMemory;
    result: NativeResult;
  }>("benchmark_gearing", {
    algorithm,
    requestId,
    input: variant.input,
    parameters: variant.parameters,
  });
}

export function cancelBenchmarkSample(requestId: string) {
  return invoke<void>("cancel_gearing_optimization", { requestId });
}

export function exportBenchmarkResult(contents: string) {
  return invoke<string>("export_gearing_benchmark", { contents });
}
