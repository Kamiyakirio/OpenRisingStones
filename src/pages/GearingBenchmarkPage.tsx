/** Debug-only benchmark workspace for seeded real-catalog solver measurements. */
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
import "../features/gearing/benchmark/benchmark.css";

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
    <main className="gearing-benchmark">
      <header className="benchmark-heading">
        <div>
          <button className="benchmark-back" type="button" onClick={onBack}>
            <ArrowLeft />
            返回配装
          </button>
          <h1>配装 Benchmark</h1>
          <p>使用当前真实装备目录，测量完整配装算法的耗时与结果一致性。</p>
        </div>
        <div className="benchmark-runtime" aria-label="运行环境">
          <Gauge aria-hidden="true" />
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
        className="benchmark-console"
        aria-labelledby="benchmark-config-title"
      >
        <div className="benchmark-console-title">
          <div>
            <h2 id="benchmark-config-title">测试配置</h2>
            <p>相同数据版本和种子会生成相同的真实装备集合。</p>
          </div>
          <span className="benchmark-algorithm">算法 · 当前配装算法</span>
        </div>
        <div className="benchmark-fields">
          <label className="benchmark-seed-field">
            种子
            <span>
              <input
                value={benchmark.seed}
                maxLength={100}
                disabled={benchmark.running}
                onChange={(event) => benchmark.setSeed(event.target.value)}
              />
              <button
                type="button"
                disabled={benchmark.running}
                onClick={benchmark.useRandomSeed}
              >
                <DiceFive />
                随机种子
              </button>
            </span>
          </label>
          <label>
            职业
            <select
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
          <label>
            随机用例
            <input
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
          <label>
            每组次数
            <input
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

        <div className="benchmark-scale-rail" aria-label="数据集规模">
          {BENCHMARK_SIZES.map((size, index) => {
            const done = benchmark.samples.some(
              (sample) => sample.size === size,
            );
            const active = benchmark.progress.label.includes(`${size} 件/槽`);
            return (
              <div
                className={active ? "is-active" : done ? "is-done" : ""}
                key={size}
              >
                <span>{done ? <CheckCircle weight="fill" /> : index + 1}</span>
                <strong>{size}</strong>
                <small>件 / 槽</small>
              </div>
            );
          })}
        </div>

        {benchmark.dataset && totalCandidates && (
          <div className="benchmark-dataset-proof">
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

        <div className="benchmark-actions">
          <button
            type="button"
            disabled={!benchmark.info || benchmark.running}
            onClick={() => benchmark.generate()}
          >
            生成用例
          </button>
          {benchmark.running ? (
            <button
              className="benchmark-stop"
              type="button"
              onClick={benchmark.stop}
            >
              <Stop weight="fill" />
              停止测试
            </button>
          ) : (
            <button
              className="benchmark-primary"
              type="button"
              disabled={!benchmark.info}
              onClick={() => void benchmark.run()}
            >
              <Play weight="fill" />
              运行 Benchmark
            </button>
          )}
        </div>
      </section>

      {(benchmark.running || benchmark.progress.completed > 0) && (
        <section className="benchmark-progress" aria-live="polite">
          <div>
            <strong>{benchmark.progress.label}</strong>
            <span>
              {benchmark.progress.completed} / {benchmark.progress.total}
            </span>
          </div>
          <progress
            value={benchmark.progress.completed}
            max={benchmark.progress.total || 1}
          />
        </section>
      )}

      {benchmark.error && (
        <p className="benchmark-error" role="alert">
          {benchmark.error}
        </p>
      )}

      {benchmark.result && (
        <section
          className="benchmark-results"
          aria-labelledby="benchmark-results-title"
        >
          <div className="benchmark-results-heading">
            <div>
              <h2 id="benchmark-results-title">本次结果</h2>
              <p>计时只包含原生求解；内存按 5ms 间隔采样原生进程 RSS。</p>
            </div>
            <button
              type="button"
              disabled={!!benchmark.exportedPath}
              onClick={() => void benchmark.exportResult()}
            >
              <DownloadSimple />
              {benchmark.exportedPath ? "已导出" : "导出本次结果"}
            </button>
          </div>
          <TimingChart rows={benchmark.result.aggregates} />
          <MemoryTable rows={benchmark.result.aggregates} />
          <ResultTable rows={benchmark.result.aggregates} />
          {benchmark.exportedPath && (
            <p className="benchmark-export-path">
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
      className="benchmark-memory"
      aria-labelledby="benchmark-memory-title"
    >
      <div>
        <h3 id="benchmark-memory-title">原生进程内存</h3>
        <p>峰值增量用于比较算法成本；结束增量用于发现未释放的常驻内存。</p>
      </div>
      <div className="benchmark-table-wrap">
        <table>
          <thead>
            <tr>
              <th>规模</th>
              <th>基线 RSS</th>
              <th>峰值 RSS</th>
              <th>峰值增量</th>
              <th>P95 峰值增量</th>
              <th>结束 RSS</th>
              <th>结束增量</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.algorithm}-${row.size}`}>
                <th>{row.size} 件 / 槽</th>
                <td>{formatBytes(row.medianBeforeBytes)}</td>
                <td>{formatBytes(row.medianPeakBytes)}</td>
                <td>{formatBytes(row.medianPeakDeltaBytes)}</td>
                <td>{formatBytes(row.p95PeakDeltaBytes)}</td>
                <td>{formatBytes(row.medianAfterBytes)}</td>
                <td>{formatSignedBytes(row.medianRetainedDeltaBytes)}</td>
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
    return { ...row, x, y };
  });
  return (
    <figure className="benchmark-chart">
      <figcaption>规模与中位耗时</figcaption>
      <svg
        viewBox="0 0 520 210"
        role="img"
        aria-label="不同候选规模的中位求解耗时曲线"
      >
        <path className="benchmark-chart-axis" d="M52 26V174H480" />
        <path
          className="benchmark-chart-line"
          d={points
            .map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`)
            .join(" ")}
        />
        {points.map((point) => (
          <g key={point.size}>
            <circle cx={point.x} cy={point.y} r="5" />
            <text x={point.x} y="198" textAnchor="middle">
              {point.size}
            </text>
            <text
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
    <div className="benchmark-table-wrap">
      <table>
        <thead>
          <tr>
            <th>算法</th>
            <th>规模</th>
            <th>Median</th>
            <th>P95</th>
            <th>完成率</th>
            <th>准确率</th>
            <th>最佳命中率</th>
            <th>平均 Gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.algorithm}-${row.size}`}>
              <th>{algorithmNames[row.algorithm]}</th>
              <td>{row.size} 件 / 槽</td>
              <td>{formatDuration(row.medianMs)}</td>
              <td>{formatDuration(row.p95Ms)}</td>
              <td>{formatPercent(row.completionRate)}</td>
              <td>{formatPercent(row.validRate)}</td>
              <td>
                {row.optimalHitRate === null
                  ? "N/A"
                  : formatPercent(row.optimalHitRate)}
              </td>
              <td>
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
