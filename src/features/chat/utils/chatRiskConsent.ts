/** Persists only the user's acknowledgement of the injection and account risks. */
export const CHAT_RISK_CONSENT_KEY = "open-rising-stones.chat-risk.v1";

export function hasChatRiskConsent() {
  try {
    return window.localStorage.getItem(CHAT_RISK_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function grantChatRiskConsent() {
  try {
    window.localStorage.setItem(CHAT_RISK_CONSENT_KEY, "accepted");
    return true;
  } catch {
    return false;
  }
}
