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
import {
  advancedProfessionSummaryClasses,
  advancedProfessionChevronClasses,
  advancedSearchInputClasses,
  advancedProfessionButtonClasses,
} from "../utilityClasses";

/** Complete utility strings are shared without adding component CSS rules. */
const activeClasses =
  "active min-h-[29px] rounded-control border border-solid border-control bg-transparent px-[9px] py-0 text-xs font-[730] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] max-[460px]:flex-1";
const advancedFilterButtonClasses =
  "min-h-[29px] rounded-control border border-solid border-control bg-transparent px-[9px] py-0 text-xs font-[730] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] max-[460px]:flex-1";
const advancedPickerContentClasses =
  "advanced-picker-content px-3.5 pt-0 pb-3.5";
const advancedChoiceButtonClasses =
  "min-h-7.5 rounded-control border border-solid border-control bg-transparent px-2.5 py-0 text-xs font-[730] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-[color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] hover:text-ink";
const advancedChoiceActiveClasses =
  "active min-h-7.5 rounded-control border border-solid border-control bg-transparent px-2.5 py-0 text-xs font-[730] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-[color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] hover:text-ink";
const advancedCompactActiveClasses =
  "active min-h-[27px] rounded-control border border-solid border-control bg-transparent px-2 py-0 text-xs font-[740] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-[color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] hover:text-ink";
const advancedCompactChoiceClasses =
  "min-h-[27px] rounded-control border border-solid border-control bg-transparent px-2 py-0 text-xs font-[740] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-[color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] hover:text-ink";
const advancedProfessionActiveClasses =
  "active min-h-[29px] rounded-control border border-solid border-control bg-transparent px-[9px] py-0 text-xs font-[730] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease]";

/** Reused presentation strings stay static and are allocated once for this module. */
const advancedPageClasses =
  "advanced-recruit-page mx-auto min-h-[calc(100dvh_-_74px)] w-full max-w-320 p-5 max-[700px]:px-4 max-[700px]:pt-7 max-[700px]:pb-12";

const advancedPickerClasses =
  "advanced-picker group/advanced-picker min-w-0 rounded-control border border-solid border-line bg-surface";
const advancedPickerSummaryClasses =
  "flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-[15px] py-0 [&::-webkit-details-marker]:hidden";
const advancedPickerChevronClasses =
  "h-[15px] w-[15px] shrink-0 text-muted [transition:transform_160ms_ease] group-open/advanced-picker:transform-[rotate(180deg)] group-open/advanced-picker:text-accent";

const advancedCheckboxClasses =
  "size-4 min-h-0 shrink-0 p-0 [accent-color:var(--ors-color-accent)]";

