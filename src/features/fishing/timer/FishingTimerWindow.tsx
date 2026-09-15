/** A compact, independent cast timer with recoverable native window controls. */
import { useEffect, useState } from "react";
import {
  ArrowsOutCardinal,
  GearSix,
  LockSimple,
  CircleNotch,
  PushPin,
  X,
} from "@phosphor-icons/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useTimer } from "./useTimer";
import { elapsedTime, timerProgress, type Tug } from "./model";
import { controlTimer } from "./window";
import { CaughtFish } from "./CaughtFish";
import "../../../app/styles/tokens.css";
import "./timer.css";

const errors: Record<string, string> = {
  process_not_found: "未找到 FF14，正在等待游戏启动。",
  multiple_processes: "检测到多个 FF14 进程，请在设置中指定进程 ID。",
  access_denied: "没有权限读取游戏。请以与游戏相同的权限运行本应用后重连。",
  unsupported_game_version: "当前游戏的钓鱼特征未匹配，自动计时不可用。",
  game_closed: "游戏已退出，正在等待重新连接。",
  unsupported_platform: "自动识别当前仅支持 Windows。",
  read_failed: "游戏状态读取失败，请重连或切换手动计时。",
};
const tugLabels: Record<Tug, string> = {
  light: "轻杆",
  medium: "中杆",
  heavy: "重杆",
};
export function FishingTimerWindow() {
  const vm = useTimer();
  const { automatic, state, dispatch } = vm;
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("ors.theme") === "dark";
    } catch {
      return false;
    }
  });
  const [pinned, setPinned] = useState(true);
  const [locked, setLocked] = useState(false);
  const [settings, setSettings] = useState(false);
  const [shortCast, setShortCast] = useState(true);
  const [pid, setPid] = useState("");
  const [windowError, setWindowError] = useState(false);
  const [changing, setChanging] = useState(false);
  useEffect(() => {
    document.title = "钓鱼计时 · OpenRisingStones";
    const sync = (event: StorageEvent) => {
      if (event.key === "ors.theme" || event.key === null)
        setDark(event.newValue === "dark");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!vm.desktop) return;
    let disposed = false;
    const unlisten = listen("fishing-timer://unlocked", () => {
      if (!disposed) setLocked(false);
    });
    return () => {
      disposed = true;
      void unlisten.then((stop) => stop());
    };
  }, [vm.desktop]);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (
        automatic ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        (event.target as HTMLElement).closest("input,select,button,a")
      )
        return;
      const at = performance.now();
      if (event.code === "Space") {
        event.preventDefault();
        dispatch(
          state.phase === "casting"
            ? { type: "stop", at }
            : { type: "cast", at },
        );
      }
      if (event.code === "KeyR") dispatch({ type: "reset" });
      const tug = (
        { Digit1: "light", Digit2: "medium", Digit3: "heavy" } as const
      )[event.code as "Digit1"];
      if (tug) dispatch({ type: "stop", at, tug });
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [automatic, state.phase, dispatch]);
  async function control(action: "pin" | "unpin" | "lock" | "close") {
    setChanging(true);
    setWindowError(false);
    try {
      await controlTimer(action);
      if (action === "pin" || action === "unpin") setPinned(action === "pin");
      if (action === "lock") setLocked(true);
    } catch {
      setWindowError(true);
    } finally {
      setChanging(false);
    }
  }
  const elapsed = elapsedTime(vm.state, vm.now);
  const waiting = vm.automatic && vm.connection !== "ready" && !settings;
  return (
    <main className={`app fishing-timer-window ${dark ? "theme-dark" : ""}`}>
      <header className="timer-titlebar">
        <div
          className="timer-drag"
          onPointerDown={(event) => {
            if (event.button === 0 && vm.desktop)
              void getCurrentWindow()
                .startDragging()
                .catch(() => setWindowError(true));
          }}
        >
          <ArrowsOutCardinal aria-hidden="true" />
          <h1>钓鱼计时</h1>
        </div>
        <button
          title="始终置顶"
          aria-label="始终置顶"
          aria-pressed={pinned && vm.desktop}
          disabled={!vm.desktop || changing}
          onClick={() => void control(pinned ? "unpin" : "pin")}
        >
          <PushPin weight={pinned ? "fill" : "regular"} />
        </button>
        <button
          title="鼠标穿透；从主窗口再次打开可解锁"
          aria-label="鼠标穿透"
          aria-pressed={locked}
          disabled={!vm.desktop || changing}
          onClick={() => void control("lock")}
        >
          <LockSimple />
        </button>
        <button
          title="计时设置"
          aria-label="计时设置"
          aria-expanded={settings}
          onClick={() => setSettings(!settings)}
        >
          <GearSix />
        </button>
        <button
          title="关闭计时器"
          aria-label="关闭计时器"
          disabled={changing}
          onClick={() => void control("close")}
        >
          <X />
        </button>
      </header>
      {waiting && (
        <section
          className="timer-loading"
          aria-label="连接游戏"
          aria-busy={vm.connection === "connecting"}
        >
          <CircleNotch className="timer-spinner" aria-hidden="true" />
          <div role="status">
            <strong>{vm.errorCode ? "等待连接游戏" : "正在连接游戏…"}</strong>
            {vm.errorCode && (
              <p>{errors[vm.errorCode] ?? errors.read_failed}</p>
            )}
          </div>
          <div className="timer-loading-actions">
            {vm.errorCode && (
              <button onClick={() => vm.reconnect()}>重连</button>
            )}
            <button onClick={() => vm.changeMode(false)}>使用手动计时</button>
          </div>
        </section>
      )}
      <div className="timer-content" hidden={waiting}>
        <div className="timer-mode">
          <div role="group" aria-label="计时模式">
            <button
              aria-pressed={vm.automatic}
              disabled={!vm.desktop}
              onClick={() => vm.changeMode(true)}
            >
              自动
            </button>
            <button
              aria-pressed={!vm.automatic}
              onClick={() => vm.changeMode(false)}
            >
              手动
            </button>
          </div>
          <span className="timer-connection" role="status">
            {vm.automatic
              ? vm.connection === "ready"
                ? `已连接 · ${vm.connectedPid}`
                : vm.connection === "error"
                  ? "连接中断"
                  : "正在连接游戏…"
              : "手动抛竿计时"}
          </span>
        </div>
        <section
          className={`timer-reading timer-tug-${vm.state.tug ?? "none"}`}
          aria-label="本次抛竿"
        >
          <div>
            <span className="timer-phase">
              {vm.state.tug
                ? tugLabels[vm.state.tug]
                : vm.state.phase === "casting"
                  ? "等待咬钩"
                  : vm.state.phase === "holding"
                    ? "本次用时"
                    : "等待抛竿"}
            </span>
            <output aria-label="抛竿用时">
              {(elapsed / 1000).toFixed(1)}
              <small>秒</small>
            </output>
          </div>
          <div
            className="timer-track"
            role="progressbar"
            aria-label="抛竿计时进度"
            aria-valuemin={0}
            aria-valuemax={50}
            aria-valuenow={Math.min(50, elapsed / 1000)}
          >
            <span
              style={{ width: `${timerProgress(elapsed, shortCast) * 100}%` }}
            />
          </div>
          <div className="timer-scale">
            <span>0s</span>
            <span>{shortCast ? "前 10 秒放大" : "线性计时"}</span>
            <span>50s+</span>
          </div>
        </section>
        {vm.automatic && vm.caught && (
          <CaughtFish itemId={vm.caught.itemId} sequence={vm.caught.sequence} />
        )}
        {vm.automatic && vm.connection === "ready" && !vm.catchAvailable && (
          <p className="timer-hint">捕获结果暂时无法读取，抛竿计时仍可使用。</p>
        )}
        {!vm.automatic && (
          <div className="timer-manual-actions">
            <button
              className="timer-cast"
              onClick={() =>
                vm.dispatch(
                  vm.state.phase === "casting"
                    ? { type: "stop", at: performance.now() }
                    : { type: "cast", at: performance.now() },
                )
              }
            >
              {vm.state.phase === "casting" ? "停止" : "抛竿"}
            </button>
            {(["light", "medium", "heavy"] as const).map((tug) => (
              <button
                key={tug}
                disabled={vm.state.phase !== "casting"}
                onClick={() =>
                  vm.dispatch({ type: "stop", at: performance.now(), tug })
                }
              >
                {tugLabels[tug]}
              </button>
            ))}
            <button
              disabled={vm.state.phase === "idle"}
              onClick={() => vm.dispatch({ type: "reset" })}
            >
              重置
            </button>
          </div>
        )}
        {vm.automatic && vm.errorCode && (
          <div className="timer-error" role="alert">
            <span>{errors[vm.errorCode] ?? errors.read_failed}</span>
            <button onClick={() => vm.reconnect()}>重连</button>
          </div>
        )}
        {windowError && (
          <p className="timer-error" role="alert">
            窗口操作失败，请重试。
          </p>
        )}
        <p className="timer-hint">
          {locked
            ? "已开启鼠标穿透。在主窗口再次点击“钓鱼计时”可恢复操作。"
            : !vm.desktop
              ? "网页预览支持手动计时；置顶与自动识别请使用桌面客户端。"
              : vm.automatic
                ? "识别抛竿后自动计时，咬钩时保留用时与杆型。"
                : "窗口聚焦时：空格抛竿 / 停止，1 / 2 / 3 标记杆型，R 重置。"}
        </p>
        {settings && (
          <section className="timer-settings" aria-label="计时设置">
            <label>
              <input
                type="checkbox"
                checked={shortCast}
                onChange={(event) => setShortCast(event.target.checked)}
              />
              前 10 秒计时条放大三倍
            </label>
            {vm.desktop && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  vm.reconnect(pid ? Number(pid) : null);
                }}
              >
                <label>
                  游戏进程 ID（多开时填写）
                  <input
                    type="number"
                    min={1}
                    max={4294967295}
                    step={1}
                    value={pid}
                    onChange={(event) => setPid(event.target.value)}
                    placeholder="自动选择"
                  />
                </label>
                <button disabled={!vm.automatic}>连接</button>
              </form>
            )}
            <p>关闭计时器会结束本次计时。窗口位置与大小会在关闭时保存。</p>
          </section>
        )}
      </div>
    </main>
  );
}
