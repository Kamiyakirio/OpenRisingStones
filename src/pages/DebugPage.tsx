/** Debug-only workspace for payload lifecycle control and session log inspection. */
import {
  Bug,
  PlugsConnected,
  Power,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { unloadDebugPayload } from "../features/diagnostics/payload";
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
import "./DebugPage.css";

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
    void getGameBridgeStatus()
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
    <main className="debug-page">
      <header className="debug-page-heading">
        <div>
          <h1>调试</h1>
          <p>检查本次运行，并处理游戏桥接的开发状态。</p>
        </div>
        <span>
          <Bug aria-hidden="true" /> 仅 Debug 构建
        </span>
      </header>

      <section className="debug-payload" aria-labelledby="payload-tools-title">
        <div className="debug-payload-heading">
          <span className="debug-payload-icon" aria-hidden="true">
            <PlugsConnected weight="duotone" />
          </span>
          <div>
            <h2 id="payload-tools-title">Payload 生命周期</h2>
            <p>
              受控卸载会先停止手机聊天，再关闭 Hook 和命令处理，最后释放 DLL。
            </p>
          </div>
        </div>

        <dl className="debug-payload-status">
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
          <div className="debug-unload-confirmation" role="alert">
            <WarningCircle weight="fill" aria-hidden="true" />
            <div>
              <strong>确定卸载游戏中的 Payload？</strong>
              <p>
                所有桥接功能会立即断开。如果另一个调试实例正在使用同一
                Payload，它也会失去连接。
              </p>
            </div>
            <div className="debug-unload-actions">
              <button
                type="button"
                disabled={unloading}
                onClick={() => setConfirming(false)}
              >
                取消
              </button>
              <button
                className="debug-unload-confirm"
                type="button"
                disabled={unloading}
                onClick={() => void unloadPayload()}
              >
                {unloading ? (
                  <>
                    <SpinnerGap className="spin" aria-hidden="true" />
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
          <div className="debug-payload-action">
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
          <p className="debug-payload-notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="debug-payload-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <LogManagerPage />
    </main>
  );
}
