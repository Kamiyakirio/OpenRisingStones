/** In-memory advanced recruitment filtering after the consent-gated aggregation. */
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
} from "@/features/recruit/model/advancedRecruit";
import type {
  RecruitJob,
  RecruitSlotKey,
} from "@/features/recruit/model/recruit";
import { ADVANCED_RECRUIT_FIELD_KEYS } from "@/features/recruit/utils/advancedRecruitFilter";
import type { AdvancedRecruitViewModel } from "@/features/recruit/hooks/useAdvancedRecruitViewModel";
import {
  RecruitCard,
  RecruitDetailView,
} from "@/features/recruit/components/RecruitPage";
import "@/features/recruit/components/AdvancedRecruitPage.css";

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
  viewModel: AdvancedRecruitViewModel;
};

export function AdvancedRecruitPage({ viewModel }: AdvancedRecruitPageProps) {
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
    <main className="advanced-recruit-page" id="advanced-recruit">
      <header className="advanced-recruit-heading">
        <div>
          <h1>高级筛选</h1>
          <p>组合副本、空缺位置与字段规则，从完整公开招募中定位队伍。</p>
        </div>
        <div className="advanced-recruit-dataset-summary">
          <strong>{dataset.items.length}</strong>
          <span>条详情已聚合</span>
          {dataset.failedDetailCount > 0 && (
            <small>{dataset.failedDetailCount} 条详情读取失败</small>
          )}
        </div>
      </header>

      <section className="advanced-filter-workbench" aria-label="高级筛选条件">
        <header className="advanced-filter-heading">
          <div>
            <h2>组合条件</h2>
            <p>同类条件按所选方式匹配，不同类别之间同时满足。</p>
          </div>
          <button
            className="advanced-filter-reset"
            type="button"
            onClick={viewModel.clearFilters}
          >
            清除全部
          </button>
        </header>

        <div className="advanced-filter-primary">
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

        <details className="advanced-profession-filters">
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

        <div className="advanced-text-rules">
          <header>
            <div>
              <h2>关键词与正则规则</h2>
              <p>每条规则都可以独立指定要检索的字段。</p>
            </div>
            <div className="advanced-rule-toolbar">
              <div className="advanced-rule-mode" aria-label="规则组合方式">
                <button
                  className={
                    viewModel.filters.textRuleMode === "all" ? "active" : ""
                  }
                  type="button"
                  onClick={() => viewModel.setTextRuleMatchMode("all")}
                >
                  全部规则
                </button>
                <button
                  className={
                    viewModel.filters.textRuleMode === "any" ? "active" : ""
                  }
                  type="button"
                  onClick={() => viewModel.setTextRuleMatchMode("any")}
                >
                  任一规则
                </button>
              </div>
              <button
                className="advanced-add-rule"
                type="button"
                onClick={viewModel.addTextRule}
              >
                <Plus weight="bold" />
                添加规则
              </button>
            </div>
          </header>
          {viewModel.filters.textRules.length === 0 && (
            <div className="advanced-rule-empty">
              <strong>暂未添加字段规则</strong>
              <span>当前仅按副本、位置和职业条件筛选。</span>
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
        className="advanced-recruit-results"
        aria-labelledby="advanced-results-title"
      >
        <header>
          <div>
            <h2 id="advanced-results-title">筛选结果</h2>
            <p>
              {viewModel.ruleErrors.length
                ? "修正规则后显示结果"
                : `${viewModel.filteredItems.length} / ${dataset.items.length} 条招募`}
            </p>
          </div>
          <Funnel weight="duotone" />
        </header>
        {viewModel.ruleErrors.length ? (
          <div className="advanced-results-state error">
            <WarningCircle weight="duotone" />
            <strong>存在无效的正则规则</strong>
            <span>请根据规则下方提示修正表达式。</span>
          </div>
        ) : viewModel.filteredItems.length === 0 ? (
          <div className="advanced-results-state">
            <MagnifyingGlass weight="duotone" />
            <strong>没有符合全部条件的招募</strong>
            <span>减少筛选条件或切换为任一匹配。</span>
          </div>
        ) : (
          <div className="recruit-grid advanced-results-grid">
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
  viewModel: AdvancedRecruitViewModel;
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
    <main className="advanced-recruit-page">
      <section className="advanced-loading-panel">
        {viewModel.status === "error" ? (
          <WarningCircle weight="duotone" />
        ) : (
          <SpinnerGap className="spin" />
        )}
        <h1>
          {viewModel.status === "error"
            ? "高级招募初始化失败"
            : "正在聚合全部招募"}
        </h1>
        {viewModel.status === "error" ? (
          <>
            <p>{viewModel.error}</p>
            <button type="button" onClick={viewModel.retryInitialization}>
              <ArrowClockwise weight="bold" />
              重新初始化
            </button>
          </>
        ) : (
          <>
            <p>
              {progress?.stage === "rate_limit"
                ? `已暂停全部请求，仅保留一个探测 worker。第 ${progress.backoffAttempt} 次退避，${Math.ceil((progress.retryDelayMs ?? 0) / 1000)} 秒后探测`
                : progress?.stage === "detail"
                  ? `正在并行读取详情 ${progress.completed} / ${progress.total}`
                  : progress
                    ? `正在按频控读取列表 ${progress.completed} / ${progress.total}`
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
    <details className="advanced-picker">
      <summary>
        <span>
          <strong>副本</strong>
          <small>{selectedCount ? `已选 ${selectedCount} 项` : "不限"}</small>
        </span>
        <CaretDown weight="bold" />
      </summary>
      <div className="advanced-picker-content">
        <p>先选择首页使用的副本类别，再单选或多选具体副本。</p>
        <div className="advanced-duty-types" aria-label="副本类别">
          <button
            className={activeType ? "" : "active"}
            type="button"
            onClick={() => onTypeChange("")}
          >
            全部
          </button>
          {types.map((type) => (
            <button
              className={activeType === type ? "active" : ""}
              type="button"
              key={type}
              onClick={() => onTypeChange(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <label className="advanced-picker-search">
          <span>搜索具体副本</span>
          <input
            type="search"
            value={query}
            placeholder="输入副本名称"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <div className="advanced-picker-options duties">
          {items.map((item) => (
            <label key={`${item.type}-${item.label}`}>
              <input
                type="checkbox"
                checked={item.dutyNames.every((name) =>
                  selected.includes(name),
                )}
                onChange={() => onToggle(item.dutyNames)}
              />
              <span className="advanced-duty-type">{item.type}</span>
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
      className="advanced-position-filter"
      aria-labelledby="position-filter-title"
    >
      <header>
        <div>
          <strong id="position-filter-title">空缺位置</strong>
          <small>
            {selected.length ? `已选 ${selected.length} 项` : "不限"}
          </small>
        </div>
        <div className="advanced-position-mode" aria-label="位置匹配方式">
          <button
            className={mode === "any" ? "active" : ""}
            type="button"
            onClick={() => onModeChange("any")}
          >
            任一
          </button>
          <button
            className={mode === "all" ? "active" : ""}
            type="button"
            onClick={() => onModeChange("all")}
          >
            全部
          </button>
        </div>
      </header>
      <div className="advanced-position-options">
        {PARTY_POSITIONS.map((position) => (
          <button
            className={selected.includes(position) ? "active" : ""}
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
    <details className="advanced-picker">
      <summary>
        <span>
          <strong>{title}</strong>
          <small>
            {selected.length ? `已选 ${selected.length} 项` : "不限"}
          </small>
        </span>
        <CaretDown weight="bold" />
      </summary>
      <div className="advanced-picker-content">
        <div className="advanced-job-mode">
          <span>多选匹配方式</span>
          <button
            className={mode === "any" ? "active" : ""}
            type="button"
            onClick={() => onModeChange("any")}
          >
            任一
          </button>
          <button
            className={mode === "all" ? "active" : ""}
            type="button"
            onClick={() => onModeChange("all")}
          >
            全部
          </button>
        </div>
        <div className="advanced-picker-options jobs">
          {jobs.map((job) => (
            <label key={job.id}>
              <input
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
    <article className="advanced-rule-card">
      <div className="advanced-rule-inputs">
        <label>
          <span>规则类型</span>
          <span className="advanced-select-control">
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
        <legend>应用到字段（未选择时检索全部字段）</legend>
        {ADVANCED_RECRUIT_FIELD_KEYS.map((field) => (
          <label key={field}>
            <input
              type="checkbox"
              checked={rule.fields.includes(field)}
              onChange={() => onToggleField(field)}
            />
            {FIELD_LABELS[field]}
          </label>
        ))}
      </fieldset>
      {error && <p className="advanced-rule-error">{error}</p>}
    </article>
  );
}
