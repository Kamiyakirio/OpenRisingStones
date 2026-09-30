/** Regression coverage for the one-time advanced recruitment consent flag. */
import assert from "node:assert/strict";
import test from "node:test";
import { mockBrowserGlobals } from "./helpers/browser-globals.ts";

import {
  grantAdvancedRecruitRiskConsent,
  hasAdvancedRecruitRiskConsent,
} from "../src/features/recruit/utils/recruitRiskConsent.ts";

test("persists accepted advanced recruitment risk consent", (t) => {
  const values = new Map<string, string>();
  t.after(
    mockBrowserGlobals({
      window: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
        },
      },
    }),
  );

  assert.equal(hasAdvancedRecruitRiskConsent(), false);
  assert.equal(grantAdvancedRecruitRiskConsent(), true);
  assert.equal(hasAdvancedRecruitRiskConsent(), true);
});
