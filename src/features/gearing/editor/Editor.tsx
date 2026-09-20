/** Gearset-first desktop workspace; candidate selection previews without mutating the saved draft. */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  LockSimple,
  FloppyDisk,
  Copy,
  X,
} from "@phosphor-icons/react";
import { GearingViewModel } from "./ViewModel";
import { copyGearingText } from "../utils/clipboard";
import { Candidates } from "./Candidates";
import { OptimizerActions } from "./OptimizerActions";
import { Inspector } from "./Inspector";
import { GameAssetIcon, ItemIcon } from "./ItemIcon";
import { MeldDialog } from "./MeldDialog";
import { PreviewActions } from "./PreviewActions";
import { ItemStats } from "./ItemStats";
import { ItemName } from "./ItemName";
import { NewGearset } from "./NewGearset";
import { UnsavedDialog } from "./UnsavedDialog";
import { jobIconUrl } from "./xivapiAssets";
import type { Slot } from "./types";
import "./editor.css";

/** Preserve anatomical column order independently of the catalog's slot order. */
const equipmentGroups = [
  { id: "weapons", slots: ["mainHand", "offHand"] },
  { id: "armor", slots: ["head", "body", "hands", "feet", "legs", "waist"] },
  {
    id: "accessories",
    slots: ["ears", "neck", "wrists", "ringLeft", "ringRight"],
  },
  { id: "extras", slots: ["soul", "food", "potion"] },
];

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
  const [pendingTransition, setPendingTransition] = useState<{
    label: string;
    action: () => Promise<unknown>;
  } | null>(null);
  const [feedback, setFeedback] = useState("");
  const meldTrigger = useRef<HTMLElement | null>(null);
  const allowNavigation = useRef(false);
  const restoreMeldFocus = useRef(false);
  const editMelds = (slot?: Slot) => {
    if (slot) vm.select(slot);
    meldTrigger.current = document.activeElement as HTMLElement;
    setMeldOpen(true);
  };
  const closeMelds = () => {
    restoreMeldFocus.current = true;
    setMeldOpen(false);
  };
  useEffect(() => {
    if (meldOpen || state.evaluating || !restoreMeldFocus.current) return;
    restoreMeldFocus.current = false;
    if (meldTrigger.current?.isConnected) meldTrigger.current.focus();
  }, [meldOpen, state.evaluating]);
  useEffect(() => {
    void vm.initialize();
    return () => vm.dispose();
  }, [vm]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (vm.hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest<HTMLAnchorElement>(
        ".app-navigation a, .app-brand",
      );
      if (
        !link ||
        link.hash === "#gearing" ||
        !vm.hasUnsavedChanges() ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingTransition({
        label: "离开配装页",
        action: async () => {
          allowNavigation.current = true;
          window.location.hash = link.hash;
        },
      });
    };
    const historyNavigation = (event: PopStateEvent | HashChangeEvent) => {
      if (
        allowNavigation.current ||
        !vm.hasUnsavedChanges() ||
        location.hash === "#gearing"
      )
        return;
      const hash = location.hash;
      event.stopImmediatePropagation();
      history.pushState(
        null,
        "",
        `${location.pathname}${location.search}#gearing`,
      );
      setPendingTransition({
        label: "离开配装页",
        action: async () => {
          allowNavigation.current = true;
          location.hash = hash;
        },
      });
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate, true);
    window.addEventListener("popstate", historyNavigation, true);
    window.addEventListener("hashchange", historyNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", navigate, true);
      window.removeEventListener("popstate", historyNavigation, true);
      window.removeEventListener("hashchange", historyNavigation, true);
    };
  }, [vm]);
  const run = (action: () => Promise<unknown>) => {
    void action().catch((error) => vm.report(error));
  };
  const transition = (label: string, action: () => Promise<unknown>) => {
    if (vm.hasUnsavedChanges()) setPendingTransition({ label, action });
    else run(action);
  };
  const continueTransition = async (save: boolean) => {
    if (!pendingTransition) return;
    if (save && !(await vm.save())) {
      setPendingTransition(null);
      return;
    }
    const action = pendingTransition.action;
    setPendingTransition(null);
    await action();
  };
  const { data, document: doc, evaluation } = state;
  const job = data?.jobs.find((j) => j.id === doc?.job);
  if (state.loading)
    return (
      <main className="gear-editor">
        <p role="status">正在打开配装目录…</p>
      </main>
    );
  if (data && !doc && (state.needsSetup || state.migrationIssue))
    return <NewGearset vm={vm} state={state} />;
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
          <button onClick={() => run(() => vm.initialize())}>
            重试打开配装
          </button>
        )}
      </main>
    );
  const selectedName =
    job.slots.find((s) => s.key === state.selection)?.name ?? state.selection;
  const meldableSlots = job.slots.filter(
    (slot) =>
      doc.equipment[slot.key as Slot] && evaluation?.slots[slot.key] != null,
  );
  const applyPreview = () => {
    const item = state.preview;
    vm.applyPreview();
    if (item && !vm.getSnapshot().preview)
      setFeedback(`${selectedName}已装备「${item.name}」。`);
  };
  return (
    <main className="gear-editor" aria-label="配装编辑器">
      <header className="gear-commandbar">
        <h1>配装</h1>
        <label className="gear-plan-picker">
          <span className="gear-sr-only">打开方案</span>
          <select
            value={doc.id}
            onChange={(e) => {
              setFeedback("");
              const id = e.target.value;
              transition("切换方案", () => vm.load(id));
            }}
          >
            {state.documents.some((d) => d.id === doc.id) ? null : (
              <option value={doc.id}>{doc.name}（未保存草稿）</option>
            )}
            {state.documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id === doc.id ? doc.name : d.name}
                {d.id === doc.id && vm.hasUnsavedChanges() ? "（未保存）" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="gear-job-picker">
          <span>职业</span>
          <GameAssetIcon
            source={jobIconUrl(doc.job)}
            className="gear-job-icon"
          />
          <select
            value={doc.job}
            onChange={(e) => {
              const next = e.target.value;
              if (
                Object.keys(doc.equipment).length ||
                doc.foodId ||
                doc.potionId
              )
                transition("为其他职业新建草稿", () => vm.changeJob(next));
              else run(() => vm.changeJob(next));
            }}
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
              : state.saving === "unsaved"
                ? "未保存修改"
                : "保存失败"}
        </span>
        <div className="gear-command-actions">
          <button
            className="gear-primary gear-save"
            disabled={state.saving === "saved" || state.saving === "saving"}
            onClick={() => run(() => vm.save())}
          >
            <FloppyDisk />
            保存方案
          </button>
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
          <button
            onClick={() =>
              transition("复制方案", () => vm.duplicate(`${doc.name} 副本`))
            }
          >
            <Copy />
            复制方案
          </button>
          <button onClick={() => setTransfer((v) => !v)}>导入 / 分享</button>
          <button
            onClick={() => transition("新建方案", () => vm.create("新配装"))}
          >
            新建
          </button>
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
              key={`${doc.id}:${doc.name}`}
              defaultValue={doc.name}
              maxLength={120}
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name)
                  vm.edit((d) => {
                    d.name = name;
                  });
                else e.target.value = doc.name;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
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
              transition("导入新方案", async () => {
                setBusy(true);
                try {
                  await vm.import(text);
                  setText("");
                  setTransfer(false);
                } finally {
                  setBusy(false);
                }
              });
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
                  "分享码已复制。粘贴到任意 ffxiv-gearing 地址的 ? 后即可打开配装。方案名和锁定设置不会包含在分享码中。",
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
          aria-pressed={workspace !== "inspector" && panel === "stats"}
          onClick={() => {
            setWorkspace("equipment");
            setPanel("stats");
          }}
        >
          配装
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
          aria-pressed={panel === "optimize"}
          onClick={() => {
            setPanel("optimize");
            setWorkspace("inspector");
          }}
        >
          最优配装
        </button>
      </nav>
      {state.running && workspace !== "inspector" && (
        <div className="gear-feedback" role="status">
          <span>正在计算最优配装…</span>
          <button
            onClick={() => {
              setPanel("optimize");
              setWorkspace("inspector");
            }}
          >
            查看计算
          </button>
          <button onClick={() => vm.cancel(true)}>取消计算</button>
        </div>
      )}
      {feedback && (
        <div className="gear-feedback" role="status">
          <span>{feedback}</span>
          <button
            disabled={!state.canUndo}
            onClick={() => {
              vm.undo();
              setFeedback("已撤销上一步修改。");
            }}
          >
            撤销
          </button>
          <button aria-label="关闭操作提示" onClick={() => setFeedback("")}>
            <X />
          </button>
        </div>
      )}
      <div className="gear-columns" data-compact={workspace}>
        <section className="gear-equipped" aria-label="当前配装">
          <div className="gear-section-heading">
            <h2>当前配装</h2>
            <span>
              平均品级 {state.evaluating ? "…" : (evaluation?.itemLevel ?? "—")}
            </span>
            <button
              className="gear-open-melds"
              disabled={state.evaluating || meldableSlots.length === 0}
              onClick={() => {
                const current = meldableSlots.find(
                  (slot) => slot.key === state.selection,
                );
                editMelds((current ?? meldableSlots[0])?.key as Slot);
              }}
            >
              魔晶石镶嵌
            </button>
          </div>
          <div className="gear-equipped-list">
            {equipmentGroups.map((group) => (
              <div
                className={`gear-equipped-group gear-equipped-${group.id}`}
                key={group.id}
              >
                {group.slots.flatMap((key) => {
                  const slot = job.slots.find(
                    (candidate) => candidate.key === key,
                  );
                  if (!slot) return [];
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
                      data-slot={slot.key}
                    >
                      <button
                        className="gear-equipped-select"
                        aria-pressed={state.selection === slot.key}
                        onClick={() => {
                          vm.select(slot.key);
                          setWorkspace("candidates");
                          setFeedback("");
                        }}
                      >
                        <span
                          className="gear-equipped-visual"
                          aria-hidden="true"
                        >
                          {equipped ? (
                            <ItemIcon item={equipped.item} />
                          ) : (
                            <ItemIcon item={{ name: slot.name }} />
                          )}
                        </span>
                        <span className="gear-equipped-copy">
                          <span className="gear-equipped-name">
                            {equipped ? (
                              <ItemName
                                item={equipped.item}
                                sources={data.sources}
                              />
                            ) : id ? (
                              `未解析装备 #${id}`
                            ) : (
                              "选择装备"
                            )}
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
                        <ItemStats
                          item={equipped}
                          data={data}
                          busy={state.evaluating}
                          label={slot.name}
                          inline
                        />
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
            ))}
          </div>
          <button
            className="gear-clear-melds"
            disabled={
              !Object.values(doc.equipment).some(
                (gear) =>
                  !gear.materiaLocked &&
                  gear.materias.some((meld) => meld.stat),
              )
            }
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
          onBack={() =>
            setWorkspace(panel === "optimize" ? "inspector" : "equipment")
          }
          onApply={applyPreview}
        />
        <aside className="gear-inspector" aria-label="属性与优化">
          {panel === "optimize" && (
            <div className="gear-current-item">
              <span>逐件排除不想使用的装备，浏览筛选不影响计算范围。</span>
              <button onClick={() => setWorkspace("candidates")}>
                选择参与优化的装备
              </button>
            </div>
          )}
          <Inspector vm={vm} state={state} panel={panel} />
          {panel === "stats" && (
            <PreviewActions vm={vm} state={state} onApply={applyPreview} />
          )}
          {panel === "optimize" && (
            <OptimizerActions
              vm={vm}
              state={state}
              onSaveProposal={() =>
                transition("另存优化方案", () =>
                  vm.saveProposal(`${doc.name} 优化`),
                )
              }
            />
          )}
        </aside>
      </div>
      {meldOpen && <MeldDialog vm={vm} state={state} onClose={closeMelds} />}
      {pendingTransition && (
        <UnsavedDialog
          name={doc.name}
          action={pendingTransition.label}
          busy={state.saving === "saving"}
          onCancel={() => setPendingTransition(null)}
          onDiscard={() => run(() => continueTransition(false))}
          onSave={() => run(() => continueTransition(true))}
        />
      )}
      <footer className="gear-footer">
        <span>
          {job.combat
            ? "计算值为每威力伤害期望，不代表实战 DPS。"
            : "属性包含已选食品与药品，品级同步时不计魔晶石。"}
        </span>
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
