/** Complete glamour submission with media, author context, and equipment slots. */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookmarkSimple,
  CalendarBlank,
  CheckCircle,
  CircleNotch,
  Heart,
  Images,
  MapPin,
  Stack,
  Star,
  XCircle,
} from "@phosphor-icons/react";
import type {
  Glamour,
  GlamourDetail,
  GlamourEquipment,
} from "../models/glamour";
import type { OwnedItemMatch, OwnedItemSource } from "../models/ownedItems";
import { hideBrokenImage } from "../utils/glamourPresentation";
import { useGlamourDetailViewModel } from "../viewmodels/useGlamourDetailViewModel";
import { useRisingStonesAvatarViewModel } from "../viewmodels/useRisingStonesAvatarViewModel";
import type { WikiItemViewModel } from "../viewmodels/useWikiItemViewModel";
import type { OwnedItemsViewModel } from "../viewmodels/useOwnedItemsViewModel";
import { EquipmentSourcePopover } from "./EquipmentSourcePopover";
import "./GlamourDetailView.css";

type GlamourDetailViewProps = {
  glamour: Glamour;
  saved: boolean;
  wiki: WikiItemViewModel;
  ownedItems: OwnedItemsViewModel;
  onBack: () => void;
  onSearchEquipment: (equipment: GlamourEquipment, category: string) => void;
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
  wiki,
  ownedItems,
  onBack,
  onSearchEquipment,
  onToggleSave,
}: GlamourDetailViewProps) {
  const { detail, loading, error, retry } = useGlamourDetailViewModel(glamour);

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
          wiki={wiki}
          ownedItems={ownedItems}
          onSearchEquipment={onSearchEquipment}
          onToggleSave={onToggleSave}
        />
      )}
    </main>
  );
}

function DetailContent({
  detail,
  saved,
  wiki,
  ownedItems,
  onSearchEquipment,
  onToggleSave,
}: {
  detail: GlamourDetail;
  saved: boolean;
  wiki: WikiItemViewModel;
  ownedItems: OwnedItemsViewModel;
  onSearchEquipment: (equipment: GlamourEquipment, category: string) => void;
  onToggleSave: (id: number) => void;
}) {
  const [activeImage, setActiveImage] = useState(detail.images[0]);
  const equipment = useMemo(
    () => new Map(detail.equipments.map((item) => [item.slot, item])),
    [detail.equipments],
  );
  const avatar = useRisingStonesAvatarViewModel(detail.avatar);

  useEffect(() => {
    void ownedItems.ensureItemMetadata(
      detail.equipments.map((item) => item.equipmentId),
    );
  }, [detail.equipments, ownedItems]);

  return (
    <article className="detail-layout">
      <section className="detail-media" aria-label="投稿图片">
        <div className="detail-main-image">
          <img
            key={activeImage}
            src={activeImage}
            alt={`${detail.title}幻化大图`}
            referrerPolicy="no-referrer"
            onError={(event) => hideBrokenImage(event.currentTarget)}
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
                  onError={(event) => hideBrokenImage(event.currentTarget)}
                />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="detail-information">
        <header className="detail-heading">
          <div className="detail-author">
            {avatar.source ? (
              <img
                src={avatar.source}
                alt={`${detail.author}的头像`}
                onError={avatar.markFailed}
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
                wiki={wiki}
                ownership={
                  equipment.get(slot)
                    ? ownedItems.matchItem(equipment.get(slot)!.equipmentId)
                    : { kind: "unavailable" }
                }
                onSearchEquipment={onSearchEquipment}
                key={slot}
              />
            ))}
            {equipment.has("FACE") && (
              <EquipmentSlot
                label="面部配饰"
                equipment={equipment.get("FACE")}
                wiki={wiki}
                ownership={ownedItems.matchItem(
                  equipment.get("FACE")!.equipmentId,
                )}
                onSearchEquipment={onSearchEquipment}
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
  wiki,
  ownership,
  onSearchEquipment,
}: {
  label: string;
  equipment?: GlamourEquipment;
  wiki: WikiItemViewModel;
  ownership: OwnedItemMatch;
  onSearchEquipment: (equipment: GlamourEquipment, category: string) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLDivElement | null>(
    null,
  );
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const showPopover = (immediate = false) => {
    if (!equipment?.name || equipment.equipmentId <= 0) return;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    if (popoverOpen) return;
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(
      () => {
        openTimer.current = null;
        setPopoverOpen(true);
        void wiki.load(equipment.name!, equipment.equipmentId);
      },
      immediate ? 0 : 260,
    );
  };
  const keepPopoverOpen = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const hidePopover = () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    openTimer.current = null;
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setPopoverOpen(false);
    }, 220);
  };

  useEffect(
    () => () => {
      if (openTimer.current !== null) window.clearTimeout(openTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

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
        {equipment?.name && equipment.equipmentId > 0 && (
          <EquipmentOwnership match={ownership} />
        )}
      </span>
    </>
  );

  const item =
    equipment?.name && equipment.equipmentId > 0 ? (
      <button
        className="equipment-item equipment-search-link"
        type="button"
        aria-label={`查询${equipment.name}的幻化投稿`}
        onClick={() => onSearchEquipment(equipment, label)}
      >
        {content}
      </button>
    ) : (
      <div
        className={equipment?.name ? "equipment-item" : "equipment-item empty"}
      >
        {content}
      </div>
    );

  const matchesCurrentItem = wiki.itemName === equipment?.name;
  return (
    <div
      ref={setPopoverAnchor}
      className="equipment-slot-wrapper"
      onMouseEnter={() => showPopover()}
      onMouseLeave={hidePopover}
      onFocus={() => showPopover(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          hidePopover();
        }
      }}
    >
      {item}
      {popoverOpen && equipment?.name && (
        <EquipmentSourcePopover
          anchor={popoverAnchor}
          itemName={equipment.name}
          item={matchesCurrentItem ? wiki.item : null}
          status={matchesCurrentItem ? wiki.status : "loading"}
          error={matchesCurrentItem ? wiki.error : null}
          onRetry={() => void wiki.load(equipment.name!, equipment.equipmentId)}
          onKeepOpen={keepPopoverOpen}
          onDismiss={hidePopover}
        />
      )}
    </div>
  );
}

function EquipmentOwnership({ match }: { match: OwnedItemMatch }) {
  if (match.kind === "exact") {
    return (
      <span className="equipment-ownership is-owned">
        <CheckCircle weight="fill" />
        已持有
        <small>{formatOwnedSources(match.sources)}</small>
      </span>
    );
  }
  if (match.kind === "same_model") {
    return (
      <span className="equipment-ownership is-same-model">
        <Stack weight="fill" />
        持有同模
        {match.ownedItemName && <small>{match.ownedItemName}</small>}
      </span>
    );
  }
  if (match.kind === "checking") {
    return (
      <span className="equipment-ownership is-checking">
        <CircleNotch className="spin" />
        正在匹配同模
      </span>
    );
  }
  return (
    <span className="equipment-ownership is-missing">
      <XCircle />
      {match.kind === "not_owned"
        ? "未持有"
        : match.kind === "metadata_unavailable"
          ? "同模状态暂不可用"
          : "尚未同步物品"}
    </span>
  );
}

function formatOwnedSources(sources: OwnedItemSource[]) {
  const labels: Record<OwnedItemSource, string> = {
    equipped: "身上装备",
    inventory: "背包",
    armoury_chest: "兵装库",
    glamour_dresser: "投影台",
    armoire: "收藏柜",
  };
  return sources.map((source) => labels[source]).join("、");
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
