/** Collapsible Item-sheet filters used before opening equipment results. */
import clsx from "clsx";
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

/** Complete utility strings are shared without adding component CSS rules. */
const equipmentFilterToggleIconClasses =
  "first:h-4.5 first:w-4.5 first:text-accent last:h-[13px] last:w-[13px] last:text-muted last:[transition:transform_160ms_ease] group-aria-expanded/equipment-filter-toggle:last:transform-[rotate(180deg)]";

/** Reused presentation strings stay static and are allocated once for this module. */
const equipmentSelectClasses =
  "min-h-9 w-full min-w-0 cursor-pointer [appearance:none] border-0 bg-transparent py-0 pr-8 pl-3 text-ink outline-none [font:inherit]";
const equipmentRangeClasses =
  "grid grid-cols-[minmax(0,_1fr)_auto_minmax(0,_1fr)] items-center gap-1.5";
const equipmentInputClasses =
  "min-h-9.5 w-full min-w-0 rounded-control border border-solid border-control bg-canvas px-3 py-0 text-[12px] text-ink outline-none placeholder:text-muted placeholder:opacity-80 focus:border-accent focus:shadow-[none]";

type EquipmentSearchFiltersProps = {
  filters: EquipmentSearchFilterValues;
  onChange: (filters: EquipmentSearchFilterValues) => void;
  onClear: () => void;
};
const SLOT_OPTIONS: {
  value: EquipmentSlot;
  label: string;
}[] = [
  {
    value: "MainHand",
    label: "主手",
  },
  {
    value: "OffHand",
    label: "副手",
  },
  {
    value: "Head",
    label: "头部",
  },
  {
    value: "Body",
    label: "身体",
  },
  {
    value: "Gloves",
    label: "手部",
  },
  {
    value: "Legs",
    label: "腿部",
  },
  {
    value: "Feet",
    label: "脚部",
  },
  {
    value: "Ears",
    label: "耳饰",
  },
  {
    value: "Neck",
    label: "项链",
  },
  {
    value: "Wrists",
    label: "手镯",
  },
  {
    value: "FingerL",
    label: "戒指",
  },
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
  ) =>
    onChange({
      ...filters,
      [key]: value,
    });
  return (
    <section
      className="equipment-filter-panel @container/equipment-filters mt-3 overflow-hidden rounded-control border border-solid border-line bg-[color-mix(_in_srgb,_var(--ors-color-surface)_82%,_var(--ors-color-canvas)_)]"
      aria-label="装备筛选条件"
    >
      <div className="equipment-filter-header flex min-h-14.5 items-stretch">
        <button
          className="equipment-filter-toggle group/equipment-filter-toggle grid min-h-9 flex-1 grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-2.5 border-0 bg-transparent px-3.5 py-[9px] text-left text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-[color-mix(in_srgb,_var(--ors-color-selected)_32%,_transparent)] pointer-coarse:min-h-11"
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((current) => !current)}
        >
          <SlidersHorizontal className={equipmentFilterToggleIconClasses} />
          <span className="grid gap-[3px]">
            <strong className="text-[12px]">装备筛选</strong>
            <small className="text-xs text-muted">
              {activeCount ? `已设置 ${activeCount} 项` : "所有条件均可选"}
            </small>
          </span>
          <CaretDown
            className={equipmentFilterToggleIconClasses}
            aria-hidden="true"
          />
        </button>
        <button
          className="equipment-filter-clear mr-3 inline-flex min-h-8.5 items-center gap-[5px] self-center rounded-control border border-solid border-line bg-surface px-[11px] py-0 text-xs font-bold text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:border-accent enabled:hover:bg-selected enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-42 max-[480px]:w-8.5 max-[480px]:justify-center max-[480px]:p-0 max-[480px]:text-[length:0]"
          type="button"
          disabled={!activeCount}
          onClick={onClear}
        >
          <X className="h-3 w-3" />
          清除
        </button>
      </div>

      {expanded && (
        // The sidebar and discovery panel reduce the available width before viewport breakpoints change.
        <div
          className="equipment-filter-fields grid grid-cols-1 gap-[13px] border-t border-solid border-line px-3.5 pt-[15px] pb-[17px] @min-[480px]/equipment-filters:grid-cols-2 @min-[720px]/equipment-filters:grid-cols-3 @min-[940px]/equipment-filters:grid-cols-[minmax(110px,_0.68fr)_minmax(190px,_1.12fr)_minmax(190px,_1.12fr)_minmax(160px,_1fr)_minmax(160px,_1fr)]"
          id={panelId}
        >
          <FilterField label="装备部位">
            <SelectControl>
              <select
                className={equipmentSelectClasses}
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

          <FilterField label="装备等级范围" className="equipment-level-range">
            <div className={equipmentRangeClasses}>
              <input
                className={equipmentInputClasses}
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
              <span className="text-xs text-muted" aria-hidden="true">
                至
              </span>
              <input
                className={equipmentInputClasses}
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

          <FilterField label="品级范围" className="equipment-level-range">
            <div className={equipmentRangeClasses}>
              <input
                className={equipmentInputClasses}
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
              <span className="text-xs text-muted" aria-hidden="true">
                至
              </span>
              <input
                className={equipmentInputClasses}
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
              className={equipmentInputClasses}
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
                className={equipmentSelectClasses}
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
          className="equipment-filter-error m-0 px-3.5 pt-0 pb-[13px] text-xs text-danger"
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
      className={clsx(
        "equipment-filter-field grid min-w-0 content-start gap-[7px]",
        className,
      )}
    >
      <span className="first:pl-[3px] first:text-xs first:font-bold first:text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
function SelectControl({ children }: { children: ReactNode }) {
  return (
    <span className="equipment-filter-select relative flex min-h-9.5 w-full min-w-0 items-center rounded-control border border-solid border-control bg-canvas text-[12px] text-ink focus-within:border-accent focus-within:shadow-[none]">
      {children}
      <CaretDown
        className="[pointer-events:none] absolute right-3 h-[11px] w-[11px] text-accent"
        aria-hidden="true"
      />
    </span>
  );
}
function readOptionalNumber(value: string) {
  return value === "" ? null : Number(value);
}
