/** Regression coverage for recruitment rate-limit signal classification. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  RecruitRateLimitError,
  isRecruitRateLimitError,
} from "../src/features/recruit/utils/recruitRateLimit.ts";

test("recognizes typed, HTTP, localized, and serialized rate limits", () => {
  assert.equal(isRecruitRateLimitError(new RecruitRateLimitError()), true);
  assert.equal(isRecruitRateLimitError("Request failed (HTTP 429)"), true);
  assert.equal(
    isRecruitRateLimitError(
      new Error("\u64cd\u4f5c\u9891\u7e41，\u8bf7\u7a0d\u540e\u91cd\u8bd5"),
    ),
    true,
  );
  assert.equal(isRecruitRateLimitError({ message: "Too Many Requests" }), true);
});

test("does not classify unavailable recruitment records as rate limits", () => {
  assert.equal(
    isRecruitRateLimitError(new Error("\u8be5\u62db\u52df\u672a\u4e0a\u67b6")),
    false,
  );
  assert.equal(isRecruitRateLimitError("Unable to parse response"), false);
});
