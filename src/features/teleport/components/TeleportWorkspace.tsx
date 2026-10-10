/** Composes travel selection, automatic mode, orders, and guarded confirmations. */
import { useState } from "react";
import { AuthenticationGate } from "../../auth/components/AuthenticationGate";
import {
  AirplaneTilt,
  ArrowClockwise,
  ArrowRight,
  CheckCircle,
  Clock,
  Coins,
  MapPin,
  ShieldWarning,
  SpinnerGap,
  Ticket,
  ToggleLeft,
  ToggleRight,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";

import type { TeleportWorkspaceState } from "../hooks/useTeleportWorkspace";
import { RiskDialog } from "../../../shared/components/RiskDialog";
import {
  SelectField,
  ActionDialog,
  JourneyReview,
  ReturnDialog,
} from "./TeleportDialogs";
import { AutomaticSource, AutomaticProgress } from "./AutomaticTeleport";
import { OrderHistory, OrderProgress, StatusMessages } from "./TeleportOrders";

type TeleportWorkspaceProps = {
  viewModel: TeleportWorkspaceState;
  onOpenLogin: () => void;
  onGoHome: () => void;
};

export function TeleportWorkspace({
  viewModel,
  onOpenLogin,
  onGoHome,
}: TeleportWorkspaceProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const canSubmit = Boolean(
    viewModel.selectedSourceArea &&
    viewModel.selectedSourceGroup &&
    viewModel.selectedRole &&
    viewModel.selectedTargetArea &&
    viewModel.resolvedTargetGroup &&
    viewModel.termsAccepted &&
    !viewModel.actionLoading,
  );

  if (viewModel.loginChecking || !viewModel.authenticated) {
    return (
      <AuthenticationGate
        feature="超域传送"
        description="登录后可选择角色与目标大区，提交超域传送申请。"
        checking={viewModel.loginChecking}
        onLogin={onOpenLogin}
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <main
      className={
        "teleport-page @container/teleport mx-auto w-full max-w-[1280px] min-w-0 px-5 py-5 max-[767px]:px-4 [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-2 [&_button]:rounded-lg [&_button_svg]:size-4 [&_button_svg]:shrink-0 [&_button:disabled]:cursor-not-allowed [&&&&&&&&_button]:min-h-11 [&&&&&&&&_select]:min-h-11"
      }
      id="top"
    >
      <header
        className={
          "teleport-hero flex justify-between gap-4 border-b border-solid border-line items-center [&_h1]:text-2xl [&_h1]:m-0 [&_p]:text-muted max-[700px]:items-start max-[399px]:flex-wrap [&&&&]:pb-4 [&&&&_h1]:[font-family:var(--ors-font-heading)] [&&&&_h1]:[font-weight:670] [&&&&_h1]:leading-[1.5] [&&&&_h1]:[letter-spacing:normal] [&&&&_p]:m-[18px_0_0] [&&&&_p]:text-[14px] [&&&&_p]:leading-[1.65] [@media(max-width:_767px)]:[&&&&]:pb-4"
        }
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">超域传送</h1>
        </div>
        <button
          className="teleport-refresh shrink-0 px-3 py-2 text-sm border border-solid border-control text-ink bg-surface [&:hover:not(:disabled)]:border-accent [&:hover:not(:disabled)]:bg-selected"
          type="button"
          disabled={viewModel.loading || !viewModel.authenticated}
          onClick={() => void viewModel.refresh()}
        >
          <ArrowClockwise
            className={
              viewModel.loading
                ? "spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"
                : ""
            }
          />
          刷新数据
        </button>
      </header>

      {viewModel.error && (
        <div
          className={
            "teleport-alert is-error break-words flex items-center gap-[12px] mt-4 border border-solid border-line rounded-[var(--ors-radius-control)] [&_>_svg]:w-[21px] [&_>_svg]:h-[21px] [&_>_div]:grid [&_>_div]:gap-[2px] [.curl-import-message&]:text-danger [.theme-dark_.curl-import-message&]:text-danger [.teleport-alert&]:border-danger [.teleport-alert&]:text-danger [.teleport-alert&]:bg-danger-soft [&&&&]:p-[14px_16px] [&&&&]:text-[12px] [&&&&]:leading-[1.55] [&&&&_>_svg]:flex-[0_0_auto] [&&&&]:[color:var(--ors-color-danger)]!"
          }
          role="alert"
        >
          <WarningCircle weight="fill" />
          <span>{viewModel.error}</span>
        </div>
      )}

      {viewModel.loading && !viewModel.sourceAreas.length ? (
        <TeleportSkeleton />
      ) : (
        <>
          <ServiceSummary viewModel={viewModel} />

          <section
            className={
              "teleport-mode-switch flex items-center justify-between gap-4 mt-4 border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface [&_>_div:first-child]:grid [&_>_div:first-child]:gap-[3px] [&_span]:text-muted [&_span]:text-xs [&_small]:text-muted [&_small]:text-xs [&_>_div:last-child]:flex [&_>_div:last-child]:gap-[6px] [&_>_div:last-child]:p-[4px] [&_>_div:last-child]:rounded-[var(--ors-radius-control)] [&_>_div:last-child]:bg-canvas [&_button]:inline-flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:min-h-[36px] [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-muted [&_button]:text-xs [&_button:disabled]:cursor-not-allowed [&_button_svg]:w-[17px] [&_button_svg]:h-[17px] max-[700px]:items-stretch max-[700px]:flex-col max-[700px]:[&_button]:justify-center [&&&&]:p-[17px_18px] [&&&&_strong]:text-[15px] [&&&&_button]:p-[0_13px] [&&&&_button]:[border:1px_solid_transparent] [&&&&_button]:[background:transparent] [&&&&_button]:[font-weight:730] [&&&&_button:disabled]:opacity-[0.55] [&&&&&_button[aria-pressed=true]]:border-accent [&&&&&_button[aria-pressed=true]]:bg-selected [&&&&&_button[aria-pressed=true]]:text-accent [@media(max-width:_700px)]:[&&&&_>_div:last-child]:flex-[1] [@media(max-width:_700px)]:[&&&&_button]:flex-[1]"
            }
            aria-label="传送操作模式"
          >
            <div>
              <span>操作模式</span>
              <strong>
                {viewModel.mode === "manual" ? "手动模式" : "自动模式"}
              </strong>
              <small>
                {viewModel.mode === "manual"
                  ? "通过官方接口提交，不读取游戏进程。"
                  : "读取当前角色，完成后准备目标大区连接。"}
              </small>
            </div>
            <div role="group" aria-label="选择操作模式">
              <button
                type="button"
                aria-pressed={viewModel.mode === "manual"}
                disabled={viewModel.actionLoading}
                onClick={() => viewModel.requestMode("manual")}
              >
                <ToggleLeft />
                手动
              </button>
              <button
                type="button"
                aria-pressed={viewModel.mode === "automatic"}
                disabled={viewModel.actionLoading}
                onClick={() => viewModel.requestMode("automatic")}
              >
                <ToggleRight />
                自动
              </button>
            </div>
          </section>

          <div
            className={
              "teleport-alert is-warning break-words flex items-center gap-[12px] mt-4 border border-solid border-line rounded-[var(--ors-radius-control)] [&_>_svg]:w-[21px] [&_>_svg]:h-[21px] [&_>_div]:grid [&_>_div]:gap-[2px] [.teleport-alert&]:text-warning [.teleport-alert&]:bg-warning-soft [.teleport-alert&_span]:text-warning [&&&&]:p-[14px_16px] [&&&&]:text-[12px] [&&&&]:leading-[1.55] [&&&&_>_svg]:flex-[0_0_auto] [.teleport-alert&&&&]:border-warning"
            }
            role="note"
          >
            <ShieldWarning weight="fill" />
            <div>
              <strong>
                {viewModel.mode === "manual"
                  ? "提交前请完全退出游戏客户端"
                  : "提交后桌面端可能自动登出当前角色"}
              </strong>
              <span>
                {viewModel.mode === "manual"
                  ? "传送期间重新登录可能导致角色数据异常，请等待订单完成。"
                  : "执行前会再次请求确认；订单完成前请勿重新登录。"}
              </span>
            </div>
          </div>

          {/* Available width controls the split; stretched panels keep both edges aligned. */}
          <section
            className={
              "teleport-builder grid min-w-0 grid-cols-1 items-stretch gap-5 mt-5 scroll-mt-24 @min-[900px]/teleport:grid-cols-[minmax(0,_1fr)_300px]"
            }
            id="teleport-departure"
            aria-labelledby="journey-title"
          >
            <div
              className={
                "teleport-form-panel @container/teleport-form flex min-w-0 flex-col border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface p-5 max-[519px]:p-4 [&&&&]:shadow-[none]"
              }
            >
              <div
                className={
                  "teleport-section-heading min-h-7 [&_h2]:text-lg mb-5 [&&&&_h2]:m-0 [&&&&_h2]:leading-snug [&&&&_h2]:[letter-spacing:normal]"
                }
              >
                <h2 className="text-lg font-semibold" id="journey-title">
                  选择角色与目标大区
                </h2>
              </div>

              {viewModel.mode === "manual" ? (
                <>
                  <div
                    className={
                      "teleport-field-grid grid min-w-0 grid-cols-1 gap-4 @min-[480px]/teleport-form:grid-cols-2"
                    }
                  >
                    <SelectField
                      label="当前大区"
                      value={viewModel.selectedSourceAreaId}
                      placeholder="选择角色所在大区"
                      options={viewModel.sourceAreas.map((area) => ({
                        value: area.areaId,
                        label: area.areaName,
                      }))}
                      onChange={viewModel.selectSourceArea}
                    />
                    <SelectField
                      label="当前服务器"
                      value={viewModel.selectedSourceGroupId}
                      placeholder="选择角色所在服务器"
                      disabled={!viewModel.selectedSourceArea}
                      options={(viewModel.selectedSourceArea?.groups ?? []).map(
                        (group) => ({
                          value: group.groupId,
                          label: group.groupName,
                        }),
                      )}
                      onChange={viewModel.selectSourceGroup}
                    />
                  </div>

                  <button
                    className="teleport-secondary-action self-start px-3 py-2 text-sm border border-solid border-control text-ink bg-surface [&:hover:not(:disabled)]:border-accent [&:hover:not(:disabled)]:bg-selected mt-[14px]"
                    type="button"
                    disabled={
                      !viewModel.selectedSourceArea ||
                      !viewModel.selectedSourceGroup ||
                      viewModel.selectionLoading
                    }
                    onClick={() => void viewModel.findRolesAndTargets()}
                  >
                    {viewModel.selectionLoading ? (
                      <SpinnerGap
                        className={
                          "spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"
                        }
                      />
                    ) : (
                      <UserCircle />
                    )}
                    查找角色与可用目标
                  </button>

                  {viewModel.roles.length > 0 && (
                    <fieldset
                      className={
                        "teleport-role-picker min-w-0 p-0 border-0 [&_legend]:mb-[10px] [&_legend]:text-muted [&_legend]:text-xs [&_legend]:font-bold [&_>_div]:grid [&_>_div]:gap-[10px] [&_label]:relative [&_label]:grid [&_label]:items-center [&_label]:gap-[11px] [&_label]:min-w-0 [&_label]:p-[14px] [&_label]:border [&_label]:border-solid [&_label]:border-line [&_label]:rounded-[var(--ors-radius-control)] [&_label]:bg-canvas [&_label]:cursor-pointer [&_label:has(input:checked)]:border-accent [&_label:has(input:checked)]:bg-selected [&_input]:absolute [&_label_>_svg:first-of-type]:w-[29px] [&_label_>_svg:first-of-type]:h-[29px] [&_label_>_svg:first-of-type]:text-accent [&_label_>_svg:last-child]:w-[18px] [&_label_>_svg:last-child]:h-[18px] [&_label:has(input:checked)_>_svg:last-child]:text-accent [&_label_>_span]:grid [&_label_>_span]:min-w-0 [&_label_>_span]:gap-[4px] [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&_small]:overflow-hidden [&_small]:whitespace-nowrap [&_strong]:text-sm [&_small]:text-muted [&_small]:text-xs [&&&&]:mt-5 [&&&&_>_div]:grid-cols-1 @min-[480px]/teleport-form:[&&&&_>_div]:grid-cols-2 [&&&&_label]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&_input]:opacity-[0] [&&&&_label_>_svg:last-child]:text-transparent [&&&&_label:has(input:checked)_>_svg:last-child]:text-accent [&_label:focus-within]:outline-2 [&_label:focus-within]:outline-offset-2 [&_label:focus-within]:outline-accent [&&&&_strong]:[text-overflow:ellipsis] [&&&&_small]:[text-overflow:ellipsis] [&&&&_small]:[font-family:var(--ors-font-ui)]"
                      }
                    >
                      <legend>选择角色</legend>
                      <div>
                        {viewModel.roles.map((role) => (
                          <label key={role.roleId}>
                            <input
                              type="radio"
                              name="teleport-role"
                              checked={viewModel.selectedRoleId === role.roleId}
                              onChange={() =>
                                viewModel.setSelectedRoleId(role.roleId)
                              }
                            />
                            <UserCircle weight="duotone" />
                            <span>
                              <strong>{role.roleName}</strong>
                              <small>{role.roleId}</small>
                            </span>
                            <CheckCircle weight="fill" />
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {viewModel.roles.length === 0 &&
                    viewModel.targetAreas.length > 0 && (
                      <div
                        className={
                          "teleport-inline-empty mt-[20px] p-[14px] rounded-[var(--ors-radius-control)] text-muted bg-canvas [&&&&]:text-[12px]"
                        }
                      >
                        当前服务器没有可用于超域传送的角色。
                      </div>
                    )}
                </>
              ) : (
                <AutomaticSource viewModel={viewModel} />
              )}

              {viewModel.targetAreas.length > 0 && (
                <div className="teleport-target-fields mt-6 pt-6 border-t border-solid border-line">
                  <div
                    className={
                      "teleport-field-grid grid min-w-0 grid-cols-1 gap-4 @min-[480px]/teleport-form:grid-cols-2"
                    }
                  >
                    <SelectField
                      label="目标大区"
                      value={viewModel.selectedTargetAreaId}
                      placeholder="选择目标大区"
                      options={viewModel.targetAreas.map((area) => ({
                        value: area.areaId,
                        label: `${area.areaName}${area.state === 0 ? "（暂不可用）" : ""}`,
                        disabled: area.state === 0,
                      }))}
                      onChange={viewModel.selectTargetArea}
                    />
                    <SelectField
                      label="目标服务器（可选）"
                      value={viewModel.selectedTargetGroupId}
                      placeholder="自动选择大区内服务器"
                      disabled={!viewModel.selectedTargetArea}
                      options={(viewModel.selectedTargetArea?.groups ?? []).map(
                        (group) => ({
                          value: group.groupId,
                          label: group.groupName,
                        }),
                      )}
                      onChange={(value) =>
                        void viewModel.selectTargetGroup(value)
                      }
                    />
                  </div>
                  {viewModel.selectedTargetGroup && (
                    <div className="teleport-queue-note flex items-center gap-[7px] mt-[11px] text-muted text-xs [&_svg]:w-[16px] [&_svg]:h-[16px] [&_svg]:text-accent">
                      <Clock />
                      {viewModel.queueMinutes === null
                        ? "当前排队时间暂无法估算"
                        : `预计等待约 ${roundQueueMinutes(viewModel.queueMinutes)} 分钟`}
                    </div>
                  )}
                </div>
              )}

              <label
                className={
                  "teleport-terms flex min-h-11 items-center gap-2.5 mt-auto pt-5 text-muted cursor-pointer [&_input]:w-[17px] [&_input]:h-[17px] [&&&&]:text-[12px] [&&&&]:leading-[1.55] [&&&&_input]:flex-[0_0_auto] [&&&&_input]:m-[1px_0_0] [&&&&_input]:[accent-color:var(--ors-color-accent)]"
                }
              >
                <input
                  type="checkbox"
                  checked={viewModel.termsAccepted}
                  onChange={(event) =>
                    viewModel.setTermsAccepted(event.target.checked)
                  }
                />
                <span>
                  {viewModel.mode === "manual"
                    ? "我已退出游戏，并确认角色不在跨界或超域旅行状态中。"
                    : "我确认角色当前不在跨界或超域旅行状态中。"}
                </span>
              </label>

              <button
                className={
                  "teleport-primary-action w-full mt-4 border border-accent bg-accent px-4 py-3 text-sm font-semibold text-on-accent enabled:hover:bg-accent-hover disabled:border-line disabled:bg-hover disabled:text-muted"
                }
                type="button"
                disabled={!canSubmit}
                onClick={() => setReviewOpen(true)}
              >
                <AirplaneTilt weight="fill" />
                核对并提交
              </button>
            </div>

            <JourneyRoute viewModel={viewModel} />
          </section>

          <OrderHistory viewModel={viewModel} />
        </>
      )}

      {reviewOpen && (
        <ActionDialog
          title="确认本次超域传送"
          onClose={() => setReviewOpen(false)}
          actions={
            <>
              <button type="button" onClick={() => setReviewOpen(false)}>
                返回修改
              </button>
              <button
                className="is-primary [.teleport-dialog_>_footer_button&]:border-accent [.teleport-dialog_>_footer_button&]:text-on-accent [.teleport-dialog_>_footer_button&]:bg-accent [.theme-dark_.teleport-dialog_>_footer_button&]:text-canvas"
                type="button"
                disabled={viewModel.actionLoading}
                onClick={() => {
                  setReviewOpen(false);
                  void viewModel.submitTravel();
                }}
              >
                确认提交
              </button>
            </>
          }
        >
          <JourneyReview viewModel={viewModel} />
          <div className="dialog-warning flex items-center gap-[8px] mt-[15px] text-danger text-xs font-bold [&_svg]:w-[18px] [&_svg]:h-[18px]">
            <WarningCircle weight="fill" />
            {viewModel.mode === "manual"
              ? "请再次确认游戏客户端已经完全退出。"
              : "提交后将检查游戏状态；如需登出，会再次请求确认。"}
          </div>
        </ActionDialog>
      )}

      {viewModel.activeOrderId && !viewModel.orderConfirmationRequired && (
        <OrderProgress viewModel={viewModel} />
      )}

      {viewModel.orderConfirmationRequired && (
        <ActionDialog
          title="官方预检已完成"
          actions={
            <>
              <button
                type="button"
                disabled={viewModel.actionLoading}
                onClick={() => void viewModel.resolveOrderConfirmation(false)}
              >
                放弃传送
              </button>
              <button
                className="is-primary [.teleport-dialog_>_footer_button&]:border-accent [.teleport-dialog_>_footer_button&]:text-on-accent [.teleport-dialog_>_footer_button&]:bg-accent [.theme-dark_.teleport-dialog_>_footer_button&]:text-canvas"
                type="button"
                disabled={viewModel.actionLoading}
                onClick={() => void viewModel.resolveOrderConfirmation(true)}
              >
                确认传送
              </button>
            </>
          }
        >
          <p>官方接口要求在角色预检后再次确认，请检查以下结果。</p>
          <StatusMessages status={viewModel.activeOrderStatus} />
        </ActionDialog>
      )}

      {viewModel.returnOrder && <ReturnDialog viewModel={viewModel} />}

      {viewModel.automaticRiskOpen && (
        <RiskDialog
          title="自动模式会操作游戏客户端"
          items={[
            "自动模式会向当前 FF14 进程注入组件，用于读取角色状态、退出当前角色并准备目标大区连接。",
            "进程注入可能被视为使用外部辅助程序，使用后果由你自行承担。",
            "提交前会显示角色和目标大区，退出游戏前还会再次确认。",
          ]}
          description={<p>不接受上述风险时，请使用手动模式。</p>}
          confirmLabel="确认使用自动模式"
          onConfirm={viewModel.confirmAutomaticRisk}
          onCancel={viewModel.cancelAutomaticRisk}
        />
      )}

      {viewModel.logoutConfirmationRequired && (
        <ActionDialog
          title="需要退出当前游戏角色"
          onClose={() => void viewModel.resolveLogoutConfirmation(false)}
          actions={
            <>
              <button
                type="button"
                onClick={() => void viewModel.resolveLogoutConfirmation(false)}
              >
                取消
              </button>
              <button
                className="is-primary [.teleport-dialog_>_footer_button&]:border-accent [.teleport-dialog_>_footer_button&]:text-on-accent [.teleport-dialog_>_footer_button&]:bg-accent [.theme-dark_.teleport-dialog_>_footer_button&]:text-canvas"
                type="button"
                onClick={() => void viewModel.resolveLogoutConfirmation(true)}
              >
                确认并退出到标题画面
              </button>
            </>
          }
        >
          <p>已读取并核对当前角色。继续操作将自动退出登录并等待标题画面。</p>
          <div className="dialog-warning flex items-center gap-[8px] mt-[15px] text-danger text-xs font-bold [&_svg]:w-[18px] [&_svg]:h-[18px]">
            <WarningCircle weight="fill" />
            若角色处于战斗、任务或过场等无法登出的状态，本次操作会停止并提示错误。
          </div>
        </ActionDialog>
      )}

      {viewModel.completionMessage && (
        <ActionDialog
          title="超域传送已完成"
          onClose={viewModel.dismissCompletion}
          actions={
            <button
              className="is-primary [.teleport-dialog_>_footer_button&]:border-accent [.teleport-dialog_>_footer_button&]:text-on-accent [.teleport-dialog_>_footer_button&]:bg-accent [.theme-dark_.teleport-dialog_>_footer_button&]:text-canvas"
              type="button"
              onClick={viewModel.dismissCompletion}
            >
              知道了
            </button>
          }
        >
          <p>{viewModel.completionMessage}</p>
        </ActionDialog>
      )}

      {viewModel.mode === "automatic" &&
        viewModel.actionLoading &&
        !viewModel.activeOrderId &&
        !viewModel.logoutConfirmationRequired && (
          <AutomaticProgress stage={viewModel.automaticStage} />
        )}
    </main>
  );
}

function ServiceSummary({ viewModel }: { viewModel: TeleportWorkspaceState }) {
  // A failed initial request must not turn defaults into apparent account data.
  const unavailable = Boolean(viewModel.error && !viewModel.sourceAreas.length);
  return (
    <dl
      className={
        "teleport-summary grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line mt-5 @min-[860px]/teleport:grid-cols-4 [&_>_div]:grid [&_>_div]:min-w-0 [&_>_div]:grid-cols-[20px_minmax(0,_1fr)] [&_>_div]:gap-x-2 [&_>_div]:bg-surface [&_>_div]:p-3 [&_svg]:row-span-2 [&_svg]:size-5 [&_svg]:self-center [&_svg]:text-accent [&_dt]:text-xs [&_dt]:text-muted [&_dd]:m-0 [&_dd]:mt-1 [&_dd]:text-base [&_dd]:font-semibold [&_dd]:tabular-nums"
      }
    >
      <div>
        <Coins />
        <dt>账户余额</dt>
        <dd>
          {unavailable ? "\u2014" : viewModel.balance.toLocaleString("zh-CN")}
        </dd>
      </div>
      <div>
        <Clock />
        <dt>基础间隔</dt>
        <dd>
          {unavailable ? "\u2014" : `${viewModel.serviceLimitDays} \u5929`}
        </dd>
      </div>
      <div>
        <Ticket />
        <dt>当前限制</dt>
        <dd>{unavailable ? "\u2014" : viewModel.migrationLimitDays || "无"}</dd>
      </div>
      <div>
        <MapPin />
        <dt>可选大区</dt>
        <dd>{unavailable ? "\u2014" : viewModel.sourceAreas.length}</dd>
      </div>
    </dl>
  );
}

function JourneyRoute({ viewModel }: { viewModel: TeleportWorkspaceState }) {
  return (
    <aside
      className={
        "journey-route border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface flex min-w-0 flex-col overflow-hidden p-5 max-[519px]:p-4 [&_>_p]:text-muted [&_>_p]:text-xs [&_>_p]:pt-[18px] [&_>_p]:border-t [&_>_p]:border-solid [&_>_p]:border-line [&&&&]:shadow-[none] [&&&&_>_p]:m-0 [&&&&_>_p]:mt-auto [&&&&_>_p]:leading-[1.6]"
      }
      aria-label="传送路线预览"
    >
      <div
        className={
          "route-caption flex min-h-7 items-center justify-between mb-5 text-ink [&_h2]:m-0 [&_h2]:text-lg [&_h2]:leading-snug [&_h2]:font-semibold [&_svg]:w-[28px] [&_svg]:h-[28px] [&_svg]:text-accent [&&&&]:[font-weight:720]"
        }
      >
        <h2>路线预览</h2>
        <AirplaneTilt weight="duotone" />
      </div>
      <div
        className={
          "route-stop is-source relative grid gap-[14px] [&_>_div]:grid [&_>_div]:gap-[4px] [&_small]:text-muted [&_small]:text-xs [&_span]:text-muted [&_span]:text-xs [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&&&&]:grid-cols-[auto_minmax(0,_1fr)] [&&&&_strong]:text-[18px] [&&&&_strong]:[text-overflow:ellipsis]"
        }
      >
        <span
          className={
            "route-marker block w-[15px] h-[15px] mt-[4px] bg-accent text-on-accent [&&&&]:[border:4px_solid_var(--ors-color-surface)] [&&&&]:rounded-[50%] [&&&&]:shadow-[none]"
          }
        />
        <div>
          <small>当前服务器</small>
          <strong>
            {viewModel.selectedSourceGroup?.groupName ?? "尚未选择"}
          </strong>
          <span>
            {viewModel.selectedSourceArea?.areaName ?? "选择出发大区"}
          </span>
        </div>
      </div>
      <div
        className={
          'route-line relative flex items-center gap-[8px] min-h-[88px] ml-[7px] pl-[27px] text-accent [&::before]:absolute [&_svg]:w-[18px] [&_svg]:h-[18px] [&_span]:text-muted [&_span]:text-xs [&&&&::before]:[content:""] [&&&&::before]:top-[0] [&&&&::before]:bottom-[0] [&&&&::before]:left-[0] [&&&&::before]:[border-left:1px_dashed_var(--ors-color-accent)]'
        }
      >
        <ArrowRight />
        <span>{viewModel.selectedRole?.roleName ?? "等待角色"}</span>
      </div>
      <div
        className={
          "route-stop is-target relative grid gap-[14px] pb-7 [&_>_div]:grid [&_>_div]:gap-[4px] [&_small]:text-muted [&_small]:text-xs [&_span]:text-muted [&_span]:text-xs [&_strong]:overflow-hidden [&_strong]:whitespace-nowrap [&&&&]:grid-cols-[auto_minmax(0,_1fr)] [&&&&_strong]:text-[18px] [&&&&_strong]:[text-overflow:ellipsis]"
        }
      >
        <span
          className={
            "route-marker block w-[15px] h-[15px] mt-[4px] bg-accent text-on-accent [&&&&]:[border:4px_solid_var(--ors-color-surface)] [&&&&]:rounded-[50%] [&&&&]:shadow-[none]"
          }
        />
        <div>
          <small>目标服务器</small>
          <strong>
            {viewModel.selectedTargetGroup?.groupName ??
              (viewModel.selectedTargetArea ? "系统自动选择" : "尚未选择")}
          </strong>
          <span>
            {viewModel.selectedTargetArea?.areaName ?? "选择目标大区"}
          </span>
        </div>
      </div>
      <p>目标服务器状态和排队时间均来自本次实时请求。</p>
    </aside>
  );
}

function TeleportSkeleton() {
  return (
    <div
      className={
        "teleport-skeleton grid gap-[14px] mt-[30px] [&_div]:h-[96px] [&_div]:rounded-[var(--ors-radius-control)] [&_div:last-child]:h-[420px] [&&&&]:grid-cols-2 @min-[860px]/teleport:[&&&&]:grid-cols-4 [&&&&_div]:[background:linear-gradient(_100deg,_var(--ors-color-hover)_20%,_var(--ors-color-surface)_44%,_var(--ors-color-hover)_68%_)] [&&&&_div]:[background-size:200%_100%] [&&&&_div:last-child]:[grid-column:1_/_-1] [@media(prefers-reduced-motion:_no-preference)]:[&&&&_div]:animate-[teleport-shimmer_1.5s_ease-in-out_infinite]"
      }
      aria-label="正在读取超域传送数据"
    >
      <div />
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}

function roundQueueMinutes(minutes: number) {
  return Math.max(30, (Math.floor(minutes / 30) + 1) * 30);
}
