/** Single-item materia and custom-stat editing stays separate from gearset totals. */
import {
  ArrowLeft,
  CaretRight,
  Check,
  Diamond,
  LockSimple,
} from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import type { EditorState } from "./Editor";
import { ItemIcon } from "./ItemIcon";
import { ItemName } from "./ItemName";
import type { GearingViewModel } from "./ViewModel";
import type { Slot, Stat } from "./types";

export function MeldEditor({
  vm,
  state,
  activeMateriaIndex,
  onOpenMateria,
  onCloseMateria,
  onRemove,
}: {
  vm: GearingViewModel;
  state: EditorState;
  activeMateriaIndex: number | null;
  onOpenMateria: (index: number) => void;
  onCloseMateria: () => void;
  onRemove: () => void;
}) {
  const fieldRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const previousMateriaIndex = useRef(activeMateriaIndex);
  useEffect(() => {
    const previous = previousMateriaIndex.current;
    previousMateriaIndex.current = activeMateriaIndex;
    if (previous !== null && activeMateriaIndex === null)
      requestAnimationFrame(() => fieldRefs.current[previous]?.focus());
  }, [activeMateriaIndex]);
  const { data, document: doc, evaluation } = state;
  if (!data || !doc) return null;
  const job = data.jobs.find((candidate) => candidate.id === doc.job);
  const selected = evaluation?.slots[state.selection];
  const gear = doc.equipment[state.selection as Slot];
  if (!job || !selected || !gear) return null;
  const slotName =
    job.slots.find((slot) => slot.key === state.selection)?.name ??
    state.selection;

  // Include weapon performance and main stats as well as available materia stats.
  const detailStats = [
    ...new Set([
      ...Object.keys(selected.item.stats),
      ...Object.keys(selected.stats ?? {}),
      ...job.stats.filter((stat) => data.materias[stat]),
    ]),
  ].filter((stat) => stat !== "main" && stat !== "secondary") as Stat[];

  const configureMateria = (
    index: number,
    materia?: { stat: Stat; grade: number },
  ) => {
    vm.configure(state.selection as Slot, (current) => {
      while (current.materias.length <= index) current.materias.push({});
      current.materias[index] = materia ?? {};
    });
    onCloseMateria();
  };

  if (activeMateriaIndex !== null) {
    const grades = selected.allowedGrades?.[activeMateriaIndex] ?? [];
    const guaranteedSlots = selected.item.materiaSlot ?? 0;
    const slotLabel =
      activeMateriaIndex < guaranteedSlots
        ? `保证孔 ${activeMateriaIndex + 1}`
        : `禁断 ${activeMateriaIndex + 1 - guaranteedSlots}`;
    const current = gear.materias[activeMateriaIndex];
    return (
      <div
        className={
          "gear-meld-editor gear-materia-picker p-[20px] [.gear-meld-layout_>_&]:min-h-0 [.gear-meld-layout_>_&]:overflow-y-auto max-[767px]:p-[16px] [&_button_small]:text-muted [&_button_small]:text-xs [.gear-meld-layout_>_&&&&]:flex-[1_1_auto]"
        }
      >
        <header
          className={
            "gear-materia-picker-heading flex items-center gap-[12px] pb-[16px] border-b border-solid border-line [&_>_button]:inline-flex [&_>_button]:items-center [&_>_button]:gap-[6px] [&_>_button]:min-h-[40px] [&_>_span]:grid [&_>_span]:gap-[2px] [&_h2]:m-0 [&_h2]:text-base [&_small]:text-muted [&_small]:text-xs max-[767px]:items-start max-[767px]:flex-wrap max-[767px]:[&_>_span]:min-w-[140px] [&&&&_>_button]:p-[6px_10px] [&&&&_>_span]:flex-[1]"
          }
        >
          <button
            type="button"
            aria-label="返回镶嵌面板"
            onClick={onCloseMateria}
          >
            <ArrowLeft />
            返回
          </button>
          <span>
            <h2 className="text-lg font-semibold">选择魔晶石</h2>
            <small>
              {slotName} · {slotLabel}
            </small>
          </span>
          <button
            type="button"
            className={
              "gear-materia-clear min-h-[40px] [&:hover]:bg-hover [&[aria-pressed=true]]:text-accent [&[aria-pressed=true]]:bg-selected [&[aria-pressed=true]]:font-semibold [&&&&]:flex-[0_0_auto] [&&&&]:p-[6px_10px]"
            }
            aria-pressed={!current?.stat}
            onClick={() => configureMateria(activeMateriaIndex)}
          >
            清空此孔
          </button>
        </header>
        <div
          className={
            "gear-materia-picker-groups [&_button]:grid [&_button]:items-center [&_button]:gap-[8px] [&_button]:min-h-[44px] [&_button]:border [&_button]:border-solid [&_button]:border-control [&_button]:rounded-[var(--ors-radius-control)] [&_button]:text-left [&_button:hover]:bg-hover [&_button[aria-pressed=true]]:text-accent [&_button[aria-pressed=true]]:bg-selected [&_button[aria-pressed=true]]:font-semibold [&_button_strong]:text-sm [&_button_strong]:tabular-nums [&_button_small]:whitespace-nowrap grid gap-0 mt-[12px] [&_section]:grid [&_section]:gap-[12px] [&_section]:items-center [&_section]:border-b [&_section]:border-solid [&_section]:border-line [&_h3]:m-0 [&_h3]:text-muted [&_h3]:text-xs [&_h3]:font-semibold [&_section_>_div]:flex [&_section_>_div]:gap-[8px] [&_section_>_div]:min-w-0 [&_section_>_div]:overflow-x-auto [&_section_>_div]:p-[2px] [&&&&_button]:grid-cols-[18px_auto_auto_16px] [&&&&_button]:flex-[0_0_108px] [&&&&_button]:p-[8px_10px] [&&&&_button]:[background:transparent] [&&&&_section]:grid-cols-[88px_minmax(0,_1fr)] [&&&&_section]:p-[10px_0] [@media(max-width:_767px)]:[&&&&_section]:grid-cols-[68px_minmax(0,_1fr)]"
          }
        >
          {job.stats
            .filter((stat) => data.materias[stat])
            .map((stat) => (
              <section key={stat}>
                <h3 className="text-base font-semibold">
                  {data.statNames[stat]}
                </h3>
                <div>
                  {grades.map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      aria-label={`${data.statNames[stat]} +${data.materias[stat]![grade - 1]}，${data.materiaGradeNames[grade - 1]}`}
                      aria-pressed={
                        current?.stat === stat && current.grade === grade
                      }
                      title={`${data.statNames[stat]} +${data.materias[stat]![grade - 1]} · ${data.materiaGradeNames[grade - 1]}`}
                      onClick={() =>
                        configureMateria(activeMateriaIndex, { stat, grade })
                      }
                    >
                      <Diamond
                        className="gear-materia-gem text-accent"
                        weight={
                          current?.stat === stat && current.grade === grade
                            ? "fill"
                            : "regular"
                        }
                        aria-hidden="true"
                      />
                      <strong>+{data.materias[stat]![grade - 1]}</strong>
                      <small>{data.materiaGradeNames[grade - 1]}</small>
                      {current?.stat === stat && current.grade === grade && (
                        <Check
                          className="gear-materia-check text-accent"
                          weight="bold"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        "gear-meld-editor p-[20px] [.gear-meld-layout_>_&]:min-h-0 [.gear-meld-layout_>_&]:overflow-y-auto max-[767px]:p-[16px] [.gear-meld-layout_>_&&&&]:flex-[1_1_auto]"
      }
      id="gearing-meld-editor"
    >
      <div
        className={
          "gear-meld-identity grid items-center gap-[12px] border-b border-solid border-line [&_>_span:nth-child(2)]:grid [&_>_span:nth-child(2)]:min-w-0 [&_small]:text-muted [&_small]:text-xs [&_small]:font-normal [&&&&]:grid-cols-[40px_minmax(0,_1fr)_auto] [&&&&]:p-[0_0_16px] [&&&&_strong]:[overflow-wrap:anywhere]"
        }
      >
        <ItemIcon item={selected.item} />
        <span>
          <strong>
            <ItemName item={selected.item} sources={data.sources} />
          </strong>
          <small>
            {slotName} · i{selected.item.level}
          </small>
        </span>
        <button
          aria-pressed={gear.materiaLocked}
          title="优化时保留当前魔晶石和自定义属性"
          onClick={() =>
            vm.configure(state.selection as Slot, (current) => {
              current.materiaLocked = !current.materiaLocked;
            })
          }
        >
          <LockSimple weight={gear.materiaLocked ? "fill" : "regular"} />
          {gear.materiaLocked ? "已锁定镶嵌" : "锁定镶嵌"}
        </button>
      </div>
      {selected.synced && (
        <p className={"gear-muted text-muted text-xs [&&&&]:leading-[1.7]"}>
          品级同步中，魔晶石不计入属性。
        </p>
      )}
      <h2
        className={
          "font-semibold gear-meld-heading text-base [&&&&]:m-[20px_0_0]"
        }
      >
        魔晶石与自定义属性
      </h2>
      <div className="gear-meld-fields flex gap-[10px] mt-[12px] pb-[4px] overflow-x-auto">
        {selected.allowedGrades?.map((_, index) => (
          <div
            className={
              "gear-meld-field [.gear-meld-fields_&]:grid [.gear-meld-fields_&]:gap-[6px] [.gear-meld-fields_&]:text-xs [&_>_button]:flex [&_>_button]:items-center [&_>_button]:justify-between [&_>_button]:gap-[12px] [&_>_button]:min-h-[64px] [&_>_button]:text-left [&_>_button_>_span]:grid [&_>_button_>_span]:gap-[2px] [&_>_button_small]:text-muted [&_>_button_small]:text-xs [.gear-meld-fields_&&&&]:flex-[1_0_140px] [.gear-meld-fields_&&&&]:[align-content:start] [&&&&_>_button]:p-[8px_12px] [&&&&_>_button_svg]:flex-[0_0_auto] [@media(max-width:_767px)]:[.gear-meld-fields_&&&&]:[flex-basis:150px]"
            }
            key={index}
          >
            <span>
              {index < (selected.item.materiaSlot ?? 0)
                ? `保证孔 ${index + 1}`
                : `禁断 ${index + 1 - (selected.item.materiaSlot ?? 0)}`}
            </span>
            <button
              ref={(element) => {
                fieldRefs.current[index] = element;
              }}
              type="button"
              aria-label={`魔晶石孔 ${index + 1}`}
              onClick={() => onOpenMateria(index)}
            >
              <span
                className={
                  "gear-meld-value items-center [&_>_svg]:text-accent [&&&&]:grid-cols-[18px_minmax(0,_1fr)] [&&&&_>_svg]:[grid-row:1_/_span_2] [&&&&_>_small]:[grid-column:2]"
                }
              >
                <Diamond
                  weight={gear.materias[index]?.stat ? "fill" : "regular"}
                  aria-hidden="true"
                />
                <strong>
                  {gear.materias[index]?.stat
                    ? data.statNames[gear.materias[index].stat!]
                    : "空"}
                </strong>
                {gear.materias[index]?.stat && (
                  <small>
                    +
                    {
                      data.materias[gear.materias[index].stat!]![
                        gear.materias[index].grade! - 1
                      ]
                    }{" "}
                    ·{" "}
                    {data.materiaGradeNames[gear.materias[index].grade! - 1] ??
                      ""}
                  </small>
                )}
              </span>
              <CaretRight aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      {selected.item.customizable && (
        <div className="gear-custom-stats grid gap-[8px] mt-[12px] [&_label]:justify-between [&_input]:w-[100px]">
          <p className={"gear-muted text-muted text-xs [&&&&]:leading-[1.7]"}>
            {selected.customRule
              ? `分配：两项 ${selected.customRule.major}，另一项 ${selected.customRule.minor}`
              : "手动填写已确认的自定义属性。"}
          </p>
          {(
            selected.customRule?.stats ??
            job.stats.filter((stat) => data.materias[stat])
          ).map((stat) => (
            <label key={stat}>
              {data.statNames[stat]}
              <input
                type="number"
                min={0}
                max={1000}
                value={gear.customStats?.[stat] ?? 0}
                onChange={(event) =>
                  vm.configure(state.selection as Slot, (current) => {
                    current.customStats = {
                      ...current.customStats,
                      [stat]: Math.min(
                        1000,
                        Math.max(0, Math.trunc(Number(event.target.value))),
                      ),
                    };
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
      {!selected.allowedGrades?.length && !selected.item.customizable && (
        <p className={"gear-muted text-muted text-xs [&&&&]:leading-[1.7]"}>
          此装备没有可编辑的魔晶石孔。
        </p>
      )}
      <details className="gear-meld-stat-details pt-[12px] border-t border-solid border-line [&_>_summary]:font-semibold">
        <summary>查看装备属性</summary>
        <section
          className="gear-meld-stats mt-[12px] overflow-x-auto"
          aria-label="此装备属性"
          aria-busy={state.evaluating}
        >
          <table>
            <thead>
              <tr>
                <th>属性</th>
                <th>基础</th>
                <th>当前生效</th>
                <th>镶嵌上限</th>
              </tr>
            </thead>
            <tbody>
              {detailStats.map((stat) => (
                <tr key={stat}>
                  <th>{data.statNames[stat] ?? stat}</th>
                  <td>{selected.item.stats[stat] ?? 0}</td>
                  <td>
                    {state.evaluating ? "…" : (selected.stats?.[stat] ?? 0)}
                  </td>
                  <td>
                    {!selected.synced && data.materias[stat]
                      ? (selected.caps?.[stat] ?? "—")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={"gear-muted text-muted text-xs [&&&&]:leading-[1.7]"}>
            当前生效包含自定义属性、魔晶石与品级同步的影响。同步时魔晶石不生效。
          </p>
        </section>
      </details>
      <button
        className="gear-remove [.gear-editor_&]:mt-[16px]"
        onClick={onRemove}
      >
        移除当前装备
      </button>
    </div>
  );
}
