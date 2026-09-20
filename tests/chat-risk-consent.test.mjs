/** Risk acknowledgement is explicit, versioned, and tolerant of unavailable storage. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAT_RISK_CONSENT_KEY,
  grantChatRiskConsent,
  hasChatRiskConsent,
} from "../src/features/chat/chatRiskConsent.ts";

test("chat risk consent persists only the acknowledgement marker", () => {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  assert.equal(hasChatRiskConsent(), false);
  assert.equal(grantChatRiskConsent(), true);
  assert.equal(values.get(CHAT_RISK_CONSENT_KEY), "accepted");
  assert.equal(hasChatRiskConsent(), true);
  delete globalThis.window;
});

test("chat risk consent fails closed when storage is unavailable", () => {
  globalThis.window = {
    localStorage: {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    },
  };
  assert.equal(hasChatRiskConsent(), false);
  assert.equal(grantChatRiskConsent(), false);
  delete globalThis.window;
});
