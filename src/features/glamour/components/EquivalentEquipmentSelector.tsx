/** Selectable, collapsible scope for shared-model glamour searches. */
import {
  ArrowsLeftRight,
  CaretDown,
  Prohibit,
  WarningCircle,
} from "@phosphor-icons/react";
import { MAX_EQUIVALENT_EQUIPMENT_SELECTION } from "../hooks/useGlamourDiscovery";
import type { WikiLoadStatus } from "../hooks/useWikiItem";
import {
  clusterModelItems,
  type ModelNameClusterEntry,
} from "../utils/modelNameClusters";
import type { WikiModelItem } from "../wiki.types";

type EquivalentEquipmentSelectorProps = {
  items: WikiModelItem[];
  selectedIds: number[];
  status: WikiLoadStatus;
  error: string | null;
  updating: boolean;
  onToggle: (equipmentId: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
};

export function EquivalentEquipmentSelector({
  items,
  selectedIds,
  status,
  error,
  updating,
  onToggle,
  onSelectAll,
  onClear,
}: EquivalentEquipmentSelectorProps) {
  const identical = items.filter((item) => item.relation === "identical");
  const primary = items.filter((item) => item.relation === "primary");
  const eligibleCount = items.filter(
    (item) => item.id !== null && !item.unobtainable,
  ).length;
  const atLimit = selectedIds.length >= MAX_EQUIVALENT_EQUIPMENT_SELECTION;
  const loading =
    status === "loading" ||
    status === "parsing" ||
    status === "background_verification";

  return (
    <section className="equivalent-equipment-selector" aria-live="polite">
      <header className="equivalent-equipment-header">
        <span>
          <strong>同模搜索范围</strong>
          <small>
            {updating
              ? "正在后台更新展示范围"
              : selectedIds.length
                ? `已纳入 ${selectedIds.length} 件同模装备`
                : "当前仅查询原装备"}
          </small>
        </span>
        <div>
          <button
            className="equivalent-select-all"
            type="button"
            disabled={!eligibleCount}
            onClick={onSelectAll}
          >
            一键查询所有同模装备幻化
          </button>
          {selectedIds.length > 0 && (
            <button
              className="equivalent-clear"
              type="button"
              onClick={onClear}
            >
              清空同模
            </button>
          )}
        </div>
      </header>

      {loading && !items.length ? (
        <div className="equivalent-equipment-state">
          <span />
          <p>正在识别全部同模装备</p>
        </div>
      ) : status === "interaction_required" && !items.length ? (
        <div className="equivalent-equipment-message">
          <WarningCircle />
          完成 Wiki 访问验证后显示同模范围。
        </div>
      ) : status === "error" && !items.length ? (
        <div className="equivalent-equipment-message">
          <WarningCircle />
          {error ?? "暂时无法读取同模装备"}
        </div>
      ) : items.length ? (
        <details className="equivalent-equipment-list">
          <summary>
            <span>
              <ArrowsLeftRight />
              查看同模装备
            </span>
            <span>
              共 {items.length} 件，已选 {selectedIds.length}/
              {MAX_EQUIVALENT_EQUIPMENT_SELECTION}
              <CaretDown />
            </span>
          </summary>
          <div className="equivalent-equipment-list-content">
            {identical.length > 0 && (
              <EquivalentRelationGroup
                label="模型完全相同"
                entries={clusterModelItems(identical)}
                selectedIds={selectedIds}
                atLimit={atLimit}
                onToggle={onToggle}
              />
            )}
            {primary.length > 0 && (
              <EquivalentRelationGroup
                label="主模型相同"
                entries={clusterModelItems(primary)}
                selectedIds={selectedIds}
                atLimit={atLimit}
                onToggle={onToggle}
              />
            )}
            <p>
              勾选变化会自动更新幻化展示。列表超过上限时可选择其中任意 10 件。
            </p>
          </div>
        </details>
      ) : status === "ready" ? (
        <p className="equivalent-equipment-empty">未发现其他同模装备。</p>
      ) : null}
    </section>
  );
}

function EquivalentRelationGroup({
  label,
  entries,
  selectedIds,
  atLimit,
  onToggle,
}: {
  label: string;
  entries: ModelNameClusterEntry[];
  selectedIds: number[];
  atLimit: boolean;
  onToggle: (equipmentId: number) => void;
}) {
  return (
    <section className="equivalent-relation-group">
      <h3>{label}</h3>
      <div>
        {entries.map((entry) =>
          entry.kind === "cluster" ? (
            <details className="equivalent-role-cluster" key={entry.key}>
              <summary>
                <span>
                  <strong>{entry.label}</strong>
                  <small>{entry.infixes.join(" / ")}</small>
                </span>
                <span>
                  {entry.models.length} 件
                  <CaretDown />
                </span>
              </summary>
              <div>
                {entry.models.map((model) => (
                  <EquivalentEquipmentOption
                    model={model}
                    selected={
                      model.id !== null && selectedIds.includes(model.id)
                    }
                    atLimit={atLimit}
                    onToggle={onToggle}
                    key={model.id ?? model.name}
                  />
                ))}
              </div>
            </details>
          ) : (
            <EquivalentEquipmentOption
              model={entry.model}
              selected={
                entry.model.id !== null && selectedIds.includes(entry.model.id)
              }
              atLimit={atLimit}
              onToggle={onToggle}
              key={entry.model.id ?? entry.model.name}
            />
          ),
        )}
      </div>
    </section>
  );
}

function EquivalentEquipmentOption({
  model,
  selected,
  atLimit,
  onToggle,
}: {
  model: WikiModelItem;
  selected: boolean;
  atLimit: boolean;
  onToggle: (equipmentId: number) => void;
}) {
  const disabled =
    model.id === null || model.unobtainable || (!selected && atLimit);
  return (
    <label
      className={`equivalent-equipment-option${
        model.unobtainable ? " unobtainable" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={() => {
          if (model.id !== null) onToggle(model.id);
        }}
      />
      <span className="equivalent-equipment-icon" aria-hidden="true">
        <ArrowsLeftRight />
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
            ? "当前无法获得"
            : model.id === null
              ? "缺少物品 ID"
              : model.sourceSummary || "来源未收录"}
        </span>
      </span>
      {model.unobtainable && <Prohibit />}
    </label>
  );
}
