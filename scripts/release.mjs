/**
 * Build the host platform's Python sidecar and bundle it with the Tauri app.
 * PyInstaller is not a cross-compiler, so each OS and CPU architecture must run
 * this script on a matching build machine.
 * Preserve final artifacts, then clean build files on both success and failure.
 */

import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { configureSystemProxy } from "./system-proxy.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const tauriDirectory = join(projectRoot, "src-tauri");
const pythonDirectory = join(tauriDirectory, "python");
const releaseDirectory = join(projectRoot, ".release");
const sidecarName = "rising-stones-api-client";
const appBinaryName = "open-rising-stones";
const productName = "OpenRisingStones";
const embeddedSidecarEnvironmentKey = "OPEN_RISING_STONES_BUNDLED_CLIENT_PATH";
const embeddedGameBridgeEnvironmentKey =
  "OPEN_RISING_STONES_BUNDLED_GAME_BRIDGE_MANIFEST";
const isWindows = process.platform === "win32";
const executableExtension = isWindows ? ".exe" : "";

function fail(message) {
  throw new Error(message);
}

/** Use a monotonic clock and report elapsed time even when a build step fails. */
function timed(label, action) {
  const startedAt = performance.now();
  try {
    return action();
  } finally {
    const elapsedSeconds = (performance.now() - startedAt) / 1000;
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = (elapsedSeconds % 60).toFixed(1);
    const elapsed = [
      hours && `${hours}h`,
      minutes && `${minutes}m`,
      `${seconds}s`,
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`\n[Timing] ${label}: ${elapsed}`);
  }
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

/** Resolve npm without spawning a Windows command shim, which Node rejects with EINVAL. */
function findNpm() {
  if (!isWindows) {
    return { command: "npm", launcherArgs: [] };
  }

  const npmCliCandidates = [process.env.npm_execpath];
  const npmShims = capture("where.exe", ["npm.cmd"]);
  if (npmShims) {
    for (const npmShim of npmShims.split(/\r?\n/)) {
      npmCliCandidates.push(
        join(dirname(npmShim), "node_modules", "npm", "bin", "npm-cli.js"),
      );
    }
  }

  const npmCli = npmCliCandidates.find(
    (candidate) => candidate && existsSync(candidate),
  );
  if (!npmCli) {
    fail("Unable to locate the npm CLI entry point.");
  }
  return { command: process.execPath, launcherArgs: [npmCli] };
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

function ensureFrontendDependencies(npm) {
  const tauriCliPackage = join(
    projectRoot,
    "node_modules",
    "@tauri-apps",
    "cli",
    "package.json",
  );
  if (!existsSync(tauriCliPackage)) {
    run(npm.command, [...npm.launcherArgs, "ci"]);
    run(npm.command, [...npm.launcherArgs, "run", "skills:install"]);
  }
}

/** Build the native Windows payload consumed by the game bridge host. */
function buildGameBridge() {
  if (!isWindows) {
    return;
  }

  run("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    join(projectRoot, "game-bridge", "build-windows.ps1"),
    "-Configuration",
    "Release",
  ]);
}

/** Return every runtime asset below a directory in deterministic order. */
function collectRuntimeAssets(rootDirectory, currentDirectory = rootDirectory) {
  const assets = [];
  for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
    const entryPath = join(currentDirectory, entry.name);
    if (entry.isDirectory()) {
      assets.push(...collectRuntimeAssets(rootDirectory, entryPath));
    } else if (entry.isFile() && !entry.name.toLowerCase().endsWith(".pdb")) {
      assets.push({
        sourcePath: entryPath,
        relativePath: relative(rootDirectory, entryPath).split(sep).join("/"),
      });
    }
  }
  return assets.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

/** Generate Rust declarations that embed the complete game bridge runtime. */
function prepareEmbeddedGameBridge(targetTriple) {
  const assetRoot = join(
    projectRoot,
    "game-bridge",
    "artifacts",
    "Release",
    "game-bridge",
  );
  if (!existsSync(assetRoot)) {
    fail(`The game bridge artifact directory is missing: ${assetRoot}.`);
  }

  const assets = collectRuntimeAssets(assetRoot);
  const assetNames = new Set(assets.map((asset) => asset.relativePath));
  for (const requiredAsset of ["game_bridge_payload.dll", "worlds-cn.json"]) {
    if (!assetNames.has(requiredAsset)) {
      fail(`The game bridge asset is missing: ${requiredAsset}.`);
    }
  }
  if (
    !assets.some((asset) => /^manifests\/.+\.json$/i.test(asset.relativePath))
  ) {
    fail("The game bridge does not contain a release manifest.");
  }

  const generatedDirectory = join(releaseDirectory, "generated", targetTriple);
  const generatedManifest = join(generatedDirectory, "game_bridge_assets.rs");
  mkdirSync(generatedDirectory, { recursive: true });
  const declarations = assets
    .map(
      ({ relativePath, sourcePath }) =>
        `  (${JSON.stringify(relativePath)}, include_bytes!(${JSON.stringify(sourcePath)})),`,
    )
    .join("\n");
  writeFileSync(
    generatedManifest,
    `// Generated by scripts/release.mjs. Do not edit.\nconst BUNDLED_GAME_BRIDGE_FILES: &[(&str, &[u8])] = &[\n${declarations}\n];\n`,
  );
  return generatedManifest;
}

/** Build the desktop app and return the platform-specific release output. */
function buildDesktopApp(
  npm,
  sidecarPath,
  gameBridgeManifestPath,
  targetTriple,
) {
  const releaseFeatures = isWindows
    ? "bundled-python-sidecar,bundled-game-bridge"
    : "bundled-python-sidecar";
  const releaseConfig = isWindows
    ? JSON.stringify({ bundle: { active: false, externalBin: [] } })
    : "src-tauri/tauri.release.conf.json";
  const buildArguments = [
    ...npm.launcherArgs,
    "run",
    "tauri",
    "--",
    "build",
    "--config",
    releaseConfig,
    "--features",
    releaseFeatures,
  ];

  if (isWindows) {
    // Rust embeds these runtime files in the app, so the published executable
    // has no companion assets and Tauri does not need to generate an installer.
    process.env[embeddedSidecarEnvironmentKey] = sidecarPath;
    process.env[embeddedGameBridgeEnvironmentKey] = gameBridgeManifestPath;
    buildArguments.push("--no-bundle");
  }

  run(npm.command, buildArguments);

  const builtOutput = isWindows
    ? join(tauriDirectory, "target", "release", `${appBinaryName}.exe`)
    : join(tauriDirectory, "target", "release", "bundle");
  if (!existsSync(builtOutput)) {
    fail(`Tauri did not create ${builtOutput}.`);
  }

  const artifactDirectory = join(releaseDirectory, "artifacts", targetTriple);
  rmSync(artifactDirectory, { recursive: true, force: true });
  mkdirSync(artifactDirectory, { recursive: true });
  // Preserve installers outside Cargo's target directory before cargo clean runs.
  const outputPath = join(
    artifactDirectory,
    isWindows ? `${productName}.exe` : "bundle",
  );
  // macOS app bundles contain relative framework links that must survive cleanup.
  cpSync(builtOutput, outputPath, { recursive: true, verbatimSymlinks: true });
  return {
    description: isWindows ? "Portable executable" : "Installers",
    path: outputPath,
  };
}

/** Reject cleanup paths outside the project, including paths through symlinks. */
function cleanupPath(rootDirectory, relativePath) {
  const root = realpathSync(rootDirectory);
  const target = resolve(root, relativePath);
  const isWithinRoot = (path) => {
    const suffix = relative(root, path);
    return (
      suffix &&
      suffix !== ".." &&
      !suffix.startsWith(`..${sep}`) &&
      !isAbsolute(suffix)
    );
  };
  if (!isWithinRoot(target)) fail(`Unsafe cleanup path: ${target}.`);
  let existingPath = target;
  while (!existsSync(existingPath)) existingPath = dirname(existingPath);
  const resolvedPath = realpathSync(existingPath);
  if (resolvedPath !== root && !isWithinRoot(resolvedPath)) {
    fail(`Cleanup path resolves outside the project: ${target}.`);
  }
  return target;
}

/** Only pass tagged Cargo caches to --target-dir; older caches use scoped removal. */
function hasCargoCacheTag(target) {
  const tag = join(target, "CACHEDIR.TAG");
  if (!existsSync(tag) || !lstatSync(tag).isFile()) return false;
  return readFileSync(tag, "utf8").startsWith(
    "Signature: 8a477f597d28d172789f06886806bc55",
  );
}

/** Retry transient Windows locks and clear read-only attributes only when needed. */
function removeBuildFiles(rootDirectory, relativePath) {
  const target = cleanupPath(rootDirectory, relativePath);
  const options = {
    recursive: true,
    force: true,
    maxRetries: 8,
    retryDelay: 200,
  };
  try {
    rmSync(target, options);
  } catch (error) {
    if (!isWindows || !["EPERM", "EACCES"].includes(error.code)) throw error;
    const makeWritable = (path) => {
      const checkedPath = cleanupPath(
        rootDirectory,
        relative(rootDirectory, path),
      );
      if (!existsSync(checkedPath)) return;
      const metadata = lstatSync(checkedPath);
      if (metadata.isSymbolicLink()) return;
      chmodSync(checkedPath, metadata.isDirectory() ? 0o700 : 0o600);
      if (metadata.isDirectory()) {
        for (const entry of readdirSync(checkedPath))
          makeWritable(join(checkedPath, entry));
      }
    };
    makeWritable(target);
    rmSync(target, options);
  }
}

/** Clean independent build stages even when a preceding cleanup action fails. */
export function cleanupReleaseBuilds({
  rootDirectory = projectRoot,
  runCommand = run,
} = {}) {
  console.log("\nCleaning release build files...");
  const errors = [];
  const attempt = (label, action) => {
    try {
      action();
    } catch (error) {
      errors.push(new Error(`${label}: ${error.message}`, { cause: error }));
    }
  };
  for (const workspace of ["src-tauri", "game-bridge"]) {
    attempt(`cargo clean (${workspace})`, () => {
      const targetPath = join(workspace, "target");
      const target = cleanupPath(rootDirectory, targetPath);
      if (!existsSync(target)) return;
      if (hasCargoCacheTag(target)) {
        try {
          runCommand(
            "cargo",
            [
              "clean",
              "--manifest-path",
              join(rootDirectory, workspace, "Cargo.toml"),
              "--target-dir",
              target,
            ],
            { cwd: rootDirectory },
          );
        } catch (error) {
          // A recovered command failure must not turn a completed release into a failure.
          console.warn(
            `Cargo clean failed for ${workspace}; trying scoped removal: ${error.message}`,
          );
        }
      } else {
        console.log(
          `Removing legacy Cargo build files without a cache tag: ${target}`,
        );
      }
      removeBuildFiles(rootDirectory, targetPath);
    });
  }

  const remove = (path) =>
    attempt(path, () => {
      removeBuildFiles(rootDirectory, path);
    });
  for (const path of [
    "dist",
    "dist-mobile",
    "dist-ssr",
    "node_modules/.tmp",
    "node_modules/.vite",
    "node_modules/.vite-temp",
    ".release/pyinstaller",
    ".release/generated",
    "src-tauri/binaries",
    "game-bridge/build",
    // Debug payloads can be loaded by the running game and belong to development.
    "game-bridge/artifacts/Release",
  ])
    remove(path);

  attempt("Python virtual environments", () => {
    const directory = cleanupPath(rootDirectory, ".release");
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith("venv-")) remove(join(".release", entry.name));
    }
  });
  const removePythonCaches = (directory) => {
    const path = cleanupPath(rootDirectory, directory);
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(directory, entry.name);
      if (entry.name === "__pycache__") remove(child);
      else if (entry.isDirectory()) removePythonCaches(child);
    }
  };
  attempt("Python bytecode caches", () =>
    removePythonCaches("src-tauri/python"),
  );
  if (errors.length) {
    throw new AggregateError(
      errors,
      errors.map((error) => error.message).join("\n"),
    );
  }
}

