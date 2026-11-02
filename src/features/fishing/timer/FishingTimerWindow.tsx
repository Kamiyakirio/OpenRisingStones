/** A compact, independent cast timer with recoverable native window controls. */
import clsx from "clsx";
import { timerControlClasses } from "../utilityClasses";
import { workspaceColorClasses } from "../../../shared/styles/workspaceColors";
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

/** Complete utility strings are shared without adding component CSS rules. */
const timerIconButtonClasses =
  "grid min-h-8 w-8 place-items-center rounded-[6px] border border-solid border-[transparent] bg-transparent p-1 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-45 aria-pressed:bg-selected aria-pressed:text-accent pointer-coarse:min-h-11";
const timerCompactActionClasses =
  "min-h-7 rounded-[6px] border border-solid border-control bg-surface px-3 py-[3px] text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-45 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected";
const timerModeButtonClasses =
  "min-h-8 flex-1 rounded-[6px] border border-solid border-control bg-surface px-[5px] py-[5px] text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-45 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11";

/** Reused presentation strings stay static and are allocated once for this module. */

const timerHintClasses =
  "timer-hint mx-0 mt-3 mb-0 text-[12px] leading-[1.6] text-muted";
const timerErrorClasses =
  "timer-error mx-0 my-2.5 flex items-center gap-2.5 text-[12px] leading-[1.5] text-danger";

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
            ? {
                type: "stop",
                at,
              }
            : {
                type: "cast",
                at,
              },
        );
      }
      if (event.code === "KeyR")
        dispatch({
          type: "reset",
        });
      const tug = (
        {
          Digit1: "light",
          Digit2: "medium",
          Digit3: "heavy",
        } as const
      )[event.code as "Digit1"];
      if (tug)
        dispatch({
          type: "stop",
          at,
          tug,
        });
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
  // The standalone window stacks its title bar and content at every width.
  return (
    <main
      data-feature="fishing"
      className={clsx(
        "app feature-fishing fishing-timer-window block min-h-[100dvh] border border-solid border-control bg-canvas font-sans text-[13px] leading-relaxed text-ink max-[899px]:block",
        workspaceColorClasses,
        dark ? "theme-dark" : "theme-light",
      )}
    >
      <header className="timer-titlebar flex items-center gap-[3px] border-b border-solid border-tool bg-tool-soft px-2 py-1.5 [user-select:none]">
        <div
          className="timer-drag flex flex-1 [cursor:move] items-center gap-2 self-stretch"
          onPointerDown={(event) => {
            if (event.button === 0 && vm.desktop)
              void getCurrentWindow()
                .startDragging()
                .catch(() => setWindowError(true));
          }}
        >
          <ArrowsOutCardinal className="h-[17px] w-[17px]" aria-hidden="true" />
          <h1 className="m-0 text-2xl text-[13px] font-semibold tracking-tight">
            钓鱼计时
          </h1>
        </div>
        <button
          className={timerIconButtonClasses}
          title="始终置顶"
          aria-label="始终置顶"
          aria-pressed={pinned && vm.desktop}
          disabled={!vm.desktop || changing}
          onClick={() => void control(pinned ? "unpin" : "pin")}
        >
          <PushPin
            className="h-[17px] w-[17px]"
            weight={pinned ? "fill" : "regular"}
          />
        </button>
        <button
          className={timerIconButtonClasses}
          title="鼠标穿透；从主窗口再次打开可解锁"
          aria-label="鼠标穿透"
          aria-pressed={locked}
          disabled={!vm.desktop || changing}
          onClick={() => void control("lock")}
        >
          <LockSimple className="h-[17px] w-[17px]" />
        </button>
        <button
          className={timerIconButtonClasses}
          title="计时设置"
          aria-label="计时设置"
          aria-expanded={settings}
          onClick={() => setSettings(!settings)}
        >
          <GearSix className="h-[17px] w-[17px]" />
        </button>
        <button
          className={timerIconButtonClasses}
          title="关闭计时器"
          aria-label="关闭计时器"
          disabled={changing}
          onClick={() => void control("close")}
        >
          <X className="h-[17px] w-[17px]" />
        </button>
      </header>
      {waiting && (
        <section
          className="timer-loading box-border flex min-h-[calc(100dvh_-_47px)] flex-col items-center justify-center gap-4.5 p-6 text-center"
          aria-label="连接游戏"
          aria-busy={vm.connection === "connecting"}
        >
          <CircleNotch
            className="timer-spinner h-4 w-4 shrink-0 animate-[timer-spin_1s_linear_infinite] text-accent"
            aria-hidden="true"
          />
          <div role="status">
            <strong className="text-[15px]">
              {vm.errorCode ? "等待连接游戏" : "正在连接游戏…"}
            </strong>
            {vm.errorCode && (
              <p className="mx-0 mt-2.5 mb-0 max-w-[32ch] leading-[1.6] text-muted">
                {errors[vm.errorCode] ?? errors.read_failed}
              </p>
            )}
          </div>
          <div className="timer-loading-actions flex gap-2">
            {vm.errorCode && (
              <button
                className={timerControlClasses.button}
                onClick={() => vm.reconnect()}
              >
                重连
              </button>
            )}
            <button
              className={timerControlClasses.button}
              onClick={() => vm.changeMode(false)}
            >
              使用手动计时
            </button>
          </div>
        </section>
      )}
      <div className="timer-content px-4 pt-3.5 pb-3" hidden={waiting}>
        <div className="timer-mode flex items-center justify-between gap-2.5 text-[12px] text-muted">
          <div
            className="[&[role=group]]:flex [&[role=group]]:gap-1"
            role="group"
            aria-label="计时模式"
          >
            <button
              className={timerCompactActionClasses}
              aria-pressed={vm.automatic}
              disabled={!vm.desktop}
              onClick={() => vm.changeMode(true)}
            >
              自动
            </button>
            <button
              className={timerCompactActionClasses}
              aria-pressed={!vm.automatic}
              onClick={() => vm.changeMode(false)}
            >
              手动
            </button>
          </div>
          <span
            className="timer-connection inline-flex items-center gap-1.5"
            role="status"
          >
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
          className={clsx(
            "timer-reading mt-4 mr-0 mb-4 ml-0 [--timer-fill:var(--ors-color-accent)] [&.timer-tug-heavy]:[--timer-fill:var(--ors-color-danger)] [&.timer-tug-light]:[--timer-fill:var(--ors-color-success)] [&.timer-tug-medium]:[--timer-fill:var(--ors-color-info)]",
            `timer-tug-${vm.state.tug ?? "none"}`,
          )}
          aria-label="本次抛竿"
        >
          <div className="first:flex first:items-baseline first:justify-between first:gap-3">
            <span className="timer-phase font-semibold text-[var(--timer-fill)]">
              {vm.state.tug
                ? tugLabels[vm.state.tug]
                : vm.state.phase === "casting"
                  ? "等待咬钩"
                  : vm.state.phase === "holding"
                    ? "本次用时"
                    : "等待抛竿"}
            </span>
            <output
              className="text-[42px] leading-[1.1] font-semibold tracking-[-0.025em] tabular-nums"
              aria-label="抛竿用时"
            >
              {(elapsed / 1000).toFixed(1)}
              <small className="ml-1.5 text-[13px] font-normal text-muted">
                秒
              </small>
            </output>
          </div>
          <div
            className="timer-track mt-3 h-[7px] overflow-hidden rounded-[3px] bg-line first:flex first:items-baseline first:justify-between first:gap-3"
            role="progressbar"
            aria-label="抛竿计时进度"
            aria-valuemin={0}
            aria-valuemax={50}
            aria-valuenow={Math.min(50, elapsed / 1000)}
          >
            <span
              className="block h-full bg-[var(--timer-fill)]"
              style={{
                width: `${timerProgress(elapsed, shortCast) * 100}%`,
              }}
            />
          </div>
          <div className="timer-scale mt-1.5 flex justify-between text-[11px] text-muted tabular-nums first:flex first:items-baseline first:justify-between first:gap-3">
            <span>0s</span>
            <span>{shortCast ? "前 10 秒放大" : "线性计时"}</span>
            <span>50s+</span>
          </div>
        </section>
        {vm.automatic && vm.caught && (
          <CaughtFish itemId={vm.caught.itemId} sequence={vm.caught.sequence} />
        )}
        {vm.automatic && vm.connection === "ready" && !vm.catchAvailable && (
          <p className={timerHintClasses}>
            捕获结果暂时无法读取，抛竿计时仍可使用。
          </p>
        )}
        {!vm.automatic && (
          <div className="timer-manual-actions flex gap-[5px]">
            <button
              className="timer-cast min-h-8 flex-1 rounded-[6px] border border-solid border-[transparent] bg-accent px-[5px] py-[5px] text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:bg-selected aria-pressed:text-accent pointer-coarse:min-h-11"
              onClick={() =>
                vm.dispatch(
                  vm.state.phase === "casting"
                    ? {
                        type: "stop",
                        at: performance.now(),
                      }
                    : {
                        type: "cast",
                        at: performance.now(),
                      },
                )
              }
            >
              {vm.state.phase === "casting" ? "停止" : "抛竿"}
            </button>
            {(["light", "medium", "heavy"] as const).map((tug) => (
              <button
                className={timerModeButtonClasses}
                key={tug}
                disabled={vm.state.phase !== "casting"}
                onClick={() =>
                  vm.dispatch({
                    type: "stop",
                    at: performance.now(),
                    tug,
                  })
                }
              >
                {tugLabels[tug]}
              </button>
            ))}
            <button
              className={timerModeButtonClasses}
              disabled={vm.state.phase === "idle"}
              onClick={() =>
                vm.dispatch({
                  type: "reset",
                })
              }
            >
              重置
            </button>
          </div>
        )}
        {vm.automatic && vm.errorCode && (
          <div className={timerErrorClasses} role="alert">
            <span className="flex-1">
              {errors[vm.errorCode] ?? errors.read_failed}
            </span>
            <button
              className="min-h-8 shrink-0 rounded-[6px] border border-solid border-control bg-surface px-2.5 py-[5px] text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-45 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
              onClick={() => vm.reconnect()}
            >
              重连
            </button>
          </div>
        )}
        {windowError && (
          <p className={timerErrorClasses} role="alert">
            窗口操作失败，请重试。
          </p>
        )}
        <p className={timerHintClasses}>
          {locked
            ? "已开启鼠标穿透。在主窗口再次点击“钓鱼计时”可恢复操作。"
            : !vm.desktop
              ? "网页预览支持手动计时；置顶与自动识别请使用桌面客户端。"
              : vm.automatic
                ? "识别抛竿后自动计时，咬钩时保留用时与杆型。"
                : "窗口聚焦时：空格抛竿 / 停止，1 / 2 / 3 标记杆型，R 重置。"}
        </p>
        {settings && (
          <section
            className="timer-settings mt-3 border-t border-solid border-line pt-3"
            aria-label="计时设置"
          >
            <label className="flex items-center gap-1.5">
              <input
                className="h-4 w-4 [accent-color:var(--ors-color-accent)]"
                type="checkbox"
                checked={shortCast}
                onChange={(event) => setShortCast(event.target.checked)}
              />
              前 10 秒计时条放大三倍
            </label>
            {vm.desktop && (
              <form
                className="mt-3 flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  vm.reconnect(pid ? Number(pid) : null);
                }}
              >
                <label className="grid flex-1 items-center gap-1.5">
                  游戏进程 ID（多开时填写）
                  <input
                    className="min-h-9 w-full min-w-0 rounded-sm border border-solid border-control bg-surface p-1.5 text-ink [accent-color:var(--ors-color-accent)] pointer-coarse:min-h-11"
                    type="number"
                    min={1}
                    max={4294967295}
                    step={1}
                    value={pid}
                    onChange={(event) => setPid(event.target.value)}
                    placeholder="自动选择"
                  />
                </label>
                <button
                  className={timerControlClasses.button}
                  disabled={!vm.automatic}
                >
                  连接
                </button>
              </form>
            )}
            <p className="mb-0 text-[12px] leading-[1.6] text-muted">
              关闭计时器会结束本次计时。窗口位置与大小会在关闭时保存。
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
