/** Standalone, cursor-paginated equipment picker for glamour search. */
import clsx from "clsx";
import {
  ArrowLeft,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CoatHanger,
  MagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  EQUIPMENT_PAGE_SIZES,
  type EquipmentPageSize,
  type EquipmentSearchFilters,
  type EquipmentSearchItem,
} from "../equipment.types";
import { getEquipmentSearchFilterLabels } from "../utils/equipmentFilterPresentation";

/** Reused presentation strings stay static and are allocated once for this module. */
const equipmentStatusHeadingClasses =
  "mx-0 mt-4 mb-[7px] text-lg font-semibold text-ink";
const equipmentStatusActionClasses =
  "mt-5.5 inline-flex min-h-10 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-surface px-[15px] py-0 text-[12px] font-bold whitespace-nowrap text-ink [transition:border-color_160ms_ease,_color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] hover:border-accent hover:bg-selected hover:text-accent";
const equipmentPaginationActionClasses =
  "inline-flex min-h-10 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-surface px-[15px] py-0 text-[12px] font-bold whitespace-nowrap text-ink [transition:border-color_160ms_ease,_color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] first:justify-self-start last:justify-self-end enabled:hover:border-accent enabled:hover:bg-selected enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 max-[700px]:min-h-9.5 max-[700px]:px-3 max-[700px]:py-0";

