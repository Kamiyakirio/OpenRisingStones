/** Reusable acknowledgement dialog for features with material operational risk. */
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
      className={
        "risk-dialog-backdrop fixed grid place-items-center p-[16px] [&&&&]:inset-[0] [&&&&]:[background:rgba(10,_15,_26,_0.64)] [&&&&]:z-[40]"
      }
      role="presentation"
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className={
          "risk-dialog relative border border-solid border-danger rounded-[var(--ors-radius-overlay)] text-ink bg-surface overflow-auto [&_>_svg]:w-[48px] [&_>_svg]:h-[48px] [&_>_svg]:text-danger [&_ul]:my-5 [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-3 [&_ul]:rounded-xl [&_ul]:border [&_ul]:border-danger [&_ul]:bg-danger-soft [&_ul]:py-4 [&_ul]:pr-4 [&_ul]:pl-9 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:pl-[4px] [&&&&]:w-[min(600px,_100%)] [&&&&]:p-[clamp(26px,_4vw,_38px)] [&&&&]:max-h-[calc(100dvh_-_32px)] [&&&&_h2]:m-[17px_0_0] [&&&&_h2]:text-[clamp(22px,_3vw,_29px)]"
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          className={
            "risk-dialog-close absolute grid place-items-center w-[36px] h-[36px] border-0 text-muted [&:hover]:text-ink [&:hover]:bg-hover [&_svg]:w-[18px] [&_svg]:h-[18px] [&&&&]:top-[18px] [&&&&]:right-[18px] [&&&&]:rounded-[50%] [&&&&]:[background:transparent]"
          }
          type="button"
          aria-label="取消并关闭"
          onClick={onCancel}
        >
          <X />
        </button>
        <WarningCircle weight="duotone" aria-hidden="true" />
        <h2 className="text-lg font-semibold" id={titleId}>
          {title}
        </h2>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {description && (
          <div className="risk-dialog-description text-sm leading-relaxed mt-[16px] text-muted [&_p]:m-0">
            {description}
          </div>
        )}
        {storageError && (
          <p
            className={
              "risk-dialog-storage-error text-danger text-xs [&&&&]:m-[13px_0_0]"
            }
            role="alert"
          >
            无法保存选择，下次进入时仍会再次提示。
          </p>
        )}
        <div
          className={
            "risk-dialog-actions flex justify-end gap-[9px] mt-[24px] [&_button]:min-h-[42px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-ink [&_button]:bg-surface [&_button]:text-xs [&_button]:font-bold max-[620px]:flex-col-reverse max-[620px]:[&_button]:w-full [&&&&_button]:p-[0_16px]"
          }
        >
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button
            className="primary [.risk-dialog-actions_button&]:border-danger [.risk-dialog-actions_button&]:text-danger [.risk-dialog-actions_button&]:bg-surface"
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
