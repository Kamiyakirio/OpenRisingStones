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
    <main
      className={
        "mx-auto w-full px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 gearing-benchmark grid gap-[28px] max-w-[1180px] max-[680px]:gap-[22px] [&&&&]:[font-variant-numeric:tabular-nums_lining-nums]"
      }
    >
      <header
        className={
          "benchmark-heading [&_h1]:text-tool flex justify-between gap-[24px] items-end pb-[22px] border-b border-solid border-line [&_p]:m-0 [&_p]:text-muted max-[680px]:items-start max-[680px]:flex-col max-[680px]:gap-[14px] [&&&&_h1]:m-[14px_0_3px]"
        }
      >
        <div>
          <button
            className={
              "benchmark-back inline-flex items-center gap-[7px] p-0 border-0 text-accent text-[13px] font-semibold [&:hover]:text-accent-hover [&_svg]:w-[16px] [&_svg]:h-[16px] [&&&&]:min-h-[auto]! [&&&&]:[background:transparent]"
            }
            type="button"
            onClick={onBack}
          >
            <ArrowLeft />
            返回配装
          </button>
          <h1 className="text-2xl font-bold tracking-tight">配装 Benchmark</h1>
          <p>使用当前真实装备目录，测量完整配装算法的耗时与结果一致性。</p>
        </div>
        <div
          className={
            "benchmark-runtime flex items-center gap-[9px] text-muted text-[13px] text-right [&_svg]:w-[20px] [&_svg]:h-[20px] [&_svg]:text-accent max-[680px]:text-left [&&&&]:max-w-[44ch] [&&&&_svg]:flex-[0_0_auto]"
          }
          aria-label="运行环境"
        >
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
        className={
          "benchmark-console grid gap-[24px] p-[24px] bg-surface max-[680px]:p-[20px] [&&&&]:[border-block:1px_solid_var(--ors-color-line)] [&&&&_h2]:m-[0_0_3px] [@media(min-width:_520px)_and_(max-width:_680px)]:[&&&&]:[margin-inline:-20px] [@media(max-width:_519px)]:[&&&&]:[margin-inline:-16px]"
        }
        aria-labelledby="benchmark-config-title"
      >
        <div className="benchmark-console-title flex justify-between items-center gap-[24px] [&_p]:m-0 [&_p]:text-muted max-[680px]:items-start max-[680px]:flex-col max-[680px]:gap-[14px]">
          <div>
            <h2 className="text-lg font-semibold" id="benchmark-config-title">
              测试配置
            </h2>
            <p>相同数据版本和种子会生成相同的真实装备集合。</p>
          </div>
          <span
            className={
              "benchmark-algorithm rounded-[var(--ors-radius-pill)] text-accent bg-selected text-xs font-bold [&&&&]:flex-[0_0_auto] [&&&&]:p-[5px_10px]"
            }
          >
            算法 · 当前配装算法
          </span>
        </div>
        <div
          className={
            "benchmark-fields grid gap-[16px] [&_label]:grid [&_label]:gap-[7px] [&_label]:text-muted [&_label]:text-[13px] [&_label]:font-semibold [&_input]:w-full [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_select]:w-full [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[var(--ors-radius-control)] [&_select]:text-ink [&_select]:bg-canvas [&&&&]:grid-cols-[minmax(280px,_1.7fr)_repeat(3,_minmax(120px,_0.7fr))] [&&&&_label]:[align-content:start] [&&&&_input]:p-[7px_10px] [&&&&_select]:p-[7px_10px] [@media(min-width:_681px)_and_(max-width:_960px)]:[&&&&]:grid-cols-[2fr_repeat(3,_1fr)] [@media(min-width:_431px)_and_(max-width:_680px)]:[&&&&]:grid-cols-[1fr_1fr] [@media(max-width:_430px)]:[&&&&]:grid-cols-[1fr]"
          }
        >
          <label
            className={
              "benchmark-seed-field [&_>_span]:grid [&_button]:inline-flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:text-ink [&_button]:bg-canvas [&_button]:text-[13px] [&_button]:whitespace-nowrap [&_button:hover]:bg-hover [&_svg]:w-[17px] [&_svg]:h-[17px] max-[430px]:[&_>_span]:gap-[8px] max-[430px]:[&_input]:border max-[430px]:[&_input]:border-solid max-[430px]:[&_input]:border-control max-[430px]:[&_input]:rounded-[var(--ors-radius-control)] max-[430px]:[&_button]:border max-[430px]:[&_button]:border-solid max-[430px]:[&_button]:border-control max-[430px]:[&_button]:rounded-[var(--ors-radius-control)] max-[430px]:[&_button]:justify-center [&&&&_>_span]:grid-cols-[minmax(0,_1fr)_auto] [&&&&_input]:rounded-[var(--ors-radius-control)_0_0_var(--ors-radius-control)] [&&&&_button]:p-[0_12px] [&&&&_button]:[border-left:0] [&&&&_button]:rounded-[0_var(--ors-radius-control)_var(--ors-radius-control)_0] [@media(min-width:_431px)_and_(max-width:_960px)]:[&&&&]:[grid-column:1_/_-1] [@media(max-width:_430px)]:[&&&&]:[grid-column:auto] [@media(max-width:_430px)]:[&&&&_>_span]:grid-cols-[1fr]"
            }
          >
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

        <div
          className={
            'benchmark-scale-rail relative grid gap-0 [&::before]:absolute [&::before]:h-[1px] [&::before]:bg-line [&_>_div]:relative [&_>_div]:grid [&_>_div]:gap-[3px] [&_>_div]:text-muted [&_>_div_>_span]:grid [&_>_div_>_span]:place-items-center [&_>_div_>_span]:w-[33px] [&_>_div_>_span]:h-[33px] [&_>_div_>_span]:border [&_>_div_>_span]:border-solid [&_>_div_>_span]:border-control [&_>_div_>_span]:text-muted [&_>_div_>_span]:bg-surface [&_>_div_>_span]:text-xs [&_>_div_>_span]:font-bold [&_>_div_>_span_svg]:w-[19px] [&_>_div_>_span_svg]:h-[19px] [&_strong]:mt-[4px] [&_strong]:text-ink [&_strong]:text-lg max-[430px]:[&_strong]:text-base [&&&&]:grid-cols-[repeat(4,_1fr)] [&&&&]:p-[5px_0] [&&&&::before]:top-[21px] [&&&&::before]:right-[12.5%] [&&&&::before]:left-[12.5%] [&&&&::before]:[content:""] [&&&&_>_div]:z-[1] [&&&&_>_div]:[justify-items:center] [&&&&_>_div_>_span]:rounded-[50%] [&&&&_strong]:leading-[1] [&&&&_small]:text-[0.6875rem]'
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
                className={
                  active
                    ? "is-active [.benchmark-scale-rail_>_&_>_span]:border-accent [.benchmark-scale-rail_>_&_>_span]:text-on-accent [.benchmark-scale-rail_>_&_>_span]:bg-accent [.gear-equipped-row&]:bg-selected [.teleport-mode-switch_button&]:border-line [.teleport-mode-switch_button&]:text-accent [.teleport-mode-switch_button&]:bg-surface [.benchmark-scale-rail_>_&&&&_>_span]:shadow-[0_4px_12px_color-mix(in_srgb,_var(--ors-color-accent)_24%,_transparent)] [.teleport-mode-switch_button&&&&]:shadow-[none]"
                    : done
                      ? "is-done [.benchmark-scale-rail_>_&_>_span]:border-success [.benchmark-scale-rail_>_&_>_span]:text-success"
                      : ""
                }
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
          <div
            className={
              "benchmark-dataset-proof flex flex-wrap pt-[16px] border-t border-solid border-line text-muted text-xs [&&&&]:gap-[7px_18px]"
            }
          >
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

        <div
          className={
            "benchmark-actions flex items-center gap-[24px] [&_>_button:first-child:hover]:bg-hover [&_svg]:w-[17px] [&_svg]:h-[17px] justify-end [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[8px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:font-semibold max-[680px]:grid max-[680px]:gap-[10px] [&&&&_button]:p-[0_16px] [@media(max-width:_680px)]:[&&&&]:grid-cols-[1fr_1fr]"
          }
        >
          <button
            type="button"
            disabled={!benchmark.info || benchmark.running}
            onClick={() => benchmark.generate()}
          >
            生成用例
          </button>
          {benchmark.running ? (
            <button
              className="benchmark-stop [.benchmark-actions_&]:border-danger [.benchmark-actions_&]:text-danger"
              type="button"
              onClick={benchmark.stop}
            >
              <Stop weight="fill" />
              停止测试
            </button>
          ) : (
            <button
              className="benchmark-primary [.benchmark-actions_&]:border-accent [.benchmark-actions_&]:text-on-accent [.benchmark-actions_&]:bg-accent [.benchmark-actions_&:hover]:bg-accent-hover"
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
        <section
          className="benchmark-progress [&_>_div]:flex [&_>_div]:justify-between [&_>_div]:items-center [&_>_div]:gap-[24px] grid gap-[8px] [&_span]:text-muted [&_progress]:w-full [&_progress]:h-[7px] [&_progress]:border-0"
          aria-live="polite"
        >
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
        <p
          className={
            "benchmark-error m-0 border border-solid border-danger rounded-[var(--ors-radius-control)] text-danger bg-surface [&&&&]:p-[12px_14px]"
          }
          role="alert"
        >
          {benchmark.error}
        </p>
      )}

      {benchmark.result && (
        <section
          className={"benchmark-results grid gap-[22px] [&&&&_h2]:m-[0_0_3px]"}
          aria-labelledby="benchmark-results-title"
        >
          <div
            className={
              "benchmark-results-heading flex justify-between items-center gap-[24px] [&_p]:m-0 [&_p]:text-muted [&_button:hover]:bg-hover [&_svg]:w-[17px] [&_svg]:h-[17px] [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[8px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:font-semibold max-[680px]:items-start max-[680px]:flex-col max-[680px]:gap-[14px] max-[680px]:[&_button]:w-full [&&&&_button]:p-[0_16px]"
            }
          >
            <div>
              <h2
                className="text-lg font-semibold"
                id="benchmark-results-title"
              >
                本次结果
              </h2>
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
            <p
              className={
                "benchmark-export-path text-success text-[13px] [&&&&]:m-[-8px_0_0] [&&&&]:[overflow-wrap:anywhere]"
              }
            >
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
      className={
        "benchmark-memory grid gap-[12px] [&_h3]:m-0 [&_p]:text-muted [&_p]:text-[13px] [&&&&_p]:m-[3px_0_0]"
      }
      aria-labelledby="benchmark-memory-title"
    >
      <div>
        <h3 className="text-base font-semibold" id="benchmark-memory-title">
          原生进程内存
        </h3>
        <p>峰值增量用于比较算法成本；结束增量用于发现未释放的常驻内存。</p>
      </div>
      <div
        className={
          "benchmark-table-wrap overflow-x-auto [&_table]:w-full [&_table]:whitespace-nowrap [&_th]:border-b [&_th]:border-solid [&_th]:border-line [&_th]:text-right [&_td]:border-b [&_td]:border-solid [&_td]:border-line [&_td]:text-right [&_thead_th]:text-muted [&_thead_th]:text-xs [&_thead_th]:font-semibold [&_:is(th,_td):first-child]:text-left [&&&&]:[border-block:1px_solid_var(--ors-color-line)] [&&&&_table]:[border-collapse:collapse] [&&&&_th]:p-[12px_14px] [&&&&_td]:p-[12px_14px] [&&&&_tbody_tr:last-child_:is(th,_td)]:[border-bottom:0]"
        }
      >
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
    <figure
      className={
        "benchmark-chart m-0 border border-solid border-line rounded-[var(--ors-radius-panel)] bg-surface [&_figcaption]:font-semibold [&_svg]:block [&_svg]:w-full [&_svg]:max-h-[260px] [&_svg]:mt-[10px] [&_svg]:overflow-visible [&&&&]:p-[20px_24px_12px] [&&&&_circle]:[fill:var(--ors-color-surface)] [&&&&_circle]:[stroke:var(--ors-color-accent)] [&&&&_circle]:[stroke-width:3] [&&&&_text]:[fill:var(--ors-color-muted)] [&&&&_text]:[font-family:var(--ors-font-ui)] [&&&&_text]:text-[11px]"
      }
    >
      <figcaption>规模与中位耗时</figcaption>
      <svg
        viewBox="0 0 520 210"
        role="img"
        aria-label="不同候选规模的中位求解耗时曲线"
      >
        <path
          className={
            "benchmark-chart-axis [&&&&]:[fill:none] [&&&&]:[stroke:var(--ors-color-line)] [&&&&]:[stroke-width:1]"
          }
          d="M52 26V174H480"
        />
        <path
          className={
            "benchmark-chart-line [&&&&]:[fill:none] [&&&&]:[stroke:var(--ors-color-accent)] [&&&&]:[stroke-linecap:round] [&&&&]:[stroke-linejoin:round] [&&&&]:[stroke-width:3]"
          }
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
    <div
      className={
        "benchmark-table-wrap overflow-x-auto [&_table]:w-full [&_table]:whitespace-nowrap [&_th]:border-b [&_th]:border-solid [&_th]:border-line [&_th]:text-right [&_td]:border-b [&_td]:border-solid [&_td]:border-line [&_td]:text-right [&_thead_th]:text-muted [&_thead_th]:text-xs [&_thead_th]:font-semibold [&_:is(th,_td):first-child]:text-left [&&&&]:[border-block:1px_solid_var(--ors-color-line)] [&&&&_table]:[border-collapse:collapse] [&&&&_th]:p-[12px_14px] [&&&&_td]:p-[12px_14px] [&&&&_tbody_tr:last-child_:is(th,_td)]:[border-bottom:0]"
      }
    >
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
