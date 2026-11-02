/** Selectable, collapsible scope for shared-model glamour searches. */
import clsx from "clsx";
import {
  ArrowsLeftRight,
  CaretDown,
  Prohibit,
  WarningCircle,
} from "@phosphor-icons/react";
import { MAX_EQUIVALENT_EQUIPMENT_SELECTION } from "../hooks/useGlamourDiscovery";
import type { WikiLoadStatus } from "../../../shared/wiki/useWikiItem";
import {
  clusterModelItems,
  type ModelNameClusterEntry,
} from "../utils/modelNameClusters";
import type { WikiModelItem } from "../../../shared/wiki/wiki.types.ts";
import { glamourTruncatedNameClasses } from "../utilityClasses";

/** Complete utility strings are shared without adding component CSS rules. */
const equivalentSummaryContentClasses =
  "first:grid first:min-w-0 first:gap-0.5 last:inline-flex last:shrink-0 last:items-center last:gap-[5px] last:text-xs last:text-muted";

/** Reused presentation strings stay static and are allocated once for this module. */
const equivalentMessageClasses =
  "equivalent-equipment-message m-0 flex min-h-10 items-center gap-2 border-t border-solid border-line px-3 py-0 text-xs text-muted";
const equivalentSummaryClasses =
  "inline-flex items-center gap-1.5 text-xs first:text-xs first:font-[720] first:text-ink";
const equivalentChevronClasses =
  "h-[13px] w-[13px] text-accent [transition:transform_160ms_ease] group-open/equivalent-equipment-list:transform-[rotate(180deg)]";
