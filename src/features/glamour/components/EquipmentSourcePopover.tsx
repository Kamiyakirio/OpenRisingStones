/** Compact hover surface for Wiki acquisition routes and shared-model equipment. */
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
      className={"equipment-source-popover fixed text-ink [&&&&]:z-[120]"}
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
      <div
        className={
          "equipment-source-popover-inner box-border overflow-auto rounded-[var(--ors-radius-overlay)] [&&&&]:max-h-[inherit] [&&&&]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_34%,_var(--ors-color-line))] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-surface)_96%,_var(--ors-color-canvas)_)] [&&&&]:shadow-[var(--ors-shadow-popover)] [&&&&]:[overscroll-behavior:contain] [&&&&]:[scrollbar-width:thin]"
        }
      >
        <header
          className={
            "equipment-source-header sticky flex justify-between items-center gap-[18px] min-h-[56px] border-b border-solid border-line [&_>_span]:grid [&_>_span]:min-w-0 [&_>_span]:gap-[3px] [&_small]:text-accent [&_small]:text-xs [&_strong]:overflow-hidden [&_strong]:text-sm [&_strong]:whitespace-nowrap [&_>_a]:inline-flex [&_>_a]:items-center [&_>_a]:gap-[5px] [&_>_a]:min-h-[32px] [&_>_a]:border [&_>_a]:border-solid [&_>_a]:border-line [&_>_a]:rounded-[var(--ors-radius-control)] [&_>_a]:text-muted [&_>_a]:text-xs [&_>_a]:font-bold [&_>_a:hover]:border-accent [&_>_a:hover]:text-accent [&_>_a:hover]:bg-selected [&_>_a_svg]:w-[13px] [&_>_a_svg]:h-[13px] [@media(prefers-reduced-transparency:_reduce)]:bg-surface [&&&&]:top-[0] [&&&&]:z-[1] [&&&&]:p-[9px_12px] [&&&&]:[background:color-mix(in_srgb,_var(--ors-color-surface)_94%,_transparent)] [&&&&_small]:[font-weight:760] [&&&&_strong]:[text-overflow:ellipsis] [&&&&_>_a]:flex-[0_0_auto] [&&&&_>_a]:p-[0_9px] [&&&&_>_a]:[background:transparent] [&&&&_>_a]:[text-decoration:none]"
          }
        >
          <span>
            <small>获取方式与同模</small>
            <strong>{itemName}</strong>
          </span>
          {item?.canonicalUrl && (
            <a
              href={item.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`在 Wiki 查看${itemName}`}
            >
              Wiki
              <ArrowSquareOut />
            </a>
          )}
        </header>
        {status === "ready" && item ? (
          <EquipmentSourceContent item={item} />
        ) : status === "error" ? (
          <div
            className={
              "equipment-source-state equipment-source-error grid items-center gap-[11px] min-h-[108px] p-[16px] [&_>_svg]:w-[24px] [&_>_svg]:h-[24px] [&_>_span]:grid [&_>_span]:gap-[4px] [&_small]:text-muted [&_small]:text-xs [&_button]:inline-flex [&_button]:items-center [&_button]:gap-[5px] [&_button]:min-h-[34px] [&_button]:border [&_button]:border-solid [&_button]:border-accent [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-accent [&_button]:bg-selected [&_button]:text-xs [&_button_svg]:w-[13px] [&_button_svg]:h-[13px] [&_>_svg]:text-danger [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&_strong]:text-[12px] [&&&&_small]:leading-[1.45] [&&&&_button]:p-[0_10px] [&&&&_button]:[font-weight:720]"
            }
          >
            <WarningCircle />
            <span>
              <strong>暂时无法读取来源</strong>
              <small>{error ?? "请稍后重试"}</small>
            </span>
            <button type="button" onClick={onRetry}>
              <ArrowClockwise />
              重试
            </button>
          </div>
        ) : status === "interaction_required" ? (
          <div
            className={
              "equipment-source-state grid items-center gap-[11px] min-h-[108px] p-[16px] [&_>_svg]:w-[24px] [&_>_svg]:h-[24px] [&_>_svg]:text-accent [&_>_span]:grid [&_>_span]:gap-[4px] [&_small]:text-muted [&_small]:text-xs [&_button]:inline-flex [&_button]:items-center [&_button]:gap-[5px] [&_button]:min-h-[34px] [&_button]:border [&_button]:border-solid [&_button]:border-accent [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-accent [&_button]:bg-selected [&_button]:text-xs [&_button_svg]:w-[13px] [&_button_svg]:h-[13px] [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&_strong]:text-[12px] [&&&&_small]:leading-[1.45] [&&&&_button]:p-[0_10px] [&&&&_button]:[font-weight:720]"
            }
          >
            <WarningCircle />
            <span>
              <strong>Wiki 需要访问验证</strong>
              <small>请使用右下角的验证提示继续。</small>
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
    <div className={"equipment-source-content [&&&&]:p-[3px_12px_10px]"}>
      {item.unobtainable && (
        <div
          className={
            "equipment-unobtainable-notice grid items-center gap-[9px] mt-[10px] border border-solid border-danger rounded-[var(--ors-radius-control)] text-danger [&_>_svg]:w-[18px] [&_>_svg]:h-[18px] [&_>_span]:grid [&_>_span]:gap-[2px] [&_strong]:text-xs [&_small]:text-muted [&_small]:text-xs [&&&&]:grid-cols-[auto_minmax(0,_1fr)] [&&&&]:p-[9px_10px] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-surface)_72%,_var(--ors-color-surface)_)]"
          }
          role="status"
        >
          <Prohibit />
          <span>
            <strong>当前无法获得</strong>
            <small>以下途径仅作为历史资料保留。</small>
          </span>
        </div>
      )}
      <section
        className={
          "equipment-source-section [.equipment-source-section_+_&]:border-t [.equipment-source-section_+_&]:border-solid [.equipment-source-section_+_&]:border-line [&&&&]:p-[11px_0]"
        }
      >
        <div
          className={
            "equipment-source-section-heading flex justify-between items-center mb-[7px] [&_h3]:m-0 [&_>_span]:text-muted [&_>_span]:text-xs [&&&&_h3]:text-[12px] [&&&&_h3]:[letter-spacing:normal]"
          }
        >
          <h3 className="text-base font-semibold">
            {item.unobtainable ? "历史获取途径" : "获取途径"}
          </h3>
          <span>{item.acquisitions.length} 类</span>
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
          <p
            className={
              "equipment-source-empty text-muted text-xs m-0 p-[11px] rounded-[var(--ors-radius-control)] bg-hover [&&&&]:leading-[1.55]"
            }
          >
            Wiki 暂未收录获取途径。
          </p>
        )}
      </section>

      {(identical.length > 0 || primary.length > 0) && (
        <section
          className={
            "equipment-source-section model-source-section [.equipment-source-section_+_&]:border-t [.equipment-source-section_+_&]:border-solid [.equipment-source-section_+_&]:border-line [&&&&]:p-[11px_0]"
          }
        >
          <div
            className={
              "equipment-source-section-heading flex justify-between items-center mb-[7px] [&_h3]:m-0 [&_>_span]:text-muted [&_>_span]:text-xs [&&&&_h3]:text-[12px] [&&&&_h3]:[letter-spacing:normal]"
            }
          >
            <h3 className="text-base font-semibold">同模装备</h3>
            <span>{identical.length + primary.length} 件</span>
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
      <p
        className={
          "equipment-source-credit text-muted text-xs m-0 pt-[10px] border-t border-solid border-line [&&&&]:leading-[1.55]"
        }
      >
        数据来自灰机 Wiki，主模型同模可能有不同配件或配色。
      </p>
    </div>
  );
}

