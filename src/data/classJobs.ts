/** Shared FFXIV class/job options used by equipment and glamour filters. */
import type { EquipmentClassJob } from "../models/equipment";

export type ClassJobOption = {
  value: EquipmentClassJob;
  label: string;
  glamourId: number;
};

export type ClassJobGroup = {
  label: string;
  options: ClassJobOption[];
};

export const CLASS_JOB_GROUPS: ClassJobGroup[] = [
  {
    label: "防护职业",
    options: [
      { value: "PLD", label: "骑士", glamourId: 19 },
      { value: "WAR", label: "战士", glamourId: 21 },
      { value: "DRK", label: "暗黑骑士", glamourId: 32 },
      { value: "GNB", label: "绝枪战士", glamourId: 37 },
    ],
  },
  {
    label: "治疗职业",
    options: [
      { value: "WHM", label: "白魔法师", glamourId: 24 },
      { value: "SCH", label: "学者", glamourId: 28 },
      { value: "AST", label: "占星术士", glamourId: 33 },
      { value: "SGE", label: "贤者", glamourId: 40 },
    ],
  },
  {
    label: "近战职业",
    options: [
      { value: "MNK", label: "武僧", glamourId: 20 },
      { value: "DRG", label: "龙骑士", glamourId: 22 },
      { value: "NIN", label: "忍者", glamourId: 30 },
      { value: "SAM", label: "武士", glamourId: 34 },
      { value: "RPR", label: "钐镰客", glamourId: 39 },
      { value: "VPR", label: "蝰蛇剑士", glamourId: 41 },
    ],
  },
  {
    label: "远程职业",
    options: [
      { value: "BRD", label: "吟游诗人", glamourId: 23 },
      { value: "MCH", label: "机工士", glamourId: 31 },
      { value: "DNC", label: "舞者", glamourId: 38 },
      { value: "BLM", label: "黑魔法师", glamourId: 25 },
      { value: "SMN", label: "召唤师", glamourId: 27 },
      { value: "RDM", label: "赤魔法师", glamourId: 35 },
      { value: "PCT", label: "绘灵法师", glamourId: 42 },
      { value: "BLU", label: "青魔法师", glamourId: 36 },
    ],
  },
  {
    label: "能工巧匠",
    options: [
      { value: "CRP", label: "木工师", glamourId: 8 },
      { value: "BSM", label: "锻铁匠", glamourId: 9 },
      { value: "ARM", label: "铸甲匠", glamourId: 10 },
      { value: "GSM", label: "雕金匠", glamourId: 11 },
      { value: "LTW", label: "制革匠", glamourId: 12 },
      { value: "WVR", label: "裁衣匠", glamourId: 13 },
      { value: "ALC", label: "炼金术士", glamourId: 14 },
      { value: "CUL", label: "烹调师", glamourId: 15 },
    ],
  },
  {
    label: "大地使者",
    options: [
      { value: "MIN", label: "采矿工", glamourId: 16 },
      { value: "BTN", label: "园艺工", glamourId: 17 },
      { value: "FSH", label: "捕鱼人", glamourId: 18 },
    ],
  },
];

export const CLASS_JOB_OPTIONS = CLASS_JOB_GROUPS.flatMap(
  (group) => group.options,
);

export const CLASS_JOB_LABEL_BY_GLAMOUR_ID = Object.fromEntries(
  CLASS_JOB_OPTIONS.map((option) => [option.glamourId, option.label]),
) as Readonly<Record<number, string>>;
