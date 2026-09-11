/** Restore project-local skill dependencies with the official CLI and verify installation completed. */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const readLock = () =>
  JSON.parse(readFileSync(join(root, "skills-lock.json"), "utf8"));
try {
  const expected = readLock();
  let cli = join(root, "node_modules/skills/bin/cli.mjs");
  if (!statSync(cli, { throwIfNoEntry: false })?.isFile()) {
    const npmRoot = spawnSync("npm", ["root", "--global"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    cli = join(npmRoot.stdout?.trim() ?? "", "skills/bin/cli.mjs");
    if (
      npmRoot.status !== 0 ||
      !statSync(cli, { throwIfNoEntry: false })?.isFile()
    )
      throw new Error(
        "Skills CLI is missing. Install project dependencies or install the skills package globally.",
      );
    console.log(`Using globally installed Skills CLI: ${cli}`);
  }
  const entries = Object.entries(expected.skills ?? {});
  if (!entries.length)
    throw new Error("No skills are declared in skills-lock.json.");
  for (const [name, entry] of entries)
    if (!/^[a-z0-9-]+$/.test(name) || !/^[a-f0-9]{40}$/.test(entry.ref ?? ""))
      throw new Error(
        `Skill ${name} must have a safe name and a pinned commit ref.`,
      );
  const result = spawnSync(process.execPath, [cli, "experimental_install"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DISABLE_TELEMETRY: "1" },
  });
  if (result.error || result.status !== 0)
    throw (
      result.error ??
      new Error(`Skills CLI exited with ${result.status ?? result.signal}.`)
    );
  const installed = readLock();
  // The CLI can report a per-source failure without returning a failing exit code.
  for (const [name, entry] of entries) {
    const target = join(root, ".agents/skills", name, "SKILL.md");
    if (!statSync(target, { throwIfNoEntry: false })?.isFile())
      throw new Error(`Skill was not installed: ${name}`);
    for (const key of ["source", "ref", "skillPath"])
      if (installed.skills?.[name]?.[key] !== entry[key])
        throw new Error(`Skill source changed unexpectedly: ${name}/${key}`);
  }
  console.log(
    `Verified ${entries.length} project-local skills in .agents/skills/.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
