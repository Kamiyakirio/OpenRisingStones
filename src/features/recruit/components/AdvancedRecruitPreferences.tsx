/** Compact local preferences sharing the advanced recruitment workbench styles. Checkbox indicators stay 16px; labels provide 36px/44px targets. */

import { CaretDown } from "@phosphor-icons/react";
import type { AdvancedRecruitFilters } from "../advanced.types";
import type { AdvancedRecruitState } from "../hooks/useAdvancedRecruit";
import {
  advancedProfessionSummaryClasses,
  advancedProfessionChevronClasses,
  advancedSearchInputClasses,
  advancedProfessionButtonClasses,
} from "../utilityClasses";

/** Reused presentation strings stay static and are allocated once for this module. */
const preferenceFieldsClasses =
  "advanced-preference-fields grid min-w-0 content-start gap-3";
const preferenceInputClasses =
  "min-h-[39px] w-full rounded-control border border-solid border-control bg-canvas px-[11px] py-0 text-ink";
const preferenceOptionsClasses =
  "advanced-preference-options flex flex-wrap gap-[8px_14px]";
const preferenceOptionClasses =
  "flex min-h-9 cursor-pointer items-center gap-1.5 text-xs [@media(pointer:coarse)]:min-h-11";
const preferenceCheckboxClasses =
  'size-4 min-h-0 shrink-0 p-0 accent-accent [&[type="checkbox"]]:[accent-color:var(--ors-color-accent)]';
const preferenceCheckClasses = `advanced-preference-check ${preferenceOptionClasses}`;

const TEXT_FIELDS = [
  ["progressText", "进度关键词", "例如：P3 -开荒"],
  ["strategyText", "攻略关键词", "例如：视频 -自创"],
  ["excludeText", "全局排除关键词", "例如：保底 代打"],
  ["timeText", "时间关键词", "匹配原文或解析后的时间"],
] as const;
const DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const toggle = <T,>(values: T[], value: T) =>
  values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
