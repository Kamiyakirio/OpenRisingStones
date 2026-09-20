/** Paired phone client for viewing game chat with capability-gated sending. */
import {
  ChatCircleDots,
  LinkBreak,
  PaperPlaneTilt,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "../features/chat/types";

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
  const [notice, setNotice] = useState("正在与电脑完成一次性配对…");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const ledger = useRef<HTMLDivElement>(null);
  const eventSource = useRef<EventSource | null>(null);
  const byteCount = encoder.encode(draft).length;

  useEffect(() => {
    let active = true;
    let sendingAvailable = false;
    async function connect() {
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
        if (token) {
          await request("/api/pair", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
        }
        const state = await request<MobileState>("/api/state");
        if (!active) return;
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
      source.onerror = () => {
        if (!active) return;
        setConnection("reconnecting");
        setNotice("实时连接暂时中断，浏览器正在自动重连。");
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
  }, []);

  useEffect(() => {
    ledger.current?.scrollTo({ top: ledger.current.scrollHeight });
  }, [messages]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSend || !draft || byteCount > 500 || draft.startsWith("/")) return;
    setSending(true);
    try {
      await request("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft }),
      });
      setDraft("");
      setNotice("消息已交给游戏发送。");
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
      setNotice("此手机已断开。要重新连接，请在电脑上停止并重新开启手机聊天。");
    }
  }

  const online = connection === "online";
  const invalidDraft = byteCount > 500 || draft.startsWith("/");

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

      <section
        className="mobile-chat-ledger"
        ref={ledger}
        aria-label="游戏聊天记录"
      >
        {messages.length === 0 ? (
          <div className="mobile-chat-empty">
            <ChatCircleDots aria-hidden="true" />
            <strong>等待新的游戏对话</strong>
            <span>连接后产生的消息会显示在这里。</span>
          </div>
        ) : (
          messages.map((message) => (
            <article className="mobile-chat-message" key={message.sequence}>
              <div>
                <strong>{message.sender || "系统"}</strong>
                <span>#{message.logKind}</span>
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
        <label htmlFor="chat-message">
          {canSend ? "发送到当前游戏聊天频道" : "发送暂不可用"}
        </label>
        <div className="mobile-chat-compose-row">
          <textarea
            id="chat-message"
            rows={2}
            maxLength={500}
            value={draft}
            disabled={!online || !canSend}
            placeholder={canSend ? "输入普通聊天文字" : "当前为只读模式"}
            onChange={(event) => setDraft(event.target.value)}
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
            为避免再次导致游戏崩溃，发送入口已在 Payload、服务器和页面三层停用。
          </p>
        )}
        {canSend && draft.startsWith("/") && (
          <p className="mobile-chat-input-error" role="alert">
            为避免远程执行游戏操作，不能发送斜杠指令。
          </p>
        )}
        <div className="mobile-chat-compose-meta">
          <span data-invalid={byteCount > 500}>{byteCount} / 500 字节</span>
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

async function request<T = undefined>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message || `请求失败 (${response.status})`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

function uniqueMessages(messages: ChatMessage[]) {
  const seen = new Set<number>();
  return messages.filter((message) => {
    if (seen.has(message.sequence)) return false;
    seen.add(message.sequence);
    return true;
  });
}

function readError(reason: unknown, fallback: string) {
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
