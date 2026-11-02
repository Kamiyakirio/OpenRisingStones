/** Compact numeric comparisons and native task controls share a stable inspector column. */
import clsx from "clsx";
import { gearingControlClasses, gearingHintClasses } from "../utilityClasses";
import { SourcePicker } from "./SourcePicker";
import { ItemName } from "./ItemName";
import type { GearingViewModel } from "./ViewModel";
import type { EditorState } from "./Editor";
import type { Slot, Stat } from "./types";

/** Complete utility strings are shared without adding component CSS rules. */
const gearCheckClasses =
  "gear-check flex items-center gap-2 text-xs leading-[1.5]";
const inspectorHeadingCellClasses =
  "border-b border-b-line px-0 py-[7px] text-right text-[13px] font-normal whitespace-nowrap text-muted first:text-left";
const inspectorValueCellClasses =
  "border-b border-b-line px-0 py-[7px] text-right whitespace-nowrap first:text-left";
const inspectorAttributeFieldClasses =
  "mx-0 my-2.5 grid items-center gap-1.5 text-xs";
const inspectorAttributeSelectClasses =
  "min-h-10 w-full min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-2 text-ink pointer-coarse:min-h-11";

/** Reused presentation strings stay static and are allocated once for this module. */
const inspectorCheckboxClasses =
  "h-[15px] w-[15px] [accent-color:var(--ors-color-accent)]";
const inspectorHeadingClasses =
  "flex flex-wrap items-baseline justify-between gap-2";
const levelRangeClasses =
  "gear-level-range grid grid-cols-[1fr_1fr] items-end gap-2";

const number = (value: number | undefined, digits = 0) =>
  value === undefined
    ? "—"
    : value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
