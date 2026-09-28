/** Patch 7.5 PvP rotations, anchored to observed UTC rotation boundaries. */

export type PvpMap = {
  id: string;
  name: string;
  imageId: number;
};

export type PvpRotation = {
  map: PvpMap;
  nextMap: PvpMap;
  nextRotationAt: Date;
};

// The order and intervals are from the official 7.5 patch notes. The anchors
// align that order with the observed rotation calendar after the patch.
const FRONTLINE_MAPS: readonly PvpMap[] = [
  { id: "seize", name: "尘封秘岩（争夺战）", imageId: 112108 },
  { id: "shatter", name: "荣誉野（碎冰战）", imageId: 112165 },
  { id: "naadam", name: "昂萨哈凯尔（竞争战）", imageId: 112376 },
  { id: "triumph", name: "沃刻其特（演习战）", imageId: 112649 },
  { id: "seize", name: "尘封秘岩（争夺战）", imageId: 112108 },
  { id: "secure", name: "周边遗迹群（阵地战）", imageId: 112064 },
  { id: "naadam", name: "昂萨哈凯尔（竞争战）", imageId: 112376 },
  { id: "triumph", name: "沃刻其特（演习战）", imageId: 112649 },
];

// Casual and ranked CC duty rows use generic icons. The custom-match rows
// expose the same arenas' unique ContentFinderCondition.Image thumbnails.
const CRYSTALLINE_CONFLICT_MAPS: readonly PvpMap[] = [
  { id: "palaistra", name: "角力学校", imageId: 112473 },
  { id: "volcanic", name: "火山之心", imageId: 112474 },
  { id: "bayside", name: "海岸斗场", imageId: 112629 },
  { id: "cloudnine", name: "九霄云上", imageId: 112475 },
  { id: "castletown", name: "机关大殿", imageId: 112517 },
  { id: "harmonias", name: "休兵书库", imageId: 112669 },
  { id: "redsands", name: "赤土红沙", imageId: 112548 },
];

const XIVAPI_ASSET_ORIGINS = {
  mirror: "https://xivapi-v2.xivcdn.com",
  official: "https://v2.xivapi.com",
} as const;

/** Resolve a high-resolution duty thumbnail from XIVAPI's asset endpoint. */
export function pvpMapImageUrl(
  map: PvpMap,
  source: keyof typeof XIVAPI_ASSET_ORIGINS = "mirror",
): string {
  const file = String(map.imageId).padStart(6, "0");
  const group = String(Math.floor(map.imageId / 1_000) * 1_000).padStart(
    6,
    "0",
  );
  const url = new URL("/api/asset", XIVAPI_ASSET_ORIGINS[source]);
  url.search = new URLSearchParams({
    path: `ui/icon/${group}/${file}_hr1.tex`,
    format: "png",
  }).toString();
  return url.toString();
}

/** Keep countdown digits stable and never show a negative duration. */
export function formatPvpCountdown(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

const FRONTLINE_REFERENCE_MS = Date.parse("2026-05-01T15:00:00Z");
const CRYSTALLINE_CONFLICT_REFERENCE_MS = Date.parse("2026-04-28T13:00:00Z");
const FRONTLINE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CRYSTALLINE_CONFLICT_INTERVAL_MS = 60 * 60 * 1000;

/** Uses UTC epoch slots so local timezone and daylight saving cannot shift maps. */
function rotationAt(
  now: Date,
  referenceMs: number,
  intervalMs: number,
  maps: readonly PvpMap[],
): PvpRotation {
  const slot = Math.floor((now.getTime() - referenceMs) / intervalMs);
  const index = ((slot % maps.length) + maps.length) % maps.length;
  return {
    map: maps[index],
    nextMap: maps[(index + 1) % maps.length],
    nextRotationAt: new Date(referenceMs + (slot + 1) * intervalMs),
  };
}

/** Frontline changes daily at 15:00 UTC (23:00 Beijing time). */
export function getFrontlineRotation(now: Date = new Date()): PvpRotation {
  return rotationAt(
    now,
    FRONTLINE_REFERENCE_MS,
    FRONTLINE_INTERVAL_MS,
    FRONTLINE_MAPS,
  );
}

/** Casual and ranked Crystalline Conflict change every 60 minutes. */
export function getCrystallineConflictRotation(
  now: Date = new Date(),
): PvpRotation {
  return rotationAt(
    now,
    CRYSTALLINE_CONFLICT_REFERENCE_MS,
    CRYSTALLINE_CONFLICT_INTERVAL_MS,
    CRYSTALLINE_CONFLICT_MAPS,
  );
}
