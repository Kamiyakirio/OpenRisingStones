/** Official order history, return availability, and active-order progress. */

import {
  AirplaneTilt,
  ArrowRight,
  ArrowUUpLeft,
  SpinnerGap,
  Ticket,
} from "@phosphor-icons/react";
import type { TeleportOrder } from "../types";
import type { TeleportWorkspaceState } from "../hooks/useTeleportWorkspace";

export function OrderHistory({
  viewModel,
}: {
  viewModel: TeleportWorkspaceState;
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

export function OrderProgress({
  viewModel,
}: {
  viewModel: TeleportWorkspaceState;
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

export function StatusMessages({
  status,
}: {
  status: TeleportWorkspaceState["activeOrderStatus"];
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

function orderProgressText(
  status: TeleportWorkspaceState["activeOrderStatus"],
) {
  if (!status || [0, 1].includes(status.migrationStatus)) return "正在检查角色";
  if ([3, 4].includes(status.migrationStatus)) return "正在执行传送";
  return "正在等待官方状态";
}
