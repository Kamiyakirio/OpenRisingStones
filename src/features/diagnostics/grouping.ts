/** Groups adjacent identical Debug operations without discarding raw records. */
import type { LogSummary } from "./api.ts";

const STRICT_MODE_GROUP_WINDOW_MS = 750;

export type LogGroup = {
  primary: LogSummary;
  occurrences: LogSummary[];
};

export function groupSimilarLogs(
  logs: readonly LogSummary[],
  windowMs = STRICT_MODE_GROUP_WINDOW_MS,
): LogGroup[] {
  const groups: LogGroup[] = [];
  for (const entry of logs) {
    const current = groups.at(-1);
    const previousOccurrence = current?.occurrences.at(-1);
    if (
      current &&
      previousOccurrence &&
      current.primary.fingerprint === entry.fingerprint &&
      previousOccurrence.timestampMs - entry.timestampMs <= windowMs
    ) {
      current.occurrences.push(entry);
    } else {
      groups.push({ primary: entry, occurrences: [entry] });
    }
  }
  return groups;
}
