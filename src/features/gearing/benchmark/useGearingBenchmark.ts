/** Coordinates deterministic case generation, sequential native timing, cancellation, and export. */
import { useCallback, useEffect, useRef, useState } from "react";
import { loadItemCatalog, type ItemCatalog } from "../editor/catalog";
import {
  cancelBenchmarkSample,
  exportBenchmarkResult,
  loadBenchmarkInfo,
  runBenchmarkSample,
} from "./api";
import { generateBenchmarkDataset, randomBenchmarkSeed } from "./generator";
import { aggregateSamples, isValidSample } from "./results";
import {
  BENCHMARK_ALGORITHMS,
  type BenchmarkDataset,
  type BenchmarkInfo,
  type BenchmarkMemory,
  type BenchmarkResult,
  type BenchmarkSample,
} from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;
const unsupportedMemory: BenchmarkMemory = {
  supported: false,
  beforeBytes: null,
  peakBytes: null,
  afterBytes: null,
  peakDeltaBytes: null,
  retainedDeltaBytes: null,
  samplingIntervalMs: 5,
};

export function useGearingBenchmark() {
  const [catalog, setCatalog] = useState<ItemCatalog | null>(null);
  const [info, setInfo] = useState<BenchmarkInfo | null>(null);
  const [seed, setSeedState] = useState("20260915");
  const [job, setJobState] = useState("SCH");
  const [caseCount, setCaseCountState] = useState(1);
  const [repetitions, setRepetitionsState] = useState(3);
  const [dataset, setDataset] = useState<BenchmarkDataset | null>(null);
  const [samples, setSamples] = useState<BenchmarkSample[]>([]);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    label: "",
  });
  const [exportedPath, setExportedPath] = useState<string | null>(null);
  const stopRequested = useRef(false);
  const activeRequest = useRef<string | null>(null);

  useEffect(() => {
    loadItemCatalog()
      .then((nextCatalog) => {
        setCatalog(nextCatalog);
        const jobs = nextCatalog
          .bootstrap()
          .jobs.filter((value) => value.combat);
        if (!jobs.some((value) => value.id === "SCH") && jobs[0])
          setJobState(jobs[0].id);
      })
      .catch((reason) => setError(readError(reason)));
    loadBenchmarkInfo()
      .then(setInfo)
      .catch(() => setError("请在 Debug 桌面应用中运行 Benchmark。"));
  }, []);

  const invalidate = useCallback(() => {
    setDataset(null);
    setSamples([]);
    setResult(null);
    setExportedPath(null);
    setError(null);
  }, []);

  const setSeed = useCallback(
    (value: string) => {
      setSeedState(value);
      invalidate();
    },
    [invalidate],
  );
  const setJob = useCallback(
    (value: string) => {
      setJobState(value);
      invalidate();
    },
    [invalidate],
  );
  const setCaseCount = useCallback(
    (value: number) => {
      setCaseCountState(value);
      invalidate();
    },
    [invalidate],
  );
  const setRepetitions = useCallback(
    (value: number) => {
      setRepetitionsState(value);
      invalidate();
    },
    [invalidate],
  );
  const useRandomSeed = useCallback(
    () => setSeed(randomBenchmarkSeed()),
    [setSeed],
  );

  const generate = useCallback(() => {
    if (!catalog) return null;
    try {
      const next = generateBenchmarkDataset(catalog, { seed, job, caseCount });
      setDataset(next);
      setSamples([]);
      setResult(null);
      setExportedPath(null);
      setError(null);
      return next;
    } catch (reason) {
      setError(readError(reason));
      return null;
    }
  }, [caseCount, catalog, job, seed]);

  const run = useCallback(async () => {
    if (!catalog || !info || running) return;
    const activeDataset = dataset ?? generate();
    if (!activeDataset) return;
    const total =
      activeDataset.variants.length * repetitions * BENCHMARK_ALGORITHMS.length;
    const collected: BenchmarkSample[] = [];
    stopRequested.current = false;
    setRunning(true);
    setSamples([]);
    setResult(null);
    setExportedPath(null);
    setError(null);
    setProgress({ completed: 0, total, label: "准备运行" });
    try {
      outer: for (const variant of activeDataset.variants) {
        for (const algorithm of BENCHMARK_ALGORITHMS) {
          for (let repetition = 0; repetition < repetitions; repetition++) {
            if (stopRequested.current) break outer;
            const requestId = `benchmark-${crypto.randomUUID()}`;
            activeRequest.current = requestId;
            setProgress((current) => ({
              ...current,
              label: `${activeDataset.jobName} · ${variant.size} 件/槽 · 第 ${repetition + 1} 次`,
            }));
            let timedOut = false;
            const timer = window.setTimeout(() => {
              timedOut = true;
              void cancelBenchmarkSample(requestId);
            }, DEFAULT_TIMEOUT_MS);
            let response: Awaited<ReturnType<typeof runBenchmarkSample>>;
            try {
              response = await runBenchmarkSample(
                algorithm,
                variant,
                requestId,
              );
            } catch (reason) {
              response = {
                durationMs: timedOut ? DEFAULT_TIMEOUT_MS : 0,
                memory: unsupportedMemory,
                diagnostics: [],
                result: { status: "error", message: readError(reason) },
              };
            } finally {
              window.clearTimeout(timer);
              activeRequest.current = null;
            }
            const sample: BenchmarkSample = {
              algorithm,
              caseId: variant.caseId,
              caseIndex: variant.caseIndex,
              size: variant.size,
              repetition,
              durationMs: response.durationMs,
              memory: response.memory,
              diagnostics: response.diagnostics,
              timedOut,
              valid: !timedOut && isValidSample(response.result, variant),
              result: response.result,
            };
            collected.push(sample);
            setSamples([...collected]);
            setProgress((current) => ({
              ...current,
              completed: collected.length,
            }));
          }
        }
      }
      const completedResult = buildResult(
        activeDataset,
        info,
        repetitions,
        collected,
      );
      setResult(completedResult);
      setProgress((current) => ({
        ...current,
        label: stopRequested.current ? "测试已停止" : "测试完成",
      }));
    } finally {
      setRunning(false);
    }
  }, [catalog, dataset, generate, info, repetitions, running]);

  const stop = useCallback(() => {
    stopRequested.current = true;
    const requestId = activeRequest.current;
    if (requestId) void cancelBenchmarkSample(requestId);
  }, []);

  const exportResult = useCallback(async () => {
    if (!result || exportedPath) return;
    try {
      const path = await exportBenchmarkResult(JSON.stringify(result, null, 2));
      setExportedPath(path);
      setError(null);
    } catch (reason) {
      setError(readError(reason));
    }
  }, [exportedPath, result]);

  return {
    info,
    jobs: catalog?.bootstrap().jobs.filter((value) => value.combat) ?? [],
    seed,
    job,
    caseCount,
    repetitions,
    dataset,
    samples,
    result,
    error,
    running,
    progress,
    exportedPath,
    setSeed,
    setJob,
    setCaseCount,
    setRepetitions,
    useRandomSeed,
    generate,
    run,
    stop,
    exportResult,
  };
}

