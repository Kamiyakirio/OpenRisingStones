import {
  CaretDown,
  FadersHorizontal,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import type { RecruitState } from "../hooks/useRecruit";
import { buildRecruitDutyChoices } from "../utils/recruitDutyGroups";

/** Reused presentation strings stay static and are allocated once for this module. */
const recruitSelectWrapperClasses =
  "recruit-select-control group/recruit-select-control relative block min-w-0 first:text-xs first:font-[720] first:text-muted";
const recruitSelectClasses =
  "min-h-[43px] w-full min-w-0 [appearance:none] rounded-control border border-solid border-control bg-canvas px-3 py-0 text-[12px] text-ink outline-none [-webkit-appearance:none] [transition:border-color_160ms_ease,_box-shadow_160ms_ease] group-hover/recruit-select-control:border-[color-mix(_in_srgb,_var(--ors-color-accent)_62%,_var(--ors-color-line)_)] focus:border-accent focus:shadow-[none]";
const recruitSelectChevronClasses =
  "[pointer-events:none] absolute top-1/2 right-[13px] h-[15px] w-[15px] transform-[translateY(-50%)] text-muted [transition:color_160ms_ease,_transform_160ms_ease] group-focus-within/recruit-select-control:transform-[translateY(-50%)_rotate(180deg)] group-focus-within/recruit-select-control:text-accent group-hover/recruit-select-control:text-accent";

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
      className="recruit-filter-panel relative rounded-control border border-solid border-line bg-surface p-5 shadow-[none] max-[460px]:p-4"
      aria-labelledby="recruit-filter-title"
    >
      <header className="mb-5 flex items-center justify-between gap-6 max-[760px]:items-start">
        <div className="flex items-center gap-[11px]">
          <FadersHorizontal className="h-6 w-6 text-accent" weight="duotone" />
          <div>
            <h2
              className="m-0 text-lg text-[16px] font-semibold"
              id="recruit-filter-title"
            >
              筛选队伍
            </h2>
            <p className="m-0 mt-[3px] text-xs text-muted">
              条件会同时作用于石之家的公开招募列表。
            </p>
          </div>
        </div>
        {viewModel.activeFilterCount > 0 && (
          <button
            className="recruit-filter-clear inline-flex min-h-[35px] items-center justify-center gap-[7px] rounded-control border border-solid border-line bg-transparent px-[11px] py-0 text-xs font-[720] whitespace-nowrap text-muted [transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease]"
            type="button"
            onClick={viewModel.clearFilters}
          >
            <X className="h-[15px] w-[15px] text-accent" weight="bold" />
            清除
          </button>
        )}
      </header>
      <form
        className="recruit-filter-form grid grid-cols-[minmax(150px,_0.8fr)_minmax(240px,_1.5fr)_minmax(150px,_0.8fr)_auto] items-end gap-3.5 max-[1120px]:grid-cols-3 max-[767px]:grid-cols-[1fr] max-[760px]:grid-cols-[1fr]"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.applyFilters();
        }}
      >
        <label className="grid gap-[7px]">
          <span className="first:text-xs first:font-[720] first:text-muted">
            副本类型
          </span>
          <span className={recruitSelectWrapperClasses}>
            <select
              className={recruitSelectClasses}
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
            <CaretDown
              className={recruitSelectChevronClasses}
              weight="bold"
              aria-hidden="true"
            />
          </span>
        </label>
        <label className="grid gap-[7px]">
          <span className="first:text-xs first:font-[720] first:text-muted">
            副本名称
          </span>
          <input
            className="min-h-[43px] w-full min-w-0 rounded-control border border-solid border-control bg-canvas px-3 py-0 text-[12px] text-ink outline-none [transition:border-color_160ms_ease,_box-shadow_160ms_ease] placeholder:text-muted placeholder:opacity-78 focus:border-accent focus:shadow-[none]"
            type="search"
            list="recruit-duty-options"
            value={viewModel.draftFilters.dutyName}
            placeholder="输入或选择副本"
            onChange={(event) =>
              viewModel.setFilter("dutyName", event.target.value)
            }
          />
          <datalist id="recruit-duty-options">
            {[...dutyOptions].reverse().map((duty) => (
              <option key={`${duty.type}-${duty.label}`} value={duty.label} />
            ))}
          </datalist>
        </label>
        <label className="grid gap-[7px]">
          <span className="first:text-xs first:font-[720] first:text-muted">
            招募大区
          </span>
          <span className={recruitSelectWrapperClasses}>
            <select
              className={recruitSelectClasses}
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
            <CaretDown
              className={recruitSelectChevronClasses}
              weight="bold"
              aria-hidden="true"
            />
          </span>
        </label>
        <button
          className="recruit-filter-submit inline-flex min-h-[43px] items-center justify-center gap-[7px] rounded-control border border-solid border-accent bg-accent px-4.5 py-0 text-[12px] font-[780] whitespace-nowrap text-on-accent [transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] max-[1120px]:col-start-3 max-[1120px]:min-w-26 max-[1120px]:justify-self-end max-[760px]:col-auto max-[760px]:justify-self-stretch dark:bg-accent-hover dark:text-canvas"
          type="submit"
        >
          <MagnifyingGlass className="h-[15px] w-[15px]" weight="bold" />
          筛选
        </button>
      </form>
      {viewModel.configLoading && (
        <p
          className="recruit-config-note mx-0 mt-3.5 mb-0 inline-flex items-center justify-center gap-[7px] border-0 bg-transparent p-0 text-xs whitespace-nowrap text-muted [transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease]"
          role="status"
        >
          正在读取副本与职业选项
        </p>
      )}
      {viewModel.configError && (
        <button
          className="recruit-config-note error mx-0 mt-3.5 mb-0 inline-flex min-h-9 items-center justify-center gap-[7px] border-0 bg-transparent p-0 text-xs whitespace-nowrap text-danger underline [text-underline-offset:3px] [transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] pointer-coarse:min-h-11"
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
