/** Persistent task actions keep cancellation and the numerical outcome beside the apply decision. */
import { useEffect, useState } from "react";
import type { GearingViewModel } from "./ViewModel";
import type { EditorState } from "./Editor";
export function OptimizerActions({
  vm,
  state,
  onSaveProposal,
}: {
  vm: GearingViewModel;
  state: EditorState;
  onSaveProposal: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!state.running) return;
    const tick = () =>
      setElapsed(
        Math.floor((Date.now() - (state.startedAt ?? Date.now())) / 1000),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state.running, state.startedAt]);
  const { proposal, document: doc, evaluation, data } = state;
  const ready =
    proposal?.status === "ok" &&
    proposal.document &&
    state.proposalRevision === state.revision;
  const next = proposal?.evaluation;
  const job = data?.jobs.find((j) => j.id === doc?.job);
  const c = state.conditions;
  const invalidScope =
    c.minLevel > c.maxLevel || c.minLevel < 0 || c.maxLevel > 9999;
  const invalidSpeed =
    c.speedRange &&
    (c.speedRange.min < 0 || c.speedRange.min > c.speedRange.max);
  const invalidGcd =
    c.kind === "combat" && (c.targetGcd < 1.8 || c.targetGcd > 2.5);
  const invalidTargets = Object.values(c.targets).some(
    (value) => value !== undefined && (value < 0 || value > 100000),
  );
  const invalidWeeks =
    c.progressionWeeks !== null &&
    (c.progressionWeeks < 0 || c.progressionWeeks > 100);
  const validation = invalidScope
    ? "最低品级不能高于最高品级，请填写 0–9999 之间的品级。"
    : invalidSpeed
      ? "最低速度不能高于最高速度，且不能小于 0。"
      : invalidGcd
        ? "目标 GCD 需在 1.80–2.50 秒之间。"
        : invalidTargets
          ? "属性目标需在 0–100000 之间。"
          : invalidWeeks
            ? "准备周数需在 0–100 之间。"
            : "";
  return (
    <div className="gear-optimizer-actions">
      {validation && (
        <p className="gear-negative" role="alert">
          {validation}
        </p>
      )}
      {c.kind !== "combat" && !Object.keys(doc?.equipment ?? {}).length && (
        <p className="gear-muted">
          请先在配装页选择装备，再计算当前装备的属性分配。
        </p>
      )}
      {ready && next && (
        <div className="gear-apply-summary">
          <strong>应用前确认</strong>
          {next.effects ? (
            <>
              <div>
                <span>GCD</span>
                <span>
                  {evaluation?.effects?.gcd.toFixed(2)} →{" "}
                  {next.effects.gcd.toFixed(2)}s
                </span>
              </div>
              <div>
                <span>每威力伤害期望</span>
                <span>{next.effects.damage.toFixed(5)}</span>
              </div>
              <div>
                <span>期望变化</span>
                <span
                  className={
                    next.effects.damage >= (evaluation?.effects?.damage ?? 0)
                      ? "gear-positive"
                      : "gear-negative"
                  }
                >
                  {next.effects.damage >= (evaluation?.effects?.damage ?? 0)
                    ? "+"
                    : ""}
                  {(
                    next.effects.damage - (evaluation?.effects?.damage ?? 0)
                  ).toFixed(5)}
                </span>
              </div>
            </>
          ) : (
            job?.stats.map((s) => (
              <div key={s}>
                <span>{data?.statNames[s]}</span>
                <span>
                  {evaluation?.stats[s] ?? 0} → {next.stats[s] ?? 0}
                </span>
              </div>
            ))
          )}
          <div className="gear-run">
            <button className="gear-primary" onClick={() => vm.applyProposal()}>
              应用方案
            </button>
            <button onClick={onSaveProposal}>另存为新方案</button>
          </div>
        </div>
      )}
      {proposal?.status === "cancelled" && <p role="status">计算已取消。</p>}
      <div className="gear-run">
        <button
          className={ready ? "" : "gear-primary"}
          disabled={
            state.running ||
            !!validation ||
            !!state.evaluation?.issues.length ||
            state.evaluating
          }
          onClick={() => void vm.optimize()}
        >
          {ready ? "重新计算" : "计算方案"}
        </button>
        {state.running && (
          <>
            <span role="status">已用 {elapsed}s</span>
            <button onClick={() => vm.cancel(true)}>取消计算</button>
          </>
        )}
      </div>
    </div>
  );
}
