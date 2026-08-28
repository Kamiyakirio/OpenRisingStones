/** Pure helpers and pacing constants for the client-filtered glamour feed. */
import type { Glamour } from "@/features/glamour/model/glamour";

export const GLAMOUR_FEED_BATCH_SIZE = 12;
export const JOB_FILTER_PREFETCH_COUNT = 24;
export const JOB_FILTER_REQUEST_INTERVAL_MS = 1_500;

export function matchesSelectedJobs(
  glamourJobIds: number[],
  selectedJobIds: number[],
) {
  return (
    selectedJobIds.length === 0 ||
    glamourJobIds.length === 0 ||
    selectedJobIds.some((jobId) => glamourJobIds.includes(jobId))
  );
}

export function filterGlamoursByJobs(
  items: Glamour[],
  selectedJobIds: number[],
) {
  return items.filter((item) =>
    matchesSelectedJobs(item.jobIds, selectedJobIds),
  );
}

export function mergeUniqueGlamours(current: Glamour[], incoming: Glamour[]) {
  const merged = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => merged.set(item.id, item));
  return [...merged.values()];
}

export function visibleGlamourFeed(items: Glamour[], limit: number) {
  return items.slice(0, limit);
}

export function revealNextGlamourBatch(currentLimit: number) {
  return currentLimit + GLAMOUR_FEED_BATCH_SIZE;
}
