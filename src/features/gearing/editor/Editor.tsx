/** Gearset-first desktop workspace; candidate selection previews without mutating the saved draft. */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  LockSimple,
  FloppyDisk,
  Copy,
  ArrowRight,
  X,
} from "@phosphor-icons/react";
import { GearingViewModel } from "./ViewModel";
import { copyGearingText } from "../utils/clipboard";
import { Candidates } from "./Candidates";
import { OptimizerActions } from "./OptimizerActions";
import { Inspector } from "./Inspector";
import { GameAssetIcon, ItemIcon } from "./ItemIcon";
import { MeldDialog } from "./MeldDialog";
import { jobIconUrl } from "./xivapiAssets";
import type { Slot } from "./types";
import "./editor.css";
export function Editor() {
  const [vm] = useState(() => new GearingViewModel());
  const state = useSyncExternalStore(vm.subscribe, vm.getSnapshot);
  const [panel, setPanel] = useState<"stats" | "optimize">("stats");
  const [workspace, setWorkspace] = useState<
    "equipment" | "candidates" | "inspector"
  >("equipment");
  const [transfer, setTransfer] = useState(false);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [meldOpen, setMeldOpen] = useState(false);
  const restoreMeldFocus = useRef(false);
  const editMelds = () => setMeldOpen(true);
  const closeMelds = () => {
    restoreMeldFocus.current = true;
    setMeldOpen(false);
  };
  useEffect(() => {
    if (meldOpen || state.evaluating || !restoreMeldFocus.current) return;
    restoreMeldFocus.current = false;
    document.getElementById("gearing-edit-melds")?.focus();
  }, [meldOpen, state.evaluating]);
  useEffect(() => {
    void vm.initialize();
    return () => vm.dispose();
  }, [vm]);
  const run = (action: () => Promise<unknown>) => {
    void action().catch((error) => vm.report(error));
  };
  const { data, document: doc, evaluation } = state;
  const job = data?.jobs.find((j) => j.id === doc?.job);
  if (state.loading)
    return (
      <main className="gear-editor">
        <p role="status">正在打开配装目录…</p>
      </main>
    );
  if (!data || !doc || !job)
    return (
      <main className="gear-editor">
        <h1>配装</h1>
        <p role="alert">
          {state.migrationIssue
            ? "旧配装暂时无法恢复，原始草稿已保留。"
            : "配装目录无法打开。请在桌面应用中使用，并确认已生成配装数据。"}
        </p>
        <details>
          <summary>错误详情</summary>
          <p>{state.error}</p>
        </details>
        {data && (
          <button onClick={() => run(() => vm.create("新配装"))}>
            创建新方案，保留旧草稿
          </button>
        )}
      </main>
    );
  const selectedName =
    job.slots.find((s) => s.key === state.selection)?.name ?? state.selection;
  return (
    <main className="gear-editor" aria-label="配装编辑器">
      <header className="gear-commandbar">
        <h1>配装</h1>
        <label className="gear-plan-picker">
          <span className="gear-sr-only">打开方案</span>
          <select
            value={doc.id}
            onChange={(e) => run(() => vm.load(e.target.value))}
          >
            {state.documents.some((d) => d.id === doc.id) ? null : (
              <option value={doc.id}>{doc.name}</option>
            )}
            {state.documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="gear-job-picker">
          <span className="gear-sr-only">职业（切换会新建方案）</span>
          <GameAssetIcon
            source={jobIconUrl(doc.job)}
            className="gear-job-icon"
          />
          <select
            value={doc.job}
            onChange={(e) => run(() => vm.changeJob(e.target.value))}
          >
            {data.jobs.map((j) => (
              <option value={j.id} key={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </label>
        <span
          className={`gear-save-state ${state.saving === "error" ? "is-error" : ""}`}
          role="status"
        >
          {state.saving === "saved"
            ? "已保存"
            : state.saving === "saving"
              ? "正在保存…"
              : "保存失败"}
        </span>
        <div className="gear-command-actions">
          <div className="gear-history">
            <button
              aria-label="撤销"
              title="撤销"
              disabled={!state.canUndo}
              onClick={() => vm.undo()}
            >
              <ArrowCounterClockwise />
            </button>
            <button
              aria-label="重做"
              title="重做"
              disabled={!state.canRedo}
              onClick={() => vm.redo()}
            >
              <ArrowClockwise />
            </button>
          </div>
          <button onClick={() => run(() => vm.duplicate(`${doc.name} 副本`))}>
            <Copy />
            另存
          </button>
          <button onClick={() => setTransfer((v) => !v)}>导入 / 分享</button>
          <button onClick={() => run(() => vm.create("新配装"))}>新建</button>
        </div>
      </header>
      <details className="gear-context">
        <summary>
          <strong>方案设置</strong>
          <span>
            {job.name} · 等级 {doc.jobLevel} · 同步 {doc.syncLevel ?? "无"} ·{" "}
            {data.clans[doc.clan]}
          </span>
          <span className="gear-version">数据 {data.manifest.gameVersion}</span>
        </summary>
        <div className="gear-context-fields">
          <label>
            方案名
            <input
              aria-label="方案名"
              value={doc.name}
              maxLength={120}
              onChange={(e) =>
                vm.edit((d) => {
                  d.name = e.target.value;
                })
              }
            />
          </label>
          <label>
            等级
            <select
              value={doc.jobLevel}
              onChange={(e) =>
                vm.edit((d) => {
                  d.jobLevel = Number(e.target.value);
                  d.syncLevel = null;
                })
              }
            >
              {data.jobLevels.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            品级同步
            <select
              value={doc.syncLevel ?? ""}
              onChange={(e) =>
                vm.edit((d) => {
                  d.syncLevel = e.target.value ? Number(e.target.value) : null;
                })
              }
            >
              <option value="">无</option>
              {(data.syncLevels[doc.jobLevel] ?? []).map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            种族
            <select
              value={doc.clan}
              onChange={(e) =>
                vm.edit((d) => {
                  d.clan = Number(e.target.value);
                })
              }
            >
              {data.clans.map((clan, index) => (
                <option key={index} value={index}>
                  {clan}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
      {state.error && (
        <div className="gear-alert" role="alert">
          <div>
            <strong>
              {state.saving === "error"
                ? "方案保存失败，请重试。"
                : "操作未完成，当前方案已保留。"}
            </strong>
            <details>
              <summary>错误详情</summary>
              {state.error}
            </details>
          </div>
          {state.saving === "error" && (
            <button onClick={() => run(() => vm.save())}>
              <FloppyDisk />
              重试保存
            </button>
          )}
          <button aria-label="关闭错误提示" onClick={() => vm.clearError()}>
            <X />
          </button>
        </div>
      )}
      {transfer && (
        <section className="gear-transfer" aria-label="导入和分享">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              void vm
                .import(text)
                .then(() => {
                  setText("");
                  setTransfer(false);
                })
                .catch((error) => vm.report(error))
                .finally(() => setBusy(false));
            }}
          >
            <label>
              分享码或完整链接
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
            </label>
            <button className="gear-primary" disabled={busy} type="submit">
              {busy ? "正在导入…" : "导入为新方案"}
            </button>
          </form>
          <button
            disabled={state.evaluating}
            onClick={() =>
              run(async () => {
                const code = vm.share();
                if (!code) throw new Error("Select equipment before sharing.");
                await copyGearingText(code);
                setNotice(
                  "分享码已复制。将它添加到任意部署了 ffxiv-gearing 的网址后，用 ? 分隔即可分享。方案名和锁定设置不会包含在分享码中。",
                );
              })
            }
          >
            复制分享码
          </button>
          {notice && <p role="status">{notice}</p>}
        </section>
      )}
      <nav className="gear-compact-nav" aria-label="配装编辑区域">
        <button
          aria-pressed={workspace === "equipment"}
          onClick={() => setWorkspace("equipment")}
        >
          当前配装
        </button>
        <button
          aria-pressed={workspace === "candidates"}
          onClick={() => setWorkspace("candidates")}
        >
          选择装备
        </button>
        <button
          aria-pressed={workspace === "inspector" && panel === "stats"}
          onClick={() => {
            setPanel("stats");
            setWorkspace("inspector");
          }}
        >
          属性 / 比较
        </button>
        <button
          aria-pressed={workspace === "inspector" && panel === "optimize"}
          onClick={() => {
            setPanel("optimize");
            setWorkspace("inspector");
          }}
        >
          最优配装
        </button>
      </nav>
      <div className="gear-columns" data-compact={workspace}>
        <section className="gear-equipped" aria-label="当前配装">
          <div className="gear-section-heading">
            <h2>当前配装</h2>
            <span>
              平均品级 {state.evaluating ? "…" : (evaluation?.itemLevel ?? "—")}
            </span>
          </div>
          <div className="gear-equipped-list">
            {job.slots.map((slot) => {
              const equipped = evaluation?.slots[slot.key];
              const config = doc.equipment[slot.key as Slot];
              const id =
                config?.itemId ??
                (slot.key === "food"
                  ? doc.foodId
                  : slot.key === "potion"
                    ? doc.potionId
                    : null);
              return (
                <div
                  className={`gear-equipped-row ${state.selection === slot.key ? "is-active" : ""}`}
                  key={slot.key}
                >
                  <button
                    className="gear-equipped-select"
                    aria-pressed={state.selection === slot.key}
                    onClick={() => {
                      vm.select(slot.key);
                      setWorkspace("candidates");
                      setPanel("stats");
                    }}
                  >
                    <span className="gear-equipped-visual" aria-hidden="true">
                      {equipped ? (
                        <ItemIcon item={equipped.item} />
                      ) : (
                        <ItemIcon item={{ name: slot.name }} />
                      )}
                    </span>
                    <span className="gear-equipped-copy">
                      <span className="gear-equipped-name">
                        {equipped?.item.name ??
                          (id ? `未解析装备 #${id}` : "选择装备")}
                      </span>
                      <span className="gear-equipped-meta">
                        {slot.name}
                        {equipped && (
                          <>
                            <span aria-hidden="true">·</span>i
                            {equipped.item.level}
                            {equipped.item.hq && <small>HQ</small>}
                            {equipped.synced && <small>已同步</small>}
                          </>
                        )}
                      </span>
                    </span>
                    {config && (
                      <span className="gear-meld-track">
                        {Array.from({ length: 5 }, (_, index) => {
                          const count = equipped?.item.materiaAdvanced
                            ? 5
                            : (equipped?.item.materiaSlot ?? 0);
                          const meld = config.materias[index];
                          return (
                            <span
                              key={index}
                              className={`${index >= count ? "is-absent" : ""} ${index >= (equipped?.item.materiaSlot ?? 0) ? "is-advanced" : ""}`}
                              title={
                                meld?.stat
                                  ? `${data.statNames[meld.stat]} ${meld.grade}`
                                  : index < count
                                    ? "空魔晶石孔"
                                    : ""
                              }
                            >
                              {index < count
                                ? meld?.stat
                                  ? data.statNames[meld.stat].slice(0, 1)
                                  : "·"
                                : ""}
                            </span>
                          );
                        })}
                      </span>
                    )}
                  </button>
                  {config && (
                    <button
                      className="gear-lock"
                      aria-label={`${slot.name}装备锁定`}
                      aria-pressed={config.equipmentLocked}
                      title="装备锁定：优化时保留这件装备"
                      onClick={() =>
                        vm.configure(slot.key as Slot, (g) => {
                          g.equipmentLocked = !g.equipmentLocked;
                        })
                      }
                    >
                      <LockSimple
                        weight={config.equipmentLocked ? "fill" : "regular"}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            className="gear-clear-melds"
            onClick={() => vm.clearMateria()}
          >
            清除未锁定魔晶石
          </button>
        </section>
        <Candidates
          vm={vm}
          state={state}
          title={selectedName}
          optimizeScope={panel === "optimize"}
          onEditMelds={editMelds}
        />
        <aside className="gear-inspector" aria-label="属性与优化">
          <Inspector vm={vm} state={state} panel={panel} />
          {panel === "optimize" && <OptimizerActions vm={vm} state={state} />}
        </aside>
      </div>
      {meldOpen && <MeldDialog vm={vm} state={state} onClose={closeMelds} />}
      {state.preview && (
        <div className="gear-preview-action">
          <span>
            预览：<strong>{state.preview.name}</strong>
          </span>
          <span>{state.previewing ? "正在计算差异…" : "应用后可撤销"}</span>
          <button
            onClick={() => {
              setPanel("stats");
              setWorkspace("inspector");
            }}
          >
            查看差异
          </button>
          <button
            className="gear-primary"
            disabled={
              !state.previewEvaluation ||
              !!state.previewEvaluation.issues.length
            }
            onClick={() => vm.applyPreview()}
          >
            替换装备
            <ArrowRight />
          </button>
        </div>
      )}
      <footer className="gear-footer">
        <span>计算值为每威力伤害期望，不代表实战 DPS。</span>
        <a
          href="https://github.com/Asvel/ffxiv-gearing"
          target="_blank"
          rel="noreferrer"
        >
          ffxiv-gearing · MIT
        </a>
      </footer>
    </main>
  );
}
export type EditorState = ReturnType<GearingViewModel["getSnapshot"]>;
