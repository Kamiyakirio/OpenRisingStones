/** Patch 7.5 PvP rotations, anchored to observed UTC rotation boundaries. */

export type PvpMap = {
  id: string;
  name: string;
};

export type PvpRotation = {
  map: PvpMap;
  nextMap: PvpMap;
  nextRotationAt: Date;
};

// The order and intervals are from the official 7.5 patch notes. The anchors
// align that order with the observed rotation calendar after the patch.
const FRONTLINE_MAPS: readonly PvpMap[] = [
  { id: "seize", name: "尘封秘岩（争夺战）" },
  { id: "shatter", name: "荣誉野（碎冰战）" },
  { id: "naadam", name: "昂萨哈凯尔（竞争战）" },
  { id: "triumph", name: "沃刻其特（演习战）" },
  { id: "seize", name: "尘封秘岩（争夺战）" },
  { id: "secure", name: "周边遗迹群（阵地战）" },
  { id: "naadam", name: "昂萨哈凯尔（竞争战）" },
  { id: "triumph", name: "沃刻其特（演习战）" },
];

const CRYSTALLINE_CONFLICT_MAPS: readonly PvpMap[] = [
  { id: "palaistra", name: "角力学校" },
  { id: "volcanic", name: "火山之心" },
  { id: "bayside", name: "海岸斗场" },
  { id: "cloudnine", name: "九霄云上" },
  { id: "castletown", name: "机关大殿" },
  { id: "harmonias", name: "休兵书库" },
  { id: "redsands", name: "赤土红沙" },
];

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
