/** Public recruitment query controls and configuration-loading feedback. */
import {
  CaretDown,
  FadersHorizontal,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import type { RecruitState } from "../hooks/useRecruit";
import { buildRecruitDutyChoices } from "../utils/recruitDutyGroups";

export function RecruitFilters({ viewModel }: { viewModel: RecruitState }) {
  const dutyTypes = unique(
    (viewModel.config?.duties ?? []).map((duty) => duty.type),
  );
  const dutyOptions = buildRecruitDutyChoices(
    viewModel.config?.duties ?? [],
  ).filter(
    (duty) =>
      !viewModel.draftFilters.dutyType ||
      duty.type === viewModel.draftFilters.dutyType,
  );

  return (
    <section
      className="recruit-filter-panel"
      aria-labelledby="recruit-filter-title"
    >
      <header>
        <div>
          <FadersHorizontal weight="duotone" />
          <div>
            <h2 id="recruit-filter-title">筛选队伍</h2>
            <p>条件会同时作用于石之家的公开招募列表。</p>
          </div>
        </div>
        {viewModel.activeFilterCount > 0 && (
          <button
            className="recruit-filter-clear"
            type="button"
            onClick={viewModel.clearFilters}
          >
            <X weight="bold" />
            清除
          </button>
        )}
      </header>
      <form
        className="recruit-filter-form"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.applyFilters();
        }}
      >
        <label>
          <span>副本类型</span>
          <span className="recruit-select-control">
            <select
              value={viewModel.draftFilters.dutyType}
              onChange={(event) =>
                viewModel.setFilter("dutyType", event.target.value)
              }
            >
              <option value="">全部类型</option>
              {dutyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <CaretDown weight="bold" aria-hidden="true" />
          </span>
        </label>
        <label>
          <span>副本名称</span>
          <input
            type="search"
            list="recruit-duty-options"
            value={viewModel.draftFilters.dutyName}
            placeholder="输入或选择副本"
            onChange={(event) =>
              viewModel.setFilter("dutyName", event.target.value)
            }
          />
          <datalist id="recruit-duty-options">
            {dutyOptions.map((duty) => (
              <option key={`${duty.type}-${duty.label}`} value={duty.label} />
            ))}
          </datalist>
        </label>
        <label>
          <span>招募大区</span>
          <span className="recruit-select-control">
            <select
              value={viewModel.draftFilters.areaId}
              onChange={(event) =>
                viewModel.setFilter("areaId", event.target.value)
              }
            >
              <option value="">不限大区</option>
              {(viewModel.config?.areas ?? []).map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <CaretDown weight="bold" aria-hidden="true" />
          </span>
        </label>
        <button className="recruit-filter-submit" type="submit">
          <MagnifyingGlass weight="bold" />
          筛选
        </button>
      </form>
      {viewModel.configLoading && (
        <p className="recruit-config-note" role="status">
          正在读取副本与职业选项
        </p>
      )}
      {viewModel.configError && (
        <button
          className="recruit-config-note error"
          type="button"
          onClick={viewModel.retryConfig}
        >
          职业与副本选项加载失败，点击重试
        </button>
      )}
    </section>
  );
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
