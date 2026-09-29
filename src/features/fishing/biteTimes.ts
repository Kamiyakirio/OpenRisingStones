/** Read community-observed bite seconds for exact fish, spot, and bait triples. */
import { fishingCatchSteps } from "./technique.ts";
import type { Fish } from "./types.ts";

export const BITE_TIMES_URL = "https://gubal.ffxivteamcraft.com/graphql";

export type BiteTimeRequest = {
  fishId: number;
  spotId: number;
  baitId: number;
};
export type BiteTimeRange = {
  minSeconds: number;
  maxSeconds: number;
  samples: number;
};
export type BaitComparison = { baitId: number; range: BiteTimeRange | null };

export function biteTimeKey({ fishId, spotId, baitId }: BiteTimeRequest) {
  return `${fishId}:${spotId}:${baitId}`;
}

/** A cast in the spot page uses that spot; elsewhere the fish's first spot is the reference. */
export function biteTimeRequests(
  fish: Fish[],
  fishById: Map<number, Fish>,
  selectedSpotId?: number,
  primaryOnly = false,
) {
  const requests = new Map<string, BiteTimeRequest>();
  for (const item of fish) {
    const spotId = selectedSpotId ?? item.locations[0]?.id;
    if (
      typeof spotId !== "number" ||
      !Number.isSafeInteger(spotId) ||
      spotId <= 0
    )
      continue;
    for (const step of fishingCatchSteps(item, fishById)) {
      const sourceIds = primaryOnly
        ? step.sourceIds.slice(0, 1)
        : step.sourceIds;
      for (const baitId of sourceIds) {
        if (!Number.isSafeInteger(baitId) || baitId <= 0) continue;
        const request = { fishId: step.targetId, spotId, baitId };
        requests.set(biteTimeKey(request), request);
      }
    }
  }
  return [...requests.values()].sort((a, b) =>
    biteTimeKey(a).localeCompare(biteTimeKey(b)),
  );
}

type BiteTimeRow = BiteTimeRequest & {
  flooredBiteTime: number;
  occurences: number;
};

/** Use the middle 90% of reports so isolated early or late bites do not dominate. */
export function summarizeBiteTimes(
  requests: BiteTimeRequest[],
  rows: unknown,
): Map<string, BiteTimeRange | null> {
  const ranges = new Map<string, BiteTimeRange | null>(
    requests.map((request) => [biteTimeKey(request), null]),
  );
  if (!Array.isArray(rows)) return ranges;
  const bins = new Map<string, { seconds: number; samples: number }[]>();
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as Partial<BiteTimeRow>;
    const key = biteTimeKey({
      fishId: Number(row.fishId),
      spotId: Number(row.spotId),
      baitId: Number(row.baitId),
    });
    const seconds = Number(row.flooredBiteTime);
    const samples = Number(row.occurences);
    if (
      !ranges.has(key) ||
      !Number.isInteger(seconds) ||
      seconds <= 1 ||
      seconds >= 600 ||
      !Number.isInteger(samples) ||
      samples < 3
    )
      continue;
    const group = bins.get(key) ?? [];
    group.push({ seconds, samples });
    bins.set(key, group);
  }
  for (const [key, group] of bins) {
    group.sort((a, b) => a.seconds - b.seconds);
    const samples = group.reduce((count, bin) => count + bin.samples, 0);
    const low = samples > 20 ? Math.ceil(samples * 0.05) : 1;
    const high = samples > 20 ? Math.ceil(samples * 0.95) : samples;
    let count = 0;
    let foundLow = false;
    let minSeconds = group[0].seconds;
    let maxSeconds = group.at(-1)!.seconds;
    for (const bin of group) {
      count += bin.samples;
      if (!foundLow && count >= low) {
        minSeconds = bin.seconds;
        foundLow = true;
      }
      if (count >= high) {
        maxSeconds = bin.seconds;
        break;
      }
    }
    ranges.set(key, { minSeconds, maxSeconds, samples });
  }
  return ranges;
}

function biteTimeQuery(requests: BiteTimeRequest[]) {
  const clauses = requests
    .map(
      ({ fishId, spotId, baitId }) =>
        `{itemId:{_eq:${fishId}},spot:{_eq:${spotId}},baitId:{_eq:${baitId}}}`,
    )
    .join(",");
  return `query FishingBiteTimes { biteTimes: bite_time_per_fish_per_spot_per_bait(where:{_or:[${clauses}],flooredBiteTime:{_gt:1,_lt:600},occurences:{_gte:3}},limit:5000){itemId spot baitId flooredBiteTime occurences} }`;
}

function normalizeBiteRows(rows: unknown[]) {
  return rows.map((value) => {
    const row =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
    return {
      fishId: row.itemId,
      spotId: row.spot,
      baitId: row.baitId,
      flooredBiteTime: row.flooredBiteTime,
      occurences: row.occurences,
    };
  });
}

