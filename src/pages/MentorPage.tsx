/** Mentor roulette ledger with live tracking, corrections, and read-only migration. */
import {
  ArrowClockwise,
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
import { CLASS_JOB_LABEL_BY_GLAMOUR_ID } from "../features/glamour/data/classJobs";
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
} from "../features/mentor/api";
import {
  grantMentorConsent,
  hasMentorConsent,
} from "../features/mentor/consent";
import dutyNames from "../features/mentor/dutyNames.json";
import "./MentorPage.css";

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
  const [view, setView] = useState<"history" | "data">("history");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | MentorResult>("all");
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
    () =>
      records.filter((record) => {
        const duty = record.dutyId
          ? (names[String(record.dutyId)] ?? record.dutyName)
          : record.dutyName;
        return (
          (filter === "all" || filter === record.result) &&
          `${duty} ${record.characterName} ${record.jobName ?? ""}`
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase())
        );
      }),
    [records, filter, search],
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
    <main className="mentor-page">
      <header className="mentor-heading">
        <div>
          <h1>指导者随机任务记录</h1>
          <p>从游戏中识别导随，在副本完成或退出时留下清楚的结果。</p>
        </div>
        <div className="mentor-heading-actions">
          <span
            className={`mentor-live-badge ${status?.running ? "is-on" : ""}`}
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
              className="mentor-primary"
              type="button"
              disabled={busy}
              onClick={requestStart}
            >
              {busy ? (
                <SpinnerGap className="mentor-spin" />
              ) : (
                <PlugsConnected />
              )}
              连接并监测
            </button>
          )}
        </div>
      </header>
      {!isTauriRuntime() && (
        <p className="mentor-message">自动记录需要桌面版。仍可浏览页面设计。</p>
      )}
      {error && (
        <p className="mentor-error" role="alert">
          <WarningCircle />
          {error}
        </p>
      )}
      {feedback && (
        <p className="mentor-feedback" role="status">
          <CheckCircle />
          {feedback}
        </p>
      )}

      <section className="mentor-session" aria-label="当前导随进度">
        <div className="mentor-session-flow">
          <div
            className={
              status?.phase === "queued"
                ? "current"
                : status?.phase === "in_duty"
                  ? "passed"
                  : ""
            }
          >
            <span className="mentor-step-dot" />
            排队<span>指导者随机任务</span>
          </div>
          <div className={status?.phase === "in_duty" ? "current" : ""}>
            <span className="mentor-step-dot" />
            副本
            <span>
              {active?.dutyId
                ? (names[String(active.dutyId)] ?? active.dutyName)
                : "等待进入"}
            </span>
          </div>
          <div>
            <span className="mentor-step-dot" />
            结果<span>完成或退出后记录</span>
          </div>
        </div>
        <p className="mentor-session-caption">
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

      <div className="mentor-tabs" role="tablist" aria-label="记录页面">
        <button
          role="tab"
          aria-selected={view === "history"}
          onClick={() => setView("history")}
        >
          记录
        </button>
        <button
          role="tab"
          aria-selected={view === "data"}
          onClick={() => setView("data")}
        >
          数据管理
        </button>
      </div>
      {view === "history" ? (
        <>
          <div className="mentor-summary" aria-label="记录统计">
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
          <section className="mentor-history">
            <div className="mentor-section-heading">
              <div>
                <h2>历史记录</h2>
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
                className="mentor-manual"
                onSubmit={(event) => void submitManual(event)}
              >
                <h3>补录一条导随</h3>
                <div className="mentor-form-grid">
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
                <div className="mentor-form-actions">
                  <button type="button" onClick={() => setManualOpen(false)}>
                    取消
                  </button>
                  <button
                    className="mentor-primary"
                    type="submit"
                    disabled={busy}
                  >
                    保存记录
                  </button>
                </div>
              </form>
            )}
            <div className="mentor-filters">
              <input
                aria-label="搜索副本、角色或职业"
                placeholder="搜索副本、角色或职业"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                aria-label="按结果筛选"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as typeof filter)
                }
              >
                <option value="all">全部结果</option>
                <option value="completed">已完成</option>
                <option value="exited">已退出</option>
                <option value="needs_review">待核对</option>
                <option value="legacy_unknown">结果未标记</option>
              </select>
              <button
                type="button"
                aria-label="刷新记录"
                title="刷新记录"
                onClick={() => void refreshRecords()}
              >
                <ArrowClockwise />
              </button>
            </div>
            {grouped.length === 0 ? (
              <div className="mentor-empty">
                <h3>
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
                <div className="mentor-day" key={day}>
                  <h3>{day}</h3>
                  <div className="mentor-records">
                    {rows.map((record) => {
                      const duty = record.dutyId
                        ? (names[String(record.dutyId)] ?? record.dutyName)
                        : record.dutyName;
                      const job =
                        record.jobName ??
                        (record.jobId
                          ? CLASS_JOB_LABEL_BY_GLAMOUR_ID[record.jobId]
                          : null) ??
                        "职业未记录";
                      const open = expanded === record.id;
                      return (
                        <div className="mentor-record" key={record.id}>
                          <button
                            className="mentor-record-main"
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
                            <span className="mentor-record-title">
                              {duty}
                              <small>
                                {record.characterName || "未指定角色"} · {job}
                              </small>
                            </span>
                            <span
                              className={`mentor-result result-${record.result}`}
                            >
                              {resultLabel[record.result]}
                            </span>
                            <PencilSimple aria-hidden="true" />
                          </button>
                          {open && (
                            <div className="mentor-record-detail">
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
                              <div className="mentor-form-grid">
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
                              <div className="mentor-form-actions">
                                <button
                                  className="mentor-delete"
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void removeRecord(record.id)}
                                >
                                  删除记录
                                </button>
                                <button
                                  className="mentor-primary"
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
        <section className="mentor-data">
          <div className="mentor-section-heading">
            <div>
              <h2>数据管理</h2>
              <p>从旧站读取历史记录，先预览，再保存到本地。</p>
            </div>
          </div>
          <div className="mentor-data-block">
            <h3>迁移旧站记录</h3>
            <p>
              使用旧站账号登录并逐页读取记录。不会调用旧站会冻结账号的导出功能；密码和会话不会保存。
            </p>
            <form
              className="mentor-legacy-form"
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
              <button className="mentor-primary" type="submit" disabled={busy}>
                {busy ? (
                  <SpinnerGap className="mentor-spin" />
                ) : (
                  <DownloadSimple />
                )}
                登录并读取
              </button>
            </form>
            {preview && (
              <div className="mentor-preview">
                <h3>核对后保存</h3>
                <div className="mentor-summary">
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
                <label className="mentor-check">
                  <input
                    type="checkbox"
                    checked={legacyCompleted}
                    onChange={(event) =>
                      setLegacyCompleted(event.target.checked)
                    }
                  />
                  将旧站记录统一标为已完成
                </label>
                <p className="mentor-hint">
                  旧站未提供可靠的完成结果。保持不选时会标为“结果未标记”，可逐条修正。
                </p>
                <button
                  className="mentor-primary"
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
          <div className="mentor-data-block">
            <h3>本地备份</h3>
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
