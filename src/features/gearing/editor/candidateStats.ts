/** Candidate tables show core secondaries plus the job's speed stat when present. */
import type { Stat } from "./types";

const mainStats = new Set<Stat>(["STR", "DEX", "INT", "MND", "VIT"]);
const speedStats = new Set<Stat>(["SKS", "SPS"]);

export function candidateStats(stats: readonly Stat[]) {
  const secondary = stats.filter((stat) => !mainStats.has(stat));
  const speed = secondary.find((stat) => speedStats.has(stat));
  if (!speed) return secondary.slice(0, 4);
  return [...secondary.filter((stat) => stat !== speed).slice(0, 3), speed];
}
