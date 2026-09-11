/** Single-item materia and custom-stat editing stays separate from gearset totals. */
import { LockSimple } from "@phosphor-icons/react";
import type { EditorState } from "./Editor";
import { ItemIcon } from "./ItemIcon";
import type { GearingViewModel } from "./ViewModel";
import type { Slot, Stat } from "./types";

export function MeldEditor({
  vm,
  state,
  onRemove,
}: {
  vm: GearingViewModel;
  state: EditorState;
  onRemove: () => void;
}) {
  const { data, document: doc, evaluation } = state;
  if (!data || !doc) return null;
  const job = data.jobs.find((candidate) => candidate.id === doc.job);
  const selected = evaluation?.slots[state.selection];
  const gear = doc.equipment[state.selection as Slot];
  if (!job || !selected || !gear) return null;
  const slotName =
    job.slots.find((slot) => slot.key === state.selection)?.name ??
    state.selection;

  return (
    <div className="gear-meld-editor" id="gearing-meld-editor">
      <div className="gear-meld-identity">
        <ItemIcon item={selected.item} />
        <span>
          <strong>{selected.item.name}</strong>
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
          锁定
        </button>
      </div>
      {selected.synced && (
        <p className="gear-muted">品级同步中，魔晶石不计入属性。</p>
      )}
      <div className="gear-meld-fields">
        {selected.allowedGrades?.map((grades, index) => (
          <label className="gear-meld-field" key={index}>
            <span>
              {index < (selected.item.materiaSlot ?? 0)
                ? `保证孔 ${index + 1}`
                : `禁断 ${index + 1 - (selected.item.materiaSlot ?? 0)}`}
            </span>
            <select
              aria-label={`魔晶石孔 ${index + 1}`}
              value={
                gear.materias[index]?.stat
                  ? `${gear.materias[index].stat}:${gear.materias[index].grade}`
                  : ""
              }
              onChange={(event) =>
                vm.configure(state.selection as Slot, (current) => {
                  const [stat, grade] = event.target.value.split(":");
                  while (current.materias.length <= index)
                    current.materias.push({});
                  current.materias[index] = stat
                    ? { stat: stat as Stat, grade: Number(grade) }
                    : {};
                })
              }
            >
              <option value="">空</option>
              {job.stats
                .filter((stat) => data.materias[stat])
                .map((stat) => (
                  <optgroup key={stat} label={data.statNames[stat]}>
                    {grades.map((grade) => (
                      <option key={grade} value={`${stat}:${grade}`}>
                        {data.statNames[stat]} +
                        {data.materias[stat]![grade - 1]} ·{" "}
                        {data.materiaGradeNames[grade - 1]}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </label>
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
                      [stat]: Number(event.target.value),
                    };
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
      <button className="gear-remove" onClick={onRemove}>
        移除当前装备
      </button>
    </div>
  );
}
