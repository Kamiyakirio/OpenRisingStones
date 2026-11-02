/** Single-item materia and custom-stat editing stays separate from gearset totals. */
import clsx from "clsx";
import { gearingControlClasses, gearingHintClasses } from "../utilityClasses";
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
  layout,
}: {
  vm: GearingViewModel;
  state: EditorState;
  activeMateriaIndex: number | null;
  onOpenMateria: (index: number) => void;
  onCloseMateria: () => void;
  onRemove: () => void;
  /** Explicit layout variants keep this component independent of ancestor classes. */
  layout?: "meld-layout";
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
    materia?: {
      stat: Stat;
      grade: number;
    },
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
        className={clsx(
          "gear-meld-editor gear-materia-picker p-5 max-[767px]:p-4",
          layout === "meld-layout" && "min-h-0 flex-[1_1_auto] overflow-y-auto",
        )}
      >
        <header className="gear-materia-picker-heading flex items-center gap-3 border-b border-solid border-line pb-4 max-[767px]:flex-wrap max-[767px]:items-start">
          <button
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-control bg-surface px-2.5 py-1.5 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected"
            type="button"
            aria-label="返回镶嵌面板"
            onClick={onCloseMateria}
          >
            <ArrowLeft className={gearingControlClasses.icon} />
            返回
          </button>
          <span className="grid flex-1 gap-0.5 max-[767px]:min-w-35">
            <h2 className="m-0 text-base font-semibold">选择魔晶石</h2>
            <small className="text-xs text-muted">
              {slotName} · {slotLabel}
            </small>
          </span>
          <button
            type="button"
            className="gear-materia-clear inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-control border border-solid border-control bg-surface px-2.5 py-1.5 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:font-semibold aria-pressed:text-accent"
            aria-pressed={!current?.stat}
            onClick={() => configureMateria(activeMateriaIndex)}
          >
            清空此孔
          </button>
        </header>
        <div className="gear-materia-picker-groups mt-3 grid gap-0">
          {job.stats
            .filter((stat) => data.materias[stat])
            .map((stat) => (
              <section
                className="grid grid-cols-[88px_minmax(0,_1fr)] items-center gap-3 border-b border-solid border-line px-0 py-2.5 max-[767px]:grid-cols-[68px_minmax(0,_1fr)]"
                key={stat}
              >
                <h3 className="m-0 text-xs font-semibold text-muted">
                  {data.statNames[stat]}
                </h3>
                <div className="flex min-w-0 gap-2 overflow-x-auto p-0.5">
                  {grades.map((grade) => (
                    <button
                      className="grid min-h-11 flex-[0_0_108px] grid-cols-[18px_auto_auto_16px] items-center justify-center gap-2 rounded-control border border-solid border-control bg-transparent px-2.5 py-2 text-left text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:font-semibold aria-pressed:text-accent"
                      key={grade}
                      type="button"
                      aria-label={`${data.statNames[stat]} +${data.materias[stat]![grade - 1]}，${data.materiaGradeNames[grade - 1]}`}
                      aria-pressed={
                        current?.stat === stat && current.grade === grade
                      }
                      title={`${data.statNames[stat]} +${data.materias[stat]![grade - 1]} · ${data.materiaGradeNames[grade - 1]}`}
                      onClick={() =>
                        configureMateria(activeMateriaIndex, {
                          stat,
                          grade,
                        })
                      }
                    >
                      <Diamond
                        className="gear-materia-gem h-4.5 w-4.5 shrink-0 text-accent"
                        weight={
                          current?.stat === stat && current.grade === grade
                            ? "fill"
                            : "regular"
                        }
                        aria-hidden="true"
                      />
                      <strong className="text-sm tabular-nums">
                        +{data.materias[stat]![grade - 1]}
                      </strong>
                      <small className="text-xs whitespace-nowrap text-muted">
                        {data.materiaGradeNames[grade - 1]}
                      </small>
                      {current?.stat === stat && current.grade === grade && (
                        <Check
                          className="gear-materia-check h-4.5 w-4.5 shrink-0 text-accent"
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
      className={clsx(
        "gear-meld-editor p-5 max-[767px]:p-4",
        layout === "meld-layout" && "min-h-0 flex-[1_1_auto] overflow-y-auto",
      )}
      id="gearing-meld-editor"
    >
      <div className="gear-meld-identity grid grid-cols-[40px_minmax(0,_1fr)_auto] items-center gap-3 border-b border-solid border-line px-0 pt-0 pb-4">
        <ItemIcon item={selected.item} />
        <span className="nth-[2]:grid nth-[2]:min-w-0">
          <strong className="[overflow-wrap:anywhere]">
            <ItemName item={selected.item} sources={data.sources} />
          </strong>
          <small className="text-xs font-normal text-muted">
            {slotName} · i{selected.item.level}
          </small>
        </span>
        <button
          className={gearingControlClasses.button}
          aria-pressed={gear.materiaLocked}
          title="优化时保留当前魔晶石和自定义属性"
          onClick={() =>
            vm.configure(state.selection as Slot, (current) => {
              current.materiaLocked = !current.materiaLocked;
            })
          }
        >
          <LockSimple
            className={gearingControlClasses.icon}
            weight={gear.materiaLocked ? "fill" : "regular"}
          />
          {gear.materiaLocked ? "已锁定镶嵌" : "锁定镶嵌"}
        </button>
      </div>
      {selected.synced && (
        <p className={gearingHintClasses}>品级同步中，魔晶石不计入属性。</p>
      )}
      <h2 className="gear-meld-heading mx-0 mt-5 mb-0 text-base font-semibold">
        魔晶石与自定义属性
      </h2>
      <div className="gear-meld-fields mt-3 flex gap-2.5 overflow-x-auto pb-1">
        {selected.allowedGrades?.map((_, index) => (
          <div
            className="gear-meld-field grid flex-[1_0_140px] content-start gap-1.5 text-xs max-[767px]:basis-37.5"
            key={index}
          >
            <span>
              {index < (selected.item.materiaSlot ?? 0)
                ? `保证孔 ${index + 1}`
                : `禁断 ${index + 1 - (selected.item.materiaSlot ?? 0)}`}
            </span>
            <button
              className="flex min-h-16 items-center justify-between gap-3 rounded-control border border-solid border-control bg-surface px-3 py-2 text-left text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected"
              ref={(element) => {
                fieldRefs.current[index] = element;
              }}
              type="button"
              aria-label={`魔晶石孔 ${index + 1}`}
              onClick={() => onOpenMateria(index)}
            >
              <span className="gear-meld-value grid grid-cols-[18px_minmax(0,_1fr)] items-center gap-0.5">
                <Diamond
                  className="row-[1_/_span_2] h-4.5 w-4.5 shrink-0 text-accent"
                  weight={gear.materias[index]?.stat ? "fill" : "regular"}
                  aria-hidden="true"
                />
                <strong>
                  {gear.materias[index]?.stat
                    ? data.statNames[gear.materias[index].stat!]
                    : "空"}
                </strong>
                {gear.materias[index]?.stat && (
                  <small className="col-start-2 text-xs text-muted">
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
              <CaretRight className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      {selected.item.customizable && (
        <div className="gear-custom-stats mt-3 grid gap-2">
          <p className={gearingHintClasses}>
            {selected.customRule
              ? `分配：两项 ${selected.customRule.major}，另一项 ${selected.customRule.minor}`
              : "手动填写已确认的自定义属性。"}
          </p>
          {(
            selected.customRule?.stats ??
            job.stats.filter((stat) => data.materias[stat])
          ).map((stat) => (
            <label
              className="flex items-center justify-between gap-2"
              key={stat}
            >
              {data.statNames[stat]}
              <input
                className="min-h-10 w-25 min-w-0 rounded-control border border-solid border-control bg-surface px-3 py-2 text-ink pointer-coarse:min-h-11"
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
        <p className={gearingHintClasses}>此装备没有可编辑的魔晶石孔。</p>
      )}
      <details className="gear-meld-stat-details border-t border-solid border-line pt-3">
        <summary className="font-semibold">查看装备属性</summary>
        <section
          className="gear-meld-stats mt-3 overflow-x-auto"
          aria-label="此装备属性"
          aria-busy={state.evaluating}
        >
          <table className={gearingControlClasses.table}>
            <thead>
              <tr>
                <th className={gearingControlClasses.th}>属性</th>
                <th className={gearingControlClasses.th}>基础</th>
                <th className={gearingControlClasses.th}>当前生效</th>
                <th className={gearingControlClasses.th}>镶嵌上限</th>
              </tr>
            </thead>
            <tbody>
              {detailStats.map((stat) => (
                <tr key={stat}>
                  <th className={gearingControlClasses.th}>
                    {data.statNames[stat] ?? stat}
                  </th>
                  <td className={gearingControlClasses.td}>
                    {selected.item.stats[stat] ?? 0}
                  </td>
                  <td className={gearingControlClasses.td}>
                    {state.evaluating ? "…" : (selected.stats?.[stat] ?? 0)}
                  </td>
                  <td className={gearingControlClasses.td}>
                    {!selected.synced && data.materias[stat]
                      ? (selected.caps?.[stat] ?? "—")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={gearingHintClasses}>
            当前生效包含自定义属性、魔晶石与品级同步的影响。同步时魔晶石不生效。
          </p>
        </section>
      </details>
      <button
        className="gear-remove mt-4 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-solid border-control bg-surface px-3 py-2 text-inherit transition-[background-color,color,border-color] duration-120 ease-[ease] enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:bg-selected aria-pressed:text-accent aria-pressed:enabled:hover:bg-selected pointer-coarse:min-h-11"
        onClick={onRemove}
      >
        移除当前装备
      </button>
    </div>
  );
}
