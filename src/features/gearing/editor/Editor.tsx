/** Gearset-first desktop workspace; candidate selection previews without mutating the saved draft. */
import clsx from "clsx";
import {
  gearingControlClasses,
  gearingScreenReaderClasses,
  gearingAlertClasses,
} from "../utilityClasses";
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

/** Complete utility strings are shared without adding component CSS rules. */
const editorToolbarActionClasses =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-control bg-surface px-3 py-2 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected max-[767px]:shrink-0 pointer-coarse:min-h-11";
const editorToolbarFieldClasses =
  "flex items-center gap-2 max-[767px]:first:w-full";
const editorAttributeSelectClasses =
  "min-h-10 max-w-37.5 min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-2 text-ink pointer-coarse:min-h-11";
const editorTabClasses =
  "inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-none border-0 bg-transparent px-4.5 py-2 text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] [border-bottom:2px_solid_transparent] disabled:cursor-default disabled:opacity-100 aria-pressed:[border-bottom-color:var(--ors-color-accent)] aria-pressed:bg-transparent aria-pressed:font-semibold aria-pressed:text-accent max-[767px]:px-3.5";

/** Reused presentation strings stay static and are allocated once for this module. */
const editorPageClasses =
  "gear-editor mx-auto w-full max-w-400 px-5 py-5 text-[15px] text-ink max-[899px]:px-4 max-[899px]:py-4 max-[767px]:px-4 max-[767px]:py-3 max-[519px]:px-3 max-[519px]:py-4";

/** Feedback wraps its copy while keeping text and icon actions together at equal height. */
const editorFeedbackClasses =
  "gear-feedback flex flex-wrap items-center gap-2 border-b border-solid border-line p-3";
const editorFeedbackCopyClasses = "min-w-0 flex-[1_1_180px] wrap-anywhere";
const editorFeedbackActionsClasses = "flex shrink-0 items-stretch gap-2";

