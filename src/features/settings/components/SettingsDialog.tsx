/** Application settings dialog with a guarded local-data reset action. */
import { useEffect, useRef } from "react";
import {
  Cookie,
  Database,
  GearSix,
  Gauge,
  ListMagnifyingGlass,
  SpinnerGap,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import { useSettingsDialog } from "../hooks/useSettingsDialog";

type SettingsDialogProps = {
  onClose: () => void;
  onOpenGearingBenchmark: () => void;
  onOpenLogs: () => void;
};

export function SettingsDialog({
  onClose,
  onOpenGearingBenchmark,
  onOpenLogs,
}: SettingsDialogProps) {
  const viewModel = useSettingsDialog(onClose);
  const closeDialog = viewModel.close;
  const closeButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  const dialog = useDialogFocus(closeDialog);

  useEffect(() => {
    if (viewModel.confirming) cancelButton.current?.focus();
  }, [viewModel.confirming]);

  return (
    <div
      className="settings-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="settings-dialog-header">
          <div>
            <h2 id="settings-title">设置</h2>
          </div>
          <button
            ref={closeButton}
            className="dialog-close"
            type="button"
            aria-label="关闭设置窗口"
            disabled={viewModel.busy}
            onClick={closeDialog}
          >
            <X />
          </button>
        </header>

        <div className="settings-content">
          {viewModel.confirming ? (
            <ConfirmationPanel
              busy={viewModel.busy}
              error={viewModel.error}
              cancelButton={cancelButton}
              onCancel={viewModel.cancelConfirmation}
              onConfirm={viewModel.clearData}
            />
          ) : (
            <section
              className="settings-section"
              aria-labelledby="local-data-title"
            >
              <div className="settings-section-intro">
                <span className="settings-section-icon" aria-hidden="true">
                  <GearSix weight="duotone" />
                </span>
                <div>
                  <h3 id="local-data-title">本地数据</h3>
                  <p>管理保存在这台设备上的账号凭据与应用偏好。</p>
                </div>
              </div>

              <div className="settings-data-scope" aria-label="本地数据范围">
                <DataScopeItem
                  icon={<Cookie />}
                  title="登录凭据"
                  description="系统安全存储中的石之家 Cookie"
                />
                <DataScopeItem
                  icon={<Database />}
                  title="应用数据"
                  description={
                    __DEBUG_BUILD__
                      ? "本地设置、配装草稿、物品缓存、确认记录与本次调试日志"
                      : "本地设置、配装草稿、物品缓存与确认记录"
                  }
                />
              </div>

              {__DEBUG_BUILD__ && (
                <div className="settings-debug-tools">
                  <div className="settings-debug-action">
                    <div>
                      <strong>日志管理</strong>
                      <p>查看本次运行的网络、命令和游戏桥接记录。</p>
                    </div>
                    <button
                      className="settings-debug-button"
                      type="button"
                      onClick={() => {
                        closeDialog();
                        onOpenLogs();
                      }}
                    >
                      <ListMagnifyingGlass />
                      打开日志
                    </button>
                  </div>
                  <div className="settings-debug-action">
                    <div>
                      <strong>配装 Benchmark</strong>
                      <p>使用真实装备测量当前配装算法。</p>
                    </div>
                    <button
                      className="settings-debug-button"
                      type="button"
                      onClick={() => {
                        closeDialog();
                        onOpenGearingBenchmark();
                      }}
                    >
                      <Gauge />
                      打开工具
                    </button>
                  </div>
                </div>
              )}

              <div className="settings-danger-action">
                <div>
                  <strong>清除所有本地数据</strong>
                  <p>操作完成后，应用将重新加载并回到未登录状态。</p>
                </div>
                <button
                  className="settings-danger-button"
                  type="button"
                  onClick={viewModel.startConfirmation}
                >
                  <Trash />
                  清除数据
                </button>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function ConfirmationPanel({
  busy,
  error,
  cancelButton,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  error: string | null;
  cancelButton: React.RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <section
      className="settings-confirmation"
      aria-labelledby="clear-data-title"
    >
      <WarningCircle weight="fill" />
      <h3 id="clear-data-title">确定清除所有本地数据？</h3>
      <p>
        已保存的登录凭据、本地设置、配装草稿、物品缓存和确认记录
        {__DEBUG_BUILD__ ? "，以及本次调试日志" : ""}
        都会被删除。此操作无法撤销。
      </p>
      <div className="settings-confirmation-actions">
        <button
          ref={cancelButton}
          className="settings-cancel-button"
          type="button"
          disabled={busy}
          onClick={onCancel}
        >
          取消
        </button>
        <button
          className="settings-danger-button"
          type="button"
          disabled={busy}
          onClick={() => void onConfirm()}
        >
          {busy ? (
            <>
              <SpinnerGap className="spin" />
              正在清除
            </>
          ) : (
            <>
              <Trash />
              清除本地数据
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="settings-error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}

function DataScopeItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="settings-data-item">
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