export function Inspector({
  vm,
  state,
  panel,
}: {
  vm: GearingViewModel;
  state: EditorState;
  panel: "stats" | "optimize";
}) {
  const { data, document: doc, evaluation } = state;
  if (!data || !doc) return null;
  const job = data.jobs.find((j) => j.id === doc.job)!;
  const preview =
    panel === "optimize" ? state.proposal?.evaluation : state.previewEvaluation;
  const differences = Object.keys({
    ...evaluation?.stats,
    ...preview?.stats,
  }).filter(
    (s) => preview && evaluation?.stats[s as Stat] !== preview.stats[s as Stat],
  );
  return (
    <div
      className={clsx(
        "gear-inspector-body grid w-[min(900px,_100%)] grid-cols-2 gap-8 pt-2 pr-6 pb-6 pl-6 max-[900px]:grid-cols-[1fr] max-[767px]:block [&.is-stats]:mt-0 [&.is-stats]:mr-auto [&.is-stats]:mb-0 [&.is-stats]:ml-auto [&.is-stats]:block [&.is-stats]:max-w-190",
        `is-${panel}`,
      )}
    >
      {panel === "optimize" && <Optimizer vm={vm} state={state} />}
      <section
        className="gear-statistics mt-0 w-full"
        aria-label="配装属性"
        aria-busy={state.evaluating}
      >
        <div className="gear-section-heading flex min-h-11 items-center justify-between gap-2 border-b border-solid border-line px-3 py-2.5 pr-0 pl-0">
          <h2 className="text-lg font-semibold">
            {preview ? "方案比较" : "配装属性"}
          </h2>
          <label className={gearCheckClasses}>
            <input
              className={inspectorCheckboxClasses}
              type="checkbox"
              checked={state.tiers}
              onChange={(e) => vm.setTiers(e.target.checked)}
            />
            阈值
          </label>
        </div>
        {evaluation?.effects && (
          <dl className="gear-key-stats m-0 grid gap-3 px-0 pt-3.5 pb-2">
            <div className={inspectorHeadingClasses}>
              <dt className="text-xs text-muted">GCD</dt>
              <dd className="m-0 tabular-nums">
                {number(evaluation.effects.gcd, 2)}s
                {preview?.effects && (
                  <span className="text-xs">
                    {" "}
                    → {number(preview.effects.gcd, 2)}s
                  </span>
                )}
              </dd>
            </div>
            <div className={inspectorHeadingClasses}>
              <dt className="text-xs text-muted">每威力伤害期望</dt>
              <dd className="m-0 tabular-nums">
                {number(evaluation.effects.damage, 5)}
                {preview?.effects && (
                  <span
                    className={clsx(
                      "text-xs",
                      preview.effects.damage >= evaluation.effects.damage
                        ? "gear-positive text-success"
                        : "gear-negative text-danger",
                    )}
                  >
                    {" "}
                    {preview.effects.damage - evaluation.effects.damage >= 0
                      ? "+"
                      : ""}
                    {number(
                      preview.effects.damage - evaluation.effects.damage,
                      5,
                    )}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        )}
        <table className={gearingControlClasses.table}>
          <thead>
            <tr>
              <th className={inspectorHeadingCellClasses}>属性</th>
              <th className={inspectorHeadingCellClasses}>当前</th>
              {preview && <th className={inspectorHeadingCellClasses}>变化</th>}
              {state.tiers && (
                <>
                  <th className={inspectorHeadingCellClasses}>前一档</th>
                  <th className={inspectorHeadingCellClasses}>后一档</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {job.stats.map((stat) => {
              const delta = preview
                ? (preview.stats[stat] ?? 0) - (evaluation?.stats[stat] ?? 0)
                : 0;
              return (
                <tr key={stat}>
                  <th className={inspectorHeadingCellClasses}>
                    {data.statNames[stat]}
                  </th>
                  <td className={inspectorValueCellClasses}>
                    {state.evaluating ? "…" : number(evaluation?.stats[stat])}
                  </td>
                  {preview && (
                    <td
                      className={
                        delta > 0
                          ? "gear-positive border-b border-b-line px-0 py-[7px] text-right whitespace-nowrap text-success first:text-left"
                          : delta < 0
                            ? "gear-negative border-b border-b-line px-0 py-[7px] text-right whitespace-nowrap text-danger first:text-left"
                            : inspectorValueCellClasses
                      }
                    >
                      {delta ? (delta > 0 ? "+" : "") + number(delta) : "—"}
                    </td>
                  )}
                  {state.tiers && (
                    <>
                      <td
                        className={inspectorValueCellClasses}
                        title="降至前一档所需减少的属性值"
                      >
                        {state.evaluating
                          ? "…"
                          : number(
                              evaluation?.tiers[stat]?.previous ?? undefined,
                            )}
                      </td>
                      <td
                        className={inspectorValueCellClasses}
                        title="升至后一档所需增加的属性值"
                      >
                        {state.evaluating
                          ? "…"
                          : evaluation?.tiers[stat]?.next != null
                            ? `+${number(evaluation.tiers[stat]!.next!)}`
                            : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {preview && !differences.length && (
          <p className={gearingHintClasses}>属性没有变化。</p>
        )}
        {evaluation?.effects && (
          <details className="gear-effect-details">
            <summary>详细效果</summary>
            <dl className="grid gap-1.5 text-xs">
              {[
                ["暴击率", number(evaluation.effects.crtChance * 100, 1) + "%"],
                ["暴击倍率", number(evaluation.effects.crtDamage, 3)],
                ["直击率", number(evaluation.effects.dhtChance * 100, 1) + "%"],
                ["信念倍率", number(evaluation.effects.detDamage, 3)],
                [
                  "坚韧减伤",
                  number(evaluation.effects.tenMitigation * 100, 1) + "%",
                ],
                ["持续伤害倍率", number(evaluation.effects.ssDamage, 3)],
                ["生命值", number(evaluation.effects.hp)],
                ["MP / 3s", number(evaluation.effects.mp)],
              ].map(([label, value]) => (
                <div className="flex justify-between" key={label}>
                  <dt>{label}</dt>
                  <dd className="m-0">{value}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </section>
      {!!evaluation?.consumption?.length && (
        <details className="gear-consumption">
          <summary>魔晶石用量</summary>
          {!job.combat && (
            <label className={gearCheckClasses}>
              <input
                className={inspectorCheckboxClasses}
                type="checkbox"
                checked={doc.duplicateToolMateria}
                onChange={(e) =>
                  vm.edit((d) => {
                    d.duplicateToolMateria = e.target.checked;
                  })
                }
              />
              计入同配置的其他职业工具
            </label>
          )}
          <table className={gearingControlClasses.table}>
            <thead>
              <tr>
                <th className={gearingControlClasses.th}>魔晶石</th>
                <th className={gearingControlClasses.th}>期望</th>
                <th className={gearingControlClasses.th}>90%</th>
                <th className={gearingControlClasses.th}>99%</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.consumption.map((row) => (
                <tr key={`${row.stat}:${row.grade}`}>
                  <th className={gearingControlClasses.th}>
                    {data.statNames[row.stat]}{" "}
                    {data.materiaGradeNames[row.grade - 1]}
                  </th>
                  <td className={gearingControlClasses.td}>{row.expected}</td>
                  <td className={gearingControlClasses.td}>
                    {row.confidence90}
                  </td>
                  <td className={gearingControlClasses.td}>
                    {row.confidence99}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={gearingHintClasses}>
            90% / 99% 为完成全部镶嵌的保守备料数量，包含保证孔。
          </p>
        </details>
      )}
      {!!evaluation?.issues.length && (
        <div
          className="gear-validation mt-3 bg-selected p-3 leading-[1.7]"
          role="alert"
        >
          <strong>有装备需要修正</strong>
          {evaluation.issues.map((issue, i) => (
            <div key={i}>
              <p>
                {job.slots.find((s) => s.key === issue.slot)?.name ??
                  issue.slot}
                {issue.itemId ? ` #${issue.itemId}` : ""}
                ：无法计算，选择替换或移除。
              </p>
              <details>
                <summary>详情</summary>
                {issue.message}
              </details>
              <button
                className={gearingControlClasses.button}
                onClick={() => vm.remove(issue.slot)}
              >
                移除该装备
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Optimizer({
  vm,
  state,
}: {
  vm: GearingViewModel;
  state: EditorState;
}) {
  const { data, document: doc, conditions: c, proposal } = state;
  if (!data || !doc) return null;
  const job = data.jobs.find((j) => j.id === doc.job)!;
  const validProposal =
    proposal?.status === "ok" &&
    proposal.document &&
    state.proposalRevision === state.revision;
  return (
    <section
      className="gear-optimizer border-b border-solid border-line px-0 py-3.5"
      aria-label="最优配装计算"
    >
      {job.combat ? (
        <>
          <label className={inspectorAttributeFieldClasses}>
            计算内容
            <select
              className={inspectorAttributeSelectClasses}
              value={c.kind}
              onChange={(e) =>
                vm.setConditions({
                  kind: e.target.value as "combat" | "det-dht",
                })
              }
            >
              <option value="combat">最优配装与镶嵌</option>
              <option value="det-dht">信念 / 直击分配</option>
            </select>
          </label>
          {c.kind === "combat" && (
            <>
              <label className={inspectorAttributeFieldClasses}>
                选装方式
                <select
                  className={inspectorAttributeSelectClasses}
                  value={c.mode}
                  onChange={(e) =>
                    vm.setConditions({
                      mode: e.target.value as "all" | "current",
                    })
                  }
                >
                  <option value="all">自动选择装备</option>
                  <option value="current">优化当前装备</option>
                </select>
              </label>
              <div className="gear-target grid grid-cols-[1fr_1fr] items-end gap-2">
                <label className={inspectorAttributeFieldClasses}>
                  目标 GCD
                  <input
                    className={inspectorAttributeSelectClasses}
                    type="number"
                    min={1.8}
                    max={2.5}
                    step={0.01}
                    value={c.targetGcd}
                    onChange={(e) =>
                      vm.setConditions({
                        targetGcd: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <select
                  className="mb-2.5 min-h-10 w-full min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-2 text-ink pointer-coarse:min-h-11"
                  aria-label="GCD 目标方式"
                  value={c.exactGcd ? "exact" : "maximum"}
                  onChange={(e) =>
                    vm.setConditions({
                      exactGcd: e.target.value === "exact",
                    })
                  }
                >
                  <option value="exact">精确等于</option>
                  <option value="maximum">不慢于</option>
                </select>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="gear-production-targets">
          {job.stats.map((stat) => (
            <label className={inspectorAttributeFieldClasses} key={stat}>
              {data.statNames[stat]}目标
              <input
                className={inspectorAttributeSelectClasses}
                type="number"
                min={0}
                max={100000}
                value={c.targets[stat] ?? 0}
                onChange={(e) =>
                  vm.setConditions({
                    targets: {
                      ...c.targets,
                      [stat]: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
      {c.kind === "combat" && (
        <>
          <details className="gear-scope" open>
            <summary>参与计算的范围</summary>
            <p className={gearingHintClasses}>
              初始品级为当前版本推荐范围，可按需调整；不会限制配装页的浏览结果。
            </p>
            <div className={levelRangeClasses}>
              <label className={inspectorAttributeFieldClasses}>
                最低品级
                <input
                  className={inspectorAttributeSelectClasses}
                  type="number"
                  value={c.minLevel}
                  min={0}
                  max={9999}
                  onChange={(e) =>
                    vm.setConditions({
                      minLevel: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className={inspectorAttributeFieldClasses}>
                最高品级
                <input
                  className={inspectorAttributeSelectClasses}
                  type="number"
                  value={c.maxLevel}
                  min={0}
                  max={9999}
                  onChange={(e) =>
                    vm.setConditions({
                      maxLevel: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <SourcePicker
              sources={data.sources.filter((source) =>
                state.optimizationSourceIds.includes(source.id),
              )}
              value={c.sourceIds}
              onChange={(sourceIds) =>
                vm.setConditions({
                  sourceIds,
                })
              }
            />
            <label className={gearCheckClasses}>
              <input
                className={inspectorCheckboxClasses}
                type="checkbox"
                checked={c.optimizeFood}
                onChange={(e) =>
                  vm.setConditions({
                    optimizeFood: e.target.checked,
                  })
                }
              />
              自动选择食物
            </label>
            <p className={gearingHintClasses}>
              已锁定的装备不替换；锁定魔晶石后保留其配置。
            </p>
          </details>
          <details>
            <summary>高级约束</summary>
            <label className={inspectorAttributeFieldClasses}>
              准备周数（留空不限制）
              <input
                className={inspectorAttributeSelectClasses}
                type="number"
                min={0}
                max={100}
                value={c.progressionWeeks ?? ""}
                onChange={(e) =>
                  vm.setConditions({
                    progressionWeeks: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              />
            </label>
            <div className={levelRangeClasses}>
              <label className={inspectorAttributeFieldClasses}>
                最低速度
                <input
                  className={inspectorAttributeSelectClasses}
                  type="number"
                  min={0}
                  value={c.speedRange?.min ?? ""}
                  onChange={(e) =>
                    vm.setConditions({
                      speedRange: e.target.value
                        ? {
                            min: Number(e.target.value),
                            max: c.speedRange?.max ?? 100000,
                          }
                        : null,
                    })
                  }
                />
              </label>
              <label className={inspectorAttributeFieldClasses}>
                最高速度
                <input
                  className={inspectorAttributeSelectClasses}
                  type="number"
                  min={0}
                  value={c.speedRange?.max ?? ""}
                  onChange={(e) =>
                    vm.setConditions({
                      speedRange: e.target.value
                        ? {
                            min: c.speedRange?.min ?? 0,
                            max: Number(e.target.value),
                          }
                        : null,
                    })
                  }
                />
              </label>
            </div>
          </details>
        </>
      )}
      {proposal && (
        <div className="gear-proposal px-0 py-3 text-[0.8rem]" role="status">
          {validProposal ? (
            <>
              <strong>
                {proposal.provenOptimal
                  ? "已完成精确搜索"
                  : "已找到方案，部分装备未参与"}
              </strong>
              {!!proposal.excludedItems?.length && (
                <p>
                  排除 {proposal.excludedItems.length}{" "}
                  件装备：配置不兼容或缺少分配规则。
                </p>
              )}
              <ul className="pl-4.5 leading-[1.8]">
                {Object.entries(proposal.document!.equipment)
                  .filter(
                    ([slot, g]) =>
                      JSON.stringify(doc.equipment[slot as Slot]) !==
                      JSON.stringify(g),
                  )
                  .map(([slot, g]) => (
                    <li key={slot}>
                      {job.slots.find((s) => s.key === slot)?.name}：
                      {proposal.evaluation?.slots[slot as Slot] ? (
                        <ItemName
                          item={proposal.evaluation.slots[slot as Slot]!.item}
                          sources={data.sources}
                        />
                      ) : (
                        `#${g.itemId}`
                      )}
                      {doc.equipment[slot as Slot]?.itemId === g.itemId
                        ? "（镶嵌或属性调整）"
                        : ""}
                    </li>
                  ))}
                {proposal.document!.foodId !== doc.foodId && (
                  <li>
                    食物：
                    {proposal.evaluation?.slots.food ? (
                      <ItemName
                        item={proposal.evaluation.slots.food.item}
                        sources={data.sources}
                      />
                    ) : (
                      "不使用"
                    )}
                  </li>
                )}
              </ul>
              {(proposal.alternatives?.length ?? 0) > 1 && (
                <label className={inspectorAttributeFieldClasses}>
                  备选分配
                  <select
                    className={inspectorAttributeSelectClasses}
                    onChange={(e) =>
                      vm.chooseAlternative(Number(e.target.value))
                    }
                  >
                    {proposal.alternatives!.map((a, i) => (
                      <option key={i} value={i}>
                        信念 {a.evaluation.stats.DET} / 直击{" "}
                        {a.evaluation.stats.DHT}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : (
            <>
              <strong>
                {proposal.status === "unreachable"
                  ? "当前条件下无法达到目标"
                  : proposal.status === "limited"
                    ? "计算达到资源限制"
                    : proposal.status === "cancelled"
                      ? "计算已取消"
                      : "计算未完成"}
              </strong>
              {proposal.slot && (
                <p>
                  {job.slots.find((s) => s.key === proposal.slot)?.name}
                  没有可用候选，请放宽范围。
                </p>
              )}
              {proposal.fastestGcd && (
                <p>可达到的最快 GCD：{proposal.fastestGcd.toFixed(2)}s</p>
              )}
              {proposal.message && (
                <details>
                  <summary>详情</summary>
                  {proposal.message}
                </details>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
