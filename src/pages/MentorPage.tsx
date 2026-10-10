/** Mentor roulette ledger with live tracking, corrections, and read-only migration. */
import {
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  PencilSimple,
  Plus,
  PlugsConnected,
  SignOut,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { RiskDialog } from "../shared/components/RiskDialog";
import { prepareGameBridge } from "../shared/game-bridge/api";
import { isTauriRuntime } from "../shared/utils/runtime";
import { MentorAnalysis } from "../features/mentor/components/MentorAnalysis";
import { MentorJob } from "../features/mentor/components/MentorJob";
import { MentorRecordFilters } from "../features/mentor/components/MentorRecordFilters";
import {
  DEFAULT_MENTOR_FILTERS,
  filterMentorRecords,
} from "../features/mentor/utils/recordFilters";
import {
  addManualRecord,
  correctRecord,
  deleteRecord,
  getMentorMonitorStatus,
  importLegacy,
  listMentorRecords,
  observeMentor,
  previewLegacy,
  startMentorMonitor,
  stopMentorMonitor,
  type LegacyPreview,
  type MentorRecord,
  type MentorResult,
  type MonitorStatus,
} from "../features/mentor/api/mentorApi";
import {
  grantMentorConsent,
  hasMentorConsent,
} from "../features/mentor/utils/consent";
import dutyNames from "../features/mentor/data/dutyNames.json";

const names = dutyNames as Record<string, string>;
const resultLabel: Record<MentorResult, string> = {
  completed: "已完成",
  exited: "已退出",
  needs_review: "待核对",
  legacy_unknown: "结果未标记",
};
const sourceLabel = {
  game: "游戏自动记录",
  manual: "手动补录",
  legacy_site: "旧站迁移",
};
const dateTime = (value: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
const dayLabel = (value: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
const localInputDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};
const readError = (reason: unknown) =>
  reason instanceof Error
    ? reason.message
    : typeof reason === "string"
      ? reason
      : "操作失败，请重试。";
const readLegacyError = (reason: unknown) => {
  const detail = readError(reason);
  if (detail.includes("Legacy login rejected the credentials"))
    return "旧站拒绝了登录信息。请核对邮箱和密码，确认能在旧站正常登录。";
  const loginStatus = detail.match(/Legacy login failed \(HTTP (\d+)\)/);
  if (loginStatus)
    return `旧站登录接口返回 HTTP ${loginStatus[1]}。请稍后重试，或确认账号能在浏览器中登录。`;
  const recordStatus = detail.match(
    /Legacy record page (\d+) failed \(HTTP (\d+)\)/,
  );
  if (recordStatus)
    return `登录后读取旧站第 ${recordStatus[1]} 页失败（HTTP ${recordStatus[2]}）。本地记录未更改。`;
  return `旧站迁移失败：${detail}`;
};

export function MentorPage() {
  const [records, setRecords] = useState<MentorRecord[]>([]);
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [riskOpen, setRiskOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [view, setView] = useState<"history" | "analysis" | "data">("history");
  const [filters, setFilters] = useState({ ...DEFAULT_MENTOR_FILTERS });
  const [filterNow, setFilterNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setFilterNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editResult, setEditResult] = useState<MentorResult>("completed");
  const [editNote, setEditNote] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({
    characterName: "",
    dutyName: "",
    date: localInputDate(),
    result: "completed" as MentorResult,
    note: "",
  });
  const [legacyEmail, setLegacyEmail] = useState("");
  const [legacyPassword, setLegacyPassword] = useState("");
  const [legacyCharacter, setLegacyCharacter] = useState("");
  const [legacyCompleted, setLegacyCompleted] = useState(false);
  const [preview, setPreview] = useState<LegacyPreview | null>(null);

  const refreshRecords = useCallback(async () => {
    try {
      setRecords(await listMentorRecords());
    } catch (reason) {
      setError(readError(reason));
    }
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void listMentorRecords()
      .then(setRecords)
      .catch((reason) => setError(readError(reason)));
    void getMentorMonitorStatus()
      .then(setStatus)
      .catch((reason) => setError(readError(reason)));
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void observeMentor(setStatus, () => void refreshRecords())
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch((reason) => setError(readError(reason)));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [refreshRecords]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const bridge = await prepareGameBridge();
      if (!bridge.capabilities.includes("mentor_duty_read"))
        throw new Error(
          "当前游戏版本暂不支持导随自动识别。请更新游戏桥接数据后重试。",
        );
      setStatus(await startMentorMonitor());
      setFeedback("已开始监测指导者随机任务。");
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  }, []);

  const requestStart = () =>
    hasMentorConsent() ? void start() : setRiskOpen(true);
  const confirmRisk = () => {
    setStorageError(!grantMentorConsent());
    setRiskOpen(false);
    void start();
  };
  const stop = async () => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await stopMentorMonitor());
      setFeedback("已停止自动监测。未确认结果的副本会标为待核对。");
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  const totals = useMemo(
    () => ({
      all: records.length,
      completed: records.filter((record) => record.result === "completed")
        .length,
      exited: records.filter((record) => record.result === "exited").length,
      review: records.filter(
        (record) =>
          record.result === "needs_review" ||
          record.result === "legacy_unknown",
      ).length,
    }),
    [records],
  );
  const visible = useMemo(
    () => filterMentorRecords(records, filters, filterNow),
    [records, filters, filterNow],
  );
  const grouped = useMemo(() => {
    const groups = new Map<string, MentorRecord[]>();
    for (const record of visible) {
      const day = dayLabel(record.startedAtMs);
      groups.set(day, [...(groups.get(day) ?? []), record]);
    }
    return [...groups];
  }, [visible]);
  const active = records.find((record) => record.id === status?.activeRecordId);

  const submitManual = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const time = new Date(manual.date).getTime();
      if (!Number.isFinite(time)) throw new Error("请输入有效的进入时间。");
      await addManualRecord({
        characterId: "",
        characterName: manual.characterName,
        dutyName: manual.dutyName,
        jobId: null,
        jobName: null,
        startedAtMs: time,
        result: manual.result,
        note: manual.note,
      });
      setManualOpen(false);
      setManual({
        characterName: manual.characterName,
        dutyName: "",
        date: localInputDate(),
        result: "completed",
        note: "",
      });
      setFeedback("已补录一条记录。");
      await refreshRecords();
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };
  const saveCorrection = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await correctRecord(id, editResult, editNote);
      setExpanded(null);
      setFeedback("记录已更新。");
      await refreshRecords();
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };
  const removeRecord = async (id: string) => {
    if (!window.confirm("删除这条记录？此操作无法撤销。")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteRecord(id);
      setExpanded(null);
      setFeedback("记录已删除。");
      await refreshRecords();
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };
  const fetchLegacy = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(await previewLegacy(legacyEmail, legacyPassword));
      setFeedback("读取完成。请核对预览后保存到本地。");
    } catch (reason) {
      setError(readLegacyError(reason));
    } finally {
      setLegacyPassword("");
      setBusy(false);
    }
  };
  const saveLegacy = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importLegacy(
        preview.token,
        legacyCharacter,
        legacyCompleted,
      );
      setPreview(null);
      setFeedback(
        `已导入 ${result.importedCount} 条，跳过 ${result.skippedCount} 条重复记录。`,
      );
      await refreshRecords();
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };
  const exportBackup = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { schemaVersion: 1, exportedAt: new Date().toISOString(), records },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mentor-records-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <main
      className={
        'mx-auto w-full px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 mentor-page max-w-[1600px] pb-16 [&_button]:min-h-[40px] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[8px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[8px] [&_button]:bg-surface [&_button]:cursor-pointer [&_button_svg]:w-[18px] [&_button_svg]:h-[18px] [&_input:not([type=checkbox])]:w-full [&_input:not([type=checkbox])]:min-h-[40px] [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-solid [&_input:not([type=checkbox])]:border-control [&_input:not([type=checkbox])]:rounded-[8px] [&_input:not([type=checkbox])]:bg-surface [&_input:not([type=checkbox])]:text-ink [&_select]:w-full [&_select]:min-h-[40px] [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[8px] [&_select]:bg-surface [&_select]:text-ink [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-solid [&_textarea]:border-control [&_textarea]:rounded-[8px] [&_textarea]:bg-surface [&_textarea]:text-ink [&_textarea]:min-h-[72px] [&_label]:grid [&_label]:gap-[6px] [&_label]:font-semibold [&&&&_button]:p-[8px_14px] [&&&&_button:hover:not(:disabled)]:[background:var(--surface-2)] [&&&&_button:disabled]:opacity-[0.55] [&&&&_button_svg]:flex-[none] [&&&&_button:focus-visible]:[outline:2px_solid_var(--accent)] [&&&&_button:focus-visible]:[outline-offset:3px] [&&&&_input:focus-visible]:[outline:2px_solid_var(--accent)] [&&&&_input:focus-visible]:[outline-offset:3px] [&&&&_select:focus-visible]:[outline:2px_solid_var(--accent)] [&&&&_select:focus-visible]:[outline-offset:3px] [&&&&_textarea:focus-visible]:[outline:2px_solid_var(--accent)] [&&&&_textarea:focus-visible]:[outline-offset:3px] [&&&&_input:not([type="checkbox"])]:p-[8px_12px] [&&&&_select]:p-[8px_12px] [&&&&_textarea]:p-[8px_12px] [&&&&_textarea]:[resize:vertical] [@media(max-width:_600px)]:[&&&&]:p-[24px_18px_72px]'
      }
    >
      <header
        className={
          "mentor-heading [&_h1]:text-tool flex items-start justify-between [&_h1]:m-0 [&_p]:text-muted max-[850px]:flex-wrap mb-6 flex-wrap gap-5 border-b border-line pb-5 [&&&&_p]:m-[4px_0_0]"
        }
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            指导者随机任务记录
          </h1>
          <p>从游戏中识别导随，在副本完成或退出时留下清楚的结果。</p>
        </div>
        <div className="mentor-heading-actions flex items-center gap-[14px] flex-wrap max-[600px]:w-full max-[600px]:justify-between">
          <span
            className={`[&&&&_span]:rounded-[50%] inline-flex items-center gap-[8px] text-muted whitespace-nowrap text-sm [&_span]:w-[8px] [&_span]:h-[8px] [&_span]:bg-muted mentor-live-badge ${status?.running ? "is-on [.mentor-live-badge&]:text-success [.mentor-live-badge&_span]:bg-success" : ""}`}
          >
            <span />
            {status?.running ? "自动监测中" : "未监测"}
          </span>
          {status?.running ? (
            <button type="button" disabled={busy} onClick={() => void stop()}>
              <SignOut />
              停止监测
            </button>
          ) : (
            <button
              className="mentor-primary [.mentor-page_&]:text-on-accent [.mentor-page_&]:bg-accent [.mentor-page_&]:border-accent [.mentor-page_&]:font-semibold [.mentor-page_&:hover:not(:disabled)]:bg-accent-hover"
              type="button"
              disabled={busy}
              onClick={requestStart}
            >
              {busy ? (
                <SpinnerGap
                  className={
                    "mentor-spin [&&&&]:animate-[mentor-spin_1s_linear_infinite] [@media(prefers-reduced-motion:_reduce)]:[&&&&]:animate-[none]"
                  }
                />
              ) : (
                <PlugsConnected />
              )}
              连接并监测
            </button>
          )}
        </div>
      </header>
      {!isTauriRuntime() && (
        <p
          className={
            "mentor-message flex items-center gap-[8px] rounded-[8px] bg-surface [&&&&]:m-[18px_0_0] [&&&&]:p-[10px_14px]"
          }
        >
          自动记录需要桌面版。仍可浏览页面设计。
        </p>
      )}
      {error && (
        <p
          className={
            "mentor-error flex items-center gap-[8px] rounded-[8px] bg-surface text-danger border border-solid border-danger [&_svg]:w-[20px] [&_svg]:h-[20px] [&&&&]:m-[18px_0_0] [&&&&]:p-[10px_14px] [&&&&_svg]:flex-[none]"
          }
          role="alert"
        >
          <WarningCircle />
          {error}
        </p>
      )}
      {feedback && (
        <p
          className={
            "mentor-feedback flex items-center gap-[8px] rounded-[8px] bg-surface text-success border border-solid border-success [&_svg]:w-[20px] [&_svg]:h-[20px] [&&&&]:m-[18px_0_0] [&&&&]:p-[10px_14px] [&&&&_svg]:flex-[none]"
          }
          role="status"
        >
          <CheckCircle />
          {feedback}
        </p>
      )}

      <section
        className={
          "mentor-session mt-[28px] border border-solid border-line rounded-[12px] bg-surface [@media(max-width:_600px)]:[&&&&]:p-[18px] [&&&&]:p-[22px_26px_18px]"
        }
        aria-label="当前导随进度"
      >
        <div
          className={
            'mentor-session-flow grid gap-[12px] [&_>_div]:relative [&_>_div]:grid [&_>_div]:gap-x-[12px] [&_>_div]:text-muted [&_>_div]:font-semibold [&_>_div:not(:last-child)::after]:absolute [&_>_div:not(:last-child)::after]:w-[20px] [&_>_div:not(:last-child)::after]:h-[1px] [&_>_div:not(:last-child)::after]:bg-line [&_>_div_>_span:last-child]:text-[13px] [&_>_div_>_span:last-child]:font-normal [&_>_div_>_span:last-child]:text-muted max-[600px]:gap-[6px] max-[600px]:[&_>_div]:gap-x-[5px] max-[600px]:[&_>_div]:text-[13px] max-[600px]:[&_>_div:not(:last-child)::after]:hidden max-[600px]:[&_>_div_>_span:last-child]:text-xs [&&&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&&&_>_div]:grid-cols-[16px_minmax(0,_1fr)] [&&&&_>_div]:[align-content:start] [&&&&_>_div:not(:last-child)::after]:[content:""] [&&&&_>_div:not(:last-child)::after]:top-[7px] [&&&&_>_div:not(:last-child)::after]:left-[calc(100%_-_8px)] [&&&&_>_div_>_span:last-child]:[grid-column:2] [@media(max-width:_600px)]:[&&&&_>_div]:grid-cols-[13px_minmax(0,_1fr)]'
          }
        >
          <div
            className={
              status?.phase === "queued"
                ? "current [.mentor-session-flow_&]:text-ink"
                : status?.phase === "in_duty"
                  ? "passed"
                  : ""
            }
          >
            <span
              className={
                "mentor-step-dot w-[11px] h-[11px] mt-[5px] bg-surface [.mentor-session-flow_.current_&]:border-accent [.mentor-session-flow_.current_&]:bg-accent [.mentor-session-flow_.passed_&]:border-success [.mentor-session-flow_.passed_&]:bg-success [&&&&]:[grid-row:span_2] [&&&&]:[border:2px_solid_var(--ors-color-control-line)] [&&&&]:rounded-[50%] [.mentor-session-flow_.current_&&&&]:shadow-[0_0_0_4px_var(--accent-soft)]"
              }
            />
            排队<span>指导者随机任务</span>
          </div>
          <div
            className={
              status?.phase === "in_duty"
                ? "current [.mentor-session-flow_&]:text-ink"
                : ""
            }
          >
            <span
              className={
                "mentor-step-dot w-[11px] h-[11px] mt-[5px] bg-surface [.mentor-session-flow_.current_&]:border-accent [.mentor-session-flow_.current_&]:bg-accent [.mentor-session-flow_.passed_&]:border-success [.mentor-session-flow_.passed_&]:bg-success [&&&&]:[grid-row:span_2] [&&&&]:[border:2px_solid_var(--ors-color-control-line)] [&&&&]:rounded-[50%] [.mentor-session-flow_.current_&&&&]:shadow-[0_0_0_4px_var(--accent-soft)]"
              }
            />
            副本
            <span>
              {active?.dutyId
                ? (names[String(active.dutyId)] ?? active.dutyName)
                : "等待进入"}
            </span>
          </div>
          <div>
            <span
              className={
                "mentor-step-dot w-[11px] h-[11px] mt-[5px] bg-surface [.mentor-session-flow_.current_&]:border-accent [.mentor-session-flow_.current_&]:bg-accent [.mentor-session-flow_.passed_&]:border-success [.mentor-session-flow_.passed_&]:bg-success [&&&&]:[grid-row:span_2] [&&&&]:[border:2px_solid_var(--ors-color-control-line)] [&&&&]:rounded-[50%] [.mentor-session-flow_.current_&&&&]:shadow-[0_0_0_4px_var(--accent-soft)]"
              }
            />
            结果<span>完成或退出后记录</span>
          </div>
        </div>
        {active && (
          <div className="mentor-session-job mt-[18px] text-sm">
            <MentorJob jobId={active.jobId} jobName={active.jobName} />
          </div>
        )}
        <p
          className={
            "mentor-session-caption text-muted text-sm [&&&&]:m-[18px_0_0]"
          }
        >
          {status?.phase === "in_duty"
            ? `正在记录 ${active?.characterName ?? "当前角色"} 的副本；完成信号或退出后会更新结果。`
            : status?.phase === "queued"
              ? "已识别导随排队，等待进入副本。"
              : status?.phase === "error"
                ? "监测中断。未确认结果的副本已标为待核对。"
                : status?.phase === "disconnected"
                  ? "游戏连接已断开。重新连接后可继续监测。"
                  : status?.running
                    ? "等待指导者随机任务排队。普通副本不会被记作导随。"
                    : "连接运行中的 FF14，开始自动监测。离开此页面后仍会继续。"}
        </p>
      </section>

      <div
        className={
          'mentor-tabs flex gap-[24px] mt-[30px] border-b border-solid border-line [.mentor-page_&_button]:min-h-[44px] [.mentor-page_&_button]:border-0 [.mentor-page_&_button]:rounded-none [.mentor-page_&_button]:text-muted [.mentor-page_&_button[aria-selected=true]]:text-ink [.mentor-page_&_button[aria-selected=true]]:font-semibold [&&&&]:[align-items:end] [.mentor-page_&&&&_button]:p-[8px_2px] [.mentor-page_&&&&_button]:[border-bottom:2px_solid_transparent] [.mentor-page_&&&&_button]:[background:transparent] [.mentor-page_&&&&_button[aria-selected="true"]]:[border-bottom-color:var(--accent)]'
        }
        role="tablist"
        aria-label="记录页面"
      >
        <button
          role="tab"
          aria-selected={view === "history"}
          onClick={() => setView("history")}
        >
          记录
        </button>
        <button
          role="tab"
          aria-selected={view === "analysis"}
          onClick={() => setView("analysis")}
        >
          数据分析
        </button>
        <button
          role="tab"
          aria-selected={view === "data"}
          onClick={() => setView("data")}
        >
          数据管理
        </button>
      </div>
      {view === "analysis" ? (
        <MentorAnalysis
          records={records}
          activeRecordId={status?.running ? status.activeRecordId : null}
        />
      ) : view === "history" ? (
        <>
          <div
            className={
              "mentor-summary flex gap-[36px] flex-wrap border-b border-solid border-line [&_span]:inline-flex [&_span]:items-baseline [&_span]:gap-[9px] [&_span]:text-muted [&_span]:whitespace-nowrap [&_strong]:text-ink [&_strong]:tabular-nums [.mentor-preview_&]:pt-0 [&&&&]:p-[20px_0_22px] [&&&&_strong]:text-[1.3rem] [&&&&_strong]:leading-[1] [@media(max-width:_600px)]:[&&&&]:gap-[15px_23px]"
            }
            aria-label="记录统计"
          >
            <span>
              <strong>{totals.all}</strong>全部记录
            </span>
            <span>
              <strong>{totals.completed}</strong>已完成
            </span>
            <span>
              <strong>{totals.exited}</strong>已退出
            </span>
            <span>
              <strong>{totals.review}</strong>待核对或未标记
            </span>
          </div>
          <section className="mentor-history mt-[30px]">
            <div
              className={
                "mentor-section-heading flex justify-between gap-[24px] [&_h2]:m-0 [&_p]:text-muted items-center max-[850px]:flex-wrap [&&&&_p]:m-[4px_0_0]"
              }
            >
              <div>
                <h2 className="text-lg font-semibold">历史记录</h2>
                <p>完成和退出分别统计；旧站记录可在详情里补充结果。</p>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen((open) => !open)}
              >
                <Plus />
                补录遗漏
              </button>
            </div>
            {manualOpen && (
              <form
                className={
                  "mentor-manual mt-[20px] p-[22px] border border-solid border-line rounded-[12px] bg-surface [&_>_label]:mt-[16px] [&&&&_h3]:m-[0_0_16px]"
                }
                onSubmit={(event) => void submitManual(event)}
              >
                <h3 className="text-base font-semibold">补录一条导随</h3>
                <div
                  className={
                    "mentor-form-grid grid gap-[16px] [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_600px)]:[&&&&]:grid-cols-[1fr]"
                  }
                >
                  <label>
                    角色名称
                    <input
                      required
                      maxLength={120}
                      value={manual.characterName}
                      onChange={(event) =>
                        setManual({
                          ...manual,
                          characterName: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    副本名称
                    <input
                      required
                      maxLength={160}
                      value={manual.dutyName}
                      onChange={(event) =>
                        setManual({ ...manual, dutyName: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    进入时间
                    <input
                      required
                      type="datetime-local"
                      value={manual.date}
                      onChange={(event) =>
                        setManual({ ...manual, date: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    结果
                    <select
                      value={manual.result}
                      onChange={(event) =>
                        setManual({
                          ...manual,
                          result: event.target.value as MentorResult,
                        })
                      }
                    >
                      <option value="completed">已完成</option>
                      <option value="exited">已退出</option>
                      <option value="needs_review">待核对</option>
                    </select>
                  </label>
                </div>
                <label>
                  备注
                  <textarea
                    maxLength={500}
                    rows={2}
                    value={manual.note}
                    onChange={(event) =>
                      setManual({ ...manual, note: event.target.value })
                    }
                  />
                </label>
                <div className="mentor-form-actions flex justify-end gap-[10px] mt-[18px]">
                  <button type="button" onClick={() => setManualOpen(false)}>
                    取消
                  </button>
                  <button
                    className="mentor-primary [.mentor-page_&]:text-on-accent [.mentor-page_&]:bg-accent [.mentor-page_&]:border-accent [.mentor-page_&]:font-semibold [.mentor-page_&:hover:not(:disabled)]:bg-accent-hover"
                    type="submit"
                    disabled={busy}
                  >
                    保存记录
                  </button>
                </div>
              </form>
            )}
            <MentorRecordFilters
              records={records}
              filters={filters}
              count={visible.length}
              onChange={setFilters}
              onRefresh={() => void refreshRecords()}
            />
            {grouped.length === 0 ? (
              <div
                className={
                  "mentor-empty text-center text-muted [&_h3]:m-0 [&_h3]:text-ink [&&&&]:p-[64px_20px] [&&&&_p]:m-[6px_0_18px]"
                }
              >
                <h3 className="text-base font-semibold">
                  {records.length
                    ? "没有符合条件的记录"
                    : "下一次导随会记在这里"}
                </h3>
                <p>
                  {records.length
                    ? "试试清除搜索或更换筛选条件。"
                    : "也可以从旧站迁移已有记录，或手动补录。"}
                </p>
                {!records.length && (
                  <button type="button" onClick={() => setView("data")}>
                    迁移旧站记录 <ArrowRight />
                  </button>
                )}
              </div>
            ) : (
              grouped.map(([day, rows]) => (
                <div
                  className={
                    "mentor-day mt-[26px] [&_>_h3]:text-muted [&_>_h3]:text-[13px] [&_>_h3]:font-semibold [&&&&_>_h3]:m-[0_0_9px]"
                  }
                  key={day}
                >
                  <h3 className="text-base font-semibold">{day}</h3>
                  <div className="mentor-records border-t border-solid border-line">
                    {rows.map((record) => {
                      const duty = record.dutyId
                        ? (names[String(record.dutyId)] ?? record.dutyName)
                        : record.dutyName;
                      const open = expanded === record.id;
                      return (
                        <div
                          className="mentor-record border-b border-solid border-line"
                          key={record.id}
                        >
                          <button
                            className={
                              "mentor-record-main [.mentor-page_&]:grid [.mentor-page_&]:w-full [.mentor-page_&]:min-h-[70px] [.mentor-page_&]:items-center [.mentor-page_&]:gap-[16px] [.mentor-page_&]:border-0 [.mentor-page_&]:rounded-none [.mentor-page_&]:text-left [&_time]:text-muted [&_time]:text-sm [&_time]:tabular-nums max-[600px]:[.mentor-page_&]:gap-[9px] max-[600px]:[&_>_svg]:hidden [.mentor-page_&&&&]:grid-cols-[60px_minmax(0,_1fr)_100px_20px] [.mentor-page_&&&&]:p-[9px_6px] [.mentor-page_&&&&]:[background:transparent] [.mentor-page_&&&&:hover]:[background:var(--surface-2)] [@media(max-width:_600px)]:[.mentor-page_&&&&]:grid-cols-[46px_minmax(0,_1fr)_76px]"
                            }
                            type="button"
                            aria-expanded={open}
                            onClick={() => {
                              setExpanded(open ? null : record.id);
                              setEditResult(record.result);
                              setEditNote(record.note);
                            }}
                          >
                            <time>
                              {new Intl.DateTimeFormat("zh-CN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(record.startedAtMs)}
                            </time>
                            <span
                              className={
                                "mentor-record-title min-w-0 font-semibold overflow-hidden whitespace-nowrap [&_small]:flex [&_small]:items-center [&_small]:gap-[12px] [&_small]:text-muted [&_small]:text-[13px] [&_small]:font-normal [&_small]:overflow-hidden [&&&&]:[text-overflow:ellipsis] [&&&&_small]:[text-overflow:ellipsis]"
                              }
                            >
                              {duty}
                              <small>
                                {record.characterName || "未指定角色"}
                                <MentorJob
                                  jobId={record.jobId}
                                  jobName={record.jobName}
                                />
                              </small>
                            </span>
                            <span
                              className={`text-[13px] font-semibold whitespace-nowrap [&.result-completed]:text-success [&.result-exited]:text-warning [&.result-needs_review]:text-muted [&.result-legacy_unknown]:text-muted mentor-result result-${record.result}`}
                            >
                              {resultLabel[record.result]}
                            </span>
                            <PencilSimple aria-hidden="true" />
                          </button>
                          {open && (
                            <div
                              className={
                                "mentor-record-detail bg-surface [&_dl]:flex [&_dl]:flex-wrap [&_dl_div]:flex [&_dl_div]:gap-[8px] [&_dt]:text-muted [&_dd]:m-0 [@media(max-width:_600px)]:[&&&&]:p-[18px] [&&&&]:p-[18px_18px_20px_82px] [&&&&_dl]:gap-[20px_30px] [&&&&_dl]:m-[0_0_18px]"
                              }
                            >
                              <dl>
                                <div>
                                  <dt>进入</dt>
                                  <dd>{dateTime(record.startedAtMs)}</dd>
                                </div>
                                <div>
                                  <dt>结束</dt>
                                  <dd>
                                    {record.endedAtMs
                                      ? dateTime(record.endedAtMs)
                                      : "未记录"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>来源</dt>
                                  <dd>{sourceLabel[record.source]}</dd>
                                </div>
                              </dl>
                              <div
                                className={
                                  "mentor-form-grid grid gap-[16px] [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_600px)]:[&&&&]:grid-cols-[1fr]"
                                }
                              >
                                <label>
                                  结果
                                  <select
                                    value={editResult}
                                    onChange={(event) =>
                                      setEditResult(
                                        event.target.value as MentorResult,
                                      )
                                    }
                                  >
                                    <option value="completed">已完成</option>
                                    <option value="exited">已退出</option>
                                    <option value="needs_review">待核对</option>
                                    <option value="legacy_unknown">
                                      结果未标记
                                    </option>
                                  </select>
                                </label>
                                <label>
                                  备注
                                  <textarea
                                    maxLength={500}
                                    rows={2}
                                    value={editNote}
                                    onChange={(event) =>
                                      setEditNote(event.target.value)
                                    }
                                  />
                                </label>
                              </div>
                              <div className="mentor-form-actions flex justify-end gap-[10px] mt-[18px]">
                                <button
                                  className={
                                    "mentor-delete [.mentor-page_&]:text-danger [.mentor-page_&&&&]:[margin-right:auto] [.mentor-page_&&&&]:[border-color:transparent] [.mentor-page_&&&&]:[background:transparent]"
                                  }
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void removeRecord(record.id)}
                                >
                                  删除记录
                                </button>
                                <button
                                  className="mentor-primary [.mentor-page_&]:text-on-accent [.mentor-page_&]:bg-accent [.mentor-page_&]:border-accent [.mentor-page_&]:font-semibold [.mentor-page_&:hover:not(:disabled)]:bg-accent-hover"
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void saveCorrection(record.id)}
                                >
                                  保存修改
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      ) : (
        <section className="mentor-data mt-[30px]">
          <div
            className={
              "mentor-section-heading flex justify-between gap-[24px] [&_h2]:m-0 [&_p]:text-muted items-center max-[850px]:flex-wrap [&&&&_p]:m-[4px_0_0]"
            }
          >
            <div>
              <h2 className="text-lg font-semibold">数据管理</h2>
              <p>从旧站读取历史记录，先预览，再保存到本地。</p>
            </div>
          </div>
          <div
            className={
              "mentor-data-block max-w-[740px] border-b border-solid border-line [&_>_p]:text-muted [&&&&]:p-[30px_0] [&&&&_h3]:m-[0_0_5px] [&&&&_>_p]:m-[0_0_20px]"
            }
          >
            <h3 className="text-base font-semibold">迁移旧站记录</h3>
            <p>
              使用旧站账号登录并逐页读取记录。不会调用旧站会冻结账号的导出功能；密码和会话不会保存。
            </p>
            <form
              className={
                "mentor-legacy-form grid gap-[12px] [&&&&]:grid-cols-[1fr_1fr_auto] [&&&&]:[align-items:end] [@media(max-width:_850px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_850px)]:[&&&&_button]:[grid-column:1_/_-1] [@media(max-width:_850px)]:[&&&&_button]:[justify-self:start] [@media(max-width:_600px)]:[&&&&]:grid-cols-[1fr] [@media(max-width:_600px)]:[&&&&_button]:[grid-column:1]"
              }
              onSubmit={(event) => void fetchLegacy(event)}
            >
              <label>
                旧站邮箱
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={legacyEmail}
                  onChange={(event) => setLegacyEmail(event.target.value)}
                />
              </label>
              <label>
                旧站密码
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={legacyPassword}
                  onChange={(event) => setLegacyPassword(event.target.value)}
                />
              </label>
              <button
                className="mentor-primary [.mentor-page_&]:text-on-accent [.mentor-page_&]:bg-accent [.mentor-page_&]:border-accent [.mentor-page_&]:font-semibold [.mentor-page_&:hover:not(:disabled)]:bg-accent-hover"
                type="submit"
                disabled={busy}
              >
                {busy ? (
                  <SpinnerGap
                    className={
                      "mentor-spin [&&&&]:animate-[mentor-spin_1s_linear_infinite] [@media(prefers-reduced-motion:_reduce)]:[&&&&]:animate-[none]"
                    }
                  />
                ) : (
                  <DownloadSimple />
                )}
                登录并读取
              </button>
            </form>
            {preview && (
              <div
                className={
                  "mentor-preview mt-[20px] p-[22px] border border-solid border-line rounded-[12px] bg-surface [&_>_p]:text-muted [&_ul]:pl-[20px] [&_>_label:not(.mentor-check)]:max-w-[340px] [&&&&_h3]:m-[0_0_16px] [&&&&_ul]:m-[10px_0_20px]"
                }
              >
                <h3 className="text-base font-semibold">核对后保存</h3>
                <div
                  className={
                    "mentor-summary flex gap-[36px] flex-wrap border-b border-solid border-line [&_span]:inline-flex [&_span]:items-baseline [&_span]:gap-[9px] [&_span]:text-muted [&_span]:whitespace-nowrap [&_strong]:text-ink [&_strong]:tabular-nums [.mentor-preview_&]:pt-0 [&&&&]:p-[20px_0_22px] [&&&&_strong]:text-[1.3rem] [&&&&_strong]:leading-[1] [@media(max-width:_600px)]:[&&&&]:gap-[15px_23px]"
                  }
                >
                  <span>
                    <strong>{preview.fetchedCount}</strong>读取
                  </span>
                  <span>
                    <strong>{preview.validCount}</strong>可导入
                  </span>
                  <span>
                    <strong>{preview.duplicateCount}</strong>重复
                  </span>
                  <span>
                    <strong>{preview.invalidCount}</strong>无效
                  </span>
                </div>
                <p>
                  账号：{legacyEmail}。
                  {preview.earliestAtMs && preview.latestAtMs
                    ? `记录范围：${dayLabel(preview.earliestAtMs)} 至 ${dayLabel(preview.latestAtMs)}。`
                    : ""}
                </p>
                {preview.examples.length > 0 && (
                  <ul>
                    {preview.examples.map((record) => (
                      <li key={record.id}>
                        {dayLabel(record.startedAtMs)} · {record.dutyName}
                      </li>
                    ))}
                  </ul>
                )}
                <label>
                  归属角色
                  <input
                    required
                    maxLength={120}
                    placeholder="输入游戏内角色名称"
                    value={legacyCharacter}
                    onChange={(event) => setLegacyCharacter(event.target.value)}
                  />
                </label>
                <label className="mentor-check [.mentor-preview_&]:flex [.mentor-preview_&]:items-center [.mentor-preview_&]:gap-[10px] [.mentor-preview_&]:mt-[16px] [.mentor-preview_&]:font-normal [&_input]:w-[18px] [&_input]:h-[18px]">
                  <input
                    type="checkbox"
                    checked={legacyCompleted}
                    onChange={(event) =>
                      setLegacyCompleted(event.target.checked)
                    }
                  />
                  将旧站记录统一标为已完成
                </label>
                <p
                  className={
                    "mentor-hint [.mentor-preview_&]:text-[13px] [.mentor-preview_&&&&]:m-[5px_0_16px]"
                  }
                >
                  旧站未提供可靠的完成结果。保持不选时会标为“结果未标记”，可逐条修正。
                </p>
                <button
                  className="mentor-primary [.mentor-page_&]:text-on-accent [.mentor-page_&]:bg-accent [.mentor-page_&]:border-accent [.mentor-page_&]:font-semibold [.mentor-page_&:hover:not(:disabled)]:bg-accent-hover"
                  type="button"
                  disabled={
                    busy || !legacyCharacter.trim() || preview.validCount === 0
                  }
                  onClick={() => void saveLegacy()}
                >
                  保存 {preview.validCount} 条到本地
                </button>
              </div>
            )}
          </div>
          <div
            className={
              "mentor-data-block max-w-[740px] border-b border-solid border-line [&_>_p]:text-muted [&&&&]:p-[30px_0] [&&&&_h3]:m-[0_0_5px] [&&&&_>_p]:m-[0_0_20px]"
            }
          >
            <h3 className="text-base font-semibold">本地备份</h3>
            <p>下载当前记录的 JSON 副本，便于自行保留。</p>
            <button
              type="button"
              disabled={!records.length}
              onClick={exportBackup}
            >
              <DownloadSimple />
              下载备份
            </button>
          </div>
        </section>
      )}
      {riskOpen && (
        <RiskDialog
          title="连接游戏前请确认"
          items={[
            "会向运行中的 FF14 进程注入模块，并读取导随排队、副本编号和完成事件。",
            "第三方程序可能违反游戏用户协议，并可能导致账号处罚。",
            "自动监测在离开本页面后仍会持续，直到停止或退出桌面程序。",
          ]}
          confirmLabel="理解并开始监测"
          storageError={storageError}
          onConfirm={confirmRisk}
          onCancel={() => setRiskOpen(false)}
        />
      )}
    </main>
  );
}
