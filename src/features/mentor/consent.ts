/** Remembers the player's explicit choice to monitor the running game. */
const KEY = "ors.mentor-monitor-consent.v1";

export function hasMentorConsent() {
  try {
    return localStorage.getItem(KEY) === "accepted";
  } catch {
    return false;
  }
}

export function grantMentorConsent() {
  try {
    localStorage.setItem(KEY, "accepted");
    return true;
  } catch {
    return false;
  }
}
