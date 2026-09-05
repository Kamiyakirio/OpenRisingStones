/** Domain entities and public query contracts for party recruitment. */
export type RecruitJob = {
  id: number;
  name: string;
  icon: string | null;
  category: string;
};

export type RecruitDuty = {
  id: number;
  type: string;
  name: string;
  teamComposition: string;
};

export type RecruitLabel = {
  /** Detail responses omit the configuration id and are identified by name. */
  id: number | null;
  name: string;
};

export type RecruitArea = {
  id: number;
  name: string;
};

export type RecruitConfig = {
  jobs: RecruitJob[];
  roleJobs: RecruitJob[];
  duties: RecruitDuty[];
  labels: RecruitLabel[];
  areas: RecruitArea[];
};

export type RecruitFilters = {
  dutyName: string;
  dutyType: string;
  areaId: string;
};

export type RecruitSlotKey =
  "MT" | "ST" | "H1" | "H2" | "D1" | "D2" | "D3" | "D4";

export type RecruitSlot = {
  alliance?: "A" | "B" | "C";
  key: RecruitSlotKey;
  jobId: number | null;
};

export type RecruitSummary = {
  id: number;
  author: string;
  avatar: string | null;
  areaName: string;
  groupName: string;
  targetAreaName: string;
  dutyType: string;
  dutyName: string;
  schedule: string;
  teamComposition: string;
  progress: string;
  strategy: string;
  labels: RecruitLabel[];
  customLabel: string | null;
  needJobs: RecruitJob[];
  slots: RecruitSlot[];
  responseCount: number;
  publishedAt: string;
  expiresAt: string;
  updatedAt: string;
};

export type RecruitDetail = RecruitSummary & {
  teamDetail: string;
  recruitRequirements: string;
  strategyDescription: string;
  dueDay: number | null;
  ipLocation: string;
  profile: string;
};

export type RecruitPage = {
  items: RecruitSummary[];
  total: number;
  hasMore: boolean;
};

export type RecruitPageOptions = {
  page: number;
  limit: number;
  filters: RecruitFilters;
  dutyNames?: string[];
  signal?: AbortSignal;
};

export function createEmptyRecruitFilters(): RecruitFilters {
  return {
    dutyName: "",
    dutyType: "",
    areaId: "",
  };
}
