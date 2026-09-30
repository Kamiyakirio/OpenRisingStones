/** Regression coverage for advanced recruitment combination filters. */
import assert from "node:assert/strict";
import test from "node:test";
import type {
  RecruitDetail,
  RecruitJob,
} from "../src/features/recruit/types.ts";

import { createEmptyAdvancedRecruitFilters } from "../src/features/recruit/utils/advancedRecruitDefaults.ts";
import { filterAdvancedRecruitItems } from "../src/features/recruit/utils/advancedRecruitFilter.ts";
import {
  matchesRecruitKeywordQuery,
  parseRecruitKeywords,
} from "../src/features/recruit/utils/recruitPreferences.ts";

const job = (id: number, name: string): RecruitJob => ({
  id,
  name,
  icon: null,
  category: "Job",
});
const detail = (overrides: Partial<RecruitDetail> = {}): RecruitDetail => ({
  id: 1,
  author: "Player",
  avatar: null,
  areaName: "Area",
  groupName: "World",
  targetAreaName: "Target",
  dutyType: "Savage",
  dutyName: "Raid Floor 1",
  schedule: "Evening",
  teamComposition: "Full Party",
  progress: "Fresh",
  strategy: "Guide A",
  labels: [],
  customLabel: null,
  needJobs: [job(10, "Healer")],
  slots: [
    { key: "MT", jobId: 7 },
    { key: "H1", jobId: null },
  ],
  responseCount: 0,
  publishedAt: "",
  expiresAt: "",
  updatedAt: "",
  teamDetail: "Clear within one month",
  recruitRequirements: "Review logs and communicate",
  strategyDescription: "Use guide A throughout",
  dueDay: 7,
  ipLocation: "Location",
  profile: "",
  ...overrides,
});

test("combines duty, existing job, and missing job filters", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.dutyNames = ["Raid Floor 1"];
  filters.existingJobIds = [7];
  filters.missingJobIds = [10];

  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 1);
  filters.existingJobIds = [8];
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 0);
});

test("filters the positions players most commonly want to fill", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.openPositions = ["H1"];
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 1);

  filters.openPositions = ["H2"];
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 0);

  filters.openPositions = ["H1", "H2"];
  filters.openPositionMode = "any";
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 1);
  filters.openPositionMode = "all";
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 0);
});

test("applies scoped keyword and regex rules with all semantics", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.textRules = [
    {
      id: 1,
      mode: "keyword",
      pattern: "one month",
      fields: ["teamDetail"],
    },
    {
      id: 2,
      mode: "regex",
      pattern: "/communicat(e|ion)/i",
      fields: ["recruitRequirements"],
    },
  ];

  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 1);
  filters.textRules[1].fields = ["strategyDescription"];
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 0);
});

test("reports invalid or risky regular expressions", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.textRules = [
    { id: 3, mode: "regex", pattern: "(a+)+$", fields: ["teamDetail"] },
  ];

  const result = filterAdvancedRecruitItems([detail()], filters);
  assert.equal(result.items.length, 0);
  assert.equal(result.ruleErrors[0]?.ruleId, 3);
});

// Preferences must compose with the original filters and never override exclusions.
test("combines keyword tokens and excludes terms found only in details", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.progressText = "fresh -clear";
  filters.strategyText = "guide,a";
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 1);
  filters.excludeText = "-logs";
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 0);
});

test("matches labels with all/any semantics and target area", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.areaName = "target";
  filters.labelNames = ["Practice", "Clear"];
  const item = detail({ labels: [{ id: 0, name: "Practice" }] });
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 0);
  filters.labelMode = "any";
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 1);
  filters.areaName = "Other";
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 0);
});

test("normalizes notation variants found in the recruitment snapshot", () => {
  assert.equal(
    matchesRecruitKeywordQuery("\u4ece\u96f6\u5f00\u8352", "\u4ece0"),
    true,
  );
  assert.equal(matchesRecruitKeywordQuery("Ｐ ３\u5f00\u8352", "p3"), true);
  assert.equal(matchesRecruitKeywordQuery("MGL MLM", "mgl+mlm"), true);
  assert.equal(matchesRecruitKeywordQuery("MGL＋MLM", "mgl mlm"), true);
  assert.deepEqual(
    parseRecruitKeywords("\u9c7c\u5b50\u9171+YMD -\u81ea\u521b"),
    ["\u9c7c\u5b50\u9171", "ymd", "-\u81ea\u521b"],
  );
  assert.equal(matchesRecruitKeywordQuery("P1\u5f00\u8352", "+1"), false);
  assert.equal(matchesRecruitKeywordQuery("\u9884\u8ba1+1", "+1"), true);
});

