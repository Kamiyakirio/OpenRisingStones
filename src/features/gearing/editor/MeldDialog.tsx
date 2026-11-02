/** Focused materia popup with Escape, backdrop close, and focus restoration. */

import {
  gearingControlClasses,
  gearingDialogBackdropClasses,
} from "../utilityClasses";
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
    selectedSlot.current?.scrollIntoView({
      block: "nearest",
    });
  }, [state.selection]);
  const { data, document: doc, evaluation } = state;
  if (!data || !doc) return null;
  const job = data.jobs.find((candidate) => candidate.id === doc.job);
  if (!job) return null;
  const slots = job.slots.flatMap((slot) => {
    const gear = doc.equipment[slot.key as Slot];
    const equipped = evaluation?.slots[slot.key];
    return gear && equipped
      ? [
          {
            slot,
            gear,
            equipped,
          },
        ]
      : [];
  });
  return createPortal(
    <div
      className={gearingDialogBackdropClasses}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className="gear-meld-dialog max-h-[calc(100dvh_-_48px)] w-[min(820px,_100%)] overflow-hidden rounded-overlay border border-solid border-line bg-surface shadow-[var(--ors-shadow-dialog)] max-[767px]:max-h-[calc(100dvh_-_24px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gear-meld-dialog-title"
        tabIndex={-1}
      >
        <header className="sticky top-0 z-1 flex min-h-14 items-center justify-between gap-4 border-b border-solid border-line bg-surface py-2 pr-3 pl-5">
          <h2 className="text-lg font-semibold" id="gear-meld-dialog-title">
            魔晶石镶嵌
          </h2>
          <button
            className="inline-flex min-h-10 w-10 items-center justify-center gap-1.5 rounded-control border-0 border-control bg-transparent p-0 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent pointer-coarse:min-h-11"
            aria-label="关闭镶嵌编辑"
            onClick={onClose}
          >
            <X className={gearingControlClasses.icon} />
          </button>
        </header>
        <div className="gear-meld-layout flex max-h-[calc(100dvh_-_105px)] flex-col max-[767px]:max-h-[calc(100dvh_-_81px)]">
          {slots.length > 1 && (
            <nav
              className="gear-meld-slots flex min-h-0 shrink-0 gap-1.5 overflow-x-auto border-b border-solid border-line px-3 py-2 max-[767px]:p-2"
              aria-label="选择要镶嵌的装备"
            >
              {slots.map(({ slot, gear, equipped }) => {
                const total = equipped.item.materiaAdvanced
                  ? 5
                  : (equipped.item.materiaSlot ?? 0);
                const filled = gear.materias.filter((meld) => meld.stat).length;
                return (
                  <button
                    className="grid min-h-17 flex-[0_0_220px] grid-cols-[40px_minmax(0,_1fr)] items-center justify-center gap-2.5 rounded-control border-0 border-control bg-transparent p-2.5 text-left text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent max-[767px]:basis-47.5"
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
                    <span className="grid min-w-0">
                      <strong>{slot.name}</strong>
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        <ItemName item={equipped.item} sources={data.sources} />
                      </span>
                      <small className="text-xs text-muted">
                        {total ? `${filled} / ${total} 已镶嵌` : "无魔晶石孔"}
                      </small>
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
          <MeldEditor
            layout="meld-layout"
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
