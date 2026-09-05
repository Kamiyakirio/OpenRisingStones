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
