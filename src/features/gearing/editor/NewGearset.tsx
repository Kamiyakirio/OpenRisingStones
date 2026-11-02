/** First use requires a player's job choice; no draft is saved until an explicit action. */

import { gearingControlClasses, gearingAlertClasses } from "../utilityClasses";
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
    <main className="gear-editor gear-start mx-auto my-8 w-[calc(100%_-_32px)] max-w-160 rounded-panel border border-line bg-surface p-7 text-[15px] text-ink max-[899px]:px-4 max-[899px]:py-4 max-[767px]:px-4 max-[767px]:py-3 max-[519px]:px-3 max-[519px]:py-4">
      <h1 className="text-2xl font-bold tracking-tight">新建配装</h1>
      <p className="gear-muted mt-3 text-xs leading-[1.7] text-muted">
        选择职业开始配装，或导入已有方案。
      </p>
      {state.migrationIssue && (
        <p role="alert">
          旧配装暂时无法恢复，原始草稿已保留。可以选择职业创建新方案。
        </p>
      )}
      <form
        className="my-6 grid gap-5"
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
        <label className="grid items-start gap-2">
          职业
          <select
            className={gearingControlClasses.select}
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
        <label className="grid items-start gap-2">
          方案名（可选）
          <input
            className={gearingControlClasses.input}
            value={name}
            maxLength={120}
            placeholder="例如：日常副本"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button
          className={
            "gear-primary inline-flex min-h-10 items-center justify-center gap-1.5 justify-self-start rounded-control border border-solid border-accent bg-accent px-3 py-2 text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover disabled:cursor-default disabled:border-line disabled:bg-surface disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
          }
          disabled={!job || busy}
        >
          {busy ? "正在创建…" : "开始配装"}
        </button>
      </form>
      <details className="my-3">
        <summary>导入已有配装</summary>
        <form
          className="my-6 grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => vm.import(code));
          }}
        >
          <label className="grid items-start gap-2">
            分享码或完整链接
            <input
              className={gearingControlClasses.input}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-1.5 justify-self-start rounded-control border border-solid border-control bg-surface px-3 py-2 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
            disabled={busy || !code.trim()}
          >
            导入为新方案
          </button>
        </form>
      </details>
      {state.error && (
        <div className={gearingAlertClasses} role="alert">
          <div className="flex-1">
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
