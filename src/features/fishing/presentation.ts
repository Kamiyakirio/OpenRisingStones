/** Player-facing labels shared by the fish list and catch sheet. */
export const kindLabels = {
  normal: "普通鱼",
  big: "鱼王",
  legendary: "鱼皇",
  "ocean-rare": "海钓稀有鱼",
  "ocean-legendary": "海钓传说鱼",
  unknown: "未分类",
};

/** Round upward so an unexpired window never reads as already elapsed. */
export function durationText(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return seconds >= 3600
    ? `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`
    : `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
}

import type { Fish } from "./types";
/** Ocean voyage time is separate from the world's Eorzean clock. */
export function timeRequirement(fish: Fish) {
  if (fish.method === "ocean") return "随航次时段";
  const start = fish.conditions?.startHour;
  const end = fish.conditions?.endHour;
  if (start == null || end == null) return "时段待补充";
  if (start === end || (start === 0 && end === 24)) return "全天";
  const hour = (value: number) =>
    `${String(Math.floor(value)).padStart(2, "0")}:${String(Math.round((value % 1) * 60)).padStart(2, "0")}`;
  return `${hour(start)}–${hour(end)}`;
}
