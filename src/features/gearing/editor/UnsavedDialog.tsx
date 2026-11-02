/** Destructive draft transitions wait for an explicit save, discard, or cancellation. */

import {
  gearingControlClasses,
  gearingDialogBackdropClasses,
} from "../utilityClasses";
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
    <div className={gearingDialogBackdropClasses}>
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gear-unsaved-title"
        className="gear-meld-dialog gear-unsaved-dialog max-h-[calc(100dvh_-_48px)] w-[min(820px,_100%)] overflow-y-auto rounded-overlay border border-solid border-line bg-surface p-6 break-words shadow-[var(--ors-shadow-dialog)] max-[767px]:max-h-[calc(100dvh_-_24px)]"
        tabIndex={-1}
      >
        <h2 className="text-lg font-semibold" id="gear-unsaved-title">
          尚未保存修改
        </h2>
        <p className="mt-3 leading-[1.7]">
          「{name}」有未保存的修改。{action}前要保存吗？
        </p>
        <div className="gear-run mx-0 my-3 flex flex-wrap justify-end gap-2">
          <button
            className={gearingControlClasses.button}
            disabled={busy}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className={gearingControlClasses.button}
            disabled={busy}
            onClick={onDiscard}
          >
            不保存继续
          </button>
          <button
            className={
              "gear-primary inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-accent bg-accent px-3 py-2 text-on-accent transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-accent-hover disabled:cursor-default disabled:border-line disabled:bg-surface disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
            }
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
