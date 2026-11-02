import {
  ChatCircleDots,
  Copy,
  DeviceMobile,
  LinkSimple,
  ShieldWarning,
  StopCircle,
} from "@phosphor-icons/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useChatBridge } from "../features/chat/hooks/useChatBridge";
import { ChatFilterBar } from "../features/chat/components/ChatFilterBar";
import { ChatChannelBadge } from "../features/chat/components/ChatChannelBadge";
import {
  matchesChatFilters,
  type ChatFilter,
} from "../features/chat/utils/channels";
import type { ChatBridgeError, ChatMessage } from "../features/chat/types";
import { RiskDialog } from "../shared/components/RiskDialog";

/** Complete utility strings are shared without adding component CSS rules. */
const chatSummaryValueClasses =
  "mx-0 mt-[var(--ors-space-1)] mb-0 font-semibold";

/** Reused presentation strings stay static and are allocated once for this module. */
const chatSectionDescriptionClasses =
  "mx-0 mt-[var(--ors-space-1)] mb-0 text-xs text-muted";
const chatSummaryCellClasses =
  "border-l border-solid border-line px-[var(--ors-space-5)] py-[var(--ors-space-4)] max-[767px]:border-t max-[767px]:border-solid max-[767px]:border-line max-[767px]:[border-left:0]";

