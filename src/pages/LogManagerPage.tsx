/** Debug-only session log browser with operation details and native export. */
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CaretDown,
  CaretRight,
  DownloadSimple,
  Pause,
  Play,
  Trash,
} from "@phosphor-icons/react";
import {
  clearLogs,
  exportLogs,
  getCaptureFailures,
  getLog,
  listLogs,
  listenForCaptureFailures,
  listenForLogs,
  saveAttachment,
  type LogEntry,
  type LogKind,
  type LogSummary,
} from "../features/diagnostics/api/diagnosticsApi";
import {
  groupSimilarLogs,
  type LogGroup,
} from "../features/diagnostics/utils/grouping";

/** Reused presentation strings stay static and are allocated once for this module. */
const logFilterInputClasses =
  "min-h-10 w-full rounded-control border border-solid border-control bg-surface px-3 py-0";
const logActionClasses =
  "transition-[background-color,color,border-color] duration-120 ease-[ease] inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-control bg-surface px-[11px] py-0 text-[13px] whitespace-nowrap hover:bg-hover";
const logDangerActionClasses = `${logActionClasses} first:border-danger first:text-danger`;
const logEmptyClasses = "log-empty m-0 px-5 py-8 text-[13px] text-muted";
const logPropertyRowClasses =
  "grid grid-cols-[minmax(110px,_1fr)_minmax(0,_2fr)] gap-2.5 border-b border-solid border-line px-0 py-[7px] text-[12px]";
const logDetailNoteClasses =
  "log-detail-note mx-0 mt-[5px] mb-0 text-[12px] text-muted";
const logSectionHeadingClasses =
  "mx-0 mt-0 mb-2 text-base text-[14px] font-semibold";
const logCompactActionClasses =
  "transition-[background-color,color,border-color] duration-120 ease-[ease] min-h-8 rounded-control border border-solid border-control bg-surface px-[9px] py-0 text-[12px] hover:bg-hover";

type DetailTab =
  "headers" | "params" | "request" | "response" | "input" | "output";
