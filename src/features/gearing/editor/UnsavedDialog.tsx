/** Destructive draft transitions wait for an explicit save, discard, or cancellation. */
import { createPortal } from "react-dom";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
export function UnsavedDialog({
  name,
  action,
  busy,
  onCancel,
  onDiscard,
  onSave,
}: {
  name: string;
  action: string;
  busy: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const ref = useDialogFocus(() => {
    if (!busy) onCancel();
  });
  return createPortal(
    <div
      className={
        "gear-meld-backdrop gear-editor fixed grid place-items-center p-[24px] max-[767px]:p-[12px] mx-auto w-full max-w-[1600px] px-8 py-6 text-[15px] text-ink [&_*]:box-border [&_button]:min-h-10 [&_button]:rounded-lg [&_button]:border [&_button]:border-control [&_button]:bg-surface [&_button]:px-3 [&_button]:py-2 [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-control [&_select]:bg-surface [&_select]:px-3 [&_select]:py-2 [&_input:not([type=checkbox])]:min-h-10 [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-control [&_input:not([type=checkbox])]:bg-surface [&_input:not([type=checkbox])]:px-3 [&_input:not([type=checkbox])]:py-2 [&_button]:cursor-pointer [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[6px] [&_button:hover:not(:disabled)]:bg-hover [&_button:disabled]:cursor-default [&_button:disabled]:text-disabled [&_button[aria-pressed=true]]:text-accent [&_button[aria-pressed=true]]:bg-selected [&_input]:min-w-0 [&_select]:min-w-0 [&_svg]:w-[18px] [&_svg]:h-[18px] [&_h1]:m-0 [&_h2]:m-0 [&_p]:m-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:text-sm [&_h2]:font-semibold [&_label]:flex [&_label]:gap-[8px] [&_label]:items-center [&_small]:text-muted [&_table]:w-full [&_table]:tabular-nums [&_th]:border-b [&_th]:border-solid [&_th]:border-line [&_th]:text-right [&_th]:whitespace-nowrap [&_td]:border-b [&_td]:border-solid [&_td]:border-line [&_td]:text-right [&_td]:whitespace-nowrap [&_th]:text-muted [&_th]:font-normal [&_th:first-child]:text-left [&_td:first-child]:text-left [&_summary]:cursor-pointer [&_summary]:min-h-[28px] [@media(pointer:_coarse)]:[&_button]:min-h-[44px] [@media(pointer:_coarse)]:[&_select]:min-h-[44px] [@media(pointer:_coarse)]:[&_input:not([type=checkbox])]:min-h-[44px] [&_:is(_.gear-save-state,_.gear-context,_.gear-section-heading_>_span,_.gear-slot-label,_.gear-equipped-meta,_.gear-candidate-filters,_.gear-check,_.gear-item-description,_.gear-key-stats_dt,_.gear-muted,_.gear-footer,_.gear-apply-summary_)]:text-[13px] [&_th]:text-[13px] [&&&&]:inset-[0] [&&&&]:z-[30] [&&&&]:max-w-[none] [&&&&]:[background:rgb(31_29_26_/_0.54)] [@media(max-width:_767px)]:[&&&&]:[align-items:end] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline-offset:2px] [&&&&_input]:[caret-color:var(--ors-color-accent)] [&&&&_select]:max-w-[100%] [&&&&_svg]:shrink-[0] [&&&&_table]:[border-collapse:collapse] [&&&&_th]:p-[12px_10px] [&&&&_td]:p-[12px_10px] [&&&&_details]:m-[12px_0] [&&&&_summary]:text-[0.8rem] [@media(max-width:_767px)]:[&&&&]:p-[12px_16px]"
      }
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gear-unsaved-title"
        className={
          "gear-meld-dialog gear-unsaved-dialog overflow-y-auto break-words border border-solid border-line rounded-[var(--ors-radius-overlay)] bg-surface [&_>_header]:sticky [&_>_header]:flex [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:gap-[16px] [&_>_header]:min-h-[56px] [&_>_header]:border-b [&_>_header]:border-solid [&_>_header]:border-line [&_>_header]:bg-surface [&_>_header_button]:w-[40px] [&_>_header_button]:p-0 [&_>_header_button]:border-0 p-[24px] [&_>_p]:mt-[12px] [&&&&]:w-[min(820px,_100%)] [&&&&]:max-h-[calc(100dvh_-_48px)] [&&&&]:shadow-[var(--ors-shadow-dialog)] [&&&&_>_header]:top-[0] [&&&&_>_header]:z-[1] [&&&&_>_header]:p-[8px_12px_8px_20px] [&&&&_>_header_button]:[background:transparent] [@media(max-width:_767px)]:[&&&&]:max-h-[calc(100dvh_-_24px)] [&&&&_>_p]:leading-[1.7]"
        }
        tabIndex={-1}
      >
        <h2 className="text-lg font-semibold" id="gear-unsaved-title">
          尚未保存修改
        </h2>
        <p>
          「{name}」有未保存的修改。{action}前要保存吗？
        </p>
        <div
          className={
            "gear-run [.gear-unsaved-dialog_&]:justify-end flex flex-wrap gap-[8px] [.gear-optimizer-actions_>_&]:m-0 [.gear-optimizer-actions_>_&]:items-center [.gear-unsaved-dialog_&&&&]:m-[24px_0_0] [&&&&]:m-[12px_0]"
          }
        >
          <button disabled={busy} onClick={onCancel}>
            取消
          </button>
          <button disabled={busy} onClick={onDiscard}>
            不保存继续
          </button>
          <button
            className="gear-primary [.gear-editor_&]:bg-accent [.gear-editor_&]:text-on-accent [.gear-editor_&]:border-accent [.gear-editor_&:hover:not(:disabled)]:bg-accent-hover [.gear-editor_&:disabled]:bg-surface [.gear-editor_&:disabled]:border-line"
            disabled={busy}
            onClick={onSave}
          >
            {busy ? "正在保存…" : "保存并继续"}
          </button>
        </div>
      </section>
    </div>,
    document.querySelector(".app") ?? document.body,
  );
}
