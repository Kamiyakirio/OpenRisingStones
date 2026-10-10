/** Collapsible Item-sheet filters used before opening equipment results. */
import {
  countEquipmentSearchFilters,
  validateEquipmentSearchFilters,
} from "../utils/equipmentFilters.ts";

import { CaretDown, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useId, useState, type ReactNode } from "react";
import { CLASS_JOB_GROUPS } from "../data/classJobs";
import {
  type EquipmentClassJob,
  type EquipmentSearchFilters as EquipmentSearchFilterValues,
  type EquipmentSlot,
} from "../equipment.types";

type EquipmentSearchFiltersProps = {
  filters: EquipmentSearchFilterValues;
  onChange: (filters: EquipmentSearchFilterValues) => void;
  onClear: () => void;
};

const SLOT_OPTIONS: { value: EquipmentSlot; label: string }[] = [
  { value: "MainHand", label: "主手" },
  { value: "OffHand", label: "副手" },
  { value: "Head", label: "头部" },
  { value: "Body", label: "身体" },
  { value: "Gloves", label: "手部" },
  { value: "Legs", label: "腿部" },
  { value: "Feet", label: "脚部" },
  { value: "Ears", label: "耳饰" },
  { value: "Neck", label: "项链" },
  { value: "Wrists", label: "手镯" },
  { value: "FingerL", label: "戒指" },
];

const CATEGORY_SUGGESTIONS = [
  "头部防具",
  "身体防具",
  "手部防具",
  "腿部防具",
  "脚部防具",
  "耳饰",
  "项链",
  "手镯",
  "戒指",
];

