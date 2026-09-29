/** Build an offline fish catalog from the MIT tracker and Chinese game sheets. */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import Papa from "papaparse";
import { pinyin } from "pinyin-pro";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { configureSystemProxy } from "./system-proxy.mjs";

const proxy = configureSystemProxy();
if (proxy) setGlobalDispatcher(new ProxyAgent(proxy.proxyUrl));
const tracker =
  "https://raw.githubusercontent.com/icykoneko/ff14-fish-tracker-app/master/";
const game =
  "https://raw.githubusercontent.com/thewakingsands/ffxiv-datamining-cn/master/";
const teamcraft =
  "https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/";
const distantSeas =
  "https://raw.githubusercontent.com/NotNite/DistantSeas/main/";
const sources = [];
async function download(url) {
  // Raw file hosts occasionally reset concurrent connections; retry transient failures.
  for (let attempt = 1; attempt <= 4; attempt++) {
    let retryable = true;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) {
        retryable = response.status === 429 || response.status >= 500;
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      sources.push({
        url,
        sha256: createHash("sha256").update(text).digest("hex"),
      });
      return text;
    } catch (error) {
      if (!retryable || attempt === 4)
        throw new Error(`Download failed for ${url}: ${error.message}`, {
          cause: error,
        });
      await delay(500 * attempt);
    }
  }
}
// Upstream files contain JSON literals with named top-level sections, not executable input.
function literal(text, declaration) {
  if (!text.startsWith(declaration))
    throw new Error("Unexpected upstream declaration.");
  return JSON.parse(
    text
      .slice(declaration.length)
      .trim()
      .replace(/;$/, "")
      .replace(/^(\s*)([A-Z_]+):/gm, '$1"$2":'),
  );
}
async function sheet(name) {
  const rows = Papa.parse(await download(`${game}${name}.csv`), {
    skipEmptyLines: true,
  }).data;
  const headers = rows[1];
  return new Map(
    rows
      .slice(3)
      .map((row) => [
        Number(row[0]),
        Object.fromEntries(headers.map((key, index) => [key, row[index]])),
      ]),
  );
}
const [
  data,
  guide,
  items,
  places,
  weather,
  fishing,
  spearfishing,
  license,
  notes,
  oceanSpots,
  oceanRouteRows,
  oceanTableRows,
  oceanIndigo,
  oceanRuby,
  distantLicense,
  fishingSources,
  teamcraftLicense,
  fishParameters,
  spearItems,
  gatheringPoints,
  gatheringLevels,
  territories,
  spearSources,
  legendaryFish,
  itemPatches,
  patchNames,
] = await Promise.all([
  download(`${tracker}js/app/data.js`).then((text) =>
    literal(text, "const DATA = "),
  ),
  download(`${tracker}js/app/fish_info_data.js`).then((text) =>
    literal(text, "const FISH_INFO = "),
  ),
  sheet("Item"),
  sheet("PlaceName"),
  sheet("Weather"),
  sheet("FishingSpot"),
  sheet("SpearfishingNotebook"),
  download(`${tracker}LICENSE`),
  sheet("FishingNoteInfo"),
  sheet("IKDSpot"),
  sheet("IKDRoute"),
  sheet("IKDRouteTable"),
  download(`${distantSeas}Data/indigo.json`).then(JSON.parse),
  download(`${distantSeas}Data/ruby.json`).then(JSON.parse),
  download(`${distantSeas}LICENSE`),
  download(`${teamcraft}libs/data/src/lib/json/fishing-sources.json`).then(
    JSON.parse,
  ),
  download(`${teamcraft}LICENSE`),
  sheet("FishParameter"),
  sheet("SpearfishingItem"),
  sheet("GatheringPointBase"),
  sheet("GatheringItemLevelConvertTable"),
  sheet("TerritoryType"),
  download(`${teamcraft}libs/data/src/lib/json/spearfishing-sources.json`).then(
    JSON.parse,
  ),
  download(`${teamcraft}libs/data/src/lib/json/legendary-fish.json`).then(
    JSON.parse,
  ),
  download(`${teamcraft}libs/data/src/lib/json/item-patch.json`).then(
    JSON.parse,
  ),
  download(`${teamcraft}libs/data/src/lib/json/patch-names.json`).then(
    JSON.parse,
  ),
]);
// Visible game-log rows define catalog coverage; the tracker only enriches their conditions.
const rodByItem = new Map(
  [...fishParameters]
    .filter(([, row]) => Number(row.Item) > 0 && row.IsInLog === "True")
    .map(([rowId, row]) => [Number(row.Item), { ...row, logId: rowId }]),
);
const spearByItem = new Map(
  [...spearItems]
    .filter(([, row]) => Number(row.Item) > 0 && row.IsVisible === "True")
    .map(([rowId, row]) => [Number(row.Item), { ...row, logId: rowId }]),
);
const notesByItem = new Map(
  [...notes.values()].map((row) => [Number(row.Item), row]),
);
const oceanSpotIds = new Set(
  [...oceanSpots.values()]
    .flatMap((row) => [Number(row.SpotMain), Number(row.SpotSub)])
    .filter(Boolean),
);
const spectralSpotIds = new Set(
  [...oceanSpots.values()].map((row) => Number(row.SpotSub)).filter(Boolean),
);
const itemName = (id) =>
  items.get(Number(id))?.Name || data.ITEMS[id]?.name_en || String(id);
