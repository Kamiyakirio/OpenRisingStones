/** Explicit layout variants keep this component independent of ancestor classes. */
import { useEffect, useRef } from "react";
import {
  Cookie,
  Database,
  GearSix,
  Gauge,
  SpinnerGap,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import { useSettingsDialog } from "../hooks/useSettingsDialog";

/** Reused presentation strings stay static and are allocated once for this module. */
const settingsDescriptionClasses =
  "mx-0 mt-[5px] mb-0 text-[12px] leading-[1.55] text-muted";

type SettingsDialogProps = {
  onClose: () => void;
  onOpenGearingBenchmark: () => void;
};
export function SettingsDialog({
  onClose,
  onOpenGearingBenchmark,
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
      className="settings-backdrop fixed inset-0 z-30 grid place-items-center bg-[rgba(10,_15,_26,_0.64)] p-4 max-[700px]:items-end max-[700px]:p-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className="settings-dialog max-h-[calc(100dvh_-_32px)] w-[min(720px,_100%)] overflow-auto rounded-overlay border border-control bg-surface text-ink max-[700px]:max-h-[calc(100dvh_-_18px)] max-[700px]:w-full max-[700px]:rounded-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="settings-dialog-header flex items-start justify-between border-b border-solid border-line bg-tool-soft p-6 max-[700px]:px-5 max-[700px]:pt-5.5 max-[700px]:pb-[17px]">
          <div>
            <h2
              className="mx-0 mt-[5px] mb-0 font-sans text-lg font-semibold max-[700px]:text-lg"
              id="settings-title"
            >
              设置
            </h2>
          </div>
          <button
            ref={closeButton}
            className="dialog-close grid size-9 min-h-9 place-items-center rounded-control text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover hover:text-ink disabled:[cursor:wait] disabled:opacity-45 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
            type="button"
            aria-label="关闭设置窗口"
            disabled={viewModel.busy}
            onClick={closeDialog}
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="settings-content p-6 max-[700px]:px-5 max-[700px]:pt-5.5 max-[700px]:pb-6.5">
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
              className="settings-section grid gap-6"
              aria-labelledby="local-data-title"
            >
              <div className="settings-section-intro flex items-center gap-3.5">
                <span
                  className="settings-section-icon grid h-11.5 w-11.5 shrink-0 place-items-center rounded-control border border-solid border-line bg-tool-soft text-tool"
                  aria-hidden="true"
                >
                  <GearSix className="h-[23px] w-[23px]" weight="duotone" />
                </span>
                <div>
                  <h3
                    className="m-0 text-base text-[18px] font-semibold"
                    id="local-data-title"
                  >
                    本地数据
                  </h3>
                  <p className={settingsDescriptionClasses}>
                    查看或清除这台设备上的登录凭据和应用数据。
                  </p>
                </div>
              </div>

              <div
                className="settings-data-scope rounded-control border border-solid border-line bg-canvas"
                aria-label="本地数据范围"
              >
                <DataScopeItem
                  icon={<Cookie className="h-[17px] w-[17px]" />}
                  title="登录凭据"
                  description="系统安全存储中的石之家 Cookie"
                />
                <DataScopeItem
                  icon={<Database className="h-[17px] w-[17px]" />}
                  title="应用数据"
                  description={
                    __DEBUG_BUILD__
                      ? "本地设置、配装草稿、物品缓存、确认记录与本次调试日志"
                      : "本地设置、配装草稿、物品缓存与确认记录"
                  }
                />
              </div>

              {__DEBUG_BUILD__ && (
                <div className="settings-debug-tools grid gap-2">
                  <div className="settings-debug-action flex items-center justify-between gap-6 rounded-control border border-solid border-line bg-canvas p-4 max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-3.5">
                    <div>
                      <strong className="text-sm">配装 Benchmark</strong>
                      <p className="mx-0 mt-[3px] mb-0 text-[12px] leading-[1.55] text-muted">
                        使用真实装备测量当前配装算法。
                      </p>
                    </div>
                    <button
                      className="settings-debug-button inline-flex min-h-9 shrink-0 items-center gap-[7px] rounded-control border border-solid border-control bg-surface px-3.5 py-0 text-[12px] font-bold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] hover:border-accent hover:bg-selected max-[700px]:w-full max-[700px]:justify-center pointer-coarse:min-h-11"
                      type="button"
                      onClick={() => {
                        closeDialog();
                        onOpenGearingBenchmark();
                      }}
                    >
                      <Gauge className="h-4 w-4" />
                      打开工具
                    </button>
                  </div>
                </div>
              )}

              <div className="settings-danger-action flex items-center justify-between gap-6 border-t border-solid border-danger pt-5.5 max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-4">
                <div>
                  <strong className="text-sm text-danger">
                    清除所有本地数据
                  </strong>
                  <p className={settingsDescriptionClasses}>
                    操作完成后，应用将重新加载并回到未登录状态。
                  </p>
                </div>
                <button
                  className="settings-danger-button inline-flex min-h-10.5 shrink-0 items-center justify-center gap-[7px] rounded-control border border-solid border-danger bg-surface px-4 py-0 text-[12px] font-bold whitespace-nowrap text-danger [transition:transform_160ms_ease,_background-color_160ms_ease,_border-color_160ms_ease] enabled:hover:bg-hover disabled:[cursor:wait] disabled:opacity-52 max-[700px]:w-full"
                  type="button"
                  onClick={viewModel.startConfirmation}
                >
                  <Trash className="h-4 w-4" />
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
      className="settings-confirmation grid justify-items-center px-2.5 pt-2 pb-0.5 text-center"
      aria-labelledby="clear-data-title"
    >
      <WarningCircle className="h-11.5 w-11.5 text-danger" weight="fill" />
      <h3
        className="m-0 mt-4 text-base text-[18px] font-semibold"
        id="clear-data-title"
      >
        确定清除所有本地数据？
      </h3>
      <p className="mx-0 mt-[5px] mb-0 max-w-[38ch] text-[12px] leading-[1.55] text-muted">
        已保存的登录凭据、本地设置、配装草稿、物品缓存和确认记录
        {__DEBUG_BUILD__ ? "，以及本次调试日志" : ""}
        都会被删除。此操作无法撤销。
      </p>
      <div className="settings-confirmation-actions mt-6.5 flex justify-center gap-2.5">
        <button
          ref={cancelButton}
          className="settings-cancel-button inline-flex min-h-10.5 shrink-0 items-center justify-center gap-[7px] rounded-control border border-solid border-control bg-transparent px-4 py-0 text-[12px] font-bold whitespace-nowrap text-ink [transition:transform_160ms_ease,_background-color_160ms_ease,_border-color_160ms_ease] enabled:hover:border-accent enabled:hover:bg-selected disabled:[cursor:wait] disabled:opacity-52"
          type="button"
          disabled={busy}
          onClick={onCancel}
        >
          取消
        </button>
        <button
          className="settings-danger-button inline-flex min-h-10.5 shrink-0 items-center justify-center gap-[7px] rounded-control border border-solid border-danger bg-surface px-4 py-0 text-[12px] font-bold whitespace-nowrap text-danger [transition:transform_160ms_ease,_background-color_160ms_ease,_border-color_160ms_ease] enabled:hover:bg-hover disabled:[cursor:wait] disabled:opacity-52"
          type="button"
          disabled={busy}
          onClick={() => void onConfirm()}
        >
          {busy ? (
            <>
              <SpinnerGap className="spin h-4 w-4 animate-[login-spin_900ms_linear_infinite]" />
              正在清除
            </>
          ) : (
            <>
              <Trash className="h-4 w-4" />
              清除本地数据
            </>
          )}
        </button>
      </div>
      {error && (
        <div
          className="settings-error mt-5 box-border w-full rounded-control border-l border-solid border-danger bg-surface px-[13px] py-[11px] text-left text-[12px] leading-[1.55] text-danger"
          role="alert"
        >
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
    <div className="settings-data-item flex items-start gap-3 px-4 py-[15px] not-first:border-t not-first:border-solid not-first:border-line">
      <span
        className="grid h-7.5 w-7.5 shrink-0 place-items-center rounded-control bg-selected text-accent"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <strong className="text-sm">{title}</strong>
        <p className={settingsDescriptionClasses}>{description}</p>
      </div>
    </div>
  );
}
