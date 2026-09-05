/** Compact local preferences sharing the advanced recruitment workbench styles. */
import { CaretDown } from "@phosphor-icons/react";
import type { AdvancedRecruitFilters } from "../advanced.types";
import type { AdvancedRecruitViewModel } from "../hooks/useAdvancedRecruit";

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
  viewModel: AdvancedRecruitViewModel;
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
  ) => patchFilters({ [key]: value });

  return (
    <details className="advanced-profession-filters advanced-preferences">
      <summary>
        <span>
          <strong>活动时间与偏好</strong>
          <small>
            {activeCount
              ? `已选 ${activeCount} 项`
              : "按时间、标签、大区和我的职业找队"}
          </small>
        </span>
        <CaretDown weight="bold" />
      </summary>
      <div>
        <section className="advanced-preference-fields" aria-label="关键词偏好">
          <p>
            进度与攻略的多个词用空格或逗号分隔，全部包含；前加 - 排除。
            时间关键词按整段匹配，全局排除始终生效。
          </p>
          {TEXT_FIELDS.map(([key, label, placeholder]) => (
            <label className="advanced-picker-search" key={key}>
              <span>{label}</span>
              <input
                value={filters[key]}
                placeholder={placeholder}
                onChange={(event) => update(key, event.target.value)}
              />
            </label>
          ))}
          <label className="advanced-picker-search">
            <span>大区偏好</span>
            <select
              value={filters.areaName}
              onChange={(event) => update("areaName", event.target.value)}
            >
              <option value="">不限</option>
              {areas.map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>
          </label>
          <label className="advanced-picker-search">
            <span>队伍构成</span>
            <select
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
          <label className="advanced-picker-search">
            <span>24 人团队分队</span>
            <select
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
          <p>
            4 人队的 T/H 对应上方
            MT/H1；分队条件限定空缺位置，重复职业检查覆盖整个团队。
          </p>
        </section>
        <section
          className="advanced-preference-fields"
          aria-label="活动时间限制"
        >
          <p>
            已解析的时段须全部落在范围内；星期匹配任一天。结束时间 0–6
            表示次日。
          </p>
          <div className="advanced-time-bounds">
            {(
              [
                ["timeStart", "最早开始（时）", "20"],
                ["timeEnd", "最晚结束（时）", "23"],
                ["dailyMaxHours", "每日最多（小时）", "3"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label className="advanced-picker-search" key={key}>
                <span>{label}</span>
                <input
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
          <fieldset>
            <legend>活动星期（任一）</legend>
            <div className="advanced-preference-options">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label key={day}>
                  <input
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
          <label className="advanced-preference-check">
            <input
              type="checkbox"
              checked={filters.showUnparsedTime}
              onChange={(event) =>
                update("showUnparsedTime", event.target.checked)
              }
            />
            保留时间未解析的招募
          </label>
          <fieldset>
            <legend>标签</legend>
            <div className="advanced-job-mode">
              {(["all", "any"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={filters.labelMode === mode}
                  className={filters.labelMode === mode ? "active" : ""}
                  onClick={() => update("labelMode", mode)}
                >
                  {mode === "all" ? "全部标签" : "任一标签"}
                </button>
              ))}
            </div>
            <div className="advanced-preference-options">
              {labels.map((label) => (
                <label key={label}>
                  <input
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
          className="advanced-preference-fields advanced-playable-jobs"
          aria-label="我的职业可进"
        >
          <h3>我的职业可进</h3>
          <p>所选职业任一可进即可；按需求职业或空缺职能匹配。</p>
          <label className="advanced-preference-check">
            <input
              type="checkbox"
              checked={filters.noDuplicateJobs}
              onChange={(event) =>
                update("noDuplicateJobs", event.target.checked)
              }
            />
            避免与队内职业重复（选择我的职业后生效）
          </label>
          <div className="advanced-preference-options">
            {(config?.jobs ?? [])
              .filter(
                (job) =>
                  !config?.roleJobs.some((role) => role.id === job.id) &&
                  job.id !== 32,
              )
              .map((job) => (
                <label key={job.id}>
                  <input
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
                    <img src={job.icon} alt="" width="22" height="22" />
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
