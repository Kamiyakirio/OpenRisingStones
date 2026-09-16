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
    <div className="gear-meld-backdrop gear-editor">
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gear-unsaved-title"
        className="gear-meld-dialog gear-unsaved-dialog"
        tabIndex={-1}
      >
        <h2 id="gear-unsaved-title">尚未保存修改</h2>
        <p>
          「{name}」有未保存的修改。{action}前要保存吗？
        </p>
        <div className="gear-run">
          <button disabled={busy} onClick={onCancel}>
            取消
          </button>
          <button disabled={busy} onClick={onDiscard}>
            不保存继续
          </button>
          <button className="gear-primary" disabled={busy} onClick={onSave}>
            {busy ? "正在保存…" : "保存并继续"}
          </button>
        </div>
      </section>
    </div>,
    document.querySelector(".app") ?? document.body,
  );
}
