/** Labeled history filters expose common choices without hiding active conditions. */

import { mentorControlClasses } from "../utilityClasses";
import { ArrowClockwise } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { MentorRecord } from "../api/mentorApi";
import { resolveMentorJob } from "../utils/jobs";
import {
  DEFAULT_MENTOR_FILTERS,
  mentorCharacterKey,
  mentorDateRangeInvalid,
  type MentorRecordFilters as Filters,
} from "../utils/recordFilters";
export function MentorRecordFilters({
  records,
  filters,
  count,
  onChange,
  onRefresh,
}: {
  records: MentorRecord[];
  filters: Filters;
  count: number;
  onChange: (filters: Filters) => void;
  onRefresh: () => void;
}) {
  const characters = useMemo(
    () => [
      ...new Map(
        records.map((record) => [
          mentorCharacterKey(record),
          record.characterName,
        ]),
      ).entries(),
    ],
    [records],
  );
  const jobs = useMemo(
    () =>
      [
        ...new Set(
          records.map(
            (record) => resolveMentorJob(record.jobId, record.jobName).label,
          ),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [records],
  );
  const changed = Object.keys(DEFAULT_MENTOR_FILTERS).some(
    (key) =>
      filters[key as keyof Filters] !==
      DEFAULT_MENTOR_FILTERS[key as keyof Filters],
  );
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({
      ...filters,
      [key]: value,
    });
  const invalid = mentorDateRangeInvalid(filters);
  return (
    <div className="mentor-history-filters mx-0 mt-5.5 mb-6.5">
      <div className="mentor-filter-search grid grid-cols-[minmax(0,_1fr)_42px] items-end gap-2.5">
        <label className={mentorControlClasses.label}>
          关键词
          <input
            className={mentorControlClasses.input}
            type="search"
            placeholder="搜索副本、角色、职业或备注"
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
          />
        </label>
        <button
          className="inline-flex min-h-10 w-10.5 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface p-0 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-55 pointer-coarse:min-h-11"
          type="button"
          aria-label="刷新记录"
          title="刷新记录"
          onClick={onRefresh}
        >
          <ArrowClockwise className={mentorControlClasses.icon} />
        </button>
      </div>
      <div className="mentor-filter-grid mt-4 grid grid-cols-3 gap-[12px_16px] max-[600px]:grid-cols-[1fr]">
        <label className={mentorControlClasses.label}>
          时间范围
          <select
            className={mentorControlClasses.select}
            value={filters.period}
            onChange={(event) =>
              update("period", event.target.value as Filters["period"])
            }
          >
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">近 7 天</option>
            <option value="month">近 30 天</option>
            <option value="custom">自定义日期</option>
          </select>
        </label>
        <label className={mentorControlClasses.label}>
          角色
          <select
            className={mentorControlClasses.select}
            value={filters.character}
            onChange={(event) => update("character", event.target.value)}
          >
            <option value="all">全部角色</option>
            {characters.map(([key, name]) => (
              <option key={key} value={key}>
                {name || "未指定角色"}
              </option>
            ))}
          </select>
        </label>
        <label className={mentorControlClasses.label}>
          职业
          <select
            className={mentorControlClasses.select}
            value={filters.job}
            onChange={(event) => update("job", event.target.value)}
          >
            <option value="all">全部职业</option>
            <optgroup label="按职责">
              <option value="role:tank">防护职业</option>
              <option value="role:healer">治疗职业</option>
              <option value="role:dps">输出职业</option>
            </optgroup>
            <optgroup label="按职业">
              {jobs.map((job) => (
                <option key={job} value={`job:${job}`}>
                  {job || "职业未记录"}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className={mentorControlClasses.label}>
          副本类型
          <select
            className={mentorControlClasses.select}
            value={filters.dutyType}
            onChange={(event) =>
              update("dutyType", event.target.value as Filters["dutyType"])
            }
          >
            <option value="all">全部类型</option>
            <option value="dungeon">迷宫挑战（四人本）</option>
            <option value="trial">讨伐歼灭战</option>
            <option value="raid">大型任务（八人）</option>
            <option value="alliance">团队任务（二十四人）</option>
            <option value="guildhest">行会令</option>
            <option value="unknown">未识别</option>
          </select>
        </label>
        <label className={mentorControlClasses.label}>
          结果
          <select
            className={mentorControlClasses.select}
            value={filters.result}
            onChange={(event) =>
              update("result", event.target.value as Filters["result"])
            }
          >
            <option value="all">全部结果</option>
            <option value="completed">已完成</option>
            <option value="exited">已退出</option>
            <option value="needs_review">待核对</option>
            <option value="legacy_unknown">结果未标记</option>
          </select>
        </label>
        <label className={mentorControlClasses.label}>
          记录来源
          <select
            className={mentorControlClasses.select}
            value={filters.source}
            onChange={(event) =>
              update("source", event.target.value as Filters["source"])
            }
          >
            <option value="all">全部来源</option>
            <option value="game">游戏自动记录</option>
            <option value="manual">手动补录</option>
            <option value="legacy_site">旧站迁移</option>
          </select>
        </label>
      </div>
      {filters.period === "custom" && (
        <div className="mentor-filter-dates mt-4 grid grid-cols-2 gap-[12px_16px] max-[600px]:grid-cols-[1fr]">
          <label className={mentorControlClasses.label}>
            开始日期
            <input
              className={mentorControlClasses.input}
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              aria-invalid={invalid}
              aria-describedby={invalid ? "mentor-date-error" : undefined}
              onChange={(event) => update("from", event.target.value)}
            />
          </label>
          <label className={mentorControlClasses.label}>
            结束日期
            <input
              className={mentorControlClasses.input}
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              aria-invalid={invalid}
              aria-describedby={invalid ? "mentor-date-error" : undefined}
              onChange={(event) => update("to", event.target.value)}
            />
          </label>
          <p className="col-span-full m-0 text-[13px] text-muted">
            按进入时间筛选，包含开始和结束当天；留空表示不限。
          </p>
        </div>
      )}
      {invalid && (
        <p
          id="mentor-date-error"
          className="mentor-filter-error text-danger"
          role="alert"
        >
          请输入有效日期，开始日期不能晚于结束日期。
        </p>
      )}
      <div className="mentor-filter-footer mt-4.5 flex flex-wrap items-center gap-4 border-b border-solid border-line pb-4.5">
        <span
          className="[margin-right:auto] text-sm text-muted tabular-nums"
          role="status"
        >
          显示 {count} / {records.length} 条记录
        </span>
        <label className="mentor-filter-order flex items-center gap-2 font-semibold whitespace-nowrap">
          排序
          <select
            className="min-h-10 w-auto min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-2 text-ink pointer-coarse:min-h-11"
            value={filters.order}
            onChange={(event) =>
              update("order", event.target.value as Filters["order"])
            }
          >
            <option value="newest">最新在前</option>
            <option value="oldest">最早在前</option>
          </select>
        </label>
        <button
          className={mentorControlClasses.button}
          type="button"
          disabled={!changed}
          onClick={() =>
            onChange({
              ...DEFAULT_MENTOR_FILTERS,
            })
          }
        >
          重置筛选
        </button>
      </div>
    </div>
  );
}
