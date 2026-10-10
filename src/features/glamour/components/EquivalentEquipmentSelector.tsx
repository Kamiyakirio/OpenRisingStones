/** Selectable, collapsible scope for shared-model glamour searches. */
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
      className={
        "equivalent-equipment-selector overflow-hidden border border-solid border-control rounded-[var(--ors-radius-control)] [&&&&]:[background:color-mix(in_srgb,_var(--ors-color-surface)_80%,_transparent)]"
      }
      aria-live="polite"
    >
      <header
        className={
          "equivalent-equipment-header flex justify-between items-center gap-[16px] min-h-[58px] [&_>_span]:grid [&_>_span]:min-w-0 [&_>_span]:gap-[3px] [&_small]:text-muted [&_small]:text-xs [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[7px] [&_button]:min-h-[34px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:text-xs [&_button]:whitespace-nowrap [&_button:hover:not(:disabled)]:border-accent [&_button:hover:not(:disabled)]:text-accent max-[700px]:items-stretch max-[700px]:flex-col max-[700px]:gap-[9px] max-[700px]:[&_>_div]:w-full [&&&&]:p-[10px_12px] [&&&&_strong]:text-[12px] [&&&&_button]:p-[0_11px] [&&&&_button]:[font-weight:720] [&&&&_button:disabled]:[cursor:wait] [&&&&_button:disabled]:opacity-[0.46] [@media(max-width:_700px)]:[&&&&_button]:flex-[1]"
        }
      >
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
            className="equivalent-select-all [.equivalent-equipment-header_&]:border-accent [.equivalent-equipment-header_&]:text-accent [.equivalent-equipment-header_&]:bg-selected"
            type="button"
            disabled={!eligibleCount}
            onClick={onSelectAll}
          >
            查询全部同模装备的幻化
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
        <div
          className={
            "equivalent-equipment-state min-h-[40px] m-0 border-t border-solid border-line text-muted text-xs flex items-center gap-[8px] [&_>_span]:w-[78px] [&_>_span]:h-[7px] [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_span]:bg-surface [&_p]:m-0 [&&&&]:p-[0_12px] [&&&&_>_span]:[background-size:240%_100%]"
          }
        >
          <span />
          <p>正在识别全部同模装备</p>
        </div>
      ) : status === "interaction_required" && !items.length ? (
        <div
          className={
            "equivalent-equipment-message min-h-[40px] m-0 border-t border-solid border-line text-muted text-xs flex items-center gap-[8px] [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:text-accent [&&&&]:p-[0_12px]"
          }
        >
          <WarningCircle />
          完成 Wiki 访问验证后显示同模范围。
        </div>
      ) : status === "error" && !items.length ? (
        <div
          className={
            "equivalent-equipment-message min-h-[40px] m-0 border-t border-solid border-line text-muted text-xs flex items-center gap-[8px] [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:text-accent [&&&&]:p-[0_12px]"
          }
        >
          <WarningCircle />
          {error ?? "暂时无法读取同模装备"}
        </div>
      ) : items.length ? (
        <details
          className={
            "equivalent-equipment-list border-t border-solid border-line [&_>_summary]:flex [&_>_summary]:justify-between [&_>_summary]:items-center [&_>_summary]:gap-[14px] [&_>_summary]:min-h-[42px] [&_>_summary]:text-muted [&_>_summary]:cursor-pointer [&_>_summary::-webkit-details-marker]:hidden [&_>_summary_>_span]:inline-flex [&_>_summary_>_span]:items-center [&_>_summary_>_span]:gap-[6px] [&_>_summary_>_span]:text-xs [&_>_summary_>_span:first-child]:text-ink [&_>_summary_>_span:first-child]:text-xs [&_>_summary_svg]:w-[13px] [&_>_summary_svg]:h-[13px] [&_>_summary_svg]:text-accent max-[700px]:[&_>_summary]:items-start max-[700px]:[&_>_summary]:flex-col max-[700px]:[&_>_summary]:gap-[4px] max-[700px]:[&_>_summary]:py-[9px] [&&&&_>_summary]:p-[0_12px] [&&&&_>_summary]:[list-style:none] [&&&&_>_summary_>_span:first-child]:[font-weight:720] [&&&&_>_summary_span:last-child_svg]:[transition:transform_160ms_ease] [&&&&[open]_>_summary_span:last-child_svg]:transform-[rotate(180deg)]"
          }
        >
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
          <div
            className={
              "equivalent-equipment-list-content grid gap-[12px] max-h-[420px] overflow-auto [&_>_p]:m-0 [&_>_p]:text-muted [&_>_p]:text-xs [&&&&]:p-[4px_12px_12px] [&&&&]:[overscroll-behavior:contain] [&&&&]:[scrollbar-width:thin] [&&&&_>_p]:leading-[1.45]"
            }
          >
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
            <p>选择后立即更新幻化投稿，最多选择 10 件。</p>
          </div>
        </details>
      ) : status === "ready" ? (
        <p
          className={
            "equivalent-equipment-empty min-h-[40px] m-0 border-t border-solid border-line text-muted text-xs flex items-center [&&&&]:p-[0_12px]"
          }
        >
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
    <section className="equivalent-relation-group grid gap-[6px] [&_h3]:m-0 [&_h3]:text-accent [&_h3]:text-xs [&_>_div]:grid [&_>_div]:gap-[4px]">
      <h3 className="text-base font-semibold">{label}</h3>
      <div>
        {entries.map((entry) =>
          entry.kind === "cluster" ? (
            <details
              className={
                "equivalent-role-cluster [&_>_summary::-webkit-details-marker]:hidden overflow-hidden rounded-[var(--ors-radius-control)] bg-hover [&_>_summary]:flex [&_>_summary]:justify-between [&_>_summary]:items-center [&_>_summary]:gap-[12px] [&_>_summary]:min-h-[42px] [&_>_summary]:cursor-pointer [&_>_summary_>_span:first-child]:grid [&_>_summary_>_span:first-child]:min-w-0 [&_>_summary_>_span:first-child]:gap-[2px] [&_>_summary_strong]:overflow-hidden [&_>_summary_strong]:text-xs [&_>_summary_strong]:whitespace-nowrap [&_>_summary_small]:overflow-hidden [&_>_summary_small]:text-muted [&_>_summary_small]:text-xs [&_>_summary_small]:whitespace-nowrap [&_>_summary_>_span:last-child]:inline-flex [&_>_summary_>_span:last-child]:items-center [&_>_summary_>_span:last-child]:gap-[5px] [&_>_summary_>_span:last-child]:text-muted [&_>_summary_>_span:last-child]:text-xs [&_>_summary_svg]:w-[12px] [&_>_summary_svg]:h-[12px] [&_>_summary_svg]:text-accent [&_>_div]:grid [&_>_div]:gap-[2px] [&&&&_>_summary_>_span:last-child_svg]:[transition:transform_160ms_ease] [&&&&[open]_>_summary_>_span:last-child_svg]:transform-[rotate(180deg)] [&&&&_>_summary]:p-[6px_9px] [&&&&_>_summary]:[list-style:none] [&&&&_>_summary_strong]:[text-overflow:ellipsis] [&&&&_>_summary_small]:[text-overflow:ellipsis] [&&&&_>_summary_>_span:last-child]:flex-[0_0_auto] [&&&&_>_div]:p-[0_4px_4px_12px]"
              }
              key={entry.key}
            >
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
      className={`[&&&&]:grid-cols-[auto_38px_minmax(0,_1fr)_auto] [&&&&]:p-[6px_8px] [&&&&:has(input:checked)]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_58%,_var(--ors-color-surface)_)] [&&&&:has(input:focus-visible)]:[outline:2px_solid_var(--ors-color-accent)] [&&&&:has(input:focus-visible)]:[outline-offset:1px] [&&&&_input]:[accent-color:var(--ors-color-accent)] [&&&&_strong]:[text-overflow:ellipsis] [&&&&_small]:[text-overflow:ellipsis] [&&&&_>_span:nth-child(3)_>_span]:[text-overflow:ellipsis] [@media(max-width:_700px)]:[&&&&]:grid-cols-[auto_34px_minmax(0,_1fr)] [@media(max-width:_700px)]:[&&&&_>_svg]:[grid-column:3] grid items-center gap-[8px] min-h-[52px] rounded-[var(--ors-radius-control)] bg-surface cursor-pointer [&_input]:w-[14px] [&_input]:h-[14px] [&_input]:m-0 [&_input:disabled]:cursor-not-allowed [&_>_span:nth-child(3)]:grid [&_>_span:nth-child(3)]:min-w-0 [&_>_span:nth-child(3)]:gap-[2px] [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&_small]:overflow-hidden [&_small]:whitespace-nowrap [&_>_span:nth-child(3)_>_span]:overflow-hidden [&_>_span:nth-child(3)_>_span]:whitespace-nowrap [&_strong]:text-xs [&_small]:text-muted [&_small]:text-xs [&_>_span:nth-child(3)_>_span]:text-muted [&_>_span:nth-child(3)_>_span]:text-xs [&_>_svg]:w-[14px] [&_>_svg]:h-[14px] [&_>_svg]:text-danger equivalent-equipment-option${
        model.unobtainable
          ? " unobtainable [.equivalent-equipment-option&]:cursor-not-allowed [.equivalent-equipment-option&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-surface)_38%,_var(--ors-color-surface)_)] [.equivalent-equipment-option&&&&_img]:[filter:grayscale(0.75)] [.equivalent-equipment-option&&&&_img]:opacity-[0.68]"
          : ""
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
      <span
        className={
          "equivalent-equipment-icon relative grid place-items-center w-[38px] h-[38px] overflow-hidden rounded-[var(--ors-radius-control)] text-muted bg-hover [&_>_svg]:w-[15px] [&_>_svg]:h-[15px] [&_img]:absolute [&_img]:w-full [&_img]:h-full [&_img]:object-contain max-[700px]:w-[34px] max-[700px]:h-[34px] [&&&&_img]:inset-[0]"
        }
        aria-hidden="true"
      >
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
