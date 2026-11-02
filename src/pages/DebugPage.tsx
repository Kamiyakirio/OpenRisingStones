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

/** Reused presentation strings stay static and are allocated once for this module. */
const debugSummaryCellClasses =
  "min-w-0 border-r border-solid border-line px-4 py-3 last:[border-right:0] max-[1120px]:nth-[-n_+_2]:border-b max-[1120px]:nth-[-n_+_2]:border-solid max-[1120px]:nth-[-n_+_2]:border-line max-[1120px]:nth-[2]:[border-right:0]";
const debugSummaryValueClasses =
  "mx-0 mt-[3px] mb-0 overflow-hidden text-[14px] font-semibold text-ellipsis whitespace-nowrap tabular-nums data-[phase=faulted]:text-danger data-[phase=ready]:text-success";

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
    <main className="debug-page mx-auto grid w-full max-w-320 gap-7 px-5 py-5 max-[899px]:px-4 max-[899px]:py-4 max-[519px]:px-3 max-[519px]:py-4">
      <header className="debug-page-heading flex items-end justify-between gap-5 border-b border-solid border-line pb-4.5 max-[560px]:flex-col max-[560px]:items-start">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">调试</h1>
          <p className="m-0 mt-[3px] text-[13px] text-muted">
            检查本次运行，并处理游戏桥接的开发状态。
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-muted">
          <Bug className="h-[17px] w-[17px]" aria-hidden="true" /> 仅 Debug 构建
        </span>
      </header>

      <section
        className="debug-payload grid gap-4.5 px-0 py-5 [border-block:1px_solid_var(--ors-color-line)]"
        aria-labelledby="payload-tools-title"
      >
        <div className="debug-payload-heading flex items-start gap-3.5">
          <span
            className="debug-payload-icon grid h-9.5 w-9.5 shrink-0 place-items-center text-accent"
            aria-hidden="true"
          >
            <PlugsConnected className="h-7 w-7" weight="duotone" />
          </span>
          <div>
            <h2
              className="m-0 text-lg text-[18px] font-semibold"
              id="payload-tools-title"
            >
              Payload 生命周期
            </h2>
            <p className="m-0 mt-[3px] text-[13px] text-muted">
              受控卸载会先停止手机聊天，再关闭 Hook 和命令处理，最后释放 DLL。
            </p>
          </div>
        </div>

        <dl className="debug-payload-status my-0 mr-0 ml-13 grid grid-cols-4 [border-block:1px_solid_var(--ors-color-line)] max-[1120px]:grid-cols-2 max-[560px]:ml-0">
          <div className={debugSummaryCellClasses}>
            <dt className="text-[12px] text-muted">桥接状态</dt>
            <dd
              className={debugSummaryValueClasses}
              data-phase={status?.phase ?? "disconnected"}
            >
              {status ? PHASE_LABELS[status.phase] : "正在读取"}
            </dd>
          </div>
          <div className={debugSummaryCellClasses}>
            <dt className="text-[12px] text-muted">游戏进程</dt>
            <dd className={debugSummaryValueClasses}>
              {status?.processId ?? "未检测"}
            </dd>
          </div>
          <div className={debugSummaryCellClasses}>
            <dt className="text-[12px] text-muted">Payload 版本</dt>
            <dd className={debugSummaryValueClasses}>
              {status?.payloadVersion ?? "未知"}
            </dd>
          </div>
          <div className={debugSummaryCellClasses}>
            <dt className="text-[12px] text-muted">最近错误</dt>
            <dd
              className={debugSummaryValueClasses}
              title={status?.errorMessage ?? undefined}
            >
              {status?.errorCode ?? "无"}
            </dd>
          </div>
        </dl>

        {confirming ? (
          <div
            className="debug-unload-confirmation ml-13 grid grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-3 rounded-control bg-surface px-4 py-3.5 text-danger [border:1px_solid_color-mix(in_srgb,_var(--ors-color-danger)_45%,_transparent)] max-[1120px]:grid-cols-[auto_minmax(0,_1fr)] max-[560px]:ml-0"
            role="alert"
          >
            <WarningCircle
              className="h-5 w-5"
              weight="fill"
              aria-hidden="true"
            />
            <div>
              <strong>确定卸载游戏中的 Payload？</strong>
              <p className="m-0 mt-[3px] text-[13px] text-muted">
                所有桥接功能会立即断开。如果另一个调试实例正在使用同一
                Payload，它也会失去连接。
              </p>
            </div>
            <div className="debug-unload-actions flex gap-2 max-[1120px]:col-span-full max-[1120px]:justify-end">
              <button
                className="inline-flex min-h-10 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-surface px-3.5 py-0 text-[13px] font-semibold text-danger transition-[background-color,color,border-color] duration-120 ease-[ease] first:text-ink enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={unloading}
                onClick={() => setConfirming(false)}
              >
                取消
              </button>
              <button
                className="debug-unload-confirm inline-flex min-h-10 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-surface px-3.5 py-0 text-[13px] font-semibold text-danger transition-[background-color,color,border-color] duration-120 ease-[ease] first:text-ink enabled:hover:bg-[color-mix(in_srgb,_var(--ors-color-danger)_88%,_black)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={unloading}
                onClick={() => void unloadPayload()}
              >
                {unloading ? (
                  <>
                    <SpinnerGap
                      className="spin h-[17px] w-[17px] animate-[login-spin_900ms_linear_infinite]"
                      aria-hidden="true"
                    />
                    正在卸载
                  </>
                ) : (
                  <>
                    <Power className="h-[17px] w-[17px]" aria-hidden="true" />
                    确认卸载
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="debug-payload-action ml-13 flex items-center justify-between gap-5 max-[560px]:ml-0 max-[560px]:flex-col max-[560px]:items-stretch">
            <p className="m-0 text-[13px] text-muted">
              用于清理应用崩溃或热重启后留在游戏进程中的 Payload。
            </p>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-surface px-3.5 py-0 text-[13px] font-semibold text-danger transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover max-[560px]:w-full"
              type="button"
              onClick={() => {
                setConfirming(true);
                setNotice(null);
                setError(null);
              }}
            >
              <Power className="h-[17px] w-[17px]" aria-hidden="true" />
              卸载 Payload
            </button>
          </div>
        )}

        {notice && (
          <p
            className="debug-payload-notice mt-[-4px] mr-0 mb-0 ml-13 text-[13px] text-success max-[560px]:ml-0"
            role="status"
          >
            {notice}
          </p>
        )}
        {error && (
          <p
            className="debug-payload-error mt-[-4px] mr-0 mb-0 ml-13 text-[13px] text-danger max-[560px]:ml-0"
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
