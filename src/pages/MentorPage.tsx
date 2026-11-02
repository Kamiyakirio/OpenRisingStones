/** Mentor roulette ledger with live tracking, corrections, and read-only migration. */
import clsx from "clsx";
import {
  mentorControlClasses,
  mentorSectionHeadingClasses,
} from "../features/mentor/utilityClasses";
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

/** Complete utility strings are shared without adding component CSS rules. */
const mentorSpinClasses =
  "mentor-spin h-4.5 w-4.5 shrink-0 animate-[mentor-spin_1s_linear_infinite]";
const mentorStepDescriptionClasses =
  "last:col-start-2 last:text-[13px] last:font-normal last:text-muted max-[600px]:last:text-xs";
const mentorTabClasses =
  "disabled:opacity-55 inline-flex min-h-11 items-center justify-center gap-2 rounded-none border-0 bg-transparent px-0.5 py-2 text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] [border-bottom:2px_solid_transparent] disabled:cursor-not-allowed aria-selected:[border-bottom-color:var(--ors-color-accent)] aria-selected:font-semibold aria-selected:text-ink";

/** Reused presentation strings stay static and are allocated once for this module. */
const mentorStepClasses =
  'relative grid grid-cols-[16px_minmax(0,_1fr)] content-start gap-x-3 font-semibold text-muted not-last:after:absolute not-last:after:top-[7px] not-last:after:left-[calc(100%_-_8px)] not-last:after:h-px not-last:after:w-5 not-last:after:bg-line not-last:after:[content:""] max-[600px]:grid-cols-[13px_minmax(0,_1fr)] max-[600px]:gap-x-[5px] max-[600px]:text-[13px] max-[600px]:not-last:after:hidden';
const mentorStepDotClasses =
  "mentor-step-dot row-span-2 mt-[5px] size-[11px] rounded-full border-2";

const mentorSummaryClasses =
  "mentor-summary flex flex-wrap gap-9 border-b border-solid border-line px-0 pt-5 pb-5.5 max-[600px]:gap-[15px_23px]";
const mentorSummaryItemClasses =
  "inline-flex items-baseline gap-[9px] whitespace-nowrap text-muted";
const mentorSummaryValueClasses =
  "text-[1.3rem] leading-[1] text-ink tabular-nums";
const mentorFormGridClasses =
  "mentor-form-grid grid grid-cols-2 gap-4 max-[600px]:grid-cols-[1fr]";
const mentorFormActionsClasses =
  "mentor-form-actions mt-4.5 flex justify-end gap-2.5";
const mentorDataBlockClasses =
  "mentor-data-block max-w-185 border-b border-solid border-line px-0 py-7.5";
