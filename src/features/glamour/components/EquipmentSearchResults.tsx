/** Standalone, cursor-paginated equipment picker for glamour search. */
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
      className={
        "mx-auto w-full max-w-[1600px] px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 equipment-results-page max-[700px]:pt-[28px] [&&&&]:min-h-[calc(100dvh_-_74px)] [&&&&]:[padding-top:clamp(38px,_6vw,_76px)] [@media(max-width:_700px)]:[&&&&]:min-h-[calc(100dvh_-_66px)]"
      }
      id="top"
    >
      <section
        className="equipment-results-shell min-h-[620px] max-[700px]:min-h-0"
        aria-labelledby="equipment-results-heading"
      >
        <header
          className={
            "equipment-page-header grid gap-[28px] pb-[28px] border-b border-solid border-line [&_h1]:text-2xl [&_h1]:font-semibold [&_p]:m-0 [&_p]:text-muted [&_p]:text-sm [&_>_span]:text-muted [&_>_span]:font-bold [&_>_span]:whitespace-nowrap max-[700px]:pb-[22px] max-[700px]:[&_h1]:mt-0 max-[700px]:[&_h1]:text-2xl [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&]:[align-items:start] [&&&&_h1]:m-[-7px_0_8px] [&&&&_h1]:[font-family:var(--ors-font-heading)] [&&&&_h1]:[letter-spacing:normal] [&&&&_p]:leading-[1.65] [&&&&_>_span]:text-[12px] [@media(max-width:_700px)]:[&&&&]:grid-cols-[1fr_auto] [@media(max-width:_700px)]:[&&&&]:gap-[18px_12px] [@media(max-width:_700px)]:[&&&&_>_div]:[grid-column:1_/_-1] [@media(max-width:_700px)]:[&&&&_>_div]:[grid-row:2]"
          }
        >
          <button
            className={
              "equipment-page-back inline-flex justify-center items-center gap-[7px] min-h-[40px] border border-solid border-control rounded-[var(--ors-radius-control)] text-ink bg-surface font-bold whitespace-nowrap [&:hover]:border-accent [&:hover]:text-accent [&:hover]:bg-selected [&_svg]:w-[15px] [&_svg]:h-[15px] [&&&&]:p-[0_15px] [&&&&]:text-[12px] [&&&&]:[transition:border-color_160ms_ease,_color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] [&&&&]:[justify-self:start]"
            }
            type="button"
            onClick={onBack}
          >
            <ArrowLeft />
            返回搜索
          </button>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              id="equipment-results-heading"
            >
              选择装备
            </h1>
            <p>
              {query ? `“${query}”的搜索结果。` : "符合筛选条件的装备。"}
              选择一件装备后查看相关幻化投稿。
            </p>
          </div>
          <span>第 {page} 页</span>
        </header>

        <div className="equipment-page-content min-h-[410px] pt-[28px] max-[700px]:min-h-[360px] max-[700px]:pt-[22px]">
          {filterLabels.length > 0 && (
            <div
              className={
                "equipment-active-filters flex items-start gap-[12px] mb-[20px] [&_>_strong]:min-h-[30px] [&_>_strong]:pt-[7px] [&_>_strong]:text-muted [&_>_strong]:text-xs [&_ul]:flex [&_ul]:flex-wrap [&_ul]:gap-[7px] [&_ul]:m-0 [&_ul]:p-0 [&_li]:min-h-[30px] [&_li]:rounded-[var(--ors-radius-control)] [&_li]:text-accent [&_li]:text-xs [&_li]:font-bold max-[700px]:flex-col max-[700px]:gap-[3px] [&&&&_>_strong]:flex-[0_0_auto] [&&&&_ul]:[list-style:none] [&&&&_li]:p-[7px_11px_0] [&&&&_li]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-accent)_56%,_var(--ors-color-line))] [&&&&_li]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_52%,_var(--ors-color-surface)_)]"
              }
              aria-label="已应用筛选"
            >
              <strong>已应用筛选</strong>
              <ul>
                {filterLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          )}
          {loading ? (
            <EquipmentSearchSkeleton />
          ) : error ? (
            <div
              className={
                "equipment-page-state equipment-page-error [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[7px] [&_button]:min-h-[40px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:font-bold [&_button]:whitespace-nowrap [&_button:hover]:border-accent [&_button:hover]:text-accent [&_button:hover]:bg-selected grid min-h-[360px] rounded-[var(--ors-radius-control)] text-muted bg-surface text-center [&_>_svg]:w-[32px] [&_>_svg]:h-[32px] [&_>_svg]:text-accent [&_h2]:text-ink [&_h2]:text-lg [&_p]:m-0 [&_p]:text-sm [&_button]:mt-[22px] [&&&&_button]:p-[0_15px] [&&&&_button]:text-[12px] [&&&&_button]:[transition:border-color_160ms_ease,_color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] [&&&&]:[justify-items:center] [&&&&]:[align-content:center] [&&&&]:p-[48px_20px] [&&&&_h2]:m-[16px_0_7px] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_52%,_var(--ors-color-surface)_)]"
              }
              role="alert"
            >
              <WarningCircle />
              <h2 className="text-lg font-semibold">无法读取这一页</h2>
              <p>{error}</p>
              <button type="button" onClick={onRetry}>
                重新加载
              </button>
            </div>
          ) : items.length ? (
            <>
              <div
                className={
                  "equipment-page-summary flex justify-between items-center mb-[13px] [&_span]:text-muted [&_span]:text-xs [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[16px] max-[700px]:[&_>_div]:gap-[9px] [&&&&_strong]:text-[14px]"
                }
              >
                <strong>装备结果</strong>
                <div>
                  <span>本页 {items.length} 件</span>
                  <label
                    className={
                      "equipment-page-size relative inline-flex items-center gap-[7px] min-h-[34px] border border-solid border-line rounded-[var(--ors-radius-control)] text-muted bg-surface text-xs whitespace-nowrap [&:focus-within]:border-accent [&_select]:min-h-[32px] [&_select]:border-0 [&_select]:text-ink [&_select]:font-bold [&_select]:cursor-pointer [&_svg]:absolute [&_svg]:w-[10px] [&_svg]:h-[10px] [&_svg]:text-accent [&&&&]:p-[0_11px] [&&&&:focus-within]:shadow-[none] [&&&&_select]:p-[0_15px_0_0] [&&&&_select]:[outline:0] [&&&&_select]:[appearance:none] [&&&&_select]:[background:transparent] [&&&&_select]:[font:inherit] [&&&&_svg]:right-[9px] [&&&&_svg]:[pointer-events:none]"
                    }
                  >
                    每页
                    <select
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
                    <CaretDown />
                  </label>
                </div>
              </div>
              <div
                className={
                  "equipment-page-grid grid gap-[12px] [&&&&]:grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(max-width:_980px)]:[&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(max-width:_700px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))]"
                }
                role="group"
                aria-label="装备搜索结果"
              >
                {items.map((item) => (
                  <button
                    className={
                      "equipment-card [.equipment-page-grid_&]:bg-surface grid items-center gap-[11px] min-w-0 min-h-[80px] p-[10px] border border-solid border-line rounded-[var(--ors-radius-control)] text-ink bg-canvas text-left [&_>_span:last-child]:grid [&_>_span:last-child]:min-w-0 [&_strong]:overflow-hidden [&_small]:mt-[4px] [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap max-[700px]:gap-[8px] max-[700px]:min-h-[70px] max-[700px]:p-[8px] max-[700px]:[&_strong]:text-xs [button&:hover]:border-accent [&&&&]:grid-cols-[58px_minmax(0,_1fr)] [&&&&]:[transition:border-color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] [&&&&_strong]:[display:-webkit-box] [&&&&_strong]:text-[12px] [&&&&_strong]:leading-[1.4] [&&&&_strong]:[-webkit-box-orient:vertical] [&&&&_strong]:[-webkit-line-clamp:2] [&&&&_small]:[text-overflow:ellipsis] [@media(max-width:_700px)]:[&&&&]:grid-cols-[48px_minmax(0,_1fr)] [button&&&&:hover]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_55%,_var(--ors-color-canvas)_)]"
                    }
                    type="button"
                    key={item.id}
                    onClick={() => onSelect(item)}
                  >
                    <EquipmentArtwork item={item} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{formatEquipmentMetadata(item)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div
              className={
                "equipment-page-state [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[7px] [&_button]:min-h-[40px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:font-bold [&_button]:whitespace-nowrap [&_button:hover]:border-accent [&_button:hover]:text-accent [&_button:hover]:bg-selected grid min-h-[360px] rounded-[var(--ors-radius-control)] text-muted bg-surface text-center [&_>_svg]:w-[32px] [&_>_svg]:h-[32px] [&_>_svg]:text-accent [&_h2]:text-ink [&_h2]:text-lg [&_p]:m-0 [&_p]:text-sm [&_button]:mt-[22px] [&&&&_button]:p-[0_15px] [&&&&_button]:text-[12px] [&&&&_button]:[transition:border-color_160ms_ease,_color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] [&&&&]:[justify-items:center] [&&&&]:[align-content:center] [&&&&]:p-[48px_20px] [&&&&_h2]:m-[16px_0_7px]"
              }
              role="status"
            >
              <MagnifyingGlass />
              <h2 className="text-lg font-semibold">没有找到可装备物品</h2>
              <p>返回后修改装备名称。</p>
              <button type="button" onClick={onBack}>
                修改搜索
              </button>
            </div>
          )}
        </div>

        <nav
          className={
            "equipment-pagination [&_button]:inline-flex [&_button]:justify-center [&_button]:items-center [&_button]:gap-[7px] [&_button]:min-h-[40px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:font-bold [&_button]:whitespace-nowrap [&_button:hover:not(:disabled)]:border-accent [&_button:hover:not(:disabled)]:text-accent [&_button:hover:not(:disabled)]:bg-selected [&_button_svg]:w-[15px] [&_button_svg]:h-[15px] grid items-center mt-[34px] pt-[24px] border-t border-solid border-line [&_button:disabled]:cursor-not-allowed [&_>_span]:text-muted [&_>_span]:font-bold max-[700px]:mt-[28px] max-[700px]:pt-[20px] max-[700px]:[&_button]:min-h-[38px] [&&&&_button]:p-[0_15px] [&&&&_button]:text-[12px] [&&&&_button]:[transition:border-color_160ms_ease,_color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] [&&&&]:grid-cols-[1fr_auto_1fr] [&&&&_button:first-child]:[justify-self:start] [&&&&_button:last-child]:[justify-self:end] [&&&&_button:disabled]:opacity-[0.4] [&&&&_>_span]:text-[12px] [@media(max-width:_700px)]:[&&&&_button]:p-[0_12px]"
          }
          aria-label="装备搜索分页"
        >
          <button
            type="button"
            disabled={!canShowPrevious || loading}
            onClick={onShowPrevious}
          >
            <CaretLeft />
            上一页
          </button>
          <span aria-current="page">第 {page} 页</span>
          <button
            type="button"
            disabled={!canShowNext || loading}
            onClick={onShowNext}
          >
            下一页
            <CaretRight />
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
      className={
        "selected-equipment [&_>_span:last-child]:grid [&_>_span:last-child]:min-w-0 flex items-center gap-[13px] mt-[14px] border border-solid border-accent rounded-[var(--ors-radius-control)] [&_>_span:last-child]:gap-[2px] [&_small]:inline-flex [&_small]:items-center [&_small]:gap-[5px] [&_small]:text-accent [&_small]:text-xs [&_small]:font-bold [&_small_svg]:w-[12px] [&_small_svg]:h-[12px] [&_strong]:text-sm [&_>_span:last-child_>_span]:text-muted [&_>_span:last-child_>_span]:text-xs [&&&&]:p-[11px_13px] [&&&&]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_55%,_var(--ors-color-canvas)_)]"
      }
      aria-live="polite"
    >
      <EquipmentArtwork item={item} />
      <span>
        <small>
          <Check weight="bold" />
          已选择装备
        </small>
        <strong>{item.name}</strong>
        <span>
          {item.category} · ID {item.id}
        </span>
      </span>
    </div>
  );
}

function EquipmentArtwork({ item }: { item: EquipmentSearchItem }) {
  return (
    <span
      className={
        "equipment-artwork relative grid place-items-center w-[58px] h-[58px] overflow-hidden border border-solid border-line rounded-[var(--ors-radius-control)] text-muted bg-hover [&_>_svg]:w-[24px] [&_>_svg]:h-[24px] [&_img]:absolute [&_img]:block [&_img]:w-full [&_img]:h-full [&_img]:object-contain max-[700px]:w-[48px] max-[700px]:h-[48px] max-[700px]:rounded-[var(--ors-radius-control)] [&&&&_img]:inset-[0]"
      }
      aria-hidden="true"
    >
      <CoatHanger />
      {item.icon && (
        <img
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
      className={
        "equipment-page-grid equipment-card-skeletons grid gap-[12px] pt-[2px] [&&&&]:grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(max-width:_980px)]:[&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(max-width:_700px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))]"
      }
      aria-label="正在搜索装备"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <span
          className={
            "equipment-card equipment-card-skeleton [.equipment-page-grid_&]:bg-surface grid items-center gap-[11px] min-w-0 min-h-[80px] p-[10px] border border-solid border-line rounded-[var(--ors-radius-control)] text-ink bg-canvas text-left [&_>_span:last-child]:grid [&_>_span:last-child]:min-w-0 [&_strong]:overflow-hidden [&_small]:mt-[4px] [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap max-[700px]:gap-[8px] max-[700px]:min-h-[70px] max-[700px]:p-[8px] max-[700px]:[&_strong]:text-xs [button&:hover]:border-accent [&_>_span]:block [&_>_small]:block [&_>_span]:w-[52px] [&_>_span]:h-[52px] [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_small]:h-[12px] [&_>_small]:rounded-[var(--ors-radius-control)] [&&&&]:grid-cols-[58px_minmax(0,_1fr)] [&&&&]:[transition:border-color_160ms_ease,_background-color_160ms_ease,_transform_160ms_ease] [&&&&_strong]:[display:-webkit-box] [&&&&_strong]:text-[12px] [&&&&_strong]:leading-[1.4] [&&&&_strong]:[-webkit-box-orient:vertical] [&&&&_strong]:[-webkit-line-clamp:2] [&&&&_small]:[text-overflow:ellipsis] [@media(max-width:_700px)]:[&&&&]:grid-cols-[48px_minmax(0,_1fr)] [button&&&&:hover]:[background:color-mix(_in_srgb,_var(--ors-color-selected)_55%,_var(--ors-color-canvas)_)] [&&&&]:grid-cols-[52px_1fr] [&&&&_>_span]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [&&&&_>_span]:[background-size:240%_100%] [&&&&_>_span]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_>_small]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_color-mix(in_srgb,_var(--ors-color-hover)_55%,_var(--ors-color-surface))_45%,_var(--ors-color-hover)_70%_)] [&&&&_>_small]:[background-size:240%_100%] [&&&&_>_small]:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] [&&&&_>_small]:w-[78%]"
          }
          key={index}
        >
          <span />
          <small />
        </span>
      ))}
    </div>
  );
}
