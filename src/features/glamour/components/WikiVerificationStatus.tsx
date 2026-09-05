/** Non-blocking status card for background Cloudflare verification. */
import { CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { WikiLoadStatus } from "../hooks/useWikiItem";

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
      <aside className="wiki-status-card wiki-status-error" role="alert">
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
    <aside className="wiki-status-card" aria-live="polite">
      <CircleNotch className="wiki-status-spinner" />
      <span>
        <strong>
          {needsInteraction ? "Wiki 需要人工验证" : "正在后台验证 Wiki 访问"}
        </strong>
        <small>
          {needsInteraction
            ? `显示验证面板以继续读取“${itemName}”`
            : "验证在后台标签中运行，不会打断当前操作"}
        </small>
      </span>
      <div>
        {needsInteraction && (
          <button type="button" onClick={onShow}>
            显示验证面板
          </button>
        )}
        <button className="wiki-status-cancel" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </aside>
  );
}