type EquipmentSearchPageProps = {
  query: string;
  filters: EquipmentSearchFilters;
  items: EquipmentSearchItem[];
  page: number;
  pageSize: EquipmentPageSize;
  loading: boolean;
  error: string | null;
  canShowPrevious: boolean;
  canShowNext: boolean;
  onBack: () => void;
  onSelect: (item: EquipmentSearchItem) => void;
  onShowPrevious: () => void;
  onShowNext: () => void;
  onRetry: () => void;
  onPageSizeChange: (size: EquipmentPageSize) => void;
};
export function EquipmentSearchResults({
  query,
  filters,
  items,
  page,
  pageSize,
  loading,
  error,
  canShowPrevious,
  canShowNext,
  onBack,
  onSelect,
  onShowPrevious,
  onShowNext,
  onRetry,
  onPageSizeChange,
}: EquipmentSearchPageProps) {
  const filterLabels = getEquipmentSearchFilterLabels(filters);
  return (
    <main
      className="equipment-results-page mx-auto min-h-[calc(100dvh_-_56px)] w-full max-w-400 px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[700px]:min-h-[calc(100dvh_-_48px)] max-[519px]:px-3 max-[519px]:py-4"
      id="top"
    >
      <section
        className="equipment-results-shell min-w-0"
        aria-labelledby="equipment-results-heading"
      >
        <header className="equipment-page-header grid grid-cols-[auto_minmax(0,_1fr)_auto] items-start gap-5 border-b border-solid border-line pb-5 max-[700px]:grid-cols-[1fr_auto] max-[700px]:gap-[18px_12px]">
          <button
            className="equipment-page-back inline-flex min-h-10 items-center justify-center gap-[7px] justify-self-start rounded-control border border-solid border-control bg-surface px-[15px] py-0 text-[12px] font-bold whitespace-nowrap text-ink [transition:border-color_160ms_ease,_color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] hover:border-accent hover:bg-selected hover:text-accent"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft className="h-[15px] w-[15px]" />
            返回搜索
          </button>
          <div className="max-[700px]:col-span-full max-[700px]:row-start-2">
            <h1
              className="mx-0 mt-0 mb-2 [font-family:var(--ors-font-heading)] text-2xl font-semibold tracking-normal"
              id="equipment-results-heading"
            >
              选择装备
            </h1>
            <p className="m-0 text-sm leading-[1.65] text-muted">
              {query ? `“${query}”的搜索结果。` : "符合筛选条件的装备。"}
              选择一件装备后查看相关幻化投稿。
            </p>
          </div>
          <span className="text-[12px] font-bold whitespace-nowrap text-muted">
            第 {page} 页
          </span>
        </header>

        {/* Sparse result pages keep their pagination near the last actual row. */}
        <div className="equipment-page-content pt-5">
          {filterLabels.length > 0 && (
            <div
              className="equipment-active-filters mb-5 flex items-start gap-3 max-[700px]:flex-col max-[700px]:gap-[3px]"
              aria-label="已应用筛选"
            >
              <strong className="min-h-7.5 shrink-0 pt-[7px] text-xs text-muted">
                已应用筛选
              </strong>
              <ul className="m-0 flex list-none flex-wrap gap-[7px] p-0">
                {filterLabels.map((label) => (
                  <li
                    className="min-h-7.5 rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-selected)_52%,_var(--ors-color-surface)_)] px-[11px] pt-[7px] pb-0 text-xs font-bold text-accent [border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_56%,_var(--ors-color-line))]"
                    key={label}
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loading ? (
            <EquipmentSearchSkeleton />
          ) : error ? (
            <div
              className="equipment-page-state equipment-page-error grid min-h-90 content-center justify-items-center rounded-control bg-[color-mix(_in_srgb,_var(--ors-color-selected)_52%,_var(--ors-color-surface)_)] px-5 py-12 text-center text-muted"
              role="alert"
            >
              <WarningCircle className="h-8 w-8 text-accent" />
              <h2 className={equipmentStatusHeadingClasses}>无法读取这一页</h2>
              <p className="m-0 text-sm">{error}</p>
              <button
                className={equipmentStatusActionClasses}
                type="button"
                onClick={onRetry}
              >
                重新加载
              </button>
            </div>
          ) : items.length ? (
            <>
              <div className="equipment-page-summary mb-[13px] flex items-center justify-between">
                <strong className="text-[14px]">装备结果</strong>
                <div className="flex items-center gap-4 max-[700px]:gap-[9px]">
                  <span className="text-xs text-muted">
                    本页 {items.length} 件
                  </span>
                  <label className="equipment-page-size relative inline-flex min-h-8.5 items-center gap-[7px] rounded-control border border-solid border-line bg-surface px-[11px] py-0 text-xs whitespace-nowrap text-muted focus-within:border-accent focus-within:shadow-[none]">
                    每页
                    <select
                      className="min-h-8 cursor-pointer [appearance:none] border-0 bg-transparent py-0 pr-[15px] pl-0 font-bold text-ink outline-none [font:inherit]"
                      value={pageSize}
                      aria-label="每页显示数量"
                      onChange={(event) =>
                        onPageSizeChange(
                          Number(event.target.value) as EquipmentPageSize,
                        )
                      }
                    >
                      {EQUIPMENT_PAGE_SIZES.map((size) => (
                        <option value={size} key={size}>
                          {size} 件
                        </option>
                      ))}
                    </select>
                    <CaretDown className="[pointer-events:none] absolute right-[9px] h-2.5 w-2.5 text-accent" />
                  </label>
                </div>
              </div>
              <div
                className="equipment-page-grid grid grid-cols-4 gap-3 max-[980px]:grid-cols-3 max-[700px]:grid-cols-2"
                role="group"
                aria-label="装备搜索结果"
              >
                {items.map((item) => (
                  <button
                    className="equipment-card grid min-h-20 min-w-0 grid-cols-[58px_minmax(0,_1fr)] items-center gap-[11px] rounded-control border border-solid border-line bg-canvas p-2.5 text-left text-ink [transition:border-color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] hover:border-accent hover:bg-[color-mix(_in_srgb,_var(--ors-color-selected)_55%,_var(--ors-color-canvas)_)] max-[700px]:min-h-17.5 max-[700px]:grid-cols-[48px_minmax(0,_1fr)] max-[700px]:gap-2 max-[700px]:p-2"
                    type="button"
                    key={item.id}
                    onClick={() => onSelect(item)}
                  >
                    <EquipmentArtwork item={item} layout="card" />
                    <span className="last:grid last:min-w-0">
                      <strong className="[display:-webkit-box] overflow-hidden text-[12px] leading-[1.4] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] max-[700px]:text-xs">
                        {item.name}
                      </strong>
                      <small className="mt-1 overflow-hidden text-xs text-ellipsis whitespace-nowrap text-muted">
                        {formatEquipmentMetadata(item)}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div
              className="equipment-page-state grid min-h-90 content-center justify-items-center rounded-control bg-surface px-5 py-12 text-center text-muted"
              role="status"
            >
              <MagnifyingGlass className="h-8 w-8 text-accent" />
              <h2 className={equipmentStatusHeadingClasses}>
                没有找到可装备物品
              </h2>
              <p className="m-0 text-sm">返回后修改装备名称。</p>
              <button
                className={equipmentStatusActionClasses}
                type="button"
                onClick={onBack}
              >
                修改搜索
              </button>
            </div>
          )}
        </div>

        <nav
          className="equipment-pagination mt-6 grid grid-cols-[1fr_auto_1fr] items-center border-t border-solid border-line pt-4"
          aria-label="装备搜索分页"
        >
          <button
            className={equipmentPaginationActionClasses}
            type="button"
            disabled={!canShowPrevious || loading}
            onClick={onShowPrevious}
          >
            <CaretLeft className="h-[15px] w-[15px]" />
            上一页
          </button>
          <span
            className="text-[12px] font-bold text-muted"
            aria-current="page"
          >
            第 {page} 页
          </span>
          <button
            className={equipmentPaginationActionClasses}
            type="button"
            disabled={!canShowNext || loading}
            onClick={onShowNext}
          >
            下一页
            <CaretRight className="h-[15px] w-[15px]" />
          </button>
        </nav>
      </section>
    </main>
  );
}
function formatEquipmentMetadata(item: EquipmentSearchItem) {
  return [
    item.category,
    item.levelEquip === undefined ? null : `Lv.${item.levelEquip}`,
    item.levelItem === undefined ? null : `品级 ${item.levelItem}`,
  ]
    .filter((value): value is string => value !== null)
    .join(" / ");
}
export function SelectedEquipmentSummary({
  item,
}: {
  item: EquipmentSearchItem;
}) {
  return (
    <div
      className="selected-equipment mt-3.5 flex items-center gap-[13px] rounded-control border border-solid border-accent bg-[color-mix(_in_srgb,_var(--ors-color-selected)_55%,_var(--ors-color-canvas)_)] px-[13px] py-[11px]"
      aria-live="polite"
    >
      <EquipmentArtwork item={item} layout="selected-equipment" />
      <span className="last:grid last:min-w-0 last:gap-0.5">
        <small className="inline-flex items-center gap-[5px] text-xs font-bold text-accent">
          <Check className="h-3 w-3" weight="bold" />
          已选择装备
        </small>
        <strong className="text-sm">{item.name}</strong>
        <span className="text-xs text-muted">
          {item.category} · ID {item.id}
        </span>
      </span>
    </div>
  );
}
function EquipmentArtwork({
  item,
  layout,
}: {
  item: EquipmentSearchItem;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "card" | "selected-equipment";
}) {
  return (
    <span
      className={clsx(
        "equipment-artwork relative grid h-14.5 w-14.5 place-items-center overflow-hidden rounded-control border border-solid border-line bg-hover text-muted max-[700px]:h-12 max-[700px]:w-12 max-[700px]:rounded-control",
        layout === "card" && "last:grid last:min-w-0",
        layout === "selected-equipment" &&
          "last:grid last:min-w-0 last:gap-0.5",
      )}
      aria-hidden="true"
    >
      <CoatHanger className="h-6 w-6" />
      {item.icon && (
        <img
          className="absolute inset-0 block h-full w-full object-contain"
          src={item.icon}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}
function EquipmentSearchSkeleton() {
  return (
    <div
      className="equipment-page-grid equipment-card-skeletons grid grid-cols-4 gap-3 pt-0.5 max-[980px]:grid-cols-3 max-[700px]:grid-cols-2"
      aria-label="正在搜索装备"
    >
      {Array.from(
        {
          length: 12,
        },
        (_, index) => (
          <span
            className="equipment-card equipment-card-skeleton grid min-h-20 min-w-0 grid-cols-[52px_1fr] items-center gap-[11px] rounded-control border border-solid border-line bg-canvas p-2.5 text-left text-ink [transition:border-color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] max-[700px]:min-h-17.5 max-[700px]:grid-cols-[48px_minmax(0,_1fr)] max-[700px]:gap-2 max-[700px]:p-2"
            key={index}
          >
            <span className="block h-13 w-13 animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%] last:grid last:min-w-0" />
            <small className="mt-1 block h-3 w-[78%] animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] overflow-hidden rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [background-size:240%_100%] text-xs text-ellipsis whitespace-nowrap text-muted" />
          </span>
        ),
      )}
    </div>
  );
}
