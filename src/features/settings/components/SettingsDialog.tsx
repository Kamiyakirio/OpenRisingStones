/** Application settings dialog with a guarded local-data reset action. */
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
      className={
        "settings-backdrop fixed grid place-items-center p-[16px] max-[700px]:p-0 [&&&&]:inset-[0] [&&&&]:[background:rgba(10,_15,_26,_0.64)] [&&&&]:z-[30] [@media(max-width:_700px)]:[&&&&]:[align-items:end]"
      }
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className={
          "settings-dialog rounded-2xl border border-control bg-surface text-ink max-[700px]:w-full max-[700px]:rounded-[var(--ors-radius-overlay)] [&&&&]:w-[min(720px,_100%)] [&&&&]:max-h-[calc(100dvh_-_32px)] [&&&&]:[overflow:auto] [@media(max-width:_700px)]:[&&&&]:max-h-[calc(100dvh_-_18px)]"
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header
          className={
            "settings-dialog-header bg-tool-soft flex justify-between items-start border-b border-solid border-line p-[24px] [&_span]:text-accent [&_span]:text-xs [&_span]:font-bold [&_h2]:text-lg max-[700px]:[&_h2]:text-lg [&&&&_span]:[letter-spacing:normal] [&&&&_h2]:m-[5px_0_0] [&&&&_h2]:[font-family:var(--ors-font-ui)] [@media(max-width:_700px)]:[&&&&]:p-[22px_20px_17px]"
          }
        >
          <div>
            <h2 className="text-lg font-semibold" id="settings-title">
              设置
            </h2>
          </div>
          <button
            ref={closeButton}
            className={
              "dialog-close grid size-9 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink [&_svg]:size-5 [.settings-dialog-header_&&&&:disabled]:[cursor:wait] [.settings-dialog-header_&&&&:disabled]:opacity-[0.45]"
            }
            type="button"
            aria-label="关闭设置窗口"
            disabled={viewModel.busy}
            onClick={closeDialog}
          >
            <X />
          </button>
        </header>

        <div
          className={
            "settings-content p-[24px] [@media(max-width:_700px)]:[&&&&]:p-[22px_20px_26px]"
          }
        >
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
              className={
                "settings-section grid gap-[24px] [&_h3]:m-0 [&_p]:text-muted [&&&&_h3]:text-[18px] [&&&&_p]:m-[5px_0_0] [&&&&_p]:text-[12px] [&&&&_p]:leading-[1.55]"
              }
              aria-labelledby="local-data-title"
            >
              <div className="settings-section-intro flex items-center gap-[14px]">
                <span
                  className={
                    "settings-section-icon bg-tool-soft grid place-items-center w-[46px] h-[46px] border border-solid border-line rounded-[var(--ors-radius-control)] text-tool bg-tool-soft [&_svg]:w-[23px] [&_svg]:h-[23px] [&&&&]:flex-[0_0_auto]"
                  }
                  aria-hidden="true"
                >
                  <GearSix weight="duotone" />
                </span>
                <div>
                  <h3 className="text-base font-semibold" id="local-data-title">
                    本地数据
                  </h3>
                  <p>查看或清除这台设备上的登录凭据和应用数据。</p>
                </div>
              </div>

              <div
                className="settings-data-scope border border-solid border-line rounded-[var(--ors-radius-control)] bg-canvas"
                aria-label="本地数据范围"
              >
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
                <div className="settings-debug-tools grid gap-[8px]">
                  <div
                    className={
                      "settings-debug-action flex justify-between items-center gap-[24px] p-[16px] border border-solid border-line rounded-[var(--ors-radius-control)] bg-canvas [&_strong]:text-sm [&_p]:text-muted max-[700px]:items-start max-[700px]:flex-col max-[700px]:gap-[14px] [&&&&_p]:m-[3px_0_0] [&&&&_p]:text-[12px]"
                    }
                  >
                    <div>
                      <strong>配装 Benchmark</strong>
                      <p>使用真实装备测量当前配装算法。</p>
                    </div>
                    <button
                      className={
                        "settings-debug-button inline-flex items-center gap-[7px] border border-solid border-control rounded-[var(--ors-radius-control)] text-ink bg-surface font-bold [&:hover]:border-accent [&:hover]:bg-selected [&_svg]:w-[16px] [&_svg]:h-[16px] max-[700px]:w-full max-[700px]:justify-center [&&&&]:flex-[0_0_auto] [&&&&]:p-[0_14px] [&&&&]:text-[12px]"
                      }
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

              <div
                className={
                  "settings-danger-action [&_p]:text-muted [&_strong]:text-sm flex justify-between items-center gap-[24px] pt-[22px] border-t border-solid border-danger [&_strong]:text-danger max-[700px]:items-start max-[700px]:flex-col max-[700px]:gap-[16px] [&&&&_p]:m-[5px_0_0] [&&&&_p]:text-[12px] [&&&&_p]:leading-[1.55]"
                }
              >
                <div>
                  <strong>清除所有本地数据</strong>
                  <p>操作完成后，应用将重新加载并回到未登录状态。</p>
                </div>
                <button
                  className={
                    "settings-danger-button inline-flex justify-center items-center gap-[7px] min-h-[42px] rounded-[var(--ors-radius-control)] font-bold whitespace-nowrap border border-solid border-danger text-danger bg-surface [&:not(:disabled):hover]:bg-hover [&_svg]:w-[16px] [&_svg]:h-[16px] max-[700px]:[.settings-danger-action_&]:w-full [&&&&]:flex-[0_0_auto] [&&&&]:p-[0_16px] [&&&&]:text-[12px] [&&&&]:[transition:transform_160ms_ease,_background-color_160ms_ease,_border-color_160ms_ease] [&&&&:disabled]:[cursor:wait] [&&&&:disabled]:opacity-[0.52]"
                  }
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
      className={
        "settings-confirmation [&_h3]:m-0 [&_p]:text-muted grid text-center [&_>_svg]:w-[46px] [&_>_svg]:h-[46px] [&_>_svg]:text-danger [&_h3]:mt-[16px] [&_>_p]:mt-[9px] [&&&&_h3]:text-[18px] [&&&&_p]:m-[5px_0_0] [&&&&_p]:text-[12px] [&&&&_p]:leading-[1.55] [&&&&]:[justify-items:center] [&&&&]:p-[8px_10px_2px] [&&&&_>_p]:max-w-[38ch]"
      }
      aria-labelledby="clear-data-title"
    >
      <WarningCircle weight="fill" />
      <h3 className="text-base font-semibold" id="clear-data-title">
        确定清除所有本地数据？
      </h3>
      <p>
        已保存的登录凭据、本地设置、配装草稿、物品缓存和确认记录
        {__DEBUG_BUILD__ ? "，以及本次调试日志" : ""}
        都会被删除。此操作无法撤销。
      </p>
      <div className="settings-confirmation-actions flex justify-center gap-[10px] mt-[26px]">
        <button
          ref={cancelButton}
          className={
            "settings-cancel-button inline-flex justify-center items-center gap-[7px] min-h-[42px] rounded-[var(--ors-radius-control)] font-bold whitespace-nowrap [&_svg]:w-[16px] [&_svg]:h-[16px] border border-solid border-control text-ink [&:not(:disabled):hover]:border-accent [&:not(:disabled):hover]:bg-selected [&&&&]:flex-[0_0_auto] [&&&&]:p-[0_16px] [&&&&]:text-[12px] [&&&&]:[transition:transform_160ms_ease,_background-color_160ms_ease,_border-color_160ms_ease] [&&&&:disabled]:[cursor:wait] [&&&&:disabled]:opacity-[0.52] [&&&&]:[background:transparent]"
          }
          type="button"
          disabled={busy}
          onClick={onCancel}
        >
          取消
        </button>
        <button
          className={
            "settings-danger-button inline-flex justify-center items-center gap-[7px] min-h-[42px] rounded-[var(--ors-radius-control)] font-bold whitespace-nowrap border border-solid border-danger text-danger bg-surface [&:not(:disabled):hover]:bg-hover [&_svg]:w-[16px] [&_svg]:h-[16px] max-[700px]:[.settings-danger-action_&]:w-full [&&&&]:flex-[0_0_auto] [&&&&]:p-[0_16px] [&&&&]:text-[12px] [&&&&]:[transition:transform_160ms_ease,_background-color_160ms_ease,_border-color_160ms_ease] [&&&&:disabled]:[cursor:wait] [&&&&:disabled]:opacity-[0.52]"
          }
          type="button"
          disabled={busy}
          onClick={() => void onConfirm()}
        >
          {busy ? (
            <>
              <SpinnerGap
                className={
                  "spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"
                }
              />
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
        <div
          className={
            "settings-error w-full box-border mt-[20px] border-l border-solid border-danger rounded-[var(--ors-radius-control)] text-danger bg-surface text-left [&&&&]:p-[11px_13px] [&&&&]:text-[12px] [&&&&]:leading-[1.55]"
          }
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
    <div
      className={
        "settings-data-item [&_p]:text-muted flex items-start gap-[12px] [.settings-data-item_+_&]:border-t [.settings-data-item_+_&]:border-solid [.settings-data-item_+_&]:border-line [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-[30px] [&_>_span]:h-[30px] [&_>_span]:rounded-[var(--ors-radius-control)] [&_>_span]:text-accent [&_>_span]:bg-selected [&_svg]:w-[17px] [&_svg]:h-[17px] [&_strong]:text-sm [&_p]:mt-[3px] [&&&&_p]:m-[5px_0_0] [&&&&_p]:text-[12px] [&&&&_p]:leading-[1.55] [&&&&]:p-[15px_16px] [&&&&_>_span]:flex-[0_0_auto]"
      }
    >
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
