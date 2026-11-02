/** Responsive charts retain exact values and keyboard-accessible slice inspection. */

import clsx from "clsx";

import { useState, type CSSProperties, type ReactNode } from "react";
import { mentorBarScale, mentorPieSlices } from "../utils/chartGeometry";

/** Complete utility strings are shared without adding component CSS rules. */
const chartRangeButtonClasses =
  "disabled:opacity-55 inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-3 py-1.5 text-[13px] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed aria-pressed:border-accent aria-pressed:bg-selected aria-pressed:font-semibold aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11";
const chartLegendValueClasses =
  "first:min-w-0 first:[overflow-wrap:anywhere] last:flex-none last:tabular-nums";

/** Reused presentation strings stay static and are allocated once for this module. */

export type MentorChartRow = {
  key: string;
  name: string;
  count: number;
  label?: ReactNode;
  color?: string;
};
const percent = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
export function MentorChart({
  rows,
  title,
  distribution = false,
  barLimit,
  layout,
}: {
  rows: MentorChartRow[];
  title: string;
  distribution?: boolean;
  /** Limit ranked bars without removing categories from the pie denominator. */
  barLimit?: number;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "analysis-types";
}) {
  const [mode, setMode] = useState<"pie" | "bar">(distribution ? "pie" : "bar");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const active = rows.find((row) => row.key === (hovered ?? selected));
  const slices = mentorPieSlices(rows.map((row) => row.count));
  const barRows = barLimit ? rows.slice(0, barLimit) : rows;
  const scale = mentorBarScale(Math.max(0, ...barRows.map((row) => row.count)));
  const color = (row: MentorChartRow, index: number) =>
    row.color ?? `var(--mentor-chart-${(index % 6) + 1})`;
  const description = (row: MentorChartRow) =>
    `${row.name}：${row.count} 次${distribution && total ? `，${percent(row.count / total)}` : ""}`;
  return (
    <div className="mentor-chart mt-4">
      {distribution && (
        <div
          className="mentor-chart-mode mb-4 flex gap-1.5"
          role="group"
          aria-label={`${title}图表类型`}
        >
          <button
            className={chartRangeButtonClasses}
            type="button"
            aria-pressed={mode === "pie"}
            onClick={() => setMode("pie")}
          >
            饼图
          </button>
          <button
            className={chartRangeButtonClasses}
            type="button"
            aria-pressed={mode === "bar"}
            onClick={() => setMode("bar")}
          >
            条形图
          </button>
        </div>
      )}
      {total === 0 ? (
        <p className="mentor-chart-empty mx-0 mt-3 mb-0 min-h-[1.6em] text-[13px] text-muted">
          当前筛选范围内暂无数据。
        </p>
      ) : mode === "pie" ? (
        <>
          <div
            className={clsx(
              "mentor-pie-layout grid grid-cols-[160px_minmax(0,_1fr)] items-center gap-5 max-[1000px]:grid-cols-[1fr]",
              layout === "analysis-types" &&
                "grid-cols-[220px_minmax(0,_1fr)] gap-8 max-[1000px]:grid-cols-[180px_minmax(0,_1fr)] max-[600px]:grid-cols-[1fr] max-[600px]:gap-4",
            )}
          >
            <svg
              className="mentor-pie block h-auto w-full overflow-visible max-[1000px]:[margin-inline:auto] max-[1000px]:max-w-45"
              viewBox="0 0 200 200"
              role="group"
              aria-label={`${title}饼图`}
            >
              {rows.map(
                (row, index) =>
                  slices[index] && (
                    <path
                      className="[stroke:var(--ors-color-canvas)] [stroke-width:1.5px] focus-visible:[stroke:var(--ors-color-text)] focus-visible:[stroke-width:3px] focus-visible:[outline:none]"
                      key={row.key}
                      d={slices[index]!}
                      fill={color(row, index)}
                      tabIndex={0}
                      role="img"
                      aria-label={description(row)}
                      style={{
                        opacity: active && active.key !== row.key ? 0.45 : 1,
                      }}
                      onMouseEnter={() => setHovered(row.key)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(row.key)}
                      onBlur={() => setHovered(null)}
                    >
                      <title>{description(row)}</title>
                    </path>
                  ),
              )}
            </svg>
            <ul
              className={clsx(
                "mentor-chart-legend m-0 grid max-h-60 min-w-0 [scrollbar-width:thin] [scrollbar-color:var(--ors-color-muted)_transparent] [scrollbar-gutter:stable] list-none gap-1 overflow-y-auto py-0.5 pr-1.5 pl-0.5",
                layout === "analysis-types" &&
                  "grid-cols-2 gap-x-6 max-[1000px]:grid-cols-[1fr]",
              )}
            >
              {rows.map((row, index) => (
                <li key={row.key}>
                  <button
                    className="grid min-h-10 w-full grid-cols-[10px_minmax(0,_1fr)_auto] items-center justify-center gap-2 rounded-sm border-0 border-control bg-transparent px-1 py-2 text-left text-[13px] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-55 aria-pressed:bg-hover pointer-coarse:min-h-11"
                    type="button"
                    aria-pressed={selected === row.key}
                    aria-label={description(row)}
                    onClick={() =>
                      setSelected(selected === row.key ? null : row.key)
                    }
                    onMouseEnter={() => setHovered(row.key)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(row.key)}
                    onBlur={() => setHovered(null)}
                  >
                    <span
                      className="mentor-chart-swatch h-2.5 w-2.5 rounded-[2px]"
                      style={{
                        background: color(row, index),
                      }}
                      aria-hidden="true"
                    />
                    <span className="mentor-chart-name min-w-0 [overflow-wrap:anywhere]">
                      {row.label ?? row.name}
                    </span>
                    <span className="mentor-chart-value text-right whitespace-nowrap tabular-nums">
                      {row.count} 次
                      <small className="block text-muted">
                        {percent(row.count / total)}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p
            className="mentor-chart-readout mx-0 mt-3 mb-0 min-h-[1.6em] text-[13px] text-muted"
            role="status"
          >
            {active
              ? description(active)
              : `共 ${total} 次 · 可选择图例查看数据`}
          </p>
        </>
      ) : (
        <div
          className="mentor-bar-chart"
          role="group"
          aria-label={`${title}条形图`}
        >
          <div
            className="mentor-chart-axis flex justify-between text-xs text-muted tabular-nums"
            aria-hidden="true"
          >
            {scale.ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <ol className="mentor-chart-bars mx-0 mt-3 mb-0 grid list-none gap-4.5 p-0">
            {barRows.map((row, index) => (
              <li key={row.key}>
                <div className="mentor-ranking-label mb-1.5 flex items-center justify-between gap-3.5 text-sm">
                  <span className={chartLegendValueClasses}>
                    {row.label ?? row.name}
                  </span>
                  <span className={chartLegendValueClasses}>
                    {row.count} 次
                    {distribution && ` · ${percent(row.count / total)}`}
                  </span>
                </div>
                <div
                  className="mentor-chart-bar-track h-4 border-r border-solid border-line bg-[repeating-linear-gradient(_to_right,_var(--ors-color-line)_0_1px,_transparent_1px_100%_)] [background-size:calc(100%_/_var(--mentor-chart-ticks))_100%]"
                  style={
                    {
                      "--mentor-chart-ticks": scale.ticks.length - 1,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-[0_3px_3px_0]"
                    style={{
                      width: `${(row.count / scale.limit) * 100}%`,
                      background: color(row, index),
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
