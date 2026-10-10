/** In-memory advanced recruitment filtering after the consent-gated aggregation. Checkbox indicators stay 16px; labels provide 36px/44px targets. */
import {
  ArrowClockwise,
  CaretDown,
  Funnel,
  MagnifyingGlass,
  Plus,
  SpinnerGap,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  type AdvancedRecruitField,
  type AdvancedRecruitTextRule,
} from "../advanced.types";
import type { AdvancedRecruitState } from "../hooks/useAdvancedRecruit";
import type { RecruitJob, RecruitSlotKey } from "../types";
import { ADVANCED_RECRUIT_FIELD_KEYS } from "../utils/advancedRecruitFilter";
import { AdvancedRecruitPreferences } from "./AdvancedRecruitPreferences";
import { RecruitCard, RecruitDetailView } from "./RecruitEntry";

const FIELD_LABELS: Record<AdvancedRecruitField, string> = {
  dutyName: "副本名称",
  teamDetail: "队伍详情",
  recruitRequirements: "招募要求",
  strategyDescription: "攻略说明",
  progress: "当前进度",
  schedule: "活动时间",
  strategy: "攻略方式",
  author: "发布者",
  location: "大区与服务器",
  labels: "标签",
};

const PARTY_POSITIONS: RecruitSlotKey[] = [
  "MT",
  "ST",
  "H1",
  "H2",
  "D1",
  "D2",
  "D3",
  "D4",
];

type AdvancedRecruitPageProps = {
  viewModel: AdvancedRecruitState;
};

