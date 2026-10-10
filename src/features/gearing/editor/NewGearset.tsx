/** First use requires a player's job choice; no draft is saved until an explicit action. */
import { useState } from "react";
import type { EditorState } from "./Editor";
import type { GearingViewModel } from "./ViewModel";
export function NewGearset({
  vm,
  state,
}: {
  vm: GearingViewModel;
  state: EditorState;
}) {
  const [job, setJob] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const data = state.data!;
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    vm.clearError();
    try {
      await action();
    } catch (error) {
      vm.report(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main
      className={
        "max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 gear-editor gear-start mx-auto w-full px-5 py-5 text-[15px] text-ink [&_*]:box-border [&_button]:min-h-10 [&_button]:rounded-lg [&_button]:border [&_button]:border-control [&_button]:bg-surface [&_button]:px-3 [&_button]:py-2 [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-control [&_select]:bg-surface [&_select]:px-3 [&_select]:py-2 [&_input:not([type=checkbox])]:min-h-10 [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-control [&_input:not([type=checkbox])]:bg-surface [&_input:not([type=checkbox])]:px-3 [&_input:not([type=checkbox])]:py-2 [&_button]:cursor-pointer [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[6px] [&_button:hover:not(:disabled)]:bg-hover [&_button:disabled]:cursor-default [&_button:disabled]:text-disabled [&_button[aria-pressed=true]]:text-accent [&_button[aria-pressed=true]]:bg-selected [&_input]:min-w-0 [&_select]:min-w-0 [&_svg]:w-[18px] [&_svg]:h-[18px] [&_h1]:m-0 [&_h2]:m-0 [&_p]:m-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:text-sm [&_h2]:font-semibold [&_small]:text-muted [&_table]:w-full [&_table]:tabular-nums [&_th]:border-b [&_th]:border-solid [&_th]:border-line [&_th]:text-right [&_th]:whitespace-nowrap [&_td]:border-b [&_td]:border-solid [&_td]:border-line [&_td]:text-right [&_td]:whitespace-nowrap [&_th]:text-muted [&_th]:font-normal [&_th:first-child]:text-left [&_td:first-child]:text-left [&_summary]:cursor-pointer [&_summary]:min-h-[28px] [@media(pointer:_coarse)]:[&_button]:min-h-[44px] [@media(pointer:_coarse)]:[&_select]:min-h-[44px] [@media(pointer:_coarse)]:[&_input:not([type=checkbox])]:min-h-[44px] [&_:is(_.gear-save-state,_.gear-context,_.gear-section-heading_>_span,_.gear-slot-label,_.gear-equipped-meta,_.gear-candidate-filters,_.gear-check,_.gear-item-description,_.gear-key-stats_dt,_.gear-muted,_.gear-footer,_.gear-apply-summary_)]:text-[13px] [&_th]:text-[13px] my-8 max-w-[640px] rounded-xl border border-line bg-surface p-7 [&_>_p]:mt-[12px] [&_form]:grid [&_form]:gap-[20px] [&_label]:grid [&_label]:items-start [&_label]:gap-2 [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline-offset:2px] [&&&&_input]:[caret-color:var(--ors-color-accent)] [&&&&_select]:max-w-[100%] [&&&&_svg]:shrink-[0] [&&&&_table]:[border-collapse:collapse] [&&&&_th]:p-[12px_10px] [&&&&_td]:p-[12px_10px] [&&&&_details]:m-[12px_0] [&&&&_summary]:text-[0.8rem] [@media(max-width:_767px)]:[&&&&]:p-[12px_16px] [&&&&]:w-[calc(100%_-_32px)] [&&&&_form]:m-[24px_0] [&&&&_form_>_button]:[justify-self:start]"
      }
    >
      <h1 className="text-2xl font-bold tracking-tight">新建配装</h1>
      <p className={"gear-muted text-muted text-xs [&&&&]:leading-[1.7]"}>
        选择职业开始配装，或导入已有方案。
      </p>
      {state.migrationIssue && (
        <p role="alert">
          旧配装暂时无法恢复，原始草稿已保留。可以选择职业创建新方案。
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(() =>
            vm.create(
              name.trim() ||
                `${data.jobs.find((entry) => entry.id === job)?.name}配装`,
              job,
            ),
          );
        }}
      >
        <label>
          职业
          <select
            required
            value={job}
            onChange={(event) => setJob(event.target.value)}
          >
            <option value="" disabled>
              请选择职业
            </option>
            <optgroup label="战斗职业">
              {data.jobs
                .filter((entry) => entry.combat)
                .map((entry) => (
                  <option value={entry.id} key={entry.id}>
                    {entry.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="生产与采集">
              {data.jobs
                .filter((entry) => !entry.combat)
                .map((entry) => (
                  <option value={entry.id} key={entry.id}>
                    {entry.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </label>
        <label>
          方案名（可选）
          <input
            value={name}
            maxLength={120}
            placeholder="例如：日常副本"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button
          className="gear-primary [.gear-editor_&]:bg-accent [.gear-editor_&]:text-on-accent [.gear-editor_&]:border-accent [.gear-editor_&:hover:not(:disabled)]:bg-accent-hover [.gear-editor_&:disabled]:bg-surface [.gear-editor_&:disabled]:border-line"
          disabled={!job || busy}
        >
          {busy ? "正在创建…" : "开始配装"}
        </button>
      </form>
      <details>
        <summary>导入已有配装</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => vm.import(code));
          }}
        >
          <label>
            分享码或完整链接
            <input
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button disabled={busy || !code.trim()}>导入为新方案</button>
        </form>
      </details>
      {state.error && (
        <div
          className={
            "gear-alert flex gap-[12px] bg-surface border border-solid border-danger p-[12px] mb-[12px] [&&&&]:[align-items:start] [&&&&_>_div]:flex-[1]"
          }
          role="alert"
        >
          <div>
            <strong>操作未完成，请检查输入后重试。</strong>
            <details>
              <summary>错误详情</summary>
              {state.error}
            </details>
          </div>
        </div>
      )}
    </main>
  );
}
