/** Connects recruitment filters, feed states, and selected-entry presentation. */
import { MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { RecruitState } from "../hooks/useRecruit";
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
    <main
      className={
        "mx-auto w-full max-w-[1600px] px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 recruit-page max-[1199px]:px-[24px] max-[767px]:px-[16px] [&&&&]:w-[min(1280px,_100%)] [&&&&]:m-[0_auto] [&&&&]:p-[20px_20px] [@media(max-width:_760px)]:[&&&&]:p-[26px_16px_48px]"
      }
      id="recruit-list"
    >
      <RecruitFilters viewModel={viewModel} />
      <section
        className="recruit-results mt-[24px] pt-0"
        aria-labelledby="recruit-results-title"
      >
        <header
          className={
            "recruit-results-header flex justify-between gap-[24px] [&_h2]:m-0 [&_p]:m-0 [&_h2]:text-lg [&_p]:mt-[5px] [&_p]:text-muted [&_p]:text-xs max-[760px]:items-start mb-[20px] [&&&&]:[align-items:end] [&&&&_h2]:[letter-spacing:normal]"
          }
        >
          <div>
            <h2 className="text-lg font-semibold" id="recruit-results-title">
              正在招募的队伍
            </h2>
            <p>
              {viewModel.loading
                ? "正在读取最新招募"
                : viewModel.activeFilterCount
                  ? `已按 ${viewModel.activeFilterCount} 项条件筛选，共 ${viewModel.total} 条`
                  : `共 ${viewModel.total} 条公开招募`}
            </p>
          </div>
          {!viewModel.loading && viewModel.total > 0 && (
            <span
              className={
                "recruit-page-indicator text-muted text-xs [&&&&]:[font-family:var(--ors-font-ui)]"
              }
            >
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
            description="请重新加载。"
            technicalDetails={viewModel.error}
            action="重新加载"
            onAction={viewModel.retry}
          />
        ) : viewModel.items.length === 0 ? (
          <RecruitStatus
            icon={<MagnifyingGlass weight="duotone" />}
            title="没有找到符合条件的招募"
            description="调整副本或招募大区。"
            action="清除筛选"
            onAction={viewModel.clearFilters}
          />
        ) : (
          <>
            <div
              className={
                "recruit-grid grid gap-[12px] [&&&&]:grid-cols-[1fr] [@media(max-width:_1120px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_760px)]:[&&&&]:grid-cols-[1fr] [@media(max-width:_1199px)]:[&&&&]:grid-cols-[1fr]"
              }
            >
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
