/** A compact, independent cast timer with recoverable native window controls. */
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
  // The standalone window stacks its title bar and content at every width.
  return (
    <main
      className={`${workspaceColorClasses} [--ors-color-canvas:#fcfcfa] [--ors-color-surface:#ffffff] [--ors-color-hover:#eeeff3] [--ors-color-selected:#eef0f5] [--ors-color-text:#202127] [--ors-color-muted:#596170] [--ors-color-line:#c7cbd3] [--ors-color-control-line:#808896] [--ors-color-accent:#53618a] [--ors-color-accent-hover:#435074] [--ors-color-on-accent:#ffffff] [--ors-color-disabled:#687183] [--ors-color-success:#187552] [--ors-color-warning:#9b580c] [--ors-color-danger:#bf3548] [--ors-color-info:#4a6d91] [--ors-color-violet:#716184] [--ors-color-pink:#865e76] [--ors-color-teal:#466f73] [--ors-color-orange:#86684c] [--ors-shadow-popover:0_8px_24px_rgb(0_0_0_/_0.12)] [--ors-shadow-dialog:0_16px_48px_rgb(0_0_0_/_0.2)] [color-scheme:light] [&.theme-dark]:[--ors-color-canvas:#0e0e10] [&.theme-dark]:[--ors-color-surface:#18191d] [&.theme-dark]:[--ors-color-hover:#26282f] [&.theme-dark]:[--ors-color-selected:#2a2d36] [&.theme-dark]:[--ors-color-text:#f2f3f5] [&.theme-dark]:[--ors-color-muted:#b0b6c3] [&.theme-dark]:[--ors-color-line:#383b43] [&.theme-dark]:[--ors-color-control-line:#778094] [&.theme-dark]:[--ors-color-accent:#a0aacb] [&.theme-dark]:[--ors-color-accent-hover:#b6bfd8] [&.theme-dark]:[--ors-color-on-accent:#101128] [&.theme-dark]:[--ors-color-disabled:#9aa2b2] [&.theme-dark]:[--ors-color-success:#70d4a4] [&.theme-dark]:[--ors-color-warning:#efba72] [&.theme-dark]:[--ors-color-danger:#ff94a5] [&.theme-dark]:[--ors-color-info:#9bafc8] [&.theme-dark]:[--ors-color-violet:#b2a3c5] [&.theme-dark]:[--ors-color-pink:#c2a0b2] [&.theme-dark]:[--ors-color-teal:#91b6b8] [&.theme-dark]:[--ors-color-orange:#c7ad90] [&.theme-dark]:[--ors-shadow-popover:0_8px_24px_rgb(0_0_0_/_0.4)] [&.theme-dark]:[--ors-shadow-dialog:0_16px_48px_rgb(0_0_0_/_0.55)] [&.theme-dark]:[color-scheme:dark] [.loading-page--fullscreen&&&&]:grid-cols-[minmax(0,_1fr)] [&&&&]:[--ink:var(--ors-color-text)] [&&&&]:[--muted:var(--ors-color-muted)] [&&&&]:[--paper:var(--ors-color-canvas)] [&&&&]:[--surface:var(--ors-color-surface)] [&&&&]:[--surface-2:var(--ors-color-hover)] [&&&&]:[--line:var(--ors-color-line)] [&&&&]:[--accent:var(--ors-color-accent)] [&&&&]:[--accent-strong:var(--ors-color-accent)] [&&&&]:[--accent-soft:var(--ors-color-selected)] [&&&&]:[--home-accent:var(--ors-color-accent)] [&&&&]:[--home-accent-strong:var(--ors-color-accent)] [&&&&]:[--danger:var(--ors-color-danger)] [&&&&]:[--danger-strong:var(--ors-color-danger)] [&&&&]:[--danger-soft:var(--ors-color-surface)] [&&&&]:[--danger-line:var(--ors-color-danger)] [&&&&]:[--shadow:var(--ors-shadow-popover)] [&&&&_button]:[transition:background-color_120ms,_color_120ms,_border-color_120ms] [&&&&_:is(_button,_select,_input:not([type="checkbox"]):not([type="radio"]):not([type="range"])_)]:min-h-[36px] [@media(pointer:_coarse)]:[&&&&_:is(_button,_select,_input:not([type="checkbox"]):not([type="radio"]):not([type="range"])_)]:min-h-[44px] [&&&&]:min-h-[100dvh] [&&&&]:text-[13px] [&&&&_button]:[font:inherit] [&&&&_button]:[color:inherit] [&&&&_button]:p-[5px_10px] [&&&&_button:disabled]:opacity-[0.45] [&&&&_:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_:focus-visible]:[outline-offset:2px] [.loading-page--fullscreen&]:w-full [.loading-page--fullscreen&]:bg-canvas block min-h-dvh bg-canvas font-sans text-[15px] leading-relaxed text-ink [&_button:disabled]:cursor-not-allowed [&_input[type=checkbox]]:size-4 [&_input[type=radio]]:size-4 max-[899px]:block border border-solid border-control [&_button]:bg-surface [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[6px] [&_button]:min-h-[32px] [&_button:hover]:bg-hover [&_button[aria-pressed=true]]:text-accent [&_button[aria-pressed=true]]:bg-selected app feature-fishing fishing-timer-window ${dark ? "theme-dark" : ""}`}
    >
      <header
        className={
          "timer-titlebar flex items-center gap-[3px] border-b border-solid border-tool bg-tool-soft [&_svg]:w-[17px] [&_svg]:h-[17px] [&_button]:w-[32px] [&_button]:grid [&_button]:place-items-center [&_button]:p-[4px] [&&&&]:p-[6px_8px] [&&&&]:[user-select:none] [&&&&_button]:[border-color:transparent] [&&&&_button]:[background:transparent]"
        }
      >
        <div
          className={
            "timer-drag flex items-center gap-[8px] [&_h1]:m-0 [&_h1]:font-semibold [&&&&]:flex-[1] [&&&&]:[cursor:move] [&&&&]:[align-self:stretch] [&&&&_h1]:text-[13px]"
          }
          onPointerDown={(event) => {
            if (event.button === 0 && vm.desktop)
              void getCurrentWindow()
                .startDragging()
                .catch(() => setWindowError(true));
          }}
        >
          <ArrowsOutCardinal aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight">钓鱼计时</h1>
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
          className={
            "timer-loading box-border flex flex-col items-center justify-center gap-[18px] p-[24px] text-center [&_p]:text-muted [&&&&]:min-h-[calc(100dvh_-_47px)] [&&&&_strong]:text-[15px] [&&&&_p]:max-w-[32ch] [&&&&_p]:leading-[1.6] [&&&&_p]:m-[10px_0_0]"
          }
          aria-label="连接游戏"
          aria-busy={vm.connection === "connecting"}
        >
          <CircleNotch
            className={
              "timer-spinner [.timer-loading_>_&]:w-[40px] [.timer-loading_>_&]:h-[40px] [.timer-loading_>_&]:text-accent w-[16px] h-[16px] [&&&&]:shrink-[0] [&&&&]:animate-[timer-spin_1s_linear_infinite] [@media(prefers-reduced-motion:_reduce)]:[&&&&]:[animation-duration:3s]"
            }
            aria-hidden="true"
          />
          <div role="status">
            <strong>{vm.errorCode ? "等待连接游戏" : "正在连接游戏…"}</strong>
            {vm.errorCode && (
              <p>{errors[vm.errorCode] ?? errors.read_failed}</p>
            )}
          </div>
          <div className="timer-loading-actions flex gap-[8px]">
            {vm.errorCode && (
              <button onClick={() => vm.reconnect()}>重连</button>
            )}
            <button onClick={() => vm.changeMode(false)}>使用手动计时</button>
          </div>
        </section>
      )}
      <div
        className={"timer-content [&&&&]:p-[14px_16px_12px]"}
        hidden={waiting}
      >
        <div
          className={
            "timer-mode flex justify-between items-center gap-[10px] text-muted [&_[role=group]]:flex [&_[role=group]]:gap-[4px] [&_button]:min-h-[28px] [&&&&]:text-[12px] [&&&&_button]:p-[3px_12px]"
          }
        >
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
          <span
            className="timer-connection inline-flex items-center gap-[6px]"
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
          className={`[&&&&]:[--timer-fill:var(--ors-color-accent)] [&&&&]:m-[16px_0] [&&&&_output]:text-[42px] [&&&&_output]:leading-[1.1] [&&&&_output]:[letter-spacing:-0.025em] [&&&&_output_small]:text-[13px] [&&&&.timer-tug-light]:[--timer-fill:var(--ors-color-success)] [&&&&.timer-tug-medium]:[--timer-fill:var(--ors-color-info)] [&&&&.timer-tug-heavy]:[--timer-fill:var(--ors-color-danger)] [&_>_div:first-child]:flex [&_>_div:first-child]:items-baseline [&_>_div:first-child]:justify-between [&_>_div:first-child]:gap-[12px] [&_output]:font-semibold [&_output]:tabular-nums [&_output_small]:font-normal [&_output_small]:text-muted [&_output_small]:ml-[6px] timer-reading timer-tug-${vm.state.tug ?? "none"}`}
          aria-label="本次抛竿"
        >
          <div>
            <span
              className={
                "timer-phase font-semibold [&&&&]:[color:var(--timer-fill)]"
              }
            >
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
            className={
              "timer-track h-[7px] bg-line rounded-[3px] overflow-hidden mt-[12px] [&_>_span]:block [&_>_span]:h-full [&&&&_>_span]:[background:var(--timer-fill)] [@media(prefers-reduced-motion:_reduce)]:[&&&&_>_span]:[transition:none]"
            }
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
          <div
            className={
              "timer-scale flex justify-between text-muted mt-[6px] tabular-nums [&&&&]:text-[11px]"
            }
          >
            <span>0s</span>
            <span>{shortCast ? "前 10 秒放大" : "线性计时"}</span>
            <span>50s+</span>
          </div>
        </section>
        {vm.automatic && vm.caught && (
          <CaughtFish itemId={vm.caught.itemId} sequence={vm.caught.sequence} />
        )}
        {vm.automatic && vm.connection === "ready" && !vm.catchAvailable && (
          <p
            className={
              "timer-hint text-muted [&&&&]:text-[12px] [&&&&]:leading-[1.6] [&&&&]:m-[12px_0_0]"
            }
          >
            捕获结果暂时无法读取，抛竿计时仍可使用。
          </p>
        )}
        {!vm.automatic && (
          <div
            className={
              "timer-manual-actions flex gap-[5px] [&_button]:px-[5px] [&&&&_button]:flex-[1]"
            }
          >
            <button
              className={
                "timer-cast [.timer-manual-actions_&]:bg-accent [.timer-manual-actions_&&&&]:text-on-accent [.timer-manual-actions_&&&&]:[border-color:transparent]"
              }
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
          <div
            className={
              "timer-error flex items-center gap-[10px] text-danger [&&&&]:m-[10px_0] [&&&&]:text-[12px] [&&&&]:leading-[1.5] [&&&&_span]:flex-[1] [&&&&_button]:shrink-[0]"
            }
            role="alert"
          >
            <span>{errors[vm.errorCode] ?? errors.read_failed}</span>
            <button onClick={() => vm.reconnect()}>重连</button>
          </div>
        )}
        {windowError && (
          <p
            className={
              "timer-error flex items-center gap-[10px] text-danger [&&&&]:m-[10px_0] [&&&&]:text-[12px] [&&&&]:leading-[1.5] [&&&&_span]:flex-[1] [&&&&_button]:shrink-[0]"
            }
            role="alert"
          >
            窗口操作失败，请重试。
          </p>
        )}
        <p
          className={
            "timer-hint text-muted [&&&&]:text-[12px] [&&&&]:leading-[1.6] [&&&&]:m-[12px_0_0]"
          }
        >
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
            className={
              "timer-settings border-t border-solid border-line mt-[12px] pt-[12px] [&_label]:flex [&_label]:items-center [&_label]:gap-[6px] [&_form]:flex [&_form]:gap-[8px] [&_form]:mt-[12px] [&_form_label]:grid [&_form_label]:gap-[6px] [&_input[type=number]]:w-full [&_input[type=number]]:min-w-0 [&_input[type=number]]:p-[6px] [&_input[type=number]]:bg-surface [&_input[type=number]]:text-ink [&_input[type=number]]:border [&_input[type=number]]:border-solid [&_input[type=number]]:border-control [&_input[type=number]]:rounded-[4px] [&_p]:text-muted [&_p]:mb-0 [&&&&_input]:[accent-color:var(--ors-color-accent)] [&&&&_form]:[align-items:end] [&&&&_form_label]:flex-[1] [&&&&_p]:text-[12px] [&&&&_p]:leading-[1.6]"
            }
            aria-label="计时设置"
          >
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
