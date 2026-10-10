/** Desktop control surface for the authenticated phone chat bridge. */
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
    <main className="mx-auto w-full max-w-[1600px] px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 chat-page min-h-[calc(100dvh-56px)]">
      <header
        className={
          "chat-page-header flex gap-[var(--ors-space-8)] items-start justify-between pb-[var(--ors-space-6)] border-b border-solid border-line [&_h1]:m-0 [&_p]:text-muted max-[767px]:flex-col [&&&&_p]:max-w-[62ch] [&&&&_p]:m-[var(--ors-space-2)_0_0]"
        }
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">手机聊天</h1>
          <p>在同一局域网内查看游戏对话，并从手机发送普通聊天文字。</p>
        </div>
        <div
          className={
            "chat-page-actions flex gap-[var(--ors-space-3)] items-center [&_svg]:w-[18px] [&_svg]:h-[18px] max-[767px]:flex-col max-[767px]:w-full max-[767px]:items-stretch [&&&&]:flex-[0_0_auto]"
          }
        >
          <StatusMark
            running={running}
            paired={bridge.status?.paired ?? false}
          />
          {running ? (
            <button
              type="button"
              className={
                "chat-stop-button inline-flex gap-[var(--ors-space-2)] items-center justify-center rounded-[var(--ors-radius-control)] font-semibold text-danger bg-surface border border-solid border-danger [&&&&]:p-[8px_14px]"
              }
              disabled={bridge.busy}
              onClick={() => void bridge.stop()}
            >
              <StopCircle aria-hidden="true" />
              {bridge.busy ? "请稍候" : "停止共享"}
            </button>
          ) : (
            <button
              type="button"
              className={
                "chat-start-button inline-flex gap-[var(--ors-space-2)] items-center justify-center rounded-[var(--ors-radius-control)] font-semibold text-on-accent bg-accent border border-solid border-accent [&:hover:not(:disabled)]:bg-accent-hover [&&&&]:p-[8px_14px]"
              }
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
        <div
          className={
            "chat-workspace grid gap-[var(--ors-space-8)] mt-[var(--ors-space-6)] max-[1050px]:gap-[var(--ors-space-5)] [&&&&]:grid-cols-[minmax(0,_1fr)_320px] [@media(max-width:_1050px)]:[&&&&]:grid-cols-[minmax(0,_1fr)_280px] [@media(max-width:_767px)]:[&&&&]:grid-cols-[1fr]"
          }
        >
          <section
            className={
              "chat-ledger min-w-0 bg-surface border border-solid border-line rounded-[var(--ors-radius-panel)] grid overflow-hidden [&&&&]:grid-rows-[auto_auto_minmax(0,_1fr)_auto] [&&&&]:h-[max(24rem,_calc(100dvh_-_160px))] [@media(max-width:_767px)]:[&&&&]:h-[clamp(24rem,_60dvh,_32rem)]"
            }
            aria-label="最近游戏对话"
          >
            <div
              className={
                "chat-section-heading flex gap-[var(--ors-space-4)] items-start justify-between border-b border-solid border-line [&_h2]:m-0 [&_p]:text-muted [&_p]:text-xs [&_>_span]:text-muted [&_>_span]:text-xs [&_>_span]:tabular-nums [&_>_span]:whitespace-nowrap [&_>_svg]:w-[20px] [&_>_svg]:h-[20px] [&_>_svg]:text-accent [&&&&]:p-[var(--ors-space-4)_var(--ors-space-5)] [.chat-connection-panel_>_&&&&]:p-[0_0_var(--ors-space-4)] [&&&&_p]:m-[var(--ors-space-1)_0_0] [&&&&_>_span]:flex-[0_0_auto]"
              }
            >
              <div>
                <h2 className="text-lg font-semibold">最近对话</h2>
                <p>只保留本次运行期间最近 500 条，不写入磁盘。</p>
              </div>
              <span>{bridge.status?.messageCount ?? 0} 条</span>
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
                className={
                  "chat-drop-warning m-0 text-warning border-t border-solid border-line text-xs [&&&&]:p-[var(--ors-space-3)_var(--ors-space-5)]"
                }
                role="status"
              >
                游戏消息过快，已有 {bridge.status?.droppedCount} 条未能转发。
              </p>
            )}
          </section>

          <aside
            className={
              "chat-connection-panel min-w-0 bg-surface border border-solid border-line rounded-[var(--ors-radius-panel)] p-[var(--ors-space-5)] [&&&&]:[align-self:start] [@media(max-width:_767px)]:[&&&&]:[grid-row:1]"
            }
          >
            <div
              className={
                "chat-section-heading flex gap-[var(--ors-space-4)] items-start justify-between border-b border-solid border-line [&_h2]:m-0 [&_p]:text-muted [&_p]:text-xs [&_>_span]:text-muted [&_>_span]:text-xs [&_>_span]:tabular-nums [&_>_span]:whitespace-nowrap [&_>_svg]:w-[20px] [&_>_svg]:h-[20px] [&_>_svg]:text-accent [&&&&]:p-[var(--ors-space-4)_var(--ors-space-5)] [.chat-connection-panel_>_&&&&]:p-[0_0_var(--ors-space-4)] [&&&&_p]:m-[var(--ors-space-1)_0_0] [&&&&_>_span]:flex-[0_0_auto]"
              }
            >
              <div>
                <h2 className="text-lg font-semibold">连接手机</h2>
                <p>
                  {bridge.status?.paired
                    ? "一台手机已连接"
                    : bridge.status?.pairingAvailable
                      ? "等待扫码 · 配对码 5 分钟内有效"
                      : "配对码已失效，请生成新码"}
                </p>
              </div>
              <LinkSimple aria-hidden="true" />
            </div>
            {bridge.status?.qrDataUrl ? (
              <div
                className={
                  "chat-qr-frame grid p-[var(--ors-space-3)] border border-solid border-line rounded-[var(--ors-radius-control)] place-items-center [&_img]:block [&_img]:w-full [&_img]:h-full [&&&&]:w-[min(232px,_100%)] [&&&&]:[aspect-ratio:1] [&&&&]:m-[var(--ors-space-5)_auto] [&&&&]:[background:#fff]"
                }
              >
                <img
                  src={bridge.status.qrDataUrl}
                  alt="手机聊天一次性配对二维码"
                />
              </div>
            ) : (
              <div
                className={
                  "chat-qr-placeholder flex flex-col items-center justify-center gap-[var(--ors-space-3)] min-h-[232px] p-[var(--ors-space-4)] rounded-[var(--ors-radius-control)] text-center [&_span]:text-muted [&_span]:text-xs [&&&&]:m-[var(--ors-space-5)_0] [&&&&]:[border:1px_dashed_var(--ors-color-line)] [&&&&_span]:leading-[1.6]"
                }
                role="status"
              >
                {bridge.status?.paired ? "配对码已使用" : "配对码已失效"}
                <span>
                  {bridge.status?.paired
                    ? "当前手机可继续使用；重新连接时请生成新码。"
                    : "点击下方按钮生成新的二维码。"}{" "}
                </span>
              </div>
            )}
            <button
              type="button"
              className={
                "chat-renew-button w-full min-h-[44px] text-accent border border-solid border-control rounded-[var(--ors-radius-control)] font-semibold cursor-pointer [&:hover:not(:disabled)]:bg-hover [&&&&]:[background:transparent] [&&&&]:[font:inherit]"
              }
              disabled={bridge.busy}
              onClick={() => {
                setCopied(false);
                void bridge.renewPairing();
              }}
            >
              {bridge.busy ? "正在生成…" : "生成新配对码"}
            </button>
            <p
              className={
                "chat-pairing-note text-muted text-xs [&&&&]:leading-[1.6]"
              }
            >
              生成新码后，旧链接和旧手机连接失效；消息记录保留。
            </p>
            <ol className="chat-steps grid gap-[var(--ors-space-2)] m-0 pl-[var(--ors-space-5)] text-muted text-[13px]">
              <li>让手机和电脑连接同一个局域网。</li>
              <li>使用手机相机扫描二维码。</li>
              <li>浏览器完成一次性配对后即可使用。</li>
            </ol>
            <div
              className={
                "chat-address [&_button]:inline-flex [&_button]:gap-[var(--ors-space-2)] [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[var(--ors-radius-control)] [&_button]:font-semibold [&_button_svg]:w-[18px] [&_button_svg]:h-[18px] grid gap-[var(--ors-space-2)] mt-[var(--ors-space-5)] pt-[var(--ors-space-4)] border-t border-solid border-line [&_>_span]:text-muted [&_>_span]:text-xs [&_code]:overflow-hidden [&_code]:text-[13px] [&_code]:whitespace-nowrap [&_button]:text-accent [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button:hover]:bg-hover [&&&&_button]:p-[8px_14px] [&&&&_code]:[text-overflow:ellipsis] [&&&&_button]:[background:transparent]"
              }
            >
              <span>本地地址</span>
              <code>{address}</code>
              <button
                type="button"
                disabled={!bridge.status?.pairingAvailable || bridge.busy}
                onClick={() => void copyLink()}
              >
                <Copy aria-hidden="true" />
                {copied ? "已复制" : "复制配对链接"}
              </button>
            </div>
            <p
              className={
                "chat-privacy-note text-muted text-xs [&&&&]:m-[var(--ors-space-4)_0_0] [&&&&]:leading-[1.6]"
              }
            >
              二维码含一次性密钥。不要截图分享，也不要将服务暴露到公网。
            </p>
            {!bridge.status?.canSend && (
              <p
                className={
                  "chat-readonly-note p-[var(--ors-space-3)] text-warning rounded-[var(--ors-radius-control)] text-[13px] [&&&&]:m-[var(--ors-space-3)_0_0] [&&&&]:[background:color-mix(in_srgb,_var(--ors-color-warning)_9%,_transparent)] [&&&&]:leading-[1.6]"
                }
                role="status"
              >
                当前为只读模式：发送入口已停用，手机仍可实时查看游戏聊天。
              </p>
            )}
          </aside>
        </div>
      ) : (
        <section
          className={
            "chat-introduction mt-7 grid max-w-[960px] grid-cols-[48px_minmax(0,1fr)] gap-5 rounded-xl border border-line bg-surface p-6 [&_>_svg]:w-[44px] [&_>_svg]:h-[44px] [&_>_svg]:text-accent [&_h2]:m-0 [&_p]:text-muted [&_dl]:grid [&_dl_>_div_+_div]:border-l [&_dl_>_div_+_div]:border-solid [&_dl_>_div_+_div]:border-line [&_dt]:text-muted [&_dt]:text-xs [&_dd]:font-semibold max-[767px]:[&_>_svg]:w-[32px] max-[767px]:[&_>_svg]:h-[32px] max-[767px]:[&_dl_>_div_+_div]:border-t max-[767px]:[&_dl_>_div_+_div]:border-solid max-[767px]:[&_dl_>_div_+_div]:border-line [&&&&_p]:max-w-[66ch] [&&&&_p]:m-[var(--ors-space-2)_0_0] [&&&&_dl]:[grid-column:2] [&&&&_dl]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&&&_dl]:m-[var(--ors-space-5)_0_0] [&&&&_dl]:[border-block:1px_solid_var(--ors-color-line)] [&&&&_dl_>_div]:p-[var(--ors-space-4)_var(--ors-space-5)] [&&&&_dd]:m-[var(--ors-space-1)_0_0] [@media(max-width:_767px)]:[&&&&]:grid-cols-[36px_minmax(0,_1fr)] [@media(max-width:_767px)]:[&&&&_dl]:[grid-column:1_/_-1] [@media(max-width:_767px)]:[&&&&_dl]:grid-cols-[1fr] [@media(max-width:_767px)]:[&&&&_dl_>_div_+_div]:[border-left:0]"
          }
        >
          <ChatCircleDots aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">把游戏聊天延伸到手机</h2>
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
    <span
      className={
        'chat-status inline-flex gap-[var(--ors-space-2)] items-center text-muted text-[13px] font-semibold [&::before]:w-[8px] [&::before]:h-[8px] [&::before]:bg-disabled [&[data-state=running]::before]:bg-success max-[767px]:min-h-[32px] [&&&&::before]:[content:""] [&&&&::before]:rounded-[50%]'
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
      <div
        className={
          "chat-empty-state grid min-h-0 text-muted text-center [&_svg]:w-[32px] [&_svg]:h-[32px] [&_strong]:text-ink [&_span]:mt-[var(--ors-space-1)] [&_span]:text-[13px] [&&&&]:[place-content:center] [&&&&_svg]:m-[0_auto_var(--ors-space-3)]"
        }
      >
        <ChatCircleDots aria-hidden="true" />
        <strong>{filtered ? "暂无此类消息" : "等待新的游戏对话"}</strong>
        <span>
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
        'chat-message-list flex flex-col min-h-0 px-[var(--ors-space-5)] overflow-y-auto [&&&&]:[overscroll-behavior:contain] [&&&&]:[scrollbar-gutter:stable] [&&&&]:[scrollbar-color:var(--ors-color-control-line)_var(--ors-color-surface)] [&&&&::before]:[margin-top:auto] [&&&&::before]:[content:""] [&&&&:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&:focus-visible]:[outline-offset:-2px]'
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
          className={
            "chat-message border-b border-solid border-line [&_p]:m-0 [&_p]:whitespace-pre-wrap [&&&&]:flex-[0_0_auto] [&&&&]:p-[var(--ors-space-2)_0] [&&&&_p]:leading-[1.4] [&&&&_p]:[overflow-wrap:anywhere]"
          }
          key={message.sequence}
        >
          <div
            className={
              "chat-message-meta flex flex-wrap gap-[var(--ors-space-2)] items-baseline [&_strong]:text-accent [&_strong]:text-[13px] [&_span:not(.chat-channel-badge)]:text-muted [&_span:not(.chat-channel-badge)]:text-xs [&_span:not(.chat-channel-badge)]:tabular-nums [&_time]:text-muted [&_time]:text-xs [&_time]:tabular-nums [&&&&]:leading-[1.4]"
            }
          >
            <ChatChannelBadge logKind={message.logKind} />
            {message.sender && <strong>{message.sender}</strong>}
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
    <div
      className={
        "chat-error flex gap-[var(--ors-space-3)] items-start mt-[var(--ors-space-5)] p-[var(--ors-space-4)] text-danger bg-surface border border-solid border-danger rounded-[var(--ors-radius-control)] [&_>_svg]:w-[22px] [&_>_svg]:h-[22px] [&_div]:grid [&_div]:gap-[var(--ors-space-1)] [&_span]:text-ink [&_span]:text-[13px] [&&&&_>_svg]:flex-[0_0_auto]"
      }
      role="alert"
    >
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