const equivalentDetailClasses =
  "overflow-hidden text-xs text-ellipsis whitespace-nowrap text-muted";

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
    <section
      className="equivalent-equipment-selector overflow-hidden rounded-control border border-solid border-control bg-[color-mix(in_srgb,_var(--ors-color-surface)_80%,_transparent)]"
      aria-live="polite"
    >
      <header className="equivalent-equipment-header flex min-h-14.5 items-center justify-between gap-4 px-3 py-2.5 max-[700px]:flex-col max-[700px]:items-stretch max-[700px]:gap-[9px]">
        <span className="grid min-w-0 gap-[3px]">
          <strong className="text-[12px]">同模搜索范围</strong>
          <small className="text-xs text-muted">
            {updating
              ? "正在后台更新展示范围"
              : selectedIds.length
                ? `已纳入 ${selectedIds.length} 件同模装备`
                : "当前仅查询原装备"}
          </small>
        </span>
        <div className="flex items-center gap-[7px] max-[700px]:w-full">
          <button
            className="equivalent-select-all min-h-8.5 rounded-control border border-solid border-control bg-surface px-[11px] py-0 text-xs font-[720] whitespace-nowrap text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:border-accent enabled:hover:text-accent disabled:[cursor:wait] disabled:opacity-46 max-[700px]:flex-1"
            type="button"
            disabled={!eligibleCount}
            onClick={onSelectAll}
          >
            查询全部同模装备的幻化
          </button>
          {selectedIds.length > 0 && (
            <button
              className="equivalent-clear min-h-8.5 rounded-control border border-solid border-control bg-surface px-[11px] py-0 text-xs font-[720] whitespace-nowrap text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:border-accent enabled:hover:text-accent disabled:[cursor:wait] disabled:opacity-46 max-[700px]:flex-1"
              type="button"
              onClick={onClear}
            >
              清空同模
            </button>
          )}
        </div>
      </header>

      {loading && !items.length ? (
        <div className="equivalent-equipment-state m-0 flex min-h-10 items-center gap-2 border-t border-solid border-line px-3 py-0 text-xs text-muted">
          <span className="h-[7px] w-19.5 rounded-control bg-surface [background-size:240%_100%]" />
          <p className="m-0">正在识别全部同模装备</p>
        </div>
      ) : status === "interaction_required" && !items.length ? (
        <div className={equivalentMessageClasses}>
          <WarningCircle className="h-3.5 w-3.5 text-accent" />
          完成 Wiki 访问验证后显示同模范围。
        </div>
      ) : status === "error" && !items.length ? (
        <div className={equivalentMessageClasses}>
          <WarningCircle className="h-3.5 w-3.5 text-accent" />
          {error ?? "暂时无法读取同模装备"}
        </div>
      ) : items.length ? (
        <details className="equivalent-equipment-list group/equivalent-equipment-list border-t border-solid border-line">
          <summary className="flex min-h-10.5 cursor-pointer list-none items-center justify-between gap-3.5 px-3 py-0 text-muted max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-1 max-[700px]:py-[9px] [&::-webkit-details-marker]:hidden">
            <span className={equivalentSummaryClasses}>
              <ArrowsLeftRight className={equivalentChevronClasses} />
              查看同模装备
            </span>
            <span className={equivalentSummaryClasses}>
              共 {items.length} 件，已选 {selectedIds.length}/
              {MAX_EQUIVALENT_EQUIPMENT_SELECTION}
              <CaretDown className={equivalentChevronClasses} />
            </span>
          </summary>
          <div className="equivalent-equipment-list-content grid max-h-105 [scrollbar-width:thin] gap-3 overflow-auto [overscroll-behavior:contain] px-3 pt-1 pb-3">
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
            <p className="m-0 text-xs leading-[1.45] text-muted">
              选择后立即更新幻化投稿，最多选择 10 件。
            </p>
          </div>
        </details>
      ) : status === "ready" ? (
        <p className="equivalent-equipment-empty m-0 flex min-h-10 items-center border-t border-solid border-line px-3 py-0 text-xs text-muted">
          未发现其他同模装备。
        </p>
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
    <section className="equivalent-relation-group grid gap-1.5">
      <h3 className="m-0 text-xs font-semibold text-accent">{label}</h3>
      <div className="grid gap-1">
        {entries.map((entry) =>
          entry.kind === "cluster" ? (
            <details
              className="equivalent-role-cluster group/equivalent-role-cluster overflow-hidden rounded-control bg-hover"
              key={entry.key}
            >
              <summary className="flex min-h-10.5 cursor-pointer list-none items-center justify-between gap-3 px-[9px] py-1.5 [&::-webkit-details-marker]:hidden">
                <span className={equivalentSummaryContentClasses}>
                  <strong className={glamourTruncatedNameClasses}>
                    {entry.label}
                  </strong>
                  <small className={equivalentDetailClasses}>
                    {entry.infixes.join(" / ")}
                  </small>
                </span>
                <span className={equivalentSummaryContentClasses}>
                  {entry.models.length} 件
                  <CaretDown className="h-3 w-3 text-accent [transition:transform_160ms_ease] group-open/equivalent-role-cluster:transform-[rotate(180deg)]" />
                </span>
              </summary>
              <div className="grid gap-0.5 pt-0 pr-1 pb-1 pl-3">
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
      className={clsx(
        "grid min-h-13 cursor-pointer grid-cols-[auto_38px_minmax(0,_1fr)_auto] items-center gap-2 rounded-control bg-surface pt-1.5 pr-2 pb-1.5 pl-2 has-checked:bg-[color-mix(_in_srgb,_var(--ors-color-selected)_58%,_var(--ors-color-surface)_)] has-[:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] has-[:focus-visible]:[outline-offset:1px] max-[700px]:grid-cols-[auto_34px_minmax(0,_1fr)]",
        `equivalent-equipment-option${model.unobtainable ? "unobtainable cursor-not-allowed bg-[color-mix(_in_srgb,_var(--ors-color-surface)_38%,_var(--ors-color-surface)_)]" : ""}`,
      )}
    >
      <input
        className="m-0 h-3.5 w-3.5 [accent-color:var(--ors-color-accent)] disabled:cursor-not-allowed"
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={() => {
          if (model.id !== null) onToggle(model.id);
        }}
      />
      <span
        className="equivalent-equipment-icon relative grid h-9.5 w-9.5 place-items-center overflow-hidden rounded-control bg-hover text-muted nth-[3]:grid nth-[3]:min-w-0 nth-[3]:gap-0.5 max-[700px]:h-8.5 max-[700px]:w-8.5"
        aria-hidden="true"
      >
        <ArrowsLeftRight className="h-[15px] w-[15px]" />
        {model.iconUrl && (
          <img
            className="absolute inset-0 h-full w-full object-contain opacity-68 [filter:grayscale(0.75)]"
            src={model.iconUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
      </span>
      <span className="nth-[3]:grid nth-[3]:min-w-0 nth-[3]:gap-0.5">
        <strong className={glamourTruncatedNameClasses}>{model.name}</strong>
        <small className={equivalentDetailClasses}>{model.category}</small>
        <span className={equivalentDetailClasses}>
          {model.unobtainable
            ? "当前无法获得"
            : model.id === null
              ? "缺少物品 ID"
              : model.sourceSummary || "来源未收录"}
        </span>
      </span>
      {model.unobtainable && (
        <Prohibit className="h-3.5 w-3.5 text-danger max-[700px]:col-start-3" />
      )}
    </label>
  );
}
