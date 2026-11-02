/** Official order history, return availability, and active-order progress. */

import clsx from "clsx";
import {
  teleportProgressOverlayClasses,
  teleportProgressSpinnerClasses,
  teleportFactRowClasses,
} from "../utilityClasses";
import { useId } from "react";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import {
  AirplaneTilt,
  ArrowRight,
  ArrowUUpLeft,
  SpinnerGap,
  Ticket,
} from "@phosphor-icons/react";
import type { TeleportOrder } from "../types";
import type { TeleportWorkspaceState } from "../hooks/useTeleportWorkspace";

/** Complete utility strings are shared without adding component CSS rules. */
const orderActionClasses =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-solid border-control bg-surface px-[13px] py-0 text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:border-accent enabled:hover:bg-selected";

/** Reused presentation strings stay static and are allocated once for this module. */

export function OrderHistory({
  viewModel,
}: {
  viewModel: TeleportWorkspaceState;
}) {
  return (
    <section
      className="teleport-orders mt-8 [scroll-margin-top:94px]"
      id="teleport-orders"
      aria-labelledby="orders-title"
    >
      <header className="mb-5 flex items-end justify-between gap-5">
        <div>
          <h2
            className="mx-0 mt-[7px] mb-0 text-lg leading-[1.12] font-semibold tracking-normal"
            id="orders-title"
          >
            传送记录
          </h2>
        </div>
        <strong className="font-sans text-xs text-muted">
          {viewModel.totalOrders.toLocaleString("zh-CN")} 条
        </strong>
      </header>
      {viewModel.orders.length ? (
        <div className="order-list overflow-hidden rounded-control border border-solid border-line bg-surface">
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
        <div className="teleport-orders-empty grid justify-items-center gap-2 rounded-control border border-solid border-line bg-surface px-5 py-8 text-center text-xs text-muted">
          <Ticket
            className="mb-[5px] h-9.5 w-9.5 text-accent"
            weight="duotone"
          />
          <strong className="text-sm text-ink">暂无传送记录</strong>
          <span>提交后的官方订单会显示在这里。</span>
        </div>
      )}
      {viewModel.totalOrderPages > 1 && (
        <nav
          className="order-pagination mt-4.5 flex items-center justify-center gap-3.5"
          aria-label="订单分页"
        >
          <button
            className={orderActionClasses}
            type="button"
            disabled={viewModel.loading || viewModel.ordersPage <= 1}
            onClick={() => void viewModel.loadOrders(viewModel.ordersPage - 1)}
          >
            上一页
          </button>
          <span className="font-sans text-xs text-muted">
            {viewModel.ordersPage} / {viewModel.totalOrderPages}
          </span>
          <button
            className={orderActionClasses}
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
    <article className="order-row grid min-w-0 grid-cols-1 items-center gap-3 border-line p-4 @min-[600px]/teleport:grid-cols-[70px_minmax(0,_1fr)_auto] @min-[1050px]/teleport:grid-cols-[76px_minmax(0,_1fr)_minmax(160px,_240px)_auto]">
      <div className="order-kind flex items-center gap-2 text-xs font-[740] text-accent">
        {order.migrationType === 5 ? (
          <ArrowUUpLeft className="h-5 w-5" weight="duotone" />
        ) : (
          <AirplaneTilt className="h-5 w-5" weight="duotone" />
        )}
        <span>{order.migrationType === 5 ? "返回" : "出发"}</span>
      </div>
      <div className="order-route flex min-w-0 flex-col items-start gap-2 @min-[600px]/teleport:flex-row @min-[600px]/teleport:items-center">
        <strong className="min-w-0 text-sm [overflow-wrap:anywhere]">
          {order.areaName} / {order.groupName}
        </strong>
        <ArrowRight className="size-4 shrink-0 rotate-90 text-muted @min-[600px]/teleport:rotate-0" />
        <strong className="min-w-0 text-sm [overflow-wrap:anywhere]">
          {order.targetAreaName} / {order.targetGroupName}
        </strong>
      </div>
      <div className="order-meta grid min-w-0 gap-1 text-xs [overflow-wrap:anywhere] @min-[600px]/teleport:col-start-2 @min-[600px]/teleport:row-start-2 @min-[1050px]/teleport:col-start-3 @min-[1050px]/teleport:row-start-1">
        <span className="font-semibold text-accent">
          {order.migrationStatusDesc || "处理中"}
        </span>
        <time className="text-muted">{order.createTime}</time>
        <code className="text-muted">{order.orderId}</code>
      </div>
      {canReturn && (
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-accent bg-tool-soft px-3 text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] @min-[600px]/teleport:col-start-3 @min-[600px]/teleport:row-span-2 @min-[600px]/teleport:row-start-1 @min-[600px]/teleport:w-auto @min-[1050px]/teleport:col-start-4 @min-[1050px]/teleport:row-span-1"
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
  // Busy operations keep keyboard navigation out of background selection controls.
  const titleId = useId();
  const focus = useDialogFocus(() => undefined);
  return (
    <section
      ref={focus}
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby={titleId}
      className={teleportProgressOverlayClasses}
      role="dialog"
    >
      <div className="teleport-progress-panel grid max-h-[calc(100dvh-40px)] w-[min(440px,_100%)] min-w-0 justify-items-center overflow-y-auto rounded-control border border-solid border-line bg-surface p-6 text-center [overflow-wrap:anywhere] text-ink shadow-[none]">
        <SpinnerGap className={teleportProgressSpinnerClasses} />
        <span className="text-xs font-[760] tracking-normal text-accent">
          官方订单处理中
        </span>
        <h2
          className="mx-0 my-2 text-lg font-semibold"
          id={titleId}
          aria-live="polite"
        >
          {orderProgressText(viewModel.activeOrderStatus)}
        </h2>
        <code className="text-xs text-muted">{viewModel.activeOrderId}</code>
        <p className="mx-0 mt-3.5 mb-0 text-xs leading-[1.6] text-muted">
          页面会每 3 秒查询一次订单状态，请保持应用开启。
        </p>
      </div>
    </section>
  );
}
export function StatusMessages({
  status,
  layout,
}: {
  status: TeleportWorkspaceState["activeOrderStatus"];
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "dialog-body";
}) {
  if (!status?.messages.length)
    return (
      <p
        className={clsx(
          layout === "dialog-body" &&
            "mx-0 mt-0 mb-4.5 text-[12px] leading-[1.6] text-muted",
        )}
      >
        角色预检通过，可以继续传送。
      </p>
    );
  return (
    <div className="status-message-list grid gap-[1px] overflow-hidden rounded-control border border-solid border-line bg-line">
      {status.messages.map((message) => (
        <div className={teleportFactRowClasses} key={message.roleId}>
          <strong className="text-[12px]">{message.roleName}</strong>
          <span className="text-xs text-muted">
            {message.checkMsg || message.migrationMsg || "预检通过"}
          </span>
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
