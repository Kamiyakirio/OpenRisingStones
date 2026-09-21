import assert from "node:assert/strict";
import test from "node:test";
import {
  grantPortraitRiskConsent,
  hasPortraitRiskConsent,
} from "../src/features/portrait/riskConsent.ts";

test("portrait risk consent persists only the acknowledgement marker", () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.equal(hasPortraitRiskConsent(), false);
  assert.equal(grantPortraitRiskConsent(), true);
  assert.equal(hasPortraitRiskConsent(), true);
  assert.deepEqual([...values.values()], ["accepted"]);
});

test("portrait risk consent fails closed when storage is unavailable", () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error("storage unavailable");
    },
    setItem: () => {
      throw new Error("storage unavailable");
    },
  };

  assert.equal(hasPortraitRiskConsent(), false);
  assert.equal(grantPortraitRiskConsent(), false);
});