const placeName = (id, fallback) => places.get(Number(id))?.Name || fallback;
const namedItems = Object.fromEntries(
  [
    ...new Set([
      ...Object.keys(data.ITEMS),
      ...spearByItem.keys(),
      ...Object.values(fishingSources)
        .flatMap((rows) =>
          rows.flatMap((row) => [
            row.bait,
            ...(row.predators ?? []).map((prey) => prey.id),
          ]),
        )
        .filter(Boolean),
    ]),
  ].map((id) => [id, itemName(id)]),
);
const location = (id, spear = false) => {
  const source = (spear ? data.SPEARFISHING_SPOTS : data.FISHING_SPOTS)[id];
  const row = spear
    ? [...spearfishing.values()].find(
        (value) => Number(value.GatheringPointBase) === Number(id),
      )
    : fishing.get(Number(id));
  // Placeholder spots contain item IDs but have no real territory or place name.
  if (
    !source &&
    (!row ||
      Number(row.TerritoryType) <= 0 ||
      !places.get(Number(row.PlaceName))?.Name)
  )
    return null;
  const territory = source?.territory_id ?? Number(row?.TerritoryType);
  const rates = data.WEATHER_RATES[territory];
  return {
    id: Number(id),
    name: placeName(row?.PlaceName, source?.name_en || String(id)),
    // TerritoryType is the game's region -> map parent for each fishing spot.
    region: placeName(territories.get(territory)?.["PlaceName{Region}"], ""),
    zone: placeName(
      rates?.zone_id ??
        territories.get(territory)?.PlaceName ??
        row?.["PlaceName{Sub}"],
      data.ZONES[rates?.zone_id]?.name_en || "",
    ),
    territory,
    coords: source?.map_coords?.slice(0, 2) ?? null,
  };
};
const guideById = new Map(guide.map((fish) => [fish.id, fish]));
const ids = [
  ...new Set([
    ...rodByItem.keys(),
    ...spearByItem.keys(),
    ...guideById.keys(),
    ...Object.keys(data.FISH).map(Number),
  ]),
].sort((a, b) => a - b);
const fish = ids.map((id) => {
  const info = guideById.get(id);
  const condition = data.FISH[id];
  const note = notesByItem.get(id);
  const supplemental = fishingSources[id]?.[0];
  const spearSupplemental = spearSources[id]?.[0];
  // Complete partial tracker records with matching Teamcraft catch metadata.
  const supplementalHookset =
    [null, "Powerful", "Precision"][supplemental?.hookset] ?? null;
  const supplementalTug =
    ["medium", "heavy", "light"][supplemental?.tug] ?? null;
  const isSpear = spearByItem.has(id) || Boolean(condition?.gig);
  const fishName = itemName(id);
  const syllables = pinyin(fishName, { toneType: "none", type: "array" });
  const locations = [];
  if (condition?.location != null) {
    const spot = location(condition.location, Boolean(condition.gig));
    if (spot) locations.push(spot);
  }
  if (!condition && supplemental) {
    const spot = location(supplemental.spot);
    if (spot) locations.push(spot);
  }
  // The game sheet supplies multiple ordinary fishing spots that the tracker omits.
  if (!isSpear)
    for (const [spotId, row] of fishing) {
      if (
        Array.from({ length: 10 }, (_, index) =>
          Number(row[`Item[${index}]`]),
        ).includes(id)
      ) {
        const spot = location(spotId);
        if (spot && !locations.some((existing) => existing.id === spot.id))
          locations.push(spot);
      }
    }
  if (isSpear)
    for (const [pointId, point] of gatheringPoints) {
      if (Number(point.GatheringType) !== 5) continue;
      const containsFish = Array.from({ length: 8 }, (_, index) =>
        spearItems.get(Number(point[`Item[${index}]`])),
      ).some((row) => Number(row?.Item) === id);
      if (!containsFish) continue;
      const spot = location(pointId, true);
      if (spot && !locations.some((existing) => existing.id === spot.id))
        locations.push(spot);
    }
  const parameter = rodByItem.get(id) ?? spearByItem.get(id);
  const zoneId = Object.keys(data.ZONES).find(
    (key) => data.ZONES[key].name_en === info?.zone_en,
  );
  const ocean =
    locations.some((spot) => oceanSpotIds.has(spot.id)) ||
    info?.zone_en === "The Endeavor";
  const spectral =
    locations.length > 0 &&
    locations.every((spot) => spectralSpotIds.has(spot.id));
  // Explicit zero restriction flags prove unrestricted time/weather independently of bait data.
  const fallback = note
    ? {
        startHour:
          Number(note.TimeRestriction) === 0
            ? 0
            : (supplemental?.spawn ?? null),
        endHour:
          Number(note.TimeRestriction) === 0
            ? 24
            : supplemental?.spawn != null && supplemental.duration != null
              ? (supplemental.spawn + supplemental.duration) % 24
              : null,
        weather: spectral
          ? [145]
          : Number(note.WeatherRestriction) === 0
            ? []
            : (supplemental?.weathers ?? null),
        previousWeather:
          Number(note.WeatherRestriction) === 0 || spectral
            ? []
            : (supplemental?.weathersFrom ?? null),
        bait: supplemental?.bait ? [supplemental.bait] : [],
        predators: (
          supplemental?.predators ??
          spearSupplemental?.predators ??
          []
        ).map((prey) => [prey.id, prey.amount]),
        intuitionLength: null,
        hookset: supplementalHookset,
        tug: supplementalTug,
        snagging: supplemental?.snagging ?? null,
        fishEyes: null,
        folklore: null,
        gig: isSpear
          ? (["Small", "Normal", "Large"][spearSupplemental?.shadowSize] ??
            "UNKNOWN")
          : null,
      }
    : null;
  return {
    id,
    // Precompute full pinyin and initials to keep the browser bundle small.
    namePinyin: syllables.join("").toLocaleLowerCase(),
    nameInitials: syllables
      .map((syllable) => syllable[0] || "")
      .join("")
      .toLocaleLowerCase(),
    // The game stores caught bits by sheet row, rather than by Item ID.
    fishParameterId: rodByItem.get(id)?.logId ?? null,
    spearfishingItemId: spearByItem.get(id)?.logId ?? null,
    method: ocean ? "ocean" : isSpear ? "spear" : "rod",
    specialConditions:
      Number(note?.SpecialConditions ?? info?.special_conditions ?? 0) > 0,
    name: fishName,
    nameEn: info?.name_en || data.ITEMS[id]?.name_en || "",
    icon:
      info?.icon ||
      data.ITEMS[id]?.icon ||
      String(items.get(id)?.Icon || "").padStart(6, "0"),
    description:
      items.get(id)?.Description ||
      parameter?.Text ||
      parameter?.Description ||
      "",
    level:
      info?.level?.[0] ??
      (parameter
        ? Number(
            gatheringLevels.get(Number(parameter.GatheringItemLevel))
              ?.GatheringItemLevel,
          ) || null
        : null),
    // Teamcraft item-patch values reference patch rows; they are not version numbers.
    patch:
      condition?.patch ??
      (Number.parseFloat(patchNames[itemPatches[id]]?.version) || null),
    kind:
      ocean && Number(items.get(id)?.Rarity) === 3
        ? "ocean-legendary"
        : ocean && Number(items.get(id)?.Rarity) === 2
          ? "ocean-rare"
          : legendaryFish[id]
            ? "legendary"
            : condition?.bigFish
              ? "big"
              : condition ||
                  info?.rarity === 1 ||
                  Number(items.get(id)?.Rarity) === 1
                ? "normal"
                : "unknown",
    zone: locations[0]?.zone || placeName(zoneId, info?.zone_en || ""),
    locations,
    collectable: Boolean(condition?.collectable || info?.collectable),
    aquarium: condition?.aquarium ?? null,
    conditions: condition
      ? {
          startHour: condition.startHour,
          endHour: condition.endHour,
          weather: condition.weatherSet,
          previousWeather: condition.previousWeatherSet,
          bait: condition.bestCatchPath,
          predators: condition.predators,
          intuitionLength: condition.intuitionLength,
          hookset: condition.hookset ?? supplementalHookset,
          tug: condition.tug ?? supplementalTug,
          snagging: condition.snagging,
          fishEyes: condition.fishEyes,
          folklore: condition.folklore
            ? data.FOLKLORE[condition.folklore]?.name_en ||
              String(condition.folklore)
            : null,
          gig: condition.gig,
        }
      : fallback,
  };
});
if (fish.length < 1730 || fish.some((fish) => !fish.name))
  throw new Error("Fish catalog validation failed.");
