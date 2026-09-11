/** Tiny synthetic game sheets generated in memory for converter tests. */
import Papa from "papaparse";
import * as game from "../../scripts/gearing/config/game.mjs";
import { statColumns } from "../../scripts/gearing/csv.mjs";
// Build a tiny fictional data set in memory; no exported game CSV records are retained.
export function fixture() {
  const indexed = (names, count) =>
    Array.from({ length: count }, (_, i) =>
      names.map((name) => `${name}[${i}]`),
    ).flat();
  const table = (columns, rows) => {
    const fields = ["#", ...columns];
    return Papa.unparse({
      fields,
      data: rows.map((row) => fields.map((field) => row[field] ?? 0)),
    });
  };
  const jobs = Object.keys(game.jobSchemas);
  const category = (id, allowed) => ({
    "#": id,
    ...Object.fromEntries(
      jobs.map((job) => [job, allowed.includes(job) ? "True" : "False"]),
    ),
  });
  const healer = ["WHM", "SCH", "AST", "SGE"];
  const casters = [...healer, "BLM", "SMN", "RDM", "PCT", "BLU"];
  const itemFields = [
    "Name",
    "Icon",
    "Description",
    "LevelItem",
    "Rarity",
    "EquipSlotCategory",
    "BaseParamModifier",
    "ClassJobCategory",
    "LevelEquip",
    "MateriaSlotCount",
    "IsAdvancedMeldingPermitted",
    "CanBeHq",
    "DamagePhys",
    "DamageMag",
    "Delayms",
    "ItemSpecialBonus",
    "ItemAction",
    ...indexed(
      [
        "BaseParam",
        "BaseParamValue",
        "BaseParamSpecial",
        "BaseParamValueSpecial",
      ],
      6,
    ),
  ];
  const item = (id, fields) => ({
    "#": id,
    Name: `Fixture ${id}`,
    Description: "",
    Icon: 10_000 + id,
    CanBeHq: "False",
    IsAdvancedMeldingPermitted: "False",
    ...fields,
  });
  const items = [
    item(101, {
      LevelItem: 5,
      Rarity: 1,
      EquipSlotCategory: 3,
      BaseParamModifier: 8,
      ClassJobCategory: 31,
      LevelEquip: 5,
      "BaseParam[0]": 4,
      "BaseParamValue[0]": 1,
      "BaseParam[1]": 5,
      "BaseParamValue[1]": 1,
    }),
    item(102, {
      LevelItem: 780,
      Rarity: 2,
      EquipSlotCategory: 13,
      BaseParamModifier: 6,
      ClassJobCategory: 64,
      LevelEquip: 100,
      MateriaSlotCount: 2,
      CanBeHq: "True",
      DamageMag: 50,
      "BaseParam[0]": 3,
      "BaseParamValue[0]": 100,
      "BaseParam[1]": 5,
      "BaseParamValue[1]": 90,
      "BaseParam[2]": 6,
      "BaseParamValue[2]": 6,
      "BaseParam[3]": 44,
      "BaseParamValue[3]": 16,
      "BaseParamSpecial[0]": 3,
      "BaseParamValueSpecial[0]": 20,
      "BaseParamSpecial[1]": 5,
      "BaseParamValueSpecial[1]": 10,
      "BaseParamSpecial[2]": 6,
      "BaseParamValueSpecial[2]": 4,
      "BaseParamSpecial[3]": 44,
      "BaseParamValueSpecial[3]": 8,
      "BaseParamSpecial[4]": 13,
      "BaseParamValueSpecial[4]": 2,
    }),
    item(103, {
      LevelItem: 795,
      Rarity: 4,
      EquipSlotCategory: 13,
      BaseParamModifier: 6,
      ClassJobCategory: 64,
      LevelEquip: 100,
      DamageMag: 50,
      "BaseParam[0]": 3,
      "BaseParamValue[0]": 100,
      "BaseParam[1]": 5,
      "BaseParamValue[1]": 100,
    }),
    item(104, { LevelItem: 770, CanBeHq: "True", ItemAction: 1 }),
  ];
  const foodFields = indexed(
    ["BaseParam", "IsRelative", "ValueHQ", "MaxHQ"],
    3,
  );
  const food = { "#": 1 };
  [27, 3, 46].forEach((stat, i) =>
    Object.assign(food, {
      [`BaseParam[${i}]`]: stat,
      [`IsRelative[${i}]`]: "True",
      [`ValueHQ[${i}]`]: 10,
      [`MaxHQ[${i}]`]: [20, 30, 10][i],
    }),
  );
  const slots =
    "OneHandWeaponPercent OffHandPercent HeadPercent ChestPercent HandsPercent WaistPercent LegsPercent FeetPercent EarringPercent NecklacePercent BraceletPercent RingPercent TwoHandWeaponPercent UnderArmorPercent ChestHeadPercent ChestHeadLegsFeetPercent Unknown0 LegsFeetPercent HeadChestHandsLegsFeetPercent ChestLegsGlovesPercent ChestLegsFeetPercent Unknown1".split(
      " ",
    );
  const melds = indexed(["MeldParam"], 13);
  const caps = Object.keys(statColumns).map((id) => ({
    "#": Number(id),
    ...Object.fromEntries(slots.map((slot) => [slot, 100])),
    ...Object.fromEntries(melds.map((field, i) => [field, i === 0 ? 90 : 100])),
  }));
  const levels = [5, 780, 795].map((level) => ({
    "#": level,
    ...Object.fromEntries(
      Object.entries(statColumns).map(([id, name]) => [name, Number(id) * 100]),
    ),
  }));
  const raw = {
    "Item.csv": table(itemFields, items),
    "ClassJobCategory.csv": table(jobs, [
      category(0, []),
      category(31, casters),
      category(64, healer),
    ]),
    "ItemAction.csv": table(
      ["Action", "Data[1]"],
      [{ "#": 0 }, { "#": 1, Action: 844, "Data[1]": 1 }],
    ),
    "ItemFood.csv": table(foodFields, [food]),
    "ContentFinderCondition.csv": table(
      ["ClassJobLevelRequired", "ItemLevelRequired", "ItemLevelSync"],
      [{ "#": 0 }],
    ),
    // Reverse cap columns to check name-based access rather than incidental column positions.
    "BaseParam.csv": table([...melds].reverse().concat(slots), caps),
    "ItemLevel.csv": table(Object.values(statColumns), levels),
    "lodestone-item-id.txt": "",
  };
  return {
    raw,
    sources: { game: { release: "fixture" } },
    gameVersion: "7.55",
  };
}