export function LogManagerPage() {
  const [logs, setLogs] = useState<LogSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<LogEntry | null>(null);
  const [tab, setTab] = useState<DetailTab>("headers");
  const [kind, setKind] = useState<LogKind | "">("");
  const [search, setSearch] = useState("");
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captureFailures, setCaptureFailures] = useState(0);
  const groups = useMemo(() => groupSimilarLogs(logs), [logs]);
  const selectedGroup = useMemo(
    () =>
      groups.find((group) =>
        group.occurrences.some((entry) => entry.id === selectedId),
      ) ?? null,
    [groups, selectedId],
  );
  const refresh = useCallback(async () => {
    try {
      const batch = await listLogs({
        search,
        kind: kind || undefined,
      });
      setLogs(batch);
      setHasMore(batch.length === 100);
      if (batch.length === 0) setDetail(null);
      setSelectedId((current) =>
        current !== null && batch.some((entry) => entry.id === current)
          ? current
          : (batch[0]?.id ?? null),
      );
      setError(null);
    } catch {
      setError("无法读取本次运行的日志。请检查 Debug 日志服务是否可用。");
    } finally {
      setLoading(false);
    }
  }, [kind, search]);
  useEffect(() => {
    let disposed = false;
    void listLogs({
      search,
      kind: kind || undefined,
    })
      .then((batch) => {
        if (disposed) return;
        setLogs(batch);
        setHasMore(batch.length === 100);
        if (batch.length === 0) setDetail(null);
        setSelectedId((current) =>
          current !== null && batch.some((entry) => entry.id === current)
            ? current
            : (batch[0]?.id ?? null),
        );
        setError(null);
      })
      .catch(() => {
        if (!disposed) {
          setError("无法读取本次运行的日志。请检查 Debug 日志服务是否可用。");
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [kind, search]);
  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | undefined;
    void listenForLogs((entry) => {
      if (
        paused ||
        (kind && entry.kind !== kind) ||
        !matchesSearch(entry, search)
      )
        return;
      setLogs((current) =>
        current.some((item) => item.id === entry.id)
          ? current
          : [entry, ...current],
      );
      setSelectedId((current) => current ?? entry.id);
    })
      .then((unlisten) => {
        if (disposed) unlisten();
        else stop = unlisten;
      })
      .catch(() => {
        if (!disposed) setError("无法接收实时日志，请重新打开日志管理。");
      });
    return () => {
      disposed = true;
      stop?.();
    };
  }, [kind, paused, search]);
  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | undefined;
    void getCaptureFailures()
      .then((count) => {
        if (!disposed) setCaptureFailures(count);
      })
      .catch(() => undefined);
    void listenForCaptureFailures((count) => setCaptureFailures(count))
      .then((unlisten) => {
        if (disposed) unlisten();
        else stop = unlisten;
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      stop?.();
    };
  }, []);
  useEffect(() => {
    if (selectedId === null) return;
    let disposed = false;
    void getLog(selectedId)
      .then((entry) => {
        if (disposed) return;
        setDetail(entry);
        setTab(entry.kind === "network" ? "headers" : "input");
      })
      .catch(() => {
        if (!disposed) setDetail(null);
      });
    return () => {
      disposed = true;
    };
  }, [selectedId]);
  const loadMore = async () => {
    const beforeId = logs.at(-1)?.id;
    if (!beforeId || loadingMore) return;
    setLoadingMore(true);
    try {
      const batch = await listLogs({
        beforeId,
        search,
        kind: kind || undefined,
      });
      setLogs((current) => [
        ...current,
        ...batch.filter(
          (entry) => !current.some((item) => item.id === entry.id),
        ),
      ]);
      setHasMore(batch.length === 100);
    } catch {
      setError("无法加载更早的日志，请重试。");
    } finally {
      setLoadingMore(false);
    }
  };
  const exportSession = async () => {
    try {
      setExportPath(await exportLogs());
      setError(null);
    } catch {
      setError("导出失败，请检查下载文件夹是否可写。");
    }
  };
  const clearSession = async () => {
    try {
      await clearLogs();
      setLogs([]);
      setDetail(null);
      setSelectedId(null);
      setHasMore(false);
      setClearing(false);
      setError(null);
    } catch {
      setError("清空失败，请稍后重试。");
    }
  };
  return (
    <section
      className="log-manager grid max-w-320 gap-5 [font-variant-numeric:tabular-nums_lining-nums]"
      aria-labelledby="debug-log-title"
    >
      <header className="log-manager-heading flex items-end justify-between gap-5 border-b border-solid border-line pb-4.5 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <h2
            className="mx-0 mt-0 mb-0.5 text-lg font-semibold"
            id="debug-log-title"
          >
            运行日志
          </h2>
          <p className="m-0 text-[13px] text-muted">
            仅记录本次 Debug 运行；退出后自动删除。原始内容可能含有账号凭据。
          </p>
        </div>
        <span className="log-session-count m-0 text-[13px] whitespace-nowrap text-muted">
          当前列表 {logs.length} 条
          {groups.length !== logs.length ? ` / ${groups.length} 组` : ""}
        </span>
      </header>

      <div className="log-toolbar flex flex-wrap items-end gap-3">
        <label className="log-search grid flex-[1_1_250px] gap-[5px] text-[13px]">
          <span className="text-muted">搜索命令或 URL</span>
          <input
            className={logFilterInputClasses}
            value={search}
            onChange={(event) => {
              setLoading(true);
              setSearch(event.target.value);
            }}
            placeholder="输入命令名或地址"
          />
        </label>
        <label className="log-kind-filter grid flex-[0_0_150px] gap-[5px] text-[13px]">
          <span className="text-muted">来源类型</span>
          <select
            className={logFilterInputClasses}
            value={kind}
            onChange={(event) => {
              setLoading(true);
              setKind(event.target.value as LogKind | "");
            }}
          >
            <option value="">全部</option>
            <option value="network">网络请求</option>
            <option value="invoke">前端命令</option>
            <option value="bridge">游戏桥接</option>
          </select>
        </label>
        <div className="log-actions flex items-center gap-2 max-[620px]:flex-wrap">
          <button
            className={logActionClasses}
            type="button"
            onClick={() => {
              setPaused((current) => !current);
              if (paused) void refresh();
            }}
          >
            {paused ? (
              <Play className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pause className="h-4 w-4" aria-hidden="true" />
            )}
            {paused ? "继续显示" : "暂停显示"}
          </button>
          <button
            className={logActionClasses}
            type="button"
            onClick={() => void exportSession()}
          >
            <DownloadSimple className="h-4 w-4" aria-hidden="true" /> 导出
          </button>
          {clearing ? (
            <span className="log-clear-confirm flex items-center gap-2">
              <button
                className={logDangerActionClasses}
                type="button"
                onClick={() => void clearSession()}
              >
                确认清空
              </button>
              <button
                className={logDangerActionClasses}
                type="button"
                onClick={() => setClearing(false)}
              >
                取消
              </button>
            </span>
          ) : (
            <button
              className={logActionClasses}
              type="button"
              onClick={() => setClearing(true)}
            >
              <Trash className="h-4 w-4" aria-hidden="true" /> 清空
            </button>
          )}
        </div>
      </div>

      {exportPath && (
        <p className="log-export-note m-0 rounded-control bg-surface px-3 py-2.5 text-[13px] [overflow-wrap:anywhere] text-success">
          已导出到：{exportPath}
        </p>
      )}
      {error && (
        <p
          className="log-error m-0 rounded-control bg-surface px-3 py-2.5 text-[13px] [overflow-wrap:anywhere] text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      {captureFailures > 0 && (
        <p
          className="log-capture-warning m-0 rounded-control bg-surface px-3 py-2.5 text-[13px] [overflow-wrap:anywhere] text-warning"
          role="alert"
        >
          有 {captureFailures} 条记录未能保存；本次日志可能不完整。
        </p>
      )}

      <div className="log-workspace grid min-h-135 grid-cols-[minmax(290px,_0.95fr)_minmax(0,_1.25fr)] overflow-hidden rounded-panel border border-solid border-line bg-surface max-[1120px]:grid-cols-1">
        <section
          className="log-list min-w-0 border-r border-solid border-line max-[1120px]:border-b max-[1120px]:border-solid max-[1120px]:border-line max-[1120px]:[border-right:0]"
          aria-label="日志列表"
        >
          <div className="log-list-heading grid min-h-10.5 grid-cols-[105px_minmax(0,_1fr)_50px] items-center gap-2.5 border-b border-solid border-line px-3.5 py-0 text-[12px] text-muted max-[620px]:grid-cols-[80px_minmax(0,_1fr)_42px] max-[620px]:gap-1.5 max-[620px]:px-2.5">
            <span>时间 / 来源</span>
            <span>操作</span>
            <span>结果</span>
          </div>
          {loading && logs.length === 0 ? (
            <p className={logEmptyClasses} role="status">
              正在读取本次运行的日志…
            </p>
          ) : logs.length === 0 ? (
            <p className={logEmptyClasses}>
              暂无匹配记录。执行操作后，记录会出现在这里。
            </p>
          ) : (
            <div className="log-list-rows max-h-[min(68dvh,_780px)] overflow-y-auto max-[1120px]:max-h-67.5">
              {groups.map((group) => {
                const entry = group.primary;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className="log-row grid min-h-14.5 w-full grid-cols-[105px_minmax(0,_1fr)_50px] items-center gap-2.5 border-0 border-b border-solid border-line bg-transparent px-3.5 py-2 text-left text-[13px] transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover aria-current:bg-selected max-[620px]:grid-cols-[80px_minmax(0,_1fr)_42px] max-[620px]:gap-1.5 max-[620px]:px-2.5"
                    aria-current={
                      group.occurrences.some((item) => item.id === selectedId)
                        ? "true"
                        : undefined
                    }
                    onClick={() => {
                      setDetail(null);
                      setSelectedId(entry.id);
                    }}
                  >
                    <span className="log-row-meta grid leading-[1.35]">
                      <time>
                        {new Date(entry.timestampMs).toLocaleTimeString()}
                      </time>
                      <small className="text-[11px] text-muted">
                        {sourceLabel(entry.source)}
                      </small>
                    </span>
                    <span
                      className="log-row-name overflow-hidden text-ellipsis whitespace-nowrap"
                      title={entry.url ?? entry.name}
                    >
                      {entry.name}
                      {group.occurrences.length > 1 && (
                        <small className="log-repeat-count ml-[7px] inline-block rounded-full bg-surface px-1.5 py-[1px] text-[11px] font-bold text-accent">
                          ×{group.occurrences.length}
                        </small>
                      )}
                    </span>
                    <span
                      className={clsx(
                        "log-outcome text-right text-[12px] [&.success]:text-success",
                        entry.outcome,
                      )}
                    >
                      {entry.statusCode ??
                        (entry.outcome === "success" ? "成功" : "失败")}
                    </span>
                  </button>
                );
              })}
              {hasMore && (
                <button
                  className="log-load-more min-h-10.5 w-full border-0 bg-transparent text-[13px] text-accent transition-[background-color,color,border-color] duration-120 ease-[ease]"
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? "正在加载…" : "加载更早记录"}
                </button>
              )}
            </div>
          )}
        </section>

        <section className="log-detail min-w-0" aria-label="日志详情">
          {detail ? (
            <LogDetail
              entry={detail}
              group={selectedGroup}
              tab={tab}
              onSelectOccurrence={setSelectedId}
              onTabChange={setTab}
            />
          ) : (
            <div className="log-detail-empty m-0 px-5 py-8 text-[13px] text-muted">
              选择一条记录，查看输入和输出。
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
function matchesSearch(entry: LogSummary, search: string) {
  const query = search.toLowerCase();
  return (
    !query ||
    entry.name.toLowerCase().includes(query) ||
    entry.url?.toLowerCase().includes(query)
  );
}
function sourceLabel(source: string) {
  if (source === "webview") return "前端";
  if (source === "python") return "Python";
  if (source === "game-bridge") return "游戏桥接";
  return source;
}
function LogDetail({
  entry,
  group,
  tab,
  onSelectOccurrence,
  onTabChange,
}: {
  entry: LogEntry;
  group: LogGroup | null;
  tab: DetailTab;
  onSelectOccurrence: (id: number) => void;
  onTabChange: (tab: DetailTab) => void;
}) {
  const network = entry.kind === "network";
  const tabs: Array<[DetailTab, string]> = network
    ? [
        ["headers", "请求 / 响应头"],
        ["params", "请求参数"],
        ["request", "请求体"],
        ["response", "响应体"],
      ]
    : [
        ["input", "调用参数"],
        ["output", entry.error ? "错误" : "返回参数"],
      ];
  const request = asRecord(entry.request);
  const response = asRecord(entry.response);
  return (
    <>
      <div className="log-detail-heading px-5 pt-[17px] pb-3">
        <h2 className="m-0 text-lg text-[17px] font-semibold [overflow-wrap:anywhere]">
          {entry.name}
        </h2>
        <p className="mx-0 mt-[5px] mb-0 text-[12px] text-muted">
          {new Date(entry.timestampMs).toLocaleString()} ·{" "}
          {sourceLabel(entry.source)} · {entry.durationMs?.toFixed(0) ?? "—"} ms
        </p>
        {group && group.occurrences.length > 1 && (
          <div
            className="log-occurrences mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted"
            aria-label="相同调用的原始记录"
          >
            <span>相同调用折叠为 {group.occurrences.length} 条：</span>
            {group.occurrences.map((occurrence, index) => (
              <button
                className="min-h-7.5 rounded-control border border-solid border-line bg-surface px-2 py-0 text-[12px] transition-[background-color,color,border-color] duration-120 ease-[ease] aria-current:border-accent aria-current:bg-selected aria-current:text-accent"
                key={occurrence.id}
                type="button"
                aria-current={occurrence.id === entry.id ? "true" : undefined}
                onClick={() => onSelectOccurrence(occurrence.id)}
              >
                第 {group.occurrences.length - index} 次 ·{" "}
                {new Date(occurrence.timestampMs).toLocaleTimeString()}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        className="log-detail-tabs flex overflow-x-auto border-b border-solid border-line px-3 py-0"
        role="tablist"
        aria-label="详情类别"
      >
        {tabs.map(([key, label]) => (
          <button
            className="min-h-10.5 shrink-0 border-0 bg-transparent px-2.5 py-0 text-[13px] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] [border-bottom:2px_solid_transparent] aria-selected:[border-bottom-color:var(--ors-color-accent)] aria-selected:font-semibold aria-selected:text-accent"
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => onTabChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="log-detail-content max-h-[min(62dvh,_720px)] overflow-auto px-5 pt-4.5 pb-6 max-[620px]:px-3"
        role="tabpanel"
      >
        {network && tab === "headers" && (
          <>
            <dl className="log-general m-0">
              <div className={logPropertyRowClasses}>
                <dt className="[overflow-wrap:anywhere] text-muted">
                  请求地址
                </dt>
                <dd className="m-0 [font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] [overflow-wrap:anywhere]">
                  {String(request.url ?? "—")}
                </dd>
              </div>
              <div className={logPropertyRowClasses}>
                <dt className="[overflow-wrap:anywhere] text-muted">
                  请求方法
                </dt>
                <dd className="m-0 [font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] [overflow-wrap:anywhere]">
                  {String(request.method ?? "—")}
                </dd>
              </div>
              <div className={logPropertyRowClasses}>
                <dt className="[overflow-wrap:anywhere] text-muted">状态码</dt>
                <dd className="m-0 [font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] [overflow-wrap:anywhere]">
                  {String(response.status ?? "—")}
                </dd>
              </div>
            </dl>
            <HeaderList title="请求头" value={request.headers} />
            <HeaderList title="响应头" value={response.headers} />
            {entry.source === "webview" && (
              <p className={logDetailNoteClasses}>
                前端仅能记录浏览器向应用代码开放的请求和响应头。
              </p>
            )}
            {entry.source === "python" && (
              <p className={logDetailNoteClasses}>
                请求头由 Python 客户端提供；底层自动添加的字段可能不在其中。
              </p>
            )}
          </>
        )}
        {network && tab === "params" && (
          <PairList title="Query 参数" value={request.params} />
        )}
        {network && tab === "request" && <DataViewer value={request.body} />}
        {network && tab === "response" && (
          <DataViewer value={response.body ?? entry.error} />
        )}
        {!network && tab === "input" && <DataViewer value={entry.request} />}
        {!network && tab === "output" && (
          <DataViewer value={entry.error ?? entry.response} />
        )}
      </div>
    </>
  );
}
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function HeaderList({ title, value }: { title: string; value: unknown }) {
  const [revealed, setRevealed] = useState(false);
  const pairs = asPairs(value);
  return (
    <section className="log-pair-section mt-5.5">
      <div className="log-pair-heading flex items-center justify-between gap-3">
        <h3 className={logSectionHeadingClasses}>{title}</h3>
        {pairs.some(([name]) =>
          /authorization|cookie|token|secret|key/i.test(name),
        ) && (
          <button
            className={logCompactActionClasses}
            type="button"
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? "遮盖敏感值" : "显示敏感值"}
          </button>
        )}
      </div>
      <PairRows
        pairs={pairs.map(([name, content]) => [
          name,
          !revealed && /authorization|cookie|token|secret|key/i.test(name)
            ? "••••••"
            : content,
        ])}
      />
    </section>
  );
}
function PairList({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="log-pair-section mt-5.5">
      <h3 className={logSectionHeadingClasses}>{title}</h3>
      <PairRows pairs={asPairs(value)} />
    </section>
  );
}
function PairRows({ pairs }: { pairs: Array<[string, string]> }) {
  if (pairs.length === 0)
    return <p className="log-no-data m-0 text-[13px] text-muted">无数据</p>;
  return (
    <dl className="log-pair-rows m-0">
      {pairs.map(([name, value], index) => (
        <div className={logPropertyRowClasses} key={`${name}-${index}`}>
          <dt className="[overflow-wrap:anywhere] text-muted">{name}</dt>
          <dd className="m-0 [font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] [overflow-wrap:anywhere]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function asPairs(value: unknown): Array<[string, string]> {
  if (Array.isArray(value)) {
    return value
      .filter((pair) => Array.isArray(pair) && pair.length >= 2)
      .map((pair) => [String(pair[0]), String(pair[1])]);
  }
  return Object.entries(asRecord(value)).map(([name, item]) => [
    name,
    String(item),
  ]);
}
function DataViewer({ value }: { value: unknown }) {
  const [raw, setRaw] = useState(false);
  if (value === null || value === undefined)
    return <p className="log-no-data m-0 text-[13px] text-muted">无数据</p>;
  const parsed = typeof value === "string" ? tryParseJson(value) : value;
  return (
    <div className="log-data-viewer">
      <div className="log-data-actions mb-2.5 flex justify-end">
        <button
          className={logCompactActionClasses}
          type="button"
          onClick={() => setRaw((current) => !current)}
        >
          {raw ? "结构化" : "原文"}
        </button>
      </div>
      {raw ? (
        <pre className="m-0 overflow-auto rounded-control border border-solid border-line bg-canvas p-3 [font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] text-[12px] [overflow-wrap:anywhere] whitespace-pre-wrap">
          {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <JsonNode label={null} value={parsed} depth={0} />
      )}
    </div>
  );
}
function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
function JsonNode({
  label,
  value,
  depth,
}: {
  label: string | null;
  value: unknown;
  depth: number;
}) {
  const [open, setOpen] = useState(depth === 0);
  const [visible, setVisible] = useState(100);
  const record = asRecord(value);
  if (record.encoding === "base64" && typeof record.value === "string") {
    return <BinaryAttachment label={label} value={record} />;
  }
  if (value === null || typeof value !== "object") {
    return (
      <div
        className="log-json-leaf min-h-[25px] [font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] text-[12px] [overflow-wrap:anywhere]"
        style={{
          paddingLeft: depth * 16,
        }}
      >
        {label !== null && (
          <span className="log-json-key text-info">{label}: </span>
        )}
        <span>{JSON.stringify(value)}</span>
      </div>
    );
  }
  const entries = Object.entries(value);
  return (
    <div className="log-json-branch">
      <button
        type="button"
        className="log-json-toggle min-h-[25px] w-full border-0 bg-transparent text-left [font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] text-[12px] [overflow-wrap:anywhere] transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover"
        style={{
          paddingLeft: depth * 16,
        }}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <CaretDown className="mr-[5px] h-3 w-3" aria-hidden="true" />
        ) : (
          <CaretRight className="mr-[5px] h-3 w-3" aria-hidden="true" />
        )}
        {label !== null && (
          <span className="log-json-key text-info">{label}: </span>
        )}
        <span>
          {Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {open && (
        <>
          {entries.slice(0, visible).map(([key, child]) => (
            <JsonNode key={key} label={key} value={child} depth={depth + 1} />
          ))}
          {entries.length > visible && (
            <button
              className="log-json-more min-h-8 border-0 bg-transparent text-[12px] text-accent transition-[background-color,color,border-color] duration-120 ease-[ease]"
              type="button"
              onClick={() => setVisible((count) => count + 100)}
            >
              再显示 100 项
            </button>
          )}
        </>
      )}
    </div>
  );
}
function BinaryAttachment({
  label,
  value,
}: {
  label: string | null;
  value: Record<string, unknown>;
}) {
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const contentType = String(value.contentType ?? "application/octet-stream");
  const dataUrl = `data:${contentType};base64,${String(value.value)}`;
  return (
    <div className="log-binary justify-items-[start] grid gap-2 rounded-control border border-solid border-line p-3 text-[12px]">
      <strong>{label ?? "二进制内容"}</strong>
      <span className="text-muted">
        {contentType} · {String(value.byteLength ?? "未知")} 字节
      </span>
      {contentType.startsWith("image/") && (
        <img
          className="max-h-70 max-w-[min(100%,_360px)] object-contain"
          src={dataUrl}
          alt="响应图片预览"
        />
      )}
      <button
        type="button"
        className="log-binary-download inline-flex min-h-9 items-center gap-1.5 border-0 bg-transparent text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:[cursor:wait] disabled:opacity-55 pointer-coarse:min-h-11"
        disabled={saving}
        onClick={() => {
          setSaving(true);
          void saveAttachment(String(value.value), contentType)
            .then((path) => {
              setSavedPath(path);
              setError(null);
            })
            .catch(() => setError("保存附件失败，请检查下载文件夹。"))
            .finally(() => setSaving(false));
        }}
      >
        <DownloadSimple className="h-4 w-4" aria-hidden="true" />
        {saving ? "正在保存…" : "保存附件"}
      </button>
      {savedPath && <span className="text-muted">已保存到：{savedPath}</span>}
      {error && (
        <span className="text-muted" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
