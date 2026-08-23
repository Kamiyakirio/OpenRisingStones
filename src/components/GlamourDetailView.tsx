/** Complete glamour submission with media, author context, and equipment slots. */
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookmarkSimple,
  CalendarBlank,
  Heart,
  Images,
  MapPin,
  Star,
} from "@phosphor-icons/react";
import { useGlamourDetail } from "../hooks/useGlamourDetail";
import type {
  Glamour,
  GlamourDetail,
  GlamourEquipment,
} from "../services/glamourApi";
import { replaceBrokenImage } from "../utils/glamourPresentation";
import "./GlamourDetailView.css";

type GlamourDetailViewProps = {
  glamour: Glamour;
  saved: boolean;
  onBack: () => void;
  onToggleSave: (id: number) => void;
};

const EQUIPMENT_SLOTS = [
  ["MAIN_HAND", "主手"],
  ["OFF_HAND", "副手"],
  ["HEAD", "头部"],
  ["EARS", "耳坠"],
  ["BODY", "上衣"],
  ["NECK", "项链"],
  ["GLOVES", "手部"],
  ["WRISTS", "手镯"],
  ["LEGS", "腿部"],
  ["FINGER_LEFT", "左戒指"],
  ["FEET", "脚部"],
  ["FINGER_RIGHT", "右戒指"],
] as const;

export function GlamourDetailView({
  glamour,
  saved,
  onBack,
  onToggleSave,
}: GlamourDetailViewProps) {
  const { detail, loading, error, retry } = useGlamourDetail(glamour);

  return (
    <main className="glamour-detail-page" id="top">
      <div className="detail-navigation">
        <button className="detail-back" type="button" onClick={onBack}>
          <ArrowLeft weight="bold" />
          返回幻化列表
        </button>
        <span>幻化详情</span>
      </div>
      {loading ? (
        <DetailSkeleton />
      ) : error || !detail ? (
        <DetailError message={error ?? "未找到幻化详情"} onRetry={retry} />
      ) : (
        <DetailContent
          detail={detail}
          saved={saved}
          onToggleSave={onToggleSave}
        />
      )}
    </main>
  );
}

function DetailContent({
  detail,
  saved,
  onToggleSave,
}: {
  detail: GlamourDetail;
  saved: boolean;
  onToggleSave: (id: number) => void;
}) {
  const [activeImage, setActiveImage] = useState(detail.images[0]);
  const equipment = useMemo(
    () => new Map(detail.equipments.map((item) => [item.slot, item])),
    [detail.equipments],
  );

  return (
    <article className="detail-layout">
      <section className="detail-media" aria-label="投稿图片">
        <div className="detail-main-image">
          <img
            src={activeImage}
            alt={`${detail.title}幻化大图`}
            referrerPolicy="no-referrer"
            onError={(event) => replaceBrokenImage(event.currentTarget, 0)}
          />
          <span className="detail-image-count">
            <Images />
            {detail.images.length}
          </span>
        </div>
        {detail.images.length > 1 && (
          <div className="detail-thumbnails" aria-label="选择投稿图片">
            {detail.images.map((image, index) => (
              <button
                className={image === activeImage ? "active" : ""}
                type="button"
                aria-label={`查看第 ${index + 1} 张图片`}
                aria-pressed={image === activeImage}
                onClick={() => setActiveImage(image)}
                key={image}
              >
                <img
                  src={image}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(event) =>
                    replaceBrokenImage(event.currentTarget, index)
                  }
                />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="detail-information">
        <header className="detail-heading">
          <div className="detail-author">
            {detail.avatar ? (
              <img
                src={detail.avatar}
                alt={`${detail.author}的头像`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span aria-hidden="true">{detail.author.slice(0, 1)}</span>
            )}
            <div>
              <strong>{detail.author}</strong>
              <small>
                <MapPin weight="fill" />
                {detail.areaName} {detail.groupName}
              </small>
            </div>
          </div>
          <button
            className={saved ? "detail-save saved" : "detail-save"}
            type="button"
            onClick={() => onToggleSave(detail.id)}
          >
            <BookmarkSimple weight={saved ? "fill" : "regular"} />
            {saved ? "已收藏" : "收藏"}
          </button>
        </header>

        <div className="detail-title-block">
          <h1>{detail.title}</h1>
          <div className="detail-stats" aria-label="投稿数据">
            <span>
              <Heart weight="fill" />
              {detail.likes.toLocaleString("zh-CN")}
            </span>
            <span>
              <Star weight="fill" />
              {detail.saved.toLocaleString("zh-CN")}
            </span>
            <span>
              <CalendarBlank />
              {formatDetailDate(detail.createdAt)}
            </span>
          </div>
          <p>{detail.description || "投稿者没有填写造型说明。"}</p>
          <div className="detail-tags">
            <span>{detail.race}</span>
            <span>{detail.job}</span>
          </div>
        </div>

        <section
          className="equipment-section"
          aria-labelledby="equipment-title"
        >
          <div className="equipment-heading">
            <h2 id="equipment-title">装备搭配</h2>
            <span>染剂按投稿记录显示</span>
          </div>
          <div className="equipment-grid">
            {EQUIPMENT_SLOTS.map(([slot, label]) => (
              <EquipmentSlot
                label={label}
                equipment={equipment.get(slot)}
                key={slot}
              />
            ))}
            {equipment.has("FACE") && (
              <EquipmentSlot
                label="面部配饰"
                equipment={equipment.get("FACE")}
              />
            )}
          </div>
        </section>
      </section>
    </article>
  );
}

function EquipmentSlot({
  label,
  equipment,
}: {
  label: string;
  equipment?: GlamourEquipment;
}) {
  const content = (
    <>
      <span className="equipment-icon">
        <span aria-hidden="true">{label.slice(0, 1)}</span>
        {equipment?.icon && (
          <img
            src={equipment.icon}
            alt=""
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </span>
      <span className="equipment-copy">
        <small>{label}</small>
        <strong>{equipment?.name || "未装备"}</strong>
        {equipment?.dyes.length ? (
          <span className="dye-list">
            {equipment.dyes.map((dye, index) => (
              <span title={dye.name} key={`${dye.id}-${index}`}>
                <i
                  style={{ backgroundColor: dye.color ?? "var(--surface-2)" }}
                />
                {dye.name}
              </span>
            ))}
          </span>
        ) : (
          <span className="equipment-muted">无染剂记录</span>
        )}
      </span>
    </>
  );

  return equipment?.shopUrl ? (
    <a
      className="equipment-item equipment-shop-link"
      href={equipment.shopUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`${equipment.name}，前往商城`}
    >
      {content}
    </a>
  ) : (
    <div
      className={equipment?.name ? "equipment-item" : "equipment-item empty"}
    >
      {content}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div
      className="detail-layout detail-skeleton"
      aria-label="正在加载幻化详情"
    >
      <div className="detail-skeleton-media" />
      <div className="detail-skeleton-copy">
        <span />
        <strong />
        <small />
        <div />
      </div>
    </div>
  );
}

function DetailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="detail-error" role="alert">
      <Images />
      <h1>无法显示这套幻化</h1>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        重新加载
      </button>
    </div>
  );
}

function formatDetailDate(value: string) {
  if (!value) return "时间未公开";
  const [date] = value.split(" ");
  return date.replaceAll("-", ".");
}
