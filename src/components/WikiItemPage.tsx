/** Temporary parsed wiki preview between equipment selection and glamour search. */
import { ArrowLeft, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { WikiLoadStatus } from "../hooks/useWikiItem";
import type { EquipmentSearchItem } from "../services/equipmentApi";
import type { WikiItemData } from "../services/wikiApi";

type WikiItemPageProps = {
  equipment: EquipmentSearchItem;
  item: WikiItemData | null;
  status: WikiLoadStatus;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
  onRetry: () => void;
};

export function WikiItemPage({
  equipment,
  item,
  status,
  error,
  onBack,
  onConfirm,
  onRetry,
}: WikiItemPageProps) {
  const ready = status === "ready" && item;
  const failed = status === "error";

  return (
    <main className="wiki-item-page" id="top">
      <section className="wiki-item-shell" aria-labelledby="wiki-item-heading">
        <header className="wiki-item-header">
          <button
            className="equipment-page-back"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft />
            返回装备结果
          </button>
          <div>
            <h1 id="wiki-item-heading">{equipment.name}</h1>
            <p>灰机 Wiki 物品资料</p>
          </div>
          <span>ID {equipment.id}</span>
        </header>

        <div className="wiki-item-content">
          {ready ? (
            <WikiItemDetails equipment={equipment} item={item} />
          ) : failed ? (
            <div className="wiki-item-state wiki-item-error" role="alert">
              <WarningCircle />
              <h2>Wiki 资料加载失败</h2>
              <p>{error ?? "请稍后重试"}</p>
              <div>
                <button type="button" onClick={onRetry}>
                  重新加载
                </button>
                <button type="button" onClick={onConfirm}>
                  跳过 Wiki，直接搜索幻化
                </button>
              </div>
            </div>
          ) : (
            <div className="wiki-item-state" aria-live="polite">
              <CircleNotch className="wiki-item-spinner" />
              <h2>{readLoadingTitle(status)}</h2>
              <p>页面完成后会自动显示解析结果。</p>
            </div>
          )}
        </div>

        {!failed && (
          <footer className="wiki-item-actions">
            <button type="button" onClick={onBack}>
              返回装备结果
            </button>
            <button type="button" disabled={!ready} onClick={onConfirm}>
              用此装备搜索幻化
            </button>
          </footer>
        )}
      </section>
    </main>
  );
}

function WikiItemDetails({
  equipment,
  item,
}: {
  equipment: EquipmentSearchItem;
  item: WikiItemData;
}) {
  return (
    <article className="wiki-item-layout">
      <figure className="wiki-item-visual">
        <img
          src={item.imageUrl ?? equipment.icon}
          alt={`${item.itemName}物品图标`}
          referrerPolicy="no-referrer"
          onError={(event) => {
            if (event.currentTarget.src !== equipment.icon) {
              event.currentTarget.src = equipment.icon;
            }
          }}
        />
        <figcaption>
          <strong>{item.itemName}</strong>
          <span>{equipment.category}</span>
        </figcaption>
      </figure>
      <section className="wiki-item-information" aria-label="Wiki 解析资料">
        {item.description && <p>{item.description}</p>}
        <dl className="wiki-item-facts">
          <div>
            <dt>装备 ID</dt>
            <dd>{equipment.id}</dd>
          </div>
          {item.facts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className="wiki-item-source">
          数据来自灰机 Wiki，读取方式：
          {item.source === "safari" ? "Safari 请求" : "验证面板"}
        </p>
      </section>
    </article>
  );
}

function readLoadingTitle(status: WikiLoadStatus) {
  if (status === "parsing") return "正在解析 Wiki 页面";
  if (status === "background_verification") return "正在后台验证访问";
  if (status === "interaction_required") return "等待完成访问验证";
  return "正在加载 Wiki 资料";
}
