/** Debug-only session log browser with operation details and native export. */
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
      const batch = await listLogs({ search, kind: kind || undefined });
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
    void listLogs({ search, kind: kind || undefined })
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
      className={
        "log-manager grid gap-[20px] max-w-[1280px] [&&&&]:[font-variant-numeric:tabular-nums_lining-nums]"
      }
      aria-labelledby="debug-log-title"
    >
      <header
        className={
          "log-manager-heading flex justify-between gap-[20px] border-b border-solid border-line pb-[18px] [&_p]:m-0 [&_p]:text-muted max-[620px]:flex-col [&&&&]:[align-items:end] [&&&&_h2]:m-[0_0_2px] [&&&&_p]:text-[13px] [@media(max-width:_620px)]:[&&&&]:[align-items:start]"
        }
      >
        <div>
          <h2 className="text-lg font-semibold" id="debug-log-title">
            运行日志
          </h2>
          <p>
            仅记录本次 Debug 运行；退出后自动删除。原始内容可能含有账号凭据。
          </p>
        </div>
        <span
          className={
            "log-session-count m-0 text-muted whitespace-nowrap [&&&&]:text-[13px]"
          }
        >
          当前列表 {logs.length} 条
          {groups.length !== logs.length ? ` / ${groups.length} 组` : ""}
        </span>
      </header>

      <div
        className={
          "log-toolbar flex flex-wrap gap-[12px] [&&&&]:[align-items:end]"
        }
      >
        <label
          className={
            "log-search grid gap-[5px] [&_span]:text-muted [&_input]:w-full [&_input]:min-h-[40px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:bg-surface [&&&&]:text-[13px] [&&&&]:flex-[1_1_250px] [&&&&_input]:p-[0_12px]"
          }
        >
          <span>搜索命令或 URL</span>
          <input
            value={search}
            onChange={(event) => {
              setLoading(true);
              setSearch(event.target.value);
            }}
            placeholder="输入命令名或地址"
          />
        </label>
        <label
          className={
            "log-kind-filter grid gap-[5px] [&_span]:text-muted [&_select]:w-full [&_select]:min-h-[40px] [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[var(--ors-radius-control)] [&_select]:bg-surface [&&&&]:text-[13px] [&&&&]:flex-[0_0_150px] [&&&&_select]:p-[0_12px]"
          }
        >
          <span>来源类型</span>
          <select
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
        <div
          className={
            "log-actions [&_svg]:w-[16px] [&_svg]:h-[16px] flex items-center gap-[8px] [&_>_button]:inline-flex [&_>_button]:items-center [&_>_button]:justify-center [&_>_button]:gap-[6px] [&_>_button]:min-h-[40px] [&_>_button]:border [&_>_button]:border-solid [&_>_button]:border-control [&_>_button]:rounded-[var(--ors-radius-control)] [&_>_button]:bg-surface [&_>_button]:whitespace-nowrap [&_button:hover]:bg-hover max-[620px]:flex-wrap [&&&&_>_button]:p-[0_11px] [&&&&_>_button]:text-[13px]"
          }
        >
          <button
            type="button"
            onClick={() => {
              setPaused((current) => !current);
              if (paused) void refresh();
            }}
          >
            {paused ? (
              <Play aria-hidden="true" />
            ) : (
              <Pause aria-hidden="true" />
            )}
            {paused ? "继续显示" : "暂停显示"}
          </button>
          <button type="button" onClick={() => void exportSession()}>
            <DownloadSimple aria-hidden="true" /> 导出
          </button>
          {clearing ? (
            <span
              className={
                "log-clear-confirm flex items-center gap-[8px] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[6px] [&_button]:min-h-[40px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:bg-surface [&_button]:whitespace-nowrap [&_button:first-child]:border-danger [&_button:first-child]:text-danger [&&&&_button]:p-[0_11px] [&&&&_button]:text-[13px]"
              }
            >
              <button type="button" onClick={() => void clearSession()}>
                确认清空
              </button>
              <button type="button" onClick={() => setClearing(false)}>
                取消
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setClearing(true)}>
              <Trash aria-hidden="true" /> 清空
            </button>
          )}
        </div>
      </div>

      {exportPath && (
        <p
          className={
            "log-export-note m-0 rounded-[var(--ors-radius-control)] text-success bg-surface [&&&&]:p-[10px_12px] [&&&&]:[overflow-wrap:anywhere] [&&&&]:text-[13px]"
          }
        >
          已导出到：{exportPath}
        </p>
      )}
      {error && (
        <p
          className={
            "log-error m-0 rounded-[var(--ors-radius-control)] text-danger bg-surface [&&&&]:p-[10px_12px] [&&&&]:[overflow-wrap:anywhere] [&&&&]:text-[13px]"
          }
          role="alert"
        >
          {error}
        </p>
      )}
      {captureFailures > 0 && (
        <p
          className={
            "log-capture-warning m-0 rounded-[var(--ors-radius-control)] text-warning bg-surface [&&&&]:p-[10px_12px] [&&&&]:[overflow-wrap:anywhere] [&&&&]:text-[13px]"
          }
          role="alert"
        >
          有 {captureFailures} 条记录未能保存；本次日志可能不完整。
        </p>
      )}

      <div
        className={
          "log-workspace grid min-h-[540px] border border-solid border-line rounded-[var(--ors-radius-panel)] overflow-hidden bg-surface [&&&&]:grid-cols-[minmax(290px,_0.95fr)_minmax(0,_1.25fr)] [@media(max-width:_1120px)]:[&&&&]:grid-cols-[minmax(0,_1fr)]"
        }
      >
        <section
          className={
            "log-list min-w-0 border-r border-solid border-line max-[1120px]:border-b max-[1120px]:border-solid max-[1120px]:border-line [@media(max-width:_1120px)]:[&&&&]:[border-right:0]"
          }
          aria-label="日志列表"
        >
          <div
            className={
              "log-list-heading grid items-center gap-[10px] min-h-[42px] border-b border-solid border-line text-muted max-[620px]:gap-[6px] [@media(max-width:_620px)]:[&&&&]:px-[10px] [&&&&]:grid-cols-[105px_minmax(0,_1fr)_50px] [&&&&]:p-[0_14px] [&&&&]:text-[12px] [@media(max-width:_620px)]:[&&&&]:grid-cols-[80px_minmax(0,_1fr)_42px]"
            }
          >
            <span>时间 / 来源</span>
            <span>操作</span>
            <span>结果</span>
          </div>
          {loading && logs.length === 0 ? (
            <p
              className={
                "log-empty m-0 text-muted [&&&&]:p-[32px_20px] [&&&&]:text-[13px]"
              }
              role="status"
            >
              正在读取本次运行的日志…
            </p>
          ) : logs.length === 0 ? (
            <p
              className={
                "log-empty m-0 text-muted [&&&&]:p-[32px_20px] [&&&&]:text-[13px]"
              }
            >
              暂无匹配记录。执行操作后，记录会出现在这里。
            </p>
          ) : (
            <div
              className={
                "log-list-rows overflow-y-auto [@media(max-width:_1120px)]:[&&&&]:max-h-[270px] [&&&&]:max-h-[min(68dvh,_780px)]"
              }
            >
              {groups.map((group) => {
                const entry = group.primary;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={
                      "log-row grid items-center gap-[10px] w-full min-h-[58px] border-0 border-b border-solid border-line text-left [&:hover]:bg-hover [&[aria-current=true]]:bg-selected max-[620px]:gap-[6px] [@media(max-width:_620px)]:[&&&&]:px-[10px] [&&&&]:grid-cols-[105px_minmax(0,_1fr)_50px] [&&&&]:p-[8px_14px] [&&&&]:[background:transparent] [&&&&]:text-[13px] [@media(max-width:_620px)]:[&&&&]:grid-cols-[80px_minmax(0,_1fr)_42px]"
                    }
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
                    <span
                      className={
                        "log-row-meta grid [&_small]:text-muted [&&&&]:leading-[1.35] [&&&&_small]:text-[11px]"
                      }
                    >
                      <time>
                        {new Date(entry.timestampMs).toLocaleTimeString()}
                      </time>
                      <small>{sourceLabel(entry.source)}</small>
                    </span>
                    <span
                      className={
                        "log-row-name overflow-hidden whitespace-nowrap [&&&&]:[text-overflow:ellipsis]"
                      }
                      title={entry.url ?? entry.name}
                    >
                      {entry.name}
                      {group.occurrences.length > 1 && (
                        <small
                          className={
                            "log-repeat-count inline-block ml-[7px] rounded-[var(--ors-radius-pill)] text-accent bg-surface font-bold [&&&&]:p-[1px_6px] [&&&&]:text-[11px]"
                          }
                        >
                          ×{group.occurrences.length}
                        </small>
                      )}
                    </span>
                    <span
                      className={`[&&&&]:text-[12px] text-right [&.success]:text-success log-outcome ${entry.outcome}`}
                    >
                      {entry.statusCode ??
                        (entry.outcome === "success" ? "成功" : "失败")}
                    </span>
                  </button>
                );
              })}
              {hasMore && (
                <button
                  className={
                    "log-load-more w-full min-h-[42px] border-0 text-accent [&&&&]:[background:transparent] [&&&&]:text-[13px]"
                  }
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
            <div
              className={
                "log-detail-empty m-0 text-muted [&&&&]:p-[32px_20px] [&&&&]:text-[13px]"
              }
            >
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
      <div
        className={
          "log-detail-heading [&_h2]:m-0 [&_p]:text-muted [&&&&]:p-[17px_20px_12px] [&&&&_h2]:[overflow-wrap:anywhere] [&&&&_h2]:text-[17px] [&&&&_p]:m-[5px_0_0] [&&&&_p]:text-[12px]"
        }
      >
        <h2 className="text-lg font-semibold">{entry.name}</h2>
        <p>
          {new Date(entry.timestampMs).toLocaleString()} ·{" "}
          {sourceLabel(entry.source)} · {entry.durationMs?.toFixed(0) ?? "—"} ms
        </p>
        {group && group.occurrences.length > 1 && (
          <div
            className={
              "log-occurrences flex items-center flex-wrap gap-[6px] mt-[10px] text-muted [&_button]:min-h-[30px] [&_button]:border [&_button]:border-solid [&_button]:border-line [&_button]:rounded-[var(--ors-radius-control)] [&_button]:bg-surface [&_button[aria-current=true]]:border-accent [&_button[aria-current=true]]:text-accent [&_button[aria-current=true]]:bg-selected [&&&&]:text-[12px] [&&&&_button]:p-[0_8px] [&&&&_button]:text-[12px]"
            }
            aria-label="相同调用的原始记录"
          >
            <span>相同调用折叠为 {group.occurrences.length} 条：</span>
            {group.occurrences.map((occurrence, index) => (
              <button
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
        className={
          'log-detail-tabs flex overflow-x-auto border-b border-solid border-line [&_button]:min-h-[42px] [&_button]:border-0 [&_button]:text-muted [&_button[aria-selected=true]]:text-accent [&_button[aria-selected=true]]:font-semibold [&&&&]:p-[0_12px] [&&&&_button]:flex-[0_0_auto] [&&&&_button]:[border-bottom:2px_solid_transparent] [&&&&_button]:p-[0_10px] [&&&&_button]:[background:transparent] [&&&&_button]:text-[13px] [&&&&_button[aria-selected="true"]]:[border-bottom-color:var(--ors-color-accent)]'
        }
        role="tablist"
        aria-label="详情类别"
      >
        {tabs.map(([key, label]) => (
          <button
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
        className={
          "log-detail-content overflow-auto [@media(max-width:_620px)]:[&&&&]:px-[12px] [&&&&]:max-h-[min(62dvh,_720px)] [&&&&]:p-[18px_20px_24px]"
        }
        role="tabpanel"
      >
        {network && tab === "headers" && (
          <>
            <dl
              className={
                "log-general m-0 [&_div]:grid [&_div]:gap-[10px] [&_div]:border-b [&_div]:border-solid [&_div]:border-line [&_dt]:text-muted [&_dd]:m-0 [&&&&_div]:grid-cols-[minmax(110px,_1fr)_minmax(0,_2fr)] [&&&&_div]:p-[7px_0] [&&&&_div]:text-[12px] [&&&&_dt]:[overflow-wrap:anywhere] [&&&&_dd]:[overflow-wrap:anywhere] [&&&&_dd]:[font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace]"
              }
            >
              <div>
                <dt>请求地址</dt>
                <dd>{String(request.url ?? "—")}</dd>
              </div>
              <div>
                <dt>请求方法</dt>
                <dd>{String(request.method ?? "—")}</dd>
              </div>
              <div>
                <dt>状态码</dt>
                <dd>{String(response.status ?? "—")}</dd>
              </div>
            </dl>
            <HeaderList title="请求头" value={request.headers} />
            <HeaderList title="响应头" value={response.headers} />
            {entry.source === "webview" && (
              <p
                className={
                  "log-detail-note text-muted [&&&&]:m-[5px_0_0] [&&&&]:text-[12px]"
                }
              >
                前端仅能记录浏览器向应用代码开放的请求和响应头。
              </p>
            )}
            {entry.source === "python" && (
              <p
                className={
                  "log-detail-note text-muted [&&&&]:m-[5px_0_0] [&&&&]:text-[12px]"
                }
              >
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
    <section
      className={
        "log-pair-section mt-[22px] [&&&&_h3]:m-[0_0_8px] [&&&&_h3]:text-[14px]"
      }
    >
      <div
        className={
          "log-pair-heading [&_button:hover]:bg-hover flex items-center justify-between gap-[12px] [&_button]:min-h-[32px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:bg-surface [&&&&_button]:p-[0_9px] [&&&&_button]:text-[12px]"
        }
      >
        <h3 className="text-base font-semibold">{title}</h3>
        {pairs.some(([name]) =>
          /authorization|cookie|token|secret|key/i.test(name),
        ) && (
          <button
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
    <section
      className={
        "log-pair-section mt-[22px] [&&&&_h3]:m-[0_0_8px] [&&&&_h3]:text-[14px]"
      }
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <PairRows pairs={asPairs(value)} />
    </section>
  );
}

function PairRows({ pairs }: { pairs: Array<[string, string]> }) {
  if (pairs.length === 0)
    return (
      <p className={"log-no-data m-0 text-muted [&&&&]:text-[13px]"}>无数据</p>
    );
  return (
    <dl
      className={
        "log-pair-rows m-0 [&_div]:grid [&_div]:gap-[10px] [&_div]:border-b [&_div]:border-solid [&_div]:border-line [&_dt]:text-muted [&_dd]:m-0 [&&&&_div]:grid-cols-[minmax(110px,_1fr)_minmax(0,_2fr)] [&&&&_div]:p-[7px_0] [&&&&_div]:text-[12px] [&&&&_dt]:[overflow-wrap:anywhere] [&&&&_dd]:[overflow-wrap:anywhere] [&&&&_dd]:[font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace]"
      }
    >
      {pairs.map(([name, value], index) => (
        <div key={`${name}-${index}`}>
          <dt>{name}</dt>
          <dd>{value}</dd>
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
    return (
      <p className={"log-no-data m-0 text-muted [&&&&]:text-[13px]"}>无数据</p>
    );
  const parsed = typeof value === "string" ? tryParseJson(value) : value;
  return (
    <div
      className={
        "log-data-viewer [&_pre]:m-0 [&_pre]:overflow-auto [&_pre]:border [&_pre]:border-solid [&_pre]:border-line [&_pre]:rounded-[var(--ors-radius-control)] [&_pre]:p-[12px] [&_pre]:bg-canvas [&_pre]:whitespace-pre-wrap [&&&&_pre]:[font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] [&&&&_pre]:text-[12px] [&&&&_pre]:[overflow-wrap:anywhere]"
      }
    >
      <div
        className={
          "log-data-actions [&_button:hover]:bg-hover [&_button]:min-h-[32px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:bg-surface flex justify-end mb-[10px] [&&&&_button]:p-[0_9px] [&&&&_button]:text-[12px]"
        }
      >
        <button type="button" onClick={() => setRaw((current) => !current)}>
          {raw ? "结构化" : "原文"}
        </button>
      </div>
      {raw ? (
        <pre>
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
        className={
          "log-json-leaf min-h-[25px] [&&&&]:[font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] [&&&&]:text-[12px] [&&&&]:[overflow-wrap:anywhere]"
        }
        style={{ paddingLeft: depth * 16 }}
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
        className={
          "log-json-toggle min-h-[25px] w-full border-0 text-left [&:hover]:bg-hover [&_svg]:w-[12px] [&_svg]:h-[12px] [&_svg]:mr-[5px] [&&&&]:[font-family:ui-monospace,_SFMono-Regular,_Consolas,_monospace] [&&&&]:text-[12px] [&&&&]:[overflow-wrap:anywhere] [&&&&]:[background:transparent]"
        }
        style={{ paddingLeft: depth * 16 }}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <CaretDown aria-hidden="true" />
        ) : (
          <CaretRight aria-hidden="true" />
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
              className={
                "log-json-more min-h-[32px] border-0 text-accent [&&&&]:[background:transparent] [&&&&]:text-[12px]"
              }
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
    <div
      className={
        "log-binary grid gap-[8px] border border-solid border-line rounded-[var(--ors-radius-control)] p-[12px] [&_span]:text-muted [&_img]:max-h-[280px] [&_img]:object-contain [&&&&]:[justify-items:start] [&&&&]:text-[12px] [&&&&_img]:max-w-[min(100%,_360px)]"
      }
    >
      <strong>{label ?? "二进制内容"}</strong>
      <span>
        {contentType} · {String(value.byteLength ?? "未知")} 字节
      </span>
      {contentType.startsWith("image/") && (
        <img src={dataUrl} alt="响应图片预览" />
      )}
      <button
        type="button"
        className={
          "log-binary-download [&_svg]:w-[16px] [&_svg]:h-[16px] inline-flex items-center gap-[6px] border-0 text-accent [&&&&]:[background:transparent] [&&&&:disabled]:[cursor:wait] [&&&&:disabled]:opacity-[0.55]"
        }
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
        <DownloadSimple aria-hidden="true" />
        {saving ? "正在保存…" : "保存附件"}
      </button>
      {savedPath && <span>已保存到：{savedPath}</span>}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
