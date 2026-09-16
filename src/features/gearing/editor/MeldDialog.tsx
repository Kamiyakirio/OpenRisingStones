/** Focused materia popup with Escape, backdrop close, and focus restoration. */
import { X } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import type { EditorState } from "./Editor";
import { MeldEditor } from "./MeldEditor";
import type { GearingViewModel } from "./ViewModel";

export function MeldDialog({
  vm,
  state,
  onClose,
}: {
  vm: GearingViewModel;
  state: EditorState;
  onClose: () => void;
}) {
  const ref = useDialogFocus(onClose);
  return createPortal(
    <div
      className="gear-meld-backdrop gear-editor"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className="gear-meld-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gear-meld-dialog-title"
        tabIndex={-1}
      >
        <header>
          <h2 id="gear-meld-dialog-title">镶嵌与属性</h2>
          <button aria-label="关闭镶嵌编辑" onClick={onClose}>
            <X />
          </button>
        </header>
        <MeldEditor
          vm={vm}
          state={state}
          onRemove={() => {
            vm.remove();
            onClose();
          }}
        />
      </section>
    </div>,
    // Keep theme tokens inherited while escaping the editor's clipped workspace.
    document.querySelector(".app") ?? document.body,
  );
}
