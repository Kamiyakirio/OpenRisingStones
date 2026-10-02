/** Resolves game IDs and legacy job names into a consistent role and icon. */
import {
  CLASS_JOB_OPTIONS,
  getClassJobIconUrl,
} from "../../glamour/data/classJobs";

export type MentorJobRole = "tank" | "healer" | "dps" | "other";

/** Base classes share their upgraded job's combat role. */
export function getMentorJobRole(id: number): MentorJobRole {
  if ([1, 3, 19, 21, 32, 37].includes(id)) return "tank";
  if ([6, 24, 28, 33, 40].includes(id)) return "healer";
  if (
    [
      2, 4, 5, 7, 20, 22, 23, 25, 26, 27, 29, 30, 31, 34, 35, 36, 38, 39, 41,
      42,
    ].includes(id)
  )
    return "dps";
  return "other";
}

/** Prefer an explicit game ID; imported records often only contain a name. */
export function resolveMentorJob(jobId: number | null, jobName: string | null) {
  const name = jobName?.trim();
  const job = CLASS_JOB_OPTIONS.find((option) =>
    jobId != null && jobId > 0
      ? option.glamourId === jobId
      : option.label === name || option.value === name?.toUpperCase(),
  );
  const id = jobId != null && jobId > 0 ? jobId : job?.glamourId;
  return {
    label: job?.label ?? name ?? "",
    role: id == null ? "other" : getMentorJobRole(id),
    iconUrl: id != null && id >= 1 && id <= 42 ? getClassJobIconUrl(id) : null,
  };
}
