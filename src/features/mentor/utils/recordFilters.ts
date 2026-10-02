/** Composable history filters share the ledger's canonical duty and job resolution. */
import type { MentorRecord, MentorResult } from "../api/mentorApi";
import dutyNames from "../data/dutyNames.json";
import {
  resolveMentorDutyCategory,
  type MentorDutyCategory,
} from "./dutyTypes";
import { resolveMentorJob } from "./jobs";
import { mentorAnalysisStart } from "./analysis";

export type MentorRecordFilters = {
  search: string;
  period: "all" | "today" | "week" | "month" | "custom";
  from: string;
  to: string;
  character: string;
  job: string;
  dutyType: "all" | MentorDutyCategory;
  result: "all" | MentorResult;
  source: "all" | MentorRecord["source"];
  order: "newest" | "oldest";
};

export const DEFAULT_MENTOR_FILTERS: MentorRecordFilters = {
  search: "",
  period: "all",
  from: "",
  to: "",
  character: "all",
  job: "all",
  dutyType: "all",
  result: "all",
  source: "all",
  order: "newest",
};

export function mentorCharacterKey(record: MentorRecord) {
  return record.characterId
    ? `id:${record.characterId}`
    : record.characterName
      ? `name:${record.characterName}`
      : "unknown";
}

export function mentorDutyName(record: MentorRecord) {
  return record.dutyId
    ? ((dutyNames as Record<string, string>)[String(record.dutyId)] ??
        record.dutyName)
    : record.dutyName;
}

/** Parse local calendar dates without UTC conversion or silent date overflow. */
function localDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date.getTime()
    : null;
}

export function mentorDateRangeInvalid(filters: MentorRecordFilters) {
  if (filters.period !== "custom") return false;
  const from = filters.from ? localDate(filters.from) : null;
  const to = filters.to ? localDate(filters.to) : null;
  return Boolean(
    (filters.from && from == null) ||
    (filters.to && to == null) ||
    (from != null && to != null && from > to),
  );
}

/** All selected conditions intersect; date endpoints include the entire local day. */
export function filterMentorRecords(
  records: readonly MentorRecord[],
  filters: MentorRecordFilters,
  now: number,
): MentorRecord[] {
  if (mentorDateRangeInvalid(filters)) return [];
  const days = { all: 0, today: 1, week: 7, month: 30, custom: 0 }[
    filters.period
  ];
  const start =
    filters.period === "custom" && filters.from
      ? localDate(filters.from)!
      : mentorAnalysisStart(days, now);
  let end = Infinity;
  if (filters.period === "custom" && filters.to) {
    const date = new Date(localDate(filters.to)!);
    date.setDate(date.getDate() + 1);
    end = date.getTime();
  } else if (days) {
    const date = new Date(now);
    date.setHours(24, 0, 0, 0);
    end = date.getTime();
  }
  const words = filters.search
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
  return records
    .filter((record) => {
      if (record.startedAtMs < start || record.startedAtMs >= end) return false;
      if (filters.result !== "all" && record.result !== filters.result)
        return false;
      if (filters.source !== "all" && record.source !== filters.source)
        return false;
      if (
        filters.character !== "all" &&
        mentorCharacterKey(record) !== filters.character
      )
        return false;
      if (
        filters.dutyType !== "all" &&
        resolveMentorDutyCategory(record.dutyId, record.dutyName) !==
          filters.dutyType
      )
        return false;
      const job = resolveMentorJob(record.jobId, record.jobName);
      if (filters.job.startsWith("role:") && job.role !== filters.job.slice(5))
        return false;
      if (filters.job.startsWith("job:") && job.label !== filters.job.slice(4))
        return false;
      const text =
        `${mentorDutyName(record)} ${record.characterName} ${job.label} ${record.jobName ?? ""} ${record.note}`.toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) =>
      filters.order === "newest"
        ? b.startedAtMs - a.startedAtMs
        : a.startedAtMs - b.startedAtMs,
    );
}
