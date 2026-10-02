/** Classifies game IDs and name-only legacy records using an offline game catalog. */
import dutyNames from "../data/dutyNames.json";
import dutyTypes from "../data/dutyTypes.json";

export const MENTOR_DUTY_CATEGORIES = [
  "dungeon",
  "trial",
  "raid",
  "alliance",
  "guildhest",
  "unknown",
] as const;
export type MentorDutyCategory = (typeof MENTOR_DUTY_CATEGORIES)[number];
const types = dutyTypes as Record<string, number[]>;

/** ContentMemberType 4/5 identifies the standard three-party alliance format. */
function category([type, member]: number[]): MentorDutyCategory {
  if (type === 2) return "dungeon";
  if (type === 4) return "trial";
  if (type === 5) return member === 4 || member === 5 ? "alliance" : "raid";
  if (type === 3) return "guildhest";
  // A Mentor ledger only exposes roulette duty types; unmatched data stays visible.
  return "unknown";
}

const normalize = (name: string) => name.replace(/\s+/gu, "").trim();
const byName = new Map<string, MentorDutyCategory>();
for (const [id, name] of Object.entries(dutyNames)) {
  if (!types[id]) continue;
  const key = normalize(name);
  const value = category(types[id]);
  const existing = byName.get(key);
  // Ambiguous names must not silently assign an imported record to a wrong type.
  byName.set(key, existing && existing !== value ? "unknown" : value);
}

export function resolveMentorDutyCategory(
  dutyId: number | null,
  dutyName: string,
): MentorDutyCategory {
  const type = dutyId == null ? null : types[String(dutyId)];
  return type ? category(type) : (byName.get(normalize(dutyName)) ?? "unknown");
}
