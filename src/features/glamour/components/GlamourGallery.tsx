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
const orderButtonClasses =
  "border-b-2 border-transparent bg-transparent px-0 py-2 text-muted transition-colors hover:text-ink aria-pressed:border-accent aria-pressed:text-ink";

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
      { rootMargin: "420px 0px" },
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
      className="gallery-section max-[700px]:pt-[42px] pt-[24px]"
      id="recommendations"
    >
      <div
        className={
          "gallery-toolbar items-center mb-[20px] flex-wrap max-[700px]:gap-y-[14px] flex justify-between gap-[16px] [&&&&]:grid-cols-[1fr_auto_1fr] [@media(max-width:_700px)]:[&&&&]:grid-cols-[1fr_auto]"
        }
      >
        <div
          className="tab-list flex gap-[26px] [&_button]:text-lg [&_button]:font-bold"
          role="group"
          aria-label="投稿排序"
        >
          <button
            aria-pressed={order === "latest"}
            className={orderButtonClasses}
            type="button"
            onClick={() => onOrderChange("latest")}
          >
            最新
          </button>
          <button
            aria-pressed={order === "hot"}
            className={orderButtonClasses}
            type="button"
            onClick={() => onOrderChange("hot")}
          >
            热门
          </button>
        </div>
        <div
          className={
            "result-count text-muted [&&&&]:text-[12px] [@media(max-width:_700px)]:[&&&&]:[grid-row:2] [@media(max-width:_700px)]:[&&&&]:[grid-column:1]"
          }
        >
          {loading
            ? "正在读取投稿"
            : canLoadMore
              ? `已显示 ${results.length} 套造型`
              : `共 ${total} 套造型`}
        </div>
      </div>

      {error && (
        <div
          className={
            "error-banner flex justify-between items-center gap-[20px] mb-[20px] border-l border-solid border-accent rounded-[var(--ors-radius-control)] text-ink bg-selected text-sm [&_button]:border [&_button]:border-solid [&_button]:border-accent [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-accent [&_button]:bg-surface [&_button]:font-bold max-[700px]:items-start [&&&&]:p-[14px_16px] [&&&&_button]:flex-[0_0_auto] [&&&&_button]:p-[7px_12px]"
          }
          role="alert"
        >
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            重新加载
          </button>
        </div>
      )}

      {loading ? (
        <GlamourSkeleton />
      ) : results.length ? (
        <div
          className={
            "glamour-grid grid gap-[24px] max-[700px]:gap-[36px] [&&&&]:grid-cols-[repeat(auto-fill,_minmax(min(100%,_240px),_1fr))] [@media(max-width:_700px)]:[&&&&]:grid-cols-[1fr] [@media(max-width:_767px)]:[&&&&]:grid-cols-[repeat(auto-fill,_minmax(min(100%,_200px),_1fr))]"
          }
        >
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
        <div
          className={
            "empty-state grid rounded-[var(--ors-radius-control)] bg-surface text-center [&_>_svg]:w-[34px] [&_>_svg]:h-[34px] [&_>_svg]:text-accent [&_p]:m-0 [&_p]:text-muted [&_button]:mt-[24px] [&_button]:border [&_button]:border-solid [&_button]:border-accent [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-accent [&_button]:font-bold [&_button:hover]:bg-selected [&&&&]:[justify-items:center] [&&&&]:p-[90px_20px] [&&&&_h2]:m-[18px_0_7px] [&&&&_h2]:[font-family:var(--ors-font-ui)] [&&&&_p]:text-[14px] [&&&&_button]:p-[11px_20px] [&&&&_button]:[background:transparent]"
          }
        >
          <MagnifyingGlass />
          <h2 className="text-lg font-semibold">没有符合当前条件的投稿</h2>
          <p>调整种族、性别或标题关键词。</p>
          <button type="button" onClick={onClearSearch}>
            清空搜索
          </button>
        </div>
      )}

      {canLoadMore && !loading && (
        <div
          ref={loadMoreTrigger}
          className="feed-load-trigger grid place-items-center min-h-[112px] [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[7px] [&_>_span]:text-muted [&_>_span]:text-xs [&_svg]:w-[15px] [&_svg]:h-[15px] [&_svg]:text-accent"
          aria-live="polite"
        >
          {loadingMore && (
            <span>
              <CircleNotch />
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
    <article
      className={
        "glamour-card min-w-0 [&:nth-child(6n_+_2)]:mt-0 [&:nth-child(6n_+_6)]:mt-0 max-[980px]:mt-0 max-[980px]:[&:nth-child(n)]:mt-0 [&&&&]:[grid-column:auto] [&&&&:nth-child(6n_+_1)]:[grid-column:auto] [&&&&:nth-child(6n_+_5)]:[grid-column:auto] [&&&&:nth-child(6n_+_2)]:[grid-column:auto] [&&&&:nth-child(6n_+_6)]:[grid-column:auto] [&&&&:nth-child(6n_+_3)]:[grid-column:auto] [&&&&:nth-child(6n_+_4)]:[grid-column:auto] [@media(max-width:_980px)]:[&&&&]:[grid-column:auto] [@media(max-width:_980px)]:[&&&&:nth-child(n)]:[grid-column:auto] [@media(max-width:_700px)]:[&&&&]:[grid-column:auto] [@media(max-width:_700px)]:[&&&&:nth-child(n)]:[grid-column:auto] [@media(prefers-reduced-motion:_reduce)]:[&&&&]:animate-[none]"
      }
    >
      <div
        className={
          "image-frame relative overflow-hidden rounded-[var(--ors-radius-control)] bg-hover [&_img]:block [&_img]:w-full [&_img]:object-cover [.skeleton-card_&]:block [&&&&]:h-[auto] [.glamour-card:nth-child(6n_+_2)_&&&&]:h-[auto] [.glamour-card:nth-child(6n_+_6)_&&&&]:h-[auto] [&&&&_img]:h-[auto] [&&&&_img]:[object-position:center_top] [&&&&_img]:[transition:transform_700ms_cubic-bezier(0.16,_1,_0.3,_1),_filter_300ms_ease] [.glamour-card:hover_&&&&_img]:[filter:saturate(1.06)] [.skeleton-card_&&&&]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [.skeleton-card_&&&&]:[background-size:240%_100%] [.skeleton-card_&&&&]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [@media(max-width:_980px)]:[&&&&]:h-[auto] [@media(max-width:_980px)]:[.glamour-card:nth-child(n)_&&&&]:h-[auto] [@media(max-width:_700px)]:[&&&&]:h-[auto] [@media(max-width:_700px)]:[.glamour-card:nth-child(n)_&&&&]:h-[auto] [@media(prefers-reduced-motion:_reduce)]:[.skeleton-card_&&&&]:animate-[none] [&&&&]:[aspect-ratio:4_/_5]"
        }
      >
        <img
          src={item.image}
          alt={`${item.title}幻化展示`}
          loading={index > 2 ? "lazy" : "eager"}
          referrerPolicy="no-referrer"
          onError={(event) => hideBrokenImage(event.currentTarget)}
        />
        <button
          className={
            "card-open-area absolute border-0 rounded-[var(--ors-radius-control)] [&&&&]:inset-[0] [&&&&]:z-[1] [&&&&]:[background:transparent] [&&&&:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&:focus-visible]:[outline-offset:-4px]"
          }
          type="button"
          aria-label={`查看${item.title}的幻化详情`}
          onClick={() => onOpenDetail(item)}
        />
        <button
          className={
            saved
              ? "save-button saved absolute grid place-items-center w-[39px] h-[39px] [&_svg]:w-[19px] [&_svg]:h-[19px] [.detail-save&]:border-accent [.detail-save&]:text-accent [.detail-save&]:bg-selected [.save-button&]:text-on-accent [.save-button&]:bg-accent [&&&&]:right-[13px] [&&&&]:top-[13px] [&&&&]:z-[2] [&&&&]:[border:1px_solid_rgba(255,_255,_255,_0.48)] [&&&&]:rounded-[50%] [&&&&]:[color:#f6f7f4] [&&&&]:[background:rgba(23,_34,_35,_0.46)] [&&&&]:[transition:transform_180ms_ease,_background_180ms_ease] [&&&&:hover]:[background:rgba(23,_34,_35,_0.7)] [@media(prefers-reduced-transparency:_reduce)]:[&&&&]:[background:rgba(23,_34,_35,_0.86)]"
              : "save-button absolute grid place-items-center w-[39px] h-[39px] [&_svg]:w-[19px] [&_svg]:h-[19px] [&&&&]:right-[13px] [&&&&]:top-[13px] [&&&&]:z-[2] [&&&&]:[border:1px_solid_rgba(255,_255,_255,_0.48)] [&&&&]:rounded-[50%] [&&&&]:[color:#f6f7f4] [&&&&]:[background:rgba(23,_34,_35,_0.46)] [&&&&]:[transition:transform_180ms_ease,_background_180ms_ease] [&&&&:hover]:[background:rgba(23,_34,_35,_0.7)] [@media(prefers-reduced-transparency:_reduce)]:[&&&&]:[background:rgba(23,_34,_35,_0.86)]"
          }
          type="button"
          aria-label={saved ? `取消收藏${item.title}` : `收藏${item.title}`}
          onClick={() => onToggleSave(item.id)}
        >
          <BookmarkSimple weight={saved ? "fill" : "regular"} />
        </button>
      </div>
      <div
        className={
          "card-body [&_>_p]:flex [&_>_p]:items-center [&_>_p]:gap-[8px] [&_>_p]:text-muted [&_>_p_span]:w-[1px] [&_>_p_span]:h-[10px] [&_>_p_span]:bg-line [&&&&]:p-[16px_3px_0] [&&&&_>_p]:m-[7px_0_15px] [&&&&_>_p]:text-[12px]"
        }
      >
        <div
          className={
            "card-heading flex items-center gap-[8px] [&_h2]:m-0 [&_svg]:w-[15px] [&_svg]:text-accent [&_h2]:text-base [&&&&_h2]:[font-family:var(--ors-font-ui)] [&&&&_h2]:[letter-spacing:normal] [&&&&_h2]:leading-[1.5]"
          }
        >
          <h2 className="text-lg font-semibold">{item.title}</h2>
        </div>
        <p>
          {item.race}
          <span />
          {item.job}
          {/* <span />
          {item.palette} */}
        </p>
        {ownershipMatches.length > 0 && (
          <div
            className={
              "card-owned-match flex items-center gap-[6px] text-accent text-xs font-bold [&_svg]:w-[14px] [&_svg]:h-[14px] [&&&&]:m-[-5px_0_13px] [&&&&_svg]:flex-[0_0_auto]"
            }
          >
            <CheckCircle weight="fill" />
            <span>
              已匹配 {ownershipMatches.length} 件
              {sameModelCount > 0 ? "，含 " + sameModelCount + " 件同模" : ""}
            </span>
          </div>
        )}
        <div className="card-footer flex justify-between items-center text-muted text-xs [&_span:last-child]:flex [&_span:last-child]:items-center [&_span:last-child]:gap-[4px] [&_svg]:w-[12px] [&_svg]:text-accent">
          <span>{item.author}</span>
          <span>
            <Heart weight="fill" /> {item.likes.toLocaleString("zh-CN")}
          </span>
        </div>
      </div>
    </article>
  );
}

function GlamourSkeleton() {
  return (
    <div
      className={
        "glamour-grid skeleton-grid grid gap-[24px] max-[700px]:gap-[36px] [&&&&]:grid-cols-[repeat(auto-fill,_minmax(min(100%,_240px),_1fr))] [@media(max-width:_700px)]:[&&&&]:grid-cols-[1fr] [@media(max-width:_767px)]:[&&&&]:grid-cols-[repeat(auto-fill,_minmax(min(100%,_200px),_1fr))]"
      }
      aria-label="正在加载幻化投稿"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className={
            "glamour-card skeleton-card min-w-0 [&:nth-child(6n_+_2)]:mt-0 [&:nth-child(6n_+_6)]:mt-0 max-[980px]:mt-0 max-[980px]:[&:nth-child(n)]:mt-0 [&_>_span]:block [&_>_small]:block [&_>_span]:h-[20px] [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_small]:h-[11px] [&_>_small]:ml-[3px] [&_>_small]:rounded-[var(--ors-radius-control)] [&&&&]:[grid-column:auto] [&&&&:nth-child(6n_+_1)]:[grid-column:auto] [&&&&:nth-child(6n_+_5)]:[grid-column:auto] [&&&&:nth-child(6n_+_2)]:[grid-column:auto] [&&&&:nth-child(6n_+_6)]:[grid-column:auto] [&&&&:nth-child(6n_+_3)]:[grid-column:auto] [&&&&:nth-child(6n_+_4)]:[grid-column:auto] [@media(max-width:_980px)]:[&&&&]:[grid-column:auto] [@media(max-width:_980px)]:[&&&&:nth-child(n)]:[grid-column:auto] [@media(max-width:_700px)]:[&&&&]:[grid-column:auto] [@media(max-width:_700px)]:[&&&&:nth-child(n)]:[grid-column:auto] [@media(prefers-reduced-motion:_reduce)]:[&&&&]:animate-[none] [&&&&_>_span]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [&&&&_>_span]:[background-size:240%_100%] [&&&&_>_span]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_>_small]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [&&&&_>_small]:[background-size:240%_100%] [&&&&_>_small]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_>_span]:w-[62%] [&&&&_>_span]:m-[17px_3px_10px] [&&&&_>_small]:w-[38%] [@media(prefers-reduced-motion:_reduce)]:[&&&&_>_span]:animate-[none] [@media(prefers-reduced-motion:_reduce)]:[&&&&_>_small]:animate-[none]"
          }
          key={index}
        >
          <div
            className={
              "image-frame relative overflow-hidden rounded-[var(--ors-radius-control)] bg-hover [&_img]:block [&_img]:w-full [&_img]:object-cover [.skeleton-card_&]:block [&&&&]:h-[auto] [.glamour-card:nth-child(6n_+_2)_&&&&]:h-[auto] [.glamour-card:nth-child(6n_+_6)_&&&&]:h-[auto] [&&&&_img]:h-[auto] [&&&&_img]:[object-position:center_top] [&&&&_img]:[transition:transform_700ms_cubic-bezier(0.16,_1,_0.3,_1),_filter_300ms_ease] [.glamour-card:hover_&&&&_img]:[filter:saturate(1.06)] [.skeleton-card_&&&&]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [.skeleton-card_&&&&]:[background-size:240%_100%] [.skeleton-card_&&&&]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [@media(max-width:_980px)]:[&&&&]:h-[auto] [@media(max-width:_980px)]:[.glamour-card:nth-child(n)_&&&&]:h-[auto] [@media(max-width:_700px)]:[&&&&]:h-[auto] [@media(max-width:_700px)]:[.glamour-card:nth-child(n)_&&&&]:h-[auto] [@media(prefers-reduced-motion:_reduce)]:[.skeleton-card_&&&&]:animate-[none] [&&&&]:[aspect-ratio:4_/_5]"
            }
          />
          <span />
          <small />
        </div>
      ))}
    </div>
  );
}
