import { WarningCircle, X } from "@phosphor-icons/react";
import { useId, type ReactNode } from "react";
import { useDialogFocus } from "../hooks/useDialogFocus";
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
  const dialog = useDialogFocus(onCancel);
  return (
    <div
      className="risk-dialog-backdrop fixed inset-0 z-40 grid place-items-center bg-[rgba(10,_15,_26,_0.64)] p-4"
      role="presentation"
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className="risk-dialog relative max-h-[calc(100dvh_-_32px)] w-[min(600px,_100%)] overflow-auto rounded-overlay border border-solid border-danger bg-surface p-[clamp(26px,_4vw,_38px)] text-ink"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          className="risk-dialog-close absolute top-4.5 right-4.5 grid h-9 min-h-9 w-9 place-items-center rounded-[50%] border-0 bg-transparent text-muted transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover hover:text-ink pointer-coarse:min-h-11 pointer-coarse:min-w-11"
          type="button"
          aria-label="取消并关闭"
          onClick={onCancel}
        >
          <X className="h-4.5 w-4.5" />
        </button>
        <WarningCircle
          className="h-12 w-12 text-danger"
          weight="duotone"
          aria-hidden="true"
        />
        <h2
          className="mx-0 mt-[17px] mb-0 text-lg text-[clamp(22px,_3vw,_29px)] font-semibold"
          id={titleId}
        >
          {title}
        </h2>
        <ul className="my-5 grid list-disc gap-3 rounded-panel border border-danger bg-danger-soft py-4 pr-4 pl-9">
          {items.map((item) => (
            <li className="pl-1 text-sm leading-relaxed" key={item}>
              {item}
            </li>
          ))}
        </ul>
        {description && (
          <div className="risk-dialog-description mt-4 text-sm leading-relaxed text-muted">
            {description}
          </div>
        )}
        {storageError && (
          <p
            className="risk-dialog-storage-error mx-0 mt-[13px] mb-0 text-xs text-danger"
            role="alert"
          >
            无法保存选择，下次进入时仍会再次提示。
          </p>
        )}
        <div className="risk-dialog-actions mt-6 flex justify-end gap-[9px] max-[620px]:flex-col-reverse">
          <button
            className="min-h-10.5 rounded-control border border-solid border-control bg-surface px-4 py-0 text-xs font-bold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] max-[620px]:w-full"
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="primary min-h-10.5 rounded-control border border-solid border-control bg-surface px-4 py-0 text-xs font-bold text-ink transition-[background-color,color,border-color] duration-120 ease-[ease] max-[620px]:w-full"
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
