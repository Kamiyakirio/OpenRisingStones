/** Current game-character presentation and automatic-travel progress feedback. */

import clsx from "clsx";
import {
  teleportProgressOverlayClasses,
  teleportProgressSpinnerClasses,
} from "../utilityClasses";
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
      className={clsx(
        "mt-0 grid grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-[13px] rounded-control border border-solid border-line bg-canvas p-[15px] max-[700px]:grid-cols-[auto_minmax(0,_1fr)]",
        `teleport-memory-source${ready ? "is-ready border-[color-mix(_in_srgb,_var(--ors-color-accent)_45%,_var(--ors-color-line)_)] bg-selected" : ""}`,
      )}
    >
      <div className="teleport-memory-source-icon grid h-9.5 w-9.5 place-items-center rounded-[50%] bg-surface text-accent nth-[2]:grid nth-[2]:min-w-0 nth-[2]:gap-[3px]">
        {ready ? (
          <CheckCircle className="h-[21px] w-[21px]" weight="fill" />
        ) : (
          <UserCircle className="h-[21px] w-[21px]" weight="duotone" />
        )}
      </div>
      <div className="nth-[2]:grid nth-[2]:min-w-0 nth-[2]:gap-[3px]">
        <span className="text-xs text-muted">游戏内存读取</span>
        <strong className="overflow-hidden text-sm text-ellipsis whitespace-nowrap">
          {ready ? viewModel.selectedRole?.roleName : "尚未读取当前角色"}
        </strong>
        <small className="overflow-hidden text-xs text-ellipsis whitespace-nowrap text-muted">
          {ready
            ? `${viewModel.selectedSourceArea?.areaName} / ${viewModel.selectedSourceGroup?.groupName} · World ${viewModel.automaticCharacter?.currentWorldId}`
            : "自动模式不需要手动选择当前大区、服务器或角色。"}
        </small>
      </div>
      <button
        className="inline-flex min-h-9 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-surface px-3 py-0 text-xs font-[720] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-not-allowed disabled:opacity-55 max-[700px]:col-span-full max-[700px]:w-full max-[700px]:justify-center"
        type="button"
        disabled={viewModel.actionLoading}
        onClick={() => void viewModel.initializeAutomaticSource()}
      >
        <ArrowClockwise className="h-[15px] w-[15px] shrink-0" />
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
      className={teleportProgressOverlayClasses}
      role="dialog"
    >
      <div className="teleport-progress-panel grid max-h-[calc(100dvh-40px)] w-[min(440px,_100%)] min-w-0 justify-items-center overflow-y-auto rounded-control border border-solid border-line bg-surface p-6 text-center break-words text-ink shadow-[none]">
        <SpinnerGap className={teleportProgressSpinnerClasses} />
        <span className="text-xs font-[760] tracking-normal text-accent">
          自动模式
        </span>
        <h2
          className="mx-0 my-2 text-lg font-semibold"
          id={titleId}
          aria-live="polite"
        >
          {copy[stage]}
        </h2>
        <p className="mx-0 mt-3.5 mb-0 text-xs leading-[1.6] text-muted">
          进度和确认都在当前窗口显示。
        </p>
      </div>
    </section>
  );
}
