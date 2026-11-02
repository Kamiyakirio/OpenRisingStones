/** Travel review and return dialogs with the selection fields they share. */

import {
  teleportControlClasses,
  teleportFactRowClasses,
} from "../utilityClasses";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import { useId } from "react";
import { X } from "@phosphor-icons/react";
import type { TeleportWorkspaceState } from "../hooks/useTeleportWorkspace";

export function JourneyReview({
  viewModel,
}: {
  viewModel: TeleportWorkspaceState;
}) {
  return (
    <div className="journey-review grid gap-[1px] overflow-hidden rounded-control border border-solid border-line bg-line [overflow-wrap:anywhere]">
      <div className={teleportFactRowClasses}>
        <span className="text-xs text-muted">角色</span>
        <strong className="text-[12px]">
          {viewModel.selectedRole?.roleName}
        </strong>
      </div>
      <div className={teleportFactRowClasses}>
        <span className="text-xs text-muted">当前服务器</span>
        <strong className="text-[12px]">
          {viewModel.selectedSourceArea?.areaName} /{" "}
          {viewModel.selectedSourceGroup?.groupName}
        </strong>
      </div>
      <div className={teleportFactRowClasses}>
        <span className="text-xs text-muted">目标服务器</span>
        <strong className="text-[12px]">
          {viewModel.selectedTargetArea?.areaName} /{" "}
          {viewModel.selectedTargetGroup?.groupName ??
            `${viewModel.resolvedTargetGroup?.groupName ?? "无可用服务器"}（自动选择）`}
        </strong>
      </div>
    </div>
  );
}
export function ReturnDialog({
  viewModel,
}: {
  viewModel: TeleportWorkspaceState;
}) {
  const currentArea =
    viewModel.returnAreas.find(
      (area) => area.areaId === viewModel.returnAreaId,
    ) ?? null;
  return (
    <ActionDialog
      title="申请返回原服"
      onClose={viewModel.closeReturn}
      actions={
        <>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-4 py-0 text-[12px] font-[720] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] max-[700px]:w-full"
            type="button"
            onClick={viewModel.closeReturn}
          >
            取消
          </button>
          <button
            className="is-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-4 py-0 text-[12px] font-[720] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] max-[700px]:w-full dark:text-canvas"
            type="button"
            disabled={!viewModel.selectedReturnGroup || viewModel.actionLoading}
            onClick={() => void viewModel.submitReturn()}
          >
            提交返回申请
          </button>
        </>
      }
    >
      <p className="mx-0 mt-0 mb-4.5 text-[12px] leading-[1.6] text-muted">
        默认使用出发订单记录的目的地作为角色当前所在地。
      </p>
      <div className="teleport-return-default mb-[15px] grid gap-[5px] rounded-control border border-solid border-line bg-canvas p-3.5">
        <span className="text-xs text-muted">当前所在地</span>
        <strong className="text-sm">
          {currentArea?.areaName ?? "未知大区"} /{" "}
          {viewModel.selectedReturnGroup?.groupName ?? "未知服务器"}
        </strong>
      </div>
      <label className="teleport-return-override mb-4.5 flex min-h-11 items-center gap-[9px] text-xs leading-[1.55] text-muted">
        <input
          className="m-0 h-4 w-4 shrink-0 [accent-color:var(--ors-color-accent)]"
          type="checkbox"
          checked={viewModel.returnLocationOverride}
          onChange={(event) =>
            viewModel.setReturnLocationOverride(event.target.checked)
          }
        />
        <span>角色中途去过其他服务器，手动选择当前所在地</span>
      </label>
      {viewModel.returnLocationOverride && (
        <div className="teleport-field-grid mt-0 grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-[1fr]">
          <SelectField
            label="当前大区"
            value={viewModel.returnAreaId}
            placeholder="选择当前大区"
            options={viewModel.returnAreas.map((area) => ({
              value: area.areaId,
              label: area.areaName,
            }))}
            onChange={viewModel.selectReturnArea}
          />
          <SelectField
            label="当前服务器"
            value={viewModel.returnGroupId}
            placeholder="选择当前服务器"
            options={(currentArea?.groups ?? []).map((group) => ({
              value: group.groupId,
              label: group.groupName,
            }))}
            onChange={viewModel.setReturnGroupId}
          />
        </div>
      )}
    </ActionDialog>
  );
}
export function ActionDialog({
  title,
  children,
  actions,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
  onClose?: () => void;
}) {
  const dialog = useDialogFocus(() => onClose?.());
  const titleId = useId();
  return (
    <div className="teleport-dialog-backdrop fixed inset-0 z-40 grid place-items-center bg-[rgba(10,_15,_26,_0.64)] p-5">
      <section
        ref={dialog}
        tabIndex={-1}
        className="teleport-dialog max-h-[calc(100dvh_-_32px)] w-[min(600px,_100%)] min-w-0 overflow-auto rounded-overlay border border-solid border-line bg-surface break-words text-ink shadow-[var(--ors-shadow-dialog)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="flex items-center justify-between border-b border-solid border-line px-5 py-[17px]">
          <h2
            className="m-0 text-lg font-semibold tracking-normal"
            id={titleId}
          >
            {title}
          </h2>
          {onClose && (
            <button
              className="grid h-8.5 min-h-11 min-w-11 place-items-center items-center justify-center gap-2 rounded-control border-0 bg-transparent p-0 text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover hover:text-ink"
              type="button"
              aria-label="关闭"
              onClick={onClose}
            >
              <X className={teleportControlClasses.icon} />
            </button>
          )}
        </header>
        <div className="teleport-dialog-body px-5 py-5.5">{children}</div>
        <footer className="flex items-center justify-end gap-[9px] border-t border-solid border-line bg-canvas px-5 py-[17px] max-[700px]:flex-col max-[700px]:items-stretch">
          {actions}
        </footer>
      </section>
    </div>
  );
}
export function SelectField({
  label,
  value,
  placeholder,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number | null;
  placeholder: string;
  options: Array<{
    value: number;
    label: string;
    disabled?: boolean;
  }>;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="teleport-field grid gap-2 text-xs font-bold text-muted">
      <span>{label}</span>
      <select
        className="min-h-11 w-full min-w-0 rounded-control border border-solid border-control bg-canvas py-0 pr-9 pl-[13px] text-[12px] text-ink [font:inherit] focus-visible:[outline:2px_solid_var(--ors-color-accent)] focus-visible:[outline-offset:2px] disabled:cursor-not-allowed disabled:opacity-56"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : null)
        }
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
