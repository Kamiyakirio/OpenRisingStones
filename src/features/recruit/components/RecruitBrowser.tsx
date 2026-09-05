/** Connects recruitment filters, feed states, and selected-entry presentation. */
import { MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { RecruitState } from "../hooks/useRecruit";
import "./RecruitBrowser.css";
import { RecruitCard, RecruitDetailView } from "./RecruitEntry";
import {
  RecruitFeedContinuation,
  RecruitSkeleton,
  RecruitStatus,
} from "./RecruitFeedback";
import { RecruitFilters } from "./RecruitFilters";

type RecruitBrowserProps = {
  viewModel: RecruitState;
};

export function RecruitBrowser({ viewModel }: RecruitBrowserProps) {
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
          <RecruitStatus
            icon={<WarningCircle weight="duotone" />}
            title="招募列表暂时无法读取"
            description={viewModel.error}
            action="重新加载"
            onAction={viewModel.retry}
          />
        ) : viewModel.items.length === 0 ? (
          <RecruitStatus
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
