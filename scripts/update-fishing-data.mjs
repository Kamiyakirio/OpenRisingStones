/** Build an offline fish catalog from the MIT tracker and Chinese game sheets. */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import Papa from "papaparse";
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
const sources = [];
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok)
    throw new Error(`Download failed (${response.status}): ${url}`);
  const text = await response.text();
  sources.push({
    url,
    sha256: createHash("sha256").update(text).digest("hex"),
  });
  return text;
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
  [...fishParameters.values()]
    .filter((row) => Number(row.Item) > 0 && row.IsInLog === "True")
    .map((row) => [Number(row.Item), row]),
);
const spearByItem = new Map(
  [...spearItems.values()]
    .filter((row) => Number(row.Item) > 0 && row.IsVisible === "True")
    .map((row) => [Number(row.Item), row]),
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
  const isSpear = spearByItem.has(id) || Boolean(condition?.gig);
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
        hookset: supplemental
          ? ([null, "Powerful", "Precision"][supplemental.hookset] ?? null)
          : null,
        tug: supplemental
          ? (["medium", "heavy", "light"][supplemental.tug] ?? null)
          : null,
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
    method: ocean ? "ocean" : isSpear ? "spear" : "rod",
    specialConditions:
      Number(note?.SpecialConditions ?? info?.special_conditions ?? 0) > 0,
    name: itemName(id),
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
          hookset: condition.hookset,
          tug: condition.tug,
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
const catalog = {
  formatVersion: 2,
  generatedAt: new Date().toISOString(),
  sources: sources.sort((a, b) => a.url.localeCompare(b.url)),
  fish,
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
console.log(
  `Generated ${fish.length} fish with ${fish.filter((fish) => fish.conditions).length} condition records.`,
);
