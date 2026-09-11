/** Gearing icon URLs follow XIVAPI's documented game asset paths. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  assetSourceAvailable,
  itemIconUrl,
  jobIconUrl,
} from "../src/features/gearing/editor/xivapiAssets.ts";

test("builds item and job icon asset URLs without sheet requests", () => {
  const item = new URL(itemIconUrl(37_851));
  assert.equal(item.origin, "https://xivapi-v2.xivcdn.com");
  assert.equal(item.pathname, "/api/asset");
  assert.equal(item.searchParams.get("path"), "ui/icon/037000/037851_hr1.tex");
  assert.equal(item.searchParams.get("format"), "png");

  const scholar = new URL(jobIconUrl("SCH"));
  assert.equal(
    scholar.searchParams.get("path"),
    "ui/icon/062000/062128_hr1.tex",
  );
  assert.equal(jobIconUrl("UNKNOWN"), "");
});

test("retries an icon after the item or job source changes", () => {
  const failed = itemIconUrl(37_858);
  const replacement = itemIconUrl(37_851);
  assert.equal(assetSourceAvailable(failed, failed), false);
  assert.equal(assetSourceAvailable(replacement, failed), true);
  assert.equal(assetSourceAvailable(null, failed), false);
});
