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
import { ChatFilterBar } from "../features/chat/ChatFilterBar";
import { ChatChannelBadge } from "../features/chat/ChatChannelBadge";
import { matchesChatFilters, type ChatFilter } from "../features/chat/channels";
import {
  chatSendChannels,
  chatMessageBudget,
  validTellRecipient,
  type ChatSendChannel,
} from "../features/chat/sendChannels";

type ConnectionState =
  "pairing" | "online" | "reconnecting" | "disconnected" | "error";

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
      if (
        import.meta.env.DEV &&
        new URLSearchParams(window.location.search).has("preview")
      ) {
        setMessages(previewMessages);
        setConnection("online");
        sendingAvailable = true;
        setCanSend(true);
        setNotice("已连接。手机只能发送普通文字，不支持游戏指令。");
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

  return (
    <main className="mobile-chat-shell">
      <header className="mobile-chat-header">
        <div>
          <h1>游戏聊天</h1>
          <p>OpenRisingStones</p>
        </div>
        <ConnectionMark state={connection} />
      </header>

      <div className="mobile-chat-notice" data-state={connection} role="status">
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
        className="mobile-chat-ledger"
        ref={ledger}
        aria-label="游戏聊天记录"
        tabIndex={0}
        onScroll={(event) => {
          const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
          followLatest.current = scrollHeight - scrollTop - clientHeight <= 24;
        }}
      >
        {visibleMessages.length === 0 ? (
          <div className="mobile-chat-empty">
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
            <article className="mobile-chat-message" key={message.sequence}>
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
        className="mobile-chat-composer"
        onSubmit={(event) => void submit(event)}
      >
        <div className="mobile-chat-send-channel">
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
          <div className="mobile-chat-recipient">
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
        <div className="mobile-chat-compose-row">
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
          <p className="mobile-chat-input-note" role="status">
            当前连接暂不支持发送消息。
          </p>
        )}
        {canSend && invalidText && (
          <p className="mobile-chat-input-error" role="alert">
            请输入单行普通文字，不能发送斜杠指令或控制字符。
          </p>
        )}
        <div className="mobile-chat-compose-meta">
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
  };
  return (
    <span className="mobile-chat-connection" data-state={state}>
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