// Game voyage rows preserve all three stop orders and their daytime variants.
const oceanRoutes = [...oceanRouteRows]
  .filter(([id]) => id > 0)
  .map(([id, row]) => ({
    id,
    name: row.Name,
    family: id <= 12 ? "near" : "far",
    stops: [0, 1, 2].map((index) => {
      const spotId = Number(row[`Spot[${index}]`]);
      const spot = oceanSpots.get(spotId);
      return {
        spotId,
        name: placeName(spot?.PlaceName, ""),
        phase: Number(row[`Time[${index}]`]),
        mainSpotId: Number(spot?.SpotMain),
        spectralSpotId: Number(spot?.SpotSub),
      };
    }),
  }));
const catalogOceanSpotIds = new Set(
  fish
    .filter((item) => item.method === "ocean")
    .flatMap((item) => item.locations.map((spot) => spot.id)),
);
if (
  oceanRoutes.length < 21 ||
  oceanRoutes.some(
    (route) =>
      !route.name ||
      route.stops.some(
        (stop) =>
          !stop.name ||
          ![1, 2, 3].includes(stop.phase) ||
          !catalogOceanSpotIds.has(stop.mainSpotId) ||
          !catalogOceanSpotIds.has(stop.spectralSpotId),
      ),
  )
)
  throw new Error("Ocean route data is incomplete or has unmatched spots.");
