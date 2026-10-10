/** Search and API-backed race and gender filters for glamour discovery. */
import {
  CaretDown,
  MagnifyingGlass,
  SlidersHorizontal,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import {
  CLASS_JOB_GROUPS,
  CLASS_JOB_OPTIONS,
  getClassJobIconUrl,
} from "../data/classJobs";
import { genderIdMap, raceIdMap } from "../data/idsToName";
import type {
  EquipmentClassJob,
  EquipmentSearchFilters as EquipmentSearchFilterValues,
  EquipmentSearchItem,
} from "../equipment.types";
import type { GlamourSearchMode } from "../hooks/useGlamourDiscovery";
import type { WikiLoadStatus } from "../../../shared/wiki/useWikiItem";
import type { WikiModelItem } from "../../../shared/wiki/wiki.types.ts";
import { EquipmentSearchFilters } from "./EquipmentSearchFilters";
import { SelectedEquipmentSummary } from "./EquipmentSearchResults";
import { EquivalentEquipmentSelector } from "./EquivalentEquipmentSelector";

type DiscoveryFiltersProps = {
  searchMode: GlamourSearchMode;
  query: string;
  activeQuery: string;
  raceId: number | null;
  genderId: number | null;
  selectedJobs: EquipmentClassJob[];
  searchLoading: boolean;
  canSubmitSearch: boolean;
  equipmentFilters: EquipmentSearchFilterValues;
  selectedEquipment: EquipmentSearchItem | null;
  equivalentEquipment: WikiModelItem[];
  selectedEquivalentEquipmentIds: number[];
  equivalentStatus: WikiLoadStatus;
  equivalentError: string | null;
  equivalentUpdating: boolean;
  onSearchModeChange: (mode: GlamourSearchMode) => void;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onEquipmentFiltersChange: (filters: EquipmentSearchFilterValues) => void;
  onClearEquipmentFilters: () => void;
  onRaceChange: (raceId: number | null) => void;
  onGenderChange: (genderId: number | null) => void;
  onToggleJob: (job: EquipmentClassJob) => void;
  onClearJobs: () => void;
  onToggleEquivalent: (equipmentId: number) => void;
  onSelectAllEquivalent: () => void;
  onClearEquivalent: () => void;
};

export function DiscoveryFilters({
  searchMode,
  query,
  activeQuery,
  raceId,
  genderId,
  selectedJobs,
  searchLoading,
  canSubmitSearch,
  equipmentFilters,
  selectedEquipment,
  equivalentEquipment,
  selectedEquivalentEquipmentIds,
  equivalentStatus,
  equivalentError,
  equivalentUpdating,
  onSearchModeChange,
  onQueryChange,
  onSearch,
  onClearSearch,
  onEquipmentFiltersChange,
  onClearEquipmentFilters,
  onRaceChange,
  onGenderChange,
  onToggleJob,
  onClearJobs,
  onToggleEquivalent,
  onSelectAllEquivalent,
  onClearEquivalent,
}: DiscoveryFiltersProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <section
      className={
        "discovery-panel relative m-0 rounded-[var(--ors-radius-control)] bg-surface p-[20px] mt-[24px] max-[700px]:mt-[20px] max-[700px]:p-[13px] [&&&&]:shadow-[none]"
      }
      aria-label="搜索和筛选"
    >
      <div
        className={
          "search-mode-switch flex items-center gap-[8px] [&_button]:inline-flex [&_button]:items-center [&_button]:gap-[8px] [&_button]:min-h-[32px] [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-muted [&_button]:font-bold [&_button:hover:not(.active)]:border-line [&_button:hover:not(.active)]:text-ink [&_button:hover:not(.active)]:bg-canvas [&&&&]:m-[0_4px_13px] [&&&&_button]:p-[0_12px] [&&&&_button]:[border:1px_solid_transparent] [&&&&_button]:[background:transparent] [&&&&_button]:text-[12px]"
        }
        role="group"
        aria-label="搜索方式"
      >
        <button
          className={
            searchMode === "title"
              ? "active [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected"
              : ""
          }
          type="button"
          aria-pressed={searchMode === "title"}
          onClick={() => onSearchModeChange("title")}
        >
          按标题
        </button>
        <button
          className={
            searchMode === "equipment"
              ? "active [.search-mode-switch_button&]:border-accent [.search-mode-switch_button&]:text-accent [.search-mode-switch_button&]:bg-selected"
              : ""
          }
          type="button"
          aria-pressed={searchMode === "equipment"}
          onClick={() => onSearchModeChange("equipment")}
        >
          按装备
        </button>
      </div>
      <form
        className={
          "search-box flex items-center gap-[2px] min-h-[56px] border border-solid border-line rounded-[var(--ors-radius-control)] bg-canvas [&:focus-within]:border-accent [&_>_svg]:w-[21px] [&_>_svg]:text-accent [&_input]:min-w-0 [&_input]:border-0 [&_input]:text-ink [&_input::-webkit-search-cancel-button]:hidden [&_input::placeholder]:text-muted [&_button]:grid [&_button]:place-items-center [&_button]:border-0 [&_button]:text-muted [&_kbd]:border [&_kbd]:border-solid [&_kbd]:border-line [&_kbd]:rounded-[var(--ors-radius-control)] [&_kbd]:text-muted [&_kbd]:bg-surface [&_kbd]:text-xs max-[700px]:[&_kbd]:hidden [&&&&]:p-[0_14px_0_18px] [&&&&]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&:focus-within]:shadow-[none] [&&&&_input]:flex-[1] [&&&&_input]:p-[0_14px] [&&&&_input]:[outline:0] [&&&&_input]:[background:transparent] [&&&&_input::placeholder]:opacity-[0.88] [&&&&_button]:[background:transparent] [&&&&_kbd]:flex-[0_0_auto] [&&&&_kbd]:m-[0_7px_0_4px] [&&&&_kbd]:p-[4px_8px] [@media(max-width:_700px)]:[&&&&]:p-[0_8px_0_14px] [@media(max-width:_700px)]:[&&&&_input]:p-[0_10px]"
        }
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <MagnifyingGlass weight="bold" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchMode === "title" ? "输入幻化标题" : "输入装备名称"}
          aria-label={searchMode === "title" ? "按标题搜索幻化" : "搜索装备"}
          maxLength={80}
        />
        {(query || activeQuery) && (
          <button
            className={
              "search-clear [.search-box_&]:w-[32px] [.search-box_&]:h-[32px] [.search-box_&:hover]:text-ink [.search-box_&:hover]:bg-hover [.search-box_&_svg]:w-[16px] [.search-box_&_svg]:h-[16px] [.search-box_&&&&]:flex-[0_0_auto] [.search-box_&&&&]:rounded-[50%]"
            }
            type="button"
            aria-label="清空搜索"
            onClick={onClearSearch}
          >
            <X />
          </button>
        )}
        <kbd aria-hidden="true">⌘/Ctrl K</kbd>
        <button
          className={
            "search-submit [.search-box_&]:inline-flex [.search-box_&]:items-center [.search-box_&]:min-h-[38px] [.search-box_&]:rounded-[var(--ors-radius-control)] [.search-box_&]:text-on-accent [.search-box_&]:bg-accent [.search-box_&]:font-bold [.search-box_&]:whitespace-nowrap [.search-box_&:disabled]:cursor-not-allowed [.search-box_&&&&]:flex-[0_0_auto] [.search-box_&&&&]:p-[0_18px] [.search-box_&&&&]:text-[12px] [.search-box_&&&&]:[transition:filter_160ms_ease,_transform_160ms_ease,_opacity_160ms_ease] [.search-box_&&&&:hover:not(:disabled)]:[filter:brightness(0.9)] [.search-box_&&&&:disabled]:opacity-[0.48] [@media(max-width:_700px)]:[.search-box_&&&&]:p-[0_14px]"
          }
          type="submit"
          disabled={searchLoading || !canSubmitSearch}
        >
          {searchLoading
            ? searchMode === "title"
              ? "搜索中"
              : "查找中"
            : searchMode === "title"
              ? "搜索"
              : "查找装备"}
        </button>
      </form>
      {searchMode === "equipment" && !selectedEquipment && (
        <EquipmentSearchFilters
          filters={equipmentFilters}
          onChange={onEquipmentFiltersChange}
          onClear={onClearEquipmentFilters}
        />
      )}
      {searchMode === "equipment" && selectedEquipment ? (
        <div className="selected-equipment-scope grid gap-[9px]">
          <SelectedEquipmentSummary item={selectedEquipment} />
          <EquivalentEquipmentSelector
            items={equivalentEquipment}
            selectedIds={selectedEquivalentEquipmentIds}
            status={equivalentStatus}
            error={equivalentError}
            updating={equivalentUpdating}
            onToggle={onToggleEquivalent}
            onSelectAll={onSelectAllEquivalent}
            onClear={onClearEquivalent}
          />
        </div>
      ) : searchMode === "equipment" ? (
        <p
          className={
            "equipment-search-hint text-muted [&&&&]:m-[12px_6px_0] [&&&&]:text-[12px] [&&&&]:leading-[1.55]"
          }
        >
          装备名称和筛选条件可单独使用，也可以自由组合。
        </p>
      ) : null}
      <div className="filter-row flex items-center gap-[18px] mt-[16px] max-[700px]:flex-wrap max-[700px]:items-center max-[700px]:gap-[9px]">
        <div className="filter-label flex items-center gap-[7px] pl-[5px] text-sm font-bold whitespace-nowrap [&_svg]:w-[18px] [&_svg]:text-accent max-[700px]:min-h-[36px] max-[700px]:pl-[4px]">
          <SlidersHorizontal />
          筛选
        </div>
        <FilterSelect
          label="种族"
          value={raceId}
          options={raceIdMap}
          onChange={onRaceChange}
        />
        <FilterSelect
          label="性别"
          value={genderId}
          options={genderIdMap}
          onChange={onGenderChange}
        />
        <JobFilter
          selectedJobs={selectedJobs}
          onToggle={onToggleJob}
          onClear={onClearJobs}
        />
      </div>
    </section>
  );
}

