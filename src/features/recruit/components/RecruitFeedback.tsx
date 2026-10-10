/** Recruitment loading, retry, and continuous-feed feedback components. */
import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";

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
    <div
      className={
        "recruit-state [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button]:min-h-[40px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:text-xs [&_button:hover]:border-accent grid rounded-[var(--ors-radius-control)] text-center min-h-[180px] [&_>_svg]:w-[42px] [&_>_svg]:h-[42px] [&_>_svg]:text-accent [&_p]:text-muted [&&&&_button]:[transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] [&&&&_button]:p-[0_14px] [&&&&_button]:[font-weight:740] [&&&&]:[justify-items:center] [&&&&]:[place-content:center] [&&&&]:[border:1px_dashed_var(--ors-color-line)] [&&&&]:p-[32px_24px] [&&&&_h3]:m-[16px_0_0] [&&&&_h3]:text-[18px] [&&&&_p]:max-w-[48ch] [&&&&_p]:m-[8px_0_18px] [&&&&_p]:text-[12px] [&&&&_p]:leading-[1.6]"
      }
    >
      {icon}
      <h3 className="text-base font-semibold">{title}</h3>
      <p>{description}</p>
      {technicalDetails && (
        <details>
          <summary>错误详情</summary>
          <p>{technicalDetails}</p>
        </details>
      )}
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
      <div
        className={
          "recruit-feed-status error [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_svg]:w-[15px] [&_svg]:h-[15px] flex justify-center items-center gap-[12px] min-h-[72px] mt-[24px] text-muted text-xs text-center [&_>_svg]:w-[21px] [&_>_svg]:h-[21px] [&_button]:min-h-[40px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:text-xs [&_button:hover]:border-accent [.advanced-results-state&_>_svg]:text-danger [.advanced-results-state&_strong]:text-danger [button.recruit-config-note&]:text-danger [.recruit-feed-status&]:justify-start [.recruit-feed-status&]:border [.recruit-feed-status&]:border-solid [.recruit-feed-status&]:border-danger [.recruit-feed-status&]:rounded-[var(--ors-radius-control)] [.recruit-feed-status&]:text-danger [.recruit-feed-status&]:bg-surface [.recruit-feed-status&]:text-left [.recruit-feed-status&_>_div]:grid [.recruit-feed-status&_>_div]:gap-[3px] [.recruit-feed-status&_span]:text-xs max-[460px]:[.recruit-feed-status&]:items-start max-[460px]:[.recruit-feed-status&]:flex-wrap max-[460px]:[.recruit-feed-status&_button]:w-full [.log-outcome&]:text-danger [&&&&_button]:[transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] [&&&&]:p-[14px_16px] [&&&&_>_svg]:flex-[0_0_auto] [&&&&_button]:p-[0_14px] [&&&&_button]:[font-weight:740] [button.recruit-config-note&&&&]:[text-decoration:underline] [button.recruit-config-note&&&&]:[text-underline-offset:3px] [.recruit-feed-status&&&&_>_div]:flex-[1]"
        }
        role="alert"
      >
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
      <div
        className={
          "recruit-feed-status complete [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_svg]:w-[15px] [&_svg]:h-[15px] flex justify-center items-center gap-[12px] min-h-[72px] mt-[24px] text-muted text-xs text-center [&_>_svg]:w-[21px] [&_>_svg]:h-[21px] [&_button]:min-h-[40px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:text-xs [&_button:hover]:border-accent [.recruit-feed-status&]:text-accent [&&&&_button]:[transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] [&&&&]:p-[14px_16px] [&&&&_>_svg]:flex-[0_0_auto] [&&&&_button]:p-[0_14px] [&&&&_button]:[font-weight:740]"
        }
      >
        <CheckCircle weight="duotone" />
        已浏览全部 {total} 条招募
      </div>
    );
  }

  return (
    <div
      className={
        "recruit-feed-status [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_svg]:w-[15px] [&_svg]:h-[15px] flex justify-center items-center gap-[12px] min-h-[72px] mt-[24px] text-muted text-xs text-center [&_>_svg]:w-[21px] [&_>_svg]:h-[21px] [&_button]:min-h-[40px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:text-xs [&_button:hover]:border-accent [&&&&_button]:[transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] [&&&&]:p-[14px_16px] [&&&&_>_svg]:flex-[0_0_auto] [&&&&_button]:p-[0_14px] [&&&&_button]:[font-weight:740]"
      }
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
  // Match loaded card geometry to avoid a large height jump when results arrive.
  return (
    <div
      className={`grid gap-3 recruit-grid${continuation ? " recruit-feed-skeleton mt-[16px]" : ""}`}
      aria-label={continuation ? "正在加载更多招募" : "正在加载招募"}
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          className={
            "recruit-card recruit-card-skeleton grid min-w-0 items-start gap-4 rounded-xl border border-line bg-surface p-5 max-[519px]:p-4 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,1.2fr)] min-[1200px]:gap-x-6 [&_>_span]:block [&_>_span]:rounded-lg [&_>_span]:bg-hover [&_>_span:nth-child(1)]:h-28 [&_>_span:nth-child(2)]:h-20 [&_>_span:nth-child(3)]:h-28 [&_>_span:last-child]:col-span-full [&_>_span:last-child]:h-8 [@media(prefers-reduced-motion:_no-preference)]:[&&&&_>_span]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_30%,_color-mix(in_srgb,_var(--ors-color-surface)_72%,_var(--ors-color-hover))_50%,_var(--ors-color-hover)_70%_)] [@media(prefers-reduced-motion:_no-preference)]:[&&&&_>_span]:[background-size:220%_100%] [@media(prefers-reduced-motion:_no-preference)]:[&&&&_>_span]:animate-[recruit-shimmer_1.4s_infinite_linear]"
          }
          key={index}
        >
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
      className={
        "recruit-detail-skeleton [&_>_span]:block [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_span]:bg-hover grid gap-[20px] p-[42px] [&_>_span]:h-[120px] [&_>_span:nth-child(2)]:h-[90px] [@media(prefers-reduced-motion:_no-preference)]:[&&&&_>_span]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_30%,_color-mix(in_srgb,_var(--ors-color-surface)_72%,_var(--ors-color-hover))_50%,_var(--ors-color-hover)_70%_)] [@media(prefers-reduced-motion:_no-preference)]:[&&&&_>_span]:[background-size:220%_100%] [@media(prefers-reduced-motion:_no-preference)]:[&&&&_>_span]:animate-[recruit-shimmer_1.4s_infinite_linear]"
      }
      aria-label="正在加载详情"
      aria-busy="true"
    >
      <span />
      <span />
      <span />
    </div>
  );
}