export function ChatPage() {
  const bridge = useChatBridge();
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<ChatFilter[]>([]);
  const running = bridge.status?.phase === "running";
  const address = bridge.status?.url?.split("#")[0] ?? null;
  const messages = bridge.status?.recentMessages ?? [];
  const visibleMessages = messages.filter((message) =>
    matchesChatFilters(message.logKind, filter),
  );
  async function copyLink() {
    if (!bridge.status?.url) return;
    await navigator.clipboard.writeText(bridge.status.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }
  return (
    <main className="chat-page mx-auto min-h-[calc(100dvh-56px)] w-full max-w-400 px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4">
      <header className="chat-page-header flex items-start justify-between gap-[var(--ors-space-8)] border-b border-solid border-line pb-[var(--ors-space-6)] max-[767px]:flex-col">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">手机聊天</h1>
          <p className="mx-0 mt-[var(--ors-space-2)] mb-0 max-w-[62ch] text-muted">
            在同一局域网内查看游戏对话，并从手机发送普通聊天文字。
          </p>
        </div>
        <div className="chat-page-actions flex shrink-0 items-center gap-[var(--ors-space-3)] max-[767px]:w-full max-[767px]:flex-col max-[767px]:items-stretch">
          <StatusMark
            running={running}
            paired={bridge.status?.paired ?? false}
          />
          {running ? (
            <button
              type="button"
              className="chat-stop-button inline-flex min-h-9 items-center justify-center gap-[var(--ors-space-2)] rounded-control border border-solid border-danger bg-surface px-3.5 py-2 font-semibold text-danger transition-[background-color,color,border-color] duration-120 ease-[ease] pointer-coarse:min-h-11"
              disabled={bridge.busy}
              onClick={() => void bridge.stop()}
            >
              <StopCircle className="h-4.5 w-4.5" aria-hidden="true" />
              {bridge.busy ? "请稍候" : "停止共享"}
            </button>
          ) : (
            <button
              type="button"
              className="chat-start-button inline-flex min-h-9 items-center justify-center gap-[var(--ors-space-2)] rounded-control border border-solid border-accent bg-accent px-3.5 py-2 font-semibold text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover pointer-coarse:min-h-11"
              disabled={bridge.busy}
              onClick={bridge.requestStart}
            >
              <DeviceMobile className="h-4.5 w-4.5" aria-hidden="true" />
              {bridge.busy ? "正在连接游戏" : "开启手机聊天"}
            </button>
          )}
        </div>
      </header>

      {bridge.error && <ChatError error={bridge.error} />}

      {running ? (
        <div className="chat-workspace mt-[var(--ors-space-6)] grid grid-cols-[minmax(0,_1fr)_320px] gap-[var(--ors-space-8)] max-[1050px]:grid-cols-[minmax(0,_1fr)_280px] max-[1050px]:gap-[var(--ors-space-5)] max-[767px]:grid-cols-[1fr]">
          <section
            className="chat-ledger grid h-[max(24rem,_calc(100dvh_-_160px))] min-w-0 grid-rows-[auto_auto_minmax(0,_1fr)_auto] overflow-hidden rounded-panel border border-solid border-line bg-surface max-[767px]:h-[clamp(24rem,_60dvh,_32rem)]"
            aria-label="最近游戏对话"
          >
            <div className="chat-section-heading flex items-start justify-between gap-[var(--ors-space-4)] border-b border-solid border-line px-[var(--ors-space-5)] py-[var(--ors-space-4)]">
              <div>
                <h2 className="m-0 text-lg font-semibold">最近对话</h2>
                <p className={chatSectionDescriptionClasses}>
                  只保留本次运行期间最近 500 条，不写入磁盘。
                </p>
              </div>
              <span className="shrink-0 text-xs whitespace-nowrap text-muted tabular-nums">
                {bridge.status?.messageCount ?? 0} 条
              </span>
            </div>
            <ChatFilterBar
              value={filter}
              onChange={setFilter}
              visibleCount={visibleMessages.length}
              totalCount={messages.length}
            />
            <ChatMessages
              key={filter.join(",")}
              messages={visibleMessages}
              filtered={filter.length > 0}
            />
            {(bridge.status?.droppedCount ?? 0) > 0 && (
              <p
                className="chat-drop-warning m-0 border-t border-solid border-line px-[var(--ors-space-5)] py-[var(--ors-space-3)] text-xs text-warning"
                role="status"
              >
                游戏消息过快，已有 {bridge.status?.droppedCount} 条未能转发。
              </p>
            )}
          </section>

          <aside className="chat-connection-panel min-w-0 self-start rounded-panel border border-solid border-line bg-surface p-[var(--ors-space-5)] max-[767px]:row-start-1">
            <div className="chat-section-heading flex items-start justify-between gap-[var(--ors-space-4)] border-b border-solid border-line px-0 pt-0 pb-[var(--ors-space-4)]">
              <div>
                <h2 className="m-0 text-lg font-semibold">连接手机</h2>
                <p className={chatSectionDescriptionClasses}>
                  {bridge.status?.paired
                    ? "一台手机已连接"
                    : bridge.status?.pairingAvailable
                      ? "等待扫码 · 配对码 5 分钟内有效"
                      : "配对码已失效，请生成新码"}
                </p>
              </div>
              <LinkSimple className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            {bridge.status?.qrDataUrl ? (
              <div className="chat-qr-frame mx-auto my-[var(--ors-space-5)] grid [aspect-ratio:1] w-[min(232px,_100%)] place-items-center rounded-control border border-solid border-line bg-[#fff] p-[var(--ors-space-3)]">
                <img
                  className="block h-full w-full"
                  src={bridge.status.qrDataUrl}
                  alt="手机聊天一次性配对二维码"
                />
              </div>
            ) : (
              <div
                className="chat-qr-placeholder mx-0 my-[var(--ors-space-5)] flex min-h-58 flex-col items-center justify-center gap-[var(--ors-space-3)] rounded-control p-[var(--ors-space-4)] text-center [border:1px_dashed_var(--ors-color-line)]"
                role="status"
              >
                {bridge.status?.paired ? "配对码已使用" : "配对码已失效"}
                <span className="text-xs leading-[1.6] text-muted">
                  {bridge.status?.paired
                    ? "当前手机可继续使用；重新连接时请生成新码。"
                    : "点击下方按钮生成新的二维码。"}{" "}
                </span>
              </div>
            )}
            <button
              type="button"
              className="chat-renew-button min-h-11 w-full cursor-pointer rounded-control border border-solid border-control bg-transparent font-semibold text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] [font:inherit] enabled:hover:bg-hover"
              disabled={bridge.busy}
              onClick={() => {
                setCopied(false);
                void bridge.renewPairing();
              }}
            >
              {bridge.busy ? "正在生成…" : "生成新配对码"}
            </button>
            <p className="chat-pairing-note text-xs leading-[1.6] text-muted">
              生成新码后，旧链接和旧手机连接失效；消息记录保留。
            </p>
            <ol className="chat-steps m-0 grid gap-[var(--ors-space-2)] pl-[var(--ors-space-5)] text-[13px] text-muted">
              <li>让手机和电脑连接同一个局域网。</li>
              <li>使用手机相机扫描二维码。</li>
              <li>浏览器完成一次性配对后即可使用。</li>
            </ol>
            <div className="chat-address mt-[var(--ors-space-5)] grid gap-[var(--ors-space-2)] border-t border-solid border-line pt-[var(--ors-space-4)]">
              <span className="text-xs text-muted">本地地址</span>
              <code className="overflow-hidden text-[13px] text-ellipsis whitespace-nowrap">
                {address}
              </code>
              <button
                className="inline-flex min-h-9 items-center justify-center gap-[var(--ors-space-2)] rounded-control border border-solid border-control bg-transparent px-3.5 py-2 font-semibold text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover pointer-coarse:min-h-11"
                type="button"
                disabled={!bridge.status?.pairingAvailable || bridge.busy}
                onClick={() => void copyLink()}
              >
                <Copy className="h-4.5 w-4.5" aria-hidden="true" />
                {copied ? "已复制" : "复制配对链接"}
              </button>
            </div>
            <p className="chat-privacy-note mx-0 mt-[var(--ors-space-4)] mb-0 text-xs leading-[1.6] text-muted">
              二维码含一次性密钥。不要截图分享，也不要将服务暴露到公网。
            </p>
            {!bridge.status?.canSend && (
              <p
                className="chat-readonly-note mx-0 mt-[var(--ors-space-3)] mb-0 rounded-control bg-[color-mix(in_srgb,_var(--ors-color-warning)_9%,_transparent)] p-[var(--ors-space-3)] text-[13px] leading-[1.6] text-warning"
                role="status"
              >
                当前为只读模式：发送入口已停用，手机仍可实时查看游戏聊天。
              </p>
            )}
          </aside>
        </div>
      ) : (
        <section className="chat-introduction mt-7 grid max-w-240 grid-cols-[48px_minmax(0,1fr)] gap-5 rounded-panel border border-line bg-surface p-6 max-[767px]:grid-cols-[36px_minmax(0,_1fr)]">
          <ChatCircleDots
            className="h-11 w-11 text-accent max-[767px]:h-8 max-[767px]:w-8"
            aria-hidden="true"
          />
          <div>
            <h2 className="m-0 text-lg font-semibold">把游戏聊天延伸到手机</h2>
            <p className="mx-0 mt-[var(--ors-space-2)] mb-0 max-w-[66ch] text-muted">
              开启后，桌面端会连接当前游戏进程，并仅在本机局域网启动临时网页服务。停止共享或退出应用后，连接立即失效。
            </p>
          </div>
          <dl className="col-start-2 m-0 grid grid-cols-3 [border-block:1px_solid_var(--ors-color-line)] max-[767px]:col-span-full max-[767px]:grid-cols-[1fr]">
            <div className="px-[var(--ors-space-5)] py-[var(--ors-space-4)]">
              <dt className="text-xs text-muted">读取范围</dt>
              <dd className={chatSummaryValueClasses}>
                注入后新产生的游戏聊天
              </dd>
            </div>
            <div className={chatSummaryCellClasses}>
              <dt className="text-xs text-muted">发送范围</dt>
              <dd className={chatSummaryValueClasses}>
                当前聊天频道的普通文字
              </dd>
            </div>
            <div className={chatSummaryCellClasses}>
              <dt className="text-xs text-muted">明确禁止</dt>
              <dd className={chatSummaryValueClasses}>
                斜杠指令、远程公网访问
              </dd>
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
            <p className="m-0">
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
    <span
      className={
        'chat-status inline-flex items-center gap-[var(--ors-space-2)] text-[13px] font-semibold text-muted before:h-2 before:w-2 before:rounded-[50%] before:bg-disabled before:[content:""] data-[state=running]:before:bg-success max-[767px]:min-h-[32px]'
      }
      data-state={running ? "running" : "stopped"}
    >
      {running ? (paired ? "手机已连接" : "等待手机连接") : "未开启"}
    </span>
  );
}
function ChatMessages({
  messages,
  filtered,
}: {
  messages: ChatMessage[];
  filtered: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  useLayoutEffect(() => {
    if (messages.length === 0) {
      followLatest.current = true;
      return;
    }
    // Follow incoming messages only while the reader is already at the bottom.
    if (list.current && followLatest.current) {
      list.current.scrollTop = list.current.scrollHeight;
    }
  }, [messages]);
  if (messages.length === 0) {
    return (
      <div className="chat-empty-state grid min-h-0 [place-content:center] text-center text-muted">
        <ChatCircleDots
          className="mx-auto mt-0 mb-[var(--ors-space-3)] h-8 w-8"
          aria-hidden="true"
        />
        <strong className="text-ink">
          {filtered ? "暂无此类消息" : "等待新的游戏对话"}
        </strong>
        <span className="mt-[var(--ors-space-1)] text-[13px]">
          {filtered
            ? "可切换到全部消息，或等待新的对话。"
            : "开启后产生的消息会显示在这里。"}
        </span>
      </div>
    );
  }
  return (
    <div
      className={
        'chat-message-list flex min-h-0 [scrollbar-color:var(--ors-color-control-line)_var(--ors-color-surface)] [scrollbar-gutter:stable] flex-col overflow-y-auto [overscroll-behavior:contain] px-[var(--ors-space-5)] before:[margin-top:auto] before:[content:""] focus-visible:[outline:2px_solid_var(--ors-color-accent)] focus-visible:[outline-offset:-2px]'
      }
      ref={list}
      role="region"
      aria-label="最近消息"
      tabIndex={0}
      onScroll={(event) => {
        const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
        followLatest.current = scrollHeight - scrollTop - clientHeight <= 24;
      }}
    >
      {messages.map((message) => (
        <article
          className="chat-message shrink-0 border-b border-solid border-line px-0 py-[var(--ors-space-2)]"
          key={message.sequence}
        >
          <div className="chat-message-meta flex flex-wrap items-baseline gap-[var(--ors-space-2)] leading-[1.4]">
            <ChatChannelBadge logKind={message.logKind} />
            {message.sender && (
              <strong className="text-[13px] text-accent">
                {message.sender}
              </strong>
            )}
            <time className="text-xs text-muted tabular-nums">
              {formatChatTime(message.timestamp)}
            </time>
          </div>
          <p className="m-0 leading-[1.4] [overflow-wrap:anywhere] whitespace-pre-wrap">
            {message.message}
          </p>
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
    <div
      className="chat-error mt-[var(--ors-space-5)] flex items-start gap-[var(--ors-space-3)] rounded-control border border-solid border-danger bg-surface p-[var(--ors-space-4)] text-danger"
      role="alert"
    >
      <ShieldWarning className="h-5.5 w-5.5 shrink-0" aria-hidden="true" />
      <div className="grid gap-[var(--ors-space-1)]">
        <strong>无法开启手机聊天</strong>
        <span className="text-[13px] text-ink">{message}</span>
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
