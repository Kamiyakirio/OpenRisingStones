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
} from "../models/advancedRecruit";
import type { RecruitJob } from "../models/recruit";
import { ADVANCED_RECRUIT_FIELD_KEYS } from "../utils/advancedRecruitFilter";
import type { AdvancedRecruitViewModel } from "../viewmodels/useAdvancedRecruitViewModel";
import { RecruitCard, RecruitDetailView } from "./RecruitPage";
import "./AdvancedRecruitPage.css";

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
          <span>内存数据集</span>
          <h1>高级筛选</h1>
          <p>组合副本、职业与字段规则，从完整公开招募中定位队伍。</p>
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
        <div className="advanced-filter-primary">
          <FilterPicker
            title="副本"
            description="可单选或多选，所选副本之间为任一匹配。"
            items={viewModel.dutyOptions}
            selected={viewModel.filters.dutyNames}
            query={viewModel.dutyQuery}
            onQueryChange={viewModel.setDutyQuery}
            onToggle={viewModel.toggleDuty}
          />
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

        <div className="advanced-text-rules">
          <header>
            <div>
              <h2>关键词与正则规则</h2>
              <p>每条规则都可以独立指定要检索的字段。</p>
            </div>
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
          </header>
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
          <button
            className="advanced-add-rule"
            type="button"
            onClick={viewModel.addTextRule}
          >
            <Plus weight="bold" />
            添加字段规则
          </button>
        </div>

        <footer className="advanced-filter-actions">
          <p>同一筛选类别内按所选模式匹配，不同类别之间同时满足。</p>
          <button type="button" onClick={viewModel.clearFilters}>
            清除全部条件
          </button>
        </footer>
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
              {progress?.stage === "detail"
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

function FilterPicker({
  title,
  description,
  items,
  selected,
  query,
  onQueryChange,
  onToggle,
}: {
  title: string;
  description: string;
  items: Array<{ id: string; label: string }>;
  selected: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (value: string) => void;
}) {
  const visibleItems = items.filter((item) =>
    item.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
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
        <p>{description}</p>
        <label className="advanced-picker-search">
          <span>搜索{title}</span>
          <input
            type="search"
            value={query}
            placeholder={`输入${title}名称`}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <div className="advanced-picker-options">
          {visibleItems.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => onToggle(item.id)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
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
