/** Regression coverage for XIVAPI class/job icon asset URLs. */
import assert from "node:assert/strict";
import test from "node:test";

import { getClassJobIconUrl } from "../src/features/glamour/data/classJobs.ts";

test("builds XIVAPI asset URLs from class/job row IDs", () => {
  const paladin = new URL(getClassJobIconUrl(19));
  const pictomancer = new URL(getClassJobIconUrl(42));

  assert.equal(paladin.origin, "https://xivapi-v2.xivcdn.com");
  assert.equal(paladin.pathname, "/api/asset");
  assert.equal(
    paladin.searchParams.get("path"),
    "ui/icon/062000/062119_hr1.tex",
  );
  assert.equal(
    pictomancer.searchParams.get("path"),
    "ui/icon/062000/062142_hr1.tex",
  );
  assert.equal(pictomancer.searchParams.get("format"), "png");
});
