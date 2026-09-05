/** Defaults and validation for feature-owned filters. */
import type { EquipmentSearchFilters } from "../equipment.types.ts";

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
  if (!isOptionalIntegerInRange(filters.minEquipLevel, 1, 110)) {
    return "装备等级必须是 1 至 110 之间的整数";
  }
  if (!isOptionalIntegerInRange(filters.maxEquipLevel, 1, 110)) {
    return "最高装备等级必须是 1 至 110 之间的整数";
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
