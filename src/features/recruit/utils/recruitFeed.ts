/** Feed helpers keep page boundaries from duplicating recruitment cards. */
import type { RecruitSummary } from "../types";

export function mergeRecruitFeed(
  current: RecruitSummary[],
  incoming: RecruitSummary[],
) {
  const merged = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => merged.set(item.id, item));
  return [...merged.values()];
}

export function canLoadMoreRecruitItems(loaded: number, total: number) {
  return loaded > 0 && loaded < total;
}
