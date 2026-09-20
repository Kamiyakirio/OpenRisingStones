/** Header entrypoint also provides recovery when the floating timer ignores mouse input. */
import { Timer } from "@phosphor-icons/react";
import { useState } from "react";
import { RiskDialog } from "../../../shared/components/RiskDialog";
import { openFishingTimer } from "./window";
export function TimerLauncher() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);

  // Keep window creation inside the confirmation gesture so browser popups still work.
  async function confirmOpen() {
    setRiskOpen(false);
    setBusy(true);
    setError(false);
    try {
      await openFishingTimer();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="fish-timer-launcher">
        <button
          disabled={busy}
          onClick={() => {
            setError(false);
            setRiskOpen(true);
          }}
          title="打开计时器；已打开时恢复鼠标操作"
        >
          <Timer aria-hidden="true" />
          {busy ? "正在打开…" : "钓鱼计时"}
        </button>
        {error && (
          <small role="alert">
            无法打开计时器，请重试；网页需允许弹出窗口。
          </small>
        )}
      </span>
      {riskOpen && (
        <RiskDialog
          title="自动识别会读取游戏进程"
          items={[
            "桌面端默认启用自动识别，会读取当前 FF14 游戏进程的内存以识别抛竿、咬钩和杆型。",
            "读取游戏进程可能被视为使用外部辅助程序，使用后果由你自行承担。",
            "自动识别不会修改游戏数据或执行钓鱼操作。你也可以改用手动计时；网页端只支持手动计时。",
          ]}
          confirmLabel="确认并打开计时器"
          onConfirm={() => void confirmOpen()}
          onCancel={() => setRiskOpen(false)}
        />
      )}
    </>
  );
}
