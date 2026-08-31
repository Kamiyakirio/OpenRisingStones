/** Official Regional Teleport workspace with guarded departure and return actions. */
import { useState } from "react";
import {
  AirplaneTilt,
  ArrowClockwise,
  ArrowRight,
  ArrowUUpLeft,
  CheckCircle,
  Clock,
  Coins,
  DeviceMobile,
  MapPin,
  QrCode,
  ShieldWarning,
  SpinnerGap,
  Ticket,
  UserCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { TeleportOrder } from "../models/teleport";
import type { TeleportWorkspaceViewModel } from "../viewmodels/useTeleportWorkspaceViewModel";
import "./TeleportPage.css";

type TeleportPageProps = {
  viewModel: TeleportWorkspaceViewModel;
  onOpenLogin: () => void;
};

export function TeleportPage({ viewModel, onOpenLogin }: TeleportPageProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const canSubmit = Boolean(
    viewModel.selectedSourceArea &&
    viewModel.selectedSourceGroup &&
    viewModel.selectedRole &&
    viewModel.selectedTargetArea &&
    viewModel.selectedTargetGroup &&
    viewModel.termsAccepted &&
    !viewModel.actionLoading,
  );

  return (
    <main className="teleport-page" id="top">
      <header className="teleport-hero">
        <div>
          <span className="teleport-kicker">盛趣官方服务</span>
          <h1>超域传送</h1>
          <p>选择角色与目标服务器，直接提交至官方超域传送接口。</p>
        </div>
        <button
          className="teleport-refresh"
          type="button"
          disabled={viewModel.loading || !viewModel.authenticated}
          onClick={() => void viewModel.refresh()}
        >
          <ArrowClockwise className={viewModel.loading ? "spin" : ""} />
          刷新数据
        </button>
      </header>

      {viewModel.error && (
        <div className="teleport-alert is-error" role="alert">
          <WarningCircle weight="fill" />
          <span>{viewModel.error}</span>
        </div>
      )}

      {viewModel.loginChecking ? (
        <TeleportSkeleton />
      ) : !viewModel.authenticated ? (
        <AccountGate onOpenLogin={onOpenLogin} />
      ) : viewModel.crossAuthenticationRequired ? (
        <CrossAuthenticationGate viewModel={viewModel} />
      ) : viewModel.loading && !viewModel.sourceAreas.length ? (
        <TeleportSkeleton />
      ) : (
        <>
          <ServiceSummary viewModel={viewModel} />

          <div className="teleport-alert is-warning" role="note">
            <ShieldWarning weight="fill" />
            <div>
              <strong>提交前请完全退出游戏客户端</strong>
              <span>
                传送期间重新登录可能导致角色数据异常，请等待订单完成。
              </span>
            </div>
          </div>

          <section
            className="teleport-builder"
            id="teleport-departure"
            aria-labelledby="journey-title"
          >
            <div className="teleport-form-panel">
              <div className="teleport-section-heading">
                <span>出发设置</span>
                <h2 id="journey-title">安排本次旅程</h2>
              </div>

              <div className="teleport-field-grid">
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
                className="teleport-secondary-action"
                type="button"
                disabled={
                  !viewModel.selectedSourceArea ||
                  !viewModel.selectedSourceGroup ||
                  viewModel.selectionLoading
                }
                onClick={() => void viewModel.findRolesAndTargets()}
              >
                {viewModel.selectionLoading ? (
                  <SpinnerGap className="spin" />
                ) : (
                  <UserCircle />
                )}
                查找角色与可用目标
              </button>

              {viewModel.roles.length > 0 && (
                <fieldset className="teleport-role-picker">
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
                  <div className="teleport-inline-empty">
                    当前服务器没有可用于超域传送的角色。
                  </div>
                )}

              {viewModel.targetAreas.length > 0 && (
                <div className="teleport-target-fields">
                  <div className="teleport-field-grid">
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
                      label="目标服务器"
                      value={viewModel.selectedTargetGroupId}
                      placeholder="选择目标服务器"
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
                    <div className="teleport-queue-note">
                      <Clock />
                      {viewModel.queueMinutes === null
                        ? "当前排队时间暂无法估算"
                        : `预计等待约 ${roundQueueMinutes(viewModel.queueMinutes)} 分钟`}
                    </div>
                  )}
                </div>
              )}

              <label className="teleport-terms">
                <input
                  type="checkbox"
                  checked={viewModel.termsAccepted}
                  onChange={(event) =>
                    viewModel.setTermsAccepted(event.target.checked)
                  }
                />
                <span>我已退出游戏，并确认角色不在跨界或超域旅行状态中。</span>
              </label>

              <button
                className="teleport-primary-action"
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
                className="is-primary"
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
          <div className="dialog-warning">
            <WarningCircle weight="fill" />
            请再次确认游戏客户端已经完全退出。
          </div>
        </ActionDialog>
      )}

      {viewModel.activeOrderId && !viewModel.orderConfirmationRequired && (
        <OrderProgress viewModel={viewModel} />
      )}

      {viewModel.orderConfirmationRequired && (
        <ActionDialog
          title="官方预检已完成"
          onClose={() => undefined}
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
                className="is-primary"
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
    </main>
  );
}

function ServiceSummary({
  viewModel,
}: {
  viewModel: TeleportWorkspaceViewModel;
}) {
  return (
    <dl className="teleport-summary">
      <div>
        <Coins />
        <dt>账户余额</dt>
        <dd>{viewModel.balance.toLocaleString("zh-CN")}</dd>
      </div>
      <div>
        <Clock />
        <dt>基础间隔</dt>
        <dd>{viewModel.serviceLimitDays} 天</dd>
      </div>
      <div>
        <Ticket />
        <dt>当前限制</dt>
        <dd>{viewModel.migrationLimitDays || "无"}</dd>
      </div>
      <div>
        <MapPin />
        <dt>可选大区</dt>
        <dd>{viewModel.sourceAreas.length}</dd>
      </div>
    </dl>
  );
}

function JourneyRoute({
  viewModel,
}: {
  viewModel: TeleportWorkspaceViewModel;
}) {
  return (
    <aside className="journey-route" aria-label="传送路线预览">
      <div className="route-caption">
        <span>路线预览</span>
        <AirplaneTilt weight="duotone" />
      </div>
      <div className="route-stop is-source">
        <span className="route-marker" />
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
      <div className="route-line">
        <ArrowRight />
        <span>{viewModel.selectedRole?.roleName ?? "等待角色"}</span>
      </div>
      <div className="route-stop is-target">
        <span className="route-marker" />
        <div>
          <small>目标服务器</small>
          <strong>
            {viewModel.selectedTargetGroup?.groupName ?? "尚未选择"}
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

function OrderHistory({
  viewModel,
}: {
  viewModel: TeleportWorkspaceViewModel;
}) {
  return (
    <section
      className="teleport-orders"
      id="teleport-orders"
      aria-labelledby="orders-title"
    >
      <header>
        <div>
          <span>官方订单</span>
          <h2 id="orders-title">最近的传送记录</h2>
        </div>
        <strong>{viewModel.totalOrders.toLocaleString("zh-CN")} 条</strong>
      </header>
      {viewModel.orders.length ? (
        <div className="order-list">
          {viewModel.orders.map((order) => (
            <OrderRow
              key={order.orderId}
              order={order}
              busy={viewModel.actionLoading}
              onReturn={viewModel.prepareReturn}
            />
          ))}
        </div>
      ) : (
        <div className="teleport-orders-empty">
          <Ticket weight="duotone" />
          <strong>暂无传送记录</strong>
          <span>提交后的官方订单会显示在这里。</span>
        </div>
      )}
      {viewModel.totalOrderPages > 1 && (
        <nav className="order-pagination" aria-label="订单分页">
          <button
            type="button"
            disabled={viewModel.loading || viewModel.ordersPage <= 1}
            onClick={() => void viewModel.loadOrders(viewModel.ordersPage - 1)}
          >
            上一页
          </button>
          <span>
            {viewModel.ordersPage} / {viewModel.totalOrderPages}
          </span>
          <button
            type="button"
            disabled={
              viewModel.loading ||
              viewModel.ordersPage >= viewModel.totalOrderPages
            }
            onClick={() => void viewModel.loadOrders(viewModel.ordersPage + 1)}
          >
            下一页
          </button>
        </nav>
      )}
    </section>
  );
}

function OrderRow({
  order,
  busy,
  onReturn,
}: {
  order: TeleportOrder;
  busy: boolean;
  onReturn: (order: TeleportOrder) => Promise<void>;
}) {
  const canReturn =
    order.migrationType === 4 &&
    order.migrationStatus === 5 &&
    order.travelStatus === 1;
  return (
    <article className="order-row">
      <div className="order-kind">
        {order.migrationType === 5 ? (
          <ArrowUUpLeft weight="duotone" />
        ) : (
          <AirplaneTilt weight="duotone" />
        )}
        <span>{order.migrationType === 5 ? "返回" : "出发"}</span>
      </div>
      <div className="order-route">
        <strong>
          {order.areaName} / {order.groupName}
        </strong>
        <ArrowRight />
        <strong>
          {order.targetAreaName} / {order.targetGroupName}
        </strong>
      </div>
      <div className="order-meta">
        <span>{order.migrationStatusDesc || "处理中"}</span>
        <time>{order.createTime}</time>
        <code>{order.orderId}</code>
      </div>
      {canReturn && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onReturn(order)}
        >
          返回原服
        </button>
      )}
    </article>
  );
}

function AccountGate({ onOpenLogin }: { onOpenLogin: () => void }) {
  return (
    <section className="teleport-gate">
      <UserCircle weight="duotone" />
      <span>需要盛趣账号</span>
      <h2>先登录，再读取传送角色</h2>
      <p>账号凭据仅保存在本机受保护存储中，不会交给页面脚本。</p>
      <button
        className="teleport-gate-primary"
        type="button"
        onClick={onOpenLogin}
      >
        登录盛趣通行证
      </button>
    </section>
  );
}

function CrossAuthenticationGate({
  viewModel,
}: {
  viewModel: TeleportWorkspaceViewModel;
}) {
  return (
    <section className="teleport-gate cross-auth-gate">
      {viewModel.crossLogin?.qrImageDataUrl ? (
        <div className="teleport-qr">
          <img
            src={viewModel.crossLogin.qrImageDataUrl}
            alt="超域传送登录二维码"
          />
        </div>
      ) : viewModel.crossLoginMethod === "push" ? (
        <DeviceMobile weight="duotone" />
      ) : (
        <QrCode weight="duotone" />
      )}
      <span>超域传送专属验证</span>
      <h2>
        {viewModel.crossLoginMethod === "push"
          ? "请在叨鱼中确认登录"
          : viewModel.crossLogin
            ? viewModel.crossLoginProgress === "scanned"
              ? "已扫描，请在叨鱼中确认"
              : "使用叨鱼扫描二维码"
            : "一键确认超域传送登录"}
      </h2>
      <p>超域服务使用独立的官方应用票据，可直接发送叨鱼一键确认。</p>
      {!viewModel.crossLogin && (
        <>
          <label className="teleport-field cross-auth-account">
            <span>盛趣账号或手机号</span>
            <input
              value={viewModel.crossAccount}
              autoComplete="username"
              placeholder="输入完整账号"
              onChange={(event) =>
                viewModel.setCrossAccount(event.target.value)
              }
            />
          </label>
          <div className="cross-auth-actions">
            <button
              className="teleport-gate-primary"
              type="button"
              disabled={
                viewModel.actionLoading ||
                viewModel.crossAccount.trim().length < 5
              }
              onClick={() => void viewModel.startCrossAuthentication("push")}
            >
              {viewModel.actionLoading ? (
                <SpinnerGap className="spin" />
              ) : (
                <DeviceMobile />
              )}
              发送叨鱼确认
            </button>
            <button
              className="teleport-secondary-action"
              type="button"
              disabled={viewModel.actionLoading}
              onClick={() => void viewModel.startCrossAuthentication("qr")}
            >
              <QrCode />
              改用二维码
            </button>
          </div>
        </>
      )}
      {viewModel.crossLogin && (
        <div className="teleport-qr-status" role="status">
          <SpinnerGap className="spin" />
          {viewModel.crossLoginMethod === "push"
            ? "等待叨鱼确认"
            : viewModel.crossLoginProgress === "scanned"
              ? "等待手机确认"
              : "等待扫描"}
        </div>
      )}
    </section>
  );
}

function JourneyReview({
  viewModel,
}: {
  viewModel: TeleportWorkspaceViewModel;
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
          {viewModel.selectedTargetGroup?.groupName}
        </strong>
      </div>
    </div>
  );
}

function OrderProgress({
  viewModel,
}: {
  viewModel: TeleportWorkspaceViewModel;
}) {
  return (
    <div className="teleport-progress-overlay" role="status">
      <div className="teleport-progress-panel">
        <SpinnerGap className="spin" />
        <span>官方订单处理中</span>
        <h2>{orderProgressText(viewModel.activeOrderStatus)}</h2>
        <code>{viewModel.activeOrderId}</code>
        <p>页面会每 3 秒查询一次订单状态，请保持应用开启。</p>
      </div>
    </div>
  );
}

function ReturnDialog({
  viewModel,
}: {
  viewModel: TeleportWorkspaceViewModel;
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
      <p>请选择角色当前所在服务器，官方将据此创建返回订单。</p>
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
    </ActionDialog>
  );
}

function ActionDialog({
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

function StatusMessages({
  status,
}: {
  status: TeleportWorkspaceViewModel["activeOrderStatus"];
}) {
  if (!status?.messages.length) return <p>角色预检通过，可以继续传送。</p>;
  return (
    <div className="status-message-list">
      {status.messages.map((message) => (
        <div key={message.roleId}>
          <strong>{message.roleName}</strong>
          <span>{message.checkMsg || message.migrationMsg || "预检通过"}</span>
        </div>
      ))}
    </div>
  );
}

function SelectField({
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

function TeleportSkeleton() {
  return (
    <div className="teleport-skeleton" aria-label="正在读取超域传送数据">
      <div />
      <div />
      <div />
    </div>
  );
}

function roundQueueMinutes(minutes: number) {
  return Math.max(30, (Math.floor(minutes / 30) + 1) * 30);
}

function orderProgressText(
  status: TeleportWorkspaceViewModel["activeOrderStatus"],
) {
  if (!status || [0, 1].includes(status.migrationStatus)) return "正在检查角色";
  if ([3, 4].includes(status.migrationStatus)) return "正在执行传送";
  return "正在等待官方状态";
}
