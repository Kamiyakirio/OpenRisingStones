/** Desktop control surface for the authenticated phone chat bridge. */
import {
  ChatCircleDots,
  Copy,
  DeviceMobile,
  LinkSimple,
  ShieldWarning,
  StopCircle,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useChatBridge } from "../features/chat/useChatBridge";
import type { ChatBridgeError, ChatMessage } from "../features/chat/types";
import { RiskDialog } from "../shared/components/RiskDialog";
import "./ChatPage.css";

export function ChatPage() {
  const bridge = useChatBridge();
  const [copied, setCopied] = useState(false);
  const running = bridge.status?.phase === "running";
  const address = bridge.status?.url?.split("#")[0] ?? null;

  async function copyLink() {
    if (!bridge.status?.url) return;
    await navigator.clipboard.writeText(bridge.status.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <main className="chat-page">
      <header className="chat-page-header">
        <div>
          <h1>手机聊天</h1>
          <p>在同一局域网内查看游戏对话，并从手机发送普通聊天文字。</p>
        </div>
        <div className="chat-page-actions">
          <StatusMark
            running={running}
            paired={bridge.status?.paired ?? false}
          />
          {running ? (
            <button
              type="button"
              className="chat-stop-button"
              disabled={bridge.busy}
              onClick={() => void bridge.stop()}
            >
              <StopCircle aria-hidden="true" />
              {bridge.busy ? "正在停止" : "停止共享"}
            </button>
          ) : (
            <button
              type="button"
              className="chat-start-button"
              disabled={bridge.busy}
              onClick={bridge.requestStart}
            >
              <DeviceMobile aria-hidden="true" />
              {bridge.busy ? "正在连接游戏" : "开启手机聊天"}
            </button>
          )}
        </div>
      </header>

      {bridge.error && <ChatError error={bridge.error} />}

      {running ? (
        <div className="chat-workspace">
          <section className="chat-ledger" aria-label="最近游戏对话">
            <div className="chat-section-heading">
              <div>
                <h2>最近对话</h2>
                <p>只保留本次运行期间最近 500 条，不写入磁盘。</p>
              </div>
              <span>{bridge.status?.messageCount ?? 0} 条</span>
            </div>
            <ChatMessages messages={bridge.status?.recentMessages ?? []} />
            {(bridge.status?.droppedCount ?? 0) > 0 && (
              <p className="chat-drop-warning" role="status">
                游戏消息过快，已有 {bridge.status?.droppedCount} 条未能转发。
              </p>
            )}
          </section>

          <aside className="chat-connection-panel">
            <div className="chat-section-heading">
              <div>
                <h2>连接手机</h2>
                <p>{bridge.status?.paired ? "一台手机已连接" : "等待扫码"}</p>
              </div>
              <LinkSimple aria-hidden="true" />
            </div>
            {bridge.status?.qrDataUrl && (
              <div className="chat-qr-frame">
                <img
                  src={bridge.status.qrDataUrl}
                  alt="手机聊天一次性配对二维码"
                />
              </div>
            )}
            <ol className="chat-steps">
              <li>让手机和电脑连接同一个局域网。</li>
              <li>使用手机相机扫描二维码。</li>
              <li>浏览器完成一次性配对后即可使用。</li>
            </ol>
            <div className="chat-address">
              <span>本地地址</span>
              <code>{address}</code>
              <button type="button" onClick={() => void copyLink()}>
                <Copy aria-hidden="true" />
                {copied ? "已复制" : "复制配对链接"}
              </button>
            </div>
            <p className="chat-privacy-note">
              二维码含一次性密钥。不要截图分享，也不要将服务暴露到公网。
            </p>
            {!bridge.status?.canSend && (
              <p className="chat-readonly-note" role="status">
                当前为只读模式：发送入口已停用，手机仍可实时查看游戏聊天。
              </p>
            )}
          </aside>
        </div>
      ) : (
        <section className="chat-introduction">
          <ChatCircleDots aria-hidden="true" />
          <div>
            <h2>把游戏聊天延伸到手机</h2>
            <p>
              开启后，桌面端会连接当前游戏进程，并仅在本机局域网启动临时网页服务。停止共享或退出应用后，连接立即失效。
            </p>
          </div>
          <dl>
            <div>
              <dt>读取范围</dt>
              <dd>注入后新产生的游戏聊天</dd>
            </div>
            <div>
              <dt>发送范围</dt>
              <dd>当前聊天频道的普通文字</dd>
            </div>
            <div>
              <dt>明确禁止</dt>
              <dd>斜杠指令、远程公网访问</dd>
            </div>
          </dl>
        </section>
      )}

      {bridge.riskOpen && (
        <RiskDialog
          title="开启手机聊天前请确认风险"
          items={[
            "本功能会向当前 FF14 游戏进程注入模块，以读取聊天并调用游戏自身的聊天发送入口。",
            "该行为可能被游戏运营方视为使用第三方程序，并可能违反用户协议；账号处罚风险由使用者自行承担。",
            "聊天内容会通过当前局域网传给已配对手机。请勿在公共或不可信网络使用，也不要分享二维码。",
            "手机只能发送普通文字，不能发送斜杠指令；停止共享后本地服务器与手机会话会立即关闭。",
          ]}
          description={
            <p>
              如果无法接受注入、账号或聊天隐私风险，请选择取消，不要开启此功能。
            </p>
          }
          confirmLabel="理解风险并开启"
          storageError={bridge.storageError}
          onConfirm={bridge.confirmRisk}
          onCancel={bridge.cancelRisk}
        />
      )}
    </main>
  );
}

function StatusMark({
  running,
  paired,
}: {
  running: boolean;
  paired: boolean;
}) {
  return (
    <span className="chat-status" data-state={running ? "running" : "stopped"}>
      {running ? (paired ? "手机已连接" : "等待手机连接") : "未开启"}
    </span>
  );
}

function ChatMessages({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="chat-empty-state">
        <ChatCircleDots aria-hidden="true" />
        <strong>等待新的游戏对话</strong>
        <span>开启后产生的消息会显示在这里。</span>
      </div>
    );
  }
  return (
    <div className="chat-message-list">
      {messages.map((message) => (
        <article className="chat-message" key={message.sequence}>
          <div className="chat-message-meta">
            <strong>{message.sender || "系统"}</strong>
            <span>#{message.logKind}</span>
            <time>{formatChatTime(message.timestamp)}</time>
          </div>
          <p>{message.message}</p>
        </article>
      ))}
    </div>
  );
}

function ChatError({ error }: { error: ChatBridgeError }) {
  const message =
    {
      chat_unsupported: "当前游戏版本清单还没有聊天签名，请更新清单后再试。",
      bridge_not_ready: "尚未连接游戏，请确认游戏已启动并进入角色。",
      lan_unavailable: "没有找到可用的私有局域网地址，请检查电脑网络。",
      server_bind_failed: "无法启动本地网页服务，请检查防火墙或端口权限。",
      process_not_found: "没有找到正在运行的 FF14 游戏进程。",
      multiple_processes: "检测到多个游戏进程，暂时无法自动选择。",
    }[error.code] ?? error.message;
  return (
    <div className="chat-error" role="alert">
      <ShieldWarning aria-hidden="true" />
      <div>
        <strong>无法开启手机聊天</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}

function formatChatTime(timestamp: number) {
  const date = timestamp > 0 ? new Date(timestamp * 1_000) : new Date();
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}
