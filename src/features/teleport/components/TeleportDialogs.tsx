/** Travel review and return dialogs with the selection fields they share. */

import { X } from "@phosphor-icons/react";

import type { TeleportWorkspaceState } from "../hooks/useTeleportWorkspace";

export function JourneyReview({
  viewModel,
}: {
  viewModel: TeleportWorkspaceState;
}) {
  return (
    <div className="journey-review">
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
            className="is-primary"
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
      <div className="teleport-return-default">
        <span>当前所在地</span>
        <strong>
          {currentArea?.areaName ?? "未知大区"} /{" "}
          {viewModel.selectedReturnGroup?.groupName ?? "未知服务器"}
        </strong>
      </div>
      <label className="teleport-return-override">
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
        <div className="teleport-field-grid">
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
  onClose: () => void;
}) {
  return (
    <div className="teleport-dialog-backdrop">
      <section
        className="teleport-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="teleport-dialog-title"
      >
        <header>
          <h2 id="teleport-dialog-title">{title}</h2>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="teleport-dialog-body">{children}</div>
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
    <label className="teleport-field">
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
