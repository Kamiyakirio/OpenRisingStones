/** Expand a bait path into each actual catch, including its own hookset data. */
import type { Fish } from "./types.ts";

export type CatchStep = {
  sourceIds: number[];
  targetId: number;
  target: Fish | null;
  kind: "bait" | "mooch";
};

export function fishingCatchSteps(
  fish: Fish,
  fishById: Map<number, Fish>,
): CatchStep[] {
  const path = fish.conditions?.bait.length ? fish.conditions.bait : [null];
  return path.flatMap((source, index) => {
    const next = path[index + 1] ?? fish.id;
    const sourceIds =
      source == null ? [] : Array.isArray(source) ? source : [source];
    const targetIds = Array.isArray(next) ? next : [next];
    return targetIds.map((targetId) => ({
      sourceIds,
      targetId,
      target: fishById.get(targetId) ?? (targetId === fish.id ? fish : null),
      kind: index === 0 ? ("bait" as const) : ("mooch" as const),
    }));
  });
}