/** Preserve anatomical column order independently of the catalog's slot order. */
const equipmentGroups = [
  {
    id: "weapons",
    fullWidth: true,
    slots: ["mainHand", "offHand"],
  },
  {
    id: "armor",
    fullWidth: false,
    slots: ["head", "body", "hands", "feet", "legs", "waist"],
  },
  {
    id: "accessories",
    fullWidth: false,
    slots: ["ears", "neck", "wrists", "ringLeft", "ringRight"],
  },
  {
    id: "extras",
    fullWidth: true,
    slots: ["soul", "food", "potion"],
  },
];
/** Both equipment columns span the same parent tracks so populated slots grow together. */
const equipmentGroupRowSpanClasses = [
  "",
  "min-[768px]:row-span-1",
  "min-[768px]:row-span-2",
  "min-[768px]:row-span-3",
  "min-[768px]:row-span-4",
  "min-[768px]:row-span-5",
  "min-[768px]:row-span-6",
] as const;
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
    if (vm.hasUnsavedChanges())
      setPendingTransition({
        label,
        action,
      });
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
      <main className={editorPageClasses}>
        <p role="status">正在打开配装目录…</p>
      </main>
    );
  if (data && !doc && (state.needsSetup || state.migrationIssue))
    return <NewGearset vm={vm} state={state} />;
  if (!data || !doc || !job)
    return (
      <main className={editorPageClasses}>
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
          <button
            className={gearingControlClasses.button}
            onClick={() => run(() => vm.initialize())}
          >
            重试打开配装
          </button>
        )}
      </main>
    );
  const pairedEquipmentRowCount = Math.max(
    1,
    ...equipmentGroups
      .filter((group) => !group.fullWidth)
      .map(
        (group) =>
          group.slots.filter((key) =>
            job.slots.some((slot) => slot.key === key),
          ).length,
      ),
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
    <main className={editorPageClasses} aria-label="配装编辑器">
      <header className="gear-commandbar mb-5 flex flex-wrap items-center gap-3 rounded-panel border border-line bg-surface p-4 max-[767px]:gap-1.5">
        <h1 className="mr-2 text-2xl font-bold tracking-tight">配装</h1>
        <label className="gear-plan-picker flex max-w-65 min-w-32.5 flex-1 items-center gap-2 max-[767px]:max-w-none">
          <span className={gearingScreenReaderClasses}>打开方案</span>
          <select
            className="min-h-10 w-full min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-2 text-ink pointer-coarse:min-h-11"
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
        <label className="gear-job-picker flex items-center gap-1.5">
          <span>职业</span>
          <GameAssetIcon
            size="job"
            source={jobIconUrl(doc.job)}
            className="gear-job-icon"
          />
          <select
            className={gearingControlClasses.select}
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
          className={clsx(
            "gear-save-state [margin-right:auto] text-xs whitespace-nowrap text-muted",
            state.saving === "error" ? "is-error text-danger" : "",
          )}
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
        <div className="gear-command-actions flex items-center gap-2 max-[767px]:order-[2] max-[767px]:w-full max-[767px]:flex-wrap">
          <button
            className={
              "gear-primary gear-save inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-accent bg-accent px-3 py-2 text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover disabled:cursor-default disabled:border-line disabled:bg-surface disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected max-[767px]:shrink-0 pointer-coarse:min-h-11"
            }
            disabled={state.saving === "saved" || state.saving === "saving"}
            onClick={() => run(() => vm.save())}
          >
            <FloppyDisk className={gearingControlClasses.icon} />
            保存方案
          </button>
          <div className="gear-history flex gap-1">
            <button
              className={gearingControlClasses.button}
              aria-label="撤销"
              title="撤销"
              disabled={!state.canUndo}
              onClick={() => vm.undo()}
            >
              <ArrowCounterClockwise className={gearingControlClasses.icon} />
            </button>
            <button
              className={gearingControlClasses.button}
              aria-label="重做"
              title="重做"
              disabled={!state.canRedo}
              onClick={() => vm.redo()}
            >
              <ArrowClockwise className={gearingControlClasses.icon} />
            </button>
          </div>
          <button
            className={editorToolbarActionClasses}
            onClick={() =>
              transition("复制方案", () => vm.duplicate(`${doc.name} 副本`))
            }
          >
            <Copy className={gearingControlClasses.icon} />
            复制方案
          </button>
          <button
            className={editorToolbarActionClasses}
            onClick={() => setTransfer((v) => !v)}
          >
            导入 / 分享
          </button>
          <button
            className={editorToolbarActionClasses}
            onClick={() => transition("新建方案", () => vm.create("新配装"))}
          >
            新建
          </button>
        </div>
      </header>
      <details className="gear-context mx-0 mt-4.5 mb-5.5 rounded-panel border border-solid border-line bg-surface text-xs text-muted">
        <summary className="flex min-h-13 [list-style-position:inside] items-center gap-3 px-4 py-2">
          <strong className="shrink-0 text-sm whitespace-nowrap text-ink">
            方案设置
          </strong>
          <span className="last:shrink-0 last:whitespace-nowrap nth-[2]:min-w-0 nth-[2]:flex-1 nth-[2]:overflow-hidden nth-[2]:text-ellipsis nth-[2]:whitespace-nowrap">
            {job.name} · 等级 {doc.jobLevel} · 同步 {doc.syncLevel ?? "无"} ·{" "}
            {data.clans[doc.clan]}
          </span>
          <span className="gear-version [margin-left:auto] last:shrink-0 last:whitespace-nowrap nth-[2]:min-w-0 nth-[2]:flex-1 nth-[2]:overflow-hidden nth-[2]:text-ellipsis nth-[2]:whitespace-nowrap">
            数据 {data.manifest.gameVersion}
          </span>
        </summary>
        <div className="gear-context-fields flex flex-wrap items-center gap-4 border-t border-solid border-line p-4">
          <label className={editorToolbarFieldClasses}>
            方案名
            <input
              className="min-h-10 w-42.5 min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-2 text-ink max-[767px]:flex-1 pointer-coarse:min-h-11"
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
          <label className={editorToolbarFieldClasses}>
            等级
            <select
              className={editorAttributeSelectClasses}
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
          <label className={editorToolbarFieldClasses}>
            品级同步
            <select
              className={editorAttributeSelectClasses}
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
          <label className={editorToolbarFieldClasses}>
            种族
            <select
              className={editorAttributeSelectClasses}
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
        <div className={gearingAlertClasses} role="alert">
          <div className="flex-1">
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
            <button
              className={gearingControlClasses.button}
              onClick={() => run(() => vm.save())}
            >
              <FloppyDisk className={gearingControlClasses.icon} />
              重试保存
            </button>
          )}
          <button
            className={gearingControlClasses.button}
            aria-label="关闭错误提示"
            onClick={() => vm.clearError()}
          >
            <X className={gearingControlClasses.icon} />
          </button>
        </div>
      )}
      {transfer && (
        <section
          className="gear-transfer mb-4 border border-solid border-line bg-surface p-4"
          aria-label="导入和分享"
        >
          <form
            className="mb-2.5 flex flex-wrap gap-2"
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
            <label className="flex min-w-45 flex-1 items-center gap-2 max-[767px]:grid max-[767px]:w-full max-[767px]:flex-[auto]">
              分享码或完整链接
              <input
                className="min-h-10 min-w-0 flex-1 rounded-control border border-solid border-control bg-surface px-3 py-2 text-ink pointer-coarse:min-h-11"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
            </label>
            <button
              className={
                "gear-primary inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-accent bg-accent px-3 py-2 text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover disabled:cursor-default disabled:border-line disabled:bg-surface disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
              }
              disabled={busy}
              type="submit"
            >
              {busy ? "正在导入…" : "导入为新方案"}
            </button>
          </form>
          <button
            className={gearingControlClasses.button}
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
          {notice && (
            <p className="mt-3 leading-[1.7]" role="status">
              {notice}
            </p>
          )}
        </section>
      )}
      <nav
        className="gear-compact-nav mb-0 flex gap-1 overflow-x-auto border-b border-solid border-line"
        aria-label="配装编辑区域"
      >
        <button
          className={editorTabClasses}
          aria-pressed={workspace !== "inspector" && panel === "stats"}
          onClick={() => {
            setWorkspace("equipment");
            setPanel("stats");
          }}
        >
          配装
        </button>
        <button
          className={editorTabClasses}
          aria-pressed={workspace === "inspector" && panel === "stats"}
          onClick={() => {
            setPanel("stats");
            setWorkspace("inspector");
          }}
        >
          属性 / 比较
        </button>
        <button
          className={editorTabClasses}
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
        <div className={editorFeedbackClasses} role="status">
          <span className={editorFeedbackCopyClasses}>正在计算最优配装…</span>
          <div className={editorFeedbackActionsClasses}>
            <button
              className={gearingControlClasses.button}
              onClick={() => {
                setPanel("optimize");
                setWorkspace("inspector");
              }}
            >
              查看计算
            </button>
            <button
              className={gearingControlClasses.button}
              onClick={() => vm.cancel(true)}
            >
              取消计算
            </button>
          </div>
        </div>
      )}
      {feedback && (
        <div className={editorFeedbackClasses} role="status">
          <span className={editorFeedbackCopyClasses}>{feedback}</span>
          <div className={editorFeedbackActionsClasses}>
            <button
              className={gearingControlClasses.button}
              disabled={!state.canUndo}
              onClick={() => {
                vm.undo();
                setFeedback("已撤销上一步修改。");
              }}
            >
              撤销
            </button>
            <button
              className={gearingControlClasses.button}
              aria-label="关闭操作提示"
              onClick={() => setFeedback("")}
            >
              <X className={gearingControlClasses.icon} />
            </button>
          </div>
        </div>
      )}
      {/* Candidate lists own their viewport height; the desktop panel grows around its controls. */}
      <div
        className={
          'gear-columns group/gear-columns min-w-0 overflow-hidden rounded-panel border border-solid border-line min-[768px]:grid-rows-[minmax(0,_1fr)] min-[1200px]:data-[compact="candidates"]:min-h-[max(600px,_calc(100dvh_-_320px))] min-[1200px]:data-[compact="candidates"]:grid-cols-[320px_minmax(0,_1fr)] min-[1200px]:data-[compact=candidates]:grid min-[1200px]:data-[compact=candidates]:items-stretch [@media(min-width:_768px)_and_(max-width:_1199px)]:grid-cols-[230px_minmax(0,_1fr)]'
        }
        data-compact={workspace}
      >
        {/* The sidebar follows the shared height instead of sizing the grid from all equipped rows. */}
        <section
          className="gear-equipped min-w-0 bg-surface group-data-[compact=candidates]/gear-columns:hidden group-data-[compact=inspector]/gear-columns:hidden min-[768px]:min-h-0 min-[1200px]:group-data-[compact=candidates]/gear-columns:flex min-[1200px]:group-data-[compact=candidates]/gear-columns:min-h-0 min-[1200px]:group-data-[compact=candidates]/gear-columns:flex-col min-[1200px]:group-data-[compact=candidates]/gear-columns:border-r min-[1200px]:group-data-[compact=candidates]/gear-columns:border-solid min-[1200px]:group-data-[compact=candidates]/gear-columns:border-line min-[1200px]:group-data-[compact=candidates]/gear-columns:[contain:size]"
          aria-label="当前配装"
        >
          <div className="gear-section-heading flex min-h-11 flex-wrap items-center justify-start gap-2 border-b border-solid border-line bg-tool-soft px-3 py-2.5 text-tool">
            <h2 className="[margin-right:auto] text-lg font-semibold">
              当前配装
            </h2>
            <span className="text-xs text-muted">
              平均品级 {state.evaluating ? "…" : (evaluation?.itemLevel ?? "—")}
            </span>
            <button
              className="gear-open-melds inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-control border border-solid border-control bg-surface px-3 py-2 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
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
          <div className="gear-equipped-list grid grid-cols-2 gap-x-7 px-4 py-0 max-[767px]:grid-cols-[1fr] min-[1200px]:group-data-[compact=candidates]/gear-columns:block min-[1200px]:group-data-[compact=candidates]/gear-columns:min-h-0 min-[1200px]:group-data-[compact=candidates]/gear-columns:flex-1 min-[1200px]:group-data-[compact=candidates]/gear-columns:[scrollbar-gutter:stable] min-[1200px]:group-data-[compact=candidates]/gear-columns:grid-cols-1 min-[1200px]:group-data-[compact=candidates]/gear-columns:overflow-y-auto">
            {equipmentGroups.map((group) => (
              <div
                className={clsx(
                  "gear-equipped-group min-w-0 empty:hidden",
                  group.fullWidth
                    ? "col-span-full"
                    : "min-[768px]:grid min-[768px]:grid-rows-subgrid min-[1200px]:group-data-[compact=candidates]/gear-columns:block",
                  !group.fullWidth &&
                    equipmentGroupRowSpanClasses[pairedEquipmentRowCount],
                  `gear-equipped-${group.id}`,
                )}
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
                      className={clsx(
                        "gear-equipped-row relative border-b border-solid border-line",
                        state.selection === slot.key
                          ? "is-active bg-selected"
                          : "",
                      )}
                      key={slot.key}
                      data-slot={slot.key}
                    >
                      {/* Names, materia, and stats keep separate rows in every equipment column. */}
                      <button
                        className="gear-equipped-select grid h-full min-h-16.5 w-full grid-cols-1 content-start items-center justify-stretch gap-x-3 gap-y-1.5 rounded-none border-0 border-control bg-transparent py-4 pr-12 pl-14.5 text-left text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent max-[767px]:min-h-17.5 max-[767px]:pr-13 min-[1200px]:group-data-[compact=candidates]/gear-columns:grid-cols-1"
                        aria-pressed={state.selection === slot.key}
                        onClick={() => {
                          vm.select(slot.key);
                          setWorkspace("candidates");
                          setFeedback("");
                        }}
                      >
                        <span
                          className="gear-equipped-visual absolute top-4 left-1.5 grid transform-none place-items-center text-muted"
                          aria-hidden="true"
                        >
                          {equipped ? (
                            <ItemIcon item={equipped.item} />
                          ) : (
                            <ItemIcon
                              item={{
                                name: slot.name,
                              }}
                            />
                          )}
                        </span>
                        <span className="gear-equipped-copy min-w-0">
                          <span className="gear-equipped-name block leading-[1.5] [overflow-wrap:anywhere]">
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
                          <span className="gear-equipped-meta flex flex-wrap items-center gap-1.5 text-xs text-muted tabular-nums">
                            {slot.name}
                            {equipped && (
                              <>
                                <span aria-hidden="true">·</span>i
                                {equipped.item.level}
                                {equipped.item.hq && (
                                  <small className="text-[0.65rem] font-medium">
                                    HQ
                                  </small>
                                )}
                                {equipped.synced && (
                                  <small className="text-[0.65rem] font-medium">
                                    已同步
                                  </small>
                                )}
                              </>
                            )}
                          </span>
                        </span>
                        {config && (
                          <span className="gear-meld-track mt-1.5 grid grid-cols-[repeat(5,_16px)] gap-[3px] self-center min-[1200px]:group-data-[compact=candidates]/gear-columns:col-start-1">
                            {Array.from(
                              {
                                length: 5,
                              },
                              (_, index) => {
                                const count = equipped?.item.materiaAdvanced
                                  ? 5
                                  : (equipped?.item.materiaSlot ?? 0);
                                const meld = config.materias[index];
                                return (
                                  <span
                                    key={index}
                                    className={clsx(
                                      "rounded-[3px] border border-solid border-control text-center text-[10px] leading-[16px]",
                                      index >= count
                                        ? "is-absent [visibility:hidden]"
                                        : "",
                                      index >= (equipped?.item.materiaSlot ?? 0)
                                        ? "is-advanced [border-style:dashed]"
                                        : "",
                                    )}
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
                              },
                            )}
                          </span>
                        )}
                        <ItemStats
                          item={equipped}
                          data={data}
                          busy={state.evaluating}
                          label={slot.name}
                          inline
                          layout="equipped-select"
                        />
                      </button>
                      {config && (
                        <button
                          className="gear-lock absolute top-1/2 right-0 inline-flex min-h-8 w-7 transform-[translateY(-50%)] items-center justify-center gap-1.5 rounded-control border-0 border-control bg-transparent p-0 text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-default disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent max-[767px]:min-h-10 max-[767px]:w-10"
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
                            className={gearingControlClasses.icon}
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
            className="gear-clear-melds m-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-control bg-surface px-3 py-2 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected min-[1200px]:group-data-[compact=candidates]/gear-columns:shrink-0 min-[1200px]:group-data-[compact=candidates]/gear-columns:self-start pointer-coarse:min-h-11"
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
          visible={workspace === "candidates"}
          vm={vm}
          state={state}
          title={selectedName}
          optimizeScope={panel === "optimize"}
          onBack={() =>
            setWorkspace(panel === "optimize" ? "inspector" : "equipment")
          }
          onApply={applyPreview}
        />
        <aside
          className="gear-inspector flex min-w-0 flex-col bg-surface group-data-[compact=candidates]/gear-columns:hidden group-data-[compact=equipment]/gear-columns:hidden min-[768px]:min-h-0"
          aria-label="属性与优化"
        >
          {panel === "optimize" && (
            <div className="gear-current-item flex flex-wrap items-center gap-3 border-b border-line p-3">
              <span className="flex-[1_1_180px] [overflow-wrap:anywhere]">
                逐件排除不想使用的装备，浏览筛选不影响计算范围。
              </span>
              <button
                className={gearingControlClasses.button}
                onClick={() => setWorkspace("candidates")}
              >
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
      <footer className="gear-footer flex flex-wrap justify-between gap-4 px-0 py-3 text-[0.7rem] text-muted">
        <span>
          {job.combat
            ? "计算值为每威力伤害期望，不代表实战 DPS。"
            : "属性包含已选食品与药品，品级同步时不计魔晶石。"}
        </span>
        <a
          className="text-[inherit] [text-underline-offset:3px]"
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