const oceanRouteIds = new Set(oceanRoutes.map((route) => route.id));
const oceanRouteTable = [...oceanTableRows]
  .sort(([a], [b]) => a - b)
  .map(([, row]) => ({
    nearRouteId: Number(row.Route),
    farRouteId: Number(row[""]),
  }));
if (
  oceanRouteTable.length !== 144 ||
  oceanRouteTable.some(
    (pair) =>
      !oceanRouteIds.has(pair.nearRouteId) ||
      !oceanRouteIds.has(pair.farRouteId),
  )
)
  throw new Error("Ocean route rotation is incomplete.");
// The game lists every fish in a sea, while the community record supplies its time-of-day exclusions.
const oceanAvailability = {};
const oceanFishByItem = new Map(
  fish.filter((item) => item.method === "ocean").map((item) => [item.id, item]),
);
const fishByOceanSpot = new Map(
  [...oceanSpotIds].map((spotId) => [
    spotId,
    new Set(
      fish
        .filter(
          (item) =>
            item.method === "ocean" &&
            item.locations.some((spot) => spot.id === spotId),
        )
        .map((item) => item.id),
    ),
  ]),
);
const sourceOceanSpots = [...oceanIndigo, ...oceanRuby];
for (const sourceSpot of sourceOceanSpots) {
  const sourceFishIds = new Set(sourceSpot.Fish.map((item) => item.ItemId));
  const matches = [...fishByOceanSpot].filter(
    ([, ids]) =>
      ids.size === sourceFishIds.size &&
      [...ids].every((id) => sourceFishIds.has(id)),
  );
  if (matches.length !== 1)
    throw new Error("Community ocean fish cannot be matched to a game spot.");
  const [spotId] = matches[0];
  for (const sourceFish of sourceSpot.Fish) {
    const allowed = ["Day", "Sunset", "Night"]
      .map((phase, index) =>
        sourceFish.TimeAvailability?.[phase] === false ? null : index + 1,
      )
      .filter(Boolean);
    if (allowed.length < 3)
      oceanAvailability[`${spotId}:${sourceFish.ItemId}`] = allowed;
    const target = oceanFishByItem.get(sourceFish.ItemId);
    if (!target?.conditions) continue;
    if (!target.conditions.bait.length) {
      const bait =
        sourceFish.RequiredBait ??
        Object.entries(sourceFish.BiteTimes).find(
          ([, value]) => value.CellType === "BestOrRequired",
        )?.[0] ??
        Object.keys(sourceFish.BiteTimes)[0];
      if (bait) target.conditions.bait = [Number(bait)];
    }
    target.conditions.hookset ||= sourceFish.Hookset || null;
    target.conditions.tug ||=
      [null, "light", "medium", "heavy"][sourceFish.BitePower] ?? null;
  }
}
if (sourceOceanSpots.length !== 26)
  throw new Error("Ocean fish availability source is incomplete.");
