/** Paired phone client for viewing game chat with capability-gated sending. */
import {
  ChatCircleDots,
  LinkBreak,
  PaperPlaneTilt,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { ChatMessage } from "../features/chat/types";
import { ChatFilterBar } from "../features/chat/components/ChatFilterBar";
import { ChatChannelBadge } from "../features/chat/components/ChatChannelBadge";
import {
  matchesChatFilters,
  type ChatFilter,
} from "../features/chat/utils/channels";
import {
  chatSendChannels,
  chatMessageBudget,
  validTellRecipient,
  type ChatSendChannel,
} from "../features/chat/utils/sendChannels";

type ConnectionState =
  "pairing" | "online" | "reconnecting" | "disconnected" | "error" | "preview";

type MobileState = {
  paired: boolean;
  online: boolean;
  canSend: boolean;
  messages: ChatMessage[];
};

type MobileEvent =
  | { kind: "message"; message: ChatMessage }
  | { kind: "status"; online: boolean };

const encoder = new TextEncoder();
/** Development previews are read-only and do not represent a paired session. */
const previewMode =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("preview");
const previewMessages: ChatMessage[] = [
  {
    sequence: 1,
    timestamp: 1_789_761_540,
    logKind: 10,
    sourceKind: 0,
    targetKind: 0,
    sender: "琳·晨星",
    message: "今晚八点在利姆萨集合，先打两轮日随。",
  },
  {
    sequence: 2,
    timestamp: 1_789_761_604,
    logKind: 14,
    sourceKind: 0,
    targetKind: 0,
    sender: "阿尔伯特",
    message: "收到，我换完装备就过去。",
  },
  {
    sequence: 3,
    timestamp: 1_789_761_680,
    logKind: 57,
    sourceKind: 0,
    targetKind: 0,
    sender: "系统",
    message: "你已进入休息区。",
  },
];

export function MobileChatApp() {
  const [connection, setConnection] = useState<ConnectionState>("pairing");
  const [pairingAttempt, setPairingAttempt] = useState(0);
  const [notice, setNotice] = useState("正在与电脑完成一次性配对…");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filter, setFilter] = useState<ChatFilter[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendChannel, setSendChannel] = useState<ChatSendChannel>("current");
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const ledger = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const previousFilter = useRef(filter);
  const eventSource = useRef<EventSource | null>(null);
  const byteCount = encoder.encode(draft).length;
  const byteBudget = Math.max(0, chatMessageBudget(sendChannel, recipient));
  const invalidRecipient =
    sendChannel === "tell" && !validTellRecipient(recipient);
  const invalidText =
    draft.trimStart().startsWith("/") || /\p{Cc}/u.test(draft);
  const invalidDraft =
    byteCount > byteBudget || invalidText || invalidRecipient || !draft.trim();
  const visibleMessages = messages.filter((message) =>
    matchesChatFilters(message.logKind, filter),
  );

  // Scanning another code can navigate only the fragment without reloading this page.
  useEffect(() => {
    const retry = () => setPairingAttempt((current) => current + 1);
    window.addEventListener("hashchange", retry);
    return () => window.removeEventListener("hashchange", retry);
  }, []);

  useEffect(() => {
    let active = true;
    let sendingAvailable = false;
    async function connect() {
      setConnection("pairing");
      setCanSend(false);
      if (previewMode) {
        setMessages(previewMessages);
        setConnection("preview");
        setNotice("界面预览：以下聊天为演示数据，未连接游戏，不能发送消息。");
        return;
      }
      try {
        const token = window.location.hash.slice(1);
        // Reopening a used QR in the paired browser should reuse its existing session.
        let state: MobileState;
        try {
          state = await request<MobileState>("/api/state");
        } catch (reason) {
          if (!active) return;
          if (
            !token ||
            !(reason instanceof MobileApiError) ||
            reason.code !== "not_paired"
          )
            throw reason;
          await request("/api/pair", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          state = await request<MobileState>("/api/state");
        }
        if (!active) return;
        if (token) {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
        }
        setMessages(uniqueMessages(state.messages));
        sendingAvailable = state.canSend;
        setCanSend(state.canSend);
        applyOnlineState(state.online, state.canSend);
        openEventStream();
      } catch (reason) {
        if (!active) return;
        setConnection("error");
        setNotice(readError(reason, "配对失败，请回到电脑重新生成二维码。"));
      }
    }

    function openEventStream() {
      const source = new EventSource("/api/events", { withCredentials: true });
      eventSource.current = source;
      source.onmessage = (event) => {
        const update = JSON.parse(event.data) as MobileEvent;
        if (update.kind === "status") {
          applyOnlineState(update.online, sendingAvailable);
          return;
        }
        setMessages((current) =>
          uniqueMessages([...current, update.message]).slice(-500),
        );
      };
      source.onerror = async () => {
        if (!active) return;
        setConnection("reconnecting");
        setNotice("实时连接暂时中断，浏览器正在自动重连。");
        try {
          await request<MobileState>("/api/state");
        } catch (reason) {
          if (!active || eventSource.current !== source) return;
          if (
            reason instanceof MobileApiError &&
            reason.code === "not_paired"
          ) {
            source.close();
            setCanSend(false);
            setConnection("error");
            setNotice("配对已失效，请扫描电脑上的新二维码重新连接。");
          }
        }
      };
      source.onopen = async () => {
        if (!active) return;
        try {
          const state = await request<MobileState>("/api/state");
          if (!active) return;
          setMessages((current) =>
            uniqueMessages([...current, ...state.messages]).slice(-500),
          );
          sendingAvailable = state.canSend;
          setCanSend(state.canSend);
          applyOnlineState(state.online, state.canSend);
        } catch {
          return;
        }
      };
    }

    function applyOnlineState(online: boolean, sendingAvailable: boolean) {
      setConnection(online ? "online" : "reconnecting");
      setNotice(
        online
          ? sendingAvailable
            ? "已连接。手机只能发送普通文字，不支持游戏指令。"
            : "已连接，只读模式。发送功能正在进行原生调用验证。"
          : "游戏连接已中断，正在等待恢复。",
      );
    }

    void connect();
    return () => {
      active = false;
      eventSource.current?.close();
    };
  }, [pairingAttempt]);

  useLayoutEffect(() => {
    // Filter changes start at the latest result; incoming messages preserve history browsing.
    if (previousFilter.current !== filter) {
      followLatest.current = true;
      previousFilter.current = filter;
    }
    if (ledger.current && followLatest.current) {
      ledger.current.scrollTop = ledger.current.scrollHeight;
    }
  }, [visibleMessages, filter]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSend || connection !== "online" || sending || invalidDraft) return;
    setSending(true);
    try {
      await request("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: draft,
          channel: sendChannel,
          recipient: sendChannel === "tell" ? recipient : "",
        }),
      });
      setDraft("");
      setNotice(
        `${chatSendChannels.find((channel) => channel.id === sendChannel)!.label}：消息已交给游戏发送。`,
      );
    } catch (reason) {
      setNotice(readError(reason, "消息发送失败，请稍后重试。"));
    } finally {
      setSending(false);
    }
  }

  async function disconnect() {
    if (previewMode) return;
    try {
      await request("/api/disconnect", { method: "POST" });
    } finally {
      eventSource.current?.close();
      setConnection("disconnected");
      setNotice(
        "此手机已断开。要重新连接，请在电脑上点击“生成新配对码”后重新扫码。",
      );
    }
  }

  const online = connection === "online";

  // Short windows use document scrolling so fixed controls cannot clip the composer.
  return (
    <main
      className={
        "mobile-chat-shell mx-auto grid h-dvh min-h-0 w-full max-w-[46rem] bg-canvas text-ink [@media(min-width:_46rem)]:border [@media(min-width:_46rem)]:border-solid [@media(min-width:_46rem)]:border-line [@media(min-width:_46rem)]:rounded-[12px] [@media(min-width:_46rem)]:overflow-hidden [&&&&]:grid-rows-[auto_auto_auto_minmax(0,_1fr)_auto] [@media(min-width:_46rem)]:[&&&&]:h-[calc(100dvh_-_2rem)] [@media(min-width:_46rem)]:[&&&&]:[margin-block:1rem] [@media(max-height:_32rem)]:[&&&&&]:h-auto [@media(max-height:_32rem)]:[&&&&&]:min-h-dvh [@media(max-height:_32rem)]:[&&&&&]:grid-rows-[auto_auto_auto_auto_auto]"
      }
    >
      <header
        className={
          "mobile-chat-header flex items-center justify-between gap-4 border-b border-accent bg-tool-soft px-4 pb-4 [&_h1]:m-0 [&_h1]:text-xl [&_h1]:font-semibold [&_p]:text-muted [&&&&]:[padding-top:calc(1rem_+_env(safe-area-inset-top))] [&&&&_h1]:leading-[1.4] [&&&&_p]:m-[0.1rem_0_0] [&&&&_p]:text-[0.72rem]"
        }
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">游戏聊天</h1>
          <p>OpenRisingStones</p>
        </div>
        <ConnectionMark state={connection} />
      </header>

      <div
        className={
          "mobile-chat-notice border border-warning bg-warning-soft [&[data-state=online]]:bg-success-soft [&[data-state=error]]:bg-danger-soft [&[data-state=disconnected]]:bg-danger-soft [&[data-state=online]]:border-success [&[data-state=online]]:text-success [&[data-state=error]]:border-danger [&[data-state=disconnected]]:border-danger flex gap-[0.6rem] items-start text-warning rounded-[8px] [&[data-state=error]]:text-danger [&[data-state=disconnected]]:text-danger [&_svg]:w-[1rem] [&_svg]:h-[1rem] [&_svg]:mt-[0.12rem] [&&&&]:m-[0.8rem_1rem_0] [&&&&]:p-[0.7rem_0.8rem] [&&&&]:text-[0.78rem] [&&&&]:leading-[1.55] [&&&&_svg]:flex-[0_0_auto]"
        }
        data-state={connection}
        role="status"
      >
        <WarningCircle weight="fill" aria-hidden="true" />
        <span>{notice}</span>
      </div>

      <ChatFilterBar
        value={filter}
        onChange={setFilter}
        visibleCount={visibleMessages.length}
        totalCount={messages.length}
      />
      <section
        className={
          'mobile-chat-ledger flex flex-col min-h-0 overflow-y-auto [@media(max-height:_32rem)]:max-h-[40dvh] [&&&&]:p-[0.85rem_1rem_1.4rem] [&&&&]:[overscroll-behavior:contain] [&&&&]:[scrollbar-color:var(--ors-color-control-line)_transparent] [&&&&::before]:[margin-top:auto] [&&&&::before]:[content:""] [&&&&:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&:focus-visible]:[outline-offset:-2px]'
        }
        ref={ledger}
        aria-label="游戏聊天记录"
        tabIndex={0}
        onScroll={(event) => {
          const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
          followLatest.current = scrollHeight - scrollTop - clientHeight <= 24;
        }}
      >
        {visibleMessages.length === 0 ? (
          <div
            className={
              "mobile-chat-empty [&_strong]:text-ink grid min-h-0 text-disabled text-center [&_svg]:w-[2rem] [&_svg]:h-[2rem] [&_svg]:text-control [&_span]:mt-[0.25rem] [&_span]:text-xs [&&&&]:flex-[1] [&&&&]:[place-content:center] [&&&&_svg]:m-[0_auto_0.65rem] [&&&&_strong]:text-[0.95rem]"
            }
          >
            <ChatCircleDots aria-hidden="true" />
            <strong>
              {filter.length === 0 ? "等待新的游戏对话" : "暂无此类消息"}
            </strong>
            <span>
              {filter.length === 0
                ? "连接后产生的消息会显示在这里。"
                : "可切换到全部消息，或等待新的对话。"}
            </span>
          </div>
        ) : (
          visibleMessages.map((message) => (
            <article
              className={
                "mobile-chat-message border-b border-line [&_>_div]:flex [&_>_div]:flex-wrap [&_>_div]:gap-[0.5rem] [&_>_div]:items-baseline [&_>_div]:mb-[0.18rem] [&_strong]:text-accent-hover [&_span:not(.chat-channel-badge)]:text-disabled [&_span:not(.chat-channel-badge)]:tabular-nums [&_time]:text-disabled [&_time]:tabular-nums [&_p]:m-0 [&_p]:text-ink [&_p]:whitespace-pre-wrap [&&&&]:flex-[0_0_auto] [&&&&]:p-[0.68rem_0] [&&&&_strong]:text-[0.8rem] [&&&&_span:not(.chat-channel-badge)]:text-[0.67rem] [&&&&_time]:text-[0.67rem] [&&&&_p]:text-[0.9rem] [&&&&_p]:leading-[1.6] [&&&&_p]:[overflow-wrap:anywhere]"
              }
              key={message.sequence}
            >
              <div>
                <ChatChannelBadge logKind={message.logKind} />
                {message.sender && <strong>{message.sender}</strong>}
                <time>{formatTime(message.timestamp)}</time>
              </div>
              <p>{message.message}</p>
            </article>
          ))
        )}
      </section>

      <form
        className={
          "mobile-chat-composer bg-canvas border-t border-solid border-line [&_>_label]:block [&_>_label]:mb-[0.42rem] [&_>_label]:text-muted [&_>_label]:font-semibold [&&&&]:bottom-[0] [&&&&]:p-[0.8rem_1rem_calc(0.75rem_+_env(safe-area-inset-bottom))] [&&&&_>_label]:text-[0.72rem]"
        }
        onSubmit={(event) => void submit(event)}
      >
        <div
          className={
            "mobile-chat-send-channel flex items-center gap-[12px] mb-[8px] text-muted text-xs font-semibold [&_select]:min-w-0 [&_select]:min-h-[44px] [&_select]:text-ink [&_select]:bg-surface [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[8px] [&_select]:w-full [&&&&_select]:p-[8px_10px] [&&&&_select]:[font:inherit] [&&&&_select]:flex-[1] [&&&&_select:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_select:focus-visible]:[outline-offset:2px]"
          }
        >
          <label htmlFor="chat-send-channel">发送频道</label>
          <select
            id="chat-send-channel"
            value={sendChannel}
            disabled={!online || !canSend || sending}
            onChange={(event) =>
              setSendChannel(event.target.value as ChatSendChannel)
            }
          >
            <optgroup label="聊天">
              {chatSendChannels
                .filter((channel) => !channel.id.includes("linkshell"))
                .map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.label}
                  </option>
                ))}
            </optgroup>
            <optgroup label="通讯贝">
              {chatSendChannels
                .filter((channel) => channel.id.startsWith("linkshell"))
                .map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.label}
                  </option>
                ))}
            </optgroup>
            <optgroup label="跨服通讯贝">
              {chatSendChannels
                .filter((channel) => channel.id.startsWith("cross_linkshell"))
                .map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.label}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
        {sendChannel === "tell" && (
          <div
            className={
              "mobile-chat-recipient [&_input]:min-w-0 [&_input]:min-h-[44px] [&_input]:text-ink [&_input]:bg-surface [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[8px] grid items-center mb-[8px] text-muted text-xs [&_p]:m-0 [&_p]:text-danger [&&&&_input]:p-[8px_10px] [&&&&_input]:[font:inherit] [&&&&]:grid-cols-[auto_minmax(0,_1fr)] [&&&&]:gap-[8px_12px] [&&&&_p]:[grid-column:1_/_-1] [&&&&_input:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_input:focus-visible]:[outline-offset:2px]"
            }
          >
            <label htmlFor="chat-recipient">收件人</label>
            <input
              id="chat-recipient"
              value={recipient}
              maxLength={128}
              disabled={!online || !canSend || sending}
              placeholder="角色名@所属服务器"
              autoComplete="off"
              onChange={(event) => setRecipient(event.target.value)}
              aria-invalid={recipient.length > 0 && invalidRecipient}
            />
            {recipient.length > 0 && invalidRecipient && (
              <p role="alert">请输入正确的角色名@服务器，最多 128 字节。</p>
            )}
          </div>
        )}
        <div
          className={
            "mobile-chat-compose-row grid gap-[0.55rem] items-stretch [&_textarea]:w-full [&_textarea]:min-h-[3rem] [&_textarea]:max-h-[7.5rem] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:border [&_textarea]:border-solid [&_textarea]:border-control [&_textarea]:rounded-[8px] [&_textarea::placeholder]:text-muted [&_>_button]:grid [&_>_button]:min-w-16 [&_>_button]:place-content-center [&_>_button]:rounded-lg [&_>_button]:border [&_>_button]:border-accent [&_>_button]:bg-accent [&_>_button]:px-3 [&_>_button]:py-2 [&_>_button]:text-on-accent [&_>_button:hover:not(:disabled)]:bg-accent-hover [&_>_button:disabled]:cursor-not-allowed [&_textarea:disabled]:cursor-not-allowed [&_>_button_svg]:w-[1.1rem] [&_>_button_svg]:h-[1.1rem] [&_>_button_span]:font-bold [&&&&]:grid-cols-[minmax(0,_1fr)_auto] [&&&&_textarea]:p-[0.68rem_0.75rem] [&&&&_textarea]:[resize:vertical] [&&&&_textarea]:leading-[1.45] [&&&&_>_button:disabled]:opacity-[0.55] [&&&&_textarea:disabled]:opacity-[0.55] [&&&&_>_button_svg]:m-[0_auto_0.16rem] [&&&&_>_button_span]:text-[0.7rem]"
          }
        >
          <textarea
            id="chat-message"
            aria-label="聊天消息"
            rows={2}
            maxLength={500}
            value={draft}
            disabled={!online || !canSend || sending}
            placeholder={canSend ? "输入普通聊天文字" : "当前为只读模式"}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // IME confirmation must not send; keyboard sends reuse all form guards.
              if (
                event.key !== "Enter" ||
                event.shiftKey ||
                event.nativeEvent.isComposing ||
                event.nativeEvent.keyCode === 229
              )
                return;
              event.preventDefault();
              if (!event.repeat) event.currentTarget.form?.requestSubmit();
            }}
          />
          <button
            type="submit"
            aria-label="发送消息"
            disabled={!online || !canSend || sending || !draft || invalidDraft}
          >
            <PaperPlaneTilt weight="fill" aria-hidden="true" />
            <span>{sending ? "发送中" : "发送"}</span>
          </button>
        </div>
        {!canSend && (
          <p
            className={
              "mobile-chat-input-note text-warning [&&&&]:m-[0.4rem_0_0] [&&&&]:text-[0.72rem] [&&&&]:leading-[1.5]"
            }
            role="status"
          >
            当前连接暂不支持发送消息。
          </p>
        )}
        {canSend && invalidText && (
          <p
            className={
              "mobile-chat-input-error text-danger [&&&&]:m-[0.4rem_0_0] [&&&&]:text-[0.72rem]"
            }
            role="alert"
          >
            请输入单行普通文字，不能发送斜杠指令或控制字符。
          </p>
        )}
        <div
          className={
            "mobile-chat-compose-meta flex justify-between gap-[1rem] mt-[0.45rem] text-muted [&_>_span[data-invalid=true]]:text-danger [&_>_span[data-invalid=true]]:font-bold [&_button]:inline-flex [&_button]:gap-[0.3rem] [&_button]:items-center [&_button]:p-0 [&_button]:text-accent-hover [&_button]:border-0 [&_button:disabled]:text-disabled [&_button:disabled]:cursor-not-allowed [&&&&]:text-[0.68rem] [&&&&_button]:[background:transparent] [&&&&_button]:[text-decoration:underline] [&&&&_button]:[text-underline-offset:0.2rem]"
          }
        >
          <span data-invalid={byteCount > byteBudget}>
            {byteCount} / {byteBudget} 字节
          </span>
          <button
            type="button"
            disabled={!online}
            onClick={() => void disconnect()}
          >
            <LinkBreak aria-hidden="true" />
            断开此手机
          </button>
        </div>
      </form>
    </main>
  );
}

