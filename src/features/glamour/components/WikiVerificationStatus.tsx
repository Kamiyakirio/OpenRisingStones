import { CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { WikiLoadStatus } from "../../../shared/wiki/useWikiItem";
import { glamourMetadataCaptionClasses } from "../utilityClasses";

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
        className="wiki-status-card wiki-status-error fixed right-5.5 bottom-5.5 z-130 grid w-[min(470px,_calc(100vw_-_44px))] grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-3 rounded-control border border-solid border-danger bg-surface px-[15px] py-3.5 text-ink shadow-[none] max-[700px]:right-3 max-[700px]:bottom-3 max-[700px]:w-[calc(100vw_-_24px)] max-[700px]:grid-cols-[auto_minmax(0,_1fr)]"
        role="alert"
      >
        <WarningCircle className="h-6 w-6 text-danger" />
        <span className="grid min-w-0 gap-[3px]">
          <strong className="text-sm">Wiki 资料读取失败</strong>
          <small className={glamourMetadataCaptionClasses}>
            {error ?? "请稍后重试"}
          </small>
        </span>
        <button
          className="min-h-8.5 rounded-full border border-solid border-accent bg-selected px-[11px] py-0 text-xs font-bold whitespace-nowrap text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] max-[700px]:col-span-full max-[700px]:flex-1 max-[700px]:justify-self-stretch"
          type="button"
          onClick={onDismiss}
        >
          关闭
        </button>
      </aside>
    );
  }
  const needsInteraction = status === "interaction_required";
  return (
    <aside
      className="wiki-status-card fixed right-5.5 bottom-5.5 z-130 grid w-[min(470px,_calc(100vw_-_44px))] grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-3 rounded-control border border-solid border-line bg-surface px-[15px] py-3.5 text-ink shadow-[none] max-[700px]:right-3 max-[700px]:bottom-3 max-[700px]:w-[calc(100vw_-_24px)] max-[700px]:grid-cols-[auto_minmax(0,_1fr)]"
      aria-live="polite"
    >
      <CircleNotch className="wiki-status-spinner h-6 w-6 text-accent" />
      <span className="grid min-w-0 gap-[3px]">
        <strong className="text-sm">
          {needsInteraction ? "Wiki 需要人工验证" : "正在后台验证 Wiki 访问"}
        </strong>
        <small className={glamourMetadataCaptionClasses}>
          {needsInteraction
            ? `显示验证面板以继续读取“${itemName}”`
            : "验证标签页已在后台打开"}
        </small>
      </span>
      <div className="flex items-center gap-[7px] max-[700px]:col-span-full max-[700px]:justify-self-stretch">
        {needsInteraction && (
          <button
            className="min-h-8.5 rounded-full border border-solid border-accent bg-selected px-[11px] py-0 text-xs font-bold whitespace-nowrap text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] max-[700px]:flex-1"
            type="button"
            onClick={onShow}
          >
            显示验证面板
          </button>
        )}
        <button
          className="wiki-status-cancel min-h-8.5 rounded-full border border-solid border-accent bg-transparent px-[11px] py-0 text-xs font-bold whitespace-nowrap text-accent transition-[background-color,color,border-color] duration-120 ease-[ease] max-[700px]:flex-1"
          type="button"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </aside>
  );
}
