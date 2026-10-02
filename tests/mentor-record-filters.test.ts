/** Verify intersecting filters against game and name-only legacy records. */
import assert from "node:assert/strict";
import test from "node:test";
import type { MentorRecord } from "../src/features/mentor/api/mentorApi.ts";
import dutyNames from "../src/features/mentor/data/dutyNames.json";
import {
  DEFAULT_MENTOR_FILTERS,
  filterMentorRecords,
  mentorCharacterKey,
  mentorDateRangeInvalid,
} from "../src/features/mentor/utils/recordFilters.ts";

const now = new Date(2026, 9, 3, 12).getTime();
const record = (overrides: Partial<MentorRecord>): MentorRecord => ({
  id: "run",
  characterId: "character",
  characterName: "Character",
  dutyId: 4,
  dutyName: "Duty",
  jobId: 24,
  jobName: null,
  startedAtMs: now,
  endedAtMs: now + 1000,
  result: "completed",
  source: "game",
  note: "",
  legacyKey: null,
  ...overrides,
});

test("all conditions intersect without changing the source records", () => {
  const matching = record({ id: "match" });
  const records = [
    matching,
    record({ id: "wrong-role", jobId: 19 }),
    record({ id: "wrong-type", dutyId: 92 }),
    record({ id: "wrong-result", result: "exited" }),
    record({ id: "wrong-source", source: "manual" }),
    record({ id: "wrong-character", characterId: "other" }),
  ];
  assert.deepEqual(
    filterMentorRecords(
      records,
      {
        ...DEFAULT_MENTOR_FILTERS,
        period: "month",
        character: mentorCharacterKey(matching),
        job: "role:healer",
        dutyType: "dungeon",
        result: "completed",
        source: "game",
      },
      now,
    ),
    [matching],
  );
  assert.equal(records.length, 6);
});

test("name-only imported records use the same duty and job filters", () => {
  const imported = record({
    dutyId: null,
    dutyName: (dutyNames as Record<string, string>)["92"],
    jobId: null,
    jobName: "WAR",
    source: "legacy_site",
  });
  assert.equal(
    filterMentorRecords(
      [imported],
      { ...DEFAULT_MENTOR_FILTERS, dutyType: "alliance", job: "role:tank" },
      now,
    ).length,
    1,
  );
  const job = filterMentorRecords(
    [imported],
    { ...DEFAULT_MENTOR_FILTERS, search: "war" },
    now,
  );
  assert.equal(job.length, 1);
});

test("search supports multiple words across character and notes", () => {
  const matching = record({ note: "First clear" });
  assert.deepEqual(
    filterMentorRecords(
      [matching],
      { ...DEFAULT_MENTOR_FILTERS, search: " character CLEAR " },
      now,
    ),
    [matching],
  );
  assert.equal(
    filterMentorRecords(
      [matching],
      { ...DEFAULT_MENTOR_FILTERS, search: "character missing" },
      now,
    ).length,
    0,
  );
});

test("custom dates include the end day's last millisecond and reject reversed bounds", () => {
  const filters = {
    ...DEFAULT_MENTOR_FILTERS,
    period: "custom" as const,
    from: "2026-10-02",
    to: "2026-10-03",
  };
  const start = new Date(2026, 9, 2).getTime(),
    end = new Date(2026, 9, 4).getTime();
  const records = [
    record({ id: "before", startedAtMs: start - 1 }),
    record({ id: "start", startedAtMs: start }),
    record({ id: "end", startedAtMs: end - 1 }),
    record({ id: "after", startedAtMs: end }),
  ];
  assert.deepEqual(
    filterMentorRecords(records, filters, now).map((record) => record.id),
    ["end", "start"],
  );
  assert.equal(
    mentorDateRangeInvalid({ ...filters, from: "2026-10-04" }),
    true,
  );
  assert.equal(
    mentorDateRangeInvalid({ ...filters, from: "2026-02-30" }),
    true,
  );
  assert.deepEqual(
    filterMentorRecords(records, { ...filters, from: "2026-10-04" }, now),
    [],
  );
});

test("today includes local midnight and newly arrived records", () => {
  const start = new Date(2026, 9, 3).getTime();
  const records = [
    record({ id: "yesterday", startedAtMs: start - 1 }),
    record({ id: "today", startedAtMs: start }),
    record({ id: "new", startedAtMs: now + 1000 }),
  ];
  assert.deepEqual(
    filterMentorRecords(
      records,
      { ...DEFAULT_MENTOR_FILTERS, period: "today", order: "oldest" },
      now,
    ).map((record) => record.id),
    ["today", "new"],
  );
});

test("unknown job and character filters retain incomplete records", () => {
  const unknown = record({
    characterId: "",
    characterName: "",
    jobId: null,
    jobName: null,
    dutyId: null,
    dutyName: "Unknown Duty",
  });
  assert.deepEqual(
    filterMentorRecords(
      [unknown, record({})],
      {
        ...DEFAULT_MENTOR_FILTERS,
        character: "unknown",
        job: "job:",
        dutyType: "unknown",
      },
      now,
    ),
    [unknown],
  );
});
