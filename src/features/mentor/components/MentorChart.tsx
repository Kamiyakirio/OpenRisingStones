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
    <div className="mentor-chart mt-[16px]">
      {distribution && (
        <div
          className={
            'mentor-chart-mode flex gap-[6px] mb-[16px] [.mentor-page_&_button]:text-ink [.mentor-page_&_button]:text-[13px] [.mentor-page_&_button[aria-pressed=true]]:text-accent [.mentor-page_&_button[aria-pressed=true]]:border-accent [.mentor-page_&_button[aria-pressed=true]]:font-semibold [.mentor-page_&&&&_button]:p-[6px_12px] [.mentor-page_&&&&_button[aria-pressed="true"]]:[background:var(--accent-soft)]'
          }
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
        <p
          className={
            "mentor-chart-empty text-muted text-[13px] [&&&&]:m-[12px_0_0] [&&&&]:min-h-[1.6em]"
          }
        >
          当前筛选范围内暂无数据。
        </p>
      ) : mode === "pie" ? (
        <>
          <div
            className={
              "mentor-pie-layout grid items-center gap-[20px] [.mentor-analysis-types_&]:gap-[32px] max-[600px]:[.mentor-analysis-types_&]:gap-[16px] [&&&&]:grid-cols-[160px_minmax(0,_1fr)] [.mentor-analysis-types_&&&&]:grid-cols-[220px_minmax(0,_1fr)] [@media(max-width:_1000px)]:[&&&&]:grid-cols-[1fr] [@media(max-width:_1000px)]:[.mentor-analysis-types_&&&&]:grid-cols-[180px_minmax(0,_1fr)] [@media(max-width:_600px)]:[.mentor-analysis-types_&&&&]:grid-cols-[1fr]"
            }
          >
            <svg
              className={
                "mentor-pie block w-full overflow-visible max-[1000px]:max-w-[180px] [&&&&]:h-[auto] [&&&&_path]:[stroke:var(--paper)] [&&&&_path]:[stroke-width:1.5px] [&&&&_path:focus-visible]:[outline:none] [&&&&_path:focus-visible]:[stroke:var(--ink)] [&&&&_path:focus-visible]:[stroke-width:3px] [@media(max-width:_1000px)]:[&&&&]:[margin-inline:auto]"
              }
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
            <ul
              className={
                'mentor-chart-legend grid gap-[4px] min-w-0 max-h-[240px] overflow-y-auto m-0 [.mentor-analysis-types_&]:gap-x-[24px] [.mentor-page_&_button]:text-ink [.mentor-page_&_button]:grid [.mentor-page_&_button]:gap-[8px] [.mentor-page_&_button]:w-full [.mentor-page_&_button]:border-0 [.mentor-page_&_button]:rounded-[4px] [.mentor-page_&_button]:text-left [.mentor-page_&_button]:text-[13px] [&&&&]:[scrollbar-gutter:stable] [&&&&]:[scrollbar-width:thin] [&&&&]:[scrollbar-color:var(--muted)_transparent] [&&&&]:p-[2px_6px_2px_2px] [&&&&]:[list-style:none] [.mentor-analysis-types_&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [.mentor-page_&&&&_button]:grid-cols-[10px_minmax(0,_1fr)_auto] [.mentor-page_&&&&_button]:p-[8px_4px] [.mentor-page_&&&&_button]:[background:transparent] [.mentor-page_&&&&_button[aria-pressed="true"]]:[background:var(--surface-2)] [@media(max-width:_1000px)]:[.mentor-analysis-types_&&&&]:grid-cols-[1fr]'
              }
            >
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
                      className="mentor-chart-swatch w-[10px] h-[10px] rounded-[2px]"
                      style={{ background: color(row, index) }}
                      aria-hidden="true"
                    />
                    <span
                      className={
                        "mentor-chart-name min-w-0 [&&&&]:[overflow-wrap:anywhere]"
                      }
                    >
                      {row.label ?? row.name}
                    </span>
                    <span className="mentor-chart-value text-right tabular-nums whitespace-nowrap [&_small]:block [&_small]:text-muted">
                      {row.count} 次<small>{percent(row.count / total)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p
            className={
              "mentor-chart-readout text-muted text-[13px] [&&&&]:m-[12px_0_0] [&&&&]:min-h-[1.6em]"
            }
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
            className="mentor-chart-axis flex justify-between text-muted text-xs tabular-nums"
            aria-hidden="true"
          >
            {scale.ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <ol
            className={
              "mentor-chart-bars grid gap-[18px] p-0 [&&&&]:m-[12px_0_0] [&&&&]:[list-style:none]"
            }
          >
            {barRows.map((row, index) => (
              <li key={row.key}>
                <div
                  className={
                    "mentor-ranking-label [&_small]:ml-[6px] [&_small]:text-muted [&_small]:text-[13px] [&_small]:font-normal flex items-center justify-between gap-[14px] mb-[6px] text-sm [&_>_:first-child]:min-w-0 [&_>_:last-child]:tabular-nums [&&&&_>_:first-child]:[overflow-wrap:anywhere] [&&&&_>_:last-child]:flex-[none]"
                  }
                >
                  <span>{row.label ?? row.name}</span>
                  <span>
                    {row.count} 次
                    {distribution && ` · ${percent(row.count / total)}`}
                  </span>
                </div>
                <div
                  className={
                    "mentor-chart-bar-track h-[16px] border-r border-solid border-line [&_>_span]:block [&_>_span]:h-full [&&&&]:[background:repeating-linear-gradient(_to_right,_var(--line)_0_1px,_transparent_1px_100%_)] [&&&&]:[background-size:calc(100%_/_var(--mentor-chart-ticks))_100%] [&&&&_>_span]:rounded-[0_3px_3px_0]"
                  }
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
