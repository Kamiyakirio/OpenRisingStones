/** Reusable acknowledgement dialog for features with material operational risk. */
import { WarningCircle, X } from "@phosphor-icons/react";
import { useEffect, useId, type ReactNode } from "react";
import "./RiskDialog.css";

type RiskDialogProps = {
  title: string;
  items: string[];
  description?: ReactNode;
  confirmLabel?: string;
  storageError?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function RiskDialog({
  title,
  items,
  description,
  confirmLabel = "确认并继续",
  storageError = false,
  onConfirm,
  onCancel,
}: RiskDialogProps) {
  const titleId = useId();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  return (
    <div className="risk-dialog-backdrop" role="presentation">
      <section
        className="risk-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          className="risk-dialog-close"
          type="button"
          aria-label="取消并关闭"
          onClick={onCancel}
        >
          <X />
        </button>
        <WarningCircle weight="duotone" aria-hidden="true" />
        <h2 id={titleId}>{title}</h2>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {description && (
          <div className="risk-dialog-description">{description}</div>
        )}
        {storageError && (
          <p className="risk-dialog-storage-error" role="alert">
            无法保存选择，下次进入时仍会再次提示。
          </p>
        )}
        <div className="risk-dialog-actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button className="primary" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
