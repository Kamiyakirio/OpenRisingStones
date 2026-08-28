/** One-time consent wall before high-frequency public API aggregation begins. */
import { WarningCircle, X } from "@phosphor-icons/react";
import { useEffect } from "react";

type AdvancedRecruitRiskDialogProps = {
  storageError: boolean;
  onAgree: () => void;
  onCancel: () => void;
};

export function AdvancedRecruitRiskDialog({
  storageError,
  onAgree,
  onCancel,
}: AdvancedRecruitRiskDialogProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  return (
    <div className="advanced-risk-backdrop" role="presentation">
      <section
        className="advanced-risk-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-risk-title"
      >
        <button
          className="advanced-risk-close"
          type="button"
          aria-label="取消并关闭"
          onClick={onCancel}
        >
          <X />
        </button>
        <WarningCircle weight="duotone" aria-hidden="true" />
        <h2 id="advanced-risk-title">使用高级筛选前请确认风险</h2>
        <ul>
          <li>本功能将涉及对石之家 API 的高频率自动化请求。</li>
          <li>虽然已在代码中加入频控，但仍然可能有无法预见的后果。</li>
          <li>使用该功能默认已知晓一切可能后果。</li>
        </ul>
        {storageError && (
          <p className="advanced-risk-storage-error" role="alert">
            无法保存选择，下次进入时仍会再次提示。
          </p>
        )}
        <div className="advanced-risk-actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button className="primary" type="button" onClick={onAgree}>
            同意并初始化
          </button>
        </div>
      </section>
    </div>
  );
}
