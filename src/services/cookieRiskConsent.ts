/** Persists the user's explicit acknowledgement for advanced Cookie login. */
const COOKIE_RISK_ACCEPTED_KEY = "openRisingStones.sdoCookieRiskAccepted";

export function hasAcceptedCookieLoginRisk() {
  try {
    return window.localStorage.getItem(COOKIE_RISK_ACCEPTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveCookieLoginRiskAcceptance(accepted: boolean) {
  try {
    if (accepted) window.localStorage.setItem(COOKIE_RISK_ACCEPTED_KEY, "true");
    else window.localStorage.removeItem(COOKIE_RISK_ACCEPTED_KEY);
  } catch {
    // Storage can be unavailable in restricted webviews; the current session still works.
  }
}
