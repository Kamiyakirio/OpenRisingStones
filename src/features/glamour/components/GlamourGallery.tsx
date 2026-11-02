/** Gallery result states and interactions, isolated from page orchestration. */

import {
  BookmarkSimple,
  CheckCircle,
  CircleNotch,
  Heart,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import type { OwnedItemsState } from "../hooks/useOwnedItems";
import type { Glamour, GlamourOrder } from "../types";
import { hideBrokenImage } from "../utils/glamourPresentation";

/** Complete utility strings are shared without adding component CSS rules. */
const galleryOverflowButtonClasses =
  "min-h-9 border-b-2 border-transparent bg-transparent px-0 py-2 text-lg font-bold text-muted transition-colors hover:text-ink aria-pressed:border-accent aria-pressed:text-ink pointer-coarse:min-h-11";

/** Reused presentation strings stay static and are allocated once for this module. */

type GlamourGalleryProps = {
  results: Glamour[];
  saved: number[];
  order: GlamourOrder;
  total: number;
  loading: boolean;
  loadingMore: boolean;
  canLoadMore: boolean;
  error: string | null;
  onOrderChange: (order: GlamourOrder) => void;
  onToggleSave: (id: number) => void;
  onOpenDetail: (glamour: Glamour) => void;
  onClearSearch: () => void;
  onRetry: () => void;
  onLoadMore: () => Promise<void>;
  ownedItems: OwnedItemsState;
};

// A button-owned border keeps the selected underline inside its clickable bounds.

export function GlamourGallery({
  results,
  saved,
  order,
  total,
  loading,
  loadingMore,
  canLoadMore,
  error,
  onOrderChange,
  onToggleSave,
  onOpenDetail,
  onClearSearch,
  onRetry,
  onLoadMore,
  ownedItems,
}: GlamourGalleryProps) {
  const loadMoreTrigger = useRef<HTMLDivElement>(null);
  const loadMoreCallback = useRef(onLoadMore);
  useEffect(() => {
    loadMoreCallback.current = onLoadMore;
  }, [onLoadMore]);
  useEffect(() => {
    const trigger = loadMoreTrigger.current;
    if (!trigger || !canLoadMore || loading || loadingMore || error) return;
    if (!("IntersectionObserver" in window)) return;
    let requested = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (requested || !entries.some((entry) => entry.isIntersecting)) return;
        requested = true;
        observer.disconnect();
        void loadMoreCallback.current();
      },
      {
        rootMargin: "420px 0px",
      },
    );
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [canLoadMore, error, loading, loadingMore]);
  useEffect(() => {
    void ownedItems.ensureItemMetadata(
      results.flatMap((item) => item.equipmentIds),
    );
  }, [ownedItems, results]);
  return (
    <section
      className="gallery-section pt-6 max-[700px]:pt-10.5"
      id="recommendations"
    >
      <div className="gallery-toolbar mb-5 flex grid-cols-[1fr_auto_1fr] flex-wrap items-center justify-between gap-4 max-[700px]:grid-cols-[1fr_auto] max-[700px]:gap-y-3.5">
        <div
          className="tab-list flex gap-6.5"
          role="group"
          aria-label="投稿排序"
        >
          <button
            aria-pressed={order === "latest"}
            className={galleryOverflowButtonClasses}
            type="button"
            onClick={() => onOrderChange("latest")}
          >
            最新
          </button>
          <button
            aria-pressed={order === "hot"}
            className={galleryOverflowButtonClasses}
            type="button"
            onClick={() => onOrderChange("hot")}
          >
            热门
          </button>
        </div>
        <div className="result-count text-[12px] text-muted max-[700px]:col-start-1 max-[700px]:row-start-2">
          {loading
            ? "正在读取投稿"
            : canLoadMore
              ? `已显示 ${results.length} 套造型`
              : `共 ${total} 套造型`}
        </div>
      </div>

      {error && (
        <div
          className="error-banner mb-5 flex items-center justify-between gap-5 rounded-control border-l border-solid border-accent bg-selected px-4 py-3.5 text-sm text-ink max-[700px]:items-start"
          role="alert"
        >
          <span>{error}</span>
          <button
            className="min-h-9 shrink-0 rounded-control border border-solid border-accent bg-surface px-3 py-[7px] font-bold text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] pointer-coarse:min-h-11"
            type="button"
            onClick={onRetry}
          >
            重新加载
          </button>
        </div>
      )}

      {loading ? (
        <GlamourSkeleton />
      ) : results.length ? (
        <div className="glamour-grid grid grid-cols-[repeat(auto-fill,_minmax(min(100%,_240px),_1fr))] gap-6 max-[767px]:grid-cols-[repeat(auto-fill,_minmax(min(100%,_200px),_1fr))] max-[700px]:grid-cols-[1fr] max-[700px]:gap-9">
          {results.map((item, index) => (
            <GlamourCard
              key={item.id}
              item={item}
              index={index}
              saved={saved.includes(item.id)}
              onToggleSave={onToggleSave}
              onOpenDetail={onOpenDetail}
              ownedItems={ownedItems}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state grid justify-items-center rounded-control bg-surface px-5 py-12 text-center">
          <MagnifyingGlass className="h-8.5 w-8.5 text-accent" />
          <h2 className="mx-0 mt-4.5 mb-[7px] font-sans text-lg font-semibold">
            没有符合当前条件的投稿
          </h2>
          <p className="m-0 text-[14px] text-muted">
            调整种族、性别或标题关键词。
          </p>
          <button
            className="mt-6 min-h-9 rounded-control border border-solid border-accent bg-transparent px-5 py-[11px] font-bold text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-selected pointer-coarse:min-h-11"
            type="button"
            onClick={onClearSearch}
          >
            清空搜索
          </button>
        </div>
      )}

      {canLoadMore && !loading && (
        <div
          ref={loadMoreTrigger}
          className="feed-load-trigger grid min-h-28 place-items-center"
          aria-live="polite"
        >
          {loadingMore && (
            <span className="inline-flex items-center gap-[7px] text-xs text-muted">
              <CircleNotch className="h-[15px] w-[15px] text-accent" />
              正在加载更多投稿
            </span>
          )}
        </div>
      )}
    </section>
  );
}
function GlamourCard({
  item,
  index,
  saved,
  onToggleSave,
  onOpenDetail,
  ownedItems,
}: {
  item: Glamour;
  index: number;
  saved: boolean;
  onToggleSave: (id: number) => void;
  onOpenDetail: (glamour: Glamour) => void;
  ownedItems: OwnedItemsState;
}) {
  const ownershipMatches = item.equipmentIds
    .map(ownedItems.matchItem)
    .filter((match) => match.kind === "exact" || match.kind === "same_model");
  const sameModelCount = ownershipMatches.filter(
    (match) => match.kind === "same_model",
  ).length;
  return (
    <article className="glamour-card group/glamour-card col-auto min-w-0 nth-[6n_+_1]:col-auto nth-[6n_+_2]:col-auto nth-[6n_+_2]:mt-0 nth-[6n_+_3]:col-auto nth-[6n_+_4]:col-auto nth-[6n_+_5]:col-auto nth-[6n_+_6]:col-auto nth-[6n_+_6]:mt-0 max-[980px]:col-auto max-[980px]:mt-0 max-[700px]:col-auto">
      <div className="image-frame relative [aspect-ratio:4_/_5] h-auto overflow-hidden rounded-control bg-hover group-nth-[6n_+_2]/glamour-card:h-auto group-nth-[6n_+_6]/glamour-card:h-auto max-[980px]:h-auto max-[700px]:h-auto">
        <img
          className="block h-auto w-full object-cover [object-position:center_top] [filter:saturate(1.06)] [transition:transform_700ms_cubic-bezier(0.16,_1,_0.3,_1),_filter_300ms_ease]"
          src={item.image}
          alt={`${item.title}幻化展示`}
          loading={index > 2 ? "lazy" : "eager"}
          referrerPolicy="no-referrer"
          onError={(event) => hideBrokenImage(event.currentTarget)}
        />
        <button
          className="card-open-area absolute inset-0 z-1 min-h-9 rounded-control border-0 bg-transparent transition-[background-color,color,border-color] duration-120 ease-[ease] focus-visible:[outline:2px_solid_var(--ors-color-accent)] focus-visible:[outline-offset:-4px] pointer-coarse:min-h-11"
          type="button"
          aria-label={`查看${item.title}的幻化详情`}
          onClick={() => onOpenDetail(item)}
        />
        <button
          className={
            saved
              ? "save-button saved absolute top-[13px] right-[13px] z-2 grid h-[39px] min-h-9 w-[39px] place-items-center rounded-[50%] bg-[rgba(23,_34,_35,_0.46)] text-[#f6f7f4] [border:1px_solid_rgba(255,_255,_255,_0.48)] [transition:transform_180ms_ease,_background_180ms_ease] hover:bg-[rgba(23,_34,_35,_0.7)] pointer-coarse:min-h-11 [@media(prefers-reduced-transparency:_reduce)]:bg-[rgba(23,_34,_35,_0.86)]"
              : "save-button absolute top-[13px] right-[13px] z-2 grid h-[39px] min-h-9 w-[39px] place-items-center rounded-[50%] bg-[rgba(23,_34,_35,_0.46)] text-[#f6f7f4] [border:1px_solid_rgba(255,_255,_255,_0.48)] [transition:transform_180ms_ease,_background_180ms_ease] hover:bg-[rgba(23,_34,_35,_0.7)] pointer-coarse:min-h-11 [@media(prefers-reduced-transparency:_reduce)]:bg-[rgba(23,_34,_35,_0.86)]"
          }
          type="button"
          aria-label={saved ? `取消收藏${item.title}` : `收藏${item.title}`}
          onClick={() => onToggleSave(item.id)}
        >
          <BookmarkSimple
            className="h-[19px] w-[19px]"
            weight={saved ? "fill" : "regular"}
          />
        </button>
      </div>
      <div className="card-body px-[3px] pt-4 pb-0">
        <div className="card-heading flex items-center gap-2">
          <h2 className="m-0 font-sans text-base leading-[1.5] font-semibold tracking-normal">
            {item.title}
          </h2>
        </div>
        <p className="mx-0 mt-[7px] mb-[15px] flex items-center gap-2 text-[12px] text-muted">
          {item.race}
          <span className="h-2.5 w-px bg-line" />
          {item.job}
          {/* <span />
           {item.palette} */}
        </p>
        {ownershipMatches.length > 0 && (
          <div className="card-owned-match mx-0 mt-[-5px] mb-[13px] flex items-center gap-1.5 text-xs font-bold text-accent">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" weight="fill" />
            <span>
              已匹配 {ownershipMatches.length} 件
              {sameModelCount > 0 ? "，含 " + sameModelCount + " 件同模" : ""}
            </span>
          </div>
        )}
        <div className="card-footer flex items-center justify-between text-xs text-muted">
          <span className="last:flex last:items-center last:gap-1">
            {item.author}
          </span>
          <span className="last:flex last:items-center last:gap-1">
            <Heart className="w-3 text-accent" weight="fill" />{" "}
            {item.likes.toLocaleString("zh-CN")}
          </span>
        </div>
      </div>
    </article>
  );
}
function GlamourSkeleton() {
  return (
    <div
      className="glamour-grid skeleton-grid grid grid-cols-[repeat(auto-fill,_minmax(min(100%,_240px),_1fr))] gap-6 max-[767px]:grid-cols-[repeat(auto-fill,_minmax(min(100%,_200px),_1fr))] max-[700px]:grid-cols-[1fr] max-[700px]:gap-9"
      aria-label="正在加载幻化投稿"
    >
      {Array.from(
        {
          length: 6,
        },
        (_, index) => (
          <div
            className="glamour-card skeleton-card group/glamour-card col-auto min-w-0 nth-[6n_+_1]:col-auto nth-[6n_+_2]:col-auto nth-[6n_+_2]:mt-0 nth-[6n_+_3]:col-auto nth-[6n_+_4]:col-auto nth-[6n_+_5]:col-auto nth-[6n_+_6]:col-auto nth-[6n_+_6]:mt-0 max-[980px]:col-auto max-[980px]:mt-0 max-[700px]:col-auto"
            key={index}
          >
            <div className="image-frame relative block [aspect-ratio:4_/_5] h-auto animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] overflow-hidden rounded-control bg-hover bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%] group-nth-[6n_+_2]/glamour-card:h-auto group-nth-[6n_+_6]/glamour-card:h-auto max-[980px]:h-auto max-[700px]:h-auto" />
            <span className="mx-[3px] mt-[17px] mb-2.5 block h-5 w-[62%] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%]" />
            <small className="ml-[3px] block h-[11px] w-[38%] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%]" />
          </div>
        ),
      )}
    </div>
  );
}
