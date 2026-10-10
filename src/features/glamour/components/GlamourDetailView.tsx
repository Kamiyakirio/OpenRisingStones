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
      className={
        "glamour-detail-page @container/glamour-detail mx-auto w-full max-w-[1480px] px-5 pb-5 pt-0 min-h-[calc(100dvh-56px)] max-[899px]:px-4 max-[899px]:min-h-[calc(100dvh-48px)] max-[519px]:px-3"
      }
      id="top"
    >
      <div
        className={
          "detail-navigation flex justify-between items-center min-h-[68px] border-b border-solid border-line text-muted max-[600px]:min-h-[58px] max-[600px]:[&_>_span]:hidden [&&&&]:text-[12px]"
        }
      >
        <button
          className={
            "detail-back inline-flex items-center gap-[9px] border-0 text-ink text-sm [&_svg]:w-[17px] [&_svg]:h-[17px] [&_svg]:text-accent [&&&&]:p-[9px_0] [&&&&]:[background:transparent] [&&&&]:[font-weight:720] [&&&&_svg]:[transition:transform_180ms_ease] [&&&&:hover_svg]:transform-[translateX(-3px)]"
          }
          type="button"
          onClick={onBack}
        >
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
    <article
      className={
        "detail-layout grid min-w-0 grid-cols-1 items-start gap-5 py-5 @min-[980px]/glamour-detail:items-stretch @min-[980px]/glamour-detail:grid-cols-[minmax(0,_0.92fr)_minmax(0,_1.08fr)] [@media(prefers-reduced-motion:_no-preference)]:[&&&&:not(.detail-skeleton)]:animate-[detail-enter_560ms_both_cubic-bezier(0.16,_1,_0.3,_1)]"
      }
    >
      {/* Fill the media track explicitly; capped aspect ratios must not shrink its width. */}
      <section
        className={
          "detail-media flex min-w-0 flex-col gap-3 self-start @min-[980px]/glamour-detail:self-stretch"
        }
        aria-label="投稿图片"
      >
        <div
          className={
            "detail-main-image relative w-full aspect-[4/5] max-h-[720px] shrink-0 overflow-hidden @min-[980px]/glamour-detail:aspect-auto @min-[980px]/glamour-detail:min-h-[360px] @min-[980px]/glamour-detail:max-h-none @min-[980px]/glamour-detail:flex-1 rounded-[var(--ors-radius-control)] bg-hover [&_>_img]:w-full [&_>_img]:h-full [&_>_img]:object-cover [&_>_img]:absolute [&_>_img]:inset-0"
          }
        >
          <img
            key={activeImage}
            src={activeImage}
            alt={`${detail.title}幻化大图`}
            referrerPolicy="no-referrer"
            onError={(event) => hideBrokenImage(event.currentTarget)}
          />
          <span
            className={
              "detail-image-count absolute inline-flex items-center gap-[6px] min-h-[34px] rounded-[var(--ors-radius-control)] text-xs font-bold [&_svg]:w-[15px] [&_svg]:h-[15px] [&&&&]:right-[14px] [&&&&]:bottom-[14px] [&&&&]:p-[0_11px] [&&&&]:[border:1px_solid_rgba(255,_255,_255,_0.26)] [&&&&]:[color:#f4f6f3] [&&&&]:[background:rgba(20,_29,_30,_0.68)] [@media(prefers-reduced-transparency:_reduce)]:[&&&&]:[background:rgba(20,_29,_30,_0.92)]"
            }
          >
            <Images />
            {detail.images.length}
          </span>
        </div>
        {detail.images.length > 1 && (
          <div
            className={
              "detail-thumbnails flex flex-row gap-3 overflow-x-auto min-w-0 [&_button]:relative [&_button]:p-0 [&_button]:overflow-hidden [&_button]:rounded-[var(--ors-radius-control)] [&_button]:bg-hover [&_button:hover]:border-accent [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&&&&_button]:[aspect-ratio:4_/_5] [&&&&_button]:[border:1px_solid_transparent] [&&&&_button]:opacity-[0.58] [&&&&_button]:[transition:opacity_180ms_ease,_border-color_180ms_ease,_transform_180ms_ease] [&&&&_button:hover]:opacity-[1] [scroll-snap-type:x_mandatory] [&_button]:flex-[0_0_64px] [&_button]:[scroll-snap-align:start]"
            }
            aria-label="选择投稿图片"
          >
            {detail.images.map((image, index) => (
              <button
                className={
                  image === activeImage
                    ? "active [.detail-thumbnails_button&]:border-accent [.detail-thumbnails_button&&&&]:opacity-[1]"
                    : ""
                }
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

      <section className="detail-information @container/equipment min-w-0">
        <header className="detail-heading flex justify-between items-center gap-3 pb-4 border-b border-solid border-line max-[600px]:items-start">
          <div
            className={
              "detail-author flex items-center gap-3 min-w-0 [&_>_img]:w-[50px] [&_>_img]:h-[50px] [&_>_img]:rounded-[var(--ors-radius-control)] [&_>_span]:w-[50px] [&_>_span]:h-[50px] [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_img]:object-cover [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:text-accent [&_>_span]:bg-selected [&_>_span]:font-bold [&_div]:grid [&_div]:gap-[6px] [&_div]:min-w-0 [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&_small]:flex [&_small]:items-center [&_small]:gap-[5px] [&_small]:text-muted [&_small]:text-xs [&_small_svg]:w-[14px] [&_small_svg]:h-[14px] [&_small_svg]:text-accent [&&&&_>_img]:flex-[0_0_auto] [&&&&_>_img]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line))] [&&&&_>_span]:flex-[0_0_auto] [&&&&_>_span]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line))] [&&&&_>_span]:[font-family:var(--ors-font-ui)] [&&&&_>_span]:text-[21px] [&&&&_strong]:text-[16px] [&&&&_strong]:[text-overflow:ellipsis]"
            }
          >
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
            className={
              saved
                ? "detail-save saved inline-flex items-center gap-[7px] min-h-[40px] border border-solid border-line rounded-[var(--ors-radius-control)] text-ink [&:hover]:border-accent [&:hover]:text-accent [&:hover]:bg-selected [&_svg]:w-[16px] [&_svg]:h-[16px] [.detail-save&]:border-accent [.detail-save&]:text-accent [.detail-save&]:bg-selected [.save-button&]:text-on-accent [.save-button&]:bg-accent [&&&&]:p-[0_14px] [&&&&]:[background:transparent] [&&&&]:text-[12px] [&&&&]:[font-weight:720]"
                : "detail-save inline-flex items-center gap-[7px] min-h-[40px] border border-solid border-line rounded-[var(--ors-radius-control)] text-ink [&:hover]:border-accent [&:hover]:text-accent [&:hover]:bg-selected [&_svg]:w-[16px] [&_svg]:h-[16px] [&&&&]:p-[0_14px] [&&&&]:[background:transparent] [&&&&]:text-[12px] [&&&&]:[font-weight:720]"
            }
            type="button"
            onClick={() => onToggleSave(detail.id)}
          >
            <BookmarkSimple weight={saved ? "fill" : "regular"} />
            {saved ? "已收藏" : "收藏"}
          </button>
        </header>

        <div
          className={
            "detail-title-block [&_h1]:m-0 [&_h1]:text-2xl [&_h1]:font-semibold [&_>_p]:text-muted max-[600px]:[&_h1]:text-2xl [&&&&]:p-[20px_0] [&&&&_h1]:[font-family:var(--ors-font-heading)] [&&&&_h1]:leading-[1.5] [&&&&_h1]:[letter-spacing:normal] [&&&&_>_p]:max-w-[58ch] [&&&&_>_p]:m-[12px_0_0] [&&&&_>_p]:text-[14px] [&&&&_>_p]:leading-[1.75]"
          }
        >
          <h1 className="text-2xl font-bold tracking-tight">{detail.title}</h1>
          <div
            className={
              "detail-stats flex flex-wrap gap-3 mt-3 text-muted [&_span]:inline-flex [&_span]:items-center [&_span]:gap-[6px] [&_svg]:w-[16px] [&_svg]:h-[16px] [&_svg]:text-accent [&&&&]:text-[12px]"
            }
            aria-label="投稿数据"
          >
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
          <div
            className={
              "detail-tags flex flex-wrap gap-2 mt-3 [&_span]:rounded-[var(--ors-radius-control)] [&_span]:text-accent [&_span]:bg-selected [&_span]:text-xs [&_span]:font-bold [&&&&_span]:p-[7px_10px]"
            }
          >
            <span>{detail.race}</span>
            <span>{detail.job}</span>
          </div>
        </div>

        <section
          className="equipment-section pt-5 border-t border-solid border-line"
          aria-labelledby="equipment-title"
        >
          <div
            className={
              "equipment-heading flex justify-between items-baseline gap-3 mb-3 [&_h2]:m-0 [&_h2]:text-lg [&_span]:text-muted [&_span]:text-xs max-[600px]:grid max-[600px]:gap-[5px] [&&&&_h2]:[letter-spacing:normal]"
            }
          >
            <h2 className="text-lg font-semibold" id="equipment-title">
              装备搭配
            </h2>
            <span>染剂按投稿记录显示</span>
          </div>
          <div
            className={
              "equipment-grid grid grid-cols-1 gap-3 @min-[480px]/equipment:grid-cols-2"
            }
          >
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
      <span
        className={
          "equipment-icon relative grid place-items-center w-[50px] h-[50px] overflow-hidden rounded-[var(--ors-radius-control)] text-muted bg-hover [&_img]:absolute [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&&&&]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-line)_80%,_transparent)] [&&&&]:[font-family:var(--ors-font-ui)] [&&&&]:text-[15px] [&&&&_img]:inset-[0]"
        }
      >
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
      <span
        className={
          "equipment-copy grid min-w-0 content-start [&_>_small]:text-accent [&_>_small]:text-xs [&_>_strong]:mt-[3px] [&_>_strong]:overflow-hidden [&_>_strong]:whitespace-nowrap [&&&&_>_small]:[font-weight:720] [&&&&_>_strong]:text-[12px] [&&&&_>_strong]:[font-weight:680] [&&&&_>_strong]:[text-overflow:ellipsis]"
        }
      >
        <small>{label}</small>
        <strong>{equipment?.name || "未装备"}</strong>
        {equipment?.dyes.length ? (
          <span
            className={
              "dye-list flex min-w-0 gap-[8px] mt-[5px] overflow-hidden [&_>_span]:inline-flex [&_>_span]:items-center [&_>_span]:gap-[4px] [&_>_span]:min-w-0 [&_>_span]:overflow-hidden [&_>_span]:text-muted [&_>_span]:text-xs [&_>_span]:whitespace-nowrap [&_i]:w-[10px] [&_i]:h-[10px] [&_i]:rounded-[var(--ors-radius-control)] [&&&&_>_span]:[text-overflow:ellipsis] [&&&&_i]:flex-[0_0_auto] [&&&&_i]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-text)_18%,_transparent)]"
            }
          >
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
          <span className="equipment-muted mt-[5px] text-muted text-xs">
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
        className={
          "equipment-item equipment-search-link grid h-full items-start gap-[11px] min-h-[74px] p-[10px] border border-solid border-line rounded-[var(--ors-radius-control)] text-ink [.equipment-slot-wrapper_>_&]:w-full [.equipment-slot-wrapper_>_&]:box-border text-left cursor-pointer [&:hover]:border-accent [&&&&]:grid-cols-[50px_minmax(0,_1fr)] [&&&&]:[background:color-mix(in_srgb,_var(--ors-color-surface)_74%,_transparent)] [&&&&]:[text-decoration:none] [&&&&]:[font:inherit] [&&&&]:[transition:border-color_180ms_ease,_transform_180ms_ease]"
        }
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
            ? "equipment-item grid h-full items-start gap-[11px] min-h-[74px] p-[10px] border border-solid border-line rounded-[var(--ors-radius-control)] text-ink [.equipment-slot-wrapper_>_&]:w-full [.equipment-slot-wrapper_>_&]:box-border [&&&&]:grid-cols-[50px_minmax(0,_1fr)] [&&&&]:[background:color-mix(in_srgb,_var(--ors-color-surface)_74%,_transparent)] [&&&&]:[text-decoration:none]"
            : "equipment-item empty grid h-full items-start gap-[11px] min-h-[74px] p-[10px] border border-solid border-line rounded-[var(--ors-radius-control)] text-ink [.equipment-slot-wrapper_>_&]:w-full [.equipment-slot-wrapper_>_&]:box-border [&&&&]:grid-cols-[50px_minmax(0,_1fr)] [&&&&]:[background:color-mix(in_srgb,_var(--ors-color-surface)_74%,_transparent)] [&&&&]:[text-decoration:none] [.equipment-item&&&&]:[background:transparent] [.equipment-item&&&&]:opacity-[0.58]"
        }
      >
        {content}
      </div>
    );

  const matchesCurrentItem = wiki.itemName === equipment?.name;
  return (
    <div
      ref={setPopoverAnchor}
      className={
        "equipment-slot-wrapper relative min-w-0 rounded-[var(--ors-radius-control)] [&&&&]:[outline:none]"
      }
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
      <span
        className={
          "equipment-ownership is-owned flex items-center gap-[4px] min-w-0 mt-[6px] text-xs [&_svg]:w-[12px] [&_svg]:h-[12px] [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap [.equipment-ownership&]:text-accent [&&&&]:[font-weight:720] [&&&&_svg]:flex-[0_0_auto] [&&&&_small]:[font-weight:550] [&&&&_small]:[text-overflow:ellipsis]"
        }
      >
        <CheckCircle weight="fill" />
        已持有
        <small>{formatOwnedSources(match.sources)}</small>
      </span>
    );
  }
  if (match.kind === "same_model") {
    return (
      <span
        className={
          "equipment-ownership is-same-model flex items-center gap-[4px] min-w-0 mt-[6px] text-xs [&_svg]:w-[12px] [&_svg]:h-[12px] [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap [.equipment-ownership&]:text-accent [&&&&]:[font-weight:720] [&&&&_svg]:flex-[0_0_auto] [&&&&_small]:[font-weight:550] [&&&&_small]:[text-overflow:ellipsis]"
        }
      >
        <Stack weight="fill" />
        持有同模
        {match.ownedItemName && <small>{match.ownedItemName}</small>}
      </span>
    );
  }
  if (match.kind === "checking") {
    return (
      <span
        className={
          "equipment-ownership is-checking flex items-center gap-[4px] min-w-0 mt-[6px] text-xs [&_svg]:w-[12px] [&_svg]:h-[12px] [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap [.equipment-ownership&]:text-muted [&&&&]:[font-weight:720] [&&&&_svg]:flex-[0_0_auto] [&&&&_small]:[font-weight:550] [&&&&_small]:[text-overflow:ellipsis]"
        }
      >
        <CircleNotch
          className={"spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"}
        />
        正在匹配同模
      </span>
    );
  }
  return (
    <span
      className={
        "equipment-ownership is-missing flex items-center gap-[4px] min-w-0 mt-[6px] text-xs [&_svg]:w-[12px] [&_svg]:h-[12px] [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap [.equipment-ownership&]:text-muted [&&&&]:[font-weight:720] [&&&&_svg]:flex-[0_0_auto] [&&&&_small]:[font-weight:550] [&&&&_small]:[text-overflow:ellipsis]"
      }
    >
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
      className={
        "detail-layout detail-skeleton grid min-w-0 grid-cols-1 items-start gap-5 py-5 @min-[980px]/glamour-detail:items-stretch @min-[980px]/glamour-detail:grid-cols-[minmax(0,_0.92fr)_minmax(0,_1.08fr)] [@media(prefers-reduced-motion:_no-preference)]:[&&&&:not(.detail-skeleton)]:animate-[detail-enter_560ms_both_cubic-bezier(0.16,_1,_0.3,_1)]"
      }
      aria-label="正在加载幻化详情"
    >
      <div
        className={
          "detail-skeleton-media block w-full aspect-[4/5] max-h-[720px] @min-[980px]/glamour-detail:aspect-auto @min-[980px]/glamour-detail:min-h-[360px] @min-[980px]/glamour-detail:max-h-none rounded-[var(--ors-radius-control)] [&&&&]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [&&&&]:[background-size:240%_100%] [&&&&]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [@media(prefers-reduced-motion:_reduce)]:[&&&&]:animate-[none]"
        }
      />
      <div
        className={
          "detail-skeleton-copy [&_>_span]:block [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_strong]:block [&_>_strong]:rounded-[var(--ors-radius-control)] [&_>_small]:block [&_>_small]:rounded-[var(--ors-radius-control)] [&_>_div]:block [&_>_div]:rounded-[var(--ors-radius-control)] [&_>_span]:h-[50px] [&_>_strong]:h-[62px] [&_>_strong]:mt-5 [&_>_small]:h-[18px] [&_>_small]:mt-[22px] [&_>_div]:w-full [&_>_div]:h-[380px] [&_>_div]:mt-5 [&&&&_>_span]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [&&&&_>_span]:[background-size:240%_100%] [&&&&_>_span]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_>_strong]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [&&&&_>_strong]:[background-size:240%_100%] [&&&&_>_strong]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_>_small]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [&&&&_>_small]:[background-size:240%_100%] [&&&&_>_small]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_>_div]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [&&&&_>_div]:[background-size:240%_100%] [&&&&_>_div]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_>_span]:w-[40%] [&&&&_>_strong]:w-[68%] [&&&&_>_small]:w-[48%] [@media(prefers-reduced-motion:_reduce)]:[&&&&_>_span]:animate-[none] [@media(prefers-reduced-motion:_reduce)]:[&&&&_>_strong]:animate-[none] [@media(prefers-reduced-motion:_reduce)]:[&&&&_>_small]:animate-[none] [@media(prefers-reduced-motion:_reduce)]:[&&&&_>_div]:animate-[none]"
        }
      >
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
    <div
      className={
        "detail-error grid min-h-[520px] text-center [&_>_svg]:w-[38px] [&_>_svg]:h-[38px] [&_>_svg]:text-accent [&_h1]:text-2xl [&_p]:m-0 [&_p]:text-muted [&_p]:text-sm [&_button]:mt-[22px] [&_button]:border [&_button]:border-solid [&_button]:border-accent [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-accent [&_button]:font-bold [&_button:hover]:bg-selected [&&&&]:[justify-items:center] [&&&&]:[align-content:center] [&&&&]:p-[40px_20px] [&&&&_h1]:m-[18px_0_7px] [&&&&_h1]:[font-family:var(--ors-font-heading)] [&&&&_button]:p-[10px_16px] [&&&&_button]:[background:transparent]"
      }
      role="alert"
    >
      <Images />
      <h1 className="text-2xl font-bold tracking-tight">无法显示这套幻化</h1>
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
