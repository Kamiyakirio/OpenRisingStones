/** Full-viewport authentication boundary shared by every protected workspace. */
import { ArrowLeft, LockKey, X } from "@phosphor-icons/react";
import { useId } from "react";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import "./AuthenticationGate.css";

type AuthenticationGateProps = {
  feature: string;
  description: string;
  checking: boolean;
  expired?: boolean;
  onLogin: () => void;
  onGoHome: () => void;
};

export function AuthenticationGate({
  feature,
  description,
  checking,
  expired = false,
  onLogin,
  onGoHome,
}: AuthenticationGateProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useDialogFocus(onGoHome);
  return (
    <section
      ref={dialog}
      tabIndex={-1}
      className="authentication-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={checking}
    >
      <header className="authentication-gate-header">
        <strong>OpenRisingStones</strong>
        <button
          type="button"
          className="dialog-close"
          aria-label="关闭并返回首页"
          onClick={onGoHome}
        >
          <X />
        </button>
      </header>
      <div className="authentication-gate-content">
        <LockKey className="authentication-gate-icon" aria-hidden="true" />
        <h1 id={titleId}>
          {checking
            ? "正在检查登录状态"
            : expired
              ? "登录已过期"
              : `登录后使用${feature}`}
        </h1>
        <p id={descriptionId}>
          {expired ? "请重新登录盛趣通行证。" : description}
        </p>
        {checking && (
          <p role="status" className="authentication-gate-status">
            正在检查登录状态
          </p>
        )}
        <div className="authentication-gate-actions">
          <button
            type="button"
            className="authentication-gate-login"
            disabled={checking}
            onClick={onLogin}
          >
            <LockKey />
            登录盛趣通行证
          </button>
          <button type="button" onClick={onGoHome}>
            <ArrowLeft />
            返回首页
          </button>
        </div>
      </div>
      <footer className="authentication-gate-footer">非官方 FF14 工具</footer>
    </section>
  );
}
