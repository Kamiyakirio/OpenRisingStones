/** Regression coverage for history destinations versus in-workspace anchors. */
import assert from "node:assert/strict";
import test from "node:test";
import { featureFromHash } from "../src/app/navigation.ts";

test("browser history returning to the initial URL selects home", () => {
  for (const previous of ["glamour", "recruit", "teleport", "gearing"]) {
    assert.equal(featureFromHash("", previous), "home");
    assert.equal(featureFromHash("#home", previous), "home");
  }
});

test("explicit feature links select their destination", () => {
  for (const feature of ["glamour", "recruit", "teleport", "gearing"]) {
    assert.equal(featureFromHash(`#${feature}`, "home"), feature);
  }
});

test("known section links restore their owning feature", () => {
  assert.equal(featureFromHash("#teleport-orders"), "teleport");
  assert.equal(featureFromHash("#recommendations"), "glamour");
});

test("skip links and unknown local sections preserve the current workspace", () => {
  assert.equal(featureFromHash("#workspace-content", "gearing"), "gearing");
  assert.equal(featureFromHash("#top", "recruit"), "recruit");
  assert.equal(featureFromHash("#unknown"), "home");
});
