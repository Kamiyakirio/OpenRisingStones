/** Regression coverage for advanced recruitment combination filters. */
import assert from "node:assert/strict";
import test from "node:test";

import { createEmptyAdvancedRecruitFilters } from "../src/models/advancedRecruit.ts";
import { filterAdvancedRecruitItems } from "../src/utils/advancedRecruitFilter.ts";

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
