/** Risk acknowledgement is explicit, versioned, and tolerant of unavailable storage. */
import assert from "node:assert/strict";
import test from "node:test";
import { mockBrowserGlobals } from "./helpers/browser-globals.ts";
import {
  CHAT_RISK_CONSENT_KEY,
  grantChatRiskConsent,
  hasChatRiskConsent,
} from "../src/features/chat/chatRiskConsent.ts";

test("chat risk consent persists only the acknowledgement marker", (t) => {
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
  assert.equal(hasChatRiskConsent(), false);
  assert.equal(grantChatRiskConsent(), true);
  assert.equal(values.get(CHAT_RISK_CONSENT_KEY), "accepted");
  assert.equal(hasChatRiskConsent(), true);
});

test("chat risk consent fails closed when storage is unavailable", (t) => {
  t.after(
    mockBrowserGlobals({
      window: {
        localStorage: {
          getItem: () => {
            throw new Error("blocked");
          },
          setItem: () => {
            throw new Error("blocked");
          },
        },
      },
    }),
  );
  assert.equal(hasChatRiskConsent(), false);
  assert.equal(grantChatRiskConsent(), false);
});
