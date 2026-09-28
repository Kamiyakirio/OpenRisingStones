/** Rotation boundaries must keep the official 7.5 order in every timezone. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  getCrystallineConflictRotation,
  getFrontlineRotation,
} from "../src/shared/utils/pvpMap.ts";

test("Frontline changes at 15:00 UTC and follows the full eight-day cycle", () => {
  const before = getFrontlineRotation(new Date("2026-05-01T14:59:59Z"));
  const atBoundary = getFrontlineRotation(new Date("2026-05-01T15:00:00Z"));
  const nextDay = getFrontlineRotation(new Date("2026-05-02T15:00:00Z"));
  const repeatedSeize = getFrontlineRotation(new Date("2026-05-05T15:00:00Z"));

  assert.equal(before.map.id, "triumph");
  assert.equal(before.nextRotationAt.toISOString(), "2026-05-01T15:00:00.000Z");
  assert.equal(atBoundary.map.id, "seize");
  assert.equal(atBoundary.nextMap.id, "shatter");
  assert.equal(nextDay.map.id, "shatter");
  assert.equal(repeatedSeize.map.id, "seize");
  assert.equal(repeatedSeize.nextMap.id, "secure");

  const expected = [
    "seize",
    "shatter",
    "naadam",
    "triumph",
    "seize",
    "secure",
    "naadam",
    "triumph",
  ];
  for (const [index, mapId] of expected.entries()) {
    const day = new Date(
      Date.parse("2026-05-01T15:00:00Z") + index * 86_400_000,
    );
    assert.equal(getFrontlineRotation(day).map.id, mapId);
  }
  assert.equal(
    getFrontlineRotation(new Date("2026-07-27T03:00:00Z")).map.id,
    "naadam",
  );
});

test("Crystalline Conflict changes hourly and loops after seven arenas", () => {
  const before = getCrystallineConflictRotation(
    new Date("2026-04-28T19:59:59Z"),
  );
  const atBoundary = getCrystallineConflictRotation(
    new Date("2026-04-28T20:00:00Z"),
  );
  const nextHour = getCrystallineConflictRotation(
    new Date("2026-04-28T21:00:00Z"),
  );
  const nextCycle = getCrystallineConflictRotation(
    new Date("2026-04-29T03:00:00Z"),
  );

  assert.equal(before.map.id, "redsands");
  assert.equal(atBoundary.map.id, "palaistra");
  assert.equal(atBoundary.nextMap.id, "volcanic");
  assert.equal(
    atBoundary.nextRotationAt.toISOString(),
    "2026-04-28T21:00:00.000Z",
  );
  assert.equal(nextHour.map.id, "volcanic");
  assert.equal(nextCycle.map.id, "palaistra");

  const expected = [
    "palaistra",
    "volcanic",
    "bayside",
    "cloudnine",
    "castletown",
    "harmonias",
    "redsands",
  ];
  for (const [index, mapId] of expected.entries()) {
    const hour = new Date(
      Date.parse("2026-04-28T13:00:00Z") + index * 3_600_000,
    );
    assert.equal(getCrystallineConflictRotation(hour).map.id, mapId);
  }
});

test("the observed September 28 rotation is stable across date offsets", () => {
  const utc = new Date("2026-09-28T03:00:00Z");
  const offset = new Date("2026-09-28T11:00:00+08:00");

  assert.equal(getFrontlineRotation(utc).map.id, "secure");
  assert.equal(getCrystallineConflictRotation(utc).map.id, "volcanic");
  assert.equal(getFrontlineRotation(offset).map.id, "secure");
  assert.equal(getCrystallineConflictRotation(offset).map.id, "volcanic");
});
