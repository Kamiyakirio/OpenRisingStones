/** Defaults and validation for feature-owned filters. */
import type { AdvancedRecruitFilters } from "../advanced.types.ts";

export function createEmptyAdvancedRecruitFilters(): AdvancedRecruitFilters {
  return {
    progressText: "",
    strategyText: "",
    excludeText: "",
    timeText: "",
    timeStart: "",
    timeEnd: "",
    dailyMaxHours: "",
    timeDays: [],
    showUnparsedTime: true,
    alliance: "",
    teamComposition: "",
    areaName: "",
    labelNames: [],
    labelMode: "all",
    playableJobIds: [],
    noDuplicateJobs: true,
    dutyNames: [],
    openPositions: [],
    existingJobIds: [],
    missingJobIds: [],
    openPositionMode: "any",
    existingJobMode: "any",
    missingJobMode: "any",
    textRuleMode: "all",
    textRules: [],
  };
}
