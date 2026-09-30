/** Complete recruitment records keep filter and aggregation mocks aligned with domain types. */
import type {
  RecruitDetail,
  RecruitSummary,
} from "../../src/features/recruit/types.ts";

export function recruitSummary(
  overrides: Partial<RecruitSummary> = {},
): RecruitSummary {
  return {
    id: 1,
    author: "Player",
    avatar: null,
    areaName: "Area",
    groupName: "World",
    targetAreaName: "Target",
    dutyType: "Savage",
    dutyName: "Duty",
    schedule: "Evening",
    teamComposition: "Full Party",
    progress: "Fresh",
    strategy: "Guide A",
    labels: [],
    customLabel: null,
    needJobs: [],
    slots: [],
    responseCount: 0,
    publishedAt: "",
    expiresAt: "",
    updatedAt: "",
    ...overrides,
  };
}

export function recruitDetail(
  overrides: Partial<RecruitDetail> = {},
): RecruitDetail {
  return {
    ...recruitSummary(),
    teamDetail: "Detail",
    recruitRequirements: "",
    strategyDescription: "",
    dueDay: null,
    ipLocation: "Location",
    profile: "",
    ...overrides,
  };
}
