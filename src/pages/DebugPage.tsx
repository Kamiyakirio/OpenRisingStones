/** Debug-only workspace for payload lifecycle control and session log inspection. */
import {
  Bug,
  PlugsConnected,
  Power,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { unloadDebugPayload } from "../features/diagnostics/api/payload";
import {
  getGameBridgeStatus,
  normalizeGameBridgeError,
  observeGameBridgeStatus,
} from "../shared/game-bridge/api";
import type {
  BridgePhase,
  GameBridgeStatus,
} from "../shared/game-bridge/types";
import { LogManagerPage } from "./LogManagerPage";

const PHASE_LABELS: Record<BridgePhase, string> = {
  disconnected: "未连接",
  connecting: "正在连接",
  ready: "运行中",
  faulted: "连接故障",
  shutting_down: "正在关闭",
};

export function DebugPage() {
  const [status, setStatus] = useState<GameBridgeStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [unloading, setUnloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | undefined;
    // The native runtime guard can throw before returning a promise.
    void Promise.resolve()
      .then(() => getGameBridgeStatus())
      .then((current) => {
        if (!disposed) setStatus(current);
      })
      .catch((reason) => {
        if (!disposed) setError(normalizeGameBridgeError(reason).message);
      });
    void observeGameBridgeStatus((current) => setStatus(current))
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

  const unloadPayload = async () => {
    setUnloading(true);
    setNotice(null);
    setError(null);
    try {
      const result = await unloadDebugPayload();
      setStatus(result.status);
      setNotice(
        result.unloaded
          ? `已从游戏进程 ${result.processId} 安全卸载 Payload。`
          : `游戏进程 ${result.processId} 当前没有加载此 Payload。`,
      );
      setConfirming(false);
    } catch (reason) {
      setError(normalizeGameBridgeError(reason).message);
    } finally {
      setUnloading(false);
    }
  };

  return (
    <main className="mx-auto w-full px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4 debug-page grid gap-[28px] max-w-[1280px]">
      <header
        className={
          "debug-page-heading flex justify-between gap-[20px] pb-[18px] border-b border-solid border-line [&_h1]:m-0 [&_p]:m-0 [&_p]:text-muted [&_>_div_>_p]:mt-[3px] [&_>_span]:inline-flex [&_>_span]:gap-[6px] [&_>_span]:items-center [&_>_span]:text-muted [&_>_span]:whitespace-nowrap [&_>_span_svg]:w-[17px] [&_>_span_svg]:h-[17px] max-[560px]:items-start max-[560px]:flex-col [&&&&]:[align-items:end] [&&&&_p]:text-[13px] [&&&&_>_span]:text-[13px]"
        }
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">调试</h1>
          <p>检查本次运行，并处理游戏桥接的开发状态。</p>
        </div>
        <span>
          <Bug aria-hidden="true" /> 仅 Debug 构建
        </span>
      </header>

      <section
        className={
          "debug-payload grid gap-[18px] [&&&&]:p-[20px_0] [&&&&]:[border-block:1px_solid_var(--ors-color-line)]"
        }
        aria-labelledby="payload-tools-title"
      >
        <div
          className={
            "debug-payload-heading [&_h2]:m-0 [&_p]:m-0 [&_p]:text-muted flex gap-[14px] items-start [&_p]:mt-[3px] [&&&&_p]:text-[13px] [&&&&_h2]:text-[18px]"
          }
        >
          <span
            className={
              "debug-payload-icon grid w-[38px] h-[38px] text-accent place-items-center [&_svg]:w-[28px] [&_svg]:h-[28px] [&&&&]:flex-[0_0_auto]"
            }
            aria-hidden="true"
          >
            <PlugsConnected weight="duotone" />
          </span>
          <div>
            <h2 className="text-lg font-semibold" id="payload-tools-title">
              Payload 生命周期
            </h2>
            <p>
              受控卸载会先停止手机聊天，再关闭 Hook 和命令处理，最后释放 DLL。
            </p>
          </div>
        </div>

        <dl
          className={
            "debug-payload-status grid [&_>_div]:min-w-0 [&_>_div]:border-r [&_>_div]:border-solid [&_>_div]:border-line [&_dt]:text-muted [&_dd]:overflow-hidden [&_dd]:tabular-nums [&_dd]:font-semibold [&_dd]:whitespace-nowrap [&_dd[data-phase=ready]]:text-success [&_dd[data-phase=faulted]]:text-danger max-[1120px]:[&_>_div:nth-child(-n_+_2)]:border-b max-[1120px]:[&_>_div:nth-child(-n_+_2)]:border-solid max-[1120px]:[&_>_div:nth-child(-n_+_2)]:border-line max-[560px]:ml-0 [&&&&]:grid-cols-[repeat(4,_minmax(0,_1fr))] [&&&&]:m-[0_0_0_52px] [&&&&]:[border-block:1px_solid_var(--ors-color-line)] [&&&&_>_div]:p-[12px_16px] [&&&&_>_div:last-child]:[border-right:0] [&&&&_dt]:text-[12px] [&&&&_dd]:m-[3px_0_0] [&&&&_dd]:text-[14px] [&&&&_dd]:[text-overflow:ellipsis] [@media(max-width:_1120px)]:[&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_1120px)]:[&&&&_>_div:nth-child(2)]:[border-right:0]"
          }
        >
          <div>
            <dt>桥接状态</dt>
            <dd data-phase={status?.phase ?? "disconnected"}>
              {status ? PHASE_LABELS[status.phase] : "正在读取"}
            </dd>
          </div>
          <div>
            <dt>游戏进程</dt>
            <dd>{status?.processId ?? "未检测"}</dd>
          </div>
          <div>
            <dt>Payload 版本</dt>
            <dd>{status?.payloadVersion ?? "未知"}</dd>
          </div>
          <div>
            <dt>最近错误</dt>
            <dd title={status?.errorMessage ?? undefined}>
              {status?.errorCode ?? "无"}
            </dd>
          </div>
        </dl>

        {confirming ? (
          <div
            className={
              "debug-unload-confirmation [&_p]:m-0 [&_p]:text-muted grid gap-[12px] items-center ml-[52px] text-danger bg-surface rounded-[var(--ors-radius-control)] [&_>_svg]:w-[20px] [&_>_svg]:h-[20px] [&_p]:mt-[3px] max-[560px]:ml-0 [&&&&_p]:text-[13px] [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&]:p-[14px_16px] [&&&&]:[border:1px_solid_color-mix(in_srgb,_var(--ors-color-danger)_45%,_transparent)] [@media(max-width:_1120px)]:[&&&&]:grid-cols-[auto_minmax(0,_1fr)]"
            }
            role="alert"
          >
            <WarningCircle weight="fill" aria-hidden="true" />
            <div>
              <strong>确定卸载游戏中的 Payload？</strong>
              <p>
                所有桥接功能会立即断开。如果另一个调试实例正在使用同一
                Payload，它也会失去连接。
              </p>
            </div>
            <div
              className={
                "debug-unload-actions [&_button_svg]:w-[17px] [&_button_svg]:h-[17px] [&_button]:inline-flex [&_button]:min-h-[40px] [&_button]:items-center [&_button]:justify-center [&_button]:gap-[7px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-danger [&_button]:bg-surface [&_button]:font-semibold [&_button:hover:not(:disabled)]:bg-hover flex gap-[8px] [&_button:first-child]:text-ink [&_button:disabled]:cursor-not-allowed max-[1120px]:justify-end [&&&&_button]:p-[0_14px] [&&&&_button]:text-[13px] [&&&&_button:disabled]:opacity-[0.6] [@media(max-width:_1120px)]:[&&&&]:[grid-column:1_/_-1]"
              }
            >
              <button
                type="button"
                disabled={unloading}
                onClick={() => setConfirming(false)}
              >
                取消
              </button>
              <button
                className={
                  "debug-unload-confirm [.debug-unload-actions_&]:text-on-accent [.debug-unload-actions_&]:bg-danger [.debug-unload-actions_&]:border-danger [.debug-unload-actions_&&&&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--ors-color-danger)_88%,_black)]"
                }
                type="button"
                disabled={unloading}
                onClick={() => void unloadPayload()}
              >
                {unloading ? (
                  <>
                    <SpinnerGap
                      className={
                        "spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"
                      }
                      aria-hidden="true"
                    />
                    正在卸载
                  </>
                ) : (
                  <>
                    <Power aria-hidden="true" />
                    确认卸载
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div
            className={
              "debug-payload-action [&_p]:m-0 [&_p]:text-muted [&_button_svg]:w-[17px] [&_button_svg]:h-[17px] flex items-center justify-between gap-[20px] ml-[52px] [&_button]:inline-flex [&_button]:min-h-[40px] [&_button]:items-center [&_button]:justify-center [&_button]:gap-[7px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-danger [&_button]:bg-surface [&_button]:font-semibold [&_button:hover]:bg-hover max-[560px]:ml-0 max-[560px]:items-stretch max-[560px]:flex-col max-[560px]:[&_button]:w-full [&&&&_p]:text-[13px] [&&&&_button]:p-[0_14px] [&&&&_button]:text-[13px]"
            }
          >
            <p>用于清理应用崩溃或热重启后留在游戏进程中的 Payload。</p>
            <button
              type="button"
              onClick={() => {
                setConfirming(true);
                setNotice(null);
                setError(null);
              }}
            >
              <Power aria-hidden="true" />
              卸载 Payload
            </button>
          </div>
        )}

        {notice && (
          <p
            className={
              "debug-payload-notice text-success max-[560px]:ml-0 [&&&&]:m-[-4px_0_0_52px] [&&&&]:text-[13px]"
            }
            role="status"
          >
            {notice}
          </p>
        )}
        {error && (
          <p
            className={
              "debug-payload-error text-danger max-[560px]:ml-0 [&&&&]:m-[-4px_0_0_52px] [&&&&]:text-[13px]"
            }
            role="alert"
          >
            {error}
          </p>
        )}
      </section>

      <LogManagerPage />
    </main>
  );
}
