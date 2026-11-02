/** Composes travel selection, automatic mode, orders, and guarded confirmations. */

import { teleportControlClasses } from "../utilityClasses";
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

/** Complete utility strings are shared without adding component CSS rules. */
const spinClasses =
  "spin h-4 w-4 shrink-0 animate-[login-spin_900ms_linear_infinite]";
const teleportHeaderGroupClasses =
  "first:grid first:gap-[3px] last:flex last:gap-1.5 last:rounded-control last:bg-canvas last:p-1 max-[700px]:last:flex-1";
const teleportTabClasses =
  "inline-flex min-h-9 items-center justify-center gap-[7px] rounded-control bg-transparent px-[13px] py-0 text-xs font-[730] text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] [border:1px_solid_transparent] disabled:cursor-not-allowed disabled:opacity-55 aria-pressed:border-accent aria-pressed:bg-selected aria-pressed:text-accent max-[700px]:flex-1 max-[700px]:justify-center";
const teleportCharacterIconClasses =
  "last:h-4.5 last:w-4.5 last:text-transparent first-of-type:h-[29px] first-of-type:w-[29px] first-of-type:text-accent";
const teleportDialogActionClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-4 py-0 text-[12px] font-[720] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] max-[700px]:w-full";
const isPrimaryClasses =
  "is-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-4 py-0 text-[12px] font-[720] text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] max-[700px]:w-full dark:text-canvas";

/** Reused presentation strings stay static and are allocated once for this module. */

const teleportFieldGridClasses =
  "teleport-field-grid grid min-w-0 grid-cols-1 gap-4 @min-[480px]/teleport-form:grid-cols-2";
const teleportDialogWarningClasses =
  "dialog-warning mt-[15px] flex items-center gap-2 text-xs font-bold text-danger";
const teleportDialogCopyClasses =
  "mx-0 mt-0 mb-4.5 text-[12px] leading-[1.6] text-muted";
const teleportFactCardClasses =
  "grid min-w-0 grid-cols-[20px_minmax(0,_1fr)] gap-x-2 bg-surface p-3";
const teleportFactIconClasses = "row-span-2 size-5 self-center text-accent";
const teleportFactValueClasses =
  "m-0 mt-1 text-base font-semibold tabular-nums";
const teleportRouteMarkerClasses =
  "route-marker mt-1 block h-[15px] w-[15px] rounded-[50%] bg-accent text-xs text-muted shadow-[none] [border:4px_solid_var(--ors-color-surface)]";
const teleportRouteNameClasses =
  "overflow-hidden text-[18px] text-ellipsis whitespace-nowrap";
