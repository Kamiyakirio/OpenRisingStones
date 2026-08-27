/** Regression coverage for the one-time advanced recruitment consent flag. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  grantAdvancedRecruitRiskConsent,
  hasAdvancedRecruitRiskConsent,
} from "../src/services/recruitRiskConsent.ts";

test("persists accepted advanced recruitment risk consent", () => {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };

  assert.equal(hasAdvancedRecruitRiskConsent(), false);
  assert.equal(grantAdvancedRecruitRiskConsent(), true);
  assert.equal(hasAdvancedRecruitRiskConsent(), true);

  delete globalThis.window;
});