export function EquipmentSearchFilters({
  filters,
  onChange,
  onClear,
}: EquipmentSearchFiltersProps) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const categoryListId = useId();
  const activeCount = countEquipmentSearchFilters(filters);
  const validationError = validateEquipmentSearchFilters(filters);
  const update = <Key extends keyof EquipmentSearchFilterValues>(
    key: Key,
    value: EquipmentSearchFilterValues[Key],
  ) => onChange({ ...filters, [key]: value });

  return (
    <section
      className={
        "equipment-filter-panel mt-[12px] overflow-hidden border border-solid border-line rounded-[var(--ors-radius-control)] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-surface)_82%,_var(--ors-color-canvas)_)]"
      }
      aria-label="装备筛选条件"
    >
      <div className="equipment-filter-header flex items-stretch min-h-[58px]">
        <button
          className={
            'equipment-filter-toggle grid items-center gap-[10px] border-0 text-ink text-left [&_>_svg:first-child]:w-[18px] [&_>_svg:first-child]:h-[18px] [&_>_svg:first-child]:text-accent [&_>_svg:last-child]:w-[13px] [&_>_svg:last-child]:h-[13px] [&_>_svg:last-child]:text-muted [&_>_span]:grid [&_>_span]:gap-[3px] [&_small]:text-muted [&_small]:text-xs [&&&&]:flex-[1] [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&]:p-[9px_14px] [&&&&]:[background:transparent] [&&&&:hover]:[background:color-mix(in_srgb,_var(--ors-color-selected)_32%,_transparent)] [&&&&_>_svg:last-child]:[transition:transform_160ms_ease] [&&&&[aria-expanded="true"]_>_svg:last-child]:transform-[rotate(180deg)] [&&&&_strong]:text-[12px]'
          }
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((current) => !current)}
        >
          <SlidersHorizontal />
          <span>
            <strong>装备筛选</strong>
            <small>
              {activeCount ? `已设置 ${activeCount} 项` : "所有条件均可选"}
            </small>
          </span>
          <CaretDown aria-hidden="true" />
        </button>
        <button
          className={
            "equipment-filter-clear inline-flex items-center gap-[5px] min-h-[34px] mr-[12px] border border-solid border-line rounded-[var(--ors-radius-control)] text-muted bg-surface text-xs font-bold [&:hover:not(:disabled)]:border-accent [&:hover:not(:disabled)]:text-accent [&:hover:not(:disabled)]:bg-selected [&:disabled]:cursor-not-allowed [&_svg]:w-[12px] [&_svg]:h-[12px] max-[480px]:w-[34px] max-[480px]:p-0 max-[480px]:justify-center [&&&&]:[align-self:center] [&&&&]:p-[0_11px] [&&&&:disabled]:opacity-[0.42] [@media(max-width:_480px)]:[&&&&]:text-[0]"
          }
          type="button"
          disabled={!activeCount}
          onClick={onClear}
        >
          <X />
          清除
        </button>
      </div>

      {expanded && (
        <div
          className={
            "equipment-filter-fields grid gap-[13px] border-t border-solid border-line [&&&&]:grid-cols-[minmax(110px,_0.68fr)_minmax(190px,_1.12fr)_minmax(190px,_1.12fr)_minmax(160px,_1fr)_minmax(160px,_1fr)] [&&&&]:p-[15px_14px_17px] [@media(max-width:_980px)]:[&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(max-width:_700px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_480px)]:[&&&&]:grid-cols-[1fr]"
          }
          id={panelId}
        >
          <FilterField label="装备部位">
            <SelectControl>
              <select
                aria-label="装备部位"
                value={filters.equipSlot ?? ""}
                onChange={(event) =>
                  update(
                    "equipSlot",
                    (event.target.value || null) as EquipmentSlot | null,
                  )
                }
              >
                <option value="">不限</option>
                {SLOT_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </SelectControl>
          </FilterField>

          <FilterField
            label="装备等级范围"
            className={
              "equipment-level-range [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[38px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input::placeholder]:text-muted [&_input:focus]:border-accent [&_>_div]:grid [&_>_div]:items-center [&_>_div]:gap-[6px] [&_>_div_>_span]:text-muted [&_>_div_>_span]:text-xs [&&&&_input]:text-[12px] [&&&&_input]:p-[0_12px] [&&&&_input]:[outline:0] [&&&&_input::placeholder]:opacity-[0.8] [&&&&_input:focus]:shadow-[none] [&&&&_>_div]:grid-cols-[minmax(0,_1fr)_auto_minmax(0,_1fr)] [@media(max-width:_700px)]:[&&&&]:[grid-column:span_2] [@media(max-width:_480px)]:[&&&&]:[grid-column:auto]"
            }
          >
            <div>
              <input
                type="number"
                min="1"
                max="999"
                step="1"
                inputMode="numeric"
                value={filters.minEquipLevel ?? ""}
                placeholder="最低"
                aria-label="最低装备等级"
                onChange={(event) =>
                  update(
                    "minEquipLevel",
                    readOptionalNumber(event.target.value),
                  )
                }
              />
              <span aria-hidden="true">至</span>
              <input
                type="number"
                min="1"
                max="999"
                step="1"
                inputMode="numeric"
                value={filters.maxEquipLevel ?? ""}
                placeholder="最高"
                aria-label="最高装备等级"
                onChange={(event) =>
                  update(
                    "maxEquipLevel",
                    readOptionalNumber(event.target.value),
                  )
                }
              />
            </div>
          </FilterField>

          <FilterField
            label="品级范围"
            className={
              "equipment-level-range [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[38px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_input::placeholder]:text-muted [&_input:focus]:border-accent [&_>_div]:grid [&_>_div]:items-center [&_>_div]:gap-[6px] [&_>_div_>_span]:text-muted [&_>_div_>_span]:text-xs [&&&&_input]:text-[12px] [&&&&_input]:p-[0_12px] [&&&&_input]:[outline:0] [&&&&_input::placeholder]:opacity-[0.8] [&&&&_input:focus]:shadow-[none] [&&&&_>_div]:grid-cols-[minmax(0,_1fr)_auto_minmax(0,_1fr)] [@media(max-width:_700px)]:[&&&&]:[grid-column:span_2] [@media(max-width:_480px)]:[&&&&]:[grid-column:auto]"
            }
          >
            <div>
              <input
                type="number"
                min="0"
                max="9999"
                step="1"
                inputMode="numeric"
                value={filters.minItemLevel ?? ""}
                placeholder="最低"
                aria-label="最低品级"
                onChange={(event) =>
                  update("minItemLevel", readOptionalNumber(event.target.value))
                }
              />
              <span aria-hidden="true">至</span>
              <input
                type="number"
                min="0"
                max="9999"
                step="1"
                inputMode="numeric"
                value={filters.maxItemLevel ?? ""}
                placeholder="最高"
                aria-label="最高品级"
                onChange={(event) =>
                  update("maxItemLevel", readOptionalNumber(event.target.value))
                }
              />
            </div>
          </FilterField>

          <FilterField label="装备分类">
            <input
              type="text"
              aria-label="装备分类"
              list={categoryListId}
              maxLength={40}
              value={filters.itemUiCategory}
              placeholder="例如：身体防具"
              onChange={(event) => update("itemUiCategory", event.target.value)}
            />
            <datalist id={categoryListId}>
              {CATEGORY_SUGGESTIONS.map((category) => (
                <option value={category} key={category} />
              ))}
            </datalist>
          </FilterField>

          <FilterField label="可用职业">
            <SelectControl>
              <select
                aria-label="可用职业"
                value={filters.classJob ?? ""}
                onChange={(event) =>
                  update(
                    "classJob",
                    (event.target.value || null) as EquipmentClassJob | null,
                  )
                }
              >
                <option value="">不限</option>
                {CLASS_JOB_GROUPS.map((group) => (
                  <optgroup label={group.label} key={group.label}>
                    {group.options.map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label} ({option.value})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </SelectControl>
          </FilterField>
        </div>
      )}

      {validationError && (
        <p
          className={
            "equipment-filter-error m-0 text-danger text-xs [&&&&]:p-[0_14px_13px]"
          }
          role="alert"
        >
          {validationError}
        </p>
      )}
    </section>
  );
}

function FilterField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`[&&&&]:[align-content:start] [&&&&_>_input]:text-[12px] [&&&&_>_input]:p-[0_12px] [&&&&_>_input]:[outline:0] [&&&&_>_input::placeholder]:opacity-[0.8] [&&&&_>_input:focus]:shadow-[none] grid min-w-0 gap-[7px] [&_>_span:first-child]:pl-[3px] [&_>_span:first-child]:text-muted [&_>_span:first-child]:text-xs [&_>_span:first-child]:font-bold [&_>_input]:w-full [&_>_input]:min-w-0 [&_>_input]:min-h-[38px] [&_>_input]:border [&_>_input]:border-solid [&_>_input]:border-control [&_>_input]:rounded-[var(--ors-radius-control)] [&_>_input]:text-ink [&_>_input]:bg-canvas [&_>_input::placeholder]:text-muted [&_>_input:focus]:border-accent equipment-filter-field ${className}`}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

function SelectControl({ children }: { children: ReactNode }) {
  return (
    <span
      className={
        "equipment-filter-select w-full min-w-0 min-h-[38px] border border-solid border-control rounded-[var(--ors-radius-control)] text-ink bg-canvas [&:focus-within]:border-accent relative flex items-center [&_select]:w-full [&_select]:min-w-0 [&_select]:min-h-[36px] [&_select]:border-0 [&_select]:text-ink [&_select]:cursor-pointer [&_svg]:absolute [&_svg]:w-[11px] [&_svg]:h-[11px] [&_svg]:text-accent [&&&&]:text-[12px] [&&&&:focus-within]:shadow-[none] [&&&&_select]:p-[0_32px_0_12px] [&&&&_select]:[outline:0] [&&&&_select]:[appearance:none] [&&&&_select]:[background:transparent] [&&&&_select]:[font:inherit] [&&&&_svg]:right-[12px] [&&&&_svg]:[pointer-events:none]"
      }
    >
      {children}
      <CaretDown aria-hidden="true" />
    </span>
  );
}

function readOptionalNumber(value: string) {
  return value === "" ? null : Number(value);
}
