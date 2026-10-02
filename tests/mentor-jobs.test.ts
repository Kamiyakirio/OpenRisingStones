/** Covers ID-only game records and name-only records imported from the old site. */
import assert from "node:assert/strict";
import test from "node:test";
import { CLASS_JOB_OPTIONS } from "../src/features/glamour/data/classJobs.ts";
import {
  getMentorJobRole,
  resolveMentorJob,
} from "../src/features/mentor/utils/jobs.ts";

test("legacy labels and abbreviations resolve to the same game icon and role", () => {
  for (const job of CLASS_JOB_OPTIONS) {
    const game = resolveMentorJob(job.glamourId, null);
    assert.deepEqual(resolveMentorJob(null, job.label), game);
    assert.deepEqual(
      resolveMentorJob(null, ` ${job.value.toLowerCase()} `),
      game,
    );
    assert.equal(game.label, job.label);
    assert.ok(game.iconUrl);
  }
});

test("combat roles cover base classes and recent jobs without coloring crafters", () => {
  for (const id of [1, 3, 19, 21, 32, 37])
    assert.equal(getMentorJobRole(id), "tank");
  for (const id of [6, 24, 28, 33, 40])
    assert.equal(getMentorJobRole(id), "healer");
  for (const id of [26, 36, 41, 42]) assert.equal(getMentorJobRole(id), "dps");
  for (const id of [0, 8, 18, 99]) assert.equal(getMentorJobRole(id), "other");
});

test("unknown jobs retain their text without inventing an icon or a combat role", () => {
  assert.deepEqual(resolveMentorJob(null, "Unknown Job"), {
    label: "Unknown Job",
    role: "other",
    iconUrl: null,
  });
  assert.deepEqual(resolveMentorJob(null, null), {
    label: "",
    role: "other",
    iconUrl: null,
  });
  assert.equal(resolveMentorJob(999, "PLD").iconUrl, null);
  assert.equal(
    resolveMentorJob(19, "WAR").label,
    CLASS_JOB_OPTIONS.find((job) => job.glamourId === 19)?.label,
  );
});
