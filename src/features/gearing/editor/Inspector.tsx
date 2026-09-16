/** Compact numeric comparisons and native task controls share a stable inspector column. */
import { SourcePicker } from "./SourcePicker";
import { ItemName } from "./ItemName";
import type { GearingViewModel } from "./ViewModel";
import type { EditorState } from "./Editor";
import type { Slot, Stat } from "./types";
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
    <div className={`gear-inspector-body is-${panel}`}>
      {panel === "optimize" && <Optimizer vm={vm} state={state} />}
      <section
        className="gear-statistics"
        aria-label="配装属性"
        aria-busy={state.evaluating}
      >
        <div className="gear-section-heading">
          <h2>{preview ? "方案比较" : "配装属性"}</h2>
          <label className="gear-check">
            <input
              type="checkbox"
              checked={state.tiers}
              onChange={(e) => vm.setTiers(e.target.checked)}
            />
            阈值
          </label>
        </div>
        {evaluation?.effects && (
          <dl className="gear-key-stats">
            <div>
              <dt>GCD</dt>
              <dd>
                {number(evaluation.effects.gcd, 2)}s
                {preview?.effects && (
                  <span> → {number(preview.effects.gcd, 2)}s</span>
                )}
              </dd>
            </div>
            <div>
              <dt>每威力伤害期望</dt>
              <dd>
                {number(evaluation.effects.damage, 5)}
                {preview?.effects && (
                  <span
                    className={
                      preview.effects.damage >= evaluation.effects.damage
                        ? "gear-positive"
                        : "gear-negative"
                    }
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
        <table>
          <thead>
            <tr>
              <th>属性</th>
              <th>当前</th>
              {preview && <th>变化</th>}
              {state.tiers && (
                <>
                  <th>前一档</th>
                  <th>后一档</th>
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
                  <th>{data.statNames[stat]}</th>
                  <td>
                    {state.evaluating ? "…" : number(evaluation?.stats[stat])}
                  </td>
                  {preview && (
                    <td
                      className={
                        delta > 0
                          ? "gear-positive"
                          : delta < 0
                            ? "gear-negative"
                            : ""
                      }
                    >
                      {delta ? (delta > 0 ? "+" : "") + number(delta) : "—"}
                    </td>
                  )}
                  {state.tiers && (
                    <>
                      <td title="降至前一档所需减少的属性值">
                        {state.evaluating
                          ? "…"
                          : number(
                              evaluation?.tiers[stat]?.previous ?? undefined,
                            )}
                      </td>
                      <td title="升至后一档所需增加的属性值">
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
          <p className="gear-muted">属性没有变化。</p>
        )}
        {evaluation?.effects && (
          <details className="gear-effect-details">
            <summary>详细效果</summary>
            <dl>
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
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
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
            <label className="gear-check">
              <input
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
          <table>
            <thead>
              <tr>
                <th>魔晶石</th>
                <th>期望</th>
                <th>90%</th>
                <th>99%</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.consumption.map((row) => (
                <tr key={`${row.stat}:${row.grade}`}>
                  <th>
                    {data.statNames[row.stat]}{" "}
                    {data.materiaGradeNames[row.grade - 1]}
                  </th>
                  <td>{row.expected}</td>
                  <td>{row.confidence90}</td>
                  <td>{row.confidence99}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="gear-muted">
            90% / 99% 为完成全部镶嵌的保守备料数量，包含保证孔。
          </p>
        </details>
      )}
      {!!evaluation?.issues.length && (
        <div className="gear-validation" role="alert">
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
              <button onClick={() => vm.remove(issue.slot)}>移除该装备</button>
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
    <section className="gear-optimizer" aria-label="最优配装计算">
      {job.combat ? (
        <>
          <label>
            计算内容
            <select
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
              <label>
                选装方式
                <select
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
              <div className="gear-target">
                <label>
                  目标 GCD
                  <input
                    type="number"
                    min={1.8}
                    max={2.5}
                    step={0.01}
                    value={c.targetGcd}
                    onChange={(e) =>
                      vm.setConditions({ targetGcd: Number(e.target.value) })
                    }
                  />
                </label>
                <select
                  aria-label="GCD 目标方式"
                  value={c.exactGcd ? "exact" : "maximum"}
                  onChange={(e) =>
                    vm.setConditions({ exactGcd: e.target.value === "exact" })
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
            <label key={stat}>
              {data.statNames[stat]}目标
              <input
                type="number"
                min={0}
                max={100000}
                value={c.targets[stat] ?? 0}
                onChange={(e) =>
                  vm.setConditions({
                    targets: { ...c.targets, [stat]: Number(e.target.value) },
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
            <p className="gear-muted">
              初始品级为当前版本推荐范围，可按需调整；不会限制配装页的浏览结果。
            </p>
            <div className="gear-level-range">
              <label>
                最低品级
                <input
                  type="number"
                  value={c.minLevel}
                  min={0}
                  max={9999}
                  onChange={(e) =>
                    vm.setConditions({ minLevel: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                最高品级
                <input
                  type="number"
                  value={c.maxLevel}
                  min={0}
                  max={9999}
                  onChange={(e) =>
                    vm.setConditions({ maxLevel: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <SourcePicker
              sources={data.sources.filter((source) =>
                state.optimizationSourceIds.includes(source.id),
              )}
              value={c.sourceIds}
              onChange={(sourceIds) => vm.setConditions({ sourceIds })}
            />
            <label className="gear-check">
              <input
                type="checkbox"
                checked={c.optimizeFood}
                onChange={(e) =>
                  vm.setConditions({ optimizeFood: e.target.checked })
                }
              />
              自动选择食物
            </label>
            <p className="gear-muted">
              已锁定的装备不替换；锁定魔晶石后保留其配置。
            </p>
          </details>
          <details>
            <summary>高级约束</summary>
            <label>
              准备周数（留空不限制）
              <input
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
            <div className="gear-level-range">
              <label>
                最低速度
                <input
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
              <label>
                最高速度
                <input
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
        <div className="gear-proposal" role="status">
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
              <ul>
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
                <label>
                  备选分配
                  <select
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
