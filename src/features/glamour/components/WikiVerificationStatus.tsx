/** Non-blocking status card for background Cloudflare verification. */
import { CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { WikiLoadStatus } from "../../../shared/wiki/useWikiItem";

type WikiVerificationStatusProps = {
  status: WikiLoadStatus;
  itemName: string;
  error: string | null;
  onShow: () => void;
  onCancel: () => void;
  onDismiss: () => void;
};

export function WikiVerificationStatus({
  status,
  itemName,
  error,
  onShow,
  onCancel,
  onDismiss,
}: WikiVerificationStatusProps) {
  if (
    status !== "background_verification" &&
    status !== "interaction_required" &&
    status !== "error"
  ) {
    return null;
  }

  if (status === "error") {
    return (
      <aside
        className={
          "wiki-status-card wiki-status-error fixed grid items-center gap-[12px] border border-solid rounded-[var(--ors-radius-control)] text-ink bg-surface [&_>_svg]:w-[24px] [&_>_svg]:h-[24px] [&_>_span]:grid [&_>_span]:gap-[3px] [&_>_span]:min-w-0 [&_strong]:text-sm [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[7px] [&_button]:min-h-[34px] [&_button]:border [&_button]:border-solid [&_button]:border-accent [&_button]:rounded-[var(--ors-radius-pill)] [&_button]:text-accent [&_button]:bg-selected [&_button]:text-xs [&_button]:font-bold [&_button]:whitespace-nowrap border-danger [&_>_svg]:text-danger [&&&&]:right-[22px] [&&&&]:bottom-[22px] [&&&&]:z-[130] [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&]:w-[min(470px,_calc(100vw_-_44px))] [&&&&]:p-[14px_15px] [&&&&]:shadow-[none] [&&&&_small]:leading-[1.4] [&&&&_small]:[text-overflow:ellipsis] [&&&&_button]:p-[0_11px] [@media(max-width:_700px)]:[&&&&]:right-[12px] [@media(max-width:_700px)]:[&&&&]:bottom-[12px] [@media(max-width:_700px)]:[&&&&]:grid-cols-[auto_minmax(0,_1fr)] [@media(max-width:_700px)]:[&&&&]:w-[calc(100vw_-_24px)] [@media(max-width:_700px)]:[&&&&_>_div]:[grid-column:1_/_-1] [@media(max-width:_700px)]:[&&&&_>_div]:[justify-self:stretch] [@media(max-width:_700px)]:[&&&&_>_button]:[grid-column:1_/_-1] [@media(max-width:_700px)]:[&&&&_>_button]:[justify-self:stretch] [@media(max-width:_700px)]:[&&&&_>_div_button]:flex-[1] [@media(max-width:_700px)]:[&&&&_>_button]:flex-[1]"
        }
        role="alert"
      >
        <WarningCircle />
        <span>
          <strong>Wiki 资料读取失败</strong>
          <small>{error ?? "请稍后重试"}</small>
        </span>
        <button type="button" onClick={onDismiss}>
          关闭
        </button>
      </aside>
    );
  }

  const needsInteraction = status === "interaction_required";
  return (
    <aside
      className={
        "wiki-status-card fixed grid items-center gap-[12px] border border-solid border-line rounded-[var(--ors-radius-control)] text-ink bg-surface [&_>_svg]:w-[24px] [&_>_svg]:h-[24px] [&_>_svg]:text-accent [&_>_span]:grid [&_>_span]:gap-[3px] [&_>_span]:min-w-0 [&_strong]:text-sm [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:whitespace-nowrap [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[7px] [&_button]:min-h-[34px] [&_button]:border [&_button]:border-solid [&_button]:border-accent [&_button]:rounded-[var(--ors-radius-pill)] [&_button]:text-accent [&_button]:bg-selected [&_button]:text-xs [&_button]:font-bold [&_button]:whitespace-nowrap [&&&&]:right-[22px] [&&&&]:bottom-[22px] [&&&&]:z-[130] [&&&&]:grid-cols-[auto_minmax(0,_1fr)_auto] [&&&&]:w-[min(470px,_calc(100vw_-_44px))] [&&&&]:p-[14px_15px] [&&&&]:shadow-[none] [&&&&_small]:leading-[1.4] [&&&&_small]:[text-overflow:ellipsis] [&&&&_button]:p-[0_11px] [@media(max-width:_700px)]:[&&&&]:right-[12px] [@media(max-width:_700px)]:[&&&&]:bottom-[12px] [@media(max-width:_700px)]:[&&&&]:grid-cols-[auto_minmax(0,_1fr)] [@media(max-width:_700px)]:[&&&&]:w-[calc(100vw_-_24px)] [@media(max-width:_700px)]:[&&&&_>_div]:[grid-column:1_/_-1] [@media(max-width:_700px)]:[&&&&_>_div]:[justify-self:stretch] [@media(max-width:_700px)]:[&&&&_>_button]:[grid-column:1_/_-1] [@media(max-width:_700px)]:[&&&&_>_button]:[justify-self:stretch] [@media(max-width:_700px)]:[&&&&_>_div_button]:flex-[1] [@media(max-width:_700px)]:[&&&&_>_button]:flex-[1]"
      }
      aria-live="polite"
    >
      <CircleNotch
        className={
          "wiki-status-spinner [@media(prefers-reduced-motion:_no-preference)]:[&&&&]:animate-[login-spin_900ms_linear_infinite] [@media(prefers-reduced-motion:_reduce)]:[&&&&]:animate-[none]"
        }
      />
      <span>
        <strong>
          {needsInteraction ? "Wiki 需要人工验证" : "正在后台验证 Wiki 访问"}
        </strong>
        <small>
          {needsInteraction
            ? `显示验证面板以继续读取“${itemName}”`
            : "验证标签页已在后台打开"}
        </small>
      </span>
      <div>
        {needsInteraction && (
          <button type="button" onClick={onShow}>
            显示验证面板
          </button>
        )}
        <button
          className={
            "wiki-status-cancel [.wiki-status-card_&]:border-line [.wiki-status-card_&]:text-muted [.wiki-status-card_&&&&]:[background:transparent]"
          }
          type="button"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </aside>
  );
}
