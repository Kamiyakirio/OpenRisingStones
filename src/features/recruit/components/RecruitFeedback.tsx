/** Recruitment loading, retry, and continuous-feed feedback components. */

import clsx from "clsx";
import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";

/** Reused presentation strings stay static and are allocated once for this module. */
const recruitStatusDescriptionClasses =
  "mx-0 mt-2 mb-4.5 max-w-[48ch] text-[12px] leading-[1.6] text-muted";
const recruitRetryButtonClasses =
  "inline-flex min-h-10 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-surface px-3.5 py-0 text-xs font-[740] whitespace-nowrap text-ink [transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] hover:border-accent";
const recruitCardSkeletonClasses =
  "block rounded-control bg-hover last:col-span-full last:h-8 nth-[1]:h-28 nth-[2]:h-20 nth-[3]:h-28";
const recruitDetailSkeletonClasses =
  "block h-30 rounded-control bg-hover nth-[2]:h-22.5";

export function RecruitStatus({
  icon,
  title,
  description,
  technicalDetails,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  technicalDetails?: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="recruit-state grid min-h-45 [place-content:center] justify-items-center rounded-control px-6 py-8 text-center [border:1px_dashed_var(--ors-color-line)]">
      {icon}
      <h3 className="mx-0 mt-4 mb-0 text-base text-[18px] font-semibold">
        {title}
      </h3>
      <p className={recruitStatusDescriptionClasses}>{description}</p>
      {technicalDetails && (
        <details>
          <summary>错误详情</summary>
          <p className={recruitStatusDescriptionClasses}>{technicalDetails}</p>
        </details>
      )}
      <button
        className={recruitRetryButtonClasses}
        type="button"
        onClick={onAction}
      >
        {action}
      </button>
    </div>
  );
}
export function RecruitFeedContinuation({
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
      {
        rootMargin: "240px 0px",
      },
    );
    observer.observe(trigger.current);
    return () => observer.disconnect();
  }, [canLoadMore, error, loading, onLoadMore]);
  if (error) {
    return (
      <div
        className="recruit-feed-status error mt-6 flex min-h-18 items-center justify-start gap-3 rounded-control border border-solid border-danger bg-surface px-4 py-3.5 text-left text-xs text-danger max-[460px]:flex-wrap max-[460px]:items-start"
        role="alert"
      >
        <WarningCircle
          className="h-[21px] w-[21px] shrink-0"
          weight="duotone"
        />
        <div className="grid flex-1 gap-[3px]">
          <strong>后续招募加载失败</strong>
          <span className="text-xs">{error}</span>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-surface px-3.5 py-0 text-xs font-[740] whitespace-nowrap text-ink [transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] hover:border-accent max-[460px]:w-full"
          type="button"
          onClick={onRetry}
        >
          重试
        </button>
      </div>
    );
  }
  if (!canLoadMore && !loading) {
    return (
      <div className="recruit-feed-status complete mt-6 flex min-h-18 items-center justify-center gap-3 px-4 py-3.5 text-center text-xs text-accent">
        <CheckCircle className="h-[21px] w-[21px] shrink-0" weight="duotone" />
        已浏览全部 {total} 条招募
      </div>
    );
  }
  return (
    <div
      className="recruit-feed-status mt-6 flex min-h-18 items-center justify-center gap-3 px-4 py-3.5 text-center text-xs text-muted"
      ref={trigger}
      role="status"
      aria-busy={loading}
    >
      <span>
        {loading ? "正在加载更多招募" : `已显示 ${loaded} 条，继续向下浏览`}
      </span>
      {!loading && (
        <button
          className={recruitRetryButtonClasses}
          type="button"
          onClick={onLoadMore}
        >
          加载更多
          <ArrowRight className="h-[15px] w-[15px]" weight="bold" />
        </button>
      )}
    </div>
  );
}
export function RecruitSkeleton({
  count = 6,
  continuation = false,
}: {
  count?: number;
  continuation?: boolean;
}) {
  // Match loaded card geometry to avoid a large height jump when results arrive.
  return (
    <div
      className={clsx(
        "grid gap-3",
        `recruit-grid${continuation ? "recruit-feed-skeleton mt-4" : ""}`,
      )}
      aria-label={continuation ? "正在加载更多招募" : "正在加载招募"}
      aria-busy="true"
    >
      {Array.from(
        {
          length: count,
        },
        (_, index) => (
          <div
            className="recruit-card recruit-card-skeleton grid min-w-0 items-start gap-4 rounded-panel border border-line bg-surface p-5 max-[519px]:p-4 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,1.2fr)] min-[1200px]:gap-x-6"
            key={index}
          >
            <span className={recruitCardSkeletonClasses} />
            <span className={recruitCardSkeletonClasses} />
            <span className={recruitCardSkeletonClasses} />
            <span className={recruitCardSkeletonClasses} />
          </div>
        ),
      )}
    </div>
  );
}
export function RecruitDetailSkeleton() {
  return (
    <div
      className="recruit-detail-skeleton grid gap-5 p-6 max-[460px]:p-4"
      aria-label="正在加载详情"
      aria-busy="true"
    >
      <span className={recruitDetailSkeletonClasses} />
      <span className={recruitDetailSkeletonClasses} />
      <span className={recruitDetailSkeletonClasses} />
    </div>
  );
}
