/** Groups numbered savage-raid floors while preserving their concrete API names. */
import type { RecruitDuty } from "../models/recruit";

export type RecruitDutyChoice = {
  label: string;
  type: string;
  dutyNames: string[];
};

export function buildRecruitDutyChoices(duties: RecruitDuty[]) {
  const groups = new Map<
    string,
    { baseLabel: string; type: string; duties: RecruitDuty[] }
  >();

  duties.forEach((duty) => {
    const baseLabel = savageRaidBaseName(duty.name) ?? duty.name;
    const key = `${duty.type}\u0000${baseLabel}`;
    const group = groups.get(key) ?? { baseLabel, type: duty.type, duties: [] };
    group.duties.push(duty);
    groups.set(key, group);
  });

  return [...groups.values()].map(({ baseLabel, type, duties: members }) => ({
    label:
      members.length > 1 &&
      members.every((duty) => savageRaidBaseName(duty.name))
        ? baseLabel
        : (members[0]?.name ?? baseLabel),
    type,
    dutyNames: members.map((duty) => duty.name),
  })) satisfies RecruitDutyChoice[];
}

export function expandRecruitDutyChoice(
  selectedLabel: string,
  duties: RecruitDuty[],
) {
  const normalized = selectedLabel.trim();
  if (!normalized) return [];
  const choice = buildRecruitDutyChoices(duties).find(
    (item) => item.label === normalized,
  );
  return choice?.dutyNames ?? [normalized];
}

function savageRaidBaseName(name: string) {
  if (!name.includes("零式")) return null;
  const match = name.match(/^(.*?)[1-4]$/u);
  return match?.[1]?.trim() || null;
}
