/** Keep the replacement decision and its numerical consequences in the browsing context. */
import type { EditorState } from "./Editor";
import type { GearingViewModel } from "./ViewModel";
import { useEffect, useRef } from "react";
import { ItemName } from "./ItemName";
export function PreviewActions({
  vm,
  state,
  onApply,
}: {
  vm: GearingViewModel;
  state: EditorState;
  onApply: () => void;
}) {
  const {
    preview,
    previewEvaluation: next,
    evaluation: current,
    data,
    document: doc,
  } = state;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // A candidate near the end of a long list must still reveal the apply decision.
    if (ref.current?.getClientRects().length)
      ref.current.scrollIntoView({ block: "nearest" });
  }, [preview?.id]);
  if (!preview || !data || !doc) return null;
  const job = data.jobs.find((entry) => entry.id === doc.job)!;
  const before = current?.slots[state.selection]?.item;
  const changes = job.stats.filter(
    (stat) => next && (next.stats[stat] ?? 0) !== (current?.stats[stat] ?? 0),
  );
  return (
    <section
      ref={ref}
      className="gear-preview-action"
      aria-label="替换预览"
      aria-busy={state.previewing}
    >
      <div className="gear-preview-identity">
        <span className="gear-muted">
          {before ? (
            <>
              替换 <ItemName item={before} sources={data.sources} />
            </>
          ) : (
            "装备到空槽位"
          )}
        </span>
        <strong>
          <ItemName item={preview} sources={data.sources} />
        </strong>
      </div>
      <div className="gear-preview-deltas" role="status">
        {state.previewing ? (
          "正在计算差异…"
        ) : next ? (
          <>
            {changes.map((stat) => {
              const delta =
                (next.stats[stat] ?? 0) - (current?.stats[stat] ?? 0);
              return (
                <span key={stat}>
                  {data.statNames[stat]}{" "}
                  <strong
                    className={delta > 0 ? "gear-positive" : "gear-negative"}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </strong>
                </span>
              );
            })}
            {!changes.length && <span>属性没有变化</span>}
            {current?.effects && next.effects && (
              <span>
                GCD {current.effects.gcd.toFixed(2)} →{" "}
                {next.effects.gcd.toFixed(2)}s
              </span>
            )}
            {!!next.issues.length && (
              <span className="gear-negative">
                装备存在冲突，暂时无法应用。请检查下方详情。
              </span>
            )}
          </>
        ) : (
          "暂时无法计算，请重新选择装备。"
        )}
      </div>
      {!!next?.issues.length && (
        <details>
          <summary>冲突详情</summary>
          {next.issues.map((issue, index) => (
            <p key={index}>
              {job.slots.find((slot) => slot.key === issue.slot)?.name}：
              {issue.message}
            </p>
          ))}
        </details>
      )}
      <div className="gear-preview-buttons">
        <button onClick={() => vm.cancelPreview()}>取消预览</button>
        <button
          className="gear-primary"
          disabled={!next || !!next.issues.length || state.previewing}
          onClick={onApply}
        >
          {before ? "替换装备" : "装备到此部位"}
        </button>
      </div>
    </section>
  );
}
