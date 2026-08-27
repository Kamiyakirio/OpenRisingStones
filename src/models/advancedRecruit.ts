/** In-memory contracts for consent-gated advanced recruitment aggregation. */
import type { RecruitDetail } from "./recruit";

export type AdvancedRecruitField =
  | "dutyName"
  | "teamDetail"
  | "recruitRequirements"
  | "strategyDescription"
  | "progress"
  | "schedule"
  | "strategy"
  | "author"
  | "location"
  | "labels";

export type AdvancedRecruitTextRule = {
  id: number;
  mode: "keyword" | "regex";
  pattern: string;
  fields: AdvancedRecruitField[];
};

export type AdvancedRecruitFilters = {
  dutyNames: string[];
  existingJobIds: number[];
  missingJobIds: number[];
  existingJobMode: "any" | "all";
  missingJobMode: "any" | "all";
  textRuleMode: "any" | "all";
  textRules: AdvancedRecruitTextRule[];
};

export type AdvancedRecruitProgress = {
  stage: "list" | "detail" | "rate_limit";
  completed: number;
  total: number;
  overallCompleted: number;
  overallTotal: number;
  backoffAttempt?: number;
  retryDelayMs?: number;
};

export type AdvancedRecruitDataset = {
  items: RecruitDetail[];
  failedDetailCount: number;
};

export function createEmptyAdvancedRecruitFilters(): AdvancedRecruitFilters {
  return {
    dutyNames: [],
    existingJobIds: [],
    missingJobIds: [],
    existingJobMode: "any",
    missingJobMode: "any",
    textRuleMode: "all",
    textRules: [],
  };
}
