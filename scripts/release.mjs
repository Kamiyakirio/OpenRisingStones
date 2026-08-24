/**
 * Build the host platform's Python sidecar and bundle it with the Tauri app.
 * PyInstaller is not a cross-compiler, so each OS and CPU architecture must run
 * this script on a matching build machine.
 */

import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const tauriDirectory = join(projectRoot, "src-tauri");
const pythonDirectory = join(tauriDirectory, "python");
const releaseDirectory = join(projectRoot, ".release");
const sidecarName = "rising-stones-api-client";
const isWindows = process.platform === "win32";
const executableExtension = isWindows ? ".exe" : "";
const npmCommand = isWindows ? "npm.cmd" : "npm";

function fail(message) {
  throw new Error(message);
}

/** Run a command with visible output and stop at the first failure. */
function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    fail(`Unable to start ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${command} exited with status ${result.status ?? "unknown"}.`);
  }
}

/** Capture a small command result used for toolchain discovery. */
function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
}

function findPython() {
  const candidates = isWindows
    ? [
        ["py", ["-3"]],
        ["python", []],
        ["python3", []],
      ]
    : [
        ["python3", []],
        ["python", []],
      ];

  for (const [command, launcherArgs] of candidates) {
    const version = capture(command, [
      ...launcherArgs,
      "-c",
      "import sys; print('.'.join(map(str, sys.version_info[:3])))",
    ]);
    if (!version) {
      continue;
    }
    const [major, minor] = version.split(".").map(Number);
    if (major > 3 || (major === 3 && minor >= 10)) {
      return { command, launcherArgs, version };
    }
  }
  fail("Python 3.10 or newer is required to build the release sidecar.");
}

function detectTargetTriple() {
  const verboseVersion = capture("rustc", ["-vV"]);
  const targetTriple =
    capture("rustc", ["--print", "host-tuple"]) ??
    verboseVersion?.match(/^host:\s+(\S+)$/m)?.[1];
  if (!targetTriple) {
    fail("Unable to determine the Rust host target triple.");
  }

  const matchesHost =
    (process.platform === "darwin" && targetTriple.endsWith("apple-darwin")) ||
    (isWindows && targetTriple.includes("windows")) ||
    (process.platform === "linux" && targetTriple.includes("linux"));
  if (!matchesHost) {
    fail(
      `Rust target ${targetTriple} does not match the current operating system.`,
    );
  }
  return targetTriple;
}

function venvPythonPath(venvDirectory) {
  return isWindows
    ? join(venvDirectory, "Scripts", "python.exe")
    : join(venvDirectory, "bin", "python");
}

function dependencyFingerprint(pythonVersion) {
  const requirements = ["requirements.txt", "requirements-build.txt"]
    .map((name) => readFileSync(join(pythonDirectory, name)))
    .map((content) => content.toString("utf8"))
    .join("\n");
  return createHash("sha256")
    .update(`${pythonVersion}\n${requirements}`)
    .digest("hex");
}

function preparePythonEnvironment(python, targetTriple) {
  const venvDirectory = join(releaseDirectory, `venv-${targetTriple}`);
  const venvPython = venvPythonPath(venvDirectory);
  if (!existsSync(venvPython)) {
    mkdirSync(releaseDirectory, { recursive: true });
    run(python.command, [...python.launcherArgs, "-m", "venv", venvDirectory]);
  }

  const fingerprint = dependencyFingerprint(python.version);
  const stampPath = join(venvDirectory, ".requirements.sha256");
  const installedFingerprint = existsSync(stampPath)
    ? readFileSync(stampPath, "utf8").trim()
    : null;
  if (installedFingerprint !== fingerprint) {
    run(venvPython, [
      "-m",
      "pip",
      "install",
      "--disable-pip-version-check",
      "-r",
      join(pythonDirectory, "requirements-build.txt"),
    ]);
    writeFileSync(stampPath, `${fingerprint}\n`);
  }
  return venvPython;
}

function buildSidecar(venvPython, targetTriple) {
  const buildRoot = join(releaseDirectory, "pyinstaller", targetTriple);
  const distDirectory = join(buildRoot, "dist");
  const workDirectory = join(buildRoot, "work");
  const specDirectory = join(buildRoot, "spec");
  rmSync(buildRoot, { recursive: true, force: true });
  mkdirSync(distDirectory, { recursive: true });
  mkdirSync(workDirectory, { recursive: true });
  mkdirSync(specDirectory, { recursive: true });

  run(venvPython, [
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onefile",
    "--name",
    sidecarName,
    "--distpath",
    distDirectory,
    "--workpath",
    workDirectory,
    "--specpath",
    specDirectory,
    join(pythonDirectory, "api_client.py"),
  ]);

  const builtSidecar = join(
    distDirectory,
    `${sidecarName}${executableExtension}`,
  );
  if (!existsSync(builtSidecar)) {
    fail(`PyInstaller did not create ${builtSidecar}.`);
  }

  // This request exercises imports and process I/O without making a network call.
  const smokeTest = spawnSync(builtSidecar, [], {
    cwd: projectRoot,
    encoding: "utf8",
    input: '{"operation":"releaseSmokeTest"}',
    maxBuffer: 1024 * 1024,
  });
  if (
    smokeTest.status !== 1 ||
    !smokeTest.stderr.includes("Unsupported API operation.")
  ) {
    fail("The packaged Python sidecar failed its smoke test.");
  }

  const bundledSidecar = join(
    tauriDirectory,
    "binaries",
    `${sidecarName}-${targetTriple}${executableExtension}`,
  );
  mkdirSync(dirname(bundledSidecar), { recursive: true });
  copyFileSync(builtSidecar, bundledSidecar);
  if (!isWindows) {
    chmodSync(bundledSidecar, 0o755);
  }
  return bundledSidecar;
}

function ensureFrontendDependencies() {
  const tauriCliPackage = join(
    projectRoot,
    "node_modules",
    "@tauri-apps",
    "cli",
    "package.json",
  );
  if (!existsSync(tauriCliPackage)) {
    run(npmCommand, ["ci"]);
  }
}

function main() {
  console.log("Building an OpenRisingStones desktop release...");
  const targetTriple = detectTargetTriple();
  const python = findPython();
  console.log(`Target: ${targetTriple}`);
  console.log(`Python: ${python.version}`);

  ensureFrontendDependencies();
  const venvPython = preparePythonEnvironment(python, targetTriple);
  const sidecarPath = buildSidecar(venvPython, targetTriple);
  console.log(`Packaged sidecar: ${sidecarPath}`);

  run(npmCommand, [
    "run",
    "tauri",
    "--",
    "build",
    "--config",
    "src-tauri/tauri.release.conf.json",
    "--features",
    "bundled-python-sidecar",
  ]);

  console.log(
    `\nRelease complete. Installers are under ${join(
      tauriDirectory,
      "target",
      "release",
      "bundle",
    )}.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`\nRelease failed: ${error.message}`);
  process.exitCode = 1;
}
