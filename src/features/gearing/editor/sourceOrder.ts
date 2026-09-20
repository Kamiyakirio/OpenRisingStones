import type { Bootstrap } from "./types";

export type GearSource = Bootstrap["sources"][number];
export type QuickSourceFilterId =
  "ultimate" | "savage" | "tomestone" | "dungeon" | "crafted";

type QuickSourceFilter = {
  id: QuickSourceFilterId;
  label: string;
  matches: (label: string) => boolean;
};

const sourceLabelCollator = new Intl.Collator("zh-CN");

/** Player-facing source families used by both browsing and optimization controls. */
export const QUICK_SOURCE_FILTERS: readonly QuickSourceFilter[] = [
  {
    id: "ultimate",
    label: "绝本",
    matches: (label) => label.startsWith("绝境战/"),
  },
  {
    id: "savage",
    label: "零式",
    matches: (label) => label.startsWith("零式/"),
  },
  {
    id: "tomestone",
    label: "点数（改良及未改良）",
    matches: (label) =>
      label.startsWith("点数/") || label.startsWith("点数强化/"),
  },
  {
    id: "dungeon",
    label: "迷宫挑战",
    matches: (label) => label.startsWith("迷宫挑战/"),
  },
  {
    id: "crafted",
    label: "制作（改良及未改良）",
    matches: (label) => label === "生产制作" || label === "制作装强化",
  },
];

/** Keeps recent source definitions first and provides a stable fallback for older catalogs. */
export function sortGearSources(sources: readonly GearSource[]): GearSource[] {
  return [...sources].sort(
    (left, right) =>
      (right.order ?? -1) - (left.order ?? -1) ||
      sourceLabelCollator.compare(left.label, right.label),
  );
}

export function sourceIdsForQuickFilter(
  sources: readonly GearSource[],
  filterId: QuickSourceFilterId,
): string[] {
  const filter = QUICK_SOURCE_FILTERS.find((entry) => entry.id === filterId);
  return filter
    ? sortGearSources(sources)
        .filter((source) => filter.matches(source.label))
        .map((source) => source.id)
    : [];
}

export function findQuickSourceFilterId(
  sources: readonly GearSource[],
  selectedIds: readonly string[],
): QuickSourceFilterId | null {
  if (!selectedIds.length) return null;
  const selected = new Set(selectedIds);
  return (
    QUICK_SOURCE_FILTERS.find((filter) => {
      const filterIds = sourceIdsForQuickFilter(sources, filter.id);
      return (
        filterIds.length === selected.size &&
        filterIds.every((id) => selected.has(id))
      );
    })?.id ?? null
  );
}