function buildResult(
  dataset: BenchmarkDataset,
  info: BenchmarkInfo,
  repetitions: number,
  samples: BenchmarkSample[],
): BenchmarkResult {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    device: { ...info, userAgent: navigator.userAgent },
    configuration: {
      algorithms: [...BENCHMARK_ALGORITHMS],
      repetitions,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    dataset: {
      schemaVersion: dataset.schemaVersion,
      generatorVersion: dataset.generatorVersion,
      seed: dataset.seed,
      job: dataset.job,
      jobName: dataset.jobName,
      gameVersion: dataset.gameVersion,
      dataVersion: dataset.dataVersion,
      parameterVersion: dataset.parameterVersion,
      minItemLevel: dataset.minItemLevel,
      maxItemLevel: dataset.maxItemLevel,
      cases: dataset.variants.map((variant) => ({
        caseId: variant.caseId,
        caseIndex: variant.caseIndex,
        size: variant.size,
        targetGcd: variant.targetGcd,
        candidateIdsBySlot: variant.candidateIdsBySlot,
        candidateCountsBySlot: variant.candidateCountsBySlot,
        foodIds: variant.foodIds,
        inputChecksum: variant.inputChecksum,
        totalCandidates: Object.values(variant.candidateCountsBySlot).reduce(
          (sum, value) => sum + value,
          0,
        ),
      })),
    },
    samples,
    aggregates: aggregateSamples(samples, [...BENCHMARK_ALGORITHMS]),
  };
}

function readError(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason);
}
