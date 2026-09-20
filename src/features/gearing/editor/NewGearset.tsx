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
    <main className="gear-editor gear-start">
      <h1>新建配装</h1>
      <p className="gear-muted">选择职业开始配装，或导入已有方案。</p>
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
        <button className="gear-primary" disabled={!job || busy}>
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
        <div className="gear-alert" role="alert">
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
