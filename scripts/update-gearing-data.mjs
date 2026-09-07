/** Fetch raw game tables, convert them with owned rules, and atomically publish a validated package. */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { downloadInputs } from "./gearing/download.mjs";
import { buildBundle } from "./gearing/build.mjs";
import { installBundle } from "./gearing/install.mjs";
import { generatedDirectory } from "./gearing/check.mjs";

const usage =
  "Usage: npm run gearing:data:update -- [--check] [--ref <release-ref>] [--lodestone-ref <ref>]";
try {
  const args = process.argv.slice(2),
    options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--check") options.check = true;
    else if (arg === "--ref" || arg === "--lodestone-ref") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(usage);
      options[arg === "--ref" ? "ref" : "lodestoneRef"] = value;
    } else if (arg === "--help") {
      console.log(usage);
      process.exit(0);
    } else throw new Error(usage);
  }
  const input = await downloadInputs({
    ...options,
    progress: (message) => console.error(message),
  });
  const previousFile = join(generatedDirectory, "manifest.json");
  if (!options.ref && existsSync(previousFile)) {
    const previous = JSON.parse(readFileSync(previousFile, "utf8"));
    if (Number(input.gameVersion) < Number(previous.gameVersion))
      throw new Error(
        `Refusing to replace ${previous.gameVersion} with older ${input.gameVersion} data. Use --ref only for an intentional rollback.`,
      );
  }
  const bundle = buildBundle(input);
  const contract = JSON.parse(
    readFileSync(new URL("./gearing/contract.json", import.meta.url), "utf8"),
  );
  const report = installBundle(bundle, {
    target: generatedDirectory,
    contract,
    check: options.check,
  });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
