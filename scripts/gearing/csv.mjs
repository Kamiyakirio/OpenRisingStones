/** Parse Chinese game CSVs by named columns and stable row IDs, including SaintCoinach headers. */
import Papa from "papaparse";
import { jobSchemas } from "./config/game.mjs";

export const statColumns = {
  1: "Strength",
  2: "Dexterity",
  3: "Vitality",
  4: "Intelligence",
  5: "Mind",
  6: "Piety",
  10: "GP",
  11: "CP",
  12: "PhysicalDamage",
  13: "MagicalDamage",
  19: "Tenacity",
  22: "DirectHitRate",
  27: "CriticalHit",
  44: "Determination",
  45: "SkillSpeed",
  46: "SpellSpeed",
  70: "Craftsmanship",
  71: "Control",
  72: "Gathering",
  73: "Perception",
};
const indexed = (names, count) =>
  Array.from({ length: count }, (_, i) =>
    names.map((name) => `${name}[${i}]`),
  ).flat();
const canonicalSlots = [
  "OneHandWeaponPercent",
  "OffHandPercent",
  "HeadPercent",
  "ChestPercent",
  "HandsPercent",
  "WaistPercent",
  "LegsPercent",
  "FeetPercent",
  "EarringPercent",
  "NecklacePercent",
  "BraceletPercent",
  "RingPercent",
  "TwoHandWeaponPercent",
  "UnderArmorPercent",
  "ChestHeadPercent",
  "ChestHeadLegsFeetPercent",
  "Unknown0",
  "LegsFeetPercent",
  "HeadChestHandsLegsFeetPercent",
  "ChestLegsGlovesPercent",
  "ChestLegsFeetPercent",
  "Unknown1",
];
const fields = {
  BaseParam: [
    ...canonicalSlots.map((_, i) => `slot${i + 1}`),
    ...indexed(["MeldParam"], 13),
  ],
  ClassJobCategory: Object.keys(jobSchemas),
  ContentFinderCondition: [
    "ClassJobLevelRequired",
    "ItemLevelRequired",
    "ItemLevelSync",
  ],
  Item: [
    "Name",
    "Description",
    "Icon",
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
  ],
  ItemAction: ["Action", "Data[1]"],
  ItemFood: indexed(["BaseParam", "IsRelative", "ValueHQ", "MaxHQ"], 3),
  ItemLevel: Object.values(statColumns),
};

function fieldName(name, sheet) {
  if (sheet === "BaseParam.csv") {
    const canonical = canonicalSlots.indexOf(name);
    if (canonical >= 0) return `slot${canonical + 1}`;
  }
  const normalized = name.replace(/[{}<>]/g, "");
  return sheet === "ItemAction.csv" && normalized === "Type"
    ? "Action"
    : normalized;
}

export function parseSheet(
  text,
  sheet,
  required = fields[sheet.replace(/\.csv$/, "")],
) {
  if (!text || !required)
    throw new Error(`Missing or unsupported CSV table: ${sheet}`);
  const wanted = new Set(["#", ...required]);
  const rows = [],
    seen = new Set();
  let header,
    typed = false,
    skipTypes = false,
    line = 0;
  Papa.parse(text, {
    skipEmptyLines: "greedy",
    step({ data, errors }) {
      line++;
      if (errors.length)
        throw new Error(`${sheet}:${line}: ${errors[0].message}`);
      if (!header) {
        if (data[0] === "key") {
          typed = true;
          return;
        }
        if (data[0] !== "#") throw new Error(`${sheet}: missing row-ID header`);
        header = data.map((name) => fieldName(name, sheet));
        for (const name of wanted)
          if (header.filter((field) => field === name).length !== 1)
            throw new Error(`${sheet}: missing or duplicate column ${name}`);
        skipTypes = typed;
        return;
      }
      if (skipTypes) {
        skipTypes = false;
        return;
      }
      if (data.length !== header.length)
        throw new Error(`${sheet}:${line}: incomplete CSV row`);
      const id = Number(data[0]);
      if (
        !data[0] ||
        !Number.isSafeInteger(id) ||
        id < 0 ||
        id > 1000000 ||
        seen.has(id)
      )
        throw new Error(`${sheet}:${line}: invalid or duplicate row ID`);
      seen.add(id);
      const row = Object.create(null);
      for (let i = 0; i < header.length; i++) {
        const name = header[i];
        if (!wanted.has(name) && !/^slot(?:17|22)$/.test(name)) continue;
        const value = data[i];
        const boolean =
          (sheet === "ClassJobCategory.csv" && name !== "#") ||
          name === "CanBeHq" ||
          name === "IsAdvancedMeldingPermitted" ||
          name.startsWith("IsRelative[");
        if (
          boolean
            ? !["True", "False"].includes(value)
            : !["Name", "Description"].includes(name) &&
              (value === "" || !Number.isFinite(Number(value)))
        )
          throw new Error(`${sheet}:${line}: invalid value for ${name}`);
        row[name] = value;
      }
      rows[id] = row;
    },
  });
  if (!header || !seen.size) throw new Error(`${sheet}: empty CSV table`);
  return rows;
}

export function sourceIndex(sources) {
  const index = {};
  for (const [id, source] of Object.entries(sources)) {
    if (
      !/^[a-z0-9-]+$/.test(id) ||
      typeof source.label !== "string" ||
      typeof source.items !== "string"
    )
      throw new Error("Invalid source definition.");
    const ranges = source.items;
    for (const range of ranges.split(",")) {
      if (!/^\d+(?:-\d+)?$/.test(range))
        throw new Error(`Invalid item source range: ${range}`);
      const [begin, last] = range.split("-").map(Number),
        end = last ?? begin;
      if (begin <= 0 || end < begin || end > 1000000)
        throw new Error(`Invalid item source bounds: ${range}`);
      for (let id = begin; id <= end; id++) {
        if (Object.hasOwn(index, id))
          throw new Error(`Conflicting item source: ${id}`);
        index[id] = source.label;
      }
    }
  }
  return index;
}
