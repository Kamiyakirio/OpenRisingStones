/** Full-viewport authentication boundary shared by every protected workspace. */
import { ArrowLeft, LockKey, X } from "@phosphor-icons/react";
import { useId } from "react";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";

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
      className={
        "authentication-gate fixed grid overflow-auto text-ink bg-canvas [&&&&]:inset-[0] [&&&&]:z-[20] [&&&&]:grid-rows-[auto_1fr_auto] [&&&&]:p-[0_32px] [@media(max-width:_767px)]:[&&&&]:px-4"
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={checking}
    >
      <header className="authentication-gate-header flex items-center justify-between gap-[16px] min-h-[64px] [&_strong]:text-lg [&_strong]:font-semibold">
        <strong>OpenRisingStones</strong>
        <button
          type="button"
          className={
            "dialog-close grid size-9 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink [&_svg]:size-5 [.settings-dialog-header_&&&&:disabled]:[cursor:wait] [.settings-dialog-header_&&&&:disabled]:opacity-[0.45]"
          }
          aria-label="关闭并返回首页"
          onClick={onGoHome}
        >
          <X />
        </button>
      </header>
      <div
        className={
          "authentication-gate-content self-center justify-self-center rounded-2xl border border-line bg-surface p-6 text-center [&_h1]:text-2xl [&_h1]:font-semibold [&_p]:m-0 [&_p]:text-muted max-[767px]:p-5 [&&&&]:w-[min(560px,_100%)] [&&&&_h1]:m-[20px_0_12px] [&&&&_h1]:[font-family:var(--ors-font-heading)] [&&&&_h1]:leading-[1.5] [&&&&_p]:leading-[1.6]"
        }
      >
        <LockKey
          className="authentication-gate-icon mx-auto box-content size-12 rounded-2xl border border-tool bg-tool-soft p-3 text-tool"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold tracking-tight" id={titleId}>
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
          <p
            role="status"
            className="authentication-gate-status [.authentication-gate-content_&]:mt-[16px]"
          >
            正在检查登录状态
          </p>
        )}
        <div
          className={
            "authentication-gate-actions flex flex-wrap items-center justify-center gap-[12px] mt-[32px] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[8px] [&_button]:min-h-[40px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button:hover:not(:disabled)]:bg-hover [&_svg]:w-[20px] [&_svg]:h-[20px] max-[359px]:flex-col max-[359px]:[&_button]:w-full [&&&&_button]:p-[8px_16px]"
          }
        >
          <button
            type="button"
            className="authentication-gate-login [.authentication-gate-actions_&]:border-accent [.authentication-gate-actions_&]:text-on-accent [.authentication-gate-actions_&]:bg-accent [.authentication-gate-actions_&:hover:not(:disabled)]:bg-accent-hover"
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
      <footer
        className={
          "authentication-gate-footer text-muted text-xs [&&&&]:p-[24px_0]"
        }
      >
        非官方 FF14 工具
      </footer>
    </section>
  );
}
