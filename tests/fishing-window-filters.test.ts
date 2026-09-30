/** Verify local calendar filtering, overnight windows, and deeper searches. */
import assert from "node:assert/strict";
import test from "node:test";
import { nextWindows } from "../src/features/fishing/model.ts";
import {
  initialWindowFilters,
  invalidWindowDateRange,
  parseWindowFilters,
  windowMatchesFilters,
  windowSearchHorizonDays,
} from "../src/features/fishing/windowFilters.ts";
import type { Fish, FishCatalog } from "../src/features/fishing/types.ts";

const at = (month: number, day: number, hour: number, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).getTime();

test("stored window filters recover valid fields and reject bad dates", () => {
  assert.deepEqual(parseWindowFilters(null), initialWindowFilters);
  assert.deepEqual(
    parseWindowFilters(
      JSON.stringify({
        fromDate: "2026-02-30",
        toDate: "2026-10-02",
        fromTime: "18:30",
        toTime: "25:00",
        weekdays: [5, 1, 5, 9, "2"],
      }),
    ),
    {
      fromDate: "",
      toDate: "2026-10-02",
      fromTime: "18:30",
      toTime: "",
      weekdays: [1, 5],
    },
  );
  assert.equal(
    invalidWindowDateRange({
      ...initialWindowFilters,
      fromDate: "2026-10-02",
      toDate: "2026-10-01",
    }),
    true,
  );
});

test("calendar filters match time that overlaps an open window", () => {
  const window = { start: at(9, 30, 17, 30), end: at(9, 30, 19) };
  const day = new Date(window.start).getDay();
  const filters = {
    ...initialWindowFilters,
    fromDate: "2026-09-30",
    toDate: "2026-09-30",
    fromTime: "18:00",
    toTime: "18:30",
    weekdays: [day],
  };
  assert.equal(windowMatchesFilters(window, filters), true);
  assert.equal(
    windowMatchesFilters(window, { ...filters, weekdays: [(day + 1) % 7] }),
    false,
  );
  assert.equal(
    windowMatchesFilters(window, {
      ...filters,
      fromTime: "19:00",
      toTime: "20:00",
    }),
    false,
  );
  assert.equal(
    windowMatchesFilters(window, {
      ...filters,
      fromDate: "2026-10-01",
      toDate: "2026-10-01",
    }),
    false,
  );
});

test("overnight windows use the actual local date on each side of midnight", () => {
  const window = { start: at(9, 30, 23, 30), end: at(10, 1, 0, 30) };
  const octoberDay = new Date(at(10, 1, 0)).getDay();
  const october = {
    ...initialWindowFilters,
    fromDate: "2026-10-01",
    toDate: "2026-10-01",
    weekdays: [octoberDay],
    fromTime: "00:00",
    toTime: "01:00",
  };
  assert.equal(windowMatchesFilters(window, october), true);
  assert.equal(
    windowMatchesFilters(window, {
      ...october,
      fromDate: "2026-09-30",
      toDate: "2026-09-30",
    }),
    false,
  );
  assert.equal(
    windowMatchesFilters(window, {
      ...october,
      fromTime: "22:00",
      toTime: "02:00",
    }),
    true,
  );
});

test("window search continues past the first ten nonmatching windows", () => {
  // nextWindows reads only these fields from this focused test fixture.
  const fish = {
    id: 1,
    method: "rod",
    locations: [{ territory: 1 }],
    conditions: {
      startHour: 20,
      endHour: 4,
      weather: [],
      previousWeather: [],
      fishEyes: false,
    },
  } as unknown as Fish;
  const catalog = { weatherRates: {} } as FishCatalog;
  const firstTen = nextWindows(fish, catalog, 0, 10);
  const after = firstTen.at(-1)!.end;
  const later = nextWindows(
    fish,
    catalog,
    0,
    10,
    false,
    365,
    (window) => window.start >= after,
  );
  assert.equal(later.length, 10);
  assert.ok(later.every((window) => window.start >= after));
  assert.ok(
    windowSearchHorizonDays(at(9, 30, 0), 365, {
      ...initialWindowFilters,
      fromDate: "2028-01-01",
    }) > 365,
  );
});
