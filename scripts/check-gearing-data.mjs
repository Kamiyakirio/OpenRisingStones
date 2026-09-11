/** Fail before development/build when the frontend data asset is missing or corrupted. */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
export const generatedDirectory = fileURLToPath(
  new URL("../src/features/gearing/data/generated/", import.meta.url),
);
export function checkGearingData(directory = generatedDirectory) {
  try {
    const manifest = JSON.parse(
      readFileSync(join(directory, "manifest.json"), "utf8"),
    );
    if (
      manifest.formatVersion !== 3 ||
      Object.keys(manifest.files ?? {}).join() !== "catalog.json"
    )
      throw new Error("Unsupported gearing catalog manifest.");
    const digest = createHash("sha256")
      .update(readFileSync(join(directory, "catalog.json")))
      .digest("hex");
    if (digest !== manifest.files["catalog.json"])
      throw new Error("Gearing catalog checksum mismatch.");
    return manifest;
  } catch (error) {
    throw new Error(
      `Gearing data is missing or invalid. Run:\nnpm run gearing:data:update\n${error.message}`,
    );
  }
}

// Imports have no side effects; real paths also recognize CLI entrypoints through directory symlinks.
if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  try {
    checkGearingData();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
