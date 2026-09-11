/** Slot-local browsing filters never change the optimizer's independently stored scope. */
import {
  MagnifyingGlass,
  Check,
  FadersHorizontal,
} from "@phosphor-icons/react";
import type { GearingViewModel } from "./ViewModel";
import type { EditorState } from "./Editor";
import type { Stat, Slot } from "./types";
import { ItemIcon } from "./ItemIcon";
import { candidateStats } from "./candidateStats";
export function Candidates({
  vm,
  state,
  title,
  optimizeScope,
  onEditMelds,
}: {
  vm: GearingViewModel;
  state: EditorState;
  title: string;
  optimizeScope: boolean;
  onEditMelds: () => void;
}) {
  const { data, document: doc, query } = state;
  if (!data || !doc) return null;
  const job = data.jobs.find((j) => j.id === doc.job)!;
  const stats = candidateStats(job.stats);
  const sourceMap = new Map(data.sources.map((s) => [s.id, s.label]));
  const equipped =
    doc.equipment[state.selection as Slot]?.itemId ??
    (state.selection === "food"
      ? doc.foodId
      : state.selection === "potion"
        ? doc.potionId
        : null);
  return (
    <section className="gear-candidates" aria-label={`${title}候选装备`}>
      <div className="gear-section-heading">
        <h2>{title}</h2>
        {doc.equipment[state.selection as Slot] && (
          <button
            id="gearing-edit-melds"
            disabled={
              state.evaluating || !state.evaluation?.slots[state.selection]
            }
            onClick={onEditMelds}
          >
            编辑镶嵌 / 属性
          </button>
        )}
        <span>{state.querying ? "正在查询…" : `${state.total} 件`}</span>
      </div>
      <div className="gear-candidate-filters">
        <label className="gear-search">
          <MagnifyingGlass />
          <span className="gear-sr-only">搜索装备名称</span>
          <input
            placeholder="搜索装备名称"
            value={query.search}
            onChange={(e) => vm.filter({ search: e.target.value })}
          />
        </label>
        <details className="gear-filter-details">
          <summary>
            <FadersHorizontal aria-hidden="true" />
            筛选
          </summary>
          <div className="gear-filter-options">
            <label>
              品级
              <input
                type="number"
                aria-label="浏览最低品级"
                value={query.minLevel}
                min={0}
                max={9999}
                onChange={(e) =>
                  vm.filter({ minLevel: Number(e.target.value) })
                }
              />
            </label>
            <span>至</span>
            <input
              type="number"
              aria-label="浏览最高品级"
              value={query.maxLevel}
              min={0}
              max={9999}
              onChange={(e) => vm.filter({ maxLevel: Number(e.target.value) })}
            />
            <label className="gear-candidate-source">
              <span className="gear-sr-only">浏览获取途径</span>
              <select
                value={query.sourceIds[0] ?? ""}
                onChange={(e) =>
                  vm.filter({
                    sourceIds: e.target.value ? [e.target.value] : [],
                  })
                }
              >
                <option value="">全部获取途径</option>
                {data.sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="gear-sr-only">候选排序</span>
              <select
                value={query.sortStat}
                onChange={(e) =>
                  vm.filter({ sortStat: e.target.value as Stat | "" })
                }
              >
                <option value="">品级排序</option>
                {job.stats.map((s) => (
                  <option key={s} value={s}>
                    {data.statNames[s]}排序
                  </option>
                ))}
              </select>
            </label>
            <label className="gear-check">
              <input
                type="checkbox"
                checked={query.hideObsolete}
                onChange={(e) => vm.filter({ hideObsolete: e.target.checked })}
              />
              隐藏过时装备
            </label>
          </div>
        </details>
      </div>
      <div
        className="gear-candidate-table"
        tabIndex={0}
        role="region"
        aria-label="候选装备列表"
        aria-busy={state.querying}
      >
        <table>
          <thead>
            <tr>
              {optimizeScope && <th>参与</th>}
              <th className="gear-name-column">装备</th>
              {stats.map((s) => (
                <th key={s}>{data.statNames[s]}</th>
              ))}
              <th>魔晶石</th>
            </tr>
          </thead>
          <tbody>
            {state.items.map((item) => (
              <tr
                key={item.id}
                className={
                  state.preview?.id === item.id
                    ? "is-preview"
                    : item.id === equipped
                      ? "is-equipped"
                      : ""
                }
              >
                {optimizeScope && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${item.name}参与优化`}
                      checked={
                        !state.conditions.excludedItemIds.includes(item.id)
                      }
                      onChange={(e) =>
                        vm.setConditions({
                          excludedItemIds: e.target.checked
                            ? state.conditions.excludedItemIds.filter(
                                (id) => id !== item.id,
                              )
                            : [...state.conditions.excludedItemIds, item.id],
                        })
                      }
                    />
                  </td>
                )}
                <td className="gear-name-column">
                  <button
                    className="gear-candidate-name"
                    onClick={() => void vm.preview(item)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        state.preview?.id === item.id &&
                        state.previewEvaluation
                      ) {
                        event.preventDefault();
                        vm.applyPreview();
                      }
                    }}
                  >
                    <ItemIcon item={item} />
                    <span className="gear-candidate-copy">
                      <span>
                        {item.id === equipped && (
                          <Check aria-label="当前装备" />
                        )}
                        {item.name}
                        {item.hq && <small className="gear-hq">HQ</small>}
                      </span>
                      <span className="gear-item-description">
                        i{item.level} ·{" "}
                        {item.sourceId
                          ? sourceMap.get(item.sourceId)
                          : item.kind === "equipment"
                            ? "其他来源"
                            : "消耗品"}
                      </span>
                    </span>
                  </button>
                </td>
                {stats.map((s) => (
                  <td key={s}>{item.stats[s] ?? "—"}</td>
                ))}
                <td>
                  <span
                    className="gear-candidate-melds"
                    aria-label={`${item.materiaSlot ?? 0} 个保证孔${item.materiaAdvanced ? "，支持禁断" : ""}`}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className={`${i >= (item.materiaSlot ?? 0) ? "is-advanced" : ""} ${i >= (item.materiaAdvanced ? 5 : (item.materiaSlot ?? 0)) ? "is-absent" : ""}`}
                      />
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!state.items.length && !state.querying && (
          <p className="gear-empty">
            没有匹配的装备。调整品级或清除筛选后重试。
          </p>
        )}
      </div>
      <div className="gear-pagination">
        <button
          disabled={query.offset === 0 || state.querying}
          onClick={() =>
            vm.filter({ offset: Math.max(0, query.offset - query.limit) })
          }
        >
          上一页
        </button>
        <span>
          {state.total
            ? `${query.offset + 1}–${Math.min(query.offset + query.limit, state.total)}`
            : "0"}{" "}
          / {state.total}
        </span>
        <button
          disabled={query.offset + query.limit >= state.total || state.querying}
          onClick={() => vm.filter({ offset: query.offset + query.limit })}
        >
          下一页
        </button>
      </div>
    </section>
  );
}
