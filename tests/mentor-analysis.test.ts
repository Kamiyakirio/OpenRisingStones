/** Analysis excludes in-progress runs and unreliable duration or result samples. */
import assert from "node:assert/strict";
import test from "node:test";
import type { MentorRecord } from "../src/features/mentor/api/mentorApi.ts";
import {
  analyzeMentorRecords,
  mentorAnalysisStart,
} from "../src/features/mentor/utils/analysis.ts";
import dutyNames from "../src/features/mentor/data/dutyNames.json";
import { resolveMentorDutyCategory } from "../src/features/mentor/utils/dutyTypes.ts";

const record = (values: Partial<MentorRecord>): MentorRecord => ({
  id: "record",
  characterId: "character",
  characterName: "Character",
  dutyId: null,
  dutyName: "Duty",
  jobId: 19,
  jobName: null,
  startedAtMs: 1000,
  endedAtMs: 61000,
  result: "completed",
  source: "game",
  note: "",
  legacyKey: null,
  ...values,
});

test("completion rate excludes unknown outcomes and active runs", () => {
  const analysis = analyzeMentorRecords(
    [
      record({ id: "completed" }),
      record({ id: "exited", result: "exited" }),
      record({ id: "review", result: "needs_review" }),
      record({ id: "legacy", result: "legacy_unknown", source: "legacy_site" }),
      record({ id: "active", result: "needs_review", endedAtMs: null }),
    ],
    "active",
  );
  assert.equal(analysis.total, 4);
  assert.equal(analysis.activeCount, 1);
  assert.equal(analysis.completionRate, 0.5);
  assert.equal(analysis.results.needs_review, 1);
  assert.deepEqual(analysis.sources, { game: 3, manual: 0, legacy_site: 1 });
});

test("elapsed time uses only finalized game records with valid timestamps", () => {
  const analysis = analyzeMentorRecords(
    [
      record({}),
      record({ endedAtMs: 121000, result: "exited" }),
      record({ endedAtMs: null }),
      record({ endedAtMs: 0 }),
      record({ source: "manual" }),
      record({ source: "legacy_site" }),
      record({ result: "needs_review" }),
    ],
    null,
  );
  assert.equal(analysis.durationCount, 2);
  assert.equal(analysis.averageDurationMs, 90000);
});

test("name-only legacy jobs merge with the same job's game ID", () => {
  const analysis = analyzeMentorRecords(
    [
      record({}),
      record({ jobId: null, jobName: "PLD", source: "legacy_site" }),
      record({ jobId: null, jobName: null, dutyName: "Other Duty" }),
    ],
    null,
  );
  assert.equal(analysis.jobs[0].count, 2);
  assert.equal(analysis.jobs.length, 2);
  assert.deepEqual(analysis.duties, [
    { key: "Duty", count: 2 },
    { key: "Other Duty", count: 1 },
  ]);
});

test("empty and unknown-only sets do not invent rates or durations", () => {
  for (const records of [
    [],
    [record({ result: "legacy_unknown", source: "legacy_site" })],
  ]) {
    const analysis = analyzeMentorRecords(records, null);
    assert.equal(analysis.completionRate, null);
    assert.equal(analysis.averageDurationMs, null);
  }
});

test("date windows start at local midnight and include today", () => {
  const now = new Date(2026, 9, 2, 15).getTime();
  assert.equal(mentorAnalysisStart(30, now), new Date(2026, 8, 3).getTime());
  assert.equal(mentorAnalysisStart(1, now), new Date(2026, 9, 2).getTime());
  assert.equal(mentorAnalysisStart(0, now), -Infinity);
});

test("game catalog separates dungeons, trials, raids, alliances and guildhests", () => {
  for (const [id, expected] of [
    [4, "dungeon"],
    [56, "trial"],
    [42, "guildhest"],
    [92, "alliance"],
    [93, "raid"],
  ] as const) {
    const name = (dutyNames as Record<string, string>)[String(id)];
    assert.equal(resolveMentorDutyCategory(id, "Unmatched name"), expected);
    assert.equal(resolveMentorDutyCategory(null, name), expected);
    assert.equal(
      resolveMentorDutyCategory(null, name.replace(/\s/g, "")),
      expected,
    );
  }
  assert.equal(resolveMentorDutyCategory(null, "Unknown Duty"), "unknown");
});

test("type counts include imported and exited records but exclude an active run", () => {
  const analysis = analyzeMentorRecords(
    [
      record({ id: "game", dutyId: 4 }),
      record({
        id: "legacy",
        dutyName: (dutyNames as Record<string, string>)["4"],
        source: "legacy_site",
      }),
      record({ id: "exited", dutyId: 92, result: "exited" }),
      record({ id: "active", dutyId: 42 }),
      record({ id: "unknown", dutyName: "Unknown Duty" }),
    ],
    "active",
  );
  assert.equal(analysis.dutyCategories.dungeon, 2);
  assert.equal(analysis.dutyCategories.alliance, 1);
  assert.equal(analysis.dutyCategories.guildhest, 0);
  assert.equal(analysis.dutyCategories.unknown, 1);
  assert.equal(
    Object.values(analysis.dutyCategories).reduce((a, b) => a + b, 0),
    analysis.total,
  );
});
