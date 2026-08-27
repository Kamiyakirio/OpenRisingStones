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
const windowsInternetSettingsKey =
  "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
const proxyEnvironmentKeys = [
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "CARGO_HTTP_PROXY",
  "npm_config_proxy",
  "npm_config_https_proxy",
];

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

function isEnabled(value) {
  return (
    value === "1" ||
    /^0x1$/i.test(value ?? "") ||
    value?.toLowerCase() === "true"
  );
}

/** Normalize an OS proxy endpoint to the URL format accepted by build tools. */
function normalizeProxyUrl(value, defaultScheme = "http") {
  const endpoint = value?.trim();
  if (!endpoint) {
    return null;
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(endpoint)
    ? endpoint
    : `${defaultScheme}://${endpoint}`;
  try {
    const url = new URL(candidate);
    if (!url.hostname) {
      return null;
    }
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function parseScutilValue(output, key) {
  return output.match(new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, "m"))?.[1];
}

function formatProxyHost(host) {
  const trimmedHost = host.trim();
  return trimmedHost.includes(":") && !trimmedHost.startsWith("[")
    ? `[${trimmedHost}]`
    : trimmedHost;
}

function parseMacSystemProxy(output) {
  const proxyCandidates = [
    ["HTTPSEnable", "HTTPSProxy", "HTTPSPort"],
    ["HTTPEnable", "HTTPProxy", "HTTPPort"],
  ];
  for (const [enabledKey, hostKey, portKey] of proxyCandidates) {
    if (!isEnabled(parseScutilValue(output, enabledKey))) {
      continue;
    }
    const host = parseScutilValue(output, hostKey);
    if (!host) {
      continue;
    }
    const port = parseScutilValue(output, portKey);
    const endpoint = `${formatProxyHost(host)}${port ? `:${port}` : ""}`;
    const proxyUrl = normalizeProxyUrl(endpoint);
    if (proxyUrl) {
      return proxyUrl;
    }
  }
  return null;
}

function readWindowsRegistryValue(output, key) {
  return output
    .match(new RegExp(`^\\s*${key}\\s+REG_\\w+\\s+(.+?)\\s*$`, "im"))?.[1]
    ?.trim();
}

function parseWindowsProxyServer(value) {
  const configuredProxies = new Map();
  let defaultProxy = null;
  for (const entry of value.split(";")) {
    const trimmedEntry = entry.trim();
    if (!trimmedEntry) {
      continue;
    }
    const separatorIndex = trimmedEntry.indexOf("=");
    if (separatorIndex === -1) {
      defaultProxy ??= trimmedEntry;
      continue;
    }
    const scheme = trimmedEntry.slice(0, separatorIndex).trim().toLowerCase();
    const endpoint = trimmedEntry.slice(separatorIndex + 1).trim();
    if (scheme && endpoint) {
      configuredProxies.set(scheme, endpoint);
    }
  }

  const endpoint =
    configuredProxies.get("https") ??
    configuredProxies.get("http") ??
    defaultProxy;
  return normalizeProxyUrl(endpoint);
}

function detectWindowsSystemProxy() {
  const settings = capture("reg.exe", ["query", windowsInternetSettingsKey]);
  if (settings) {
    const proxyEnabled = readWindowsRegistryValue(settings, "ProxyEnable");
    const proxyServer = readWindowsRegistryValue(settings, "ProxyServer");
    if (isEnabled(proxyEnabled) && proxyServer) {
      const proxyUrl = parseWindowsProxyServer(proxyServer);
      if (proxyUrl) {
        return proxyUrl;
      }
    }
  }

  // WinINet can resolve PAC/WPAD settings that are not represented by ProxyServer.
  const resolvedProxy = capture("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "$uri = [Uri]'https://github.com'; $proxy = [System.Net.WebRequest]::GetSystemWebProxy(); if (-not $proxy.IsBypassed($uri)) { $proxy.GetProxy($uri).AbsoluteUri }",
  ]);
  return normalizeProxyUrl(resolvedProxy);
}

function detectSystemProxy() {
  if (process.platform === "darwin") {
    return parseMacSystemProxy(capture("scutil", ["--proxy"]) ?? "");
  }
  if (isWindows) {
    return detectWindowsSystemProxy();
  }
  return null;
}

function redactProxyUrl(proxyUrl) {
  try {
    const url = new URL(proxyUrl);
    if (url.username || url.password) {
      url.username = "***";
      url.password = "***";
    }
    return url.href.replace(/\/$/, "");
  } catch {
    return "configured proxy";
  }
}

/** Make system proxy settings available to every dependency downloader. */
function configureDependencyProxy() {
  if (proxyEnvironmentKeys.some((key) => process.env[key]?.trim())) {
    return;
  }

  const proxyUrl = detectSystemProxy();
  if (!proxyUrl) {
    return;
  }

  for (const key of proxyEnvironmentKeys) {
    process.env[key] = proxyUrl;
  }
  console.log(
    `Using system proxy for dependency downloads: ${redactProxyUrl(proxyUrl)}`,
  );
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
  }
}

function main() {
  console.log("Building an OpenRisingStones desktop release...");
  configureDependencyProxy();
  const targetTriple = detectTargetTriple();
  const python = findPython();
  const npm = findNpm();
  console.log(`Target: ${targetTriple}`);
  console.log(`Python: ${python.version}`);

  ensureFrontendDependencies(npm);
  const venvPython = preparePythonEnvironment(python, targetTriple);
  const sidecarPath = buildSidecar(venvPython, targetTriple);
  console.log(`Packaged sidecar: ${sidecarPath}`);

  run(npm.command, [
    ...npm.launcherArgs,
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
