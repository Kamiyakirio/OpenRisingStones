/** Import data from a local source tree without running its application or changing its files. */
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { extract } from "./gearing/extract.mjs";
import { installBundle } from "./gearing/install.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
try {
  if (
    args.some(
      (arg, i) =>
        arg !== "--source" && arg !== "--check" && args[i - 1] !== "--source",
    )
  )
    throw new Error("Usage: --source <local-directory> [--check]");
  const index = args.indexOf("--source");
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--"))
    throw new Error("Provide --source <local-directory>.");
  const source = resolve(args[index + 1]);
  const git = (...command) => {
    try {
      return execFileSync(
        "git",
        ["--no-optional-locks", "-C", source, ...command],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
    } catch {
      return null;
    }
  };
  const status = git("status", "--porcelain", "--untracked-files=no");
  const report = installBundle(extract(source), {
    target: join(root, "src/features/gearing/data/generated"),
    contract: JSON.parse(
      readFileSync(join(root, "scripts/gearing/contract.json"), "utf8"),
    ),
    sourceCommit: git("rev-parse", "HEAD"),
    sourceDirty: status === null ? null : Boolean(status),
    check: args.includes("--check"),
  });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
