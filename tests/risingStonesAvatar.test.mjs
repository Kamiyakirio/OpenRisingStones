/** Regression coverage for supported CDN paths and failed-image fallback. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  isSupportedRisingStonesAvatar,
  selectAvatarSource,
} from "../src/utils/risingStonesAvatar.ts";

test("accepts only supported Rising Stones avatar paths", () => {
  assert.equal(
    isSupportedRisingStonesAvatar(
      "https://ff14risingstones.gcloud.com.cn/avatar/2026/user/avatar.jpeg",
    ),
    true,
  );
  assert.equal(
    isSupportedRisingStonesAvatar(
      "https://ff14risingstones.gcloud.com.cn/default/2026/user/avatar.jpeg",
    ),
    true,
  );
  assert.equal(
    isSupportedRisingStonesAvatar(
      "https://ff14risingstones.gcloud.com.cn/other/user/avatar.jpeg",
    ),
    false,
  );
  assert.equal(
    isSupportedRisingStonesAvatar(
      "https://example.com/avatar/2026/user/avatar.jpeg",
    ),
    false,
  );
});

test("removes failed direct and proxied avatar sources", () => {
  const url =
    "https://ff14risingstones.gcloud.com.cn/default/2026/user/avatar.jpeg";
  assert.equal(selectAvatarSource(url, false, null), url);
  assert.equal(selectAvatarSource(url, true, null), null);
  assert.equal(
    selectAvatarSource(url, true, {
      source: "data:image/jpeg;base64,YQ==",
      failed: false,
    }),
    "data:image/jpeg;base64,YQ==",
  );
  assert.equal(
    selectAvatarSource(url, false, { source: url, failed: true }),
    null,
  );
});
