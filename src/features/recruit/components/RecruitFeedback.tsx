/** Recruitment loading, retry, and continuous-feed feedback components. */
import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";

export function RecruitStatus({
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

export function RecruitSkeleton({
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

export function RecruitDetailSkeleton() {
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
