/** Complete glamour submission with media, author context, and equipment slots. */

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
import { useEffect, useMemo, useRef, useState } from "react";
import { useRisingStonesAvatar } from "../../../shared/hooks/useRisingStonesAvatar";
import { useGlamourDetail } from "../hooks/useGlamourDetail";
import type { OwnedItemsState } from "../hooks/useOwnedItems";
import type { WikiItemState } from "../../../shared/wiki/useWikiItem";
import type { OwnedItemMatch, OwnedItemSource } from "../ownedItems.types";
import type { Glamour, GlamourDetail, GlamourEquipment } from "../types";
import { hideBrokenImage } from "../utils/glamourPresentation";
import { EquipmentSourcePopover } from "./EquipmentSourcePopover";

/** Reused presentation strings stay static and are allocated once for this module. */
const detailImageClasses = "absolute inset-0 h-full w-full object-cover";
const detailMetadataBadgeClasses =
  "rounded-control bg-selected px-2.5 py-[7px] text-xs font-bold text-accent";
const detailEquipmentCaptionClasses =
  "overflow-hidden text-xs font-[550] text-ellipsis whitespace-nowrap text-muted";

type GlamourDetailViewProps = {
  glamour: Glamour;
  saved: boolean;
  wiki: WikiItemState;
  ownedItems: OwnedItemsState;
  onBack: () => void;
  onSearchEquipment: (equipment: GlamourEquipment, category: string) => void;
  onToggleSave: (id: number) => void;
};

