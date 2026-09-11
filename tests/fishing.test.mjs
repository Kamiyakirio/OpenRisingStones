/** Exercise timing boundaries, missing data, combined filters, and persistent progress. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  EORZEA_HOUR,
  filterFish,
  forecastTarget,
  isWindowOpen,
  nextWindows,
  parseProgress,
  weatherAt,
  isUnrestricted,
  sortFish,
  upcomingWindow,
  patchGroup,
} from "../src/features/fishing/model.ts";

const catalog = JSON.parse(
  readFileSync(
    new URL("../public/data/fishing/catalog.json", import.meta.url),
    "utf8",
  ),
);
const endoceras = catalog.fish.find((fish) => fish.id === 8756);
const fishAt = (startHour, endHour) => ({
  ...endoceras,
  conditions: {
    ...endoceras.conditions,
    startHour,
    endHour,
    weather: [],
    previousWeather: [],
  },
});

test("ten default windows and extended results retain complete boundaries", () => {
  const fish = fishAt(20, 4);
  const windows = nextWindows(fish, catalog, 18 * EORZEA_HOUR);
  assert.equal(windows.length, 10);
  const expanded = nextWindows(fish, catalog, 18 * EORZEA_HOUR, 20);
  assert.equal(expanded.length, 20);
  assert.deepEqual(expanded.slice(0, 10), windows);
  for (const window of expanded) {
    assert.equal(window.end - window.start, 8 * EORZEA_HOUR);
    assert.equal(isWindowOpen(fish, catalog, window.start), true);
    assert.equal(isWindowOpen(fish, catalog, window.end), false);
  }
  assert.deepEqual(
    nextWindows(fish, catalog, 18 * EORZEA_HOUR, 10, false, 0.001),
    [],
  );
  assert.equal(nextWindows(fishAt(0, 24), catalog, 0)[0].end, Infinity);
});

test("Fish Eyes ignores eligible rod time restrictions but retains weather and eligibility", () => {
  const fish = fishAt(20, 4);
  fish.conditions.fishEyes = true;
  const now = 10 * EORZEA_HOUR;
  assert.equal(isWindowOpen(fish, catalog, now), false);
  assert.equal(isWindowOpen(fish, catalog, now, true), true);
  assert.equal(isUnrestricted(fish, true), true);
  assert.equal(
    isWindowOpen({ ...fish, method: "spear" }, catalog, now, true),
    false,
  );
  assert.equal(
    isWindowOpen(
      { ...fish, conditions: { ...fish.conditions, fishEyes: false } },
      catalog,
      now,
      true,
    ),
    false,
  );
  fish.conditions.weather = [99999];
  assert.equal(isWindowOpen(fish, catalog, now, true), false);
  assert.equal(isUnrestricted(fish, true), false);
});

test("window sorting prioritizes expiry, then opening, then unrestricted and unknown", () => {
  const fishes = [
    fishAt(0, 24),
    fishAt(14, 15),
    fishAt(9, 13),
    fishAt(9, 11),
    fishAt(12, 13),
    { ...endoceras, method: "ocean" },
  ].map((fish, index) => ({ ...fish, id: index + 1 }));
  const local = { ...catalog, fish: fishes };
  const now = 10 * EORZEA_HOUR;
  assert.deepEqual(
    sortFish(fishes, local, "window", now).map((f) => f.id),
    [4, 3, 5, 2, 1, 6],
  );
  const first = upcomingWindow(fishes[3], local, now);
  assert.strictEqual(upcomingWindow(fishes[3], local, now + 1000), first);
  assert.ok(upcomingWindow(fishes[3], local, first.end).start > first.end);
});

test("multi-select facets combine, preserve empty selections, and group minor patches", () => {
  assert.equal(patchGroup(7.25), "7.2");
  assert.equal(patchGroup(null), "unknown");
  assert.equal(
    filterFish(catalog, { ...filters, kinds: [] }, progress, 0).length,
    0,
  );
  const selected = filterFish(
    catalog,
    {
      ...filters,
      kinds: ["legendary"],
      waters: ["world"],
      methods: ["rod"],
      patches: [patchGroup(endoceras.patch)],
      completion: ["uncaught"],
    },
    progress,
    0,
  );
  assert.ok(selected.some((fish) => fish.id === 8756));
  assert.equal(
    filterFish(
      catalog,
      { ...filters, query: "8756", completion: ["uncaught"] },
      { saved: [], caught: [8756] },
      0,
    ).length,
    0,
  );
  assert.equal(endoceras.kind, "legendary");
  assert.equal(catalog.fish.find((fish) => fish.id === 20144).patch, 4);
  assert.equal(catalog.fish.find((fish) => fish.id === 29788).patch, 5.2);
  assert.ok(
    catalog.fish.every(
      (fish) => fish.patch === null || (fish.patch >= 2 && fish.patch < 8),
    ),
  );
  for (const fish of catalog.fish)
    for (const id of fish.conditions.bait.flat())
      assert.ok(catalog.itemIcons[id] > 0, `Missing bait image ${id}`);
});
const filters = {
  query: "",
  kind: "all",
  zone: "",
  progress: "all",
  available: false,
};
const progress = { saved: [], caught: [] };

test("catalog joins unique fish IDs with Chinese spots and valid condition references", () => {
  assert.ok(catalog.fish.length >= 1730);
  assert.equal(
    new Set(catalog.fish.map((fish) => fish.id)).size,
    catalog.fish.length,
  );
  assert.equal(endoceras.name, "\u5185\u89d2\u77f3");
  assert.equal(
    endoceras.locations[0].name,
    "\u5e7b\u5f71\u7fa4\u5c9b\u5357\u5cb8",
  );
  for (const fish of catalog.fish) {
    for (const spot of fish.locations) {
      assert.ok(spot.territory > 0, `Invalid territory for spot ${spot.id}`);
      assert.notEqual(
        spot.name,
        String(spot.id),
        `Placeholder spot ${spot.id}`,
      );
    }
    if (!fish.conditions) continue;
    for (const id of fish.conditions.bait.flat())
      assert.ok(catalog.items[id], `Missing bait ${id}`);
    for (const id of [
      ...(fish.conditions.weather ?? []),
      ...(fish.conditions.previousWeather ?? []),
    ])
      assert.ok(catalog.weather[id], `Missing weather ${id}`);
  }
});
test("overnight and fractional windows include their start and exclude their end", () => {
  const fish = fishAt(20, 4);
  for (const hour of [0, 3.999, 20, 23.999])
    assert.equal(isWindowOpen(fish, catalog, hour * EORZEA_HOUR), true);
  for (const hour of [4, 12, 19.999])
    assert.equal(isWindowOpen(fish, catalog, hour * EORZEA_HOUR), false);
  const fractional = fishAt(6.5, 8.5);
  assert.equal(isWindowOpen(fractional, catalog, 6.49 * EORZEA_HOUR), false);
  assert.equal(isWindowOpen(fractional, catalog, 6.5 * EORZEA_HOUR), true);
  assert.equal(isWindowOpen(fractional, catalog, 8.5 * EORZEA_HOUR), false);
});
test("forecast remains stable throughout a weather period and honors cumulative cutoffs", () => {
  assert.equal(forecastTarget(0), 56);
  assert.equal(forecastTarget(8 * EORZEA_HOUR - 1), 56);
  const fixed = {
    ...catalog,
    weatherRates: {
      1: [
        [3, 56],
        [7, 100],
      ],
    },
  };
  assert.equal(weatherAt(fixed, 1, 0), 7);
  assert.equal(weatherAt(fixed, 99999, 0), undefined);
});
test("previous and current weather must both match", () => {
  const now = Date.UTC(2026, 8, 12);
  const fish = fishAt(0, 24);
  const territory = fish.locations[0].territory;
  const current = weatherAt(catalog, territory, now);
  const previous = weatherAt(catalog, territory, now - 8 * EORZEA_HOUR);
  fish.conditions.weather = [current];
  fish.conditions.previousWeather = [previous];
  assert.equal(isWindowOpen(fish, catalog, now), true);
  fish.conditions.previousWeather = [99999];
  assert.equal(isWindowOpen(fish, catalog, now), false);
  fish.conditions.previousWeather = [];
  fish.conditions.weather = [99999];
  assert.equal(isWindowOpen(fish, catalog, now), false);
});
test("unknown conditions and ocean voyages do not claim a global clock window", () => {
  const fish = { ...endoceras, conditions: null };
  assert.equal(isWindowOpen(fish, catalog, 0), null);
  assert.deepEqual(nextWindows(fish, catalog, 0), []);
  assert.deepEqual(
    filterFish(
      { ...catalog, fish: [fish] },
      { ...filters, available: true },
      progress,
      0,
    ),
    [],
  );
  assert.equal(
    isWindowOpen({ ...fishAt(0, 24), method: "ocean" }, catalog, 0),
    null,
  );
});
test("ordinary guide flags and spear rules produce usable all-day windows", () => {
  for (const id of [4776, 4870, 20144, 20145, 20217]) {
    const fish = catalog.fish.find((fish) => fish.id === id);
    assert.ok(fish);
    assert.equal(isWindowOpen(fish, catalog, Date.UTC(2026, 8, 12)), true);
    assert.ok(nextWindows(fish, catalog, Date.UTC(2026, 8, 12)).length > 0);
    assert.deepEqual(fish.conditions.weather, []);
  }
  const spear = { ...fishAt(6.5, 8.5), method: "spear" };
  assert.equal(isWindowOpen(spear, catalog, 6.5 * EORZEA_HOUR), true);
  assert.equal(isWindowOpen(spear, catalog, 8.5 * EORZEA_HOUR), false);
});
test("unknown individual fields remain unknown rather than becoming unrestricted", () => {
  for (const field of ["startHour", "endHour", "weather", "previousWeather"]) {
    const fish = fishAt(0, 24);
    fish.conditions[field] = null;
    assert.equal(isWindowOpen(fish, catalog, EORZEA_HOUR), null, field);
    assert.deepEqual(nextWindows(fish, catalog, EORZEA_HOUR), [], field);
  }
});
test("all world records have usable time/weather data and named weather icons", () => {
  for (const fish of catalog.fish.filter((fish) => fish.method !== "ocean")) {
    assert.notEqual(
      isWindowOpen(fish, catalog, Date.UTC(2026, 8, 12)),
      null,
      `${fish.id}: missing world rules`,
    );
  }
  for (const fish of catalog.fish)
    for (const id of [
      ...(fish.conditions?.weather ?? []),
      ...(fish.conditions?.previousWeather ?? []),
    ]) {
      assert.ok(catalog.weatherIcons[id] > 0, `Missing weather icon ${id}`);
    }
  const ocean = catalog.fish.find((fish) => fish.id === 29788);
  assert.equal(ocean.method, "ocean");
  assert.deepEqual(ocean.conditions.weather, [145]);
  assert.ok(ocean.locations.length > 0);
});
test("future windows merge across weather boundaries and preserve exact fractional starts", () => {
  assert.deepEqual(nextWindows(fishAt(20, 4), catalog, 18 * EORZEA_HOUR, 1), [
    { start: 20 * EORZEA_HOUR, end: 28 * EORZEA_HOUR },
  ]);
  assert.deepEqual(nextWindows(fishAt(6.5, 8.5), catalog, 6 * EORZEA_HOUR, 1), [
    { start: 6.5 * EORZEA_HOUR, end: 8.5 * EORZEA_HOUR },
  ]);
  assert.equal(
    nextWindows(fishAt(20, 4), catalog, 21 * EORZEA_HOUR, 1)[0].start,
    21 * EORZEA_HOUR,
  );
});
test("search combines ID, name, category, area, and local progress", () => {
  for (const query of [
    "8756",
    "  ENDOCERAS  ",
    endoceras.name,
    endoceras.locations[0].name,
  ]) {
    assert.ok(
      filterFish(catalog, { ...filters, query }, progress, 0).some(
        (fish) => fish.id === 8756,
      ),
    );
  }
  assert.deepEqual(
    filterFish(
      catalog,
      { ...filters, query: "8756", kind: "normal" },
      progress,
      0,
    ),
    [],
  );
  assert.deepEqual(
    filterFish(catalog, { ...filters, progress: "saved" }, progress, 0),
    [],
  );
  assert.equal(
    filterFish(
      catalog,
      { ...filters, progress: "saved", zone: endoceras.zone },
      { saved: [8756], caught: [] },
      0,
    )[0].id,
    8756,
  );
  assert.equal(
    filterFish(
      catalog,
      { ...filters, query: "8756", progress: "uncaught" },
      { saved: [], caught: [8756] },
      0,
    ).length,
    0,
  );
});
test("malformed local progress recovers and rejects invalid or duplicate IDs", () => {
  for (const value of [null, "{", "null", "[]"])
    assert.deepEqual(parseProgress(value), progress);
  assert.deepEqual(
    parseProgress('{"saved":[8756,8756,-1,"8754",1.5],"caught":false}'),
    { saved: [8756], caught: [] },
  );
});
