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
} from "@/features/equipment/data/classJobs";
import { genderIdMap, raceIdMap } from "@/features/glamour/data/idsToName";
import type {
  EquipmentClassJob,
  EquipmentSearchFilters as EquipmentSearchFilterValues,
  EquipmentSearchItem,
} from "@/features/equipment/model/equipment";
import type { WikiModelItem } from "@/features/wiki/model/wiki";
import type { GlamourSearchMode } from "@/features/glamour/hooks/useGlamourDiscoveryViewModel";
import type { WikiLoadStatus } from "@/features/wiki/hooks/useWikiItemViewModel";
import { EquivalentEquipmentSelector } from "@/features/glamour/components/EquivalentEquipmentSelector";
import { EquipmentSearchFilters } from "@/features/equipment/components/EquipmentSearchFilters";
import { SelectedEquipmentSummary } from "@/features/equipment/components/EquipmentSearchPage";

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
    <section className="discovery-panel" aria-label="搜索和筛选">
      <div className="search-mode-switch" role="group" aria-label="搜索方式">
        <button
          className={searchMode === "title" ? "active" : ""}
          type="button"
          aria-pressed={searchMode === "title"}
          onClick={() => onSearchModeChange("title")}
        >
          按标题
        </button>
        <button
          className={searchMode === "equipment" ? "active" : ""}
          type="button"
          aria-pressed={searchMode === "equipment"}
          onClick={() => onSearchModeChange("equipment")}
        >
          按装备
        </button>
      </div>
      <form
        className="search-box"
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
            className="search-clear"
            type="button"
            aria-label="清空搜索"
            onClick={onClearSearch}
          >
            <X />
          </button>
        )}
        <kbd aria-hidden="true">⌘/Ctrl K</kbd>
        <button
          className="search-submit"
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
        <div className="selected-equipment-scope">
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
        <p className="equipment-search-hint">
          装备名称和筛选条件可单独使用，也可以自由组合。
        </p>
      ) : null}
      <div className="filter-row">
        <div className="filter-label">
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
    <details className="job-filter">
      <summary className={selectedJobs.length ? "active" : ""}>
        <span>职业</span>
        <strong>{selectionSummary}</strong>
        <CaretDown aria-hidden="true" />
      </summary>
      <div className="job-filter-panel">
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
        <div className="job-filter-groups">
          {CLASS_JOB_GROUPS.map((group) => (
            <fieldset key={group.label}>
              <legend>{group.label}</legend>
              <div>
                {group.options.map((option) => (
                  <label
                    className={
                      selectedJobs.includes(option.value) ? "selected" : ""
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
    <label className="filter-select">
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
