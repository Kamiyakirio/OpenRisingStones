/** Builds stable XIVAPI asset URLs without adding runtime sheet requests. */
const ASSET_ORIGIN = "https://xivapi-v2.xivcdn.com";

const jobRowIds: Record<string, number> = {
  PLD: 19,
  WAR: 21,
  DRK: 32,
  GNB: 37,
  WHM: 24,
  SCH: 28,
  AST: 33,
  SGE: 40,
  MNK: 20,
  DRG: 22,
  NIN: 30,
  SAM: 34,
  RPR: 39,
  VPR: 41,
  BRD: 23,
  MCH: 31,
  DNC: 38,
  BLM: 25,
  SMN: 27,
  RDM: 35,
  PCT: 42,
  BLU: 36,
  CRP: 8,
  BSM: 9,
  ARM: 10,
  GSM: 11,
  LTW: 12,
  WVR: 13,
  ALC: 14,
  CUL: 15,
  MIN: 16,
  BTN: 17,
  FSH: 18,
};

export function itemIconUrl(iconId: number, highResolution = true) {
  if (!Number.isSafeInteger(iconId) || iconId <= 0) return "";
  const file = String(iconId).padStart(6, "0");
  const group = String(Math.floor(iconId / 1_000) * 1_000).padStart(6, "0");
  return assetUrl(
    `ui/icon/${group}/${file}${highResolution ? "_hr1" : ""}.tex`,
  );
}

export function jobIconUrl(job: string) {
  const rowId = jobRowIds[job];
  if (!rowId) return "";
  return assetUrl(
    `ui/icon/062000/${String(62_100 + rowId).padStart(6, "0")}_hr1.tex`,
  );
}

/** A failed request hides only that URL; changing item or job retries the new asset. */
export function assetSourceAvailable(
  source: string | null,
  failedSource: string | null,
) {
  return !!source && source !== failedSource;
}

function assetUrl(path: string) {
  const url = new URL("/api/asset", ASSET_ORIGIN);
  url.search = new URLSearchParams({ path, format: "png" }).toString();
  return url.toString();
}
