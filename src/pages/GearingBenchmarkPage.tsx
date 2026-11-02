/** Debug-only benchmark workspace for seeded real-catalog solver measurements. */
import clsx from "clsx";
import {
  ArrowLeft,
  CheckCircle,
  DiceFive,
  DownloadSimple,
  Gauge,
  Play,
  Stop,
} from "@phosphor-icons/react";
import { useGearingBenchmark } from "../features/gearing/benchmark/useGearingBenchmark";
import {
  algorithmNames,
  BENCHMARK_SIZES,
  type BenchmarkAggregate,
} from "../features/gearing/benchmark/types";

/** Reused presentation strings stay static and are allocated once for this module. */
const benchmarkSectionHeadingClasses =
  "mx-0 mt-0 mb-[3px] text-lg font-semibold";
const benchmarkFieldClasses =
  "grid content-start gap-[7px] text-[13px] font-semibold text-muted";
const benchmarkInputClasses =
  "min-h-9 pointer-coarse:min-h-11 w-full rounded-control border border-solid border-control bg-canvas px-2.5 py-[7px] text-ink";
const benchmarkColumnHeadingClasses =
  "border-b border-solid border-line px-3.5 py-3 text-right text-xs font-semibold text-muted [&:is(th,_td)]:first:text-left";
const benchmarkCellClasses =
  "border-b border-solid border-line px-3.5 py-3 text-right [&:is(th,_td)]:[border-bottom:0] [&:is(th,_td)]:first:text-left";

