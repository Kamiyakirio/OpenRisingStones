/** Keep the replacement decision and its numerical consequences in the browsing context. */
import clsx from "clsx";
import { gearingControlClasses, gearingHintClasses } from "../utilityClasses";
import type { EditorState } from "./Editor";
import type { GearingViewModel } from "./ViewModel";
import { useEffect, useRef } from "react";
import { ItemName } from "./ItemName";

export function PreviewActions({
  vm,
  state,
  onApply,
  layout,
}: {
  vm: GearingViewModel;
  state: EditorState;
  onApply: () => void;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "candidates";
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
      ref.current.scrollIntoView({
        block: "nearest",
      });
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
      className={clsx(
        "gear-preview-action relative z-2 grid grid-cols-[minmax(0,_1fr)_auto] flex-wrap items-center gap-3 border border-solid border-line bg-surface p-3 max-[600px]:grid-cols-1",
        layout === "candidates" && "min-[1200px]:shrink-0",
      )}
      aria-label="替换预览"
      aria-busy={state.previewing}
    >
      <div className="gear-preview-identity grid flex-[1_1_240px] gap-1 [overflow-wrap:anywhere]">
        <span className={gearingHintClasses}>
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
      <div
        className="gear-preview-deltas col-span-full flex flex-[1_1_100%] flex-wrap gap-[8px_20px] text-[13px] tabular-nums"
        role="status"
      >
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
                    className={
                      delta > 0
                        ? "gear-positive text-success"
                        : "gear-negative text-danger"
                    }
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
              <span className="gear-negative text-danger">
                装备存在冲突，暂时无法应用。请检查下方详情。
              </span>
            )}
          </>
        ) : (
          "暂时无法计算，请重新选择装备。"
        )}
      </div>
      {!!next?.issues.length && (
        <details className="col-span-full">
          <summary>冲突详情</summary>
          {next.issues.map((issue, index) => (
            <p key={index}>
              {job.slots.find((slot) => slot.key === issue.slot)?.name}：
              {issue.message}
            </p>
          ))}
        </details>
      )}
      <div className="gear-preview-buttons col-start-2 row-start-1 [margin-left:auto] flex gap-2 max-[600px]:col-start-1 max-[600px]:row-auto">
        <button
          className={gearingControlClasses.button}
          onClick={() => vm.cancelPreview()}
        >
          取消预览
        </button>
        <button
          className={
            "gear-primary inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-accent bg-accent px-3 py-2 text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover disabled:cursor-default disabled:border-line disabled:bg-surface disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
          }
          disabled={!next || !!next.issues.length || state.previewing}
          onClick={onApply}
        >
          {before ? "替换装备" : "装备到此部位"}
        </button>
      </div>
    </section>
  );
}
