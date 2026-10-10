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
      className={
        "recruit-filter-panel relative border border-solid border-line rounded-[var(--ors-radius-control)] p-[20px] bg-surface [&_>_header]:flex [&_>_header]:items-center [&_>_header_>_div]:flex [&_>_header_>_div]:items-center [&_>_header]:justify-between [&_>_header]:gap-[24px] [&_>_header]:mb-[20px] [&_>_header_>_div]:gap-[11px] [&_>_header_svg]:w-[24px] [&_>_header_svg]:h-[24px] [&_>_header_svg]:text-accent [&_h2]:m-0 [&_p]:m-0 [&_header_p]:mt-[3px] [&_header_p]:text-muted [&_header_p]:text-xs max-[760px]:[&_>_header]:items-start max-[460px]:p-[16px] [&&&&]:shadow-[none] [&&&&_h2]:text-[16px]"
      }
      aria-labelledby="recruit-filter-title"
    >
      <header>
        <div>
          <FadersHorizontal weight="duotone" />
          <div>
            <h2 className="text-lg font-semibold" id="recruit-filter-title">
              筛选队伍
            </h2>
            <p>条件会同时作用于石之家的公开招募列表。</p>
          </div>
        </div>
        {viewModel.activeFilterCount > 0 && (
          <button
            className={
              "recruit-filter-clear inline-flex justify-center items-center gap-[7px] whitespace-nowrap min-h-[35px] border border-solid border-line rounded-[var(--ors-radius-control)] text-muted text-xs [&_svg]:w-[15px] [&_svg]:h-[15px] [&&&&]:[transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] [&&&&]:p-[0_11px] [&&&&]:[background:transparent] [&&&&]:[font-weight:720]"
            }
            type="button"
            onClick={viewModel.clearFilters}
          >
            <X weight="bold" />
            清除
          </button>
        )}
      </header>
      <form
        className={
          "recruit-filter-form grid gap-[14px] [&_label]:grid [&_label]:gap-[7px] [&_label_>_span:first-child]:text-muted [&_label_>_span:first-child]:text-xs [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[43px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_select]:w-full [&_select]:min-w-0 [&_select]:min-h-[43px] [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[var(--ors-radius-control)] [&_select]:text-ink [&_select]:bg-canvas [&_select]:pr-[38px] [&_input:focus]:border-accent [&_select:focus]:border-accent [&_input::placeholder]:text-muted [&&&&]:grid-cols-[minmax(150px,_0.8fr)_minmax(240px,_1.5fr)_minmax(150px,_0.8fr)_auto] [&&&&]:[align-items:end] [&&&&_label_>_span:first-child]:[font-weight:720] [&&&&_input]:p-[0_12px] [&&&&_input]:[outline:0] [&&&&_input]:text-[12px] [&&&&_input]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&_select]:p-[0_12px] [&&&&_select]:[outline:0] [&&&&_select]:text-[12px] [&&&&_select]:[transition:border-color_160ms_ease,_box-shadow_160ms_ease] [&&&&_select]:[appearance:none] [&&&&_select]:[-webkit-appearance:none] [&&&&_input:focus]:shadow-[none] [&&&&_select:focus]:shadow-[none] [&&&&_input::placeholder]:opacity-[0.78] [@media(max-width:_1120px)]:[&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(max-width:_760px)]:[&&&&]:grid-cols-[1fr] [@media(max-width:_767px)]:[&&&&]:grid-cols-[1fr]"
        }
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.applyFilters();
        }}
      >
        <label>
          <span>副本类型</span>
          <span
            className={
              "recruit-select-control relative block min-w-0 [&_svg]:absolute [&_svg]:w-[15px] [&_svg]:h-[15px] [&_svg]:text-muted [&:hover_svg]:text-accent [&:focus-within_svg]:text-accent [&&&&_svg]:top-[50%] [&&&&_svg]:right-[13px] [&&&&_svg]:[pointer-events:none] [&&&&_svg]:transform-[translateY(-50%)] [&&&&_svg]:[transition:color_160ms_ease,_transform_160ms_ease] [&&&&:hover_select]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_62%,_var(--ors-color-line)_)] [&&&&:focus-within_svg]:transform-[translateY(-50%)_rotate(180deg)]"
            }
          >
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
          <span
            className={
              "recruit-select-control relative block min-w-0 [&_svg]:absolute [&_svg]:w-[15px] [&_svg]:h-[15px] [&_svg]:text-muted [&:hover_svg]:text-accent [&:focus-within_svg]:text-accent [&&&&_svg]:top-[50%] [&&&&_svg]:right-[13px] [&&&&_svg]:[pointer-events:none] [&&&&_svg]:transform-[translateY(-50%)] [&&&&_svg]:[transition:color_160ms_ease,_transform_160ms_ease] [&&&&:hover_select]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_62%,_var(--ors-color-line)_)] [&&&&:focus-within_svg]:transform-[translateY(-50%)_rotate(180deg)]"
            }
          >
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
        <button
          className={
            "recruit-filter-submit inline-flex justify-center items-center gap-[7px] whitespace-nowrap [&_svg]:w-[15px] [&_svg]:h-[15px] min-h-[43px] border border-solid border-accent rounded-[var(--ors-radius-control)] text-on-accent bg-accent [.theme-dark_&]:text-canvas [.theme-dark_&]:bg-accent-hover max-[1120px]:min-w-[104px] [&&&&]:[transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] [&&&&]:p-[0_18px] [&&&&]:text-[12px] [&&&&]:[font-weight:780] [@media(max-width:_1120px)]:[&&&&]:[grid-column:3] [@media(max-width:_1120px)]:[&&&&]:[justify-self:end] [@media(max-width:_760px)]:[&&&&]:[grid-column:auto] [@media(max-width:_760px)]:[&&&&]:[justify-self:stretch]"
          }
          type="submit"
        >
          <MagnifyingGlass weight="bold" />
          筛选
        </button>
      </form>
      {viewModel.configLoading && (
        <p
          className={
            "recruit-config-note inline-flex justify-center items-center gap-[7px] whitespace-nowrap p-0 border-0 text-muted text-xs [&&&&]:[transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] [&&&&]:m-[14px_0_0] [&&&&]:[background:transparent]"
          }
          role="status"
        >
          正在读取副本与职业选项
        </p>
      )}
      {viewModel.configError && (
        <button
          className={
            "recruit-config-note error inline-flex justify-center items-center gap-[7px] whitespace-nowrap p-0 border-0 text-muted text-xs [.advanced-results-state&_>_svg]:text-danger [.advanced-results-state&_strong]:text-danger [button.recruit-config-note&]:text-danger [.recruit-feed-status&]:justify-start [.recruit-feed-status&]:border [.recruit-feed-status&]:border-solid [.recruit-feed-status&]:border-danger [.recruit-feed-status&]:rounded-[var(--ors-radius-control)] [.recruit-feed-status&]:text-danger [.recruit-feed-status&]:bg-surface [.recruit-feed-status&]:text-left [.recruit-feed-status&_>_div]:grid [.recruit-feed-status&_>_div]:gap-[3px] [.recruit-feed-status&_span]:text-xs max-[460px]:[.recruit-feed-status&]:items-start max-[460px]:[.recruit-feed-status&]:flex-wrap max-[460px]:[.recruit-feed-status&_button]:w-full [.log-outcome&]:text-danger [&&&&]:[transition:transform_160ms_ease,_border-color_160ms_ease,_background-color_160ms_ease] [&&&&]:m-[14px_0_0] [&&&&]:[background:transparent] [button.recruit-config-note&&&&]:[text-decoration:underline] [button.recruit-config-note&&&&]:[text-underline-offset:3px] [.recruit-feed-status&&&&_>_div]:flex-[1]"
          }
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
