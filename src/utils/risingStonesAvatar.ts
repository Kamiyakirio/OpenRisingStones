/** Pure validation and fallback rules for Rising Stones avatar sources. */
const AVATAR_HOST = "ff14risingstones.gcloud.com.cn";
const AVATAR_PATH_PREFIXES = ["/avatar/", "/default/"];

export type AvatarResolutionState = {
  source: string | null;
  failed: boolean;
};

export function isSupportedRisingStonesAvatar(url: string | null) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === AVATAR_HOST &&
      (!parsed.port || parsed.port === "443") &&
      !parsed.username &&
      !parsed.password &&
      AVATAR_PATH_PREFIXES.some((prefix) =>
        parsed.pathname.startsWith(prefix),
      ) &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

export function selectAvatarSource(
  url: string | null,
  proxied: boolean,
  current: AvatarResolutionState | null,
) {
  if (current?.failed) return null;
  return proxied ? (current?.source ?? null) : url;
}
