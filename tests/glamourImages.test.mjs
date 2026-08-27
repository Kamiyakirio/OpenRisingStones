/** Regression coverage for real glamour image handling and fixture isolation. */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { hideBrokenImage } from "../src/utils/glamourPresentation.ts";

test("hides a failed glamour image without replacing its source", () => {
  const source = "https://cdn.example.com/glamour/failed.jpeg";
  const image = { hidden: false, src: source };

  hideBrokenImage(image);

  assert.equal(image.hidden, true);
  assert.equal(image.src, source);
});

test("keeps preview glamour fixtures out of runtime source", () => {
  const runtimeSource = readRuntimeSource("src");

  assert.doesNotMatch(runtimeSource, /PREVIEW_GLAMOURS|previewGlamours/);
  assert.doesNotMatch(runtimeSource, /\/glamours\/(?:look-\d+|scholar)\.jpg/);
});

function readRuntimeSource(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return readRuntimeSource(entryPath);
      return /\.(?:ts|tsx)$/.test(entry.name)
        ? [readFileSync(entryPath, "utf8")]
        : [];
    })
    .join("\n");
}