export function GearingBenchmarkPage({ onBack }: { onBack: () => void }) {
  const benchmark = useGearingBenchmark();
  const totalCandidates = benchmark.dataset?.variants
    .filter((variant) => variant.caseIndex === 0)
    .map((variant) => ({
      size: variant.size,
      total: Object.values(variant.candidateCountsBySlot).reduce(
        (sum, value) => sum + value,
        0,
      ),
    }));
  return (
    <main className="gearing-benchmark mx-auto grid w-full max-w-295 gap-7 px-5 py-5 [font-variant-numeric:tabular-nums_lining-nums] max-[899px]:px-4 max-[899px]:py-4 max-[680px]:gap-5.5 max-[519px]:px-3 max-[519px]:py-4">
      <header className="benchmark-heading flex items-end justify-between gap-6 border-b border-solid border-line pb-5.5 max-[680px]:flex-col max-[680px]:items-start max-[680px]:gap-3.5">
        <div>
          <button
            className="benchmark-back inline-flex min-h-auto! items-center gap-[7px] border-0 bg-transparent p-0 text-[13px] font-semibold text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:text-accent-hover"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            返回配装
          </button>
          <h1 className="mx-0 mt-3.5 mb-[3px] text-2xl font-bold tracking-tight text-tool">
            配装 Benchmark
          </h1>
          <p className="m-0 text-muted">
            使用当前真实装备目录，测量完整配装算法的耗时与结果一致性。
          </p>
        </div>
        <div
          className="benchmark-runtime flex max-w-[44ch] items-center gap-[9px] text-right text-[13px] text-muted max-[680px]:text-left"
          aria-label="运行环境"
        >
          <Gauge className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          {benchmark.info ? (
            <span>
              {benchmark.info.operatingSystem} · {benchmark.info.architecture} ·{" "}
              {benchmark.info.logicalCpus} 逻辑核
            </span>
          ) : (
            <span>正在读取 Debug 运行环境…</span>
          )}
        </div>
      </header>

      <section
        className="benchmark-console @container/benchmark grid min-w-0 gap-6 bg-surface p-6 [border-block:1px_solid_var(--ors-color-line)] max-[680px]:p-5 max-[519px]:[margin-inline:-16px] [@media(min-width:_520px)_and_(max-width:_680px)]:[margin-inline:-20px]"
        aria-labelledby="benchmark-config-title"
      >
        <div className="benchmark-console-title flex items-center justify-between gap-6 max-[680px]:flex-col max-[680px]:items-start max-[680px]:gap-3.5">
          <div>
            <h2
              className={benchmarkSectionHeadingClasses}
              id="benchmark-config-title"
            >
              测试配置
            </h2>
            <p className="m-0 text-muted">
              相同数据版本和种子会生成相同的真实装备集合。
            </p>
          </div>
          <span className="benchmark-algorithm shrink-0 rounded-full bg-selected px-2.5 py-[5px] text-xs font-bold text-accent">
            算法 · 当前配装算法
          </span>
        </div>
        <div className="benchmark-fields grid min-w-0 grid-cols-1 gap-4 @min-[420px]/benchmark:grid-cols-2 @min-[700px]/benchmark:grid-cols-[minmax(280px,_1.7fr)_repeat(3,_minmax(120px,_0.7fr))]">
          <label className="benchmark-seed-field col-span-full grid min-w-0 content-start gap-[7px] text-[13px] font-semibold text-muted @min-[700px]/benchmark:col-span-1">
            种子
            <span className="grid grid-cols-[minmax(0,_1fr)_auto] max-[430px]:grid-cols-[1fr] max-[430px]:gap-2">
              <input
                className="min-h-9 w-full rounded-[var(--ors-radius-control)_0_0_var(--ors-radius-control)] border border-solid border-control bg-canvas px-2.5 py-[7px] text-ink max-[430px]:rounded-control max-[430px]:border max-[430px]:border-solid max-[430px]:border-control pointer-coarse:min-h-11"
                value={benchmark.seed}
                maxLength={100}
                disabled={benchmark.running}
                onChange={(event) => benchmark.setSeed(event.target.value)}
              />
              <button
                className="inline-flex min-h-9 items-center gap-[7px] rounded-[0_var(--ors-radius-control)_var(--ors-radius-control)_0] border border-solid border-control bg-canvas px-3 py-0 text-[13px] whitespace-nowrap text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] [border-left:0] hover:bg-hover max-[430px]:justify-center max-[430px]:rounded-control max-[430px]:border max-[430px]:border-solid max-[430px]:border-control pointer-coarse:min-h-11"
                type="button"
                disabled={benchmark.running}
                onClick={benchmark.useRandomSeed}
              >
                <DiceFive className="h-[17px] w-[17px]" />
                随机种子
              </button>
            </span>
          </label>
          <label className={benchmarkFieldClasses}>
            职业
            <select
              className={benchmarkInputClasses}
              value={benchmark.job}
              disabled={benchmark.running}
              onChange={(event) => benchmark.setJob(event.target.value)}
            >
              {benchmark.jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
          </label>
          <label className={benchmarkFieldClasses}>
            随机用例
            <input
              className={benchmarkInputClasses}
              type="number"
              min={1}
              max={20}
              value={benchmark.caseCount}
              disabled={benchmark.running}
              onChange={(event) =>
                benchmark.setCaseCount(Number(event.target.value))
              }
            />
          </label>
          <label className={benchmarkFieldClasses}>
            每组次数
            <input
              className={benchmarkInputClasses}
              type="number"
              min={1}
              max={10}
              value={benchmark.repetitions}
              disabled={benchmark.running}
              onChange={(event) =>
                benchmark.setRepetitions(Number(event.target.value))
              }
            />
          </label>
        </div>

        <div
          className={
            'benchmark-scale-rail relative grid grid-cols-[repeat(4,_1fr)] gap-0 px-0 py-[5px] before:absolute before:top-[21px] before:right-[12.5%] before:left-[12.5%] before:h-px before:bg-line before:[content:""]'
          }
          aria-label="数据集规模"
        >
          {BENCHMARK_SIZES.map((size, index) => {
            const done = benchmark.samples.some(
              (sample) => sample.size === size,
            );
            const active = benchmark.progress.label.includes(`${size} 件/槽`);
            return (
              <div
                className={clsx(
                  "relative z-1 grid justify-items-center gap-[3px] text-muted",
                  active ? "is-active" : done ? "is-done" : "",
                )}
                key={size}
              >
                <span className="grid h-[33px] w-[33px] place-items-center rounded-[50%] border border-solid border-success bg-accent text-xs font-bold text-success shadow-[0_4px_12px_color-mix(in_srgb,_var(--ors-color-accent)_24%,_transparent)]">
                  {done ? (
                    <CheckCircle className="h-[19px] w-[19px]" weight="fill" />
                  ) : (
                    index + 1
                  )}
                </span>
                <strong className="mt-1 text-lg leading-[1] text-ink max-[430px]:text-base">
                  {size}
                </strong>
                <small className="text-[0.6875rem]">件 / 槽</small>
              </div>
            );
          })}
        </div>

        {benchmark.dataset && totalCandidates && (
          <div className="benchmark-dataset-proof flex flex-wrap gap-[7px_18px] border-t border-solid border-line pt-4 text-xs text-muted">
            <span>
              Catalog {benchmark.dataset.gameVersion} · 数据{" "}
              {shortVersion(benchmark.dataset.dataVersion)}
            </span>
            <span>
              品级 {benchmark.dataset.minItemLevel}–
              {benchmark.dataset.maxItemLevel}
            </span>
            {totalCandidates.map((value) => (
              <span key={value.size}>
                {value.size} 档共 {value.total} 个真实候选
              </span>
            ))}
          </div>
        )}

        <div className="benchmark-actions flex items-center justify-end gap-6 max-[680px]:grid max-[680px]:grid-cols-[1fr_1fr] max-[680px]:gap-2.5">
          <button
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-4 py-0 font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] first:hover:bg-hover pointer-coarse:min-h-11"
            type="button"
            disabled={!benchmark.info || benchmark.running}
            onClick={() => benchmark.generate()}
          >
            生成用例
          </button>
          {benchmark.running ? (
            <button
              className="benchmark-stop inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-4 py-0 font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] first:hover:bg-hover pointer-coarse:min-h-11"
              type="button"
              onClick={benchmark.stop}
            >
              <Stop className="h-[17px] w-[17px]" weight="fill" />
              停止测试
            </button>
          ) : (
            <button
              className="benchmark-primary inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-4 py-0 font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-accent-hover first:hover:bg-hover pointer-coarse:min-h-11"
              type="button"
              disabled={!benchmark.info}
              onClick={() => void benchmark.run()}
            >
              <Play className="h-[17px] w-[17px]" weight="fill" />
              运行 Benchmark
            </button>
          )}
        </div>
      </section>

      {(benchmark.running || benchmark.progress.completed > 0) && (
        <section className="benchmark-progress grid gap-2" aria-live="polite">
          <div className="flex items-center justify-between gap-6">
            <strong>{benchmark.progress.label}</strong>
            <span className="text-muted">
              {benchmark.progress.completed} / {benchmark.progress.total}
            </span>
          </div>
          <progress
            className="h-[7px] w-full border-0"
            value={benchmark.progress.completed}
            max={benchmark.progress.total || 1}
          />
        </section>
      )}

      {benchmark.error && (
        <p
          className="benchmark-error m-0 rounded-control border border-solid border-danger bg-surface px-3.5 py-3 text-danger"
          role="alert"
        >
          {benchmark.error}
        </p>
      )}

      {benchmark.result && (
        <section
          className="benchmark-results grid gap-5.5"
          aria-labelledby="benchmark-results-title"
        >
          <div className="benchmark-results-heading flex items-center justify-between gap-6 max-[680px]:flex-col max-[680px]:items-start max-[680px]:gap-3.5">
            <div>
              <h2
                className={benchmarkSectionHeadingClasses}
                id="benchmark-results-title"
              >
                本次结果
              </h2>
              <p className="m-0 text-muted">
                计时只包含原生求解；内存按 5ms 间隔采样原生进程 RSS。
              </p>
            </div>
            <button
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-4 py-0 font-semibold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover max-[680px]:w-full pointer-coarse:min-h-11"
              type="button"
              disabled={!!benchmark.exportedPath}
              onClick={() => void benchmark.exportResult()}
            >
              <DownloadSimple className="h-[17px] w-[17px]" />
              {benchmark.exportedPath ? "已导出" : "导出本次结果"}
            </button>
          </div>
          <TimingChart rows={benchmark.result.aggregates} />
          <MemoryTable rows={benchmark.result.aggregates} />
          <ResultTable rows={benchmark.result.aggregates} />
          {benchmark.exportedPath && (
            <p className="benchmark-export-path mx-0 mt-[-8px] mb-0 text-[13px] [overflow-wrap:anywhere] text-success">
              已保存到 {benchmark.exportedPath}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
function MemoryTable({ rows }: { rows: BenchmarkAggregate[] }) {
  return (
    <section
      className="benchmark-memory grid gap-3"
      aria-labelledby="benchmark-memory-title"
    >
      <div>
        <h3 className="m-0 text-base font-semibold" id="benchmark-memory-title">
          原生进程内存
        </h3>
        <p className="mx-0 mt-[3px] mb-0 text-[13px] text-muted">
          峰值增量用于比较算法成本；结束增量用于发现未释放的常驻内存。
        </p>
      </div>
      <div className="benchmark-table-wrap overflow-x-auto [border-block:1px_solid_var(--ors-color-line)]">
        <table className="w-full [border-collapse:collapse] whitespace-nowrap">
          <thead>
            <tr>
              <th className={benchmarkColumnHeadingClasses}>规模</th>
              <th className={benchmarkColumnHeadingClasses}>基线 RSS</th>
              <th className={benchmarkColumnHeadingClasses}>峰值 RSS</th>
              <th className={benchmarkColumnHeadingClasses}>峰值增量</th>
              <th className={benchmarkColumnHeadingClasses}>P95 峰值增量</th>
              <th className={benchmarkColumnHeadingClasses}>结束 RSS</th>
              <th className={benchmarkColumnHeadingClasses}>结束增量</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.algorithm}-${row.size}`}>
                <th className={benchmarkCellClasses}>{row.size} 件 / 槽</th>
                <td className={benchmarkCellClasses}>
                  {formatBytes(row.medianBeforeBytes)}
                </td>
                <td className={benchmarkCellClasses}>
                  {formatBytes(row.medianPeakBytes)}
                </td>
                <td className={benchmarkCellClasses}>
                  {formatBytes(row.medianPeakDeltaBytes)}
                </td>
                <td className={benchmarkCellClasses}>
                  {formatBytes(row.p95PeakDeltaBytes)}
                </td>
                <td className={benchmarkCellClasses}>
                  {formatBytes(row.medianAfterBytes)}
                </td>
                <td className={benchmarkCellClasses}>
                  {formatSignedBytes(row.medianRetainedDeltaBytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function TimingChart({ rows }: { rows: BenchmarkAggregate[] }) {
  const plotted = rows.filter((row) => row.medianMs !== null);
  const maximum = Math.max(1, ...plotted.map((row) => row.medianMs ?? 0));
  const points = plotted.map((row, index) => {
    const x = 52 + index * (416 / Math.max(1, BENCHMARK_SIZES.length - 1));
    const y = 174 - ((row.medianMs ?? 0) / maximum) * 130;
    return {
      ...row,
      x,
      y,
    };
  });
  return (
    <figure className="benchmark-chart m-0 rounded-panel border border-solid border-line bg-surface px-6 pt-5 pb-3">
      <figcaption className="font-semibold">规模与中位耗时</figcaption>
      <svg
        className="mt-2.5 block max-h-65 w-full overflow-visible"
        viewBox="0 0 520 210"
        role="img"
        aria-label="不同候选规模的中位求解耗时曲线"
      >
        <path
          className="benchmark-chart-axis [fill:none] [stroke:var(--ors-color-line)] [stroke-width:1]"
          d="M52 26V174H480"
        />
        <path
          className="benchmark-chart-line [fill:none] [stroke:var(--ors-color-accent)] [stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round]"
          d={points
            .map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`)
            .join(" ")}
        />
        {points.map((point) => (
          <g key={point.size}>
            <circle
              className="[fill:var(--ors-color-surface)] [stroke:var(--ors-color-accent)] [stroke-width:3]"
              cx={point.x}
              cy={point.y}
              r="5"
            />
            <text
              className="[fill:var(--ors-color-muted)] font-sans text-[11px]"
              x={point.x}
              y="198"
              textAnchor="middle"
            >
              {point.size}
            </text>
            <text
              className="[fill:var(--ors-color-muted)] font-sans text-[11px]"
              x={point.x}
              y={Math.max(18, point.y - 11)}
              textAnchor="middle"
            >
              {formatDuration(point.medianMs)}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
function ResultTable({ rows }: { rows: BenchmarkAggregate[] }) {
  return (
    <div className="benchmark-table-wrap overflow-x-auto [border-block:1px_solid_var(--ors-color-line)]">
      <table className="w-full [border-collapse:collapse] whitespace-nowrap">
        <thead>
          <tr>
            <th className={benchmarkColumnHeadingClasses}>算法</th>
            <th className={benchmarkColumnHeadingClasses}>规模</th>
            <th className={benchmarkColumnHeadingClasses}>Median</th>
            <th className={benchmarkColumnHeadingClasses}>P95</th>
            <th className={benchmarkColumnHeadingClasses}>完成率</th>
            <th className={benchmarkColumnHeadingClasses}>准确率</th>
            <th className={benchmarkColumnHeadingClasses}>最佳命中率</th>
            <th className={benchmarkColumnHeadingClasses}>平均 Gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.algorithm}-${row.size}`}>
              <th className={benchmarkCellClasses}>
                {algorithmNames[row.algorithm]}
              </th>
              <td className={benchmarkCellClasses}>{row.size} 件 / 槽</td>
              <td className={benchmarkCellClasses}>
                {formatDuration(row.medianMs)}
              </td>
              <td className={benchmarkCellClasses}>
                {formatDuration(row.p95Ms)}
              </td>
              <td className={benchmarkCellClasses}>
                {formatPercent(row.completionRate)}
              </td>
              <td className={benchmarkCellClasses}>
                {formatPercent(row.validRate)}
              </td>
              <td className={benchmarkCellClasses}>
                {row.optimalHitRate === null
                  ? "N/A"
                  : formatPercent(row.optimalHitRate)}
              </td>
              <td className={benchmarkCellClasses}>
                {row.meanGap === null ? "N/A" : formatPercent(row.meanGap)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function formatDuration(value: number | null) {
  if (value === null) return "—";
  return value < 1000
    ? `${value.toFixed(1)} ms`
    : `${(value / 1000).toFixed(2)} s`;
}
function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
function formatBytes(value: number | null) {
  if (value === null) return "N/A";
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
function formatSignedBytes(value: number | null) {
  if (value === null) return "N/A";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value / 1024 / 1024).toFixed(1)} MB`;
}
function shortVersion(value: string) {
  return value.length > 10 ? value.slice(0, 10) : value;
}
