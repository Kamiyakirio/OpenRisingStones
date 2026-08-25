/** Normalizes pagination metadata across Rising Stones response variants. */
type UnknownRecord = Record<string, unknown>;

export function findGlamourTotal(value: unknown, depth = 0): number | null {
  if (depth > 4 || !isRecord(value)) return null;
  const direct = readNumber(value, [
    "total",
    "total_count",
    "totalCount",
    "total_num",
    "totalNum",
    "total_rows",
    "totalRows",
    "count",
  ]);
  if (direct !== null) return direct;
  for (const key of ["data", "result", "payload"]) {
    const nested = findGlamourTotal(value[key], depth + 1);
    if (nested !== null) return nested;
  }
  return null;
}

export function inferGlamourHasMore(
  payload: unknown,
  recordCount: number,
  pageSize: number,
  loadedCount: number,
) {
  if (recordCount <= 0) return false;
  const explicitHasMore = findHasMore(payload);
  if (explicitHasMore !== null) return explicitHasMore;
  const reportedTotal = findGlamourTotal(payload);
  return reportedTotal !== null
    ? loadedCount < reportedTotal
    : recordCount >= pageSize;
}

function findHasMore(value: unknown, depth = 0): boolean | null {
  if (depth > 4 || !isRecord(value)) return null;
  for (const key of ["hasMore", "has_more", "hasNext", "has_next"]) {
    const candidate = value[key];
    if (typeof candidate === "boolean") return candidate;
    if (candidate === 0 || candidate === 1) return Boolean(candidate);
  }
  for (const key of ["data", "result", "payload"]) {
    const nested = findHasMore(value[key], depth + 1);
    if (nested !== null) return nested;
  }
  return null;
}

function readNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }
  return null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
