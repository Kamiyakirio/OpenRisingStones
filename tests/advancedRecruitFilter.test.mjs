/** Regression coverage for advanced recruitment combination filters. */
import assert from "node:assert/strict";
import test from "node:test";

import { createEmptyAdvancedRecruitFilters } from "../src/features/recruit/utils/advancedRecruitDefaults.ts";
import { filterAdvancedRecruitItems } from "../src/features/recruit/utils/advancedRecruitFilter.ts";
import {
  matchesRecruitKeywordQuery,
  parseRecruitKeywords,
} from "../src/features/recruit/utils/recruitPreferences.ts";

const job = (id, name) => ({ id, name, icon: null, category: "Job" });
const detail = (overrides = {}) => ({
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
  assert.equal(matchesRecruitKeywordQuery("从零开荒", "从0"), true);
  assert.equal(matchesRecruitKeywordQuery("Ｐ ３开荒", "p3"), true);
  assert.equal(matchesRecruitKeywordQuery("MGL MLM", "mgl+mlm"), true);
  assert.equal(matchesRecruitKeywordQuery("MGL＋MLM", "mgl mlm"), true);
  assert.deepEqual(parseRecruitKeywords("鱼子酱+YMD -自创"), [
    "鱼子酱",
    "ymd",
    "-自创",
  ]);
  assert.equal(matchesRecruitKeywordQuery("P1开荒", "+1"), false);
  assert.equal(matchesRecruitKeywordQuery("预计+1", "+1"), true);
});

test("matches snapshot labels by name when every source id is zero", () => {
  const filters = createEmptyAdvancedRecruitFilters();
  filters.labelNames = ["开荒练习"];
  const practice = detail({
    labels: [{ id: 0, name: "开荒练习" }],
  });
  const repeat = detail({
    id: 2,
    labels: [{ id: 0, name: "反复攻略" }],
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
      pattern: "开荒 沟通",
      fields: ["teamDetail", "recruitRequirements"],
    },
  ];
  const item = detail({
    teamDetail: "从零开荒",
    recruitRequirements: "愿意沟通复盘",
  });
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 1);
  filters.textRules[0].fields = ["teamDetail"];
  assert.equal(filterAdvancedRecruitItems([item], filters).items.length, 0);
});

test("expands needed roles and removes duplicate playable jobs", () => {
  const healer = {
    ...job(10, "White Mage"),
    category: "治疗职业",
  };
  const role = { ...job(5, "治疗职业"), category: "Role" };
  const config = { jobs: [healer, role], roleJobs: [role] };
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
  const overnight = detail({ schedule: "周末 晚8-2" });
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
    filterAdvancedRecruitItems([detail({ schedule: "每天5小时" })], filters)
      .items.length,
    0,
  );
  filters.timeDays = ["6"];
  assert.equal(
    filterAdvancedRecruitItems([detail({ schedule: "周六休息" })], filters)
      .items.length,
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
