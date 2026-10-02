/** Responsive charts retain exact values and keyboard-accessible slice inspection. */
import { useState, type CSSProperties, type ReactNode } from "react";
import { mentorBarScale, mentorPieSlices } from "../utils/chartGeometry";

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
}: {
  rows: MentorChartRow[];
  title: string;
  distribution?: boolean;
  /** Limit ranked bars without removing categories from the pie denominator. */
  barLimit?: number;
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
    <div className="mentor-chart">
      {distribution && (
        <div
          className="mentor-chart-mode"
          role="group"
          aria-label={`${title}图表类型`}
        >
          <button
            type="button"
            aria-pressed={mode === "pie"}
            onClick={() => setMode("pie")}
          >
            饼图
          </button>
          <button
            type="button"
            aria-pressed={mode === "bar"}
            onClick={() => setMode("bar")}
          >
            条形图
          </button>
        </div>
      )}
      {total === 0 ? (
        <p className="mentor-chart-empty">当前筛选范围内暂无数据。</p>
      ) : mode === "pie" ? (
        <>
          <div className="mentor-pie-layout">
            <svg
              className="mentor-pie"
              viewBox="0 0 200 200"
              role="group"
              aria-label={`${title}饼图`}
            >
              {rows.map(
                (row, index) =>
                  slices[index] && (
                    <path
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
            <ul className="mentor-chart-legend">
              {rows.map((row, index) => (
                <li key={row.key}>
                  <button
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
                      className="mentor-chart-swatch"
                      style={{ background: color(row, index) }}
                      aria-hidden="true"
                    />
                    <span className="mentor-chart-name">
                      {row.label ?? row.name}
                    </span>
                    <span className="mentor-chart-value">
                      {row.count} 次<small>{percent(row.count / total)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="mentor-chart-readout" role="status">
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
          <div className="mentor-chart-axis" aria-hidden="true">
            {scale.ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <ol className="mentor-chart-bars">
            {barRows.map((row, index) => (
              <li key={row.key}>
                <div className="mentor-ranking-label">
                  <span>{row.label ?? row.name}</span>
                  <span>
                    {row.count} 次
                    {distribution && ` · ${percent(row.count / total)}`}
                  </span>
                </div>
                <div
                  className="mentor-chart-bar-track"
                  style={
                    {
                      "--mentor-chart-ticks": scale.ticks.length - 1,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  <span
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