test("matches snapshot labels by name when every source id is zero", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.labelNames = ["\u5f00\u8352\u7ec3\u4e60"];
  const practice = detail({
    labels: [{ id: 0, name: "\u5f00\u8352\u7ec3\u4e60" }],
  });
  const repeat = detail({
    id: 2,
    labels: [{ id: 0, name: "\u53cd\u590d\u653b\u7565" }],
  });
  assert.deepEqual(
    filterAdvancedRecruitItems([practice, repeat], filters).items.map(
      (item) => item.id,
    ),
    [1],
  );
});

test("applies normalized keyword matching to scoped text rules", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.textRules = [
    {
      id: 1,
      mode: "keyword",
      pattern: "mgl+mlm",
      fields: ["strategyDescription"],
    },
  ];
  const item = detail({ strategyDescription: "MGL / MLM with adjustments" });
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 1);
});

test("allows scoped keyword tokens to match across selected fields", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.textRules = [
    {
      id: 1,
      mode: "keyword",
      pattern: "\u5f00\u8352 \u6c9f\u901a",
      fields: ["teamDetail", "recruitRequirements"],
    },
  ];
  const item = detail({
    teamDetail: "\u4ece\u96f6\u5f00\u8352",
    recruitRequirements: "\u613f\u610f\u6c9f\u901a\u590d\u76d8",
  });
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 1);
  filters.textRules[0].fields = ["teamDetail"];
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 0);
});

test("expands needed roles and removes duplicate playable jobs", () => {
  const healer = {
    ...job(10, "White Mage"),
    category: "\u6cbb\u7597\u804c\u4e1a",
  };
  const role = { ...job(5, "\u6cbb\u7597\u804c\u4e1a"), category: "Role" };
  const config = {
    jobs: [healer, role],
    roleJobs: [role],
    duties: [],
    labels: [],
    areas: [],
  };
  const filters = createEmptyAdvancedRecruitFilters();
  filters.playableJobIds = [10];
  const item = detail({ needJobs: [role], slots: [{ key: "H1", jobId: 10 }] });
  assert.equal(
    filterAdvancedRecruitItems([item], filters, config).items.length,
    0,
  );
  filters.noDuplicateJobs = false;
  assert.equal(
    filterAdvancedRecruitItems([item], filters, config).items.length,
    1,
  );
  item.needJobs = [];
  item.slots = [{ key: "H2", jobId: null }];
  assert.equal(
    filterAdvancedRecruitItems([item], filters, config).items.length,
    1,
  );
  item.slots = [{ key: "MT", jobId: null }];
  assert.equal(
    filterAdvancedRecruitItems([item], filters, config).items.length,
    0,
  );
});

test("filters overnight schedules, weekdays, and unknown times", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.timeStart = "20";
  filters.timeEnd = "2";
  filters.timeDays = ["6"];
  filters.showUnparsedTime = false;
  const overnight = detail({ schedule: "\u5468\u672b \u665a8-2" });
  assert.equal(
    filterAdvancedRecruitItems([overnight], filters).items.length,
    1,
  );
  filters.dailyMaxHours = "3";
  assert.equal(
    filterAdvancedRecruitItems([overnight], filters).items.length,
    0,
  );
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 0);
  filters.showUnparsedTime = true;
  assert.equal(filterAdvancedRecruitItems([detail()], filters).items.length, 1);
});

test("unknown clock times cannot bypass explicit daily duration or rest days", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.dailyMaxHours = "3";
  filters.timeStart = "20";
  assert.equal(
    filterAdvancedRecruitItems(
      [detail({ schedule: "\u6bcf\u59295\u5c0f\u65f6" })],
      filters,
    ).items.length,
    0,
  );
  filters.timeDays = ["6"];
  assert.equal(
    filterAdvancedRecruitItems(
      [detail({ schedule: "\u5468\u516d\u4f11\u606f" })],
      filters,
    ).items.length,
    0,
  );
});

test("limits vacancies to the selected alliance", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.alliance = "A";
  filters.openPositions = ["H1"];
  const item = detail({
    slots: [
      { key: "H1", jobId: 10, alliance: "A" },
      { key: "H1", jobId: null, alliance: "B" },
    ],
  });
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 0);
  filters.alliance = "B";
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 1);
});
