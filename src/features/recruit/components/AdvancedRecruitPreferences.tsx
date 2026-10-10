/** Compact local preferences sharing the advanced recruitment workbench styles. Checkbox indicators stay 16px; labels provide 36px/44px targets. */
import { CaretDown } from "@phosphor-icons/react";
import type { AdvancedRecruitFilters } from "../advanced.types";
import type { AdvancedRecruitState } from "../hooks/useAdvancedRecruit";

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
  ) => patchFilters({ [key]: value });

  return (
    <details
      className={
        'advanced-profession-filters advanced-preferences border-t border-solid border-line bg-surface [&_>_summary]:flex [&_>_summary]:justify-between [&_>_summary]:items-center [&_>_summary]:gap-[16px] [&_>_summary]:min-h-[52px] [&_>_summary]:cursor-pointer [&_>_summary::-webkit-details-marker]:hidden [&_>_summary_>_span]:grid [&_>_summary_>_span]:gap-[3px] [&_>_summary_small]:text-muted [&_>_summary_small]:text-xs [&_>_summary_>_svg]:w-[15px] [&_>_summary_>_svg]:h-[15px] [&_>_summary_>_svg]:text-muted [&[open]_>_summary_>_svg]:text-accent [&_>_div]:grid [&_>_div]:gap-[12px] [&_select]:w-full [&_select]:min-h-[39px] [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[var(--ors-radius-control)] [&_select]:bg-canvas [&_select]:text-ink [&&&&_>_summary]:p-[0_20px] [&&&&_>_summary]:[list-style:none] [&&&&_>_summary_strong]:text-[12px] [&&&&_>_summary_>_svg]:[transition:transform_160ms_ease] [&&&&[open]_>_summary_>_svg]:transform-[rotate(180deg)] [&&&&_>_div]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&&&_>_div]:p-[0_20px_20px] [@media(max-width:_920px)]:[&&&&_>_div]:grid-cols-[1fr] [&&&&_input[type="checkbox"]]:[accent-color:var(--ors-color-accent)] [&&&&_select]:p-[0_11px] [&&&&_:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_:focus-visible]:[outline-offset:2px]'
      }
    >
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
        <section
          className={
            "advanced-preference-fields grid gap-[12px] min-w-0 [&_p]:m-0 [&_p]:text-muted [&_p]:text-xs [&_h3]:m-0 [&_h3]:text-sm [&_fieldset]:min-w-0 [&_fieldset]:m-0 [&_fieldset]:p-0 [&_fieldset]:border-0 [&_legend]:mb-[8px] [&_legend]:text-xs [&&&&]:[align-content:start] [&&&&_p]:leading-[1.6]"
          }
          aria-label="关键词偏好"
        >
          <p>
            进度与攻略的多个词用空格或逗号分隔，全部包含；前加 - 排除。
            时间关键词按整段匹配，全局排除始终生效。
          </p>
          {TEXT_FIELDS.map(([key, label, placeholder]) => (
            <label
              className={
                "advanced-picker-search grid gap-[6px] [&_>_span]:text-muted [&_>_span]:text-xs [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[39px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:text-xs [&_input:focus]:border-accent [&_input::placeholder]:text-muted [&&&&_>_span]:[font-weight:720] [&&&&_input]:p-[0_11px] [&&&&_input]:[outline:0] [&&&&_input:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.76]"
              }
              key={key}
            >
              <span>{label}</span>
              <input
                value={filters[key]}
                placeholder={placeholder}
                onChange={(event) => update(key, event.target.value)}
              />
            </label>
          ))}
          <label
            className={
              "advanced-picker-search grid gap-[6px] [&_>_span]:text-muted [&_>_span]:text-xs [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[39px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:text-xs [&_input:focus]:border-accent [&_input::placeholder]:text-muted [&&&&_>_span]:[font-weight:720] [&&&&_input]:p-[0_11px] [&&&&_input]:[outline:0] [&&&&_input:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.76]"
            }
          >
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
          <label
            className={
              "advanced-picker-search grid gap-[6px] [&_>_span]:text-muted [&_>_span]:text-xs [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[39px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:text-xs [&_input:focus]:border-accent [&_input::placeholder]:text-muted [&&&&_>_span]:[font-weight:720] [&&&&_input]:p-[0_11px] [&&&&_input]:[outline:0] [&&&&_input:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.76]"
            }
          >
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
          <label
            className={
              "advanced-picker-search grid gap-[6px] [&_>_span]:text-muted [&_>_span]:text-xs [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[39px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:text-xs [&_input:focus]:border-accent [&_input::placeholder]:text-muted [&&&&_>_span]:[font-weight:720] [&&&&_input]:p-[0_11px] [&&&&_input]:[outline:0] [&&&&_input:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.76]"
            }
          >
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
          className={
            "advanced-preference-fields grid gap-[12px] min-w-0 [&_p]:m-0 [&_p]:text-muted [&_p]:text-xs [&_h3]:m-0 [&_h3]:text-sm [&_fieldset]:min-w-0 [&_fieldset]:m-0 [&_fieldset]:p-0 [&_fieldset]:border-0 [&_legend]:mb-[8px] [&_legend]:text-xs [&&&&]:[align-content:start] [&&&&_p]:leading-[1.6]"
          }
          aria-label="活动时间限制"
        >
          <p>
            已解析的时段须全部落在范围内；星期匹配任一天。结束时间 0–6
            表示次日。
          </p>
          <div
            className={
              "advanced-time-bounds grid gap-[8px] [&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(max-width:_460px)]:[&&&&]:grid-cols-[1fr]"
            }
          >
            {(
              [
                ["timeStart", "最早开始（时）", "20"],
                ["timeEnd", "最晚结束（时）", "23"],
                ["dailyMaxHours", "每日最多（小时）", "3"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label
                className={
                  "advanced-picker-search grid gap-[6px] [&_>_span]:text-muted [&_>_span]:text-xs [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[39px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:text-xs [&_input:focus]:border-accent [&_input::placeholder]:text-muted [&&&&_>_span]:[font-weight:720] [&&&&_input]:p-[0_11px] [&&&&_input]:[outline:0] [&&&&_input:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.76]"
                }
                key={key}
              >
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
            <div
              className={
                "advanced-preference-options flex flex-wrap [&_label]:flex [&_label]:items-center [&_label]:gap-[6px] [&_label]:text-xs [&_label]:cursor-pointer [&_img]:object-contain [&&&&]:gap-[8px_14px]"
              }
            >
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label
                  className="[&&&&&]:min-h-9 [@media(pointer:coarse)]:[&&&&&]:min-h-11"
                  key={day}
                >
                  <input
                    className="size-4 shrink-0 accent-accent [&&&&&]:size-4 [&&&&&]:min-h-0 [&&&&&]:p-0"
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
          <label className="advanced-preference-check flex items-center gap-[6px] text-xs cursor-pointer [&&&&&]:min-h-9 [@media(pointer:coarse)]:[&&&&&]:min-h-11">
            <input
              className="size-4 shrink-0 accent-accent [&&&&&]:size-4 [&&&&&]:min-h-0 [&&&&&]:p-0"
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
            <div
              className={
                "advanced-job-mode flex items-center gap-[6px] mb-[10px] [&_>_span]:text-muted [&_>_span]:text-xs [&_button]:min-h-[29px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-muted [&_button]:text-xs [&&&&_>_span]:[margin-right:auto] [&&&&_button]:p-[0_9px] [&&&&_button]:[background:transparent] [&&&&_button]:[font-weight:730]"
              }
            >
              {(["all", "any"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={filters.labelMode === mode}
                  className={
                    filters.labelMode === mode
                      ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
                      : ""
                  }
                  onClick={() => update("labelMode", mode)}
                >
                  {mode === "all" ? "全部标签" : "任一标签"}
                </button>
              ))}
            </div>
            <div
              className={
                "advanced-preference-options flex flex-wrap [&_label]:flex [&_label]:items-center [&_label]:gap-[6px] [&_label]:text-xs [&_label]:cursor-pointer [&_img]:object-contain [&&&&]:gap-[8px_14px]"
              }
            >
              {labels.map((label) => (
                <label
                  className="[&&&&&]:min-h-9 [@media(pointer:coarse)]:[&&&&&]:min-h-11"
                  key={label}
                >
                  <input
                    className="size-4 shrink-0 accent-accent [&&&&&]:size-4 [&&&&&]:min-h-0 [&&&&&]:p-0"
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
          className={
            "advanced-preference-fields advanced-playable-jobs grid gap-[12px] min-w-0 [&_p]:m-0 [&_p]:text-muted [&_p]:text-xs [&_h3]:m-0 [&_h3]:text-sm [&_fieldset]:min-w-0 [&_fieldset]:m-0 [&_fieldset]:p-0 [&_fieldset]:border-0 [&_legend]:mb-[8px] [&_legend]:text-xs border-t border-solid border-line pt-[16px] [&&&&]:[align-content:start] [&&&&_p]:leading-[1.6] [&&&&]:[grid-column:1_/_-1]"
          }
          aria-label="我的职业可进"
        >
          <h3 className="text-base font-semibold">我的职业可进</h3>
          <p>所选职业任一可进即可；按需求职业或空缺职能匹配。</p>
          <label className="advanced-preference-check flex items-center gap-[6px] text-xs cursor-pointer [&&&&&]:min-h-9 [@media(pointer:coarse)]:[&&&&&]:min-h-11">
            <input
              className="size-4 shrink-0 accent-accent [&&&&&]:size-4 [&&&&&]:min-h-0 [&&&&&]:p-0"
              type="checkbox"
              checked={filters.noDuplicateJobs}
              onChange={(event) =>
                update("noDuplicateJobs", event.target.checked)
              }
            />
            避免与队内职业重复（选择我的职业后生效）
          </label>
          <div
            className={
              "advanced-preference-options flex flex-wrap [&_label]:flex [&_label]:items-center [&_label]:gap-[6px] [&_label]:text-xs [&_label]:cursor-pointer [&_img]:object-contain [&&&&]:gap-[8px_14px]"
            }
          >
            {(config?.jobs ?? [])
              .filter(
                (job) =>
                  !config?.roleJobs.some((role) => role.id === job.id) &&
                  job.id !== 32,
              )
              .map((job) => (
                <label
                  className="[&&&&&]:min-h-9 [@media(pointer:coarse)]:[&&&&&]:min-h-11"
                  key={job.id}
                >
                  <input
                    className="size-4 shrink-0 accent-accent [&&&&&]:size-4 [&&&&&]:min-h-0 [&&&&&]:p-0"
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
