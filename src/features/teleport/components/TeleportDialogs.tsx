/** Travel review and return dialogs with the selection fields they share. */

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
    <div
      className={
        "journey-review [overflow-wrap:anywhere] grid gap-[1px] overflow-hidden border border-solid border-line rounded-[var(--ors-radius-control)] bg-line [&_>_div]:grid [&_>_div]:gap-[12px] [&_>_div]:bg-canvas [&_span]:text-muted [&_span]:text-xs max-[700px]:[&_>_div]:gap-[4px] [&&&&_>_div]:grid-cols-[120px_minmax(0,_1fr)] [&&&&_>_div]:p-[13px_14px] [&&&&_strong]:text-[12px] [@media(max-width:_700px)]:[&&&&_>_div]:grid-cols-[1fr]"
      }
    >
      <div>
        <span>角色</span>
        <strong>{viewModel.selectedRole?.roleName}</strong>
      </div>
      <div>
        <span>当前服务器</span>
        <strong>
          {viewModel.selectedSourceArea?.areaName} /{" "}
          {viewModel.selectedSourceGroup?.groupName}
        </strong>
      </div>
      <div>
        <span>目标服务器</span>
        <strong>
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
          <button type="button" onClick={viewModel.closeReturn}>
            取消
          </button>
          <button
            className="is-primary [.teleport-dialog_>_footer_button&]:border-accent [.teleport-dialog_>_footer_button&]:text-on-accent [.teleport-dialog_>_footer_button&]:bg-accent [.theme-dark_.teleport-dialog_>_footer_button&]:text-canvas"
            type="button"
            disabled={!viewModel.selectedReturnGroup || viewModel.actionLoading}
            onClick={() => void viewModel.submitReturn()}
          >
            提交返回申请
          </button>
        </>
      }
    >
      <p>默认使用出发订单记录的目的地作为角色当前所在地。</p>
      <div className="teleport-return-default grid gap-[5px] mb-[15px] p-[14px] border border-solid border-line rounded-[var(--ors-radius-control)] bg-canvas [&_span]:text-muted [&_span]:text-xs [&_strong]:text-sm">
        <span>当前所在地</span>
        <strong>
          {currentArea?.areaName ?? "未知大区"} /{" "}
          {viewModel.selectedReturnGroup?.groupName ?? "未知服务器"}
        </strong>
      </div>
      <label
        className={
          "teleport-return-override flex min-h-11 items-center gap-[9px] mb-[18px] text-muted text-xs [&_input]:w-[16px] [&_input]:h-[16px] [&_input]:m-0 [&&&&]:leading-[1.55] [&&&&_input]:flex-[0_0_auto] [&&&&_input]:[accent-color:var(--ors-color-accent)]"
        }
      >
        <input
          type="checkbox"
          checked={viewModel.returnLocationOverride}
          onChange={(event) =>
            viewModel.setReturnLocationOverride(event.target.checked)
          }
        />
        <span>角色中途去过其他服务器，手动选择当前所在地</span>
      </label>
      {viewModel.returnLocationOverride && (
        <div
          className={
            "teleport-field-grid grid gap-[14px] mt-[26px] [.teleport-target-fields_&]:mt-0 [.teleport-dialog-body_&]:mt-0 [&&&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(max-width:_700px)]:[&&&&]:grid-cols-[1fr]"
          }
        >
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
    <div
      className={
        "teleport-dialog-backdrop fixed grid place-items-center p-[20px] [&&&&]:z-[40] [&&&&]:inset-[0] [&&&&]:[background:rgba(10,_15,_26,_0.64)]"
      }
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className={
          "teleport-dialog [&&&&&&&&_button]:min-h-11 min-w-0 break-words border border-solid border-line rounded-[var(--ors-radius-overlay)] text-ink bg-surface overflow-auto [&_>_header]:flex [&_>_header]:items-center [&_>_footer]:flex [&_>_footer]:items-center [&_>_header]:justify-between [&_>_header]:border-b [&_>_header]:border-solid [&_>_header]:border-line [&_>_header_h2]:m-0 [&_>_header_h2]:text-lg [&_>_header_button]:grid [&_>_header_button]:place-items-center [&_>_header_button]:min-w-11 [&_>_header_button]:min-h-11 [&_>_header_button]:h-[34px] [&_>_header_button]:p-0 [&_>_header_button]:border-0 [&_>_header_button]:rounded-[var(--ors-radius-control)] [&_>_header_button]:text-muted [&_>_header_button:hover]:text-ink [&_>_header_button:hover]:bg-hover [&_>_footer]:justify-end [&_>_footer]:gap-[9px] [&_>_footer]:border-t [&_>_footer]:border-solid [&_>_footer]:border-line [&_>_footer]:bg-canvas [&_>_footer_button]:min-h-[40px] [&_>_footer_button]:border [&_>_footer_button]:border-solid [&_>_footer_button]:border-control [&_>_footer_button]:rounded-[var(--ors-radius-control)] [&_>_footer_button]:text-ink [&_>_footer_button]:bg-surface max-[700px]:[&_>_footer]:items-stretch max-[700px]:[&_>_footer]:flex-col max-[700px]:[&_>_footer_button]:w-full [&&&&]:w-[min(600px,_100%)] [&&&&]:max-h-[calc(100dvh_-_32px)] [&&&&]:shadow-[var(--ors-shadow-dialog)] [&&&&_>_header]:p-[17px_20px] [&&&&_>_footer]:p-[17px_20px] [&&&&_>_header_h2]:[letter-spacing:normal] [&&&&_>_header_button]:[background:transparent] [&&&&_>_footer_button]:p-[0_16px] [&&&&_>_footer_button]:text-[12px] [&&&&_>_footer_button]:[font-weight:720]"
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <h2 className="text-lg font-semibold" id={titleId}>
            {title}
          </h2>
          {onClose && (
            <button type="button" aria-label="关闭" onClick={onClose}>
              <X />
            </button>
          )}
        </header>
        <div
          className={
            "teleport-dialog-body [&_>_p]:text-muted [&&&&]:p-[22px_20px] [&&&&_>_p]:m-[0_0_18px] [&&&&_>_p]:text-[12px] [&&&&_>_p]:leading-[1.6]"
          }
        >
          {children}
        </div>
        <footer>{actions}</footer>
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
  options: Array<{ value: number; label: string; disabled?: boolean }>;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label
      className={
        "teleport-field grid gap-[8px] text-muted text-xs font-bold [&_select]:w-full [&_select]:min-w-0 [&_select]:min-h-[44px] [&_select]:border [&_select]:border-solid [&_select]:border-control [&_select]:rounded-[var(--ors-radius-control)] [&_select]:text-ink [&_select]:bg-canvas [&_input]:w-full [&_input]:min-w-0 [&_input]:min-h-[44px] [&_input]:border [&_input]:border-solid [&_input]:border-control [&_input]:rounded-[var(--ors-radius-control)] [&_input]:text-ink [&_input]:bg-canvas [&_select:disabled]:cursor-not-allowed [&_input:disabled]:cursor-not-allowed [&&&&_select]:p-[0_36px_0_13px] [&&&&_select]:[font:inherit] [&&&&_select]:text-[12px] [&&&&_input]:p-[0_36px_0_13px] [&&&&_input]:[font:inherit] [&&&&_input]:text-[12px] [&&&&_select:disabled]:opacity-[0.56] [&&&&_input:disabled]:opacity-[0.56] [&&&&_select:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_select:focus-visible]:[outline-offset:2px] [&&&&_input:focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_input:focus-visible]:[outline-offset:2px]"
      }
    >
      <span>{label}</span>
      <select
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
