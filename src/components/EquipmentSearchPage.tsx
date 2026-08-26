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
  type EquipmentSearchItem,
} from "../services/equipmentApi";

type EquipmentSearchPageProps = {
  query: string;
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

export function EquipmentSearchPage({
  query,
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
  return (
    <main className="equipment-results-page" id="top">
      <section
        className="equipment-results-shell"
        aria-labelledby="equipment-results-heading"
      >
        <header className="equipment-page-header">
          <button
            className="equipment-page-back"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft />
            返回幻化
          </button>
          <div>
            <h1 id="equipment-results-heading">选择装备</h1>
            <p>“{query}”的搜索结果。选择一件装备后查看相关幻化投稿。</p>
          </div>
          <span>第 {page} 页</span>
        </header>

        <div className="equipment-page-content">
          {loading ? (
            <EquipmentSearchSkeleton />
          ) : error ? (
            <div
              className="equipment-page-state equipment-page-error"
              role="alert"
            >
              <WarningCircle />
              <h2>无法读取这一页</h2>
              <p>{error}</p>
              <button type="button" onClick={onRetry}>
                重新加载
              </button>
            </div>
          ) : items.length ? (
            <>
              <div className="equipment-page-summary">
                <strong>装备结果</strong>
                <div>
                  <span>本页 {items.length} 件</span>
                  <label className="equipment-page-size">
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
                className="equipment-page-grid"
                role="group"
                aria-label="装备搜索结果"
              >
                {items.map((item) => (
                  <button
                    className="equipment-card"
                    type="button"
                    key={item.id}
                    onClick={() => onSelect(item)}
                  >
                    <EquipmentArtwork item={item} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.category}</small>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="equipment-page-state" role="status">
              <MagnifyingGlass />
              <h2>没有找到可装备物品</h2>
              <p>返回后换一个装备名称再试。</p>
              <button type="button" onClick={onBack}>
                修改搜索
              </button>
            </div>
          )}
        </div>

        <nav className="equipment-pagination" aria-label="装备搜索分页">
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

export function SelectedEquipmentSummary({
  item,
}: {
  item: EquipmentSearchItem;
}) {
  return (
    <div className="selected-equipment" aria-live="polite">
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
    <span className="equipment-artwork" aria-hidden="true">
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
      className="equipment-page-grid equipment-card-skeletons"
      aria-label="正在搜索装备"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <span className="equipment-card equipment-card-skeleton" key={index}>
          <span />
          <small />
        </span>
      ))}
    </div>
  );
}