/** Group every observed bait for one fish and spot without blending their seconds. */
export function summarizeBaitComparisons(
  fishId: number,
  spotId: number,
  baitRows: unknown,
  timeRows: unknown,
): BaitComparison[] {
  const matching = normalizeBiteRows(
    Array.isArray(timeRows) ? timeRows : [],
  ).filter(
    (row) =>
      Number(row.fishId) === fishId &&
      Number(row.spotId) === spotId &&
      Number.isSafeInteger(Number(row.baitId)) &&
      Number(row.baitId) > 0,
  );
  const baitIds = new Set(matching.map((row) => Number(row.baitId)));
  if (Array.isArray(baitRows)) {
    for (const value of baitRows) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const baitId = Number(row.baitId);
      if (
        Number(row.itemId) === fishId &&
        Number(row.spot) === spotId &&
        Number(row.occurences) > 1 &&
        Number.isSafeInteger(baitId) &&
        baitId > 0
      ) {
        baitIds.add(baitId);
      }
    }
  }
  const requests = [...baitIds].map((baitId) => ({ fishId, spotId, baitId }));
  const ranges = summarizeBiteTimes(requests, matching);
  return requests
    .map(({ baitId }) => ({
      baitId,
      range: ranges.get(biteTimeKey({ fishId, spotId, baitId })) ?? null,
    }))
    .sort(
      (a, b) =>
        (b.range?.samples ?? 0) - (a.range?.samples ?? 0) ||
        a.baitId - b.baitId,
    );
}

async function requestGraphData(query: string, signal: AbortSignal) {
  const response = await fetch(BITE_TIMES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    credentials: "omit",
    signal,
  });
  if (!response.ok) throw new Error("Bite-time request failed.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("data" in body)) {
    throw new Error("Invalid bite-time response.");
  }
  const graph = body as {
    errors?: unknown[];
    data?: Record<string, unknown>;
  };
  if (graph.errors?.length) throw new Error("Bite-time query failed.");
  if (!graph.data) throw new Error("Invalid bite-time response.");
  return graph.data;
}

async function requestBiteRows(query: string, signal: AbortSignal) {
  const rows = (await requestGraphData(query, signal)).biteTimes;
  if (!Array.isArray(rows) || rows.length >= 5000) {
    throw new Error("Incomplete bite-time response.");
  }
  return rows;
}

/** The detail comparison asks for all reported baits, not only guide baits. */
export async function fetchBaitComparisons(
  fishId: number,
  spotId: number,
  signal: AbortSignal,
) {
  const query = `query FishingBaitComparison { baits: baits_per_fish_per_spot(where:{itemId:{_eq:${fishId}},spot:{_eq:${spotId}},baitId:{_gt:0},occurences:{_gt:1}},limit:5000){itemId spot baitId occurences} biteTimes: bite_time_per_fish_per_spot_per_bait(where:{itemId:{_eq:${fishId}},spot:{_eq:${spotId}},baitId:{_gt:0},flooredBiteTime:{_gt:1,_lt:600},occurences:{_gte:3}},limit:5000){itemId spot baitId flooredBiteTime occurences} }`;
  const data = await requestGraphData(query, signal);
  if (
    !Array.isArray(data.baits) ||
    data.baits.length >= 5000 ||
    !Array.isArray(data.biteTimes) ||
    data.biteTimes.length >= 5000
  ) {
    throw new Error("Incomplete bait-comparison response.");
  }
  return summarizeBaitComparisons(fishId, spotId, data.baits, data.biteTimes);
}

/** Bound each query so a busy fishing list does not request the whole dataset. */
export async function fetchBiteTimes(
  requests: BiteTimeRequest[],
  signal: AbortSignal,
) {
  const result = new Map<string, BiteTimeRange | null>();
  for (let start = 0; start < requests.length; start += 20) {
    const batch = requests.slice(start, start + 20);
    const rows = await requestBiteRows(biteTimeQuery(batch), signal);
    // Hasura uses itemId and spot, while the application uses fishId and spotId.
    for (const [key, value] of summarizeBiteTimes(
      batch,
      normalizeBiteRows(rows),
    )) {
      result.set(key, value);
    }
  }
  return result;
}

export function formatBiteTimeRange(range: BiteTimeRange) {
  const seconds = (value: number) =>
    value < 60
      ? `${value}秒`
      : `${Math.floor(value / 60)}分${String(value % 60).padStart(2, "0")}秒`;
  return range.minSeconds === range.maxSeconds
    ? seconds(range.minSeconds)
    : `${seconds(range.minSeconds)}–${seconds(range.maxSeconds)}`;
}