const mentorDataHeadingClasses = "mx-0 mt-0 mb-[5px] text-base font-semibold";

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
  const [filters, setFilters] = useState({
    ...DEFAULT_MENTOR_FILTERS,
  });
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
          {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            records,
          },
          null,
          2,
        ),
      ],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mentor-records-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  return (
    <main className="mentor-page mx-auto w-full max-w-400 px-5 py-5 pb-16 max-[899px]:px-4 max-[899px]:py-4 max-[600px]:px-4.5 max-[600px]:pt-6 max-[600px]:pb-18 max-[519px]:px-3 max-[519px]:py-4">
      <header className="mentor-heading mb-5 flex flex-wrap items-start justify-between gap-5 border-b border-line pb-5 max-[850px]:flex-wrap">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-tool">
            指导者随机任务记录
          </h1>
          <p className="mx-0 mt-1 mb-0 text-muted">
            从游戏中识别导随，在副本完成或退出时留下清楚的结果。
          </p>
        </div>
        <div className="mentor-heading-actions flex flex-wrap items-center gap-3.5 max-[600px]:w-full max-[600px]:justify-between">
          <span
            className={clsx(
              "mentor-live-badge inline-flex items-center gap-2 text-sm whitespace-nowrap text-muted",
              status?.running ? "is-on text-success" : "",
            )}
          >
            <span
              className={clsx(
                "size-2 rounded-full",
                status?.running ? "bg-success" : "bg-muted",
              )}
            />
            {status?.running ? "自动监测中" : "未监测"}
          </span>
          {status?.running ? (
            <button
              className={mentorControlClasses.button}
              type="button"
              disabled={busy}
              onClick={() => void stop()}
            >
              <SignOut className={mentorControlClasses.icon} />
              停止监测
            </button>
          ) : (
            <button
              className={mentorControlClasses.primaryButton}
              type="button"
              disabled={busy}
              onClick={requestStart}
            >
              {busy ? (
                <SpinnerGap className={mentorSpinClasses} />
              ) : (
                <PlugsConnected className={mentorControlClasses.icon} />
              )}
              连接并监测
            </button>
          )}
        </div>
      </header>
      {!isTauriRuntime() && (
        <p className="mentor-message mx-0 mt-4.5 mb-0 flex items-center gap-2 rounded-control bg-surface px-3.5 py-2.5">
          自动记录需要桌面版。仍可浏览页面设计。
        </p>
      )}
      {error && (
        <p
          className="mentor-error mx-0 mt-4.5 mb-0 flex items-center gap-2 rounded-control border border-solid border-danger bg-surface px-3.5 py-2.5 text-danger"
          role="alert"
        >
          <WarningCircle className="h-5 w-5 flex-none" />
          {error}
        </p>
      )}
      {feedback && (
        <p
          className="mentor-feedback mx-0 mt-4.5 mb-0 flex items-center gap-2 rounded-control border border-solid border-success bg-surface px-3.5 py-2.5 text-success"
          role="status"
        >
          <CheckCircle className="h-5 w-5 flex-none" />
          {feedback}
        </p>
      )}

      <section
        className="mentor-session mt-5 rounded-panel border border-solid border-line bg-surface px-6.5 pt-5.5 pb-4.5 max-[600px]:p-4.5"
        aria-label="当前导随进度"
      >
        <div className="mentor-session-flow grid grid-cols-3 gap-3 max-[600px]:gap-1.5">
          <div
            className={clsx(
              mentorStepClasses,
              status?.phase === "queued"
                ? "current text-ink"
                : status?.phase === "in_duty"
                  ? "passed"
                  : "",
            )}
          >
            <span
              className={clsx(
                mentorStepDotClasses,
                status?.phase === "queued"
                  ? "border-accent bg-accent shadow-[0_0_0_4px_var(--ors-color-selected)]"
                  : status?.phase === "in_duty"
                    ? "border-success bg-success"
                    : "border-control bg-surface",
              )}
            />
            排队
            <span className={mentorStepDescriptionClasses}>指导者随机任务</span>
          </div>
          <div
            className={clsx(
              mentorStepClasses,
              status?.phase === "in_duty" ? "current text-ink" : "",
            )}
          >
            <span
              className={clsx(
                mentorStepDotClasses,
                status?.phase === "in_duty"
                  ? "border-accent bg-accent shadow-[0_0_0_4px_var(--ors-color-selected)]"
                  : "border-control bg-surface",
              )}
            />
            副本
            <span className={mentorStepDescriptionClasses}>
              {active?.dutyId
                ? (names[String(active.dutyId)] ?? active.dutyName)
                : "等待进入"}
            </span>
          </div>
          <div className={mentorStepClasses}>
            <span className="mentor-step-dot row-span-2 mt-[5px] size-[11px] rounded-full border-2 border-control bg-surface" />
            结果
            <span className={mentorStepDescriptionClasses}>
              完成或退出后记录
            </span>
          </div>
        </div>
        {active && (
          <div className="mentor-session-job mt-4.5 text-sm">
            <MentorJob jobId={active.jobId} jobName={active.jobName} />
          </div>
        )}
        <p className="mentor-session-caption mx-0 mt-4.5 mb-0 text-sm text-muted">
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
        className="mentor-tabs mt-5 flex items-end gap-6 border-b border-solid border-line"
        role="tablist"
        aria-label="记录页面"
      >
        <button
          className={mentorTabClasses}
          role="tab"
          aria-selected={view === "history"}
          onClick={() => setView("history")}
        >
          记录
        </button>
        <button
          className={mentorTabClasses}
          role="tab"
          aria-selected={view === "analysis"}
          onClick={() => setView("analysis")}
        >
          数据分析
        </button>
        <button
          className={mentorTabClasses}
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
          <div className={mentorSummaryClasses} aria-label="记录统计">
            <span className={mentorSummaryItemClasses}>
              <strong className={mentorSummaryValueClasses}>
                {totals.all}
              </strong>
              全部记录
            </span>
            <span className={mentorSummaryItemClasses}>
              <strong className={mentorSummaryValueClasses}>
                {totals.completed}
              </strong>
              已完成
            </span>
            <span className={mentorSummaryItemClasses}>
              <strong className={mentorSummaryValueClasses}>
                {totals.exited}
              </strong>
              已退出
            </span>
            <span className={mentorSummaryItemClasses}>
              <strong className={mentorSummaryValueClasses}>
                {totals.review}
              </strong>
              待核对或未标记
            </span>
          </div>
          <section className="mentor-history mt-6">
            <div className={mentorSectionHeadingClasses}>
              <div>
                <h2 className="m-0 text-lg font-semibold">历史记录</h2>
                <p className="mx-0 mt-1 mb-0 text-muted">
                  完成和退出分别统计；旧站记录可在详情里补充结果。
                </p>
              </div>
              <button
                className={mentorControlClasses.button}
                type="button"
                onClick={() => setManualOpen((open) => !open)}
              >
                <Plus className={mentorControlClasses.icon} />
                补录遗漏
              </button>
            </div>
            {manualOpen && (
              <form
                className="mentor-manual mt-5 rounded-panel border border-solid border-line bg-surface p-5.5"
                onSubmit={(event) => void submitManual(event)}
              >
                <h3 className="mx-0 mt-0 mb-4 text-base font-semibold">
                  补录一条导随
                </h3>
                <div className={mentorFormGridClasses}>
                  <label className={mentorControlClasses.label}>
                    角色名称
                    <input
                      className={mentorControlClasses.input}
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
                  <label className={mentorControlClasses.label}>
                    副本名称
                    <input
                      className={mentorControlClasses.input}
                      required
                      maxLength={160}
                      value={manual.dutyName}
                      onChange={(event) =>
                        setManual({
                          ...manual,
                          dutyName: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={mentorControlClasses.label}>
                    进入时间
                    <input
                      className={mentorControlClasses.input}
                      required
                      type="datetime-local"
                      value={manual.date}
                      onChange={(event) =>
                        setManual({
                          ...manual,
                          date: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={mentorControlClasses.label}>
                    结果
                    <select
                      className={mentorControlClasses.select}
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
                <label className="mt-4 grid gap-1.5 font-semibold">
                  备注
                  <textarea
                    className={mentorControlClasses.textarea}
                    maxLength={500}
                    rows={2}
                    value={manual.note}
                    onChange={(event) =>
                      setManual({
                        ...manual,
                        note: event.target.value,
                      })
                    }
                  />
                </label>
                <div className={mentorFormActionsClasses}>
                  <button
                    className={mentorControlClasses.button}
                    type="button"
                    onClick={() => setManualOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    className={mentorControlClasses.primaryButton}
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
              <div className="mentor-empty px-5 py-16 text-center text-muted">
                <h3 className="m-0 text-base font-semibold text-ink">
                  {records.length
                    ? "没有符合条件的记录"
                    : "下一次导随会记在这里"}
                </h3>
                <p className="mx-0 mt-1.5 mb-4.5">
                  {records.length
                    ? "试试清除搜索或更换筛选条件。"
                    : "也可以从旧站迁移已有记录，或手动补录。"}
                </p>
                {!records.length && (
                  <button
                    className={mentorControlClasses.button}
                    type="button"
                    onClick={() => setView("data")}
                  >
                    迁移旧站记录{" "}
                    <ArrowRight className={mentorControlClasses.icon} />
                  </button>
                )}
              </div>
            ) : (
              grouped.map(([day, rows]) => (
                <div className="mentor-day mt-6.5" key={day}>
                  <h3 className="mx-0 mt-0 mb-[9px] text-base text-[13px] font-semibold text-muted">
                    {day}
                  </h3>
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
                            className="mentor-record-main grid min-h-17.5 w-full grid-cols-[60px_minmax(0,_1fr)_100px_20px] items-center justify-center gap-4 rounded-none border-0 border-control bg-transparent px-1.5 py-[9px] text-left text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-55 max-[600px]:grid-cols-[46px_minmax(0,_1fr)_76px] max-[600px]:gap-[9px]"
                            type="button"
                            aria-expanded={open}
                            onClick={() => {
                              setExpanded(open ? null : record.id);
                              setEditResult(record.result);
                              setEditNote(record.note);
                            }}
                          >
                            <time className="text-sm text-muted tabular-nums">
                              {new Intl.DateTimeFormat("zh-CN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(record.startedAtMs)}
                            </time>
                            <span className="mentor-record-title min-w-0 overflow-hidden font-semibold text-ellipsis whitespace-nowrap">
                              {duty}
                              <small className="flex items-center gap-3 overflow-hidden text-[13px] font-normal text-ellipsis text-muted">
                                {record.characterName || "未指定角色"}
                                <MentorJob
                                  jobId={record.jobId}
                                  jobName={record.jobName}
                                />
                              </small>
                            </span>
                            <span
                              className={clsx(
                                "mentor-result text-[13px] font-semibold whitespace-nowrap [&.result-completed]:text-success [&.result-exited]:text-warning",
                                `result-${record.result}`,
                              )}
                            >
                              {resultLabel[record.result]}
                            </span>
                            <PencilSimple
                              className="h-4.5 w-4.5 shrink-0 max-[600px]:hidden"
                              aria-hidden="true"
                            />
                          </button>
                          {open && (
                            <div className="mentor-record-detail bg-surface pt-4.5 pr-4.5 pb-5 pl-20.5 max-[600px]:p-4.5">
                              <dl className="mx-0 mt-0 mb-4.5 flex flex-wrap gap-[20px_30px]">
                                <div className="flex gap-2">
                                  <dt className="text-muted">进入</dt>
                                  <dd className="m-0">
                                    {dateTime(record.startedAtMs)}
                                  </dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="text-muted">结束</dt>
                                  <dd className="m-0">
                                    {record.endedAtMs
                                      ? dateTime(record.endedAtMs)
                                      : "未记录"}
                                  </dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="text-muted">来源</dt>
                                  <dd className="m-0">
                                    {sourceLabel[record.source]}
                                  </dd>
                                </div>
                              </dl>
                              <div className={mentorFormGridClasses}>
                                <label className={mentorControlClasses.label}>
                                  结果
                                  <select
                                    className={mentorControlClasses.select}
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
                                <label className={mentorControlClasses.label}>
                                  备注
                                  <textarea
                                    className={mentorControlClasses.textarea}
                                    maxLength={500}
                                    rows={2}
                                    value={editNote}
                                    onChange={(event) =>
                                      setEditNote(event.target.value)
                                    }
                                  />
                                </label>
                              </div>
                              <div className={mentorFormActionsClasses}>
                                <button
                                  className="mentor-delete [margin-right:auto] inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-solid border-[transparent] bg-transparent px-3.5 py-2 text-danger transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-55 pointer-coarse:min-h-11"
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void removeRecord(record.id)}
                                >
                                  删除记录
                                </button>
                                <button
                                  className={mentorControlClasses.primaryButton}
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
        <section className="mentor-data mt-6">
          <div className={mentorSectionHeadingClasses}>
            <div>
              <h2 className="m-0 text-lg font-semibold">数据管理</h2>
              <p className="mx-0 mt-1 mb-0 text-muted">
                从旧站读取历史记录，先预览，再保存到本地。
              </p>
            </div>
          </div>
          <div className={mentorDataBlockClasses}>
            <h3 className={mentorDataHeadingClasses}>迁移旧站记录</h3>
            <p className="mx-0 mt-0 mb-5 text-muted">
              使用旧站账号登录并逐页读取记录。不会调用旧站会冻结账号的导出功能；密码和会话不会保存。
            </p>
            <form
              className="mentor-legacy-form grid grid-cols-[1fr_1fr_auto] items-end gap-3 max-[850px]:grid-cols-2 max-[600px]:grid-cols-[1fr]"
              onSubmit={(event) => void fetchLegacy(event)}
            >
              <label className={mentorControlClasses.label}>
                旧站邮箱
                <input
                  className={mentorControlClasses.input}
                  type="email"
                  autoComplete="username"
                  required
                  value={legacyEmail}
                  onChange={(event) => setLegacyEmail(event.target.value)}
                />
              </label>
              <label className={mentorControlClasses.label}>
                旧站密码
                <input
                  className={mentorControlClasses.input}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={legacyPassword}
                  onChange={(event) => setLegacyPassword(event.target.value)}
                />
              </label>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-solid border-accent bg-accent px-3.5 py-2 font-semibold text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover disabled:cursor-not-allowed disabled:border-accent disabled:bg-accent disabled:text-on-accent disabled:opacity-55 max-[850px]:col-span-full max-[850px]:justify-self-start max-[600px]:col-start-1 pointer-coarse:min-h-11"
                type="submit"
                disabled={busy}
              >
                {busy ? (
                  <SpinnerGap className={mentorSpinClasses} />
                ) : (
                  <DownloadSimple className={mentorControlClasses.icon} />
                )}
                登录并读取
              </button>
            </form>
            {preview && (
              <div className="mentor-preview mt-5 rounded-panel border border-solid border-line bg-surface p-5.5">
                <h3 className="mx-0 mt-0 mb-4 text-base font-semibold">
                  核对后保存
                </h3>
                <div className={mentorSummaryClasses}>
                  <span className={mentorSummaryItemClasses}>
                    <strong className={mentorSummaryValueClasses}>
                      {preview.fetchedCount}
                    </strong>
                    读取
                  </span>
                  <span className={mentorSummaryItemClasses}>
                    <strong className={mentorSummaryValueClasses}>
                      {preview.validCount}
                    </strong>
                    可导入
                  </span>
                  <span className={mentorSummaryItemClasses}>
                    <strong className={mentorSummaryValueClasses}>
                      {preview.duplicateCount}
                    </strong>
                    重复
                  </span>
                  <span className={mentorSummaryItemClasses}>
                    <strong className={mentorSummaryValueClasses}>
                      {preview.invalidCount}
                    </strong>
                    无效
                  </span>
                </div>
                <p className="text-muted">
                  账号：{legacyEmail}。
                  {preview.earliestAtMs && preview.latestAtMs
                    ? `记录范围：${dayLabel(preview.earliestAtMs)} 至 ${dayLabel(preview.latestAtMs)}。`
                    : ""}
                </p>
                {preview.examples.length > 0 && (
                  <ul className="mx-0 mt-2.5 mb-5 pl-5">
                    {preview.examples.map((record) => (
                      <li key={record.id}>
                        {dayLabel(record.startedAtMs)} · {record.dutyName}
                      </li>
                    ))}
                  </ul>
                )}
                <label className="grid max-w-85 gap-1.5 font-semibold">
                  归属角色
                  <input
                    className={mentorControlClasses.input}
                    required
                    maxLength={120}
                    placeholder="输入游戏内角色名称"
                    value={legacyCharacter}
                    onChange={(event) => setLegacyCharacter(event.target.value)}
                  />
                </label>
                <label className="mentor-check mt-4 flex items-center gap-2.5 font-normal">
                  <input
                    className="h-4.5 w-4.5"
                    type="checkbox"
                    checked={legacyCompleted}
                    onChange={(event) =>
                      setLegacyCompleted(event.target.checked)
                    }
                  />
                  将旧站记录统一标为已完成
                </label>
                <p className="mentor-hint mx-0 mt-[5px] mb-4 text-[13px] text-muted">
                  旧站未提供可靠的完成结果。保持不选时会标为“结果未标记”，可逐条修正。
                </p>
                <button
                  className={mentorControlClasses.primaryButton}
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
          <div className={mentorDataBlockClasses}>
            <h3 className={mentorDataHeadingClasses}>本地备份</h3>
            <p className="mx-0 mt-0 mb-5 text-muted">
              下载当前记录的 JSON 副本，便于自行保留。
            </p>
            <button
              className={mentorControlClasses.button}
              type="button"
              disabled={!records.length}
              onClick={exportBackup}
            >
              <DownloadSimple className={mentorControlClasses.icon} />
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
