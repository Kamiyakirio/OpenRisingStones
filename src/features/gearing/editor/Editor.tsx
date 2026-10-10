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
      <main
        className={
          "max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 gear-editor mx-auto w-full max-w-[1600px] px-5 py-5 text-[15px] text-ink [&_*]:box-border [&_button]:min-h-10 [&_button]:rounded-lg [&_button]:border [&_button]:border-control [&_button]:bg-surface [&_button]:px-3 [&_button]:py-2 [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-control [&_select]:bg-surface [&_select]:px-3 [&_select]:py-2 [&_input:not([type=checkbox])]:min-h-10 [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-control [&_input:not([type=checkbox])]:bg-surface [&_input:not([type=checkbox])]:px-3 [&_input:not([type=checkbox])]:py-2 [&_button]:cursor-pointer [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[6px] [&_button:hover:not(:disabled)]:bg-hover [&_button:disabled]:cursor-default [&_button:disabled]:text-disabled [&_button[aria-pressed=true]]:text-accent [&_button[aria-pressed=true]]:bg-selected [&_input]:min-w-0 [&_select]:min-w-0 [&_svg]:w-[18px] [&_svg]:h-[18px] [&_h1]:m-0 [&_h2]:m-0 [&_p]:m-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:text-sm [&_h2]:font-semibold [&_label]:flex [&_label]:gap-[8px] [&_label]:items-center [&_small]:text-muted [&_table]:w-full [&_table]:tabular-nums [&_th]:border-b [&_th]:border-solid [&_th]:border-line [&_th]:text-right [&_th]:whitespace-nowrap [&_td]:border-b [&_td]:border-solid [&_td]:border-line [&_td]:text-right [&_td]:whitespace-nowrap [&_th]:text-muted [&_th]:font-normal [&_th:first-child]:text-left [&_td:first-child]:text-left [&_summary]:cursor-pointer [&_summary]:min-h-[28px] [@media(pointer:_coarse)]:[&_button]:min-h-[44px] [@media(pointer:_coarse)]:[&_select]:min-h-[44px] [@media(pointer:_coarse)]:[&_input:not([type=checkbox])]:min-h-[44px] [&_:is(_.gear-save-state,_.gear-context,_.gear-section-heading_>_span,_.gear-slot-label,_.gear-equipped-meta,_.gear-candidate-filters,_.gear-check,_.gear-item-description,_.gear-key-stats_dt,_.gear-muted,_.gear-footer,_.gear-apply-summary_)]:text-[13px] [&_th]:text-[13px] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline-offset:2px] [&&&&_input]:[caret-color:var(--ors-color-accent)] [&&&&_select]:max-w-[100%] [&&&&_svg]:shrink-[0] [&&&&_table]:[border-collapse:collapse] [&&&&_th]:p-[12px_10px] [&&&&_td]:p-[12px_10px] [&&&&_details]:m-[12px_0] [&&&&_summary]:text-[0.8rem] [@media(max-width:_767px)]:[&&&&]:p-[12px_16px]"
        }
      >
        <p role="status">正在打开配装目录…</p>
      </main>
    );
  if (data && !doc && (state.needsSetup || state.migrationIssue))
    return <NewGearset vm={vm} state={state} />;
  if (!data || !doc || !job)
    return (
      <main
        className={
          "max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 gear-editor mx-auto w-full max-w-[1600px] px-5 py-5 text-[15px] text-ink [&_*]:box-border [&_button]:min-h-10 [&_button]:rounded-lg [&_button]:border [&_button]:border-control [&_button]:bg-surface [&_button]:px-3 [&_button]:py-2 [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-control [&_select]:bg-surface [&_select]:px-3 [&_select]:py-2 [&_input:not([type=checkbox])]:min-h-10 [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-control [&_input:not([type=checkbox])]:bg-surface [&_input:not([type=checkbox])]:px-3 [&_input:not([type=checkbox])]:py-2 [&_button]:cursor-pointer [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[6px] [&_button:hover:not(:disabled)]:bg-hover [&_button:disabled]:cursor-default [&_button:disabled]:text-disabled [&_button[aria-pressed=true]]:text-accent [&_button[aria-pressed=true]]:bg-selected [&_input]:min-w-0 [&_select]:min-w-0 [&_svg]:w-[18px] [&_svg]:h-[18px] [&_h1]:m-0 [&_h2]:m-0 [&_p]:m-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:text-sm [&_h2]:font-semibold [&_label]:flex [&_label]:gap-[8px] [&_label]:items-center [&_small]:text-muted [&_table]:w-full [&_table]:tabular-nums [&_th]:border-b [&_th]:border-solid [&_th]:border-line [&_th]:text-right [&_th]:whitespace-nowrap [&_td]:border-b [&_td]:border-solid [&_td]:border-line [&_td]:text-right [&_td]:whitespace-nowrap [&_th]:text-muted [&_th]:font-normal [&_th:first-child]:text-left [&_td:first-child]:text-left [&_summary]:cursor-pointer [&_summary]:min-h-[28px] [@media(pointer:_coarse)]:[&_button]:min-h-[44px] [@media(pointer:_coarse)]:[&_select]:min-h-[44px] [@media(pointer:_coarse)]:[&_input:not([type=checkbox])]:min-h-[44px] [&_:is(_.gear-save-state,_.gear-context,_.gear-section-heading_>_span,_.gear-slot-label,_.gear-equipped-meta,_.gear-candidate-filters,_.gear-check,_.gear-item-description,_.gear-key-stats_dt,_.gear-muted,_.gear-footer,_.gear-apply-summary_)]:text-[13px] [&_th]:text-[13px] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline-offset:2px] [&&&&_input]:[caret-color:var(--ors-color-accent)] [&&&&_select]:max-w-[100%] [&&&&_svg]:shrink-[0] [&&&&_table]:[border-collapse:collapse] [&&&&_th]:p-[12px_10px] [&&&&_td]:p-[12px_10px] [&&&&_details]:m-[12px_0] [&&&&_summary]:text-[0.8rem] [@media(max-width:_767px)]:[&&&&]:p-[12px_16px]"
        }
      >
        <h1 className="text-2xl font-bold tracking-tight">配装</h1>
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
    <main
      className={
        "max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 gear-editor mx-auto w-full max-w-[1600px] px-5 py-5 text-[15px] text-ink [&_*]:box-border [&_button]:min-h-10 [&_button]:rounded-lg [&_button]:border [&_button]:border-control [&_button]:bg-surface [&_button]:px-3 [&_button]:py-2 [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-control [&_select]:bg-surface [&_select]:px-3 [&_select]:py-2 [&_input:not([type=checkbox])]:min-h-10 [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-control [&_input:not([type=checkbox])]:bg-surface [&_input:not([type=checkbox])]:px-3 [&_input:not([type=checkbox])]:py-2 [&_button]:cursor-pointer [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[6px] [&_button:hover:not(:disabled)]:bg-hover [&_button:disabled]:cursor-default [&_button:disabled]:text-disabled [&_button[aria-pressed=true]]:text-accent [&_button[aria-pressed=true]]:bg-selected [&_input]:min-w-0 [&_select]:min-w-0 [&_svg]:w-[18px] [&_svg]:h-[18px] [&_h1]:m-0 [&_h2]:m-0 [&_p]:m-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:text-sm [&_h2]:font-semibold [&_label]:flex [&_label]:gap-[8px] [&_label]:items-center [&_small]:text-muted [&_table]:w-full [&_table]:tabular-nums [&_th]:border-b [&_th]:border-solid [&_th]:border-line [&_th]:text-right [&_th]:whitespace-nowrap [&_td]:border-b [&_td]:border-solid [&_td]:border-line [&_td]:text-right [&_td]:whitespace-nowrap [&_th]:text-muted [&_th]:font-normal [&_th:first-child]:text-left [&_td:first-child]:text-left [&_summary]:cursor-pointer [&_summary]:min-h-[28px] [@media(pointer:_coarse)]:[&_button]:min-h-[44px] [@media(pointer:_coarse)]:[&_select]:min-h-[44px] [@media(pointer:_coarse)]:[&_input:not([type=checkbox])]:min-h-[44px] [&_:is(_.gear-save-state,_.gear-context,_.gear-section-heading_>_span,_.gear-slot-label,_.gear-equipped-meta,_.gear-candidate-filters,_.gear-check,_.gear-item-description,_.gear-key-stats_dt,_.gear-muted,_.gear-footer,_.gear-apply-summary_)]:text-[13px] [&_th]:text-[13px] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline-offset:2px] [&&&&_input]:[caret-color:var(--ors-color-accent)] [&&&&_select]:max-w-[100%] [&&&&_svg]:shrink-[0] [&&&&_table]:[border-collapse:collapse] [&&&&_th]:p-[12px_10px] [&&&&_td]:p-[12px_10px] [&&&&_details]:m-[12px_0] [&&&&_summary]:text-[0.8rem] [@media(max-width:_767px)]:[&&&&]:p-[12px_16px]"
      }
      aria-label="配装编辑器"
    >
      <header className="gear-commandbar mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4 [&_h1]:mr-[8px] max-[767px]:gap-[6px]">
        <h1 className="text-2xl font-bold tracking-tight">配装</h1>
        <label
          className={
            "gear-plan-picker min-w-[130px] max-w-[260px] [&_select]:w-full [&&&&]:flex-[1] [@media(max-width:_767px)]:[&&&&]:max-w-[none]"
          }
        >
          <span
            className={
              "gear-sr-only absolute w-[1px] h-[1px] overflow-hidden whitespace-nowrap [&&&&]:[clip-path:inset(50%)]"
            }
          >
            打开方案
          </span>
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
        <label className={"gear-job-picker [&&&&]:gap-[6px]!"}>
          <span>职业</span>
          <GameAssetIcon
            source={jobIconUrl(doc.job)}
            className={
              "gear-job-icon [.gear-item-icon&]:w-[24px] [.gear-item-icon&]:h-[24px] [.gear-item-icon&_img]:w-[24px] [.gear-item-icon&_img]:h-[24px] [.gear-item-icon&&&&]:[flex-basis:24px] [.gear-item-icon&&&&]:[background:transparent]"
            }
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
          className={`[&&&&]:[margin-right:auto] text-xs text-muted whitespace-nowrap gear-save-state ${state.saving === "error" ? "is-error [.curl-import-message&]:text-danger [.theme-dark_.curl-import-message&]:text-danger [.teleport-alert&]:border-danger [.teleport-alert&]:text-danger [.teleport-alert&]:bg-surface [&&&&]:[color:var(--ors-color-danger)]!" : ""}`}
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
        <div
          className={
            "gear-command-actions flex items-center gap-[8px] max-[767px]:w-full max-[767px]:flex-wrap [@media(max-width:_767px)]:[&&&&]:[order:2] [@media(max-width:_767px)]:[&&&&_>_button]:flex-[0_0_auto]"
          }
        >
          <button
            className="gear-primary gear-save [.gear-editor_&]:bg-accent [.gear-editor_&]:text-on-accent [.gear-editor_&]:border-accent [.gear-editor_&:hover:not(:disabled)]:bg-accent-hover [.gear-editor_&:disabled]:bg-surface [.gear-editor_&:disabled]:border-line"
            disabled={state.saving === "saved" || state.saving === "saving"}
            onClick={() => run(() => vm.save())}
          >
            <FloppyDisk />
            保存方案
          </button>
          <div className="gear-history flex gap-[4px]">
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
      <details
        className={
          "gear-context border border-solid border-line rounded-[var(--ors-radius-panel)] bg-surface text-xs text-muted [&_>_summary]:flex [&_>_summary]:items-center [&_>_summary]:gap-3 [&_>_summary_strong]:shrink-0 [&_>_summary_strong]:whitespace-nowrap [&_>_summary_>_span:last-child]:shrink-0 [&_>_summary_>_span:last-child]:whitespace-nowrap [&_>_summary_>_span:nth-child(2)]:flex-1 [&_>_summary]:min-h-[52px] [&_>_summary_>_span:nth-child(2)]:min-w-0 [&_>_summary_>_span:nth-child(2)]:overflow-hidden [&_>_summary_>_span:nth-child(2)]:whitespace-nowrap [&_>_summary_strong]:text-ink [&_>_summary_strong]:text-sm [&_input]:w-[170px] [&_select]:max-w-[150px] [&&&&]:m-[18px_0_22px] [&&&&_>_summary]:p-[8px_16px] [&&&&_>_summary]:[list-style-position:inside] [&&&&_>_summary_>_span:nth-child(2)]:[text-overflow:ellipsis] [@media(max-width:_767px)]:[&&&&_input]:flex-[1]"
        }
      >
        <summary>
          <strong>方案设置</strong>
          <span>
            {job.name} · 等级 {doc.jobLevel} · 同步 {doc.syncLevel ?? "无"} ·{" "}
            {data.clans[doc.clan]}
          </span>
          <span className={"gear-version [&&&&]:[margin-left:auto]"}>
            数据 {data.manifest.gameVersion}
          </span>
        </summary>
        <div className="gear-context-fields flex items-center gap-[16px] flex-wrap p-[16px] border-t border-solid border-line max-[767px]:[&_label:first-child]:w-full">
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
        <div
          className={
            "gear-alert flex gap-[12px] bg-surface border border-solid border-danger p-[12px] mb-[12px] [&&&&]:[align-items:start] [&&&&_>_div]:flex-[1]"
          }
          role="alert"
        >
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
        <section
          className={
            "gear-transfer p-[16px] mb-[16px] bg-surface border border-solid border-line [&_form]:flex [&_form]:gap-[8px] [&_form]:flex-wrap [&_form]:mb-[10px] [&_label]:min-w-[180px] [&_p]:mt-[12px] max-[767px]:[&_label]:grid max-[767px]:[&_label]:w-full [&&&&_label]:flex-[1] [&&&&_input]:flex-[1] [&&&&_p]:leading-[1.7] [@media(max-width:_767px)]:[&&&&_label]:flex-[auto]"
          }
          aria-label="导入和分享"
        >
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
            <button
              className="gear-primary [.gear-editor_&]:bg-accent [.gear-editor_&]:text-on-accent [.gear-editor_&]:border-accent [.gear-editor_&:hover:not(:disabled)]:bg-accent-hover [.gear-editor_&:disabled]:bg-surface [.gear-editor_&:disabled]:border-line"
              disabled={busy}
              type="submit"
            >
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
      <nav
        className={
          'gear-compact-nav flex gap-[4px] mb-0 overflow-x-auto border-b border-solid border-line [&_button]:min-h-[48px] [&_button]:border-0 [&_button]:rounded-none [&_button]:text-muted [&_button[aria-pressed=true]]:text-accent [&_button[aria-pressed=true]]:font-semibold max-[767px]:[&_button]:px-[14px] [&&&&_button]:flex-[0_0_auto] [&&&&_button]:p-[8px_18px] [&&&&_button]:[border-bottom:2px_solid_transparent] [&&&&_button]:[background:transparent] [&&&&_button[aria-pressed="true"]]:[border-bottom-color:var(--ors-color-accent)] [&&&&_button[aria-pressed="true"]]:[background:transparent]'
        }
        aria-label="配装编辑区域"
      >
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
        <div
          className={
            "gear-feedback [&&&&_>_span]:flex-[1_1_180px] [&&&&_>_span]:[overflow-wrap:anywhere]"
          }
          role="status"
        >
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
        <div
          className={
            "gear-feedback [&&&&_>_span]:flex-[1_1_180px] [&&&&_>_span]:[overflow-wrap:anywhere]"
          }
          role="status"
        >
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
      {/* Keep equipment beside candidates only when both columns can fit. */}
      <div
        className={
          'gear-columns min-w-0 border border-solid border-line rounded-[var(--ors-radius-panel)] overflow-hidden [&_>_section]:bg-surface [&_>_section]:min-w-0 [&_>_aside]:bg-surface [&_>_aside]:min-w-0 [&[data-compact=equipment]_>_:not(.gear-equipped)]:hidden [&[data-compact=candidates]_>_:not(.gear-candidates)]:hidden [&[data-compact=inspector]_>_:not(.gear-inspector)]:hidden min-[1200px]:[&[data-compact=candidates]]:grid min-[1200px]:[&[data-compact=candidates]]:items-stretch min-[768px]:[&_>_section]:min-h-0 min-[768px]:[&_>_aside]:min-h-0 [@media(min-width:_1200px)]:[&&&&[data-compact="candidates"]]:grid-cols-[320px_minmax(0,_1fr)] [@media(min-width:_1200px)]:[&&&&[data-compact="candidates"]]:h-[max(600px,_calc(100dvh_-_320px))] [@media(min-width:_768px)_and_(max-width:_1199px)]:[&&&&]:grid-cols-[230px_minmax(0,_1fr)] [@media(min-width:_768px)]:[&&&&]:grid-rows-[minmax(0,_1fr)]'
        }
        data-compact={workspace}
      >
        <section
          className={
            "gear-equipped min-[1200px]:[.gear-columns[data-compact=candidates]_>_&]:flex min-[1200px]:[.gear-columns[data-compact=candidates]_>_&]:flex-col min-[1200px]:[.gear-columns[data-compact=candidates]_>_&]:min-h-0 min-[1200px]:[.gear-columns[data-compact=candidates]_>_&]:border-r min-[1200px]:[.gear-columns[data-compact=candidates]_>_&]:border-solid min-[1200px]:[.gear-columns[data-compact=candidates]_>_&]:border-line"
          }
          aria-label="当前配装"
        >
          <div
            className={
              "gear-section-heading bg-tool-soft text-tool flex justify-between items-center gap-[8px] min-h-[44px] border-b border-solid border-line [&_>_span]:text-xs [&_>_span]:text-muted [.gear-inspector_&]:pl-0 [.gear-inspector_&]:pr-0 [.gear-equipped_>_&]:justify-start [.gear-equipped_>_&]:flex-wrap [.gear-candidates_&]:flex-wrap [.gear-candidates_>_&]:pt-[4px] [.gear-candidates_>_&]:pb-[4px] [&&&&]:p-[10px_12px] [.gear-equipped_>_&&&&_h2]:[margin-right:auto] [@media(min-width:_768px)]:[.gear-candidates_>_&&&&]:shrink-[0]"
            }
          >
            <h2 className="text-lg font-semibold">当前配装</h2>
            <span>
              平均品级 {state.evaluating ? "…" : (evaluation?.itemLevel ?? "—")}
            </span>
            <button
              className={"gear-open-melds [&&&&]:flex-[0_0_auto]"}
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
          <div
            className={
              'gear-equipped-list grid gap-x-[28px] min-[1200px]:[.gear-columns[data-compact=candidates]_&]:block min-[1200px]:[.gear-columns[data-compact=candidates]_&]:min-h-0 min-[1200px]:[.gear-columns[data-compact=candidates]_&]:overflow-y-auto [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&&&]:p-[0_16px] [@media(min-width:_1200px)]:[.gear-columns[data-compact="candidates"]_&&&&]:grid-cols-[minmax(0,_1fr)] [@media(min-width:_1200px)]:[.gear-columns[data-compact="candidates"]_&&&&]:flex-[1] [@media(min-width:_1200px)]:[.gear-columns[data-compact="candidates"]_&&&&]:[scrollbar-gutter:stable] [@media(max-width:_767px)]:[&&&&]:grid-cols-[1fr]'
            }
          >
            {equipmentGroups.map((group) => (
              <div
                className={`[&&&&.gear-equipped-weapons]:[grid-column:1_/_-1] [&&&&.gear-equipped-extras]:[grid-column:1_/_-1] min-w-0 [&:empty]:hidden gear-equipped-group gear-equipped-${group.id}`}
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
                      className={`relative border-b border-solid border-line gear-equipped-row ${state.selection === slot.key ? "is-active [.benchmark-scale-rail_>_&_>_span]:border-accent [.benchmark-scale-rail_>_&_>_span]:text-on-accent [.benchmark-scale-rail_>_&_>_span]:bg-accent [.gear-equipped-row&]:bg-selected [.teleport-mode-switch_button&]:border-line [.teleport-mode-switch_button&]:text-accent [.teleport-mode-switch_button&]:bg-surface [.benchmark-scale-rail_>_&&&&_>_span]:shadow-[0_4px_12px_color-mix(in_srgb,_var(--ors-color-accent)_24%,_transparent)] [.teleport-mode-switch_button&&&&]:shadow-[none]" : ""}`}
                      key={slot.key}
                      data-slot={slot.key}
                    >
                      {/* Names, materia, and stats keep separate rows in every equipment column. */}
                      <button
                        className={
                          'gear-equipped-select [.gear-editor_&]:grid [.gear-editor_&]:gap-x-[12px] [.gear-editor_&]:items-center [.gear-editor_&]:text-left [.gear-editor_&]:border-0 [.gear-editor_&]:rounded-none [.gear-editor_&]:w-full [.gear-editor_&]:min-h-[66px] max-[767px]:min-h-[70px] max-[767px]:[.gear-editor_&]:pr-[52px] [.gear-editor_&&&&]:grid-cols-[minmax(0,_1fr)] [.gear-editor_&&&&]:[background:transparent] [.gear-editor_&&&&]:p-[16px_48px_16px_58px] [.gear-editor_&&&&]:[justify-content:stretch] [@media(min-width:_1200px)]:[.gear-columns[data-compact="candidates"]_&&&&]:grid-cols-[minmax(0,_1fr)]'
                        }
                        aria-pressed={state.selection === slot.key}
                        onClick={() => {
                          vm.select(slot.key);
                          setWorkspace("candidates");
                          setFeedback("");
                        }}
                      >
                        <span
                          className={
                            "gear-equipped-visual absolute grid place-items-center text-muted [&&&&]:left-[6px] [&&&&]:top-[16px] [&&&&]:transform-none"
                          }
                          aria-hidden="true"
                        >
                          {equipped ? (
                            <ItemIcon item={equipped.item} />
                          ) : (
                            <ItemIcon item={{ name: slot.name }} />
                          )}
                        </span>
                        <span className="gear-equipped-copy min-w-0">
                          <span
                            className={
                              "gear-equipped-name block [&&&&]:leading-[1.5] [&&&&]:[overflow-wrap:anywhere]"
                            }
                          >
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
                          <span
                            className={
                              "gear-equipped-meta flex flex-wrap gap-[6px] items-center text-muted text-xs tabular-nums [&_small]:font-medium [&&&&_small]:text-[0.65rem]"
                            }
                          >
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
                          <span
                            className={
                              'gear-meld-track grid gap-[3px] [&_>_span]:text-center [&_>_span]:border [&_>_span]:border-solid [&_>_span]:border-control [&_>_span]:rounded-[3px] mt-[6px] [&&&&]:grid-cols-[repeat(5,_16px)] [&&&&]:[align-self:center] [&&&&_>_span]:text-[10px] [&&&&_>_span]:leading-[16px] [@media(min-width:_1200px)]:[.gear-columns[data-compact="candidates"]_&&&&]:[grid-column:1]'
                            }
                          >
                            {Array.from({ length: 5 }, (_, index) => {
                              const count = equipped?.item.materiaAdvanced
                                ? 5
                                : (equipped?.item.materiaSlot ?? 0);
                              const meld = config.materias[index];
                              return (
                                <span
                                  key={index}
                                  className={`${index >= count ? "is-absent [.gear-meld-track_&&&&]:[visibility:hidden] [.gear-candidate-melds_&&&&]:[visibility:hidden]" : ""}  ${index >= (equipped?.item.materiaSlot ?? 0) ? "is-advanced [.gear-meld-track_&&&&]:[border-style:dashed] [.gear-candidate-melds_&&&&]:[border-style:dashed]" : ""}`}
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
                          className={
                            "gear-lock [.gear-editor_&]:absolute [.gear-editor_&]:min-h-[32px] [.gear-editor_&]:w-[28px] [.gear-editor_&]:border-0 [.gear-editor_&]:p-0 [.gear-editor_&]:text-muted [.gear-editor_&[aria-pressed=true]]:text-accent max-[767px]:[.gear-editor_&]:w-[40px] max-[767px]:[.gear-editor_&]:min-h-[40px] [.gear-editor_&&&&]:right-[0] [.gear-editor_&&&&]:top-[50%] [.gear-editor_&&&&]:transform-[translateY(-50%)] [.gear-editor_&&&&]:[background:transparent]"
                          }
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
            className={
              'gear-clear-melds m-[12px] [@media(min-width:_1200px)]:[.gear-columns[data-compact="candidates"]_&&&&]:[align-self:start] [@media(min-width:_1200px)]:[.gear-columns[data-compact="candidates"]_&&&&]:shrink-[0]'
            }
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
        <aside className="gear-inspector flex flex-col" aria-label="属性与优化">
          {panel === "optimize" && (
            <div
              className={
                "gear-current-item flex flex-wrap items-center gap-3 border-b border-line p-3 [&&&&_>_span]:flex-[1_1_180px] [&&&&_>_span]:[overflow-wrap:anywhere]"
              }
            >
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
      <footer
        className={
          "gear-footer flex justify-between gap-[16px] flex-wrap text-muted [&&&&]:text-[0.7rem] [&&&&]:p-[12px_0] [&&&&_a]:[color:inherit] [&&&&_a]:[text-underline-offset:3px]"
        }
      >
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
