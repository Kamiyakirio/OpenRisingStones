/** Converts XIVAPI filter values into concise labels for the results page. */
import type {
  EquipmentClassJob,
  EquipmentSearchFilters,
  EquipmentSlot,
} from "@/features/equipment/model/equipment";

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  MainHand: "主手",
  OffHand: "副手",
  Head: "头部",
  Body: "身体",
  Gloves: "手部",
  Legs: "腿部",
  Feet: "脚部",
  Ears: "耳饰",
  Neck: "项链",
  Wrists: "手镯",
  FingerL: "戒指",
};

const CLASS_JOB_LABELS: Record<EquipmentClassJob, string> = {
  PLD: "骑士",
  WAR: "战士",
  DRK: "暗黑骑士",
  GNB: "绝枪战士",
  WHM: "白魔法师",
  SCH: "学者",
  AST: "占星术士",
  SGE: "贤者",
  MNK: "武僧",
  DRG: "龙骑士",
  NIN: "忍者",
  SAM: "武士",
  RPR: "钐镰客",
  VPR: "蝰蛇剑士",
  BRD: "吟游诗人",
  MCH: "机工士",
  DNC: "舞者",
  BLM: "黑魔法师",
  SMN: "召唤师",
  RDM: "赤魔法师",
  PCT: "绘灵法师",
  BLU: "青魔法师",
  CRP: "木工师",
  BSM: "锻铁匠",
  ARM: "铸甲匠",
  GSM: "雕金匠",
  LTW: "制革匠",
  WVR: "裁衣匠",
  ALC: "炼金术士",
  CUL: "烹调师",
  MIN: "采矿工",
  BTN: "园艺工",
  FSH: "捕鱼人",
};

export function getEquipmentSearchFilterLabels(
  filters: EquipmentSearchFilters,
) {
  const labels: string[] = [];
  if (filters.equipSlot) {
    labels.push(`部位：${SLOT_LABELS[filters.equipSlot]}`);
  }
  if (filters.minEquipLevel !== null && filters.maxEquipLevel !== null) {
    labels.push(
      `装备等级：${filters.minEquipLevel} 至 ${filters.maxEquipLevel}`,
    );
  } else if (filters.minEquipLevel !== null) {
    labels.push(`装备等级：${filters.minEquipLevel} 以上`);
  } else if (filters.maxEquipLevel !== null) {
    labels.push(`装备等级：${filters.maxEquipLevel} 以下`);
  }
  if (filters.minItemLevel !== null && filters.maxItemLevel !== null) {
    labels.push(`品级：${filters.minItemLevel} 至 ${filters.maxItemLevel}`);
  } else if (filters.minItemLevel !== null) {
    labels.push(`品级：${filters.minItemLevel} 以上`);
  } else if (filters.maxItemLevel !== null) {
    labels.push(`品级：${filters.maxItemLevel} 以下`);
  }
  if (filters.itemUiCategory.trim()) {
    labels.push(`分类：${filters.itemUiCategory.trim()}`);
  }
  if (filters.classJob) {
    labels.push(`职业：${CLASS_JOB_LABELS[filters.classJob]}`);
  }
  return labels;
}