const teleportSkeletonClasses =
  "h-24 rounded-control bg-[linear-gradient(_100deg,_var(--ors-color-hover)_20%,_var(--ors-color-surface)_44%,_var(--ors-color-hover)_68%_)] [background-size:200%_100%] last:col-span-full last:h-105";

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
      className="teleport-page @container/teleport mx-auto w-full max-w-320 min-w-0 px-5 py-5 max-[767px]:px-4"
      id="top"
    >
      <header className="teleport-hero flex items-center justify-between gap-4 border-b border-solid border-line pb-4 max-[767px]:pb-4 max-[700px]:items-start max-[399px]:flex-wrap">
        <div>
          <h1 className="m-0 [font-family:var(--ors-font-heading)] text-2xl leading-[1.5] font-[670] tracking-normal">
            超域传送
          </h1>
        </div>
        <button
          className="teleport-refresh inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-3 py-2 text-sm text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:border-accent enabled:hover:bg-selected"
          type="button"
          disabled={viewModel.loading || !viewModel.authenticated}
          onClick={() => void viewModel.refresh()}
        >
          <ArrowClockwise
            className={viewModel.loading ? spinClasses : "h-4 w-4 shrink-0"}
          />
          刷新数据
        </button>
      </header>

      {viewModel.error && (
        <div
          className="teleport-alert is-error mt-4 flex items-center gap-3 rounded-control border border-solid border-danger bg-danger-soft px-4 py-3.5 text-[12px] leading-[1.55] break-words text-danger"
          role="alert"
        >
          <WarningCircle className="h-[21px] w-[21px] shrink-0" weight="fill" />
          <span>{viewModel.error}</span>
        </div>
      )}

      {viewModel.loading && !viewModel.sourceAreas.length ? (
        <TeleportSkeleton />
      ) : (
        <>
          <ServiceSummary viewModel={viewModel} />

          <section
            className="teleport-mode-switch mt-4 flex items-center justify-between gap-4 rounded-control border border-solid border-line bg-surface px-4.5 py-[17px] max-[700px]:flex-col max-[700px]:items-stretch"
            aria-label="传送操作模式"
          >
            <div className={teleportHeaderGroupClasses}>
              <span className="text-xs text-muted">操作模式</span>
              <strong className="text-[15px]">
                {viewModel.mode === "manual" ? "手动模式" : "自动模式"}
              </strong>
              <small className="text-xs text-muted">
                {viewModel.mode === "manual"
                  ? "通过官方接口提交，不读取游戏进程。"
                  : "读取当前角色，完成后准备目标大区连接。"}
              </small>
            </div>
            <div
              className={teleportHeaderGroupClasses}
              role="group"
              aria-label="选择操作模式"
            >
              <button
                className={teleportTabClasses}
                type="button"
                aria-pressed={viewModel.mode === "manual"}
                disabled={viewModel.actionLoading}
                onClick={() => viewModel.requestMode("manual")}
              >
                <ToggleLeft className="h-[17px] w-[17px] shrink-0" />
                手动
              </button>
              <button
                className={teleportTabClasses}
                type="button"
                aria-pressed={viewModel.mode === "automatic"}
                disabled={viewModel.actionLoading}
                onClick={() => viewModel.requestMode("automatic")}
              >
                <ToggleRight className="h-[17px] w-[17px] shrink-0" />
                自动
              </button>
            </div>
          </section>

          <div
            className="teleport-alert is-warning mt-4 flex items-center gap-3 rounded-control border border-solid border-warning bg-warning-soft px-4 py-3.5 text-[12px] leading-[1.55] break-words text-warning"
            role="note"
          >
            <ShieldWarning
              className="h-[21px] w-[21px] shrink-0"
              weight="fill"
            />
            <div className="grid gap-0.5">
              <strong>
                {viewModel.mode === "manual"
                  ? "提交前请完全退出游戏客户端"
                  : "提交后桌面端可能自动登出当前角色"}
              </strong>
              <span className="text-warning">
                {viewModel.mode === "manual"
                  ? "传送期间重新登录可能导致角色数据异常，请等待订单完成。"
                  : "执行前会再次请求确认；订单完成前请勿重新登录。"}
              </span>
            </div>
          </div>

          {/* Available width controls the split; stretched panels keep both edges aligned. */}
          <section
            className="teleport-builder mt-5 grid min-w-0 scroll-mt-24 grid-cols-1 items-stretch gap-5 @min-[900px]/teleport:grid-cols-[minmax(0,_1fr)_300px]"
            id="teleport-departure"
            aria-labelledby="journey-title"
          >
            <div className="teleport-form-panel @container/teleport-form flex min-w-0 flex-col rounded-control border border-solid border-line bg-surface p-5 shadow-[none] max-[519px]:p-4">
              <div className="teleport-section-heading mb-5 min-h-7">
                <h2
                  className="m-0 text-lg leading-snug font-semibold tracking-normal"
                  id="journey-title"
                >
                  选择角色与目标大区
                </h2>
              </div>

              {viewModel.mode === "manual" ? (
                <>
                  <div className={teleportFieldGridClasses}>
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
                    className="teleport-secondary-action mt-3.5 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-control border border-solid border-control bg-surface px-3 py-2 text-sm text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:border-accent enabled:hover:bg-selected"
                    type="button"
                    disabled={
                      !viewModel.selectedSourceArea ||
                      !viewModel.selectedSourceGroup ||
                      viewModel.selectionLoading
                    }
                    onClick={() => void viewModel.findRolesAndTargets()}
                  >
                    {viewModel.selectionLoading ? (
                      <SpinnerGap className={spinClasses} />
                    ) : (
                      <UserCircle className={teleportControlClasses.icon} />
                    )}
                    查找角色与可用目标
                  </button>

                  {viewModel.roles.length > 0 && (
                    <fieldset className="teleport-role-picker mt-5 min-w-0 border-0 p-0">
                      <legend className="mb-2.5 text-xs font-bold text-muted">
                        选择角色
                      </legend>
                      <div className="grid grid-cols-1 gap-2.5 @min-[480px]/teleport-form:grid-cols-2">
                        {viewModel.roles.map((role) => (
                          <label
                            className="relative grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-[11px] rounded-control border border-solid border-line bg-canvas p-3.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent has-checked:border-accent has-checked:bg-selected"
                            key={role.roleId}
                          >
                            <input
                              className="absolute h-4 w-4 opacity-[0]"
                              type="radio"
                              name="teleport-role"
                              checked={viewModel.selectedRoleId === role.roleId}
                              onChange={() =>
                                viewModel.setSelectedRoleId(role.roleId)
                              }
                            />
                            <UserCircle
                              className={teleportCharacterIconClasses}
                              weight="duotone"
                            />
                            <span className="grid min-w-0 gap-1">
                              <strong className="overflow-hidden text-sm text-ellipsis whitespace-nowrap">
                                {role.roleName}
                              </strong>
                              <small className="overflow-hidden font-sans text-xs text-ellipsis whitespace-nowrap text-muted">
                                {role.roleId}
                              </small>
                            </span>
                            <CheckCircle
                              className={teleportCharacterIconClasses}
                              weight="fill"
                            />
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {viewModel.roles.length === 0 &&
                    viewModel.targetAreas.length > 0 && (
                      <div className="teleport-inline-empty mt-5 rounded-control bg-canvas p-3.5 text-[12px] text-muted">
                        当前服务器没有可用于超域传送的角色。
                      </div>
                    )}
                </>
              ) : (
                <AutomaticSource viewModel={viewModel} />
              )}

              {viewModel.targetAreas.length > 0 && (
                <div className="teleport-target-fields mt-6 border-t border-solid border-line pt-6">
                  <div className={teleportFieldGridClasses}>
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
                    <div className="teleport-queue-note mt-[11px] flex items-center gap-[7px] text-xs text-muted">
                      <Clock className="h-4 w-4 text-accent" />
                      {viewModel.queueMinutes === null
                        ? "当前排队时间暂无法估算"
                        : `预计等待约 ${roundQueueMinutes(viewModel.queueMinutes)} 分钟`}
                    </div>
                  )}
                </div>
              )}

              <label className="teleport-terms mt-auto flex min-h-11 cursor-pointer items-center gap-2.5 pt-5 text-[12px] leading-[1.55] text-muted">
                <input
                  className="mx-0 mt-[1px] mb-0 h-[17px] w-[17px] shrink-0 [accent-color:var(--ors-color-accent)]"
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
                className="teleport-primary-action mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-accent bg-accent px-4 py-3 text-sm font-semibold text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover disabled:border-line disabled:bg-hover disabled:text-muted"
                type="button"
                disabled={!canSubmit}
                onClick={() => setReviewOpen(true)}
              >
                <AirplaneTilt
                  className={teleportControlClasses.icon}
                  weight="fill"
                />
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
              <button
                className={teleportDialogActionClasses}
                type="button"
                onClick={() => setReviewOpen(false)}
              >
                返回修改
              </button>
              <button
                className={isPrimaryClasses}
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
          <div className={teleportDialogWarningClasses}>
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
                className={teleportDialogActionClasses}
                type="button"
                disabled={viewModel.actionLoading}
                onClick={() => void viewModel.resolveOrderConfirmation(false)}
              >
                放弃传送
              </button>
              <button
                className={isPrimaryClasses}
                type="button"
                disabled={viewModel.actionLoading}
                onClick={() => void viewModel.resolveOrderConfirmation(true)}
              >
                确认传送
              </button>
            </>
          }
        >
          <p className={teleportDialogCopyClasses}>
            官方接口要求在角色预检后再次确认，请检查以下结果。
          </p>
          <StatusMessages
            status={viewModel.activeOrderStatus}
            layout="dialog-body"
          />
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
          description={
            <p className="m-0">不接受上述风险时，请使用手动模式。</p>
          }
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
                className={teleportDialogActionClasses}
                type="button"
                onClick={() => void viewModel.resolveLogoutConfirmation(false)}
              >
                取消
              </button>
              <button
                className={isPrimaryClasses}
                type="button"
                onClick={() => void viewModel.resolveLogoutConfirmation(true)}
              >
                确认并退出到标题画面
              </button>
            </>
          }
        >
          <p className={teleportDialogCopyClasses}>
            已读取并核对当前角色。继续操作将自动退出登录并等待标题画面。
          </p>
          <div className={teleportDialogWarningClasses}>
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
              className={isPrimaryClasses}
              type="button"
              onClick={viewModel.dismissCompletion}
            >
              知道了
            </button>
          }
        >
          <p className={teleportDialogCopyClasses}>
            {viewModel.completionMessage}
          </p>
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
    <dl className="teleport-summary mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-control border border-line bg-line @min-[860px]/teleport:grid-cols-4">
      <div className={teleportFactCardClasses}>
        <Coins className={teleportFactIconClasses} />
        <dt className="text-xs text-muted">账户余额</dt>
        <dd className={teleportFactValueClasses}>
          {unavailable ? "\u2014" : viewModel.balance.toLocaleString("zh-CN")}
        </dd>
      </div>
      <div className={teleportFactCardClasses}>
        <Clock className={teleportFactIconClasses} />
        <dt className="text-xs text-muted">基础间隔</dt>
        <dd className={teleportFactValueClasses}>
          {unavailable ? "\u2014" : `${viewModel.serviceLimitDays} \u5929`}
        </dd>
      </div>
      <div className={teleportFactCardClasses}>
        <Ticket className={teleportFactIconClasses} />
        <dt className="text-xs text-muted">当前限制</dt>
        <dd className={teleportFactValueClasses}>
          {unavailable ? "\u2014" : viewModel.migrationLimitDays || "无"}
        </dd>
      </div>
      <div className={teleportFactCardClasses}>
        <MapPin className={teleportFactIconClasses} />
        <dt className="text-xs text-muted">可选大区</dt>
        <dd className={teleportFactValueClasses}>
          {unavailable ? "\u2014" : viewModel.sourceAreas.length}
        </dd>
      </div>
    </dl>
  );
}
function JourneyRoute({ viewModel }: { viewModel: TeleportWorkspaceState }) {
  return (
    <aside
      className="journey-route flex min-w-0 flex-col overflow-hidden rounded-control border border-solid border-line bg-surface p-5 shadow-[none] max-[519px]:p-4"
      aria-label="传送路线预览"
    >
      <div className="route-caption mb-5 flex min-h-7 items-center justify-between font-[720] text-ink">
        <h2 className="m-0 text-lg leading-snug font-semibold">路线预览</h2>
        <AirplaneTilt className="h-7 w-7 text-accent" weight="duotone" />
      </div>
      <div className="route-stop is-source relative grid grid-cols-[auto_minmax(0,_1fr)] gap-3.5">
        <span className={teleportRouteMarkerClasses} />
        <div className="grid gap-1">
          <small className="text-xs text-muted">当前服务器</small>
          <strong className={teleportRouteNameClasses}>
            {viewModel.selectedSourceGroup?.groupName ?? "尚未选择"}
          </strong>
          <span className="text-xs text-muted">
            {viewModel.selectedSourceArea?.areaName ?? "选择出发大区"}
          </span>
        </div>
      </div>
      <div
        className={
          'route-line relative ml-[7px] flex min-h-22 items-center gap-2 pl-[27px] text-accent before:absolute before:top-0 before:bottom-0 before:left-0 before:[content:""] before:[border-left:1px_dashed_var(--ors-color-accent)]'
        }
      >
        <ArrowRight className="h-4.5 w-4.5" />
        <span className="text-xs text-muted">
          {viewModel.selectedRole?.roleName ?? "等待角色"}
        </span>
      </div>
      <div className="route-stop is-target relative grid grid-cols-[auto_minmax(0,_1fr)] gap-3.5 pb-7">
        <span className={teleportRouteMarkerClasses} />
        <div className="grid gap-1">
          <small className="text-xs text-muted">目标服务器</small>
          <strong className={teleportRouteNameClasses}>
            {viewModel.selectedTargetGroup?.groupName ??
              (viewModel.selectedTargetArea ? "系统自动选择" : "尚未选择")}
          </strong>
          <span className="text-xs text-muted">
            {viewModel.selectedTargetArea?.areaName ?? "选择目标大区"}
          </span>
        </div>
      </div>
      <p className="m-0 mt-auto border-t border-solid border-line pt-4.5 text-xs leading-[1.6] text-muted">
        目标服务器状态和排队时间均来自本次实时请求。
      </p>
    </aside>
  );
}
function TeleportSkeleton() {
  return (
    <div
      className="teleport-skeleton mt-7.5 grid grid-cols-2 gap-3.5 @min-[860px]/teleport:grid-cols-4"
      aria-label="正在读取超域传送数据"
    >
      <div className={teleportSkeletonClasses} />
      <div className={teleportSkeletonClasses} />
      <div className={teleportSkeletonClasses} />
      <div className={teleportSkeletonClasses} />
      <div className={teleportSkeletonClasses} />
    </div>
  );
}
function roundQueueMinutes(minutes: number) {
  return Math.max(30, (Math.floor(minutes / 30) + 1) * 30);
}
