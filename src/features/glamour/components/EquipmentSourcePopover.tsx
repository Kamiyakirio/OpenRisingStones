/** Compact hover surface for Wiki acquisition routes and shared-model equipment. */

import clsx from "clsx";
import {
  ArrowClockwise,
  ArrowSquareOut,
  ArrowsLeftRight,
  CaretDown,
  Check,
  Coins,
  Hammer,
  MapPin,
  Package,
  Prohibit,
  Scroll,
  ShoppingBagOpen,
  Sword,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useLayoutEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { WikiLoadStatus } from "../../../shared/wiki/useWikiItem";
import {
  clusterModelItems,
  type ModelNameCluster,
} from "../utils/modelNameClusters";
import type {
  WikiAcquisition,
  WikiAcquisitionType,
  WikiItemData,
  WikiModelItem,
  WikiSourceItem,
} from "../../../shared/wiki/wiki.types.ts";
import {
  glamourMetadataCaptionClasses,
  glamourTruncatedNameClasses,
} from "../utilityClasses";

/** Reused presentation strings stay static and are allocated once for this module. */
const sourceSectionHeadingClasses =
  "equipment-source-section-heading mb-[7px] flex items-center justify-between";
const sourceTitleClasses =
  "m-0 text-base text-[12px] font-semibold tracking-normal";
const sourceLinkIconClasses = "mt-[1px] h-[11px] w-[11px] shrink-0 text-accent";
const sourceLocationClasses =
  "overflow-hidden text-xs leading-[1.35] text-ellipsis whitespace-nowrap text-muted";

type EquipmentSourcePopoverProps = {
  anchor: HTMLElement | null;
  itemName: string;
  item: WikiItemData | null;
  status: WikiLoadStatus;
  error: string | null;
  onRetry: () => void;
  onKeepOpen: () => void;
  onDismiss: () => void;
};
type PopoverPosition = {
  left: number;
  top: number | null;
  bottom: number | null;
  width: number;
  maxHeight: number;
};
export function EquipmentSourcePopover({
  anchor,
  itemName,
  item,
  status,
  error,
  onRetry,
  onKeepOpen,
  onDismiss,
}: EquipmentSourcePopoverProps) {
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  useLayoutEffect(() => {
    if (!anchor) return;
    let animationFrame = 0;
    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const edge = 12;
      const gap = 6;
      const width = Math.min(430, viewportWidth - edge * 2);
      const availableBelow = viewportHeight - rect.bottom - gap - edge;
      const availableAbove = rect.top - gap - edge;
      const showBelow =
        availableBelow >= 280 || availableBelow >= availableAbove;
      const availableHeight = Math.max(
        140,
        showBelow ? availableBelow : availableAbove,
      );
      const nextPosition: PopoverPosition = {
        left: Math.min(
          Math.max(
            edge,
            rect.left + rect.width / 2 > viewportWidth / 2
              ? rect.right - width
              : rect.left,
          ),
          viewportWidth - width - edge,
        ),
        top: showBelow ? rect.bottom + gap : null,
        bottom: showBelow ? null : viewportHeight - rect.top + gap,
        width,
        maxHeight: Math.min(620, availableHeight),
      };
      setPosition((current) =>
        current &&
        current.left === nextPosition.left &&
        current.top === nextPosition.top &&
        current.bottom === nextPosition.bottom &&
        current.width === nextPosition.width &&
        current.maxHeight === nextPosition.maxHeight
          ? current
          : nextPosition,
      );
    };
    const schedulePositionUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updatePosition();
      });
    };
    updatePosition();
    const resizeObserver = new ResizeObserver(schedulePositionUpdate);
    resizeObserver.observe(anchor);
    window.addEventListener("resize", schedulePositionUpdate);
    document.addEventListener("scroll", schedulePositionUpdate, true);
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", schedulePositionUpdate);
      document.removeEventListener("scroll", schedulePositionUpdate, true);
    };
  }, [anchor]);
  const style: CSSProperties = {
    left: position?.left,
    top: position?.top ?? undefined,
    bottom: position?.bottom ?? undefined,
    width: position?.width,
    maxHeight: position?.maxHeight,
    visibility: position ? "visible" : "hidden",
  };
  const portalRoot =
    document.querySelector<HTMLElement>(".app") ?? document.body;
  return createPortal(
    <aside
      className="equipment-source-popover fixed z-120 text-ink"
      style={style}
      aria-label={`${itemName}的获取方式与同模装备`}
      aria-live="polite"
      onMouseEnter={onKeepOpen}
      onMouseLeave={onDismiss}
      onFocus={onKeepOpen}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onDismiss();
        }
      }}
    >
      <div className="equipment-source-popover-inner box-border max-h-[inherit] [scrollbar-width:thin] overflow-auto [overscroll-behavior:contain] rounded-overlay bg-[color-mix(_in_srgb,_var(--ors-color-surface)_96%,_var(--ors-color-canvas)_)] shadow-[var(--ors-shadow-popover)] [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_34%,_var(--ors-color-line))]">
        <header className="equipment-source-header sticky top-0 z-1 flex min-h-14 items-center justify-between gap-4.5 border-b border-solid border-line bg-[color-mix(in_srgb,_var(--ors-color-surface)_94%,_transparent)] px-3 py-[9px] [@media(prefers-reduced-transparency:_reduce)]:bg-surface">
          <span className="grid min-w-0 gap-[3px]">
            <small className="text-xs font-[760] text-accent">
              获取方式与同模
            </small>
            <strong className="overflow-hidden text-sm text-ellipsis whitespace-nowrap">
              {itemName}
            </strong>
          </span>
          {item?.canonicalUrl && (
            <a
              className="inline-flex min-h-8 shrink-0 items-center gap-[5px] rounded-control border border-solid border-line bg-transparent px-[9px] py-0 text-xs font-bold text-muted [text-decoration:none] hover:border-accent hover:bg-selected hover:text-accent"
              href={item.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`在 Wiki 查看${itemName}`}
            >
              Wiki
              <ArrowSquareOut className="h-[13px] w-[13px]" />
            </a>
          )}
        </header>
        {status === "ready" && item ? (
          <EquipmentSourceContent item={item} />
        ) : status === "error" ? (
          <div className="equipment-source-state equipment-source-error grid min-h-27 grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-[11px] p-4">
            <WarningCircle className="h-6 w-6 text-danger" />
            <span className="grid gap-1">
              <strong className="text-[12px]">暂时无法读取来源</strong>
              <small className="text-xs leading-[1.45] text-muted">
                {error ?? "请稍后重试"}
              </small>
            </span>
            <button
              className="inline-flex min-h-8.5 items-center gap-[5px] rounded-control border border-solid border-accent bg-selected px-2.5 py-0 text-xs font-[720] text-accent transition-[background-color,color,border-color] duration-120 ease-[ease]"
              type="button"
              onClick={onRetry}
            >
              <ArrowClockwise className="h-[13px] w-[13px]" />
              重试
            </button>
          </div>
        ) : status === "interaction_required" ? (
          <div className="equipment-source-state grid min-h-27 grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-[11px] p-4">
            <WarningCircle className="h-6 w-6 text-accent" />
            <span className="grid gap-1">
              <strong className="text-[12px]">Wiki 需要访问验证</strong>
              <small className="text-xs leading-[1.45] text-muted">
                请使用右下角的验证提示继续。
              </small>
            </span>
          </div>
        ) : (
          <EquipmentSourceSkeleton
            verifying={status === "background_verification"}
          />
        )}
      </div>
    </aside>,
    portalRoot,
  );
}
function EquipmentSourceContent({ item }: { item: WikiItemData }) {
  const identical = item.modelItems.filter(
    (model) => model.relation === "identical",
  );
  const primary = item.modelItems.filter(
    (model) => model.relation === "primary",
  );
  return (
    <div className="equipment-source-content px-3 pt-[3px] pb-2.5">
      {item.unobtainable && (
        <div
          className="equipment-unobtainable-notice mt-2.5 grid grid-cols-[auto_minmax(0,_1fr)] items-center gap-[9px] rounded-control border border-solid border-danger bg-[color-mix(_in_srgb,_var(--ors-color-surface)_72%,_var(--ors-color-surface)_)] px-2.5 py-[9px] text-danger"
          role="status"
        >
          <Prohibit className="h-4.5 w-4.5" />
          <span className="grid gap-0.5">
            <strong className="text-xs">当前无法获得</strong>
            <small className="text-xs text-muted">
              以下途径仅作为历史资料保留。
            </small>
          </span>
        </div>
      )}
      <section className="equipment-source-section px-0 py-[11px]">
        <div className={sourceSectionHeadingClasses}>
          <h3 className={sourceTitleClasses}>
            {item.unobtainable ? "历史获取途径" : "获取途径"}
          </h3>
          <span className="text-xs text-muted">
            {item.acquisitions.length} 类
          </span>
        </div>
        {item.acquisitions.length ? (
          <div className="acquisition-groups grid gap-[5px]">
            {item.acquisitions.map((acquisition) => (
              <AcquisitionGroup
                acquisition={acquisition}
                key={`${acquisition.type}-${acquisition.label}`}
              />
            ))}
          </div>
        ) : (
          <p className="equipment-source-empty m-0 rounded-control bg-hover p-[11px] text-xs leading-[1.55] text-muted">
            Wiki 暂未收录获取途径。
          </p>
        )}
      </section>

      {(identical.length > 0 || primary.length > 0) && (
        <section className="equipment-source-section model-source-section border-t border-solid border-line px-0 py-[11px]">
          <div className={sourceSectionHeadingClasses}>
            <h3 className={sourceTitleClasses}>同模装备</h3>
            <span className="text-xs text-muted">
              {identical.length + primary.length} 件
            </span>
          </div>
          <div className="model-source-groups grid gap-[5px]">
            {identical.length > 0 && (
              <ModelGroup label="模型完全相同" models={identical} />
            )}
            {primary.length > 0 && (
              <ModelGroup label="主模型相同" models={primary} />
            )}
          </div>
        </section>
      )}
      <p className="equipment-source-credit m-0 border-t border-solid border-line pt-2.5 text-xs leading-[1.55] text-muted">
        数据来自灰机 Wiki，主模型同模可能有不同配件或配色。
      </p>
    </div>
  );
}
function AcquisitionGroup({ acquisition }: { acquisition: WikiAcquisition }) {
  return (
    <details className="acquisition-group group/acquisition-group overflow-hidden rounded-control bg-[color-mix(in_srgb,_var(--ors-color-hover)_72%,_transparent)]">
      <summary className="grid min-h-11.5 cursor-pointer list-none grid-cols-[32px_minmax(0,_1fr)_auto] items-center gap-2 px-2 py-1.5 [&::-webkit-details-marker]:hidden">
        <span className="acquisition-icon grid h-7.5 w-7.5 place-items-center rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-selected)_68%,_var(--ors-color-surface)_)] text-accent [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_28%,_var(--ors-color-line))] nth-[2]:grid nth-[2]:min-w-0 nth-[2]:gap-0.5">
          <AcquisitionIcon type={acquisition.type} />
        </span>
        <span className="nth-[2]:grid nth-[2]:min-w-0 nth-[2]:gap-0.5">
          <strong className="text-xs">{acquisitionLabel(acquisition)}</strong>
          <small className={glamourMetadataCaptionClasses}>
            {acquisition.summary}
          </small>
        </span>
        <span
          className="acquisition-toggle text-muted [transition:transform_160ms_ease] group-open/acquisition-group:transform-[rotate(180deg)] nth-[2]:grid nth-[2]:min-w-0 nth-[2]:gap-0.5"
          aria-hidden="true"
        >
          <CaretDown className="h-[13px] w-[13px]" />
        </span>
      </summary>
      {acquisition.details.length > 0 && (
        <div className="acquisition-details grid gap-[7px] pt-0 pr-2 pb-2 pl-11.5">
          {acquisition.details.map((detail, index) => (
            <article
              className="grid gap-[5px] bg-[color-mix(in_srgb,_var(--ors-color-surface)_72%,_transparent)] px-2.5 py-[9px] [border-left:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line))]"
              key={`${detail.title}-${index}`}
            >
              <div className="min-w-0">
                {detail.title !== acquisition.summary &&
                  (detail.url ? (
                    <a
                      className="inline-flex items-center gap-[5px] text-xs leading-[1.45] font-[720] text-ink [text-decoration:none] hover:text-accent"
                      href={detail.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {detail.title}
                      <ArrowSquareOut className="h-[11px] w-[11px] shrink-0" />
                    </a>
                  ) : (
                    <strong className="inline-flex items-center gap-[5px] text-xs leading-[1.45] font-[720] text-ink [text-decoration:none]">
                      {detail.title}
                    </strong>
                  ))}
                {detail.description && (
                  <p className="mx-0 mt-[3px] mb-0 text-xs leading-[1.5] text-muted">
                    {detail.description}
                  </p>
                )}
              </div>
              {detail.items.length > 0 && (
                <div className="craft-material-grid mt-[3px] grid min-w-0 grid-cols-2 gap-1.5 max-[600px]:grid-cols-[1fr]">
                  {detail.items.map((item) => (
                    <CraftMaterial item={item} key={item.name} />
                  ))}
                </div>
              )}
              {detail.location && (
                <small className="inline-flex items-start gap-[5px] text-xs leading-[1.45] text-muted">
                  <MapPin className={sourceLinkIconClasses} />
                  {detail.location}
                </small>
              )}
              {detail.requirement && (
                <small className="source-requirement inline-flex items-start gap-[5px] text-xs leading-[1.45] text-muted">
                  <Scroll className={sourceLinkIconClasses} />
                  {detail.requirement}
                </small>
              )}
            </article>
          ))}
        </div>
      )}
    </details>
  );
}
function CraftMaterial({ item }: { item: WikiSourceItem }) {
  const content = (
    <>
      <span
        className="craft-material-icon relative grid h-8 w-8 place-items-center overflow-hidden rounded-control bg-surface text-muted"
        aria-hidden="true"
      >
        <Package className="h-3.5 h-[11px] w-3.5 w-[11px] shrink-0" />
        {item.iconUrl && (
          <img
            className="absolute inset-0 h-full w-full object-contain"
            src={item.iconUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
      </span>
      <span className="craft-material-copy grid min-w-0 gap-0.5">
        <strong className="flex inline-flex min-w-0 items-center gap-1 gap-[5px] overflow-hidden text-xs leading-[1.45] font-[720] text-ellipsis whitespace-nowrap text-ink [text-decoration:none]">
          {item.name}
          {item.quantity && (
            <small className="shrink-0 text-xs text-accent">
              {item.quantity}
            </small>
          )}
        </strong>
        {item.note && (
          <span className={sourceLocationClasses}>{item.note}</span>
        )}
      </span>
    </>
  );
  return item.url ? (
    <a
      className="craft-material grid inline-flex min-h-11.5 min-w-0 grid-cols-[32px_minmax(0,_1fr)] items-center gap-[5px] gap-[7px] rounded-control bg-hover p-1.5 text-xs leading-[1.45] font-[720] text-ink [text-decoration:none] hover:bg-[color-mix(_in_srgb,_var(--ors-color-selected)_52%,_var(--ors-color-hover)_)] hover:text-accent"
      href={item.url}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <span className="craft-material grid min-h-11.5 min-w-0 grid-cols-[32px_minmax(0,_1fr)] items-center gap-[7px] rounded-control bg-hover p-1.5 text-ink [text-decoration:none]">
      {content}
    </span>
  );
}
function ModelGroup({
  label,
  models,
}: {
  label: string;
  models: WikiModelItem[];
}) {
  const entries = clusterModelItems(models);
  return (
    <details className="model-source-group overflow-hidden rounded-control bg-[color-mix(in_srgb,_var(--ors-color-hover)_72%,_transparent)]">
      <summary className="grid min-h-8.5 cursor-pointer list-none grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-[7px] px-2 py-0 text-muted [&::-webkit-details-marker]:hidden">
        <ArrowsLeftRight className="h-3.5 w-3.5 text-accent" />
        <strong className="text-xs text-ink">{label}</strong>
        <span className="text-xs">{models.length}</span>
      </summary>
      <div className="model-source-list grid gap-[1px] px-[5px] pt-0 pb-[5px]">
        {entries.map((entry) =>
          entry.kind === "cluster" ? (
            <ModelRoleCluster cluster={entry} key={entry.key} />
          ) : (
            <ModelSourceItem
              model={entry.model}
              key={`${entry.model.relation}-${entry.model.id ?? entry.model.name}`}
              layout="model-source-list"
            />
          ),
        )}
      </div>
    </details>
  );
}
function ModelRoleCluster({ cluster }: { cluster: ModelNameCluster }) {
  const representative = cluster.models[0];
  return (
    <details className="model-role-cluster group/model-role-cluster overflow-hidden rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-selected)_28%,_var(--ors-color-surface)_)] [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_24%,_var(--ors-color-line))]">
      <summary className="grid min-h-13.5 cursor-pointer list-none grid-cols-[38px_minmax(0,_1fr)_auto] items-center gap-[9px] p-[7px] [&::-webkit-details-marker]:hidden">
        <ModelSourceIcon model={representative} layout="model-role-cluster" />
        <span className="nth-[2]:grid nth-[2]:min-w-0 nth-[2]:gap-0.5">
          <strong className={glamourTruncatedNameClasses}>
            {cluster.label}
          </strong>
          <small className={sourceLocationClasses}>
            {cluster.infixes.join(" / ")}
          </small>
          <span className={sourceLocationClasses}>
            {cluster.models.length} 个职业变体
          </span>
        </span>
        <CaretDown className="h-[13px] w-[13px] text-accent [transition:transform_160ms_ease] group-open/model-role-cluster:transform-[rotate(180deg)]" />
      </summary>
      <div className="model-role-cluster-items grid gap-0.5 pt-0 pr-1 pb-1 pl-3.5 max-[600px]:pl-1">
        {cluster.models.map((model) => (
          <ModelSourceItem
            model={model}
            key={`${model.relation}-${model.id ?? model.name}`}
            layout="model-role-cluster-items"
          />
        ))}
      </div>
    </details>
  );
}
function ModelSourceItem({
  model,
  layout,
}: {
  model: WikiModelItem;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "model-role-cluster-items" | "model-source-list";
}) {
  return (
    <article
      className={clsx(
        model.unobtainable ? "model-source-unobtainable" : "",
        layout === "model-role-cluster-items" &&
          "bg-[color-mix(in_srgb,_var(--ors-color-surface)_82%,_transparent)]",
        layout === "model-source-list" &&
          "grid min-h-12.5 grid-cols-[38px_minmax(0,_1fr)_auto] items-center gap-[9px] rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-surface)_42%,_var(--ors-color-surface)_)] bg-[color-mix(in_srgb,_var(--ors-color-surface)_76%,_transparent)] p-1.5 max-[600px]:grid-cols-[38px_minmax(0,_1fr)]",
      )}
    >
      <ModelSourceIcon
        model={model}
        layout={
          layout === "model-source-list" ? "model-source-list" : undefined
        }
      />
      <span
        className={clsx(
          layout === "model-source-list" &&
            "nth-[2]:grid nth-[2]:min-w-0 nth-[2]:gap-0.5",
        )}
      >
        <strong
          className={clsx(
            layout === "model-source-list" && glamourTruncatedNameClasses,
          )}
        >
          {model.name}
        </strong>
        <small
          className={clsx(
            layout === "model-source-list" && glamourMetadataCaptionClasses,
          )}
        >
          {model.category}
        </small>
        <span
          className={clsx(
            layout === "model-source-list" && glamourMetadataCaptionClasses,
          )}
        >
          {model.unobtainable
            ? model.sourceSummary
              ? `当前无法获得，历史来源：${model.sourceSummary}`
              : "当前无法获得"
            : model.sourceSummary || "来源未收录"}
        </span>
      </span>
      {model.unobtainable ? (
        <small className="model-unobtainable-state inline-flex items-center gap-[3px] text-xs whitespace-nowrap text-danger max-[600px]:col-start-2">
          <Prohibit className="h-[11px] w-[11px] text-[currentColor]" />
          无法获得
        </small>
      ) : model.dyeable !== null ? (
        <small className="model-dye-state inline-flex items-center gap-[3px] text-xs whitespace-nowrap text-muted max-[600px]:col-start-2">
          {model.dyeable ? (
            <Check className="h-[11px] w-[11px] text-accent" />
          ) : (
            <X className="h-[11px] w-[11px] text-accent" />
          )}
          {model.dyeable ? "可染色" : "不可染色"}
        </small>
      ) : null}
    </article>
  );
}
function ModelSourceIcon({
  model,
  layout,
}: {
  model: WikiModelItem;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "model-role-cluster" | "model-source-list";
}) {
  return (
    <span
      className={clsx(
        "model-source-icon relative grid h-9.5 w-9.5 place-items-center overflow-hidden rounded-control bg-hover text-muted",
        layout === "model-role-cluster" &&
          "nth-[2]:grid nth-[2]:min-w-0 nth-[2]:gap-0.5",
        layout === "model-source-list" &&
          "nth-[2]:grid nth-[2]:min-w-0 nth-[2]:gap-0.5",
      )}
      aria-hidden="true"
    >
      <Package className="h-[17px] w-[17px]" />
      {model.iconUrl && (
        <img
          className="absolute inset-0 h-full w-full object-contain opacity-70 [filter:grayscale(0.72)]"
          src={model.iconUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}
function EquipmentSourceSkeleton({ verifying }: { verifying: boolean }) {
  return (
    <div
      className="equipment-source-skeleton grid gap-2 p-[15px]"
      aria-label="正在读取物品来源"
    >
      <p className="mx-0 mt-0 mb-0.5 text-xs text-muted">
        {verifying ? "正在后台验证 Wiki 访问" : "正在解析 Wiki 来源"}
      </p>
      {Array.from(
        {
          length: 3,
        },
        (_, index) => (
          <span
            className="grid min-h-13 grid-cols-[34px_minmax(0,_1fr)] items-center gap-2.5 rounded-control bg-hover p-[9px]"
            key={index}
          >
            <i className="block h-8.5 w-8.5 animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_color-mix(in_srgb,_var(--ors-color-line)_75%,_transparent)_20%,_color-mix(in_srgb,_var(--ors-color-surface)_74%,_transparent)_45%,_color-mix(in_srgb,_var(--ors-color-line)_75%,_transparent)_70%_)] [background-size:240%_100%]" />
            <b className="block h-[11px] w-[72%] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_color-mix(in_srgb,_var(--ors-color-line)_75%,_transparent)_20%,_color-mix(in_srgb,_var(--ors-color-surface)_74%,_transparent)_45%,_color-mix(in_srgb,_var(--ors-color-line)_75%,_transparent)_70%_)] [background-size:240%_100%]" />
          </span>
        ),
      )}
    </div>
  );
}
function AcquisitionIcon({ type }: { type: WikiAcquisitionType }) {
  if (type === "currency") return <Coins className="" />;
  if (type === "dungeon") return <Sword className="" />;
  if (type === "cash_shop") return <ShoppingBagOpen className="" />;
  if (type === "quest") return <Scroll className="" />;
  if (type === "exchange") return <ArrowsLeftRight className="" />;
  if (type === "craft") return <Hammer className="" />;
  return <Package className="" />;
}
function acquisitionLabel(acquisition: WikiAcquisition) {
  if (
    acquisition.label === "任务解锁领取" ||
    acquisition.label === "货币兑换"
  ) {
    return acquisition.label;
  }
  const { type } = acquisition;
  if (type === "currency") return "货币购买";
  if (type === "dungeon") return "副本掉落";
  if (type === "cash_shop") return "商城购买";
  if (type === "quest") return "任务获得";
  if (type === "exchange") return "兑换获得";
  if (type === "craft") return "制作获得";
  if (type === "item") return "物品开启";
  return "其他途径";
}
