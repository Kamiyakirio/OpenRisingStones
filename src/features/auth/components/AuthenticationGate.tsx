import { ArrowLeft, LockKey, X } from "@phosphor-icons/react";
import { useId } from "react";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import { authDialogCloseClasses } from "../utilityClasses";

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
      className="authentication-gate fixed inset-0 z-20 grid grid-rows-[auto_1fr_auto] overflow-auto bg-canvas px-8 py-0 text-ink max-[767px]:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={checking}
    >
      <header className="authentication-gate-header flex min-h-16 items-center justify-between gap-4">
        <strong className="text-lg font-semibold">OpenRisingStones</strong>
        <button
          type="button"
          className={authDialogCloseClasses}
          aria-label="关闭并返回首页"
          onClick={onGoHome}
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="authentication-gate-content w-[min(560px,_100%)] self-center justify-self-center rounded-overlay border border-line bg-surface p-6 text-center max-[767px]:p-5">
        <LockKey
          className="authentication-gate-icon mx-auto box-content size-12 rounded-overlay border border-tool bg-tool-soft p-3 text-tool"
          aria-hidden="true"
        />
        <h1
          className="mx-0 mt-5 mb-3 [font-family:var(--ors-font-heading)] text-2xl leading-[1.5] font-semibold tracking-tight"
          id={titleId}
        >
          {checking
            ? "正在检查登录状态"
            : expired
              ? "登录已过期"
              : `登录后使用${feature}`}
        </h1>
        <p className="m-0 leading-[1.6] text-muted" id={descriptionId}>
          {expired ? "请重新登录盛趣通行证。" : description}
        </p>
        {checking && (
          <p
            role="status"
            className="authentication-gate-status m-0 leading-[1.6] text-muted"
          >
            正在检查登录状态
          </p>
        )}
        <div className="authentication-gate-actions mt-8 flex flex-wrap items-center justify-center gap-3 max-[359px]:flex-col">
          <button
            type="button"
            className="authentication-gate-login inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-accent bg-accent px-4 py-2 text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover max-[359px]:w-full"
            disabled={checking}
            onClick={onLogin}
          >
            <LockKey className="h-5 w-5" />
            登录盛趣通行证
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-4 py-2 text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover max-[359px]:w-full"
            type="button"
            onClick={onGoHome}
          >
            <ArrowLeft className="h-5 w-5" />
            返回首页
          </button>
        </div>
      </div>
      <footer className="authentication-gate-footer px-0 py-6 text-xs text-muted">
        非官方 FF14 工具
      </footer>
    </section>
  );
}
