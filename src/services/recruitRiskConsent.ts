/** Persists only whether the user accepted advanced recruitment request risks. */
const ADVANCED_RECRUIT_CONSENT_KEY =
  "open-rising-stones.recruit.advanced-risk.v1";

export function hasAdvancedRecruitRiskConsent() {
  try {
    return (
      window.localStorage.getItem(ADVANCED_RECRUIT_CONSENT_KEY) === "accepted"
    );
  } catch {
    return false;
  }
}

export function grantAdvancedRecruitRiskConsent() {
  try {
    window.localStorage.setItem(ADVANCED_RECRUIT_CONSENT_KEY, "accepted");
    return true;
  } catch {
    return false;
  }
}