export function AdvancedRecruitBrowser({
  viewModel,
}: AdvancedRecruitPageProps) {
  const dataset = viewModel.dataset;

  if (viewModel.selectedDetail) {
    return (
      <RecruitDetailView
        summary={viewModel.selectedDetail}
        detail={viewModel.selectedDetail}
        loading={false}
        error={null}
        jobsById={viewModel.jobsById}
        onBack={viewModel.closeDetail}
        onRetry={() => undefined}
      />
    );
  }

  if (viewModel.status !== "ready" || !dataset) {
    return <AdvancedRecruitLoading viewModel={viewModel} />;
  }

  return (
    <main
      className={
        "mx-auto w-full max-w-[1600px] px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 advanced-recruit-page [&&&&]:min-h-[calc(100dvh_-_74px)] [&&&&]:m-[0_auto] [&&&&]:w-[min(1280px,_100%)] [&&&&]:p-[20px_20px] [@media(max-width:_700px)]:[&&&&]:p-[28px_16px_48px]"
      }
      id="advanced-recruit"
    >
      <header
        className={
          "advanced-recruit-heading flex justify-between gap-[32px] mb-[28px] [&_>_div:first-child_>_span]:text-accent [&_>_div:first-child_>_span]:text-xs [&_h1]:m-0 [&_p]:m-0 [&_h1]:mt-[7px] [&_h1]:text-2xl [&_p]:mt-[13px] [&_p]:text-muted [&_p]:text-sm max-[700px]:items-start max-[700px]:flex-col [&&&&]:[align-items:end] [&&&&_>_div:first-child_>_span]:[font-weight:780] [&&&&_>_div:first-child_>_span]:[letter-spacing:normal] [&&&&_h1]:leading-[1.5] [&&&&_h1]:[letter-spacing:normal]"
        }
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">高级筛选</h1>
          <p>按副本、空缺位置和关键词筛选招募。</p>
        </div>
        <div
          className={
            "advanced-recruit-dataset-summary grid items-baseline min-w-[174px] rounded-[var(--ors-radius-control)] text-accent [&_span]:text-muted [&_span]:text-xs [&_small]:text-danger [&_small]:text-xs [&&&&]:grid-cols-[auto_auto] [&&&&]:gap-[4px_9px] [&&&&]:p-[16px_18px] [&&&&]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_40%,_var(--ors-color-line))] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_7%,_var(--ors-color-surface)_)] [&&&&_strong]:text-[24px] [&&&&_small]:[grid-column:1_/_-1]"
          }
        >
          <strong>{dataset.items.length}</strong>
          <span>条招募</span>
          {dataset.failedDetailCount > 0 && (
            <small>{dataset.failedDetailCount} 条详情读取失败</small>
          )}
        </div>
      </header>

      <section
        className={
          "advanced-filter-workbench @container/recruit-filters overflow-hidden border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface [&&&&]:shadow-[none]"
        }
        aria-label="高级筛选条件"
      >
        <header
          className={
            "advanced-filter-heading flex justify-between items-center gap-[20px] border-b border-solid border-line [&_h2]:m-0 [&_p]:m-0 [&_p]:mt-[4px] [&_p]:text-muted [&_p]:text-xs [&&&&]:p-[16px_20px] [&&&&_h2]:text-[15px]"
          }
        >
          <div>
            <h2 className="text-lg font-semibold">组合条件</h2>
            <p>同类条件按所选方式匹配，不同类别之间同时满足。</p>
          </div>
          <button
            className={
              "advanced-filter-reset inline-flex justify-center items-center min-h-[34px] border border-solid border-line rounded-[var(--ors-radius-control)] text-muted text-xs [&:hover]:text-ink [&:hover]:bg-hover [&&&&]:p-[0_11px] [&&&&]:[background:transparent] [&&&&]:[font-weight:730] [&&&&:hover]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_45%,_var(--ors-color-line)_)] [@media(max-width:_700px)]:[&&&&]:flex-[0_0_auto]"
            }
            type="button"
            onClick={viewModel.clearFilters}
          >
            清除全部
          </button>
        </header>

        <div
          className={
            "advanced-filter-primary grid gap-[12px] [&&&&]:grid-cols-[minmax(0,_1fr)] @min-[780px]/recruit-filters:[&&&&]:grid-cols-[minmax(0,_0.72fr)_minmax(0,_1.28fr)] [&&&&]:[align-items:start] [&&&&]:p-[16px_20px_18px] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_2.5%,_var(--ors-color-canvas)_)]"
          }
        >
          <DutyFilterPicker
            items={viewModel.dutyOptions}
            selected={viewModel.filters.dutyNames}
            selectedCount={viewModel.selectedDutyChoiceCount}
            types={viewModel.dutyTypes}
            activeType={viewModel.dutyType}
            query={viewModel.dutyQuery}
            onTypeChange={viewModel.setDutyType}
            onQueryChange={viewModel.setDutyQuery}
            onToggle={viewModel.toggleDutyChoice}
          />
          <PositionFilter
            selected={viewModel.filters.openPositions}
            mode={viewModel.filters.openPositionMode}
            onModeChange={viewModel.setOpenPositionMode}
            onToggle={viewModel.toggleOpenPosition}
          />
        </div>

        <details
          className={
            "advanced-profession-filters border-t border-solid border-line bg-surface [&_>_summary]:flex [&_>_summary]:justify-between [&_>_summary]:items-center [&_>_summary]:gap-[16px] [&_>_summary]:min-h-[52px] [&_>_summary]:cursor-pointer [&_>_summary::-webkit-details-marker]:hidden [&_>_summary_>_span]:grid [&_>_summary_>_span]:gap-[3px] [&_>_summary_small]:text-muted [&_>_summary_small]:text-xs [&_>_summary_>_svg]:w-[15px] [&_>_summary_>_svg]:h-[15px] [&_>_summary_>_svg]:text-muted [&[open]_>_summary_>_svg]:text-accent [&_>_div]:grid [&_>_div]:gap-[12px] [&&&&_>_summary]:p-[0_20px] [&&&&_>_summary]:[list-style:none] [&&&&_>_summary_strong]:text-[12px] [&&&&_>_summary_>_svg]:[transition:transform_160ms_ease] [&&&&[open]_>_summary_>_svg]:transform-[rotate(180deg)] [&&&&_>_div]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&&&_>_div]:p-[0_20px_20px] [@media(max-width:_920px)]:[&&&&_>_div]:grid-cols-[1fr]"
          }
        >
          <summary>
            <span>
              <strong>更多职业条件</strong>
              <small>
                {viewModel.filters.existingJobIds.length +
                viewModel.filters.missingJobIds.length
                  ? `已选 ${viewModel.filters.existingJobIds.length + viewModel.filters.missingJobIds.length} 项`
                  : "按具体职业筛选已有或缺少成员"}
              </small>
            </span>
            <CaretDown weight="bold" />
          </summary>
          <div>
            <JobFilterPicker
              title="已有职业"
              jobs={viewModel.existingJobs}
              selected={viewModel.filters.existingJobIds}
              mode={viewModel.filters.existingJobMode}
              onModeChange={viewModel.setExistingJobMode}
              onToggle={viewModel.toggleExistingJob}
            />
            <JobFilterPicker
              title="缺少职业"
              jobs={viewModel.missingJobs}
              selected={viewModel.filters.missingJobIds}
              mode={viewModel.filters.missingJobMode}
              onModeChange={viewModel.setMissingJobMode}
              onToggle={viewModel.toggleMissingJob}
            />
          </div>
        </details>

        <AdvancedRecruitPreferences viewModel={viewModel} />

        <div
          className={
            "advanced-text-rules grid gap-[10px] border-t border-solid border-line [&_>_header]:flex [&_>_header]:justify-between [&_>_header]:items-center [&_>_header]:gap-[20px] [&_h2]:m-0 [&_p]:m-0 [&_header_p]:mt-[4px] [&_header_p]:text-muted [&_header_p]:text-xs max-[700px]:[&_>_header]:items-start max-[700px]:[&_>_header]:flex-col [&&&&]:p-[18px_20px_20px] [&&&&_h2]:text-[16px]"
          }
        >
          <header>
            <div>
              <h2 className="text-lg font-semibold">关键词与正则规则</h2>
              <p>每条规则都可以独立指定要检索的字段。</p>
            </div>
            <div className="advanced-rule-toolbar flex items-center gap-[8px] max-[700px]:justify-between max-[700px]:w-full max-[460px]:w-full">
              <div
                className={
                  "advanced-rule-mode [&_button]:min-h-[29px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-muted [&_button]:text-xs flex gap-[5px] [&&&&_button]:p-[0_9px] [&&&&_button]:[background:transparent] [&&&&_button]:[font-weight:730] [@media(max-width:_460px)]:[&&&&]:flex-[1] [@media(max-width:_460px)]:[&&&&_button]:flex-[1]"
                }
                aria-label="规则组合方式"
              >
                <button
                  className={
                    viewModel.filters.textRuleMode === "all"
                      ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
                      : ""
                  }
                  type="button"
                  onClick={() => viewModel.setTextRuleMatchMode("all")}
                >
                  全部规则
                </button>
                <button
                  className={
                    viewModel.filters.textRuleMode === "any"
                      ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
                      : ""
                  }
                  type="button"
                  onClick={() => viewModel.setTextRuleMatchMode("any")}
                >
                  任一规则
                </button>
              </div>
              <button
                className={
                  "advanced-add-rule inline-flex justify-center items-center gap-[7px] min-h-[32px] border border-solid border-accent rounded-[var(--ors-radius-control)] text-on-accent bg-accent text-xs [&_svg]:w-[14px] [&_svg]:h-[14px] [&&&&]:p-[0_10px] [&&&&]:[font-weight:740]"
                }
                type="button"
                onClick={viewModel.addTextRule}
              >
                <Plus weight="bold" />
                添加规则
              </button>
            </div>
          </header>
          {viewModel.filters.textRules.length === 0 && (
            <div
              className={
                "advanced-rule-empty flex items-baseline gap-[9px] min-h-[44px] rounded-[var(--ors-radius-control)] text-muted text-xs [&_strong]:text-ink [&_strong]:text-xs max-[460px]:items-start max-[460px]:flex-col max-[460px]:gap-[3px] [&&&&]:p-[10px_12px] [&&&&]:[border:1px_dashed_var(--ors-color-line)] [&&&&]:[background:color-mix(in_srgb,_var(--ors-color-canvas)_70%,_transparent)]"
              }
            >
              <strong>尚未添加关键词规则</strong>
              <span>当前按上方的副本、位置、职业与偏好条件筛选。</span>
            </div>
          )}
          {viewModel.filters.textRules.map((rule) => (
            <TextRuleEditor
              key={rule.id}
              rule={rule}
              error={
                viewModel.ruleErrors.find((item) => item.ruleId === rule.id)
                  ?.message
              }
              onModeChange={(mode) => viewModel.setTextRuleKind(rule.id, mode)}
              onPatternChange={(pattern) =>
                viewModel.setTextRulePattern(rule.id, pattern)
              }
              onToggleField={(field) =>
                viewModel.toggleTextRuleField(rule.id, field)
              }
              onRemove={() => viewModel.removeTextRule(rule.id)}
            />
          ))}
        </div>
      </section>

      <section
        className={
          "advanced-recruit-results pt-[38px] [&_>_header]:flex [&_>_header]:justify-between [&_>_header]:gap-[20px] [&_>_header]:mb-[17px] [&_h2]:m-0 [&_p]:m-0 [&_h2]:text-lg [&_header_p]:mt-[5px] [&_header_p]:text-muted [&_header_p]:text-xs [&_header_>_svg]:w-[27px] [&_header_>_svg]:h-[27px] [&_header_>_svg]:text-accent [&&&&_>_header]:[align-items:end]"
        }
        aria-labelledby="advanced-results-title"
      >
        <header>
          <div>
            <h2 className="text-lg font-semibold" id="advanced-results-title">
              筛选结果
            </h2>
            <p>
              {viewModel.ruleErrors.length
                ? "修正规则后显示结果"
                : `${viewModel.filteredItems.length} / ${dataset.items.length} 条招募`}
            </p>
          </div>
          <Funnel weight="duotone" />
        </header>
        {viewModel.ruleErrors.length ? (
          <div
            className={
              "advanced-results-state error grid min-h-[260px] p-[30px] rounded-[var(--ors-radius-control)] text-center [&_>_svg]:w-[38px] [&_>_svg]:h-[38px] [&_>_svg]:text-accent [&_strong]:mt-[12px] [&_span]:mt-[6px] [&_span]:text-muted [&_span]:text-xs [.advanced-results-state&_>_svg]:text-danger [.advanced-results-state&_strong]:text-danger [button.recruit-config-note&]:text-danger [.recruit-feed-status&]:justify-start [.recruit-feed-status&]:border [.recruit-feed-status&]:border-solid [.recruit-feed-status&]:border-danger [.recruit-feed-status&]:rounded-[var(--ors-radius-control)] [.recruit-feed-status&]:text-danger [.recruit-feed-status&]:bg-surface [.recruit-feed-status&]:text-left [.recruit-feed-status&_>_div]:grid [.recruit-feed-status&_>_div]:gap-[3px] [.recruit-feed-status&_span]:text-xs max-[460px]:[.recruit-feed-status&]:items-start max-[460px]:[.recruit-feed-status&]:flex-wrap max-[460px]:[.recruit-feed-status&_button]:w-full [.log-outcome&]:text-danger [&&&&]:[justify-items:center] [&&&&]:[place-content:center] [&&&&]:[border:1px_dashed_var(--ors-color-line)] [&&&&_strong]:text-[15px] [button.recruit-config-note&&&&]:[text-decoration:underline] [button.recruit-config-note&&&&]:[text-underline-offset:3px] [.recruit-feed-status&&&&_>_div]:flex-[1]"
            }
          >
            <WarningCircle weight="duotone" />
            <strong>存在无效的正则规则</strong>
            <span>请根据规则下方提示修正表达式。</span>
          </div>
        ) : viewModel.filteredItems.length === 0 ? (
          <div
            className={
              "advanced-results-state grid min-h-[260px] p-[30px] rounded-[var(--ors-radius-control)] text-center [&_>_svg]:w-[38px] [&_>_svg]:h-[38px] [&_>_svg]:text-accent [&_strong]:mt-[12px] [&_span]:mt-[6px] [&_span]:text-muted [&_span]:text-xs [&&&&]:[justify-items:center] [&&&&]:[place-content:center] [&&&&]:[border:1px_dashed_var(--ors-color-line)] [&&&&_strong]:text-[15px]"
            }
          >
            <MagnifyingGlass weight="duotone" />
            <strong>没有符合全部条件的招募</strong>
            <span>减少筛选条件或切换为任一匹配。</span>
          </div>
        ) : (
          <div
            className={
              "recruit-grid advanced-results-grid grid gap-[12px] [&&&&]:grid-cols-[1fr] [@media(max-width:_1120px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_760px)]:[&&&&]:grid-cols-[1fr] [@media(max-width:_1199px)]:[&&&&]:grid-cols-[1fr]"
            }
          >
            {viewModel.filteredItems.map((item) => (
              <RecruitCard
                key={item.id}
                item={item}
                jobsById={viewModel.jobsById}
                onOpen={() => viewModel.openDetail(item)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function AdvancedRecruitLoading({
  viewModel,
}: {
  viewModel: AdvancedRecruitState;
}) {
  const progress = viewModel.progress;
  const percentage = progress
    ? Math.min(
        100,
        Math.max(
          1,
          Math.round((progress.overallCompleted / progress.overallTotal) * 100),
        ),
      )
    : 0;

  return (
    <main
      className={
        "mx-auto w-full max-w-[1600px] px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 advanced-recruit-page [&&&&]:min-h-[calc(100dvh_-_74px)] [&&&&]:m-[0_auto] [&&&&]:w-[min(1280px,_100%)] [&&&&]:p-[20px_20px] [@media(max-width:_700px)]:[&&&&]:p-[28px_16px_48px]"
      }
    >
      <section
        className={
          "advanced-loading-panel [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[7px] [&_button]:min-h-[38px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:text-xs grid min-h-[390px] border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface text-center p-[32px] [&_>_svg]:w-[46px] [&_>_svg]:h-[46px] [&_>_svg]:text-accent [&_h1]:text-2xl [&_p]:text-muted [&_progress]:h-[9px] [&_progress]:mt-[24px] [&_progress]:overflow-hidden [&_progress]:border-0 [&_progress]:rounded-[var(--ors-radius-control)] [&_progress]:text-accent [&_progress]:bg-hover [&_progress::-webkit-progress-bar]:rounded-[var(--ors-radius-control)] [&_progress::-webkit-progress-bar]:bg-hover [&_progress::-webkit-progress-value]:rounded-[var(--ors-radius-control)] [&_progress::-webkit-progress-value]:bg-accent [&_progress::-webkit-progress-value]:text-on-accent [&_progress::-moz-progress-bar]:rounded-[var(--ors-radius-control)] [&_progress::-moz-progress-bar]:bg-accent [&_progress::-moz-progress-bar]:text-on-accent [&_>_span]:mt-[8px] [&_>_span]:text-muted [&_>_span]:text-xs [&_button]:mt-[22px] max-[700px]:min-h-[330px] [&&&&_button]:p-[0_12px] [&&&&_button]:[font-weight:730] [&&&&]:[justify-items:center] [&&&&]:w-[min(680px,_100%)] [&&&&]:m-[clamp(30px,_8vh,_90px)_auto_0] [&&&&]:[place-content:center] [&&&&]:shadow-[none] [&&&&_h1]:m-[18px_0_0] [&&&&_p]:m-[10px_0_0] [&&&&_p]:text-[12px] [&&&&_progress]:w-[min(420px,_100%)] [&&&&_>_span]:[font-family:var(--ors-font-ui)] [@media(max-width:_700px)]:[&&&&]:p-[28px_20px]"
        }
      >
        {viewModel.status === "error" ? (
          <WarningCircle weight="duotone" />
        ) : (
          <SpinnerGap
            className={"spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"}
          />
        )}
        <h1 className="text-2xl font-bold tracking-tight">
          {viewModel.status === "error" ? "招募数据加载失败" : "正在加载招募"}
        </h1>
        {viewModel.status === "error" ? (
          <>
            <p>{viewModel.error}</p>
            <button type="button" onClick={viewModel.retryInitialization}>
              <ArrowClockwise weight="bold" />
              重新加载
            </button>
          </>
        ) : (
          <>
            <p>
              {progress?.stage === "rate_limit"
                ? `请求过于频繁，${Math.ceil((progress.retryDelayMs ?? 0) / 1000)} 秒后自动重试`
                : progress?.stage === "detail"
                  ? `正在加载招募详情 ${progress.completed} / ${progress.total}`
                  : progress
                    ? `正在加载招募列表 ${progress.completed} / ${progress.total}`
                    : "正在读取第一批公开招募"}
            </p>
            <progress value={percentage} max="100">
              {percentage}%
            </progress>
            <span>{percentage}%</span>
          </>
        )}
      </section>
    </main>
  );
}

function DutyFilterPicker({
  items,
  selected,
  selectedCount,
  types,
  activeType,
  query,
  onTypeChange,
  onQueryChange,
  onToggle,
}: {
  items: Array<{ label: string; type: string; dutyNames: string[] }>;
  selected: string[];
  selectedCount: number;
  types: string[];
  activeType: string;
  query: string;
  onTypeChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onToggle: (dutyNames: string[]) => void;
}) {
  return (
    <details
      className={
        "advanced-picker min-w-0 border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface [&_summary]:flex [&_summary]:justify-between [&_summary]:items-center [&_summary]:gap-[12px] [&_summary]:min-h-[64px] [&_summary]:cursor-pointer [&_summary::-webkit-details-marker]:hidden [&_summary_>_span]:grid [&_summary_>_span]:min-w-0 [&_summary_>_span]:gap-[3px] [&_summary_strong]:text-sm [&_summary_small]:text-muted [&_summary_small]:text-xs [&_summary_>_svg]:w-[15px] [&_summary_>_svg]:h-[15px] [&_summary_>_svg]:text-muted [&[open]_summary_>_svg]:text-accent [&&&&_summary]:p-[0_15px] [&&&&_summary]:[list-style:none] [&&&&_summary_>_svg]:flex-[0_0_auto] [&&&&_summary_>_svg]:[transition:transform_160ms_ease] [&&&&[open]_summary_>_svg]:transform-[rotate(180deg)]"
      }
    >
      <summary>
        <span>
          <strong>副本</strong>
          <small>{selectedCount ? `已选 ${selectedCount} 项` : "不限"}</small>
        </span>
        <CaretDown weight="bold" />
      </summary>
      <div
        className={
          "advanced-picker-content [&_>_p]:text-muted [&_>_p]:text-xs [&&&&]:p-[0_14px_14px] [&&&&_>_p]:m-[0_0_11px] [&&&&_>_p]:leading-[1.5]"
        }
      >
        <p>先选择首页使用的副本类别，再单选或多选具体副本。</p>
        <div
          className={
            "advanced-duty-types flex flex-wrap gap-[6px] mb-[11px] [&_button]:min-h-[30px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-muted [&_button]:text-xs [&_button:hover]:text-ink [&&&&_button]:p-[0_10px] [&&&&_button]:[background:transparent] [&&&&_button]:[font-weight:730] [&&&&_button:hover]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)]"
          }
          aria-label="副本类别"
        >
          <button
            className={
              activeType
                ? ""
                : 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
            }
            type="button"
            onClick={() => onTypeChange("")}
          >
            全部
          </button>
          {types.map((type) => (
            <button
              className={
                activeType === type
                  ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
                  : ""
              }
              type="button"
              key={type}
              onClick={() => onTypeChange(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <label
          className={
            "advanced-picker-search grid gap-[6px] [&_>_span]:text-muted [&_>_span]:text-xs [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[39px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:text-xs [&_input:focus]:border-accent [&_input::placeholder]:text-muted [&&&&_>_span]:[font-weight:720] [&&&&_input]:p-[0_11px] [&&&&_input]:[outline:0] [&&&&_input:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.76]"
          }
        >
          <span>搜索具体副本</span>
          <input
            type="search"
            value={query}
            placeholder="输入副本名称"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <div
          className={
            "advanced-picker-options duties grid gap-[4px] max-h-[230px] mt-[10px] overflow-auto [&_label]:flex [&_label]:items-center [&_label]:gap-[8px] [&_label]:min-h-[35px] [&_label]:rounded-[var(--ors-radius-control)] [&_label]:text-ink [&_label]:text-xs [&_label]:cursor-pointer [&_label:hover]:bg-hover [&_input]:w-[15px] [&_input]:h-[15px] [&_img]:w-[22px] [&_img]:h-[22px] [&_img]:object-contain [.advanced-picker-options&_label]:grid [&&&&]:[overscroll-behavior:contain] [&&&&_label]:p-[5px_8px] [&&&&_input]:flex-[0_0_auto] [&&&&_input]:[accent-color:var(--ors-color-accent)] [.advanced-picker-options&&&&_label]:grid-cols-[auto_auto_minmax(0,_1fr)]"
          }
        >
          {items.map((item) => (
            <label
              className="[&&&&&]:min-h-9 [@media(pointer:coarse)]:[&&&&&]:min-h-11"
              key={`${item.type}-${item.label}`}
            >
              <input
                className="size-4 shrink-0 accent-accent [&&&&&]:size-4 [&&&&&]:min-h-0 [&&&&&]:p-0"
                type="checkbox"
                checked={item.dutyNames.every((name) =>
                  selected.includes(name),
                )}
                onChange={() => onToggle(item.dutyNames)}
              />
              <span
                className={
                  "advanced-duty-type min-w-[46px] rounded-[var(--ors-radius-control)] text-accent text-xs text-center [&&&&]:p-[3px_6px] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [&&&&]:[font-weight:760]"
                }
              >
                {item.type}
              </span>
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

function PositionFilter({
  selected,
  mode,
  onModeChange,
  onToggle,
}: {
  selected: RecruitSlotKey[];
  mode: "any" | "all";
  onModeChange: (mode: "any" | "all") => void;
  onToggle: (position: RecruitSlotKey) => void;
}) {
  return (
    <section
      className={
        "advanced-position-filter grid gap-[11px] min-w-0 border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface [&_>_header]:flex [&_>_header]:justify-between [&_>_header]:items-center [&_>_header]:gap-[16px] [&_>_header_>_div:first-child]:grid [&_>_header_>_div:first-child]:gap-[3px] [&_strong]:text-sm [&_small]:text-muted [&_small]:text-xs [&_>_p]:text-muted [&_>_p]:text-xs [&_>_p]:m-0 min-[921px]:items-center min-[921px]:min-h-[64px] min-[921px]:[&_>_header]:contents min-[921px]:[&_>_p]:absolute min-[921px]:[&_>_p]:w-[1px] min-[921px]:[&_>_p]:h-[1px] min-[921px]:[&_>_p]:overflow-hidden min-[921px]:[&_>_p]:whitespace-nowrap [&&&&]:[align-content:center] [&&&&]:p-[13px_15px] [@media(min-width:_921px)]:[&&&&]:grid-cols-[max-content_minmax(0,_1fr)_max-content] [@media(min-width:_921px)]:[&&&&]:grid-rows-[1fr] [@media(min-width:_921px)]:[&&&&]:[align-content:normal] [@media(min-width:_921px)]:[&&&&]:p-[8px_12px] [@media(min-width:_921px)]:[&&&&_>_header_>_div:first-child]:[grid-column:1] [@media(min-width:_921px)]:[&&&&_>_header_>_div:first-child]:[grid-row:1] [@media(min-width:_921px)]:[&&&&_>_p]:[clip:rect(0_0_0_0)]"
      }
      aria-labelledby="position-filter-title"
    >
      <header>
        <div>
          <strong id="position-filter-title">空缺位置</strong>
          <small>
            {selected.length ? `已选 ${selected.length} 项` : "不限"}
          </small>
        </div>
        <div
          className={
            "advanced-position-mode flex gap-[5px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:text-muted [&_button]:min-h-[27px] [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-xs [&_button:hover]:text-ink [&&&&_button]:[background:transparent] [&&&&_button]:[font-weight:740] [&&&&_button]:p-[0_8px] [&&&&_button:hover]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [@media(min-width:_921px)]:[&&&&]:[grid-column:3] [@media(min-width:_921px)]:[&&&&]:[grid-row:1]"
          }
          aria-label="位置匹配方式"
        >
          <button
            className={
              mode === "any"
                ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
                : ""
            }
            type="button"
            onClick={() => onModeChange("any")}
          >
            任一
          </button>
          <button
            className={
              mode === "all"
                ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
                : ""
            }
            type="button"
            onClick={() => onModeChange("all")}
          >
            全部
          </button>
        </div>
      </header>
      <div
        className={
          "advanced-position-options gap-[5px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:text-muted grid [&_button]:min-h-[38px] [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-xs [&_button:hover]:text-ink [&&&&_button]:[background:transparent] [&&&&_button]:[font-weight:740] [&&&&]:grid-cols-[repeat(8,_minmax(0,_1fr))] [&&&&_button]:[font-family:var(--ors-font-ui)] [&&&&_button:hover]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [@media(min-width:_921px)]:[&&&&]:[grid-column:2] [@media(min-width:_921px)]:[&&&&]:[grid-row:1] [@media(max-width:_700px)]:[&&&&]:grid-cols-[repeat(4,_minmax(0,_1fr))]"
        }
      >
        {PARTY_POSITIONS.map((position) => (
          <button
            className={
              selected.includes(position)
                ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
                : ""
            }
            type="button"
            aria-pressed={selected.includes(position)}
            key={position}
            onClick={() => onToggle(position)}
          >
            {position}
          </button>
        ))}
      </div>
      <p>选择你想加入的空缺位置，支持多选。</p>
    </section>
  );
}

function JobFilterPicker({
  title,
  jobs,
  selected,
  mode,
  onModeChange,
  onToggle,
}: {
  title: string;
  jobs: RecruitJob[];
  selected: number[];
  mode: "any" | "all";
  onModeChange: (mode: "any" | "all") => void;
  onToggle: (value: number) => void;
}) {
  return (
    <details
      className={
        "advanced-picker min-w-0 border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface [&_summary]:flex [&_summary]:justify-between [&_summary]:items-center [&_summary]:gap-[12px] [&_summary]:min-h-[64px] [&_summary]:cursor-pointer [&_summary::-webkit-details-marker]:hidden [&_summary_>_span]:grid [&_summary_>_span]:min-w-0 [&_summary_>_span]:gap-[3px] [&_summary_strong]:text-sm [&_summary_small]:text-muted [&_summary_small]:text-xs [&_summary_>_svg]:w-[15px] [&_summary_>_svg]:h-[15px] [&_summary_>_svg]:text-muted [&[open]_summary_>_svg]:text-accent [&&&&_summary]:p-[0_15px] [&&&&_summary]:[list-style:none] [&&&&_summary_>_svg]:flex-[0_0_auto] [&&&&_summary_>_svg]:[transition:transform_160ms_ease] [&&&&[open]_summary_>_svg]:transform-[rotate(180deg)]"
      }
    >
      <summary>
        <span>
          <strong>{title}</strong>
          <small>
            {selected.length ? `已选 ${selected.length} 项` : "不限"}
          </small>
        </span>
        <CaretDown weight="bold" />
      </summary>
      <div
        className={
          "advanced-picker-content [&_>_p]:text-muted [&_>_p]:text-xs [&&&&]:p-[0_14px_14px] [&&&&_>_p]:m-[0_0_11px] [&&&&_>_p]:leading-[1.5]"
        }
      >
        <div
          className={
            "advanced-job-mode flex items-center gap-[6px] mb-[10px] [&_>_span]:text-muted [&_>_span]:text-xs [&_button]:min-h-[29px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-muted [&_button]:text-xs [&&&&_>_span]:[margin-right:auto] [&&&&_button]:p-[0_9px] [&&&&_button]:[background:transparent] [&&&&_button]:[font-weight:730]"
          }
        >
          <span>多选匹配方式</span>
          <button
            className={
              mode === "any"
                ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
                : ""
            }
            type="button"
            onClick={() => onModeChange("any")}
          >
            任一
          </button>
          <button
            className={
              mode === "all"
                ? 'active [.login-methods_button&]:text-ink [.detail-thumbnails_button&]:border-accent [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected [.tab-list_button&]:text-ink [.tab-list_button&::after]:absolute [.tab-list_button&::after]:h-[2px] [.tab-list_button&::after]:bg-accent [.tab-list_button&::after]:text-on-accent [.sort-control_button&]:text-accent [.sort-control_button&]:font-bold [.advanced-position-mode_button&]:border-accent [.advanced-position-mode_button&]:text-accent [.advanced-position-options_button&]:border-accent [.advanced-position-options_button&]:text-accent [.advanced-duty-types_button&]:border-accent [.advanced-duty-types_button&]:text-accent [.advanced-job-mode_button&]:text-accent [.advanced-rule-mode_button&]:text-accent [.login-methods_button&&&&::after]:transform-[scaleX(1)] [.detail-thumbnails_button&&&&]:opacity-[1] [.tab-list_button&&&&::after]:[content:""] [.tab-list_button&&&&::after]:left-[1px] [.tab-list_button&&&&::after]:right-[45%] [.tab-list_button&&&&::after]:bottom-[0] [.advanced-position-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-position-options_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_11%,_var(--ors-color-surface)_)] [.advanced-duty-types_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_10%,_var(--ors-color-surface)_)] [.advanced-job-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-job-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] [.advanced-rule-mode_button&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] [.advanced-rule-mode_button&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)]'
                : ""
            }
            type="button"
            onClick={() => onModeChange("all")}
          >
            全部
          </button>
        </div>
        <div
          className={
            "advanced-picker-options jobs grid gap-[4px] max-h-[230px] mt-[10px] overflow-auto [&_label]:flex [&_label]:items-center [&_label]:gap-[8px] [&_label]:min-h-[35px] [&_label]:rounded-[var(--ors-radius-control)] [&_label]:text-ink [&_label]:text-xs [&_label]:cursor-pointer [&_label:hover]:bg-hover [&_input]:w-[15px] [&_input]:h-[15px] [&_img]:w-[22px] [&_img]:h-[22px] [&_img]:object-contain [&&&&]:[overscroll-behavior:contain] [&&&&_label]:p-[5px_8px] [&&&&_input]:flex-[0_0_auto] [&&&&_input]:[accent-color:var(--ors-color-accent)]"
          }
        >
          {jobs.map((job) => (
            <label
              className="[&&&&&]:min-h-9 [@media(pointer:coarse)]:[&&&&&]:min-h-11"
              key={job.id}
            >
              <input
                className="size-4 shrink-0 accent-accent [&&&&&]:size-4 [&&&&&]:min-h-0 [&&&&&]:p-0"
                type="checkbox"
                checked={selected.includes(job.id)}
                onChange={() => onToggle(job.id)}
              />
              {job.icon && <img src={job.icon} alt="" width="22" height="22" />}
              <span>{job.name}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

function TextRuleEditor({
  rule,
  error,
  onModeChange,
  onPatternChange,
  onToggleField,
  onRemove,
}: {
  rule: AdvancedRecruitTextRule;
  error?: string;
  onModeChange: (mode: AdvancedRecruitTextRule["mode"]) => void;
  onPatternChange: (pattern: string) => void;
  onToggleField: (field: AdvancedRecruitField) => void;
  onRemove: () => void;
}) {
  return (
    <article
      className={
        "advanced-rule-card [&_fieldset_input]:w-[15px] [&_fieldset_input]:h-[15px] p-[14px] border border-solid border-line rounded-[var(--ors-radius-control)] bg-canvas [&_fieldset]:flex [&_fieldset]:flex-wrap [&_fieldset]:p-0 [&_fieldset]:border-0 [&_legend]:w-full [&_legend]:mb-[8px] [&_legend]:text-muted [&_legend]:text-xs [&_fieldset_label]:inline-flex [&_fieldset_label]:items-center [&_fieldset_label]:gap-[5px] [&_fieldset_label]:text-xs [&_fieldset_label]:cursor-pointer [&&&&_fieldset_input]:flex-[0_0_auto] [&&&&_fieldset_input]:[accent-color:var(--ors-color-accent)] [&&&&_fieldset]:gap-[7px_14px] [&&&&_fieldset]:m-[13px_0_0] [&&&&_legend]:[font-weight:720]"
      }
    >
      <div
        className={
          "advanced-rule-inputs [&_label_>_span:first-child]:text-muted [&_label_>_span:first-child]:text-xs [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[39px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input]:text-xs [&_select]:w-full [&_select]:min-w-0 [&_select]:min-h-[39px] [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[var(--ors-radius-control)] [&_select]:text-ink [&_select]:bg-canvas [&_select]:text-xs [&_input:focus]:border-accent [&_select:focus]:border-accent [&_input::placeholder]:text-muted grid gap-[10px] [&_label]:grid [&_label]:gap-[6px] [&_>_button]:grid [&_>_button]:place-items-center [&_>_button]:w-[39px] [&_>_button]:h-[39px] [&_>_button]:border [&_>_button]:border-solid [&_>_button]:border-danger [&_>_button]:rounded-[var(--ors-radius-control)] [&_>_button]:text-danger [&_>_button]:bg-surface [&_>_button_svg]:w-[16px] [&_>_button_svg]:h-[16px] max-[700px]:[&_label:nth-child(2)]:min-w-0 max-[460px]:[&_>_button]:w-full [&&&&_label_>_span:first-child]:[font-weight:720] [&&&&_input]:p-[0_11px] [&&&&_input]:[outline:0] [&&&&_select]:p-[0_11px] [&&&&_select]:[outline:0] [&&&&_input:focus]:shadow-[none] [&&&&_select:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.76] [&&&&]:grid-cols-[150px_minmax(220px,_1fr)_auto] [&&&&]:[align-items:end] [@media(max-width:_920px)]:[&&&&]:grid-cols-[130px_minmax(180px,_1fr)_auto] [@media(max-width:_700px)]:[&&&&]:grid-cols-[1fr_auto] [@media(max-width:_700px)]:[&&&&_label:first-child]:[grid-column:1_/_-1] [@media(max-width:_460px)]:[&&&&]:grid-cols-[1fr] [@media(max-width:_460px)]:[&&&&_label:first-child]:[grid-column:auto]"
        }
      >
        <label>
          <span>规则类型</span>
          <span
            className={
              "advanced-select-control relative block [&_select]:pr-[35px] [&_svg]:absolute [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:text-muted [&&&&_select]:[appearance:none] [&&&&_select]:[-webkit-appearance:none] [&&&&_svg]:top-[50%] [&&&&_svg]:right-[11px] [&&&&_svg]:[pointer-events:none] [&&&&_svg]:transform-[translateY(-50%)]"
            }
          >
            <select
              value={rule.mode}
              onChange={(event) =>
                onModeChange(
                  event.target.value as AdvancedRecruitTextRule["mode"],
                )
              }
            >
              <option value="keyword">关键词</option>
              <option value="regex">正则表达式</option>
            </select>
            <CaretDown weight="bold" />
          </span>
        </label>
        <label>
          <span>{rule.mode === "regex" ? "正则表达式" : "关键词"}</span>
          <input
            type="text"
            value={rule.pattern}
            placeholder={
              rule.mode === "regex" ? "/开荒|复健/i" : "输入要查找的文字"
            }
            onChange={(event) => onPatternChange(event.target.value)}
          />
        </label>
        <button type="button" aria-label="删除这条规则" onClick={onRemove}>
          <Trash />
        </button>
      </div>
      <fieldset>
        <legend>搜索范围（未选择时搜索全部内容）</legend>
        {ADVANCED_RECRUIT_FIELD_KEYS.map((field) => (
          <label
            className="[&&&&&]:min-h-9 [@media(pointer:coarse)]:[&&&&&]:min-h-11"
            key={field}
          >
            <input
              className="size-4 shrink-0 accent-accent [&&&&&]:size-4 [&&&&&]:min-h-0 [&&&&&]:p-0"
              type="checkbox"
              checked={rule.fields.includes(field)}
              onChange={() => onToggleField(field)}
            />
            {FIELD_LABELS[field]}
          </label>
        ))}
      </fieldset>
      {error && (
        <p
          className={
            "advanced-rule-error text-danger text-xs [&&&&]:m-[10px_0_0]!"
          }
        >
          {error}
        </p>
      )}
    </article>
  );
}
