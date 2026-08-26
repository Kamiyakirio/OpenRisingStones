/** Equipment entities, filter values, and domain validation rules. */
export type EquipmentSearchItem = {
  id: number;
  name: string;
  category: string;
  icon: string;
  levelEquip?: number;
  levelItem?: number;
};

export type EquipmentSearchPage = {
  items: EquipmentSearchItem[];
  nextCursor: string | null;
};

export const EQUIPMENT_PAGE_SIZES = [12, 24, 48] as const;
export type EquipmentPageSize = (typeof EQUIPMENT_PAGE_SIZES)[number];

export const EQUIPMENT_SLOT_VALUES = [
  "MainHand",
  "OffHand",
  "Head",
  "Body",
  "Gloves",
  "Legs",
  "Feet",
  "Ears",
  "Neck",
  "Wrists",
  "FingerL",
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOT_VALUES)[number];

export const EQUIPMENT_CLASS_JOB_VALUES = [
  "PLD",
  "WAR",
  "DRK",
  "GNB",
  "WHM",
  "SCH",
  "AST",
  "SGE",
  "MNK",
  "DRG",
  "NIN",
  "SAM",
  "RPR",
  "VPR",
  "BRD",
  "MCH",
  "DNC",
  "BLM",
  "SMN",
  "RDM",
  "PCT",
  "BLU",
  "CRP",
  "BSM",
  "ARM",
  "GSM",
  "LTW",
  "WVR",
  "ALC",
  "CUL",
  "MIN",
  "BTN",
  "FSH",
] as const;
export type EquipmentClassJob = (typeof EQUIPMENT_CLASS_JOB_VALUES)[number];

export type EquipmentSearchFilters = {
  equipSlot: EquipmentSlot | null;
  minEquipLevel: number | null;
  maxEquipLevel: number | null;
  minItemLevel: number | null;
  maxItemLevel: number | null;
  itemUiCategory: string;
  classJob: EquipmentClassJob | null;
};

export function createEmptyEquipmentSearchFilters(): EquipmentSearchFilters {
  return {
    equipSlot: null,
    minEquipLevel: null,
    maxEquipLevel: null,
    minItemLevel: null,
    maxItemLevel: null,
    itemUiCategory: "",
    classJob: null,
  };
}

export function countEquipmentSearchFilters(filters: EquipmentSearchFilters) {
  return [
    filters.equipSlot,
    filters.minEquipLevel,
    filters.maxEquipLevel,
    filters.minItemLevel,
    filters.maxItemLevel,
    filters.itemUiCategory.trim(),
    filters.classJob,
  ].filter((value) => value !== null && value !== "").length;
}

export function validateEquipmentSearchFilters(
  filters: EquipmentSearchFilters,
): string | null {
  if (!isOptionalIntegerInRange(filters.minEquipLevel, 1, 999)) {
    return "装备等级必须是 1 至 999 之间的整数";
  }
  if (!isOptionalIntegerInRange(filters.maxEquipLevel, 1, 999)) {
    return "最高装备等级必须是 1 至 999 之间的整数";
  }
  if (
    filters.minEquipLevel !== null &&
    filters.maxEquipLevel !== null &&
    filters.minEquipLevel > filters.maxEquipLevel
  ) {
    return "最低装备等级不能高于最高装备等级";
  }
  if (!isOptionalIntegerInRange(filters.minItemLevel, 0, 9999)) {
    return "最低品级必须是 0 至 9999 之间的整数";
  }
  if (!isOptionalIntegerInRange(filters.maxItemLevel, 0, 9999)) {
    return "最高品级必须是 0 至 9999 之间的整数";
  }
  if (
    filters.minItemLevel !== null &&
    filters.maxItemLevel !== null &&
    filters.minItemLevel > filters.maxItemLevel
  ) {
    return "最低品级不能高于最高品级";
  }
  if (filters.itemUiCategory.trim().length > 40) {
    return "装备分类不能超过 40 个字符";
  }
  return null;
}

function isOptionalIntegerInRange(
  value: number | null,
  minimum: number,
  maximum: number,
) {
  return (
    value === null ||
    (Number.isInteger(value) && value >= minimum && value <= maximum)
  );
}
