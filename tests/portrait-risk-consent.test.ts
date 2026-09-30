/** Portrait consent tests isolate browser storage from the Node test process. */
import assert from "node:assert/strict";
import test from "node:test";
import { mockBrowserGlobals } from "./helpers/browser-globals.ts";
import {
  grantPortraitRiskConsent,
  hasPortraitRiskConsent,
} from "../src/features/portrait/riskConsent.ts";

test("portrait risk consent persists only the acknowledgement marker", (t) => {
  const values = new Map<string, string>();
  t.after(
    mockBrowserGlobals({
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    }),
  );

  assert.equal(hasPortraitRiskConsent(), false);
  assert.equal(grantPortraitRiskConsent(), true);
  assert.equal(hasPortraitRiskConsent(), true);
  assert.deepEqual([...values.values()], ["accepted"]);
});

test("portrait risk consent fails closed when storage is unavailable", (t) => {
  t.after(
    mockBrowserGlobals({
      localStorage: {
        getItem: () => {
          throw new Error("storage unavailable");
        },
        setItem: () => {
          throw new Error("storage unavailable");
        },
      },
    }),
  );

  assert.equal(hasPortraitRiskConsent(), false);
  assert.equal(grantPortraitRiskConsent(), false);
});
