/** Collapsible Item-sheet filters used before opening equipment results. */
import { CaretDown, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useId, useState, type ReactNode } from "react";
import { CLASS_JOB_GROUPS } from "@/features/equipment/data/classJobs";
import {
  countEquipmentSearchFilters,
  type EquipmentClassJob,
  type EquipmentSearchFilters as EquipmentSearchFilterValues,
  type EquipmentSlot,
  validateEquipmentSearchFilters,
} from "@/features/equipment/model/equipment";

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
    <section className="equipment-filter-panel" aria-label="装备筛选条件">
      <div className="equipment-filter-header">
        <button
          className="equipment-filter-toggle"
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
          className="equipment-filter-clear"
          type="button"
          disabled={!activeCount}
          onClick={onClear}
        >
          <X />
          清除
        </button>
      </div>

      {expanded && (
        <div className="equipment-filter-fields" id={panelId}>
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

          <FilterField label="装备等级范围" className="equipment-level-range">
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

          <FilterField label="品级范围" className="equipment-level-range">
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
        <p className="equipment-filter-error" role="alert">
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
    <label className={`equipment-filter-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function SelectControl({ children }: { children: ReactNode }) {
  return (
    <span className="equipment-filter-select">
      {children}
      <CaretDown aria-hidden="true" />
    </span>
  );
}

function readOptionalNumber(value: string) {
  return value === "" ? null : Number(value);
}
