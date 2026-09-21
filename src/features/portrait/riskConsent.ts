/** Persists informed consent for the portrait feature's game-process bridge. */
const CONSENT_KEY = "ors.portrait-bridge-risk.v1";

export function hasPortraitRiskConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function grantPortraitRiskConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, "accepted");
    return true;
  } catch {
    return false;
  }
}