// Slot order pairs each left-side item with its right-side counterpart on wide grids.
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
  const { detail, loading, error, retry } = useGlamourDetail(glamour);

  // The page owns horizontal gutters; child sections share its content edges.
  return (
    <main
      className="glamour-detail-page @container/glamour-detail mx-auto min-h-[calc(100dvh-56px)] w-full max-w-370 px-5 pt-0 pb-5 max-[899px]:min-h-[calc(100dvh-48px)] max-[899px]:px-4 max-[519px]:px-3"
      id="top"
    >
      <div className="detail-navigation flex min-h-17 items-center justify-between border-b border-solid border-line text-[12px] text-muted max-[600px]:min-h-14.5">
        <button
          className="detail-back group/detail-back inline-flex min-h-9 items-center gap-[9px] border-0 bg-transparent px-0 py-[9px] text-sm font-[720] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] pointer-coarse:min-h-11"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft
            className="h-[17px] w-[17px] text-accent [transition:transform_180ms_ease] group-hover/detail-back:transform-[translateX(-3px)]"
            weight="bold"
          />
          返回幻化列表
        </button>
        <span className="max-[600px]:hidden">幻化详情</span>
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
  wiki: WikiItemState;
  ownedItems: OwnedItemsState;
  onSearchEquipment: (equipment: GlamourEquipment, category: string) => void;
  onToggleSave: (id: number) => void;
}) {
  const [activeImage, setActiveImage] = useState(detail.images[0]);
  const equipment = useMemo(
    () => new Map(detail.equipments.map((item) => [item.slot, item])),
    [detail.equipments],
  );
  const avatar = useRisingStonesAvatar(detail.avatar);
  useEffect(() => {
    void ownedItems.ensureItemMetadata(
      detail.equipments.map((item) => item.equipmentId),
    );
  }, [detail.equipments, ownedItems]);
  return (
    <article className="detail-layout grid min-w-0 grid-cols-1 items-start gap-5 py-5 @min-[980px]/glamour-detail:grid-cols-[minmax(0,_0.92fr)_minmax(0,_1.08fr)] @min-[980px]/glamour-detail:items-stretch">
      {/* Fill the media track explicitly; capped aspect ratios must not shrink its width. */}
      <section
        className="detail-media flex min-w-0 flex-col gap-3 self-start @min-[980px]/glamour-detail:self-stretch"
        aria-label="投稿图片"
      >
        <div className="detail-main-image relative aspect-[4/5] max-h-180 w-full shrink-0 overflow-hidden rounded-control bg-hover @min-[980px]/glamour-detail:aspect-auto @min-[980px]/glamour-detail:max-h-none @min-[980px]/glamour-detail:min-h-90 @min-[980px]/glamour-detail:flex-1">
          <img
            className={detailImageClasses}
            key={activeImage}
            src={activeImage}
            alt={`${detail.title}幻化大图`}
            referrerPolicy="no-referrer"
            onError={(event) => hideBrokenImage(event.currentTarget)}
          />
          <span className="detail-image-count absolute right-3.5 bottom-3.5 inline-flex min-h-8.5 items-center gap-1.5 rounded-control bg-[rgba(20,_29,_30,_0.68)] px-[11px] py-0 text-xs font-bold text-[#f4f6f3] [border:1px_solid_rgba(255,_255,_255,_0.26)] [@media(prefers-reduced-transparency:_reduce)]:bg-[rgba(20,_29,_30,_0.92)]">
            <Images className="h-[15px] w-[15px]" />
            {detail.images.length}
          </span>
        </div>
        {detail.images.length > 1 && (
          <div
            className="detail-thumbnails flex min-w-0 [scroll-snap-type:x_mandatory] flex-row gap-3 overflow-x-auto"
            aria-label="选择投稿图片"
          >
            {detail.images.map((image, index) => (
              <button
                className="relative [aspect-ratio:4_/_5] min-h-9 flex-[0_0_64px] [scroll-snap-align:start] overflow-hidden rounded-control border border-transparent bg-hover p-0 opacity-58 [transition:opacity_180ms_ease,_border-color_180ms_ease,_transform_180ms_ease] hover:border-accent hover:opacity-100 aria-pressed:border-accent aria-pressed:opacity-100 pointer-coarse:min-h-11"
                type="button"
                aria-label={`查看第 ${index + 1} 张图片`}
                aria-pressed={image === activeImage}
                onClick={() => setActiveImage(image)}
                key={image}
              >
                <img
                  className="h-full w-full object-cover"
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

      <section className="detail-information @container/equipment min-w-0">
        <header className="detail-heading flex items-center justify-between gap-3 border-b border-solid border-line pb-4 max-[600px]:items-start">
          <div className="detail-author flex min-w-0 items-center gap-3">
            {avatar.source ? (
              <img
                className="h-12.5 w-12.5 shrink-0 rounded-control object-cover [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line))]"
                src={avatar.source}
                alt={`${detail.author}的头像`}
                onError={avatar.markFailed}
              />
            ) : (
              <span
                className="grid h-12.5 w-12.5 shrink-0 place-items-center rounded-control bg-selected font-sans text-[21px] font-bold text-accent [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line))]"
                aria-hidden="true"
              >
                {detail.author.slice(0, 1)}
              </span>
            )}
            <div className="grid min-w-0 gap-1.5">
              <strong className="overflow-hidden text-[16px] text-ellipsis whitespace-nowrap">
                {detail.author}
              </strong>
              <small className="flex items-center gap-[5px] text-xs text-muted">
                <MapPin className="h-3.5 w-3.5 text-accent" weight="fill" />
                {detail.areaName} {detail.groupName}
              </small>
            </div>
          </div>
          <button
            className={
              saved
                ? "detail-save saved inline-flex min-h-10 items-center gap-[7px] rounded-control border border-solid border-accent bg-transparent px-3.5 py-0 text-[12px] font-[720] text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-accent hover:bg-selected hover:text-accent"
                : "detail-save inline-flex min-h-10 items-center gap-[7px] rounded-control border border-solid border-line bg-transparent px-3.5 py-0 text-[12px] font-[720] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-accent hover:bg-selected hover:text-accent"
            }
            type="button"
            onClick={() => onToggleSave(detail.id)}
          >
            <BookmarkSimple
              className="h-4 w-4"
              weight={saved ? "fill" : "regular"}
            />
            {saved ? "已收藏" : "收藏"}
          </button>
        </header>

        <div className="detail-title-block px-0 py-5">
          <h1 className="m-0 [font-family:var(--ors-font-heading)] text-2xl leading-[1.5] font-semibold tracking-normal max-[600px]:text-2xl">
            {detail.title}
          </h1>
          <div
            className="detail-stats mt-3 flex flex-wrap gap-3 text-[12px] text-muted"
            aria-label="投稿数据"
          >
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-accent" weight="fill" />
              {detail.likes.toLocaleString("zh-CN")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 text-accent" weight="fill" />
              {detail.saved.toLocaleString("zh-CN")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarBlank className="h-4 w-4 text-accent" />
              {formatDetailDate(detail.createdAt)}
            </span>
          </div>
          <p className="mx-0 mt-3 mb-0 max-w-[58ch] text-[14px] leading-[1.75] text-muted">
            {detail.description || "投稿者没有填写造型说明。"}
          </p>
          <div className="detail-tags mt-3 flex flex-wrap gap-2">
            <span className={detailMetadataBadgeClasses}>{detail.race}</span>
            <span className={detailMetadataBadgeClasses}>{detail.job}</span>
          </div>
        </div>

        <section
          className="equipment-section border-t border-solid border-line pt-5"
          aria-labelledby="equipment-title"
        >
          <div className="equipment-heading mb-3 flex items-baseline justify-between gap-3 max-[600px]:grid max-[600px]:gap-[5px]">
            <h2
              className="m-0 text-lg font-semibold tracking-normal"
              id="equipment-title"
            >
              装备搭配
            </h2>
            <span className="text-xs text-muted">染剂按投稿记录显示</span>
          </div>
          <div className="equipment-grid grid grid-cols-1 gap-3 @min-[480px]/equipment:grid-cols-2">
            {EQUIPMENT_SLOTS.map(([slot, label]) => (
              <EquipmentSlot
                label={label}
                equipment={equipment.get(slot)}
                wiki={wiki}
                ownership={
                  equipment.get(slot)
                    ? ownedItems.matchItem(equipment.get(slot)!.equipmentId)
                    : {
                        kind: "unavailable",
                      }
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
  wiki: WikiItemState;
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
      <span className="equipment-icon relative grid h-12.5 w-12.5 place-items-center overflow-hidden rounded-control bg-hover font-sans text-[15px] text-muted [border:1px_solid_color-mix(in_srgb,_var(--ors-color-line)_80%,_transparent)]">
        <span aria-hidden="true">{label.slice(0, 1)}</span>
        {equipment?.icon && (
          <img
            className={detailImageClasses}
            src={equipment.icon}
            alt=""
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </span>
      <span className="equipment-copy grid min-w-0 content-start">
        <small className="text-xs font-[720] text-accent">{label}</small>
        <strong className="mt-[3px] overflow-hidden text-[12px] font-[680] text-ellipsis whitespace-nowrap">
          {equipment?.name || "未装备"}
        </strong>
        {equipment?.dyes.length ? (
          <span className="dye-list mt-[5px] flex min-w-0 gap-2 overflow-hidden">
            {equipment.dyes.map((dye, index) => (
              <span
                className="inline-flex min-w-0 items-center gap-1 overflow-hidden text-xs text-ellipsis whitespace-nowrap text-muted"
                title={dye.name}
                key={`${dye.id}-${index}`}
              >
                <i
                  className="h-2.5 w-2.5 shrink-0 rounded-control [border:1px_solid_color-mix(in_srgb,_var(--ors-color-text)_18%,_transparent)]"
                  style={{
                    backgroundColor: dye.color ?? "var(--ors-color-hover)",
                  }}
                />
                {dye.name}
              </span>
            ))}
          </span>
        ) : (
          <span className="equipment-muted mt-[5px] text-xs text-muted">
            无染剂记录
          </span>
        )}
        {equipment?.name && equipment.equipmentId > 0 && (
          <EquipmentOwnership match={ownership} />
        )}
      </span>
    </>
  );

  // Stretch the item to its grid row so empty and populated slots share both edges.
  const item =
    equipment?.name && equipment.equipmentId > 0 ? (
      <button
        className="equipment-item equipment-search-link box-border grid h-full min-h-18.5 w-full cursor-pointer grid-cols-[50px_minmax(0,_1fr)] items-start gap-[11px] rounded-control border border-solid border-line bg-[color-mix(in_srgb,_var(--ors-color-surface)_74%,_transparent)] p-2.5 text-left text-ink [font:inherit] [text-decoration:none] [transition:border-color_180ms_ease,_transform_180ms_ease] hover:border-accent"
        type="button"
        aria-label={`查询${equipment.name}的幻化投稿`}
        onClick={() => onSearchEquipment(equipment, label)}
      >
        {content}
      </button>
    ) : (
      <div
        className={
          equipment?.name
            ? "equipment-item box-border grid h-full min-h-18.5 w-full grid-cols-[50px_minmax(0,_1fr)] items-start gap-[11px] rounded-control border border-solid border-line bg-[color-mix(in_srgb,_var(--ors-color-surface)_74%,_transparent)] p-2.5 text-ink [text-decoration:none]"
            : "equipment-item empty box-border grid h-full min-h-18.5 w-full grid-cols-[50px_minmax(0,_1fr)] items-start gap-[11px] rounded-control border border-solid border-line bg-transparent p-2.5 text-ink opacity-58 [text-decoration:none]"
        }
      >
        {content}
      </div>
    );
  const matchesCurrentItem = wiki.itemName === equipment?.name;
  return (
    <div
      ref={setPopoverAnchor}
      className="equipment-slot-wrapper relative min-w-0 rounded-control [outline:none]"
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
      <span className="equipment-ownership is-owned mt-1.5 flex min-w-0 items-center gap-1 text-xs font-[720] text-accent">
        <CheckCircle className="h-3 w-3 shrink-0" weight="fill" />
        已持有
        <small className={detailEquipmentCaptionClasses}>
          {formatOwnedSources(match.sources)}
        </small>
      </span>
    );
  }
  if (match.kind === "same_model") {
    return (
      <span className="equipment-ownership is-same-model mt-1.5 flex min-w-0 items-center gap-1 text-xs font-[720] text-accent">
        <Stack className="h-3 w-3 shrink-0" weight="fill" />
        持有同模
        {match.ownedItemName && (
          <small className={detailEquipmentCaptionClasses}>
            {match.ownedItemName}
          </small>
        )}
      </span>
    );
  }
  if (match.kind === "checking") {
    return (
      <span className="equipment-ownership is-checking mt-1.5 flex min-w-0 items-center gap-1 text-xs font-[720] text-muted">
        <CircleNotch className="spin h-3 w-3 shrink-0 animate-[login-spin_900ms_linear_infinite]" />
        正在匹配同模
      </span>
    );
  }
  return (
    <span className="equipment-ownership is-missing mt-1.5 flex min-w-0 items-center gap-1 text-xs font-[720] text-muted">
      <XCircle className="h-3 w-3 shrink-0" />
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
      className="detail-layout detail-skeleton grid min-w-0 grid-cols-1 items-start gap-5 py-5 @min-[980px]/glamour-detail:grid-cols-[minmax(0,_0.92fr)_minmax(0,_1.08fr)] @min-[980px]/glamour-detail:items-stretch"
      aria-label="正在加载幻化详情"
    >
      <div className="detail-skeleton-media block aspect-[4/5] max-h-180 w-full animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%] @min-[980px]/glamour-detail:aspect-auto @min-[980px]/glamour-detail:max-h-none @min-[980px]/glamour-detail:min-h-90" />
      <div className="detail-skeleton-copy">
        <span className="block h-12.5 w-[40%] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%]" />
        <strong className="mt-5 block h-15.5 w-[68%] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%]" />
        <small className="mt-5.5 block h-4.5 w-[48%] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%]" />
        <div className="mt-5 block h-95 w-full animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%]" />
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
    <div
      className="detail-error grid min-h-80 content-center justify-items-center px-5 py-10 text-center"
      role="alert"
    >
      <Images className="h-9.5 w-9.5 text-accent" />
      <h1 className="mx-0 mt-4.5 mb-[7px] [font-family:var(--ors-font-heading)] text-2xl font-bold tracking-tight">
        无法显示这套幻化
      </h1>
      <p className="m-0 text-sm text-muted">{message}</p>
      <button
        className="mt-5.5 min-h-9 rounded-control border border-solid border-accent bg-transparent px-4 py-2.5 font-bold text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-selected pointer-coarse:min-h-11"
        type="button"
        onClick={onRetry}
      >
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
