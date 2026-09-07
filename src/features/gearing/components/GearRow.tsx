/** Gearing UI adapted from ffxiv-gearing (MIT), scoped to the gearing workspace. */
import * as React from "react";
import * as mobxReact from "mobx-react-lite";
import classNames from "clsx";
import { TextField } from "./Controls.tsx";
import * as G from "../utils/game.ts";
import type { IGearUnion } from "../models/index.ts";
import { useStore } from "./contexts.tsx";
import { Icon } from "./Icon.tsx";
import { IconButton } from "./IconButton.tsx";
import { Dropdown } from "./Dropdown.tsx";
import { GearMenu } from "./GearMenu.tsx";
import { Materia } from "./Materia.tsx";

export const GearRow = mobxReact.observer<{
  gear?: IGearUnion;
  slot?: G.SlotSchema;
  isGroupEnd?: boolean;
}>(({ gear, slot, isGroupEnd }) => {
  const store = useStore();
  return gear === undefined ? (
    slot?.levelWeight === 0 ? null : (
      <tr className={classNames("gears_item", isGroupEnd && "-group-end")}>
        <td className="gears_left">
          {slot !== undefined && (
            <span className="gears_inline-slot">
              {(slot.shortName ?? slot.name).slice(0, 2)}
            </span>
          )}
          <span className="gears_empty">
            {store.isViewing ? "无装备" : "无匹配"}
          </span>
        </td>
        <td className="gears_materias" />
        <td colSpan={store.schema.stats.length} />
      </tr>
    )
  ) : (
    <tr
      data-id={gear.id}
      tabIndex={store.isViewing ? undefined : 0}
      aria-selected={gear.isEquipped}
      onKeyDown={(event) => {
        if (
          !store.isViewing &&
          event.target === event.currentTarget &&
          ["Enter", " "].includes(event.key)
        ) {
          event.preventDefault();
          store.equip(gear);
        }
      }}
      className={classNames(
        "gears_item",
        gear.isFood && "-food",
        !store.isViewing && gear.isEquipped && "-selected",
        isGroupEnd && "-group-end",
        !gear.isFood && gear.syncedLevel !== undefined && "-synced",
      )}
      onClick={
        store.isViewing
          ? undefined
          : (e) => {
              // when dropdown open, clicking on a row usually intends to close dropdown
              if (
                (e.nativeEvent as MouseEvent & { _isClosingDropdown?: boolean })
                  ._isClosingDropdown
              )
                return;
              // when input just lost focus, this click probably intends to cancel focus
              if (e.timeStamp - lastInputBlurTime < 200) return;
              store.equip(gear);
            }
      }
    >
      <td className={classNames("gears_left", `gears_color-${gear.color}`)}>
        {!gear.isFood && store.gcdOptimizationGearSelectionActive && (
          <span
            className="gears_optimization-checkbox-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="gears_optimization-checkbox"
              type="checkbox"
              aria-label={`${gear.name}计入副属性计算`}
              checked={store.gcdOptimizationSelectedGearIds.includes(gear.id)}
              onChange={() => store.toggleGcdOptimizationGearSelection(gear.id)}
            />
          </span>
        )}
        {slot !== undefined && (
          <span className="gears_inline-slot">
            {(slot.shortName ?? slot.name).slice(0, 2)}
          </span>
        )}
        {store.setting.gearDisplayName === "source" &&
        !gear.isFood &&
        gear.source ? (
          <span className="gears_name" title={gear.name}>
            {gear.source}
          </span>
        ) : (
          <span className="gears_name" title={gear.name}>
            {gear.name}
            {gear.hq && <Icon className="gears_hq" name="hq" />}
          </span>
        )}
        <Dropdown
          label={({ ref, toggle }) => (
            <IconButton
              ref={ref}
              className="gears_more"
              icon="more"
              onClick={toggle}
            />
          )}
          popper={({ toggle }) => <GearMenu gear={gear} toggle={toggle} />}
          placement="bottom-end"
        />
        <span className="gears_level">il{gear.level}</span>
      </td>
      <td className="gears_materias">
        {!gear.isFood && (
          <div className="gears_materia-slots">
            {gear.materias.map((materia, i) => (
              <Materia key={i} materia={materia} />
            ))}
          </div>
        )}
        {gear.isFood &&
          (store.isViewing ? (
            <span className="gears_food-utilization">
              利用率{gear.utilization}%
            </span>
          ) : (
            <span
              className={classNames(
                "gears_food-utilization",
                gear.utilization === 100 && "-full",
              )}
              style={{ opacity: gear.utilizationOpacity }}
            >
              {gear.utilization}%
            </span>
          ))}
        {!gear.isFood && gear.syncedLevel !== undefined && (
          <div className="gears_materias-synced">
            <Icon name="sync" />
          </div>
        )}
      </td>
      {store.schema.stats.map((stat) => (
        <td
          key={stat}
          className={classNames(
            "gears_stat",
            store.schema.skeletonGears && "-skeleton",
          )}
        >
          {!store.isViewing &&
          !gear.isFood &&
          gear.customizable &&
          !(stat in gear.bareStats) &&
          (stat !== "DHT" ||
            gear.equipLevel <= 60 ||
            store.schema.stats.length < 7) ? (
            <CustomStatInput
              displayValue={gear.stats[stat]}
              editValue={gear.customStats!.get(stat)}
              onChange={(value) => gear.setCustomStat(stat, value)}
            />
          ) : (
            <span
              className={classNames(
                "gears_stat-value",
                gear.statHighlights[stat] && "-full",
                store.schema.skeletonGears &&
                  !gear.isFood &&
                  gear.slot !== 17 &&
                  "-skeleton",
              )}
              children={
                (gear.isFood ||
                gear.customizable ||
                gear.syncedLevel !== undefined ||
                store.setting.displayMeldedStats
                  ? gear.stats
                  : gear.bareStats)[stat]
              }
            />
          )}
          {store.schema.skeletonGears &&
            !gear.isFood &&
            gear.materias.length > 0 && (
              <span className="gears_stat-caps">/{gear.caps[stat]}</span>
            )}
          {!store.isViewing &&
            stat !== "VIT" &&
            gear.isFood &&
            gear.requiredStats[stat] && (
              <span
                className={classNames(
                  "gears_stat-requirement",
                  store.equippedStatsWithoutFood[stat]! >=
                    gear.requiredStats[stat]! && "-enough",
                )}
              >
                {gear.requiredStats[stat]}+
              </span>
            )}
        </td>
      ))}
    </tr>
  );
});

const CustomStatInput = mobxReact.observer<{
  displayValue: number | undefined;
  editValue: number | undefined;
  onChange: (value: number) => void;
}>(({ displayValue, editValue, onChange }) => {
  const [inputValue, setInputValue] = React.useState(
    displayValue?.toString() ?? "",
  );
  const [prevDisplayValue, setPrevDisplayValue] = React.useState(displayValue);
  if (displayValue !== prevDisplayValue) {
    setInputValue(displayValue?.toString() ?? "");
    setPrevDisplayValue(displayValue);
  }
  return (
    <TextField
      className="gears_custom-stat-input mdc-text-field--compact"
      value={inputValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
      }}
      onFocus={(e) => {
        e.target.value = editValue?.toString() ?? "";
        setInputValue(e.target.value);
        e.target.select();
      }}
      onBlur={() => {
        setPrevDisplayValue(-1);
        onChange(parseInt(inputValue, 10));
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onKeyPress={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
});

let lastInputBlurTime = 0;
export function trackGearingInputBlur(e: React.FocusEvent) {
  if ((e.target as Element)?.tagName === "INPUT") {
    lastInputBlurTime = e.timeStamp;
  }
}