const advancedFieldClasses =
  "grid gap-1.5 max-[700px]:first:col-span-full max-[700px]:nth-[2]:min-w-0 max-[460px]:first:col-auto";

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
    <main className={advancedPageClasses} id="advanced-recruit">
      <header className="advanced-recruit-heading mb-7 flex items-end justify-between gap-8 max-[700px]:flex-col max-[700px]:items-start">
        <div>
          <h1 className="m-0 mt-[7px] text-2xl leading-[1.5] font-bold tracking-normal">
            高级筛选
          </h1>
          <p className="m-0 mt-[13px] text-sm text-muted">
            按副本、空缺位置和关键词筛选招募。
          </p>
        </div>
        <div className="advanced-recruit-dataset-summary grid min-w-43.5 grid-cols-[auto_auto] items-baseline gap-[4px_9px] rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-accent)_7%,_var(--ors-color-surface)_)] px-4.5 py-4 text-accent [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_40%,_var(--ors-color-line))]">
          <strong className="text-[24px]">{dataset.items.length}</strong>
          <span className="text-xs font-[780] tracking-normal text-muted">
            条招募
          </span>
          {dataset.failedDetailCount > 0 && (
            <small className="col-span-full text-xs text-danger">
              {dataset.failedDetailCount} 条详情读取失败
            </small>
          )}
        </div>
      </header>

      <section
        className="advanced-filter-workbench @container/recruit-filters overflow-hidden rounded-control border border-solid border-line bg-surface shadow-[none]"
        aria-label="高级筛选条件"
      >
        <header className="advanced-filter-heading flex items-center justify-between gap-5 border-b border-solid border-line px-5 py-4">
          <div>
            <h2 className="m-0 text-lg text-[15px] font-semibold">组合条件</h2>
            <p className="m-0 mt-1 text-xs text-muted">
              同类条件按所选方式匹配，不同类别之间同时满足。
            </p>
          </div>
          <button
            className="advanced-filter-reset inline-flex min-h-8.5 items-center justify-center rounded-control border border-solid border-line bg-transparent px-[11px] py-0 text-xs font-[730] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-[color-mix(_in_srgb,_var(--ors-color-accent)_45%,_var(--ors-color-line)_)] hover:bg-hover hover:text-ink max-[700px]:shrink-0"
            type="button"
            onClick={viewModel.clearFilters}
          >
            清除全部
          </button>
        </header>

        <div className="advanced-filter-primary grid grid-cols-1 items-start gap-3 bg-[color-mix(_in_srgb,_var(--ors-color-accent)_2.5%,_var(--ors-color-canvas)_)] px-5 pt-4 pb-4.5 @min-[780px]/recruit-filters:grid-cols-[minmax(0,_0.72fr)_minmax(0,_1.28fr)]">
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

        <details className="advanced-profession-filters group/advanced-profession-filters border-t border-solid border-line bg-surface">
          <summary className={advancedProfessionSummaryClasses}>
            <span className="grid gap-[3px]">
              <strong className="text-[12px]">更多职业条件</strong>
              <small className="text-xs text-muted">
                {viewModel.filters.existingJobIds.length +
                viewModel.filters.missingJobIds.length
                  ? `已选 ${viewModel.filters.existingJobIds.length + viewModel.filters.missingJobIds.length} 项`
                  : "按具体职业筛选已有或缺少成员"}
              </small>
            </span>
            <CaretDown
              className={advancedProfessionChevronClasses}
              weight="bold"
            />
          </summary>
          <div className="grid grid-cols-2 gap-3 px-5 pt-0 pb-5 max-[920px]:grid-cols-[1fr]">
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

        <div className="advanced-text-rules grid gap-2.5 border-t border-solid border-line px-5 pt-4.5 pb-5">
          <header className="flex items-center justify-between gap-5 max-[700px]:flex-col max-[700px]:items-start">
            <div>
              <h2 className="m-0 text-lg text-[16px] font-semibold">
                关键词与正则规则
              </h2>
              <p className="m-0 mt-1 text-xs text-muted">
                每条规则都可以独立指定要检索的字段。
              </p>
            </div>
            <div className="advanced-rule-toolbar flex items-center gap-2 max-[700px]:w-full max-[700px]:justify-between max-[460px]:w-full">
              <div
                className="advanced-rule-mode flex gap-[5px] max-[460px]:flex-1"
                aria-label="规则组合方式"
              >
                <button
                  className={
                    viewModel.filters.textRuleMode === "all"
                      ? activeClasses
                      : advancedFilterButtonClasses
                  }
                  type="button"
                  onClick={() => viewModel.setTextRuleMatchMode("all")}
                >
                  全部规则
                </button>
                <button
                  className={
                    viewModel.filters.textRuleMode === "any"
                      ? activeClasses
                      : advancedFilterButtonClasses
                  }
                  type="button"
                  onClick={() => viewModel.setTextRuleMatchMode("any")}
                >
                  任一规则
                </button>
              </div>
              <button
                className="advanced-add-rule inline-flex min-h-8 items-center justify-center gap-[7px] rounded-control border border-solid border-accent bg-accent px-2.5 py-0 text-xs font-[740] text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease]"
                type="button"
                onClick={viewModel.addTextRule}
              >
                <Plus className="h-3.5 w-3.5" weight="bold" />
                添加规则
              </button>
            </div>
          </header>
          {viewModel.filters.textRules.length === 0 && (
            <div className="advanced-rule-empty flex min-h-11 items-baseline gap-[9px] rounded-control bg-[color-mix(in_srgb,_var(--ors-color-canvas)_70%,_transparent)] px-3 py-2.5 text-xs text-muted [border:1px_dashed_var(--ors-color-line)] max-[460px]:flex-col max-[460px]:items-start max-[460px]:gap-[3px]">
              <strong className="text-xs text-ink">尚未添加关键词规则</strong>
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
        className="advanced-recruit-results pt-9.5"
        aria-labelledby="advanced-results-title"
      >
        <header className="mb-[17px] flex items-end justify-between gap-5">
          <div>
            <h2
              className="m-0 text-lg font-semibold"
              id="advanced-results-title"
            >
              筛选结果
            </h2>
            <p className="m-0 mt-[5px] text-xs text-muted">
              {viewModel.ruleErrors.length
                ? "修正规则后显示结果"
                : `${viewModel.filteredItems.length} / ${dataset.items.length} 条招募`}
            </p>
          </div>
          <Funnel className="h-[27px] w-[27px] text-accent" weight="duotone" />
        </header>
        {viewModel.ruleErrors.length ? (
          <div className="advanced-results-state error grid min-h-65 [place-content:center] justify-items-center rounded-control p-7.5 text-center [border:1px_dashed_var(--ors-color-line)]">
            <WarningCircle
              className="h-9.5 w-9.5 text-danger"
              weight="duotone"
            />
            <strong className="mt-3 text-[15px] text-danger">
              存在无效的正则规则
            </strong>
            <span className="mt-1.5 text-xs text-muted">
              请根据规则下方提示修正表达式。
            </span>
          </div>
        ) : viewModel.filteredItems.length === 0 ? (
          <div className="advanced-results-state grid min-h-65 [place-content:center] justify-items-center rounded-control p-7.5 text-center [border:1px_dashed_var(--ors-color-line)]">
            <MagnifyingGlass
              className="h-9.5 w-9.5 text-accent"
              weight="duotone"
            />
            <strong className="mt-3 text-[15px]">没有符合全部条件的招募</strong>
            <span className="mt-1.5 text-xs text-muted">
              减少筛选条件或切换为任一匹配。
            </span>
          </div>
        ) : (
          <div className="recruit-grid advanced-results-grid grid grid-cols-[1fr] gap-3 max-[1199px]:grid-cols-[1fr] max-[1120px]:grid-cols-2 max-[760px]:grid-cols-[1fr]">
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
    <main className={advancedPageClasses}>
      <section className="advanced-loading-panel mx-auto mt-[clamp(30px,_8vh,_90px)] grid min-h-97.5 w-[min(680px,_100%)] [place-content:center] justify-items-center rounded-control border border-solid border-line bg-surface p-8 text-center shadow-[none] max-[700px]:min-h-82.5 max-[700px]:px-5 max-[700px]:py-7">
        {viewModel.status === "error" ? (
          <WarningCircle
            className="h-11.5 w-11.5 text-accent"
            weight="duotone"
          />
        ) : (
          <SpinnerGap className="spin h-11.5 w-11.5 animate-[login-spin_900ms_linear_infinite] text-accent" />
        )}
        <h1 className="mx-0 mt-4.5 mb-0 text-2xl font-bold tracking-tight">
          {viewModel.status === "error" ? "招募数据加载失败" : "正在加载招募"}
        </h1>
        {viewModel.status === "error" ? (
          <>
            <p className="mx-0 mt-2.5 mb-0 text-[12px] text-muted">
              {viewModel.error}
            </p>
            <button
              className="mt-5.5 inline-flex min-h-9.5 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-surface px-3 py-0 text-xs font-[730] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease]"
              type="button"
              onClick={viewModel.retryInitialization}
            >
              <ArrowClockwise weight="bold" />
              重新加载
            </button>
          </>
        ) : (
          <>
            <p className="mx-0 mt-2.5 mb-0 text-[12px] text-muted">
              {progress?.stage === "rate_limit"
                ? `请求过于频繁，${Math.ceil((progress.retryDelayMs ?? 0) / 1000)} 秒后自动重试`
                : progress?.stage === "detail"
                  ? `正在加载招募详情 ${progress.completed} / ${progress.total}`
                  : progress
                    ? `正在加载招募列表 ${progress.completed} / ${progress.total}`
                    : "正在读取第一批公开招募"}
            </p>
            <progress
              className="mt-6 h-[9px] w-[min(420px,_100%)] overflow-hidden rounded-control border-0 bg-hover text-accent [&::-moz-progress-bar]:rounded-control [&::-moz-progress-bar]:bg-accent [&::-moz-progress-bar]:text-on-accent [&::-webkit-progress-bar]:rounded-control [&::-webkit-progress-bar]:bg-hover [&::-webkit-progress-value]:rounded-control [&::-webkit-progress-value]:bg-accent [&::-webkit-progress-value]:text-on-accent"
              value={percentage}
              max="100"
            >
              {percentage}%
            </progress>
            <span className="mt-2 font-sans text-xs text-muted">
              {percentage}%
            </span>
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
  items: Array<{
    label: string;
    type: string;
    dutyNames: string[];
  }>;
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
    <details className={advancedPickerClasses}>
      <summary className={advancedPickerSummaryClasses}>
        <span className="grid min-w-0 gap-[3px]">
          <strong className="text-sm">副本</strong>
          <small className="text-xs text-muted">
            {selectedCount ? `已选 ${selectedCount} 项` : "不限"}
          </small>
        </span>
        <CaretDown className={advancedPickerChevronClasses} weight="bold" />
      </summary>
      <div className={advancedPickerContentClasses}>
        <p className="mx-0 mt-0 mb-[11px] text-xs leading-[1.5] text-muted">
          先选择首页使用的副本类别，再单选或多选具体副本。
        </p>
        <div
          className="advanced-duty-types mb-[11px] flex flex-wrap gap-1.5"
          aria-label="副本类别"
        >
          <button
            className={
              activeType
                ? advancedChoiceButtonClasses
                : advancedChoiceActiveClasses
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
                  ? advancedChoiceActiveClasses
                  : advancedChoiceButtonClasses
              }
              type="button"
              key={type}
              onClick={() => onTypeChange(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <label className="advanced-picker-search grid gap-1.5">
          <span className="text-xs font-[720] text-muted">搜索具体副本</span>
          <input
            className={advancedSearchInputClasses}
            type="search"
            value={query}
            placeholder="输入副本名称"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <div className="advanced-picker-options duties mt-2.5 grid max-h-57.5 gap-1 overflow-auto [overscroll-behavior:contain]">
          {items.map((item) => (
            <label
              className="grid min-h-9 cursor-pointer grid-cols-[auto_auto_minmax(0,_1fr)] items-center gap-2 rounded-control px-2 py-[5px] text-xs text-ink hover:bg-hover [@media(pointer:coarse)]:min-h-11"
              key={`${item.type}-${item.label}`}
            >
              <input
                className={advancedCheckboxClasses}
                type="checkbox"
                checked={item.dutyNames.every((name) =>
                  selected.includes(name),
                )}
                onChange={() => onToggle(item.dutyNames)}
              />
              <span className="advanced-duty-type min-w-11.5 rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-accent)_9%,_var(--ors-color-surface)_)] px-1.5 py-[3px] text-center text-xs font-[760] text-accent">
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
      className="advanced-position-filter grid min-w-0 content-center gap-[11px] rounded-control border border-solid border-line bg-surface px-[15px] py-[13px] min-[921px]:min-h-16 min-[921px]:grid-cols-[max-content_minmax(0,_1fr)_max-content] min-[921px]:grid-rows-[1fr] min-[921px]:content-normal min-[921px]:items-center min-[921px]:px-3 min-[921px]:py-2"
      aria-labelledby="position-filter-title"
    >
      <header className="flex items-center justify-between gap-4 min-[921px]:contents">
        <div className="first:grid first:gap-[3px] min-[921px]:first:col-start-1 min-[921px]:first:row-start-1">
          <strong className="text-sm" id="position-filter-title">
            空缺位置
          </strong>
          <small className="text-xs text-muted">
            {selected.length ? `已选 ${selected.length} 项` : "不限"}
          </small>
        </div>
        <div
          className="advanced-position-mode flex gap-[5px] first:grid first:gap-[3px] min-[921px]:col-start-3 min-[921px]:row-start-1 min-[921px]:first:col-start-1 min-[921px]:first:row-start-1"
          aria-label="位置匹配方式"
        >
          <button
            className={
              mode === "any"
                ? advancedCompactActiveClasses
                : advancedCompactChoiceClasses
            }
            type="button"
            onClick={() => onModeChange("any")}
          >
            任一
          </button>
          <button
            className={
              mode === "all"
                ? advancedCompactActiveClasses
                : advancedCompactChoiceClasses
            }
            type="button"
            onClick={() => onModeChange("all")}
          >
            全部
          </button>
        </div>
      </header>
      <div className="advanced-position-options grid grid-cols-8 gap-[5px] max-[700px]:grid-cols-4 min-[921px]:col-start-2 min-[921px]:row-start-1">
        {PARTY_POSITIONS.map((position) => (
          <button
            className={
              selected.includes(position)
                ? "active min-h-9.5 rounded-control border border-solid border-control bg-transparent font-sans text-xs font-[740] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-[color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] hover:text-ink"
                : "min-h-9.5 rounded-control border border-solid border-control bg-transparent font-sans text-xs font-[740] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-[color-mix(_in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line)_)] hover:text-ink"
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
      <p className="m-0 text-xs text-muted min-[921px]:absolute min-[921px]:h-px min-[921px]:w-px min-[921px]:overflow-hidden min-[921px]:whitespace-nowrap min-[921px]:[clip:rect(0_0_0_0)]">
        选择你想加入的空缺位置，支持多选。
      </p>
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
    <details className={advancedPickerClasses}>
      <summary className={advancedPickerSummaryClasses}>
        <span className="grid min-w-0 gap-[3px]">
          <strong className="text-sm">{title}</strong>
          <small className="text-xs text-muted">
            {selected.length ? `已选 ${selected.length} 项` : "不限"}
          </small>
        </span>
        <CaretDown className={advancedPickerChevronClasses} weight="bold" />
      </summary>
      <div className={advancedPickerContentClasses}>
        <div className="advanced-job-mode mb-2.5 flex items-center gap-1.5">
          <span className="[margin-right:auto] text-xs text-muted">
            多选匹配方式
          </span>
          <button
            className={
              mode === "any"
                ? advancedProfessionActiveClasses
                : advancedProfessionButtonClasses
            }
            type="button"
            onClick={() => onModeChange("any")}
          >
            任一
          </button>
          <button
            className={
              mode === "all"
                ? advancedProfessionActiveClasses
                : advancedProfessionButtonClasses
            }
            type="button"
            onClick={() => onModeChange("all")}
          >
            全部
          </button>
        </div>
        <div className="advanced-picker-options jobs mt-2.5 grid max-h-57.5 gap-1 overflow-auto [overscroll-behavior:contain]">
          {jobs.map((job) => (
            <label
              className="flex min-h-9 cursor-pointer items-center gap-2 rounded-control px-2 py-[5px] text-xs text-ink hover:bg-hover [@media(pointer:coarse)]:min-h-11"
              key={job.id}
            >
              <input
                className={advancedCheckboxClasses}
                type="checkbox"
                checked={selected.includes(job.id)}
                onChange={() => onToggle(job.id)}
              />
              {job.icon && (
                <img
                  className="h-5.5 w-5.5 object-contain"
                  src={job.icon}
                  alt=""
                  width="22"
                  height="22"
                />
              )}
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
    <article className="advanced-rule-card rounded-control border border-solid border-line bg-canvas p-3.5">
      <div className="advanced-rule-inputs grid grid-cols-[150px_minmax(220px,_1fr)_auto] items-end gap-2.5 max-[920px]:grid-cols-[130px_minmax(180px,_1fr)_auto] max-[700px]:grid-cols-[1fr_auto] max-[460px]:grid-cols-[1fr]">
        <label className={advancedFieldClasses}>
          <span className="first:text-xs first:font-[720] first:text-muted">
            规则类型
          </span>
          <span className="advanced-select-control relative block first:text-xs first:font-[720] first:text-muted">
            <select
              className="min-h-[39px] w-full min-w-0 [appearance:none] rounded-control border border-solid border-control bg-canvas px-[11px] py-0 text-xs text-ink outline-none [-webkit-appearance:none] focus:border-accent focus:shadow-[none]"
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
            <CaretDown
              className="[pointer-events:none] absolute top-1/2 right-[11px] h-3.5 w-3.5 transform-[translateY(-50%)] text-muted"
              weight="bold"
            />
          </span>
        </label>
        <label className={advancedFieldClasses}>
          <span className="first:text-xs first:font-[720] first:text-muted">
            {rule.mode === "regex" ? "正则表达式" : "关键词"}
          </span>
          <input
            className={advancedSearchInputClasses}
            type="text"
            value={rule.pattern}
            placeholder={
              rule.mode === "regex" ? "/开荒|复健/i" : "输入要查找的文字"
            }
            onChange={(event) => onPatternChange(event.target.value)}
          />
        </label>
        <button
          className="grid h-[39px] min-h-9 w-[39px] place-items-center rounded-control border border-solid border-danger bg-surface text-danger transition-[background-color,color,border-color] duration-120 ease-[ease] max-[460px]:w-full pointer-coarse:min-h-11"
          type="button"
          aria-label="删除这条规则"
          onClick={onRemove}
        >
          <Trash className="h-4 w-4" />
        </button>
      </div>
      <fieldset className="mx-0 mt-[13px] mb-0 flex flex-wrap gap-[7px_14px] border-0 p-0">
        <legend className="mb-2 w-full text-xs font-[720] text-muted">
          搜索范围（未选择时搜索全部内容）
        </legend>
        {ADVANCED_RECRUIT_FIELD_KEYS.map((field) => (
          <label
            className="inline-flex min-h-9 cursor-pointer items-center gap-[5px] text-xs [@media(pointer:coarse)]:min-h-11"
            key={field}
          >
            <input
              className={advancedCheckboxClasses}
              type="checkbox"
              checked={rule.fields.includes(field)}
              onChange={() => onToggleField(field)}
            />
            {FIELD_LABELS[field]}
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="advanced-rule-error m-0 mx-0! mt-2.5! mb-0! text-xs text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
