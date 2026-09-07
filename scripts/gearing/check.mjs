/** Verify the local generated package before tools consume its JSON modules. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const generatedDirectory = fileURLToPath(
  new URL("../../src/features/gearing/data/generated/", import.meta.url),
);
const importCommand = "npm run gearing:data:update";

export function checkGearingData(directory = generatedDirectory) {
  try {
    const manifest = JSON.parse(
      readFileSync(join(directory, "manifest.json"), "utf8"),
    );
    if (manifest.formatVersion !== 1 || !manifest.files?.["rules.json"])
      throw new Error("Unsupported or incomplete gearing manifest.");
    for (const [file, expected] of Object.entries(manifest.files)) {
      if (!/^[A-Za-z0-9-]+\.json$/.test(file))
        throw new Error(`Invalid gearing data filename: ${file}`);
      const digest = createHash("sha256")
        .update(readFileSync(join(directory, file)))
        .digest("hex");
      if (digest !== expected)
        throw new Error(`Gearing data checksum mismatch: ${file}`);
    }
    return manifest;
  } catch (error) {
    throw new Error(
      `Gearing data is missing or invalid. Run:\n${importCommand}\n${error.message}`,
    );
  }
}
