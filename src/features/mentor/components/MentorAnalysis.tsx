/** Filterable ledger analysis with explicit sample sizes and readable ranked bars. */
import { useEffect, useMemo, useState } from "react";
import type { MentorRecord } from "../api/mentorApi";
import dutyNames from "../data/dutyNames.json";
import { analyzeMentorRecords, mentorAnalysisStart } from "../utils/analysis";
import { MentorJob } from "./MentorJob";
import { MentorChart } from "./MentorChart";
import { resolveMentorJob } from "../utils/jobs";
import {
  MENTOR_DUTY_CATEGORIES,
  resolveMentorDutyCategory,
  type MentorDutyCategory,
} from "../utils/dutyTypes";

const names = dutyNames as Record<string, string>;
const categoryLabels: Record<MentorDutyCategory, string> = {
  dungeon: "迷宫挑战（四人本）",
  trial: "讨伐歼灭战",
  raid: "大型任务（八人）",
  alliance: "团队任务（二十四人）",
  guildhest: "行会令",
  unknown: "未识别",
};
const percent = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
const characterKey = (record: MentorRecord) =>
  record.characterId || record.characterName;

export function MentorAnalysis({
  records,
  activeRecordId,
}: {
  records: MentorRecord[];
  activeRecordId: string | null;
}) {
  const [days, setDays] = useState(0);
  const [character, setCharacter] = useState("");
  const [source, setSource] = useState("all");
  const [now, setNow] = useState(Date.now);
  // Refresh calendar windows across midnight while the analysis remains open.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const characters = useMemo(
    () => [
      ...new Map(
        records.map((record) => [characterKey(record), record.characterName]),
      ).entries(),
    ],
    [records],
  );
  const analysis = useMemo(() => {
    const start = mentorAnalysisStart(days, now);
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    const selected = records.filter(
      (record) =>
        record.startedAtMs >= start &&
        record.startedAtMs < tomorrow.getTime() &&
        (!character || characterKey(record) === character) &&
        (source === "all" || record.source === source),
    );
    return analyzeMentorRecords(
      selected.map((record) => ({
        ...record,
        dutyName: record.dutyId
          ? (names[String(record.dutyId)] ?? record.dutyName)
          : record.dutyName,
      })),
      activeRecordId,
    );
  }, [records, activeRecordId, days, character, source, now]);
  const outcomes = [
    { key: "completed", label: "已完成", count: analysis.results.completed },
    { key: "exited", label: "已退出", count: analysis.results.exited },
    {
      key: "needs_review",
      label: "待核对",
      count: analysis.results.needs_review,
    },
    {
      key: "legacy_unknown",
      label: "结果未标记",
      count: analysis.results.legacy_unknown,
    },
  ];

  return (
    <section
      className={
        "mentor-analysis mt-[30px] [&&&&]:[--mentor-chart-1:#355fad] [&&&&]:[--mentor-chart-2:var(--ors-color-success)] [&&&&]:[--mentor-chart-3:#8058a1] [&&&&]:[--mentor-chart-4:var(--ors-color-accent)] [&&&&]:[--mentor-chart-5:#b55432] [&&&&]:[--mentor-chart-6:var(--ors-color-muted)] [.theme-dark_&&&&]:[--mentor-chart-1:#aac5f3] [.theme-dark_&&&&]:[--mentor-chart-2:#8cc9aa] [.theme-dark_&&&&]:[--mentor-chart-3:#c4ace3] [.theme-dark_&&&&]:[--mentor-chart-4:#d3b36b] [.theme-dark_&&&&]:[--mentor-chart-5:#eba984] [.theme-dark_&&&&]:[--mentor-chart-6:#b9b2a8]"
      }
      aria-label="导随数据分析"
    >
      <div
        className={
          "mentor-section-heading flex justify-between gap-[24px] [&_h2]:m-0 [&_p]:text-muted items-center max-[850px]:flex-wrap [&&&&_p]:m-[4px_0_0]"
        }
      >
        <div>
          <h2 className="text-lg font-semibold">数据分析</h2>
          <p>按时间、角色和来源查看导随记录。</p>
        </div>
      </div>
      <div
        className={
          "mentor-analysis-filters grid gap-[16px] mt-[20px] [&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(max-width:_600px)]:[&&&&]:grid-cols-[1fr]"
        }
      >
        <label>
          时间范围
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={0}>全部时间</option>
            <option value={30}>近 30 天</option>
            <option value={90}>近 90 天</option>
          </select>
        </label>
        <label>
          角色
          <select
            value={character}
            onChange={(event) => setCharacter(event.target.value)}
          >
            <option value="">全部角色</option>
            {characters
              .filter(([key]) => key)
              .map(([key, name]) => (
                <option key={key} value={key}>
                  {name || key}
                </option>
              ))}
          </select>
        </label>
        <label>
          记录来源
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="all">全部来源</option>
            <option value="game">游戏自动记录</option>
            <option value="manual">手动补录</option>
            <option value="legacy_site">旧站迁移</option>
          </select>
        </label>
      </div>
      {analysis.total === 0 ? (
        <div
          className={
            "mentor-empty text-center text-muted [&_h3]:m-0 [&_h3]:text-ink [&&&&]:p-[64px_20px] [&&&&_p]:m-[6px_0_18px]"
          }
        >
          <h3 className="text-base font-semibold">
            {records.length
              ? "所选范围内没有已结束的记录"
              : "有了记录，就能查看分析"}
          </h3>
          <p>
            {records.length
              ? "试试调整时间、角色或来源。正在进行的副本不参与分析。"
              : "完成一次导随、迁移旧站记录或手动补录后，这里会自动更新。"}
          </p>
        </div>
      ) : (
        <>
          <dl
            className={
              "mentor-analysis-summary [&_>_div:nth-child(1)_dd]:text-tool [&_>_div:nth-child(2)_dd]:text-success [&_>_div:nth-child(3)_dd]:text-info [&_>_div:nth-child(4)_dd]:text-warning grid gap-[20px] [&_dt]:text-muted [&_dt]:text-[13px] [&_dd]:text-2xl [&_dd]:font-semibold [&_dd]:tabular-nums [&_small]:ml-[6px] [&_small]:text-muted [&_small]:text-[13px] [&_small]:font-normal [&&&&]:grid-cols-[repeat(4,_minmax(0,_1fr))] [&&&&]:m-[24px_0_0] [&&&&]:p-[22px_0] [&&&&]:[border-block:1px_solid_var(--line)] [&&&&_dd]:m-[5px_0_0] [@media(max-width:_600px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))]"
            }
          >
            <div>
              <dt>记录次数</dt>
              <dd>
                {analysis.total}
                <small>次</small>
              </dd>
            </div>
            <div>
              <dt>完成率</dt>
              <dd>
                {analysis.completionRate == null
                  ? "—"
                  : percent(analysis.completionRate)}
              </dd>
            </div>
            <div>
              <dt>记录的副本</dt>
              <dd>
                {analysis.duties.length}
                <small>种</small>
              </dd>
            </div>
            <div>
              <dt>平均用时</dt>
              <dd>
                {analysis.averageDurationMs == null
                  ? "—"
                  : `${(analysis.averageDurationMs / 60_000).toFixed(1)}`}
                <small>
                  {analysis.averageDurationMs == null ? "暂无用时" : "分钟"}
                </small>
              </dd>
            </div>
          </dl>
          <p
            className={
              "mentor-analysis-note text-muted text-[13px] [&&&&]:m-[12px_0_0]"
            }
          >
            完成率 = 已完成 ÷（已完成 +
            已退出）；待核对和未标记记录不参与计算。平均用时仅统计有起止时间的游戏记录，共{" "}
            {analysis.durationCount} 条。
            {analysis.activeCount > 0 &&
              `正在进行的 ${analysis.activeCount} 条记录未计入分析。`}
          </p>
          <div
            className={
              "mentor-analysis-grid grid gap-x-[40px] [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_600px)]:[&&&&]:grid-cols-[1fr]"
            }
          >
            <section
              className={
                "mentor-analysis-block mentor-analysis-types [&_>_p]:text-muted [&_>_p]:text-[13px] min-w-0 border-b border-solid border-line [&_h3]:m-0 [&_h3]:text-base [&&&&]:p-[24px_0] [&&&&_>_p]:m-[4px_0_0] [&&&&]:[grid-column:1_/_-1]"
              }
            >
              <h3 className="text-base font-semibold">副本类型</h3>
              <p>
                统计当前筛选范围内的记录次数，包含完成、退出及结果未确认的记录。
              </p>
              <MentorChart
                title="副本类型"
                distribution
                rows={MENTOR_DUTY_CATEGORIES.map((key) => ({
                  key,
                  name: categoryLabels[key],
                  count: analysis.dutyCategories[key],
                }))}
              />
              {analysis.dutyCategories.unknown > 0 && (
                <p>未识别的记录缺少可匹配的副本编号或名称，保留在总数中。</p>
              )}
            </section>
            <section
              className={
                "mentor-analysis-block [&_>_p]:text-muted [&_>_p]:text-[13px] min-w-0 border-b border-solid border-line [&_h3]:m-0 [&_h3]:text-base [&&&&]:p-[24px_0] [&&&&_>_p]:m-[4px_0_0]"
              }
            >
              <h3 className="text-base font-semibold">结果分布</h3>
              <MentorChart
                title="结果分布"
                distribution
                rows={outcomes.map((outcome) => ({
                  ...outcome,
                  name: outcome.label,
                  color:
                    outcome.key === "completed"
                      ? "var(--ors-color-success)"
                      : outcome.key === "exited"
                        ? "var(--ors-color-warning)"
                        : outcome.key === "needs_review"
                          ? "var(--ors-color-info)"
                          : "var(--muted)",
                }))}
              />
            </section>
            <section
              className={
                "mentor-analysis-block [&_>_p]:text-muted [&_>_p]:text-[13px] min-w-0 border-b border-solid border-line [&_h3]:m-0 [&_h3]:text-base [&&&&]:p-[24px_0] [&&&&_>_p]:m-[4px_0_0]"
              }
            >
              <h3 className="text-base font-semibold">记录来源</h3>
              <MentorChart
                title="记录来源"
                distribution
                rows={[
                  {
                    key: "game",
                    name: "游戏自动记录",
                    count: analysis.sources.game,
                  },
                  {
                    key: "manual",
                    name: "手动补录",
                    count: analysis.sources.manual,
                  },
                  {
                    key: "legacy_site",
                    name: "旧站迁移",
                    count: analysis.sources.legacy_site,
                  },
                ]}
              />
            </section>
            <section
              className={
                "mentor-analysis-block [&_>_p]:text-muted [&_>_p]:text-[13px] min-w-0 border-b border-solid border-line [&_h3]:m-0 [&_h3]:text-base [&&&&]:p-[24px_0] [&&&&_>_p]:m-[4px_0_0]"
              }
            >
              <h3 className="text-base font-semibold">常用职业</h3>
              <p>饼图显示全部职业占比；条形图按次数显示前 10 项。</p>
              <MentorChart
                title="常用职业"
                distribution
                barLimit={10}
                rows={analysis.jobs.map((row) => ({
                  ...row,
                  name: row.key || "职业未记录",
                  label: <MentorJob jobId={null} jobName={row.key} />,
                  color: {
                    tank: "var(--ors-color-info)",
                    healer: "var(--ors-color-success)",
                    dps: "var(--ors-color-danger)",
                    other: "var(--muted)",
                  }[resolveMentorJob(null, row.key).role],
                }))}
              />
            </section>
            <section
              className={
                "mentor-analysis-block [&_>_p]:text-muted [&_>_p]:text-[13px] min-w-0 border-b border-solid border-line [&_h3]:m-0 [&_h3]:text-base [&&&&]:p-[24px_0] [&&&&_>_p]:m-[4px_0_0]"
              }
            >
              <h3 className="text-base font-semibold">常遇到的副本</h3>
              <p>按次数排序，显示前 10 项；颜色与上方副本类型图表一致。</p>
              <MentorChart
                title="常遇到的副本"
                rows={analysis.duties.slice(0, 10).map((row) => ({
                  ...row,
                  name: row.key || "副本未记录",
                  // Share category colors with the duty-type pie and its legend.
                  color: `var(--mentor-chart-${MENTOR_DUTY_CATEGORIES.indexOf(resolveMentorDutyCategory(null, row.key)) + 1})`,
                }))}
              />
            </section>
          </div>
        </>
      )}
    </section>
  );
}
