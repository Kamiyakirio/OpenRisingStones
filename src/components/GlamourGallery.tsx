/** Gallery result states and interactions, isolated from page orchestration. */
import type { CSSProperties } from "react";
import {
  BookmarkSimple,
  Heart,
  MagnifyingGlass,
  Plus,
  Sparkle,
} from "@phosphor-icons/react";
import type { Glamour, GlamourOrder } from "../services/glamourApi";
import { replaceBrokenImage } from "../utils/glamourPresentation";

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
  onClearSearch: () => void;
  onRetry: () => void;
  onLoadMore: () => Promise<void>;
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
  onClearSearch,
  onRetry,
  onLoadMore,
}: GlamourGalleryProps) {
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
            : `已显示 ${results.length} / ${total} 套造型`}
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
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <MagnifyingGlass />
          <h2>暂时没有对应投稿</h2>
          <p>更换种族、性别或搜索词后再试一次。</p>
          <button type="button" onClick={onClearSearch}>
            清空搜索
          </button>
        </div>
      )}

      {canLoadMore && !loading && (
        <button
          className="load-more"
          type="button"
          disabled={loadingMore}
          onClick={() => void onLoadMore()}
        >
          {loadingMore ? "正在读取" : "加载更多投稿"}
        </button>
      )}
    </section>
  );
}

function GlamourCard({
  item,
  index,
  saved,
  onToggleSave,
}: {
  item: Glamour;
  index: number;
  saved: boolean;
  onToggleSave: (id: number) => void;
}) {
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
          onError={(event) => replaceBrokenImage(event.currentTarget, index)}
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
          {item.featured && <Sparkle weight="fill" aria-label="最新收录" />}
        </div>
        <p>
          {item.race}
          <span />
          {item.job}
          <span />
          {item.palette}
        </p>
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