export function AdvancedRecruitPreferences({
  viewModel,
}: {
  viewModel: AdvancedRecruitState;
}) {
  const { filters, patchFilters, config, dataset } = viewModel;
  const labels = [
    ...new Set(
      [
        ...(config?.labels.map((label) => label.name) ?? []),
        ...(dataset?.items.flatMap((item) =>
          item.labels.map((label) => label.name),
        ) ?? []),
      ].filter(Boolean),
    ),
  ];
  const areas = [
    ...new Set([
      ...(config?.areas.map((area) => area.name) ?? []),
      ...(dataset?.items.flatMap((item) => [
        item.areaName,
        item.targetAreaName,
      ]) ?? []),
    ]),
  ].filter(Boolean);
  const activeCount =
    TEXT_FIELDS.filter(([key]) => filters[key].trim()).length +
    [
      filters.timeStart,
      filters.timeEnd,
      filters.dailyMaxHours,
      filters.areaName,
      filters.teamComposition,
      filters.alliance,
    ].filter(Boolean).length +
    filters.timeDays.length +
    filters.labelNames.length +
    filters.playableJobIds.length +
    Number(!filters.showUnparsedTime);
  const update = <K extends keyof AdvancedRecruitFilters>(
    key: K,
    value: AdvancedRecruitFilters[K],
  ) =>
    patchFilters({
      [key]: value,
    });
  return (
    <details className="advanced-profession-filters advanced-preferences group/advanced-profession-filters border-t border-solid border-line bg-surface focus-visible:[outline:2px_solid_var(--ors-color-accent)] focus-visible:[outline-offset:2px]">
      <summary className={advancedProfessionSummaryClasses}>
        <span className="grid gap-[3px]">
          <strong className="text-[12px]">活动时间与偏好</strong>
          <small className="text-xs text-muted">
            {activeCount
              ? `已选 ${activeCount} 项`
              : "按时间、标签、大区和我的职业找队"}
          </small>
        </span>
        <CaretDown className={advancedProfessionChevronClasses} weight="bold" />
      </summary>
      <div className="grid grid-cols-2 gap-3 px-5 pt-0 pb-5 max-[920px]:grid-cols-[1fr]">
        <section className={preferenceFieldsClasses} aria-label="关键词偏好">
          <p className="m-0 text-xs leading-[1.6] text-muted">
            进度与攻略的多个词用空格或逗号分隔，全部包含；前加 - 排除。
            时间关键词按整段匹配，全局排除始终生效。
          </p>
          {TEXT_FIELDS.map(([key, label, placeholder]) => (
            <label className="advanced-picker-search grid gap-1.5" key={key}>
              <span className="text-xs font-[720] text-muted">{label}</span>
              <input
                className={advancedSearchInputClasses}
                value={filters[key]}
                placeholder={placeholder}
                onChange={(event) => update(key, event.target.value)}
              />
            </label>
          ))}
          <label className="advanced-picker-search grid gap-1.5">
            <span className="text-xs font-[720] text-muted">大区偏好</span>
            <select
              className={preferenceInputClasses}
              value={filters.areaName}
              onChange={(event) => update("areaName", event.target.value)}
            >
              <option value="">不限</option>
              {areas.map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>
          </label>
          <label className="advanced-picker-search grid gap-1.5">
            <span className="text-xs font-[720] text-muted">队伍构成</span>
            <select
              className={preferenceInputClasses}
              value={filters.teamComposition}
              onChange={(event) =>
                update("teamComposition", event.target.value)
              }
            >
              <option value="">不限</option>
              {[
                ...new Set(
                  dataset?.items.map((item) => item.teamComposition) ?? [],
                ),
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="advanced-picker-search grid gap-1.5">
            <span className="text-xs font-[720] text-muted">24 人团队分队</span>
            <select
              className={preferenceInputClasses}
              value={filters.alliance}
              onChange={(event) =>
                update(
                  "alliance",
                  event.target.value as AdvancedRecruitFilters["alliance"],
                )
              }
            >
              <option value="">不限</option>
              {["A", "B", "C"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <p className="m-0 text-xs leading-[1.6] text-muted">
            4 人队的 T/H 对应上方
            MT/H1；分队条件限定空缺位置，重复职业检查覆盖整个团队。
          </p>
        </section>
        <section className={preferenceFieldsClasses} aria-label="活动时间限制">
          <p className="m-0 text-xs leading-[1.6] text-muted">
            已解析的时段须全部落在范围内；星期匹配任一天。结束时间 0–6
            表示次日。
          </p>
          <div className="advanced-time-bounds grid grid-cols-3 gap-2 max-[460px]:grid-cols-[1fr]">
            {(
              [
                ["timeStart", "最早开始（时）", "20"],
                ["timeEnd", "最晚结束（时）", "23"],
                ["dailyMaxHours", "每日最多（小时）", "3"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label className="advanced-picker-search grid gap-1.5" key={key}>
                <span className="text-xs font-[720] text-muted">{label}</span>
                <input
                  className={advancedSearchInputClasses}
                  type="number"
                  min={key === "dailyMaxHours" ? 0.5 : 0}
                  max={key === "dailyMaxHours" ? 24 : 30}
                  step="0.5"
                  placeholder={placeholder}
                  value={filters[key]}
                  onChange={(event) => update(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2 text-xs">活动星期（任一）</legend>
            <div className={preferenceOptionsClasses}>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label className={preferenceOptionClasses} key={day}>
                  <input
                    className={preferenceCheckboxClasses}
                    type="checkbox"
                    checked={filters.timeDays.includes(String(day))}
                    onChange={() =>
                      update("timeDays", toggle(filters.timeDays, String(day)))
                    }
                  />
                  {DAYS[day]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className={preferenceCheckClasses}>
            <input
              className={preferenceCheckboxClasses}
              type="checkbox"
              checked={filters.showUnparsedTime}
              onChange={(event) =>
                update("showUnparsedTime", event.target.checked)
              }
            />
            保留时间未解析的招募
          </label>
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2 text-xs">标签</legend>
            <div className="advanced-job-mode mb-2.5 flex items-center gap-1.5">
              {(["all", "any"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={filters.labelMode === mode}
                  className={
                    filters.labelMode === mode
                      ? "active min-h-[29px] rounded-control border border-solid border-control bg-transparent px-[9px] py-0 text-xs font-[730] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease]"
                      : advancedProfessionButtonClasses
                  }
                  onClick={() => update("labelMode", mode)}
                >
                  {mode === "all" ? "全部标签" : "任一标签"}
                </button>
              ))}
            </div>
            <div className={preferenceOptionsClasses}>
              {labels.map((label) => (
                <label className={preferenceOptionClasses} key={label}>
                  <input
                    className={preferenceCheckboxClasses}
                    type="checkbox"
                    checked={filters.labelNames.includes(label)}
                    onChange={() =>
                      update("labelNames", toggle(filters.labelNames, label))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </section>
        <section
          className="advanced-preference-fields advanced-playable-jobs col-span-full grid min-w-0 content-start gap-3 border-t border-solid border-line pt-4"
          aria-label="我的职业可进"
        >
          <h3 className="m-0 text-sm font-semibold">我的职业可进</h3>
          <p className="m-0 text-xs leading-[1.6] text-muted">
            所选职业任一可进即可；按需求职业或空缺职能匹配。
          </p>
          <label className={preferenceCheckClasses}>
            <input
              className={preferenceCheckboxClasses}
              type="checkbox"
              checked={filters.noDuplicateJobs}
              onChange={(event) =>
                update("noDuplicateJobs", event.target.checked)
              }
            />
            避免与队内职业重复（选择我的职业后生效）
          </label>
          <div className={preferenceOptionsClasses}>
            {(config?.jobs ?? [])
              .filter(
                (job) =>
                  !config?.roleJobs.some((role) => role.id === job.id) &&
                  job.id !== 32,
              )
              .map((job) => (
                <label className={preferenceOptionClasses} key={job.id}>
                  <input
                    className={preferenceCheckboxClasses}
                    type="checkbox"
                    checked={filters.playableJobIds.includes(job.id)}
                    onChange={() =>
                      update(
                        "playableJobIds",
                        toggle(filters.playableJobIds, job.id),
                      )
                    }
                  />
                  {job.icon && (
                    <img
                      className="object-contain"
                      src={job.icon}
                      alt=""
                      width="22"
                      height="22"
                    />
                  )}
                  {job.name}
                </label>
              ))}
          </div>
        </section>
      </div>
    </details>
  );
}
