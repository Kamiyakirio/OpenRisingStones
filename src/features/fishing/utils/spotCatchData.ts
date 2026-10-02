/** Summarize Teamcraft catch reports by spot and bait without inventing fish-specific misses. */
import { BITE_TIMES_URL } from "./biteTimes.ts";

export type SpotBaitStats = {
  baitId: number;
  total: number;
  caught: number;
  missed: number;
  fish: { fishId: number; reports: number }[];
};

/** Item -1 is Teamcraft's combined miss outcome, which has no known fish ID. */
export function summarizeSpotCatchStats(rows: unknown): SpotBaitStats[] {
  if (!Array.isArray(rows)) return [];
  const byBait = new Map<number, SpotBaitStats>();
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const baitId = Number(row.baitId);
    const fishId = Number(row.itemId);
    const reports = Number(row.occurences);
    if (
      !Number.isSafeInteger(baitId) ||
      baitId <= 0 ||
      !Number.isSafeInteger(fishId) ||
      (fishId !== -1 && fishId <= 1) ||
      !Number.isSafeInteger(reports) ||
      reports <= 0
    )
      continue;
    const bait = byBait.get(baitId) ?? {
      baitId,
      total: 0,
      caught: 0,
      missed: 0,
      fish: [],
    };
    bait.total += reports;
    if (fishId === -1) {
      bait.missed += reports;
    } else {
      bait.caught += reports;
      const fish = bait.fish.find((item) => item.fishId === fishId);
      if (fish) fish.reports += reports;
      else bait.fish.push({ fishId, reports });
    }
    byBait.set(baitId, bait);
  }
  return [...byBait.values()]
    .filter((bait) => bait.caught > 0)
    .map((bait) => ({
      ...bait,
      fish: bait.fish.sort(
        (a, b) => b.reports - a.reports || a.fishId - b.fishId,
      ),
    }))
    .sort((a, b) => b.total - a.total || a.baitId - b.baitId);
}

/** The aggregate excludes lure stacks; mixed lure states would change the percentages. */
export async function fetchSpotCatchStats(spotId: number, signal: AbortSignal) {
  if (!Number.isSafeInteger(spotId) || spotId <= 0) {
    throw new Error("Invalid fishing spot ID.");
  }
  const query = `query FishingSpotCatchStats { rows: baits_per_fish_per_spot(where:{spot:{_eq:${spotId}},baitId:{_gt:0},itemId:{_gt:-2},aLure:{_lte:0},mLure:{_lte:0}},limit:10000){itemId baitId occurences} }`;
  const response = await fetch(BITE_TIMES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    credentials: "omit",
    signal,
  });
  if (!response.ok) throw new Error("Fishing statistics request failed.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object") {
    throw new Error("Invalid fishing statistics response.");
  }
  const graph = body as { errors?: unknown[]; data?: { rows?: unknown } };
  if (graph.errors?.length || !Array.isArray(graph.data?.rows)) {
    throw new Error("Fishing statistics query failed.");
  }
  if (graph.data.rows.length >= 10000) {
    throw new Error("Incomplete fishing statistics response.");
  }
  return summarizeSpotCatchStats(graph.data.rows);
}
