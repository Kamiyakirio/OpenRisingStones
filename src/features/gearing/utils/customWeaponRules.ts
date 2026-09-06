import rules from "../data/generated/rules.json";
/** Gearing domain module adapted from ffxiv-gearing (MIT); see licenses/ffxiv-gearing. */
import type * as G from "./game.ts";

export type CustomWeaponStatCandidate = G.Stat | "speed" | "secondary";

export interface CustomWeaponAllocation {
  major: number;
  minor: number;
}

export interface CustomWeaponRule {
  id: string;
  source: string;
  itemLevels: Record<number, CustomWeaponAllocation>;
  statCandidates: CustomWeaponStatCandidate[];
  slotWeights: Partial<Record<number, readonly [number, number]>>;
  linkSlotAllocations?: boolean;
}

export interface ResolvedCustomWeaponRule extends CustomWeaponAllocation {
  statCandidates: G.Stat[];
  linkedSlotGroup?: string;
}

/**
 * Add future automatic custom-weapon rules here; the optimizer needs no corresponding code changes.
 * `speed` and `secondary` resolve from the job, and each slot weight is `[numerator, denominator]`.
 * Set `linkSlotAllocations` when multiple pieces (such as a paladin sword and shield) must choose the same stats.
 */
export const customWeaponRules: CustomWeaponRule[] =
  rules.customWeaponRules as unknown as CustomWeaponRule[];

function resolveStatCandidate(
  candidate: CustomWeaponStatCandidate,
  schema: G.JobSchema,
): G.Stat | undefined {
  if (candidate === "speed") {
    if (schema.stats.includes("SPS")) return "SPS";
    if (schema.stats.includes("SKS")) return "SKS";
    return;
  }
  if (candidate === "secondary") return schema.secondaryStat;
  return candidate;
}

export function getCustomWeaponRule(
  gear: G.Gear,
  schema: G.JobSchema,
): ResolvedCustomWeaponRule | undefined {
  if (!gear.customizable) return;
  for (const rule of customWeaponRules) {
    if (gear.source !== rule.source) continue;
    const allocation = rule.itemLevels[gear.level];
    const slotWeight = rule.slotWeights[gear.slot];
    if (allocation === undefined || slotWeight === undefined) continue;
    const [numerator, denominator] = slotWeight;
    const statCandidates = Array.from(
      new Set(
        rule.statCandidates
          .map((candidate) => resolveStatCandidate(candidate, schema))
          .filter(
            (stat): stat is G.Stat =>
              stat !== undefined && schema.stats.includes(stat),
          ),
      ),
    );
    return {
      major: Math.round((allocation.major * numerator) / denominator),
      minor: Math.round((allocation.minor * numerator) / denominator),
      statCandidates,
      linkedSlotGroup: rule.linkSlotAllocations ? rule.id : undefined,
    };
  }
}
