/** Search and API-backed race and gender filters for glamour discovery. */
import {
  CaretDown,
  MagnifyingGlass,
  SlidersHorizontal,
  X,
} from "@phosphor-icons/react";
import { genderIdMap, raceIdMap } from "../models/idsToName";

type DiscoveryFiltersProps = {
  query: string;
  raceId: number;
  genderId: number;
  preview: boolean;
  onQueryChange: (query: string) => void;
  onRaceChange: (raceId: number) => void;
  onGenderChange: (genderId: number) => void;
};

export function DiscoveryFilters({
  query,
  raceId,
  genderId,
  preview,
  onQueryChange,
  onRaceChange,
  onGenderChange,
}: DiscoveryFiltersProps) {
  return (
    <section className="discovery-panel" aria-label="搜索和筛选">
      <div className="search-box">
        <MagnifyingGlass weight="bold" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索标题、作者、职业或色系"
          aria-label="搜索幻化"
        />
        {query && (
          <button
            type="button"
            aria-label="清空搜索"
            onClick={() => onQueryChange("")}
          >
            <X />
          </button>
        )}
        <kbd>⌘ K</kbd>
      </div>
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
        <span className="data-source">
          {preview ? "预览数据" : "石之家实时数据"}
        </span>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: Record<number, string>;
  onChange: (value: number) => void;
}) {
  return (
    <label className="filter-select">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
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
