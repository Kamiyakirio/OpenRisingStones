/** Gallery result states and interactions, isolated from page orchestration. */
import { useEffect, useRef, type CSSProperties } from "react";
import {
  BookmarkSimple,
  CheckCircle,
  CircleNotch,
  Heart,
  MagnifyingGlass,
  Plus,
} from "@phosphor-icons/react";
import type { Glamour, GlamourOrder } from "../models/glamour";
import { hideBrokenImage } from "../utils/glamourPresentation";
import type { OwnedItemsViewModel } from "../viewmodels/useOwnedItemsViewModel";

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
  ownedItems: OwnedItemsViewModel;
};

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
    <section className="gallery-section" id="recommendations">
      <div className="gallery-toolbar">
        <div className="tab-list" role="tablist" aria-label="推荐排序">
          <button
            role="tab"
            aria-selected={order === "latest"}
            className={order === "latest" ? "active" : ""}
            type="button"
            onClick={() => onOrderChange("latest")}
          >
            最新
          </button>
          <button
            role="tab"
            aria-selected={order === "hot"}
            className={order === "hot" ? "active" : ""}
            type="button"
            onClick={() => onOrderChange("hot")}
          >
            热门
          </button>
        </div>
        <div className="result-count">
          {loading
            ? "正在读取投稿"
            : canLoadMore
              ? `已显示 ${results.length} 套造型`
              : `共 ${total} 套造型`}
        </div>
        <button className="publish-link" type="button">
          <Plus />
          发布幻化
        </button>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            重新加载
          </button>
        </div>
      )}

      {loading ? (
        <GlamourSkeleton />
      ) : results.length ? (
        <div className="glamour-grid">
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
        <div className="empty-state">
          <MagnifyingGlass />
          <h2>暂时没有对应投稿</h2>
          <p>更换种族、性别或标题关键词后再试一次。</p>
          <button type="button" onClick={onClearSearch}>
            清空搜索
          </button>
        </div>
      )}

      {canLoadMore && !loading && (
        <div
          ref={loadMoreTrigger}
          className="feed-load-trigger"
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
  ownedItems: OwnedItemsViewModel;
}) {
  const ownershipMatches = item.equipmentIds
    .map(ownedItems.matchItem)
    .filter((match) => match.kind === "exact" || match.kind === "same_model");
  const sameModelCount = ownershipMatches.filter(
    (match) => match.kind === "same_model",
  ).length;

  return (
    <article
      className="glamour-card"
      style={{ "--delay": `${index * 45}ms` } as CSSProperties}
    >
      <div className="image-frame">
        <img
          src={item.image}
          alt={`${item.title}幻化展示`}
          loading={index > 2 ? "lazy" : "eager"}
          referrerPolicy="no-referrer"
          onError={(event) => hideBrokenImage(event.currentTarget)}
        />
        <button
          className="card-open-area"
          type="button"
          aria-label={`查看${item.title}的幻化详情`}
          onClick={() => onOpenDetail(item)}
        />
        <button
          className={saved ? "save-button saved" : "save-button"}
          type="button"
          aria-label={saved ? `取消收藏${item.title}` : `收藏${item.title}`}
          onClick={() => onToggleSave(item.id)}
        >
          <BookmarkSimple weight={saved ? "fill" : "regular"} />
        </button>
      </div>
      <div className="card-body">
        <div className="card-heading">
          <h2>{item.title}</h2>
        </div>
        <p>
          {item.race}
          <span />
          {item.job}
          {/* <span />
          {item.palette} */}
        </p>
        {ownershipMatches.length > 0 && (
          <div className="card-owned-match">
            <CheckCircle weight="fill" />
            <span>
              已匹配 {ownershipMatches.length} 件
              {sameModelCount > 0 ? "，含 " + sameModelCount + " 件同模" : ""}
            </span>
          </div>
        )}
        <div className="card-footer">
          <span>by {item.author}</span>
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
    <div className="glamour-grid skeleton-grid" aria-label="正在加载幻化投稿">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="glamour-card skeleton-card" key={index}>
          <div className="image-frame" />
          <span />
          <small />
        </div>
      ))}
    </div>
  );
}
