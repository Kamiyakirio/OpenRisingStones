/** Match real-time fishing windows against local calendar availability. */
import type { FishWindow } from "./model";

const DAY_MS = 86_400_000;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const WINDOW_FILTERS_KEY = "ors.fishing.windowFilters.v1";
export type WindowFilters = {
  fromDate: string;
  toDate: string;
  fromTime: string;
  toTime: string;
  weekdays: number[];
};
export const initialWindowFilters: WindowFilters = {
  fromDate: "",
  toDate: "",
  fromTime: "",
  toTime: "",
  weekdays: [],
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateBoundary(value: string, extraDays = 0) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day + extraDays).getTime();
}

function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    datePattern.test(value) &&
    localDateKey(new Date(dateBoundary(value))) === value
  );
}

function timeMinutes(value: string) {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

/** Discard damaged stored fields without losing the rest of the filter. */
export function parseWindowFilters(text: string | null): WindowFilters {
  try {
    const value = JSON.parse(text ?? "null");
    if (!value || typeof value !== "object") return initialWindowFilters;
    return {
      fromDate: validDate(value.fromDate) ? value.fromDate : "",
      toDate: validDate(value.toDate) ? value.toDate : "",
      fromTime: timePattern.test(value.fromTime) ? value.fromTime : "",
      toTime: timePattern.test(value.toTime) ? value.toTime : "",
      weekdays: Array.isArray(value.weekdays)
        ? [
            ...new Set<number>(
              value.weekdays.filter(
                (day: unknown): day is number =>
                  typeof day === "number" &&
                  Number.isInteger(day) &&
                  day >= 0 &&
                  day <= 6,
              ),
            ),
          ].sort((a, b) => a - b)
        : [],
    };
  } catch {
    return initialWindowFilters;
  }
}

export function hasWindowFilters(filters: WindowFilters) {
  return Boolean(
    filters.fromDate ||
    filters.toDate ||
    filters.fromTime ||
    filters.toTime ||
    filters.weekdays.length,
  );
}

export function invalidWindowDateRange(filters: WindowFilters) {
  return Boolean(
    filters.fromDate && filters.toDate && filters.fromDate > filters.toDate,
  );
}

/** Search one year from the selected start date, or only through a bounded end date. */
export function windowSearchHorizonDays(
  origin: number,
  horizonDays: number,
  filters: WindowFilters,
) {
  if (filters.toDate)
    return Math.max(
      1,
      Math.ceil((dateBoundary(filters.toDate, 3) - origin) / DAY_MS),
    );
  const startOffset = filters.fromDate
    ? Math.max(0, Math.ceil((dateBoundary(filters.fromDate) - origin) / DAY_MS))
    : 0;
  return startOffset + horizonDays;
}

/** A window matches when at least one instant overlaps the selected local day and time. */
export function windowMatchesFilters(
  window: FishWindow,
  filters: WindowFilters,
) {
  if (!hasWindowFilters(filters)) return true;
  if (invalidWindowDateRange(filters)) return false;
  const fromMinute = timeMinutes(filters.fromTime) ?? 0;
  const toMinute = timeMinutes(filters.toTime) ?? 1440;
  const end = Number.isFinite(window.end)
    ? window.end
    : Math.max(
        window.start,
        filters.fromDate ? dateBoundary(filters.fromDate) : window.start,
      ) +
      8 * DAY_MS;
  const day = new Date(window.start);
  day.setHours(0, 0, 0, 0);
  while (day.getTime() < end) {
    const dateKey = localDateKey(day);
    if (filters.toDate && dateKey > filters.toDate) break;
    const nextDay = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate() + 1,
    );
    if (
      (!filters.fromDate || dateKey >= filters.fromDate) &&
      (!filters.weekdays.length || filters.weekdays.includes(day.getDay()))
    ) {
      const atMinute = (minute: number) =>
        new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          Math.floor(minute / 60),
          minute % 60,
        ).getTime();
      const spans =
        fromMinute === toMinute
          ? [[day.getTime(), nextDay.getTime()]]
          : fromMinute < toMinute
            ? [[atMinute(fromMinute), atMinute(toMinute)]]
            : [
                [day.getTime(), atMinute(toMinute)],
                [atMinute(fromMinute), nextDay.getTime()],
              ];
      if (
        spans.some(
          ([start, stop]) =>
            Math.max(window.start, start) < Math.min(window.end, stop),
        )
      )
        return true;
    }
    day.setTime(nextDay.getTime());
  }
  return false;
}
