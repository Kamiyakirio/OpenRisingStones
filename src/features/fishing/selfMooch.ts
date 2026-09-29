/** Check whether a mooch fish has caught itself at the selected fishing spot. */
import { BITE_TIMES_URL } from "./biteTimes.ts";
import { fishingCatchSteps } from "./technique.ts";
import type { Fish } from "./types.ts";

export type SelfMoochRequest = { fishId: number; spotId: number };

export function selfMoochKey({ fishId, spotId }: SelfMoochRequest) {
  return `${fishId}:${spotId}`;
}

/** Only fish actually used as mooch bait need a self-catch lookup. */
export function selfMoochRequests(
  fish: Fish[],
  fishById: Map<number, Fish>,
  selectedSpotId?: number,
  primaryOnly = false,
) {
  const requests = new Map<string, SelfMoochRequest>();
  for (const item of fish) {
    if (item.method === "spear") continue;
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
      for (const fishId of sourceIds) {
        if (!fishById.has(fishId)) continue;
        const request = { fishId, spotId };
        requests.set(selfMoochKey(request), request);
      }
    }
  }
  return [...requests.values()].sort((a, b) =>
    selfMoochKey(a).localeCompare(selfMoochKey(b)),
  );
}

/** A repeated fish ID in itemId and baitId is a confirmed self-mooch. */
export function summarizeSelfMooch(
  requests: SelfMoochRequest[],
  rows: unknown,
) {
  const matches = new Map(
    requests.map((request) => [selfMoochKey(request), false]),
  );
  if (!Array.isArray(rows)) return matches;
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const fishId = Number(row.itemId);
    const spotId = Number(row.spot);
    if (
      fishId === Number(row.baitId) &&
      Number(row.occurences) > 1 &&
      matches.has(selfMoochKey({ fishId, spotId }))
    ) {
      matches.set(selfMoochKey({ fishId, spotId }), true);
    }
  }
  return matches;
}

/** Batch exact self-catch pairs to avoid loading unrelated community records. */
export async function fetchSelfMooch(
  requests: SelfMoochRequest[],
  signal: AbortSignal,
) {
  const result = new Map<string, boolean>();
  for (let start = 0; start < requests.length; start += 20) {
    const batch = requests.slice(start, start + 20);
    const clauses = batch
      .map(
        ({ fishId, spotId }) =>
          `{itemId:{_eq:${fishId}},spot:{_eq:${spotId}},baitId:{_eq:${fishId}}}`,
      )
      .join(",");
    const query = `query FishingSelfMooch { selfMooches: baits_per_fish_per_spot(where:{_or:[${clauses}],occurences:{_gt:1}},limit:5000){itemId spot baitId occurences} }`;
    const response = await fetch(BITE_TIMES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      credentials: "omit",
      signal,
    });
    if (!response.ok) throw new Error("Self-mooch request failed.");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") {
      throw new Error("Invalid self-mooch response.");
    }
    const graph = body as {
      errors?: unknown[];
      data?: { selfMooches?: unknown };
    };
    const rows = graph.data?.selfMooches;
    if (graph.errors?.length || !Array.isArray(rows) || rows.length >= 5000) {
      throw new Error("Incomplete self-mooch response.");
    }
    for (const [key, value] of summarizeSelfMooch(batch, rows)) {
      result.set(key, value);
    }
  }
  return result;
}
