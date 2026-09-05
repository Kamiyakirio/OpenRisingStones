/** Regression coverage for real party sizes and alliance-specific vacancies. */
import assert from "node:assert/strict";
import test from "node:test";
import { parseRecruitSlots } from "../src/features/recruit/utils/recruitSlots.ts";

test("light parties map T/H without inventing full-party slots", () => {
  const slots = parseRecruitSlots({
    team_composition: "轻锐小队",
    T: 2,
    H: 0,
    D1: 21,
    D2: 25,
  });
  assert.deepEqual(
    slots.map((slot) => slot.key),
    ["MT", "H1", "D1", "D2"],
  );
  assert.deepEqual(
    slots.filter((slot) => slot.jobId === null),
    [{ key: "H1", jobId: null }],
  );
});

test("alliance rosters preserve team keys and omit unavailable teams", () => {
  const slots = parseRecruitSlots({
    team_composition: "团队",
    team_position: { A: { MT: 2 }, C: { H1: 10 } },
  });
  assert.equal(slots.length, 16);
  assert.equal(
    slots.find((slot) => slot.alliance === "C" && slot.key === "H1").jobId,
    10,
  );
  assert.equal(
    slots.some((slot) => slot.alliance === "B"),
    false,
  );
  assert.deepEqual(parseRecruitSlots({ team_composition: "团队" }), []);
});
