/** In-memory contracts for consent-gated advanced recruitment aggregation. */
import type { RecruitDetail, RecruitSlotKey } from "./types";

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
  progressText: string;
  strategyText: string;
  excludeText: string;
  timeText: string;
  timeStart: string;
  timeEnd: string;
  dailyMaxHours: string;
  timeDays: string[];
  showUnparsedTime: boolean;
  alliance: "" | "A" | "B" | "C";
  teamComposition: string;
  areaName: string;
  labelNames: string[];
  labelMode: "any" | "all";
  playableJobIds: number[];
  noDuplicateJobs: boolean;
  dutyNames: string[];
  openPositions: RecruitSlotKey[];
  existingJobIds: number[];
  missingJobIds: number[];
  openPositionMode: "any" | "all";
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
