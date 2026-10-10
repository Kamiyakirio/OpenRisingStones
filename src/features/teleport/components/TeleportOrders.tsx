/** Official order history, return availability, and active-order progress. */

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

export function OrderHistory({
  viewModel,
}: {
  viewModel: TeleportWorkspaceState;
}) {
  return (
    <section
      className={
        "teleport-orders [&_h2]:text-lg mt-8 [&_>_header]:flex [&_>_header]:items-end [&_>_header]:justify-between [&_>_header]:gap-[20px] [&_>_header]:mb-[20px] [&_>_header_>_strong]:text-muted [&_>_header_>_strong]:text-xs [&&&&_h2]:m-[7px_0_0] [&&&&_h2]:leading-[1.12] [&&&&_h2]:[letter-spacing:normal] [&&&&]:[scroll-margin-top:94px] [&&&&_>_header_>_strong]:[font-family:var(--ors-font-ui)]"
      }
      id="teleport-orders"
      aria-labelledby="orders-title"
    >
      <header>
        <div>
          <h2 className="text-lg font-semibold" id="orders-title">
            传送记录
          </h2>
        </div>
        <strong>{viewModel.totalOrders.toLocaleString("zh-CN")} 条</strong>
      </header>
      {viewModel.orders.length ? (
        <div className="order-list overflow-hidden border border-solid border-line rounded-[var(--ors-radius-control)] bg-surface">
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
        <div
          className={
            "teleport-orders-empty grid justify-items-center gap-2 text-center border border-solid border-line rounded-[var(--ors-radius-control)] text-muted bg-surface text-xs [&_svg]:w-[38px] [&_svg]:h-[38px] [&_svg]:mb-[5px] [&_svg]:text-accent [&&&&]:p-[32px_20px] [&_strong]:text-sm [&_strong]:text-ink"
          }
        >
          <Ticket weight="duotone" />
          <strong>暂无传送记录</strong>
          <span>提交后的官方订单会显示在这里。</span>
        </div>
      )}
      {viewModel.totalOrderPages > 1 && (
        <nav
          className={
            "order-pagination [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:text-ink [&_button]:bg-surface [&_button:hover:not(:disabled)]:border-accent [&_button:hover:not(:disabled)]:bg-selected flex items-center justify-center gap-[14px] mt-[18px] [&_button]:min-h-[36px] [&_span]:text-muted [&_span]:text-xs [&&&&_button]:p-[0_13px] [&&&&_span]:[font-family:var(--ors-font-ui)]"
          }
          aria-label="订单分页"
        >
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
    <article
      className={
        "order-row grid min-w-0 grid-cols-1 items-center gap-3 border-line p-4 [&_>_button]:border [&_>_button]:border-accent [&_>_button]:bg-tool-soft [&_>_button]:px-3 [&_>_button]:text-accent [&_>_button]:w-full [.order-row_+_&]:border-t @min-[600px]/teleport:grid-cols-[70px_minmax(0,_1fr)_auto] @min-[600px]/teleport:[&_>_button]:col-start-3 @min-[600px]/teleport:[&_>_button]:row-start-1 @min-[600px]/teleport:[&_>_button]:row-span-2 @min-[600px]/teleport:[&_>_button]:w-auto @min-[1050px]/teleport:grid-cols-[76px_minmax(0,_1fr)_minmax(160px,_240px)_auto] @min-[1050px]/teleport:[&_>_button]:col-start-4 @min-[1050px]/teleport:[&_>_button]:row-span-1"
      }
    >
      <div
        className={
          "order-kind flex items-center gap-[8px] text-accent text-xs [&_svg]:w-[20px] [&_svg]:h-[20px] [&&&&]:[font-weight:740]"
        }
      >
        {order.migrationType === 5 ? (
          <ArrowUUpLeft weight="duotone" />
        ) : (
          <AirplaneTilt weight="duotone" />
        )}
        <span>{order.migrationType === 5 ? "返回" : "出发"}</span>
      </div>
      <div
        className={
          "order-route flex min-w-0 flex-col items-start gap-2 [&_strong]:min-w-0 [&_strong]:text-sm [&_strong]:[overflow-wrap:anywhere] [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:rotate-90 [&_svg]:text-muted @min-[600px]/teleport:flex-row @min-[600px]/teleport:items-center @min-[600px]/teleport:[&_svg]:rotate-0"
        }
      >
        <strong>
          {order.areaName} / {order.groupName}
        </strong>
        <ArrowRight />
        <strong>
          {order.targetAreaName} / {order.targetGroupName}
        </strong>
      </div>
      <div
        className={
          "order-meta grid min-w-0 gap-1 text-xs [overflow-wrap:anywhere] [&_span]:font-semibold [&_span]:text-accent [&_time]:text-muted [&_code]:text-muted @min-[600px]/teleport:col-start-2 @min-[600px]/teleport:row-start-2 @min-[1050px]/teleport:col-start-3 @min-[1050px]/teleport:row-start-1"
        }
      >
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
  // Busy operations keep keyboard navigation out of background selection controls.
  const titleId = useId();
  const focus = useDialogFocus(() => undefined);
  return (
    <section
      ref={focus}
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby={titleId}
      className={
        "teleport-progress-overlay fixed grid place-items-center p-[20px] [&&&&]:z-[40] [&&&&]:inset-[0] [&&&&]:[background:rgba(10,_15,_26,_0.64)]"
      }
      role="dialog"
    >
      <div
        className={
          "teleport-progress-panel grid min-w-0 max-h-[calc(100dvh-40px)] overflow-y-auto break-words p-6 [overflow-wrap:anywhere] border border-solid border-line rounded-[var(--ors-radius-control)] text-ink bg-surface text-center [&_>_svg]:w-[42px] [&_>_svg]:h-[42px] [&_>_svg]:mb-[17px] [&_>_svg]:text-accent [&_>_span]:text-accent [&_>_span]:text-xs [&_h2]:text-lg [&_code]:text-muted [&_code]:text-xs [&_p]:text-muted [&_p]:text-xs [&&&&]:[justify-items:center] [&&&&]:w-[min(440px,_100%)] [&&&&]:shadow-[none] [&&&&_>_span]:[font-weight:760] [&&&&_>_span]:[letter-spacing:normal] [&&&&_h2]:m-[8px_0] [&&&&_p]:m-[14px_0_0] [&&&&_p]:leading-[1.6]"
        }
      >
        <SpinnerGap
          className={"spin [&&&&]:animate-[login-spin_900ms_linear_infinite]"}
        />
        <span>官方订单处理中</span>
        <h2 className="text-lg font-semibold" id={titleId} aria-live="polite">
          {orderProgressText(viewModel.activeOrderStatus)}
        </h2>
        <code>{viewModel.activeOrderId}</code>
        <p>页面会每 3 秒查询一次订单状态，请保持应用开启。</p>
      </div>
    </section>
  );
}

export function StatusMessages({
  status,
}: {
  status: TeleportWorkspaceState["activeOrderStatus"];
}) {
  if (!status?.messages.length) return <p>角色预检通过，可以继续传送。</p>;
  return (
    <div
      className={
        "status-message-list grid gap-[1px] overflow-hidden border border-solid border-line rounded-[var(--ors-radius-control)] bg-line [&_>_div]:grid [&_>_div]:gap-[12px] [&_>_div]:bg-canvas [&_span]:text-muted [&_span]:text-xs max-[700px]:[&_>_div]:gap-[4px] [&&&&_>_div]:grid-cols-[120px_minmax(0,_1fr)] [&&&&_>_div]:p-[13px_14px] [&&&&_strong]:text-[12px] [@media(max-width:_700px)]:[&&&&_>_div]:grid-cols-[1fr]"
      }
    >
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
