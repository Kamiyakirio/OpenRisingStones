/** Pure ledger aggregation; unknown outcomes never enter the completion rate. */
import type { MentorRecord } from "../api/mentorApi";
import { resolveMentorJob } from "./jobs";
import {
  MENTOR_DUTY_CATEGORIES,
  resolveMentorDutyCategory,
  type MentorDutyCategory,
} from "./dutyTypes";

export type AnalysisCount = { key: string; count: number };

/** Sort by frequency and keep ties stable for repeatable chart ordering. */
function ranked(counts: Map<string, number>): AnalysisCount[] {
  return [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function analyzeMentorRecords(
  records: readonly MentorRecord[],
  activeRecordId: string | null,
) {
  const results = {
    completed: 0,
    exited: 0,
    needs_review: 0,
    legacy_unknown: 0,
  };
  const jobs = new Map<string, number>();
  const duties = new Map<string, number>();
  const sources = { game: 0, manual: 0, legacy_site: 0 };
  const dutyCategories = Object.fromEntries(
    MENTOR_DUTY_CATEGORIES.map((key) => [key, 0]),
  ) as Record<MentorDutyCategory, number>;
  let durationMs = 0;
  let durationCount = 0;
  let activeCount = 0;
  for (const record of records) {
    if (record.id === activeRecordId) {
      activeCount += 1;
      continue;
    }
    results[record.result] += 1;
    sources[record.source] += 1;
    dutyCategories[resolveMentorDutyCategory(record.dutyId, record.dutyName)] +=
      1;
    const job = resolveMentorJob(record.jobId, record.jobName);
    const jobKey = job.label;
    jobs.set(jobKey, (jobs.get(jobKey) ?? 0) + 1);
    duties.set(record.dutyName, (duties.get(record.dutyName) ?? 0) + 1);
    // Imported and manual timestamps do not establish reliable elapsed time.
    if (
      record.source === "game" &&
      (record.result === "completed" || record.result === "exited") &&
      record.endedAtMs != null
    ) {
      const elapsed = record.endedAtMs - record.startedAtMs;
      if (Number.isFinite(elapsed) && elapsed >= 0) {
        durationMs += elapsed;
        durationCount += 1;
      }
    }
  }
  const confirmed = results.completed + results.exited;
  return {
    total: records.length - activeCount,
    activeCount,
    results,
    sources,
    dutyCategories,
    completionRate: confirmed ? results.completed / confirmed : null,
    averageDurationMs: durationCount ? durationMs / durationCount : null,
    durationCount,
    jobs: ranked(jobs),
    duties: ranked(duties),
  };
}

/** Use local calendar days so a 30-day window includes all of today's records. */
export function mentorAnalysisStart(days: number, now: number): number {
  if (!days) return -Infinity;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return start.getTime();
}
