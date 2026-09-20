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
      <div className="gear-meld-editor gear-materia-picker">
        <header className="gear-materia-picker-heading">
          <button
            type="button"
            aria-label="返回镶嵌面板"
            onClick={onCloseMateria}
          >
            <ArrowLeft />
            返回
          </button>
          <span>
            <h2>选择魔晶石</h2>
            <small>
              {slotName} · {slotLabel}
            </small>
          </span>
          <button
            type="button"
            className="gear-materia-clear"
            aria-pressed={!current?.stat}
            onClick={() => configureMateria(activeMateriaIndex)}
          >
            清空此孔
          </button>
        </header>
        <div className="gear-materia-picker-groups">
          {job.stats
            .filter((stat) => data.materias[stat])
            .map((stat) => (
              <section key={stat}>
                <h3>{data.statNames[stat]}</h3>
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
                        className="gear-materia-gem"
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
                        <Check className="gear-materia-check" weight="bold" />
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
    <div className="gear-meld-editor" id="gearing-meld-editor">
      <div className="gear-meld-identity">
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
        <p className="gear-muted">品级同步中，魔晶石不计入属性。</p>
      )}
      <h2 className="gear-meld-heading">魔晶石与自定义属性</h2>
      <div className="gear-meld-fields">
        {selected.allowedGrades?.map((_, index) => (
          <div className="gear-meld-field" key={index}>
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
              <span className="gear-meld-value">
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
        <div className="gear-custom-stats">
          <p className="gear-muted">
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
        <p className="gear-muted">此装备没有可编辑的魔晶石孔。</p>
      )}
      <details className="gear-meld-stat-details">
        <summary>查看装备属性</summary>
        <section
          className="gear-meld-stats"
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
          <p className="gear-muted">
            当前生效包含自定义属性、魔晶石与品级同步的影响。同步时魔晶石不生效。
          </p>
        </section>
      </details>
      <button className="gear-remove" onClick={onRemove}>
        移除当前装备
      </button>
    </div>
  );
}
