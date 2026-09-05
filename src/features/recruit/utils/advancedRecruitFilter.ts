/** Pure advanced-filter engine for the in-memory recruitment detail dataset. */
import type {
  AdvancedRecruitField,
  AdvancedRecruitFilters,
  AdvancedRecruitTextRule,
} from "../advanced.types";
import type { RecruitConfig, RecruitDetail } from "../types";
import {
  matchesRecruitKeywordQuery,
  matchesRecruitPreferences,
} from "./recruitPreferences.ts";

export const ADVANCED_RECRUIT_FIELD_KEYS: AdvancedRecruitField[] = [
  "dutyName",
  "teamDetail",
  "recruitRequirements",
  "strategyDescription",
  "progress",
  "schedule",
  "strategy",
  "author",
  "location",
  "labels",
];

export type AdvancedRecruitRuleError = {
  ruleId: number;
  message: string;
};

export function filterAdvancedRecruitItems(
  items: RecruitDetail[],
  filters: AdvancedRecruitFilters,
  config: RecruitConfig | null = null,
) {
  const compiledRules = filters.textRules
    .filter((rule) => rule.pattern.trim())
    .map(compileTextRule);
  const ruleErrors = compiledRules
    .filter((result) => result.error)
    .map((result) => result.error!);
  if (ruleErrors.length) return { items: [], ruleErrors };

  return {
    items: items.filter((item) => {
      if (!matchesRecruitPreferences(item, filters, config)) return false;
      if (
        filters.dutyNames.length &&
        !filters.dutyNames.includes(item.dutyName)
      ) {
        return false;
      }
      const openPositions = item.slots
        .filter(
          (slot) => !filters.alliance || slot.alliance === filters.alliance,
        )
        .filter((slot) => slot.jobId === null)
        .map((slot) => slot.key);
      if (
        !matchesValues(
          openPositions,
          filters.openPositions,
          filters.openPositionMode,
        )
      ) {
        return false;
      }
      const existingJobIds = item.slots
        .map((slot) => slot.jobId)
        .filter((id): id is number => id !== null);
      if (
        !matchesIds(
          existingJobIds,
          filters.existingJobIds,
          filters.existingJobMode,
        )
      ) {
        return false;
      }
      if (
        !matchesIds(
          item.needJobs.map((job) => job.id),
          filters.missingJobIds,
          filters.missingJobMode,
        )
      ) {
        return false;
      }
      if (!compiledRules.length) return true;
      const matches = compiledRules.map((rule) => rule.matches!(item));
      return filters.textRuleMode === "all"
        ? matches.every(Boolean)
        : matches.some(Boolean);
    }),
    ruleErrors,
  };
}

function matchesIds(
  available: number[],
  selected: number[],
  mode: "any" | "all",
) {
  if (!selected.length) return true;
  const values = new Set(available);
  return mode === "all"
    ? selected.every((id) => values.has(id))
    : selected.some((id) => values.has(id));
}

function matchesValues<T>(available: T[], selected: T[], mode: "any" | "all") {
  if (!selected.length) return true;
  const values = new Set(available);
  return mode === "all"
    ? selected.every((value) => values.has(value))
    : selected.some((value) => values.has(value));
}

function compileTextRule(rule: AdvancedRecruitTextRule): {
  error: AdvancedRecruitRuleError | null;
  matches: ((item: RecruitDetail) => boolean) | null;
} {
  const fields = rule.fields.length ? rule.fields : ADVANCED_RECRUIT_FIELD_KEYS;
  if (rule.mode === "keyword") {
    const keyword = rule.pattern.trim().toLocaleLowerCase();
    return {
      error: null,
      matches: (item) =>
        matchesRecruitKeywordQuery(
          fields.map((field) => fieldValue(item, field)).join(" "),
          keyword,
        ),
    };
  }

  const parsed = parseRegex(rule.pattern);
  if (parsed.error) {
    return {
      error: { ruleId: rule.id, message: parsed.error },
      matches: null,
    };
  }
  return {
    error: null,
    matches: (item) =>
      fields.some((field) => parsed.regex!.test(fieldValue(item, field))),
  };
}

function parseRegex(value: string): {
  regex: RegExp | null;
  error: string | null;
} {
  const trimmed = value.trim();
  if (trimmed.length > 160) {
    return { regex: null, error: "正则表达式不能超过 160 个字符" };
  }
  let pattern = trimmed;
  let flags = "iu";
  if (trimmed.startsWith("/")) {
    const lastSlash = trimmed.lastIndexOf("/");
    if (lastSlash <= 0) {
      return { regex: null, error: "正则表达式缺少结束斜杠" };
    }
    pattern = trimmed.slice(1, lastSlash);
    flags = trimmed.slice(lastSlash + 1) || "iu";
  }
  if (!/^[imsu]*$/u.test(flags) || new Set(flags).size !== flags.length) {
    return { regex: null, error: "仅支持 i、m、s、u 正则标志" };
  }
  if (/\([^)]*[+*][^)]*\)[+*{]/u.test(pattern)) {
    return { regex: null, error: "正则表达式包含高风险的嵌套重复" };
  }
  try {
    return { regex: new RegExp(pattern, flags), error: null };
  } catch {
    return { regex: null, error: "正则表达式格式无效" };
  }
}

function fieldValue(item: RecruitDetail, field: AdvancedRecruitField) {
  switch (field) {
    case "dutyName":
      return item.dutyName;
    case "teamDetail":
      return item.teamDetail;
    case "recruitRequirements":
      return item.recruitRequirements;
    case "strategyDescription":
      return item.strategyDescription;
    case "progress":
      return item.progress;
    case "schedule":
      return item.schedule;
    case "strategy":
      return item.strategy;
    case "author":
      return item.author;
    case "location":
      return [item.areaName, item.groupName, item.targetAreaName].join(" ");
    case "labels":
      return [
        ...item.labels.map((label) => label.name),
        item.customLabel ?? "",
      ].join(" ");
  }
}
