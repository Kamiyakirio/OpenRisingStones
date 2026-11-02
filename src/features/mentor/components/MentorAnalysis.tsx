/** Filterable ledger analysis with explicit sample sizes and readable ranked bars. */

import {
  mentorControlClasses,
  mentorSectionHeadingClasses,
} from "../utilityClasses";
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

/** Reused presentation strings stay static and are allocated once for this module. */
const analysisWarningValueClasses =
  "mx-0 mt-[5px] mb-0 text-2xl font-semibold text-warning tabular-nums";
const analysisValueSuffixClasses = "ml-1.5 text-[13px] font-normal text-muted";
const analysisBlockClasses =
  "mentor-analysis-block min-w-0 border-b border-solid border-line px-0 py-6";

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
    {
      key: "completed",
      label: "已完成",
      count: analysis.results.completed,
    },
    {
      key: "exited",
      label: "已退出",
      count: analysis.results.exited,
    },
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
      className="mentor-analysis mt-6 [--mentor-chart-1:#355fad] [--mentor-chart-2:var(--ors-color-success)] [--mentor-chart-3:#8058a1] [--mentor-chart-4:var(--ors-color-accent)] [--mentor-chart-5:#b55432] [--mentor-chart-6:var(--ors-color-muted)] dark:[--mentor-chart-1:#aac5f3] dark:[--mentor-chart-2:#8cc9aa] dark:[--mentor-chart-3:#c4ace3] dark:[--mentor-chart-4:#d3b36b] dark:[--mentor-chart-5:#eba984] dark:[--mentor-chart-6:#b9b2a8]"
      aria-label="导随数据分析"
    >
      <div className={mentorSectionHeadingClasses}>
        <div>
          <h2 className="m-0 text-lg font-semibold">数据分析</h2>
          <p className="mx-0 mt-1 mb-0 text-muted">
            按时间、角色和来源查看导随记录。
          </p>
        </div>
      </div>
      <div className="mentor-analysis-filters mt-5 grid grid-cols-3 gap-4 max-[600px]:grid-cols-[1fr]">
        <label className={mentorControlClasses.label}>
          时间范围
          <select
            className={mentorControlClasses.select}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={0}>全部时间</option>
            <option value={30}>近 30 天</option>
            <option value={90}>近 90 天</option>
          </select>
        </label>
        <label className={mentorControlClasses.label}>
          角色
          <select
            className={mentorControlClasses.select}
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
        <label className={mentorControlClasses.label}>
          记录来源
          <select
            className={mentorControlClasses.select}
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
        <div className="mentor-empty px-5 py-16 text-center text-muted">
          <h3 className="m-0 text-base font-semibold text-ink">
            {records.length
              ? "所选范围内没有已结束的记录"
              : "有了记录，就能查看分析"}
          </h3>
          <p className="mx-0 mt-1.5 mb-4.5">
            {records.length
              ? "试试调整时间、角色或来源。正在进行的副本不参与分析。"
              : "完成一次导随、迁移旧站记录或手动补录后，这里会自动更新。"}
          </p>
        </div>
      ) : (
        <>
          <dl className="mentor-analysis-summary mx-0 mt-6 mb-0 grid grid-cols-4 gap-5 px-0 py-5.5 [border-block:1px_solid_var(--ors-color-line)] max-[600px]:grid-cols-2">
            <div>
              <dt className="text-[13px] text-muted">记录次数</dt>
              <dd className={analysisWarningValueClasses}>
                {analysis.total}
                <small className={analysisValueSuffixClasses}>次</small>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">完成率</dt>
              <dd className={analysisWarningValueClasses}>
                {analysis.completionRate == null
                  ? "—"
                  : percent(analysis.completionRate)}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">记录的副本</dt>
              <dd className={analysisWarningValueClasses}>
                {analysis.duties.length}
                <small className={analysisValueSuffixClasses}>种</small>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">平均用时</dt>
              <dd className={analysisWarningValueClasses}>
                {analysis.averageDurationMs == null
                  ? "—"
                  : `${(analysis.averageDurationMs / 60_000).toFixed(1)}`}
                <small className={analysisValueSuffixClasses}>
                  {analysis.averageDurationMs == null ? "暂无用时" : "分钟"}
                </small>
              </dd>
            </div>
          </dl>
          <p className="mentor-analysis-note mx-0 mt-3 mb-0 text-[13px] text-muted">
            完成率 = 已完成 ÷（已完成 +
            已退出）；待核对和未标记记录不参与计算。平均用时仅统计有起止时间的游戏记录，共{" "}
            {analysis.durationCount} 条。
            {analysis.activeCount > 0 &&
              `正在进行的 ${analysis.activeCount} 条记录未计入分析。`}
          </p>
          <div className="mentor-analysis-grid grid grid-cols-2 gap-x-10 max-[600px]:grid-cols-[1fr]">
            <section className="mentor-analysis-block mentor-analysis-types col-span-full min-w-0 border-b border-solid border-line px-0 py-6">
              <h3 className="m-0 text-base font-semibold">副本类型</h3>
              <p className="mx-0 mt-1 mb-0 text-[13px] text-muted">
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
                layout="analysis-types"
              />
              {analysis.dutyCategories.unknown > 0 && (
                <p className="mx-0 mt-1 mb-0 text-[13px] text-muted">
                  未识别的记录缺少可匹配的副本编号或名称，保留在总数中。
                </p>
              )}
            </section>
            <section className={analysisBlockClasses}>
              <h3 className="m-0 text-base font-semibold">结果分布</h3>
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
                          : "var(--ors-color-muted)",
                }))}
              />
            </section>
            <section className={analysisBlockClasses}>
              <h3 className="m-0 text-base font-semibold">记录来源</h3>
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
            <section className={analysisBlockClasses}>
              <h3 className="m-0 text-base font-semibold">常用职业</h3>
              <p className="mx-0 mt-1 mb-0 text-[13px] text-muted">
                饼图显示全部职业占比；条形图按次数显示前 10 项。
              </p>
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
                    other: "var(--ors-color-muted)",
                  }[resolveMentorJob(null, row.key).role],
                }))}
              />
            </section>
            <section className={analysisBlockClasses}>
              <h3 className="m-0 text-base font-semibold">常遇到的副本</h3>
              <p className="mx-0 mt-1 mb-0 text-[13px] text-muted">
                按次数排序，显示前 10 项；颜色与上方副本类型图表一致。
              </p>
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