function AcquisitionGroup({ acquisition }: { acquisition: WikiAcquisition }) {
  return (
    <details
      className={
        "acquisition-group overflow-hidden rounded-[var(--ors-radius-control)] [&_>_summary]:grid [&_>_summary]:items-center [&_>_summary]:cursor-pointer [&_>_summary::-webkit-details-marker]:hidden [&_>_summary]:gap-[8px] [&_>_summary]:min-h-[46px] [&_>_summary_>_span:nth-child(2)]:grid [&_>_summary_>_span:nth-child(2)]:min-w-0 [&_>_summary_>_span:nth-child(2)]:gap-[2px] [&_>_summary_strong]:text-xs [&_>_summary_small]:overflow-hidden [&_>_summary_small]:text-muted [&_>_summary_small]:text-xs [&_>_summary_small]:whitespace-nowrap [&&&&]:[background:color-mix(in_srgb,_var(--ors-color-hover)_72%,_transparent)] [&&&&_>_summary]:[list-style:none] [&&&&_>_summary]:grid-cols-[32px_minmax(0,_1fr)_auto] [&&&&_>_summary]:p-[6px_8px] [&&&&_>_summary_small]:leading-[1.4] [&&&&_>_summary_small]:[text-overflow:ellipsis]"
      }
    >
      <summary>
        <span
          className={
            "acquisition-icon grid place-items-center w-[30px] h-[30px] rounded-[var(--ors-radius-control)] text-accent [&_svg]:w-[16px] [&_svg]:h-[16px] [&&&&]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_28%,_var(--ors-color-line))] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_68%,_var(--ors-color-surface)_)]"
          }
        >
          <AcquisitionIcon type={acquisition.type} />
        </span>
        <span>
          <strong>{acquisitionLabel(acquisition)}</strong>
          <small>{acquisition.summary}</small>
        </span>
        <span
          className={
            "acquisition-toggle text-muted [&_svg]:w-[13px] [&_svg]:h-[13px] [&&&&]:[transition:transform_160ms_ease] [.acquisition-group[open]_&&&&]:transform-[rotate(180deg)]"
          }
          aria-hidden="true"
        >
          <CaretDown />
        </span>
      </summary>
      {acquisition.details.length > 0 && (
        <div
          className={
            "acquisition-details grid gap-[7px] [&_article]:grid [&_article]:gap-[5px] [&_article_>_div]:min-w-0 [&_article_a]:inline-flex [&_article_a]:items-center [&_article_a]:gap-[5px] [&_article_a]:text-ink [&_article_a]:text-xs [&_article_strong]:inline-flex [&_article_strong]:items-center [&_article_strong]:gap-[5px] [&_article_strong]:text-ink [&_article_strong]:text-xs [&_article_a:hover]:text-accent [&_article_a_svg]:w-[11px] [&_article_a_svg]:h-[11px] [&_article_p]:text-muted [&_article_p]:text-xs [&_article_>_small]:inline-flex [&_article_>_small]:items-start [&_article_>_small]:gap-[5px] [&_article_>_small]:text-muted [&_article_>_small]:text-xs [&_article_>_small_svg]:w-[11px] [&_article_>_small_svg]:h-[11px] [&_article_>_small_svg]:mt-[1px] [&_article_>_small_svg]:text-accent [&&&&]:p-[0_8px_8px_46px] [&&&&_article]:p-[9px_10px] [&&&&_article]:[border-left:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_58%,_var(--ors-color-line))] [&&&&_article]:[background:color-mix(in_srgb,_var(--ors-color-surface)_72%,_transparent)] [&&&&_article_a]:[font-weight:720] [&&&&_article_a]:leading-[1.45] [&&&&_article_a]:[text-decoration:none] [&&&&_article_strong]:[font-weight:720] [&&&&_article_strong]:leading-[1.45] [&&&&_article_strong]:[text-decoration:none] [&&&&_article_a_svg]:flex-[0_0_auto] [&&&&_article_p]:m-[3px_0_0] [&&&&_article_p]:leading-[1.5] [&&&&_article_>_small]:leading-[1.45] [&&&&_article_>_small_svg]:flex-[0_0_auto]"
          }
        >
          {acquisition.details.map((detail, index) => (
            <article key={`${detail.title}-${index}`}>
              <div>
                {detail.title !== acquisition.summary &&
                  (detail.url ? (
                    <a href={detail.url} target="_blank" rel="noreferrer">
                      {detail.title}
                      <ArrowSquareOut />
                    </a>
                  ) : (
                    <strong>{detail.title}</strong>
                  ))}
                {detail.description && <p>{detail.description}</p>}
              </div>
              {detail.items.length > 0 && (
                <div
                  className={
                    "craft-material-grid grid gap-[6px] mt-[3px] [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_600px)]:[&&&&]:grid-cols-[1fr]"
                  }
                >
                  {detail.items.map((item) => (
                    <CraftMaterial item={item} key={item.name} />
                  ))}
                </div>
              )}
              {detail.location && (
                <small>
                  <MapPin />
                  {detail.location}
                </small>
              )}
              {detail.requirement && (
                <small className="source-requirement [.acquisition-details_&]:text-accent">
                  <Scroll />
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
        className={
          "craft-material-icon relative grid place-items-center w-[32px] h-[32px] overflow-hidden rounded-[var(--ors-radius-control)] text-muted bg-surface [&_>_svg]:w-[14px] [&_>_svg]:h-[14px] [&_img]:absolute [&_img]:w-full [&_img]:h-full [&_img]:object-contain [&&&&_img]:inset-[0]"
        }
        aria-hidden="true"
      >
        <Package />
        {item.iconUrl && (
          <img
            src={item.iconUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
      </span>
      <span
        className={
          "craft-material-copy grid min-w-0 gap-[2px] [.acquisition-details_article_&_strong]:flex [.acquisition-details_article_&_strong]:min-w-0 [.acquisition-details_article_&_strong]:gap-[4px] [.acquisition-details_article_&_strong]:overflow-hidden [.acquisition-details_article_&_strong]:text-xs [.acquisition-details_article_&_strong]:whitespace-nowrap [&_strong_>_small]:text-accent [&_strong_>_small]:text-xs [&_>_span]:overflow-hidden [&_>_span]:text-muted [&_>_span]:text-xs [&_>_span]:whitespace-nowrap [.acquisition-details_article_&&&&_strong]:[text-overflow:ellipsis] [&&&&_strong_>_small]:flex-[0_0_auto] [&&&&_>_span]:leading-[1.35] [&&&&_>_span]:[text-overflow:ellipsis]"
        }
      >
        <strong>
          {item.name}
          {item.quantity && <small>{item.quantity}</small>}
        </strong>
        {item.note && <span>{item.note}</span>}
      </span>
    </>
  );
  return item.url ? (
    <a
      className={
        "craft-material [.acquisition-details_article_&]:grid [.acquisition-details_article_&]:items-center [.acquisition-details_article_&]:gap-[7px] [.acquisition-details_article_&]:min-w-0 [.acquisition-details_article_&]:min-h-[46px] [.acquisition-details_article_&]:p-[6px] [.acquisition-details_article_&]:rounded-[var(--ors-radius-control)] [.acquisition-details_article_&]:text-ink [.acquisition-details_article_&]:bg-hover [.acquisition-details_article_a&:hover]:text-accent [.acquisition-details_article_&&&&]:grid-cols-[32px_minmax(0,_1fr)] [.acquisition-details_article_&&&&]:[text-decoration:none] [.acquisition-details_article_a&&&&:hover]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_52%,_var(--ors-color-hover)_)]"
      }
      href={item.url}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <span
      className={
        "craft-material [.acquisition-details_article_&]:grid [.acquisition-details_article_&]:items-center [.acquisition-details_article_&]:gap-[7px] [.acquisition-details_article_&]:min-w-0 [.acquisition-details_article_&]:min-h-[46px] [.acquisition-details_article_&]:p-[6px] [.acquisition-details_article_&]:rounded-[var(--ors-radius-control)] [.acquisition-details_article_&]:text-ink [.acquisition-details_article_&]:bg-hover [.acquisition-details_article_a&:hover]:text-accent [.acquisition-details_article_&&&&]:grid-cols-[32px_minmax(0,_1fr)] [.acquisition-details_article_&&&&]:[text-decoration:none] [.acquisition-details_article_a&&&&:hover]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_52%,_var(--ors-color-hover)_)]"
      }
    >
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
    <details
      className={
        "model-source-group overflow-hidden rounded-[var(--ors-radius-control)] [&_>_summary]:grid [&_>_summary]:items-center [&_>_summary]:cursor-pointer [&_>_summary::-webkit-details-marker]:hidden [&_>_summary]:gap-[7px] [&_>_summary]:min-h-[34px] [&_>_summary]:text-muted [&_>_summary_svg]:w-[14px] [&_>_summary_svg]:h-[14px] [&_>_summary_svg]:text-accent [&_>_summary_strong]:text-ink [&_>_summary_strong]:text-xs [&_>_summary_span]:text-xs [&&&&]:[background:color-mix(in_srgb,_var(--ors-color-hover)_72%,_transparent)] [&&&&_>_summary]:[list-style:none] [&&&&_>_summary]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&_>_summary]:p-[0_8px]"
      }
    >
      <summary>
        <ArrowsLeftRight />
        <strong>{label}</strong>
        <span>{models.length}</span>
      </summary>
      <div
        className={
          "model-source-list grid gap-[1px] [&_article]:grid [&_article]:items-center [&_article]:gap-[9px] [&_article]:min-h-[50px] [&_article]:p-[6px] [&_article]:rounded-[var(--ors-radius-control)] [&_article_>_span:nth-child(2)]:grid [&_article_>_span:nth-child(2)]:min-w-0 [&_article_>_span:nth-child(2)]:gap-[2px] [&_article_>_span:nth-child(2)_strong]:overflow-hidden [&_article_>_span:nth-child(2)_strong]:text-xs [&_article_>_span:nth-child(2)_strong]:whitespace-nowrap [&_article_>_span:nth-child(2)_small]:overflow-hidden [&_article_>_span:nth-child(2)_small]:text-muted [&_article_>_span:nth-child(2)_small]:text-xs [&_article_>_span:nth-child(2)_small]:whitespace-nowrap [&_article_>_span:nth-child(2)_span]:overflow-hidden [&_article_>_span:nth-child(2)_span]:text-muted [&_article_>_span:nth-child(2)_span]:text-xs [&_article_>_span:nth-child(2)_span]:whitespace-nowrap [&&&&]:p-[0_5px_5px] [&&&&_article]:grid-cols-[38px_minmax(0,_1fr)_auto] [&&&&_article]:[background:color-mix(in_srgb,_var(--ors-color-surface)_76%,_transparent)] [&&&&_article_>_span:nth-child(2)_strong]:[text-overflow:ellipsis] [&&&&_article_>_span:nth-child(2)_small]:leading-[1.4] [&&&&_article_>_span:nth-child(2)_small]:[text-overflow:ellipsis] [&&&&_article_>_span:nth-child(2)_span]:leading-[1.4] [&&&&_article_>_span:nth-child(2)_span]:[text-overflow:ellipsis] [@media(max-width:_600px)]:[&&&&_article]:grid-cols-[38px_minmax(0,_1fr)]"
        }
      >
        {entries.map((entry) =>
          entry.kind === "cluster" ? (
            <ModelRoleCluster cluster={entry} key={entry.key} />
          ) : (
            <ModelSourceItem
              model={entry.model}
              key={`${entry.model.relation}-${entry.model.id ?? entry.model.name}`}
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
    <details
      className={
        "model-role-cluster overflow-hidden rounded-[var(--ors-radius-control)] [&_>_summary]:grid [&_>_summary]:items-center [&_>_summary]:gap-[9px] [&_>_summary]:min-h-[54px] [&_>_summary]:p-[7px] [&_>_summary]:cursor-pointer [&_>_summary::-webkit-details-marker]:hidden [&_>_summary_>_span:nth-child(2)]:grid [&_>_summary_>_span:nth-child(2)]:min-w-0 [&_>_summary_>_span:nth-child(2)]:gap-[2px] [&_>_summary_strong]:overflow-hidden [&_>_summary_strong]:text-xs [&_>_summary_strong]:whitespace-nowrap [&_>_summary_small]:overflow-hidden [&_>_summary_small]:text-muted [&_>_summary_small]:text-xs [&_>_summary_small]:whitespace-nowrap [&_>_summary_span_>_span]:overflow-hidden [&_>_summary_span_>_span]:text-muted [&_>_summary_span_>_span]:text-xs [&_>_summary_span_>_span]:whitespace-nowrap [&_>_summary_>_svg]:w-[13px] [&_>_summary_>_svg]:h-[13px] [&_>_summary_>_svg]:text-accent [&&&&]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_24%,_var(--ors-color-line))] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_28%,_var(--ors-color-surface)_)] [&&&&_>_summary]:grid-cols-[38px_minmax(0,_1fr)_auto] [&&&&_>_summary]:[list-style:none] [&&&&_>_summary_strong]:[text-overflow:ellipsis] [&&&&_>_summary_small]:leading-[1.35] [&&&&_>_summary_small]:[text-overflow:ellipsis] [&&&&_>_summary_span_>_span]:leading-[1.35] [&&&&_>_summary_span_>_span]:[text-overflow:ellipsis] [&&&&_>_summary_>_svg]:[transition:transform_160ms_ease] [&&&&[open]_>_summary_>_svg]:transform-[rotate(180deg)]"
      }
    >
      <summary>
        <ModelSourceIcon model={representative} />
        <span>
          <strong>{cluster.label}</strong>
          <small>{cluster.infixes.join(" / ")}</small>
          <span>{cluster.models.length} 个职业变体</span>
        </span>
        <CaretDown />
      </summary>
      <div
        className={
          "model-role-cluster-items grid gap-[2px] max-[600px]:pl-[4px] [&&&&]:p-[0_4px_4px_14px] [&&&&_article]:[background:color-mix(in_srgb,_var(--ors-color-surface)_82%,_transparent)]"
        }
      >
        {cluster.models.map((model) => (
          <ModelSourceItem
            model={model}
            key={`${model.relation}-${model.id ?? model.name}`}
          />
        ))}
      </div>
    </details>
  );
}

function ModelSourceItem({ model }: { model: WikiModelItem }) {
  return (
    <article
      className={
        model.unobtainable
          ? "model-source-unobtainable [.model-source-list_&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-surface)_42%,_var(--ors-color-surface)_)]"
          : ""
      }
    >
      <ModelSourceIcon model={model} />
      <span>
        <strong>{model.name}</strong>
        <small>{model.category}</small>
        <span>
          {model.unobtainable
            ? model.sourceSummary
              ? `当前无法获得，历史来源：${model.sourceSummary}`
              : "当前无法获得"
            : model.sourceSummary || "来源未收录"}
        </span>
      </span>
      {model.unobtainable ? (
        <small
          className={
            "model-unobtainable-state inline-flex items-center gap-[3px] text-xs whitespace-nowrap [&_svg]:w-[11px] [&_svg]:h-[11px] [&_svg]:text-accent text-danger [&&&&_svg]:[color:currentColor] [@media(max-width:_600px)]:[&&&&]:[grid-column:2]"
          }
        >
          <Prohibit />
          无法获得
        </small>
      ) : model.dyeable !== null ? (
        <small
          className={
            "model-dye-state inline-flex items-center gap-[3px] text-muted text-xs whitespace-nowrap [&_svg]:w-[11px] [&_svg]:h-[11px] [&_svg]:text-accent [@media(max-width:_600px)]:[&&&&]:[grid-column:2]"
          }
        >
          {model.dyeable ? <Check /> : <X />}
          {model.dyeable ? "可染色" : "不可染色"}
        </small>
      ) : null}
    </article>
  );
}

function ModelSourceIcon({ model }: { model: WikiModelItem }) {
  return (
    <span
      className={
        "model-source-icon relative grid place-items-center w-[38px] h-[38px] overflow-hidden rounded-[var(--ors-radius-control)] text-muted bg-hover [&_>_svg]:w-[17px] [&_>_svg]:h-[17px] [&_img]:absolute [&_img]:w-full [&_img]:h-full [&_img]:object-contain [.model-source-unobtainable_&&&&_img]:[filter:grayscale(0.72)] [.model-source-unobtainable_&&&&_img]:opacity-[0.7] [&&&&_img]:inset-[0]"
      }
      aria-hidden="true"
    >
      <Package />
      {model.iconUrl && (
        <img
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
      className={
        "equipment-source-skeleton grid gap-[8px] p-[15px] [&_p]:text-muted [&_p]:text-xs [&_>_span]:grid [&_>_span]:items-center [&_>_span]:gap-[10px] [&_>_span]:min-h-[52px] [&_>_span]:p-[9px] [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_span]:bg-hover [&_i]:block [&_b]:block [&_i]:w-[34px] [&_i]:h-[34px] [&_i]:rounded-[var(--ors-radius-control)] [&_b]:h-[11px] [&_b]:rounded-[var(--ors-radius-control)] [&&&&_p]:m-[0_0_2px] [&&&&_>_span]:grid-cols-[34px_minmax(0,_1fr)] [&&&&_i]:[background:linear-gradient(_100deg,_color-mix(in_srgb,_var(--ors-color-line)_75%,_transparent)_20%,_color-mix(in_srgb,_var(--ors-color-surface)_74%,_transparent)_45%,_color-mix(in_srgb,_var(--ors-color-line)_75%,_transparent)_70%_)] [&&&&_i]:[background-size:240%_100%] [&&&&_i]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_b]:[background:linear-gradient(_100deg,_color-mix(in_srgb,_var(--ors-color-line)_75%,_transparent)_20%,_color-mix(in_srgb,_var(--ors-color-surface)_74%,_transparent)_45%,_color-mix(in_srgb,_var(--ors-color-line)_75%,_transparent)_70%_)] [&&&&_b]:[background-size:240%_100%] [&&&&_b]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_b]:w-[72%] [@media(prefers-reduced-motion:_reduce)]:[&&&&_i]:animate-[none] [@media(prefers-reduced-motion:_reduce)]:[&&&&_b]:animate-[none]"
      }
      aria-label="正在读取物品来源"
    >
      <p>{verifying ? "正在后台验证 Wiki 访问" : "正在解析 Wiki 来源"}</p>
      {Array.from({ length: 3 }, (_, index) => (
        <span key={index}>
          <i />
          <b />
        </span>
      ))}
    </div>
  );
}

function AcquisitionIcon({ type }: { type: WikiAcquisitionType }) {
  if (type === "currency") return <Coins />;
  if (type === "dungeon") return <Sword />;
  if (type === "cash_shop") return <ShoppingBagOpen />;
  if (type === "quest") return <Scroll />;
  if (type === "exchange") return <ArrowsLeftRight />;
  if (type === "craft") return <Hammer />;
  return <Package />;
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
