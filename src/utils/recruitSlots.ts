/** Normalize light/full parties and alliance rosters without inventing extra vacancies. */
import type { RecruitSlot, RecruitSlotKey } from "../models/recruit";

const FULL_POSITIONS: RecruitSlotKey[] = [
  "MT",
  "ST",
  "H1",
  "H2",
  "D1",
  "D2",
  "D3",
  "D4",
];

export function parseRecruitSlots(
  record: Record<string, unknown>,
): RecruitSlot[] {
  const parse = (
    row: Record<string, unknown>,
    keys: [string, RecruitSlotKey][],
    alliance?: "A" | "B" | "C",
  ): RecruitSlot[] =>
    keys.map(([source, key]) => {
      const value = Number(row[source]);
      return {
        key,
        jobId: Number.isFinite(value) && value > 0 ? value : null,
        ...(alliance ? { alliance } : {}),
      };
    });
  const teams = record.team_position;
  if (record.team_composition === "团队") {
    if (!teams || typeof teams !== "object") return [];
    return (["A", "B", "C"] as const).flatMap((alliance) => {
      const row = (teams as Record<string, unknown>)[alliance];
      return row && typeof row === "object"
        ? parse(
            row as Record<string, unknown>,
            FULL_POSITIONS.map((key) => [key, key]),
            alliance,
          )
        : [];
    });
  }
  // Light parties expose T/H in the API; map them to the existing MT/H1 picker.
  return parse(
    record,
    record.team_composition === "轻锐小队"
      ? [
          ["T", "MT"],
          ["H", "H1"],
          ["D1", "D1"],
          ["D2", "D2"],
        ]
      : FULL_POSITIONS.map((key) => [key, key]),
  );
}