/** Always clean up and retain the original build error if cleanup also fails. */
export function withReleaseCleanup(build, cleanup) {
  let buildError;
  try {
    return build();
  } catch (error) {
    buildError = error;
    throw error;
  } finally {
    try {
      cleanup();
    } catch (error) {
      if (!buildError) throw error;
      throw new AggregateError(
        [buildError, error],
        `${buildError.message}\nCleanup failed: ${error.message}`,
      );
    }
  }
}

function main() {
  console.log("Building an OpenRisingStones desktop release...");
  const { targetTriple, python, npm } = timed("Toolchain discovery", () => {
    configureSystemProxy();
    return {
      targetTriple: detectTargetTriple(),
      python: findPython(),
      npm: findNpm(),
    };
  });
  console.log(`Target: ${targetTriple}`);
  console.log(`Python: ${python.version}`);

  timed("Frontend dependencies", () => ensureFrontendDependencies(npm));
  if (isWindows) timed("C++ payload and Rust game bridge", buildGameBridge);
  const venvPython = timed("Python environment", () =>
    preparePythonEnvironment(python, targetTriple),
  );
  const sidecarPath = timed("Python sidecar packaging and smoke test", () =>
    buildSidecar(venvPython, targetTriple),
  );
  console.log(`Packaged sidecar: ${sidecarPath}`);
  const gameBridgeManifestPath = isWindows
    ? timed("Game bridge embedding", () =>
        prepareEmbeddedGameBridge(targetTriple),
      )
    : null;

  const releaseOutput = timed(
    "Frontend and Tauri build, packaging and artifact copy",
    () =>
      buildDesktopApp(npm, sidecarPath, gameBridgeManifestPath, targetTriple),
  );
  console.log(
    `\nRelease complete. ${releaseOutput.description}: ${releaseOutput.path}`,
  );
}

// Importing cleanup helpers for isolated tests must never start a release build.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    timed("Release total (including cleanup)", () =>
      withReleaseCleanup(
        () => timed("Build total", main),
        () => timed("Cleanup", cleanupReleaseBuilds),
      ),
    );
  } catch (error) {
    console.error(`\nRelease failed: ${error.message}`);
    process.exitCode = 1;
  }
}
