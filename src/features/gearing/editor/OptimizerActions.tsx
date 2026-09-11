/** Persistent task actions keep cancellation and the numerical outcome beside the apply decision. */
import { useEffect, useState } from "react";
import type { GearingViewModel } from "./ViewModel";
import type { EditorState } from "./Editor";
export function OptimizerActions({
  vm,
  state,
}: {
  vm: GearingViewModel;
  state: EditorState;
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
  return (
    <div className="gear-optimizer-actions">
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
            <button
              onClick={() =>
                void vm
                  .saveProposal(`${doc?.name} 优化`)
                  .catch((e) => vm.report(e))
              }
            >
              另存为新方案
            </button>
          </div>
        </div>
      )}
      {proposal?.status === "cancelled" && <p role="status">计算已取消。</p>}
      <div className="gear-run">
        <button
          className={ready ? "" : "gear-primary"}
          disabled={
            state.running ||
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
