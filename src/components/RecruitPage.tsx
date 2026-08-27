/** Public recruitment browser with filters, party composition, and full details. */
import {
  ArrowLeft,
  ArrowRight,
  CalendarDots,
  CaretDown,
  ChatCircleDots,
  CheckCircle,
  Clock,
  FadersHorizontal,
  MagnifyingGlass,
  MapPin,
  Path,
  ShieldCheck,
  UsersThree,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type {
  RecruitDetail,
  RecruitJob,
  RecruitSlot,
  RecruitSummary,
} from "../models/recruit";
import type { RecruitViewModel } from "../viewmodels/useRecruitViewModel";
import "./RecruitPage.css";

type RecruitPageProps = {
  viewModel: RecruitViewModel;
};

export function RecruitPage({ viewModel }: RecruitPageProps) {
  const jobsById = useMemo(
    () =>
      new Map(
        (viewModel.config?.jobs ?? []).map((job) => [job.id, job] as const),
      ),
    [viewModel.config],
  );

  if (viewModel.selectedRecruit) {
    return (
      <RecruitDetailView
        summary={viewModel.selectedRecruit}
        detail={viewModel.detail}
        loading={viewModel.detailLoading}
        error={viewModel.detailError}
        jobsById={jobsById}
        onBack={viewModel.closeDetail}
        onRetry={viewModel.retryDetail}
      />
    );
  }

  return (
    <main className="recruit-page" id="recruit-list">
      <RecruitIntro total={viewModel.total} loading={viewModel.loading} />
      <RecruitFilters viewModel={viewModel} />
      <section
        className="recruit-results"
        aria-labelledby="recruit-results-title"
      >
        <header className="recruit-results-header">
          <div>
            <h2 id="recruit-results-title">正在招募的队伍</h2>
            <p>
              {viewModel.loading
                ? "正在读取最新招募"
                : viewModel.activeFilterCount
                  ? `已按 ${viewModel.activeFilterCount} 项条件筛选，共 ${viewModel.total} 条`
                  : `共 ${viewModel.total} 条公开招募`}
            </p>
          </div>
          {!viewModel.loading && viewModel.total > 0 && (
            <span className="recruit-page-indicator">
              已显示 {viewModel.items.length} / {viewModel.total}
            </span>
          )}
        </header>

        {viewModel.loading ? (
          <RecruitSkeleton />
        ) : viewModel.error ? (
          <RecruitState
            icon={<WarningCircle weight="duotone" />}
            title="招募列表暂时无法读取"
            description={viewModel.error}
            action="重新加载"
            onAction={viewModel.retry}
          />
        ) : viewModel.items.length === 0 ? (
          <RecruitState
            icon={<MagnifyingGlass weight="duotone" />}
            title="没有找到符合条件的招募"
            description="调整副本或招募大区后再试。"
            action="清除筛选"
            onAction={viewModel.clearFilters}
          />
        ) : (
          <>
            <div className="recruit-grid">
              {viewModel.items.map((item) => (
                <RecruitCard
                  key={item.id}
                  item={item}
                  jobsById={jobsById}
                  onOpen={() => viewModel.openDetail(item)}
                />
              ))}
            </div>
            {viewModel.loadingMore && (
              <RecruitSkeleton count={3} continuation />
            )}
          </>
        )}

        {!viewModel.loading && !viewModel.error && viewModel.total > 0 && (
          <RecruitFeedContinuation
            loaded={viewModel.items.length}
            total={viewModel.total}
            canLoadMore={viewModel.canLoadMore}
            loading={viewModel.loadingMore}
            error={viewModel.loadMoreError}
            onLoadMore={viewModel.loadMore}
            onRetry={viewModel.retry}
          />
        )}
      </section>
    </main>
  );
}

function RecruitIntro({ total, loading }: { total: number; loading: boolean }) {
  return (
    <section className="recruit-intro" aria-labelledby="recruit-heading">
      <div>
        <p className="recruit-kicker">公开招募大厅</p>
        <h1 id="recruit-heading">找到适合你的下一支队伍。</h1>
        <p>浏览石之家公开招募，无需登录。按副本和招募大区快速定位。</p>
      </div>
      <div className="recruit-intro-mark" aria-hidden="true">
        <UsersThree weight="duotone" />
        <strong>{loading ? "···" : total}</strong>
        <span>条招募</span>
      </div>
    </section>
  );
}

function RecruitFilters({ viewModel }: { viewModel: RecruitViewModel }) {
  const dutyTypes = unique(
    (viewModel.config?.duties ?? []).map((duty) => duty.type),
  );
  const dutyOptions = (viewModel.config?.duties ?? []).filter(
    (duty) =>
      !viewModel.draftFilters.dutyType ||
      duty.type === viewModel.draftFilters.dutyType,
  );

  return (
    <section
      className="recruit-filter-panel"
      aria-labelledby="recruit-filter-title"
    >
      <header>
        <div>
          <FadersHorizontal weight="duotone" />
          <div>
            <h2 id="recruit-filter-title">筛选队伍</h2>
            <p>条件会同时作用于石之家的公开招募列表。</p>
          </div>
        </div>
        {viewModel.activeFilterCount > 0 && (
          <button
            className="recruit-filter-clear"
            type="button"
            onClick={viewModel.clearFilters}
          >
            <X weight="bold" />
            清除
          </button>
        )}
      </header>
      <form
        className="recruit-filter-form"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.applyFilters();
        }}
      >
        <label>
          <span>副本类型</span>
          <span className="recruit-select-control">
            <select
              value={viewModel.draftFilters.dutyType}
              onChange={(event) =>
                viewModel.setFilter("dutyType", event.target.value)
              }
            >
              <option value="">全部类型</option>
              {dutyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <CaretDown weight="bold" aria-hidden="true" />
          </span>
        </label>
        <label>
          <span>副本名称</span>
          <input
            type="search"
            list="recruit-duty-options"
            value={viewModel.draftFilters.dutyName}
            placeholder="输入或选择副本"
            onChange={(event) =>
              viewModel.setFilter("dutyName", event.target.value)
            }
          />
          <datalist id="recruit-duty-options">
            {dutyOptions.map((duty) => (
              <option key={duty.id} value={duty.name} />
            ))}
          </datalist>
        </label>
        <label>
          <span>招募大区</span>
          <span className="recruit-select-control">
            <select
              value={viewModel.draftFilters.areaId}
              onChange={(event) =>
                viewModel.setFilter("areaId", event.target.value)
              }
            >
              <option value="">不限大区</option>
              {(viewModel.config?.areas ?? []).map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <CaretDown weight="bold" aria-hidden="true" />
          </span>
        </label>
        <button className="recruit-filter-submit" type="submit">
          <MagnifyingGlass weight="bold" />
          筛选
        </button>
      </form>
      {viewModel.configLoading && (
        <p className="recruit-config-note" role="status">
          正在读取副本与职业选项
        </p>
      )}
      {viewModel.configError && (
        <button
          className="recruit-config-note error"
          type="button"
          onClick={viewModel.retryConfig}
        >
          职业与副本选项加载失败，点击重试
        </button>
      )}
    </section>
  );
}

function RecruitCard({
  item,
  jobsById,
  onOpen,
}: {
  item: RecruitSummary;
  jobsById: Map<number, RecruitJob>;
  onOpen: () => void;
}) {
  return (
    <article className="recruit-card">
      <header className="recruit-card-owner">
        <Avatar item={item} />
        <div>
          <strong>{item.author}</strong>
          <span>
            {item.areaName} / {item.groupName}
          </span>
        </div>
        <span className="recruit-card-updated">
          {formatUpdatedAt(item.updatedAt)}
        </span>
      </header>
      <div className="recruit-card-title">
        <span>{item.dutyType}</span>
        <h3>{item.dutyName}</h3>
      </div>
      <dl className="recruit-card-facts">
        <div>
          <dt>
            <Clock />
            活动时间
          </dt>
          <dd>{item.schedule}</dd>
        </div>
        <div>
          <dt>
            <Path />
            当前进度
          </dt>
          <dd>{item.progress}</dd>
        </div>
        <div>
          <dt>
            <ShieldCheck />
            攻略方式
          </dt>
          <dd>{item.strategy}</dd>
        </div>
      </dl>
      <PartyComposition slots={item.slots} jobsById={jobsById} />
      <div className="recruit-card-needs">
        <span>正在寻找</span>
        <JobList jobs={item.needJobs} />
      </div>
      {(item.labels.length > 0 || item.customLabel) && (
        <div className="recruit-card-labels" aria-label="招募标签">
          {item.labels.map((label) => (
            <span key={`${item.id}-${label.id}-${label.name}`}>
              {label.name}
            </span>
          ))}
          {item.customLabel && <span>{item.customLabel}</span>}
        </div>
      )}
      <footer className="recruit-card-footer">
        <span>
          <ChatCircleDots />
          {item.responseCount} 人已响应
        </span>
        <button type="button" onClick={onOpen}>
          查看详情
          <ArrowRight weight="bold" />
        </button>
      </footer>
    </article>
  );
}

function RecruitDetailView({
  summary,
  detail,
  loading,
  error,
  jobsById,
  onBack,
  onRetry,
}: {
  summary: RecruitSummary;
  detail: RecruitDetail | null;
  loading: boolean;
  error: string | null;
  jobsById: Map<number, RecruitJob>;
  onBack: () => void;
  onRetry: () => void;
}) {
  const item = detail ?? summary;
  return (
    <main className="recruit-detail-page">
      <button className="recruit-detail-back" type="button" onClick={onBack}>
        <ArrowLeft weight="bold" />
        返回招募大厅
      </button>
      <article className="recruit-detail-shell">
        <header className="recruit-detail-hero">
          <div className="recruit-detail-owner">
            <Avatar item={item} large />
            <div>
              <span>招募发布者</span>
              <strong>{item.author}</strong>
              <p>
                <MapPin weight="fill" />
                {item.areaName} / {item.groupName}
              </p>
            </div>
          </div>
          <div className="recruit-detail-title">
            <span>{item.dutyType}</span>
            <h1>{item.dutyName}</h1>
            <p>{item.teamComposition}</p>
            {(item.labels.length > 0 || item.customLabel) && (
              <div className="recruit-card-labels" aria-label="招募标签">
                {item.labels.map((label) => (
                  <span key={`${item.id}-${label.id}-${label.name}`}>
                    {label.name}
                  </span>
                ))}
                {item.customLabel && <span>{item.customLabel}</span>}
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <RecruitDetailSkeleton />
        ) : error ? (
          <RecruitState
            icon={<WarningCircle weight="duotone" />}
            title="详情暂时无法读取"
            description={error}
            action="重新加载"
            onAction={onRetry}
          />
        ) : detail ? (
          <div className="recruit-detail-content">
            <section
              className="recruit-detail-composition"
              aria-labelledby="party-title"
            >
              <header>
                <div>
                  <h2 id="party-title">队伍编成</h2>
                  <p>空缺位置与当前职业</p>
                </div>
                <JobList jobs={detail.needJobs} />
              </header>
              <PartyComposition
                slots={detail.slots}
                jobsById={jobsById}
                expanded
              />
            </section>

            <div className="recruit-detail-facts">
              <DetailFact icon={<CalendarDots />} label="活动时间">
                {detail.schedule}
              </DetailFact>
              <DetailFact icon={<Path />} label="当前进度">
                {detail.progress}
              </DetailFact>
              <DetailFact icon={<ShieldCheck />} label="攻略方式">
                {detail.strategy}
              </DetailFact>
            </div>

            <section className="recruit-detail-copy">
              <div>
                <h2>队伍说明</h2>
                <p>{detail.teamDetail}</p>
              </div>
              <div>
                <h2>招募要求</h2>
                <p>{detail.recruitRequirements}</p>
              </div>
              <div className="strategy">
                <h2>攻略说明</h2>
                <p>{detail.strategyDescription}</p>
              </div>
            </section>

            <aside className="recruit-detail-meta">
              <div>
                <span>发布者签名</span>
                <strong>{detail.profile || "未填写"}</strong>
              </div>
              <div>
                <span>发布地区</span>
                <strong>{detail.ipLocation}</strong>
              </div>
              <div>
                <span>发布日期</span>
                <strong>{formatPublishedAt(detail.publishedAt)}</strong>
              </div>
              <div>
                <span>剩余期限</span>
                <strong>{formatRemainingTime(detail.expiresAt)}</strong>
              </div>
              <div>
                <span>已响应</span>
                <strong>{detail.responseCount} 人</strong>
              </div>
              <p>招募内容可直接浏览，无需登录。</p>
            </aside>
          </div>
        ) : null}
      </article>
    </main>
  );
}

function DetailFact({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span aria-hidden="true">{icon}</span>
      <div>
        <dt>{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}

function PartyComposition({
  slots,
  jobsById,
  expanded = false,
}: {
  slots: RecruitSlot[];
  jobsById: Map<number, RecruitJob>;
  expanded?: boolean;
}) {
  return (
    <div
      className={`party-composition ${expanded ? "expanded" : ""}`}
      aria-label="当前队伍编成"
    >
      {slots.map((slot) => {
        const job = slot.jobId ? jobsById.get(slot.jobId) : undefined;
        return (
          <span
            className={job ? "filled" : "vacant"}
            key={slot.key}
            title={job ? `${slot.key} ${job.name}` : `${slot.key} 空缺`}
          >
            <small>{slot.key}</small>
            {job?.icon ? (
              <img src={job.icon} alt="" width="28" height="28" />
            ) : (
              <strong>{job?.name.slice(0, 1) ?? "+"}</strong>
            )}
            {expanded && <em>{job?.name ?? "空缺"}</em>}
          </span>
        );
      })}
    </div>
  );
}

function JobList({ jobs }: { jobs: RecruitJob[] }) {
  if (!jobs.length) return <span className="recruit-needs-any">职业不限</span>;
  return (
    <div className="recruit-job-list">
      {jobs.map((job) => (
        <span key={`${job.id}-${job.name}`} title={job.category}>
          {job.icon && <img src={job.icon} alt="" width="20" height="20" />}
          {job.name}
        </span>
      ))}
    </div>
  );
}

function Avatar({
  item,
  large = false,
}: {
  item: RecruitSummary;
  large?: boolean;
}) {
  return (
    <span
      className={`recruit-avatar ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <span>{item.author.slice(0, 1)}</span>
      {item.avatar && (
        <img
          src={item.avatar}
          alt=""
          width={large ? 72 : 42}
          height={large ? 72 : 42}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}

function RecruitState({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="recruit-state">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}

function RecruitFeedContinuation({
  loaded,
  total,
  canLoadMore,
  loading,
  error,
  onLoadMore,
  onRetry,
}: {
  loaded: number;
  total: number;
  canLoadMore: boolean;
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  const trigger = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canLoadMore || loading || error || !trigger.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMore();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(trigger.current);
    return () => observer.disconnect();
  }, [canLoadMore, error, loading, onLoadMore]);

  if (error) {
    return (
      <div className="recruit-feed-status error" role="alert">
        <WarningCircle weight="duotone" />
        <div>
          <strong>后续招募加载失败</strong>
          <span>{error}</span>
        </div>
        <button type="button" onClick={onRetry}>
          重试
        </button>
      </div>
    );
  }

  if (!canLoadMore && !loading) {
    return (
      <div className="recruit-feed-status complete">
        <CheckCircle weight="duotone" />
        已浏览全部 {total} 条招募
      </div>
    );
  }

  return (
    <div
      className="recruit-feed-status"
      ref={trigger}
      role="status"
      aria-busy={loading}
    >
      <span>
        {loading ? "正在加载更多招募" : `已显示 ${loaded} 条，继续向下浏览`}
      </span>
      {!loading && (
        <button type="button" onClick={onLoadMore}>
          加载更多
          <ArrowRight weight="bold" />
        </button>
      )}
    </div>
  );
}

function RecruitSkeleton({
  count = 6,
  continuation = false,
}: {
  count?: number;
  continuation?: boolean;
}) {
  return (
    <div
      className={`recruit-grid${continuation ? " recruit-feed-skeleton" : ""}`}
      aria-label={continuation ? "正在加载更多招募" : "正在加载招募"}
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="recruit-card recruit-card-skeleton" key={index}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function RecruitDetailSkeleton() {
  return (
    <div
      className="recruit-detail-skeleton"
      aria-label="正在加载详情"
      aria-busy="true"
    >
      <span />
      <span />
      <span />
    </div>
  );
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function formatUpdatedAt(value: string) {
  if (!value) return "更新时间未知";
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPublishedAt(value: string) {
  const date = parseRecruitDate(value);
  if (!date) return "未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function formatRemainingTime(value: string) {
  const date = parseRecruitDate(value);
  if (!date) return "未知";
  const remainingMs = date.getTime() - Date.now();
  if (remainingMs <= 0) return "已到期";
  const hours = Math.ceil(remainingMs / 3_600_000);
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return days > 0 ? `${days} 天 ${restHours} 小时` : `${hours} 小时`;
}

function parseRecruitDate(value: string) {
  if (!value) return null;
  if (/^\d{10}$/.test(value)) {
    const date = new Date(Number(value) * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}
