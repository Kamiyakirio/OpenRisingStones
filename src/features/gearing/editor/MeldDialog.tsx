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
      className={
        "gear-meld-backdrop gear-editor fixed grid place-items-center p-[24px] max-[767px]:p-[12px] mx-auto w-full max-w-[1600px] px-8 py-6 text-[15px] text-ink [&_*]:box-border [&_button]:min-h-10 [&_button]:rounded-lg [&_button]:border [&_button]:border-control [&_button]:bg-surface [&_button]:px-3 [&_button]:py-2 [&_select]:min-h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-control [&_select]:bg-surface [&_select]:px-3 [&_select]:py-2 [&_input:not([type=checkbox])]:min-h-10 [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-control [&_input:not([type=checkbox])]:bg-surface [&_input:not([type=checkbox])]:px-3 [&_input:not([type=checkbox])]:py-2 [&_button]:cursor-pointer [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[6px] [&_button:hover:not(:disabled)]:bg-hover [&_button:disabled]:cursor-default [&_button:disabled]:text-disabled [&_button[aria-pressed=true]]:text-accent [&_button[aria-pressed=true]]:bg-selected [&_input]:min-w-0 [&_select]:min-w-0 [&_svg]:w-[18px] [&_svg]:h-[18px] [&_h1]:m-0 [&_h2]:m-0 [&_p]:m-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:text-sm [&_h2]:font-semibold [&_label]:flex [&_label]:gap-[8px] [&_label]:items-center [&_small]:text-muted [&_table]:w-full [&_table]:tabular-nums [&_th]:border-b [&_th]:border-solid [&_th]:border-line [&_th]:text-right [&_th]:whitespace-nowrap [&_td]:border-b [&_td]:border-solid [&_td]:border-line [&_td]:text-right [&_td]:whitespace-nowrap [&_th]:text-muted [&_th]:font-normal [&_th:first-child]:text-left [&_td:first-child]:text-left [&_summary]:cursor-pointer [&_summary]:min-h-[28px] [@media(pointer:_coarse)]:[&_button]:min-h-[44px] [@media(pointer:_coarse)]:[&_select]:min-h-[44px] [@media(pointer:_coarse)]:[&_input:not([type=checkbox])]:min-h-[44px] [&_:is(_.gear-save-state,_.gear-context,_.gear-section-heading_>_span,_.gear-slot-label,_.gear-equipped-meta,_.gear-candidate-filters,_.gear-check,_.gear-item-description,_.gear-key-stats_dt,_.gear-muted,_.gear-footer,_.gear-apply-summary_)]:text-[13px] [&_th]:text-[13px] [&&&&]:inset-[0] [&&&&]:z-[30] [&&&&]:max-w-[none] [&&&&]:[background:rgb(31_29_26_/_0.54)] [@media(max-width:_767px)]:[&&&&]:[align-items:end] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline:2px_solid_var(--ors-color-accent)] [&&&&_:is(input,_select,_button,_a,_summary,_[tabindex]):focus-visible]:[outline-offset:2px] [&&&&_input]:[caret-color:var(--ors-color-accent)] [&&&&_select]:max-w-[100%] [&&&&_svg]:shrink-[0] [&&&&_table]:[border-collapse:collapse] [&&&&_th]:p-[12px_10px] [&&&&_td]:p-[12px_10px] [&&&&_details]:m-[12px_0] [&&&&_summary]:text-[0.8rem] [@media(max-width:_767px)]:[&&&&]:p-[12px_16px]"
      }
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={
          "gear-meld-dialog overflow-hidden border border-solid border-line rounded-[var(--ors-radius-overlay)] bg-surface [&_>_header]:sticky [&_>_header]:flex [&_>_header]:items-center [&_>_header]:justify-between [&_>_header]:gap-[16px] [&_>_header]:min-h-[56px] [&_>_header]:border-b [&_>_header]:border-solid [&_>_header]:border-line [&_>_header]:bg-surface [&_>_header_button]:w-[40px] [&_>_header_button]:p-0 [&_>_header_button]:border-0 [&&&&]:w-[min(820px,_100%)] [&&&&]:max-h-[calc(100dvh_-_48px)] [&&&&]:shadow-[var(--ors-shadow-dialog)] [&&&&_>_header]:top-[0] [&&&&_>_header]:z-[1] [&&&&_>_header]:p-[8px_12px_8px_20px] [&&&&_>_header_button]:[background:transparent] [@media(max-width:_767px)]:[&&&&]:max-h-[calc(100dvh_-_24px)]"
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="gear-meld-dialog-title"
        tabIndex={-1}
      >
        <header>
          <h2 className="text-lg font-semibold" id="gear-meld-dialog-title">
            魔晶石镶嵌
          </h2>
          <button aria-label="关闭镶嵌编辑" onClick={onClose}>
            <X />
          </button>
        </header>
        <div
          className={
            "gear-meld-layout flex flex-col [&&&&]:max-h-[calc(100dvh_-_105px)] [@media(max-width:_767px)]:[&&&&]:max-h-[calc(100dvh_-_81px)]"
          }
        >
          {slots.length > 1 && (
            <nav
              className={
                "gear-meld-slots flex gap-[6px] min-h-0 overflow-x-auto border-b border-solid border-line [&_>_button]:grid [&_>_button]:gap-[10px] [&_>_button]:items-center [&_>_button]:min-h-[68px] [&_>_button]:p-[10px] [&_>_button]:border-0 [&_>_button]:rounded-[var(--ors-radius-control)] [&_>_button]:text-left [&_>_button:hover]:bg-hover [&_>_button[aria-pressed=true]]:text-accent [&_>_button[aria-pressed=true]]:bg-selected [&_>_button_>_span]:grid [&_>_button_>_span]:min-w-0 [&_>_button_>_span_>_span]:overflow-hidden [&_>_button_>_span_>_span]:whitespace-nowrap [&_small]:text-muted [&_small]:text-xs max-[767px]:p-[8px] [&&&&]:flex-[0_0_auto] [&&&&]:p-[8px_12px] [&&&&_>_button]:grid-cols-[40px_minmax(0,_1fr)] [&&&&_>_button]:flex-[0_0_220px] [&&&&_>_button]:[background:transparent] [&&&&_>_button_>_span_>_span]:[text-overflow:ellipsis] [@media(max-width:_767px)]:[&&&&_>_button]:[flex-basis:190px]"
              }
              aria-label="选择要镶嵌的装备"
            >
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
