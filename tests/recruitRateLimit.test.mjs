/** Regression coverage for recruitment rate-limit signal classification. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  RecruitRateLimitError,
  isRecruitRateLimitError,
} from "../src/utils/recruitRateLimit.ts";

test("recognizes typed, HTTP, localized, and serialized rate limits", () => {
  assert.equal(isRecruitRateLimitError(new RecruitRateLimitError()), true);
  assert.equal(isRecruitRateLimitError("Request failed (HTTP 429)"), true);
  assert.equal(
    isRecruitRateLimitError(new Error("操作频繁，请稍后重试")),
    true,
  );
  assert.equal(isRecruitRateLimitError({ message: "Too Many Requests" }), true);
});

test("does not classify unavailable recruitment records as rate limits", () => {
  assert.equal(isRecruitRateLimitError(new Error("该招募未上架")), false);
  assert.equal(isRecruitRateLimitError("Unable to parse response"), false);
});
