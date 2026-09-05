/** Current game-character presentation and automatic-travel progress feedback. */

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
    <section className={`teleport-memory-source${ready ? " is-ready" : ""}`}>
      <div className="teleport-memory-source-icon">
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
  const copy = {
    idle: "正在准备自动流程",
    connecting: "正在连接游戏进程",
    reading_character: "正在读取并核对当前角色",
    awaiting_logout_confirmation: "正在等待退出确认",
    logging_out: "正在退出角色并等待标题画面",
    submitting: "正在创建超域传送订单",
    waiting_order: "正在等待官方订单完成",
    switching_region: "正在准备目标大区连接",
    ready: "目标大区已经准备完成",
    failed: "自动流程已经停止",
  } satisfies Record<TeleportWorkspaceState["automaticStage"], string>;
  return (
    <div className="teleport-progress-overlay" role="status">
      <div className="teleport-progress-panel">
        <SpinnerGap className="spin" />
        <span>自动模式</span>
        <h2>{copy[stage]}</h2>
        <p>所有提示均显示在当前外部窗口中。</p>
      </div>
    </div>
  );
}
