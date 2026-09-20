/** Focused materia popup with Escape, backdrop close, and focus restoration. */
import { X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "../../../shared/hooks/useDialogFocus";
import type { EditorState } from "./Editor";
import { ItemIcon } from "./ItemIcon";
import { ItemName } from "./ItemName";
import { MeldEditor } from "./MeldEditor";
import type { GearingViewModel } from "./ViewModel";
import type { Slot } from "./types";

export function MeldDialog({
  vm,
  state,
  onClose,
}: {
  vm: GearingViewModel;
  state: EditorState;
  onClose: () => void;
}) {
  const [activeMateriaIndex, setActiveMateriaIndex] = useState<number | null>(
    null,
  );
  const ref = useDialogFocus(() => {
    if (activeMateriaIndex !== null) setActiveMateriaIndex(null);
    else onClose();
  });
  const selectedSlot = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    selectedSlot.current?.scrollIntoView({ block: "nearest" });
  }, [state.selection]);
  const { data, document: doc, evaluation } = state;
  if (!data || !doc) return null;
  const job = data.jobs.find((candidate) => candidate.id === doc.job);
  if (!job) return null;
  const slots = job.slots.flatMap((slot) => {
    const gear = doc.equipment[slot.key as Slot];
    const equipped = evaluation?.slots[slot.key];
    return gear && equipped ? [{ slot, gear, equipped }] : [];
  });
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
          <h2 id="gear-meld-dialog-title">魔晶石镶嵌</h2>
          <button aria-label="关闭镶嵌编辑" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="gear-meld-layout">
          {slots.length > 1 && (
            <nav className="gear-meld-slots" aria-label="选择要镶嵌的装备">
              {slots.map(({ slot, gear, equipped }) => {
                const total = equipped.item.materiaAdvanced
                  ? 5
                  : (equipped.item.materiaSlot ?? 0);
                const filled = gear.materias.filter((meld) => meld.stat).length;
                return (
                  <button
                    ref={
                      state.selection === slot.key ? selectedSlot : undefined
                    }
                    key={slot.key}
                    type="button"
                    aria-pressed={state.selection === slot.key}
                    onClick={() => {
                      setActiveMateriaIndex(null);
                      vm.select(slot.key);
                    }}
                  >
                    <ItemIcon item={equipped.item} />
                    <span>
                      <strong>{slot.name}</strong>
                      <span>
                        <ItemName item={equipped.item} sources={data.sources} />
                      </span>
                      <small>
                        {total ? `${filled} / ${total} 已镶嵌` : "无魔晶石孔"}
                      </small>
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
          <MeldEditor
            vm={vm}
            state={state}
            activeMateriaIndex={activeMateriaIndex}
            onOpenMateria={setActiveMateriaIndex}
            onCloseMateria={() => setActiveMateriaIndex(null)}
            onRemove={() => {
              vm.remove();
              onClose();
            }}
          />
        </div>
      </section>
    </div>,
    // Keep theme tokens inherited while escaping the editor's clipped workspace.
    document.querySelector(".app") ?? document.body,
  );
}