const catalog = {
  formatVersion: 6,
  generatedAt: new Date().toISOString(),
  sources: sources.sort((a, b) => a.url.localeCompare(b.url)),
  fish,
  oceanRoutes,
  oceanRouteTable,
  oceanAvailability,
  items: namedItems,
  itemIcons: Object.fromEntries(
    Object.keys(namedItems).map((id) => [
      id,
      Number(items.get(Number(id))?.Icon) || 0,
    ]),
  ),
  weather: Object.fromEntries(
    [...weather]
      .filter(([, row]) => row.Name)
      .map(([id, row]) => [id, row.Name]),
  ),
  weatherIcons: Object.fromEntries(
    [...weather]
      .filter(([, row]) => Number(row.Icon) > 0)
      .map(([id, row]) => [id, Number(row.Icon)]),
  ),
  weatherRates: Object.fromEntries(
    Object.entries(data.WEATHER_RATES).map(([id, area]) => [
      id,
      area.weather_rates,
    ]),
  ),
};
await mkdir("public/data/fishing", { recursive: true });
await mkdir("licenses/ff14-fish-tracker-app", { recursive: true });
await writeFile("public/data/fishing/catalog.json", JSON.stringify(catalog));
await writeFile("licenses/ff14-fish-tracker-app/LICENSE", license);
await mkdir("licenses/ffxiv-teamcraft", { recursive: true });
await writeFile("licenses/ffxiv-teamcraft/LICENSE", teamcraftLicense);
await mkdir("licenses/distantseas", { recursive: true });
await writeFile("licenses/distantseas/LICENSE", distantLicense);
console.log(
  `Generated ${fish.length} fish with ${fish.filter((fish) => fish.conditions).length} condition records.`,
);