function JobFilter({
  selectedJobs,
  onToggle,
  onClear,
}: {
  selectedJobs: EquipmentClassJob[];
  onToggle: (job: EquipmentClassJob) => void;
  onClear: () => void;
}) {
  const selectedOptions = CLASS_JOB_OPTIONS.filter((option) =>
    selectedJobs.includes(option.value),
  );
  const selectionSummary = !selectedOptions.length
    ? "不限"
    : selectedOptions.length <= 2
      ? selectedOptions.map((option) => option.label).join("、")
      : `${selectedOptions
          .slice(0, 2)
          .map((option) => option.label)
          .join("、")}等${selectedOptions.length}个`;

  return (
    <details
      className={
        "job-filter relative [&_>_summary]:inline-flex [&_>_summary]:items-center [&_>_summary]:gap-[7px] [&_>_summary]:min-h-[36px] [&_>_summary]:max-w-[250px] [&_>_summary]:border [&_>_summary]:border-solid [&_>_summary]:border-line [&_>_summary]:rounded-[var(--ors-radius-control)] [&_>_summary]:text-muted [&_>_summary]:whitespace-nowrap [&_>_summary]:cursor-pointer [&_>_summary::-webkit-details-marker]:hidden [&_>_summary:hover]:border-accent [&_>_summary:hover]:text-accent [&_>_summary:hover]:bg-selected [&[open]_>_summary]:border-accent [&[open]_>_summary]:text-accent [&[open]_>_summary]:bg-selected [&_>_summary_strong]:overflow-hidden [&_>_summary_strong]:text-ink [&_>_summary_strong]:font-bold [&_>_summary_svg]:w-[11px] [&_>_summary_svg]:text-accent max-[980px]:static max-[700px]:static [&&&&_>_summary]:p-[0_12px] [&&&&_>_summary]:[background:transparent] [&&&&_>_summary]:text-[12px] [&&&&_>_summary]:[list-style:none] [&&&&_>_summary:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_>_summary:focus-visible]:[outline-offset:2px] [&&&&_>_summary_strong]:[text-overflow:ellipsis] [&&&&_>_summary_svg]:flex-[0_0_auto] [&&&&_>_summary_svg]:[transition:transform_160ms_ease] [&&&&[open]_>_summary_svg]:transform-[rotate(180deg)]"
      }
    >
      <summary
        className={
          selectedJobs.length
            ? "active [.job-filter_>_summary&]:border-accent [.job-filter_>_summary&]:text-accent [.job-filter_>_summary&]:bg-selected"
            : ""
        }
      >
        <span>职业</span>
        <strong>{selectionSummary}</strong>
        <CaretDown aria-hidden="true" />
      </summary>
      <div
        className={
          "job-filter-panel absolute overflow-y-auto p-[18px] border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface [&_>_header]:flex [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:gap-[16px] [&_>_header]:mb-[17px] [&_>_header_>_div]:grid [&_>_header_>_div]:gap-[3px] [&_>_header_strong]:text-ink [&_>_header_small]:text-muted [&_>_header_small]:text-xs [&_>_header_button]:min-h-[32px] [&_>_header_button]:border [&_>_header_button]:border-solid [&_>_header_button]:border-control [&_>_header_button]:rounded-[var(--ors-radius-control)] [&_>_header_button]:text-accent [&_>_header_button]:text-xs [&_>_header_button]:font-bold [&_>_header_button:hover:not(:disabled)]:border-accent [&_>_header_button:hover:not(:disabled)]:bg-selected [&_>_header_button:disabled]:cursor-not-allowed [&&&&]:z-[4] [&&&&]:top-[calc(100%_+_9px)] [&&&&]:left-[0] [&&&&]:w-[min(840px,_calc(100vw_-_44px))] [&&&&]:max-h-[min(520px,_68vh)] [&&&&]:shadow-[none] [&&&&_>_header_strong]:text-[14px] [&&&&_>_header_button]:p-[0_12px] [&&&&_>_header_button]:[background:transparent] [&&&&_>_header_button:disabled]:opacity-[0.4] [@media(max-width:_980px)]:[&&&&]:top-[calc(100%_-_4px)] [@media(max-width:_980px)]:[&&&&]:right-[22px] [@media(max-width:_980px)]:[&&&&]:left-[22px] [@media(max-width:_980px)]:[&&&&]:w-[auto] [@media(max-width:_700px)]:[&&&&]:top-[calc(100%_-_4px)] [@media(max-width:_700px)]:[&&&&]:right-[13px] [@media(max-width:_700px)]:[&&&&]:left-[13px] [@media(max-width:_700px)]:[&&&&]:w-[auto]"
        }
      >
        <header>
          <div>
            <strong>选择职业</strong>
            <small>可多选，全职业投稿会自动包含</small>
          </div>
          <button
            type="button"
            disabled={!selectedJobs.length}
            onClick={onClear}
          >
            清除
          </button>
        </header>
        <div
          className={
            "job-filter-groups grid [&_fieldset]:min-w-0 [&_fieldset]:m-0 [&_fieldset]:p-0 [&_fieldset]:border-0 [&_legend]:mb-[7px] [&_legend]:text-muted [&_legend]:text-xs [&_legend]:font-bold [&_fieldset_>_div]:grid [&_fieldset_>_div]:gap-[5px] [&_label]:flex [&_label]:items-center [&_label]:gap-[7px] [&_label]:min-w-0 [&_label]:min-h-[34px] [&_label]:rounded-[var(--ors-radius-control)] [&_label]:text-ink [&_label]:text-xs [&_label]:cursor-pointer [&_label:hover]:border-accent [&_label:hover]:bg-selected [&_input]:w-[14px] [&_input]:h-[14px] [&_input]:m-0 [&_label_>_span]:flex [&_label_>_span]:min-w-0 [&_label_>_span]:items-center [&_label_>_span]:gap-[6px] [&_label_>_span]:overflow-hidden [&_label_>_span]:whitespace-nowrap [&_label_img]:w-[20px] [&_label_img]:h-[20px] [&_label_img]:rounded-[var(--ors-radius-control)] [&_label_img]:object-contain [&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&&&]:gap-[18px_14px] [&&&&_fieldset_>_div]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&&&_label]:p-[0_8px] [&&&&_label]:[border:1px_solid_transparent] [&&&&_input]:flex-[0_0_auto] [&&&&_input]:[accent-color:var(--ors-color-accent)] [&&&&_label_>_span]:flex-[1] [&&&&_label_>_span]:[text-overflow:ellipsis] [&&&&_label_img]:flex-[0_0_auto] [@media(max-width:_840px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_700px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_620px)]:[&&&&]:grid-cols-[1fr]"
          }
        >
          {CLASS_JOB_GROUPS.map((group) => (
            <fieldset key={group.label}>
              <legend>{group.label}</legend>
              <div>
                {group.options.map((option) => (
                  <label
                    className={
                      selectedJobs.includes(option.value)
                        ? "selected [.job-filter-groups_label&]:border-accent [.job-filter-groups_label&]:bg-selected"
                        : ""
                    }
                    key={option.value}
                  >
                    <input
                      type="checkbox"
                      checked={selectedJobs.includes(option.value)}
                      onChange={() => onToggle(option.value)}
                    />
                    <span>
                      <img
                        src={getClassJobIconUrl(option.glamourId)}
                        alt=""
                        aria-hidden="true"
                      />
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
    </details>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number | null;
  options: Record<number, string>;
  onChange: (value: number | null) => void;
}) {
  return (
    <label
      className={
        "filter-select relative inline-flex items-center gap-[7px] min-h-[36px] border border-solid border-control rounded-[var(--ors-radius-control)] text-muted whitespace-nowrap [&:focus-within]:border-accent [&_select]:max-w-[110px] [&_select]:border-0 [&_select]:text-ink [&_select]:font-bold [&_select]:cursor-pointer [&_svg]:absolute [&_svg]:w-[11px] [&_svg]:text-accent [&&&&]:p-[0_12px] [&&&&]:text-[12px] [&&&&:focus-within]:shadow-[none] [&&&&_select]:p-[0_18px_0_2px] [&&&&_select]:[outline:0] [&&&&_select]:[appearance:none] [&&&&_select]:[background:transparent] [&&&&_select]:[font:inherit] [&&&&_svg]:right-[10px] [&&&&_svg]:[pointer-events:none]"
      }
    >
      {label}
      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : null)
        }
      >
        <option value="">不限</option>
        {Object.entries(options).map(([id, name]) => (
          <option value={id} key={id}>
            {name}
          </option>
        ))}
      </select>
      <CaretDown />
    </label>
  );
}
