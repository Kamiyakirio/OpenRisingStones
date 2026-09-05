/** Local recruitment preferences adapted from partyfinder-helper; see notices for MIT attribution. */
import type { AdvancedRecruitFilters } from "../models/advancedRecruit";
import type {
  RecruitConfig,
  RecruitDetail,
  RecruitJob,
} from "../models/recruit";
import { matchesTimeFilter } from "./recruitTime.ts";

/** Normalize common notation variants found in public recruitment text. */
export function normalizeRecruitSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[—–~～]/gu, "-")
    .replace(/从零/gu, "从0")
    .replace(/(?<=[a-z])\s+(?=\d)|(?<=\d)\s+(?=[a-z])/gu, "");
}

/** Whitespace and punctuation separate AND tokens; a leading minus excludes a token. */
export function parseRecruitKeywords(value: string) {
  return normalizeRecruitSearchText(value)
    .split(/[\s,，;；、/\\|｜&＆]+/u)
    .filter(Boolean)
    .flatMap((rawToken) => {
      const excluded = rawToken.startsWith("-");
      const token = excluded ? rawToken.slice(1) : rawToken;
      if (!token || token.startsWith("+")) return [rawToken];
      const parts = token.split("+").filter(Boolean);
      return parts.map((part) => (excluded ? `-${part}` : part));
    });
}

export function matchesRecruitKeywordQuery(value: string, query: string) {
  const text = normalizeRecruitSearchText(value);
  return parseRecruitKeywords(query).every((token) =>
    token.startsWith("-") && token.length > 1
      ? !text.includes(token.slice(1))
      : text.includes(token),
  );
}

export function matchesRecruitPreferences(
  item: RecruitDetail,
  filters: AdvancedRecruitFilters,
  config: RecruitConfig | null,
) {
  if (
    filters.teamComposition &&
    item.teamComposition !== filters.teamComposition
  )
    return false;
  if (
    filters.alliance &&
    !item.slots.some((slot) => slot.alliance === filters.alliance)
  )
    return false;
  if (
    !matchesRecruitKeywordQuery(item.progress, filters.progressText) ||
    !matchesRecruitKeywordQuery(item.strategy, filters.strategyText)
  )
    return false;
  if (!matchesTimeFilter(item.schedule, filters)) return false;
  if (
    filters.areaName &&
    ![item.areaName, item.groupName, item.targetAreaName].some((value) =>
      value.toLowerCase().includes(filters.areaName.toLowerCase()),
    )
  )
    return false;
  const labels = new Set(
    item.labels.map((label) => normalizeRecruitSearchText(label.name)),
  );
  if (
    filters.labelNames.length &&
    !(filters.labelMode === "all"
      ? filters.labelNames.every((name) =>
          labels.has(normalizeRecruitSearchText(name)),
        )
      : filters.labelNames.some((name) =>
          labels.has(normalizeRecruitSearchText(name)),
        ))
  )
    return false;

  // Include detail-only fields so an excluded term cannot hide behind the card summary.
  const text = normalizeRecruitSearchText(
    [
      item.dutyName,
      item.dutyType,
      item.teamComposition,
      item.progress,
      item.strategy,
      item.schedule,
      item.author,
      item.areaName,
      item.groupName,
      item.targetAreaName,
      item.teamDetail,
      item.recruitRequirements,
      item.strategyDescription,
      item.customLabel ?? "",
      ...item.labels.map((label) => label.name),
    ].join(" "),
  );
  if (
    parseRecruitKeywords(filters.excludeText).some((token) =>
      text.includes(
        token.startsWith("-") && token.length > 1 ? token.slice(1) : token,
      ),
    )
  )
    return false;
  if (!filters.playableJobIds.length) return true;

  const jobs = config?.jobs ?? [];
  const roleIds = new Set(config?.roleJobs.map((job) => job.id) ?? []);
  const candidates = jobs.filter(
    (job) =>
      !roleIds.has(job.id) &&
      job.id !== 32 &&
      filters.playableJobIds.some(
        (id) =>
          id === job.id ||
          id === 32 ||
          (roleIds.has(id) &&
            acceptsCategory(
              jobs.find((entry) => entry.id === id)!,
              job,
            )),
      ),
  );
  return candidates.some((job) => {
    if (
      filters.noDuplicateJobs &&
      item.slots.some((slot) => slot.jobId === job.id)
    )
      return false;
    if (
      item.needJobs.some(
        (needed) =>
          needed.id === job.id ||
          needed.id === 32 ||
          (roleIds.has(needed.id) && acceptsCategory(needed, job)),
      )
    )
      return true;
    // As in the helper, an open position is an alternative indication of eligibility.
    const role = jobRole(job);
    return item.slots.some(
      (slot) =>
        slot.jobId === null &&
        (!filters.alliance || slot.alliance === filters.alliance) &&
        (role === "tank"
          ? /^(MT|ST)$/.test(slot.key)
          : role === "healer"
            ? /^H/.test(slot.key)
            : role === "dps" && /^D/.test(slot.key)),
    );
  });
}

function jobRole(job: RecruitJob) {
  const text = `${job.category} ${job.name}`;
  if (/防护/.test(text)) return "tank";
  if (/治疗/.test(text)) return "healer";
  if (/进攻|近战|远程|远敏|法系/.test(text)) return "dps";
  return "unknown";
}

/** Match broad attack roles and the narrower melee/ranged categories independently. */
function acceptsCategory(category: RecruitJob, job: RecruitJob) {
  if (/进攻/.test(category.name)) return jobRole(job) === "dps";
  const normalize = (value: string) => value.replace(/职业/g, "");
  return normalize(job.category) === normalize(category.name);
}
