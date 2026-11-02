/** Search and API-backed race and gender filters for glamour discovery. */
import clsx from "clsx";
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

/** Each mode owns its state, with no competing border shorthand or parent overrides. */
const discoveryModeClasses =
  "inline-flex min-h-8 items-center gap-2 rounded-control border border-transparent bg-transparent px-3 py-0 text-[12px] font-bold text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover aria-pressed:border-accent aria-pressed:bg-selected aria-pressed:text-accent";

/** Reused presentation strings stay static and are allocated once for this module. */

const discoverySelectedClasses = "active border-accent bg-selected text-accent";

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
      className="discovery-panel relative m-0 mt-6 rounded-control bg-surface p-5 shadow-[none] max-[700px]:mt-5 max-[700px]:p-[13px]"
      aria-label="搜索和筛选"
    >
      <div
        className="search-mode-switch mx-1 mt-0 mb-[13px] flex items-center gap-2"
        role="group"
        aria-label="搜索方式"
      >
        <button
          className={discoveryModeClasses}
          type="button"
          aria-pressed={searchMode === "title"}
          onClick={() => onSearchModeChange("title")}
        >
          按标题
        </button>
        <button
          className={discoveryModeClasses}
          type="button"
          aria-pressed={searchMode === "equipment"}
          onClick={() => onSearchModeChange("equipment")}
        >
          按装备
        </button>
      </div>
      <form
        className="search-box flex min-h-14 items-center gap-0.5 rounded-control border border-solid border-line bg-canvas py-0 pr-3.5 pl-4.5 [transition:border-color_160ms_ease,_box-shadow_160ms_ease] focus-within:border-accent focus-within:shadow-[none] max-[700px]:py-0 max-[700px]:pr-2 max-[700px]:pl-3.5"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <MagnifyingGlass className="w-[21px] text-accent" weight="bold" />
        <input
          className="min-h-9 min-w-0 flex-1 border-0 bg-transparent px-3.5 py-0 text-ink outline-none placeholder:text-muted placeholder:opacity-88 max-[700px]:px-2.5 max-[700px]:py-0 pointer-coarse:min-h-11 [&::-webkit-search-cancel-button]:hidden"
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
            className="search-clear grid h-8 min-h-9 w-8 shrink-0 place-items-center rounded-[50%] border-0 bg-transparent text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover hover:text-ink pointer-coarse:min-h-11"
            type="button"
            aria-label="清空搜索"
            onClick={onClearSearch}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd
          className="my-0 mr-[7px] ml-1 shrink-0 rounded-control border border-solid border-line bg-surface px-2 py-1 text-xs text-muted max-[700px]:hidden"
          aria-hidden="true"
        >
          ⌘/Ctrl K
        </kbd>
        <button
          className="search-submit grid min-h-9.5 shrink-0 place-items-center items-center rounded-control border-0 bg-transparent px-4.5 py-0 text-[12px] font-bold whitespace-nowrap text-muted [transition:filter_160ms_ease,_transform_160ms_ease,_opacity_160ms_ease] enabled:hover:[filter:brightness(0.9)] disabled:cursor-not-allowed disabled:opacity-48 max-[700px]:px-3.5 max-[700px]:py-0"
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
        <p className="equipment-search-hint mx-1.5 mt-3 mb-0 text-[12px] leading-[1.55] text-muted">
          装备名称和筛选条件可单独使用，也可以自由组合。
        </p>
      ) : null}
      <div className="filter-row mt-4 flex items-center gap-4.5 max-[700px]:flex-wrap max-[700px]:items-center max-[700px]:gap-[9px]">
        <div className="filter-label flex items-center gap-[7px] pl-[5px] text-sm font-bold whitespace-nowrap max-[700px]:min-h-9 max-[700px]:pl-1">
          <SlidersHorizontal className="w-4.5 text-accent" />
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
    <details className="job-filter group/job-filter relative max-[980px]:static max-[700px]:static">
      <summary
        className={clsx(
          "inline-flex min-h-9 max-w-62.5 cursor-pointer list-none items-center gap-[7px] rounded-control border border-solid border-line bg-transparent px-3 py-0 text-[12px] whitespace-nowrap text-muted group-open/job-filter:border-accent group-open/job-filter:bg-selected group-open/job-filter:text-accent hover:border-accent hover:bg-selected hover:text-accent focus-visible:[outline:2px_solid_var(--ors-color-accent)] focus-visible:[outline-offset:2px] [&::-webkit-details-marker]:hidden",
          selectedJobs.length ? discoverySelectedClasses : "",
        )}
      >
        <span>职业</span>
        <strong className="overflow-hidden font-bold text-ellipsis text-ink">
          {selectionSummary}
        </strong>
        <CaretDown
          className="w-[11px] shrink-0 text-accent [transition:transform_160ms_ease] group-open/job-filter:transform-[rotate(180deg)]"
          aria-hidden="true"
        />
      </summary>
      <div className="job-filter-panel absolute top-[calc(100%_+_9px)] left-0 z-4 max-h-[min(520px,_68vh)] w-[min(840px,_calc(100vw_-_44px))] overflow-y-auto rounded-control border border-solid border-line bg-surface p-4.5 shadow-[none] max-[980px]:top-[calc(100%_-_4px)] max-[980px]:right-5.5 max-[980px]:left-5.5 max-[980px]:w-auto max-[700px]:top-[calc(100%_-_4px)] max-[700px]:right-[13px] max-[700px]:left-[13px] max-[700px]:w-auto">
        <header className="mb-[17px] flex items-center justify-between gap-4">
          <div className="grid gap-[3px]">
            <strong className="text-[14px] text-ink">选择职业</strong>
            <small className="text-xs text-muted">
              可多选，全职业投稿会自动包含
            </small>
          </div>
          <button
            className="min-h-8 rounded-control border border-solid border-control bg-transparent px-3 py-0 text-xs font-bold text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:border-accent enabled:hover:bg-selected disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={!selectedJobs.length}
            onClick={onClear}
          >
            清除
          </button>
        </header>
        <div className="job-filter-groups grid grid-cols-3 gap-[18px_14px] max-[840px]:grid-cols-2 max-[700px]:grid-cols-2 max-[620px]:grid-cols-[1fr]">
          {CLASS_JOB_GROUPS.map((group) => (
            <fieldset className="m-0 min-w-0 border-0 p-0" key={group.label}>
              <legend className="mb-[7px] text-xs font-bold text-muted">
                {group.label}
              </legend>
              <div className="grid grid-cols-2 gap-[5px]">
                {group.options.map((option) => (
                  <label
                    className={clsx(
                      "flex min-h-8.5 min-w-0 cursor-pointer items-center gap-[7px] rounded-control px-2 py-0 text-xs text-ink [border:1px_solid_transparent] hover:border-accent hover:bg-selected",
                      selectedJobs.includes(option.value)
                        ? "selected border-accent bg-selected"
                        : "",
                    )}
                    key={option.value}
                  >
                    <input
                      className="m-0 h-3.5 w-3.5 shrink-0 [accent-color:var(--ors-color-accent)]"
                      type="checkbox"
                      checked={selectedJobs.includes(option.value)}
                      onChange={() => onToggle(option.value)}
                    />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                      <img
                        className="h-5 w-5 shrink-0 rounded-control object-contain"
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
    <label className="filter-select relative inline-flex min-h-9 items-center gap-[7px] rounded-control border border-solid border-control px-3 py-0 text-[12px] whitespace-nowrap text-muted focus-within:border-accent focus-within:shadow-[none]">
      {label}
      <select
        className="min-h-9 max-w-27.5 cursor-pointer [appearance:none] border-0 bg-transparent py-0 pr-4.5 pl-0.5 font-bold text-ink outline-none [font:inherit] pointer-coarse:min-h-11"
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
      <CaretDown className="[pointer-events:none] absolute right-2.5 w-[11px] text-accent" />
    </label>
  );
}
