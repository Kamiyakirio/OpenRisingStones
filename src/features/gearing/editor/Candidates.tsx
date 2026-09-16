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
import { ItemStats } from "./ItemStats";
import { ItemName } from "./ItemName";
import { foodUsage } from "./foodUsage";
import { candidateStats } from "./candidateStats";
import { PreviewActions } from "./PreviewActions";
import { useEffect, useRef } from "react";
export function Candidates({
  vm,
  state,
  title,
  optimizeScope,
  onEditMelds,
  onBack,
  onApply,
}: {
  vm: GearingViewModel;
  state: EditorState;
  title: string;
  optimizeScope: boolean;
  onEditMelds: () => void;
  onBack: () => void;
  onApply: () => void;
}) {
  const { data, document: doc, query } = state;
  const table = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Paging or changing scope starts at the first result, never halfway through a new list.
    if (table.current) table.current.scrollTop = 0;
  }, [query]);
  if (!data || !doc) return null;
  const job = data.jobs.find((j) => j.id === doc.job)!;
  const consumable = state.selection === "food" || state.selection === "potion";
  const stats = consumable
    ? ([
        ...new Set(state.items.flatMap((item) => Object.keys(item.stats))),
      ] as Stat[])
    : candidateStats(job.stats);
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
        <button className="gear-back" onClick={onBack}>
          {optimizeScope ? "返回优化" : "返回配装"}
        </button>
        <label>
          部位
          <select
            aria-label="选择部位"
            value={state.selection}
            onChange={(event) =>
              vm.select(event.target.value as typeof state.selection)
            }
          >
            {job.slots.map((slot) => (
              <option key={slot.key} value={slot.key}>
                {slot.name}
              </option>
            ))}
          </select>
        </label>
        <h2 className="gear-sr-only">{title}</h2>
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
      <div className="gear-current-item">
        <span>
          当前：
          <strong>
            {state.evaluation?.slots[state.selection] ? (
              <ItemName
                item={state.evaluation.slots[state.selection]!.item}
                sources={data.sources}
              />
            ) : (
              "尚未装备"
            )}
          </strong>
        </span>
        {equipped && <button onClick={() => vm.remove()}>移除</button>}
        <button
          disabled={job.slots.at(-1)?.key === state.selection}
          onClick={() => {
            const next =
              job.slots[
                job.slots.findIndex((slot) => slot.key === state.selection) + 1
              ];
            if (next) vm.select(next.key);
          }}
        >
          下一部位
        </button>
        <ItemStats
          item={state.evaluation?.slots[state.selection]}
          data={data}
          busy={state.evaluating}
          label="当前装备生效属性"
        />
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
                value={query.minLevel || ""}
                placeholder="不限"
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
              value={query.maxLevel === 9999 ? "" : query.maxLevel}
              placeholder="不限"
              min={0}
              max={9999}
              onChange={(e) =>
                vm.filter({
                  maxLevel: e.target.value ? Number(e.target.value) : 9999,
                })
              }
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
                {query.sourceIds
                  .filter((id) => !state.availableSourceIds.includes(id))
                  .map((id) => (
                    <option key={id} value={id} disabled>
                      {sourceMap.get(id)}（无匹配）
                    </option>
                  ))}
                {data.sources
                  .filter((source) =>
                    state.availableSourceIds.includes(source.id),
                  )
                  .map((s) => (
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
            <label>
              顺序
              <select
                aria-label="排序方向"
                value={query.sortDirection ?? "desc"}
                onChange={(event) =>
                  vm.filter({
                    sortDirection: event.target.value as "asc" | "desc",
                  })
                }
              >
                <option value="desc">降序（从高到低）</option>
                <option value="asc">升序（从低到高）</option>
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
      <div className="gear-filter-summary">
        <span>
          {query.minLevel === 0 && query.maxLevel === 9999
            ? "不限品级"
            : query.maxLevel === 9999
              ? `i${query.minLevel} 及以上`
              : query.minLevel === 0
                ? `i${query.maxLevel} 及以下`
                : `i${query.minLevel}–${query.maxLevel}`}
          {query.hideObsolete ? " · 隐藏过时装备" : ""}
          {` · ${query.sortStat ? data.statNames[query.sortStat] : "品级"}${query.sortDirection === "asc" ? "升序" : "降序"}`}
          {query.sourceIds.length
            ? ` · ${query.sourceIds.map((id) => sourceMap.get(id)).join("、")}`
            : ""}
        </span>
        <button onClick={() => vm.resetFilters()}>清除搜索和筛选</button>
      </div>
      {!!query.sourceIds.length &&
        !state.querying &&
        query.sourceIds.every(
          (id) => !state.availableSourceIds.includes(id),
        ) && (
          <p className="gear-muted gear-source-reset" role="status">
            已选获取途径没有匹配。可以调整条件或清除获取途径筛选。
            <button onClick={() => vm.filter({ sourceIds: [] })}>
              清除获取途径
            </button>
          </p>
        )}
      <PreviewActions vm={vm} state={state} onApply={onApply} />
      <div
        ref={table}
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
              <th className="gear-name-column">
                {consumable ? "消耗品" : "装备"}
              </th>
              {stats.map((s) => (
                <th key={s}>{data.statNames[s]}</th>
              ))}
              <th
                title={
                  consumable
                    ? "当前配装的实际加成总和 ÷ 加成上限总和"
                    : undefined
                }
              >
                {consumable ? "利用率" : "魔晶石"}
              </th>
            </tr>
          </thead>
          <tbody>
            {state.items.map((item) => {
              const usage =
                consumable && state.evaluation
                  ? foodUsage(item, state.evaluation)
                  : null;
              return (
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
                      aria-pressed={state.preview?.id === item.id}
                      disabled={state.querying || item.id === equipped}
                      onClick={() => void vm.preview(item)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          state.preview?.id === item.id &&
                          state.previewEvaluation
                        ) {
                          event.preventDefault();
                          onApply();
                        }
                      }}
                    >
                      <ItemIcon item={item} />
                      <span className="gear-candidate-copy">
                        <span>
                          {item.id === equipped && (
                            <Check aria-label="当前装备" />
                          )}
                          <ItemName item={item} sources={data.sources} />
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
                    <td key={s}>
                      {consumable && item.stats[s] !== undefined ? (
                        <span title={`实际加成，上限 ${item.stats[s]}`}>
                          {state.evaluating ? "…" : (usage?.actual[s] ?? "—")}
                        </span>
                      ) : (
                        (item.stats[s] ?? "—")
                      )}
                    </td>
                  ))}
                  <td>
                    {consumable ? (
                      <span
                        className="gear-food-utilization"
                        title="当前配装的实际加成总和 ÷ 加成上限总和"
                      >
                        {state.evaluating || !usage
                          ? "—"
                          : `${usage.utilization.toFixed(1)}%`}
                      </span>
                    ) : (
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
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!state.items.length && !state.querying && (
          <p className="gear-empty">
            {query.minLevel > query.maxLevel
              ? "最低品级不能高于最高品级。"
              : "没有匹配的装备。试试其他名称，或清除搜索和筛选。"}
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
