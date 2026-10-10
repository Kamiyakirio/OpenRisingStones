/** Current game-character presentation and automatic-travel progress feedback. */

import { useId } from "react";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import {
  ArrowClockwise,
  CheckCircle,
  SpinnerGap,
  UserCircle,
} from "@phosphor-icons/react";

import type { TeleportWorkspaceState } from "../hooks/useTeleportWorkspace";

export function AutomaticSource({
  viewModel,
}: {
  viewModel: TeleportWorkspaceState;
}) {
  const ready = Boolean(
    viewModel.automaticCharacter &&
    viewModel.selectedSourceArea &&
    viewModel.selectedSourceGroup &&
    viewModel.selectedRole,
  );
  return (
    <section
      className={`[&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&_strong]:[text-overflow:ellipsis] [&&&&_small]:[text-overflow:ellipsis] [&&&&_>_button]:p-[0_12px] [&&&&_>_button]:[font-weight:720] [&&&&_>_button:disabled]:opacity-[0.55] [@media(max-width:_700px)]:[&&&&]:grid-cols-[auto_minmax(0,_1fr)] [@media(max-width:_700px)]:[&&&&_>_button]:[grid-column:1_/_-1] grid items-center gap-[13px] mt-0 p-[15px] border border-solid border-line rounded-[var(--ors-radius-control)] bg-canvas [&_>_div:nth-child(2)]:grid [&_>_div:nth-child(2)]:min-w-0 [&_>_div:nth-child(2)]:gap-[3px] [&_span]:text-muted [&_span]:text-xs [&_small]:text-muted [&_small]:text-xs [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&_small]:overflow-hidden [&_small]:whitespace-nowrap [&_strong]:text-sm [&_>_button]:inline-flex [&_>_button]:items-center [&_>_button]:gap-[7px] [&_>_button]:min-h-[36px] [&_>_button]:border [&_>_button]:border-solid [&_>_button]:border-control [&_>_button]:rounded-[var(--ors-radius-control)] [&_>_button]:text-ink [&_>_button]:bg-surface [&_>_button]:text-xs [&_>_button:disabled]:cursor-not-allowed [&_>_button_svg]:w-[15px] [&_>_button_svg]:h-[15px] max-[700px]:[&_>_button]:justify-center max-[700px]:[&_>_button]:w-full teleport-memory-source${ready ? " is-ready [.teleport-memory-source&]:bg-selected [.teleport-memory-source&&&&]:[border-color:color-mix(_in_srgb,_var(--ors-color-accent)_45%,_var(--ors-color-line)_)]" : ""}`}
    >
      <div
        className={
          "teleport-memory-source-icon grid place-items-center w-[38px] h-[38px] text-accent bg-surface [&_svg]:w-[21px] [&_svg]:h-[21px] [&&&&]:rounded-[50%]"
        }
      >
        {ready ? (
          <CheckCircle weight="fill" />
        ) : (
          <UserCircle weight="duotone" />
        )}
      </div>
      <div>
        <span>游戏内存读取</span>
        <strong>
          {ready ? viewModel.selectedRole?.roleName : "尚未读取当前角色"}
        </strong>
        <small>
          {ready
            ? `${viewModel.selectedSourceArea?.areaName} / ${viewModel.selectedSourceGroup?.groupName} · World ${viewModel.automaticCharacter?.currentWorldId}`
            : "自动模式不需要手动选择当前大区、服务器或角色。"}
        </small>
      </div>
      <button
        type="button"
        disabled={viewModel.actionLoading}
        onClick={() => void viewModel.initializeAutomaticSource()}
      >
        <ArrowClockwise />
        {ready ? "重新读取" : "读取游戏数据"}
      </button>
    </section>
  );
}

export function AutomaticProgress({
  stage,
}: {
  stage: TeleportWorkspaceState["automaticStage"];
}) {
  // Progress owns focus until the operation completes; it cannot be dismissed.
  const titleId = useId();
  const focus = useDialogFocus(() => undefined);
  const copy = {
    idle: "正在准备",
    connecting: "正在连接游戏进程",
    reading_character: "正在读取并核对当前角色",
    awaiting_logout_confirmation: "正在等待退出确认",
    logging_out: "正在退出角色并等待标题画面",
    submitting: "正在创建超域传送订单",
    waiting_order: "正在等待官方订单完成",
    switching_region: "正在准备目标大区连接",
    ready: "目标大区已经准备完成",
    failed: "自动操作已停止",
  } satisfies Record<TeleportWorkspaceState["automaticStage"], string>;
  return (
    <section
      ref={focus}
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby={titleId}
      className={
        "teleport-progress-overlay fixed grid place-items-center p-[20px] [&&&&]:z-[40] [&&&&]:inset-[0] [&&&&]:[background:rgba(10,_15,_26,_0.64)]"
      }
      role="dialog"
    >
      <div
        className={
          "teleport-progress-panel grid min-w-0 max-h-[calc(100dvh-40px)] overflow-y-auto break-words p-6 border border-solid border-line rounded-[var(--ors-radius-control)] text-ink bg-surface text-center [&_>_svg]:w-[42px] [&_>_svg]:h-[42px] [&_>_svg]:mb-[17px] [&_>_svg]:text-accent [&_>_span]:text-accent [&_>_span]:text-xs [&_h2]:text-lg [&_code]:text-muted [&_code]:text-xs [&_p]:text-muted [&_p]:text-xs [&&&&]:[justify-items:center] [&&&&]:w-[min(440px,_100%)] [&&&&]:shadow-[none] [&&&&_>_span]:[font-weight:760] [&&&&_>_span]:[letter-spacing:normal] [&&&&_h2]:m-[8px_0] [&&&&_p]:m-[14px_0_0] [&&&&_p]:leading-[1.6]"
        }
      >
        <SpinnerGap
          className={"spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"}
        />
        <span>自动模式</span>
        <h2 className="text-lg font-semibold" id={titleId} aria-live="polite">
          {copy[stage]}
        </h2>
        <p>进度和确认都在当前窗口显示。</p>
      </div>
    </section>
  );
}