function ConnectionMark({ state }: { state: ConnectionState }) {
  const labels: Record<ConnectionState, string> = {
    pairing: "正在配对",
    online: "已连接",
    reconnecting: "正在重连",
    disconnected: "已断开",
    error: "连接失败",
    preview: "演示预览",
  };
  return (
    <span
      className={
        'mobile-chat-connection inline-flex gap-[0.45rem] items-center text-muted font-semibold [&::before]:w-[0.5rem] [&::before]:h-[0.5rem] [&::before]:bg-warning [&[data-state=online]::before]:bg-success [&[data-state=error]::before]:bg-danger [&[data-state=disconnected]::before]:bg-danger [&&&&]:text-[0.78rem] [&&&&::before]:[content:""] [&&&&::before]:rounded-[50%]'
      }
      data-state={state}
    >
      {labels[state]}
    </span>
  );
}

/** Preserve API codes so authentication failures do not trigger endless SSE reconnects. */
class MobileApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T = undefined>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new MobileApiError(
      body?.code ?? "request_failed",
      body?.message || `HTTP request failed (${response.status}).`,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

function uniqueMessages(messages: ChatMessage[]) {
  const seen = new Set<number>();
  // Reconnect history can arrive after live events; sequence defines the display order.
  return messages
    .filter((message) => {
      if (seen.has(message.sequence)) return false;
      seen.add(message.sequence);
      return true;
    })
    .sort((left, right) => left.sequence - right.sequence);
}

function readError(reason: unknown, fallback: string) {
  if (reason instanceof MobileApiError) {
    if (reason.code === "pairing_failed")
      return "配对码已过期或已使用，请在电脑上点击“生成新配对码”后重新扫码。";
    if (reason.code === "not_paired")
      return "配对已失效，请扫描电脑上的新二维码重新连接。";
  }
  return reason instanceof Error ? reason.message : fallback;
}

function formatTime(timestamp: number) {
  const date = timestamp > 0 ? new Date(timestamp * 1_000) : new Date();
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}
