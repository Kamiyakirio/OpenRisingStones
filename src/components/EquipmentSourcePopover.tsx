/** Compact hover surface for Wiki acquisition routes and shared-model equipment. */
import { useLayoutEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
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
import type { WikiLoadStatus } from "../hooks/useWikiItem";
import type {
  WikiAcquisition,
  WikiAcquisitionType,
  WikiItemData,
  WikiModelItem,
  WikiSourceItem,
} from "../services/wikiApi";

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
      className="equipment-source-popover"
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
      <div className="equipment-source-popover-inner">
        <header className="equipment-source-header">
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
          <div className="equipment-source-state equipment-source-error">
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
          <div className="equipment-source-state">
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
    <div className="equipment-source-content">
      {item.unobtainable && (
        <div className="equipment-unobtainable-notice" role="status">
          <Prohibit />
          <span>
            <strong>当前无法获得</strong>
            <small>以下途径仅作为历史资料保留。</small>
          </span>
        </div>
      )}
      <section className="equipment-source-section">
        <div className="equipment-source-section-heading">
          <h3>{item.unobtainable ? "历史获取途径" : "获取途径"}</h3>
          <span>{item.acquisitions.length} 类</span>
        </div>
        {item.acquisitions.length ? (
          <div className="acquisition-groups">
            {item.acquisitions.map((acquisition) => (
              <AcquisitionGroup
                acquisition={acquisition}
                key={`${acquisition.type}-${acquisition.label}`}
              />
            ))}
          </div>
        ) : (
          <p className="equipment-source-empty">Wiki 暂未收录获取途径。</p>
        )}
      </section>

      {(identical.length > 0 || primary.length > 0) && (
        <section className="equipment-source-section model-source-section">
          <div className="equipment-source-section-heading">
            <h3>同模装备</h3>
            <span>{identical.length + primary.length} 件</span>
          </div>
          <div className="model-source-groups">
            {identical.length > 0 && (
              <ModelGroup label="模型完全相同" models={identical} />
            )}
            {primary.length > 0 && (
              <ModelGroup label="主模型相同" models={primary} />
            )}
          </div>
        </section>
      )}
      <p className="equipment-source-credit">
        数据来自灰机 Wiki，主模型同模可能有不同配件或配色。
      </p>
    </div>
  );
}

function AcquisitionGroup({ acquisition }: { acquisition: WikiAcquisition }) {
  return (
    <details className="acquisition-group">
      <summary>
        <span className="acquisition-icon">
          <AcquisitionIcon type={acquisition.type} />
        </span>
        <span>
          <strong>{acquisitionLabel(acquisition)}</strong>
          <small>{acquisition.summary}</small>
        </span>
        <span className="acquisition-toggle" aria-hidden="true">
          <CaretDown />
        </span>
      </summary>
      {acquisition.details.length > 0 && (
        <div className="acquisition-details">
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
                <div className="craft-material-grid">
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
                <small className="source-requirement">
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
      <span className="craft-material-icon" aria-hidden="true">
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
      <span className="craft-material-copy">
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
      className="craft-material"
      href={item.url}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <span className="craft-material">{content}</span>
  );
}

function ModelGroup({
  label,
  models,
}: {
  label: string;
  models: WikiModelItem[];
}) {
  return (
    <details className="model-source-group">
      <summary>
        <ArrowsLeftRight />
        <strong>{label}</strong>
        <span>{models.length}</span>
      </summary>
      <div className="model-source-list">
        {models.map((model) => (
          <article
            className={model.unobtainable ? "model-source-unobtainable" : ""}
            key={`${model.relation}-${model.id ?? model.name}`}
          >
            <span className="model-source-icon" aria-hidden="true">
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
              <small className="model-unobtainable-state">
                <Prohibit />
                无法获得
              </small>
            ) : model.dyeable !== null ? (
              <small className="model-dye-state">
                {model.dyeable ? <Check /> : <X />}
                {model.dyeable ? "可染色" : "不可染色"}
              </small>
            ) : null}
          </article>
        ))}
      </div>
    </details>
  );
}

function EquipmentSourceSkeleton({ verifying }: { verifying: boolean }) {
  return (
    <div className="equipment-source-skeleton" aria-label="正在读取物品来源">
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
