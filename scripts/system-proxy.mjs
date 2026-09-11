/** Discover the host OS proxy and expose it to Node and child-process downloaders. */
import { spawnSync } from "node:child_process";

const windowsInternetSettingsKey =
  "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
export const proxyEnvironmentKeys = [
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "CARGO_HTTP_PROXY",
  "npm_config_proxy",
  "npm_config_http_proxy",
  "npm_config_https_proxy",
];

/** Capture a small command result used for system proxy discovery. */
function capture(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) return null;
  return result.stdout.trim();
}

function isEnabled(value) {
  return (
    value === "1" ||
    /^0x1$/i.test(value ?? "") ||
    value?.toLowerCase() === "true"
  );
}

/** Normalize an OS proxy endpoint to the URL format accepted by download clients. */
export function normalizeProxyUrl(value, defaultScheme = "http") {
  const endpoint = value?.trim();
  if (!endpoint) return null;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(endpoint)
    ? endpoint
    : `${defaultScheme}://${endpoint}`;
  try {
    const url = new URL(candidate);
    if (!url.hostname) return null;
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

export function parseMacSystemProxy(output) {
  const candidates = [
    ["HTTPSEnable", "HTTPSProxy", "HTTPSPort"],
    ["HTTPEnable", "HTTPProxy", "HTTPPort"],
  ];
  for (const [enabledKey, hostKey, portKey] of candidates) {
    if (!isEnabled(parseScutilValue(output, enabledKey))) continue;
    const host = parseScutilValue(output, hostKey);
    if (!host) continue;
    const port = parseScutilValue(output, portKey);
    const endpoint = `${formatProxyHost(host)}${port ? `:${port}` : ""}`;
    const proxyUrl = normalizeProxyUrl(endpoint);
    if (proxyUrl) return proxyUrl;
  }
  return null;
}

function readWindowsRegistryValue(output, key) {
  return output
    .match(new RegExp(`^\\s*${key}\\s+REG_\\w+\\s+(.+?)\\s*$`, "im"))?.[1]
    ?.trim();
}

export function parseWindowsProxyServer(value) {
  const configuredProxies = new Map();
  let defaultProxy = null;
  for (const entry of value.split(";")) {
    const trimmedEntry = entry.trim();
    if (!trimmedEntry) continue;
    const separatorIndex = trimmedEntry.indexOf("=");
    if (separatorIndex === -1) {
      defaultProxy ??= trimmedEntry;
      continue;
    }
    const scheme = trimmedEntry.slice(0, separatorIndex).trim().toLowerCase();
    const endpoint = trimmedEntry.slice(separatorIndex + 1).trim();
    if (scheme && endpoint) configuredProxies.set(scheme, endpoint);
  }

  return normalizeProxyUrl(
    configuredProxies.get("https") ??
      configuredProxies.get("http") ??
      defaultProxy,
  );
}

function detectWindowsSystemProxy(captureCommand) {
  const settings = captureCommand("reg.exe", [
    "query",
    windowsInternetSettingsKey,
  ]);
  if (settings) {
    const enabled = readWindowsRegistryValue(settings, "ProxyEnable");
    const server = readWindowsRegistryValue(settings, "ProxyServer");
    if (isEnabled(enabled) && server) {
      const proxyUrl = parseWindowsProxyServer(server);
      if (proxyUrl) return proxyUrl;
    }
  }

  // WinINet resolves PAC/WPAD settings that ProxyServer does not contain.
  return normalizeProxyUrl(
    captureCommand("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$uri = [Uri]'https://github.com'; $proxy = [System.Net.WebRequest]::GetSystemWebProxy(); if (-not $proxy.IsBypassed($uri)) { $proxy.GetProxy($uri).AbsoluteUri }",
    ]),
  );
}

export function detectSystemProxy({
  platform = process.platform,
  captureCommand = capture,
} = {}) {
  if (platform === "darwin") {
    return parseMacSystemProxy(captureCommand("scutil", ["--proxy"]) ?? "");
  }
  if (platform === "win32") return detectWindowsSystemProxy(captureCommand);
  return null;
}

export function redactProxyUrl(proxyUrl) {
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

/** Prefer an explicit environment proxy, then publish the host system proxy. */
export function configureSystemProxy({
  environment = process.env,
  platform = process.platform,
  captureCommand = capture,
  log = console.log,
} = {}) {
  const configured = proxyEnvironmentKeys.find((key) =>
    environment[key]?.trim(),
  );
  if (configured) {
    const proxyUrl = environment[configured].trim();
    for (const key of proxyEnvironmentKeys) environment[key] ??= proxyUrl;
    return { source: "environment", proxyUrl };
  }

  const proxyUrl = detectSystemProxy({ platform, captureCommand });
  if (!proxyUrl) return null;
  for (const key of proxyEnvironmentKeys) environment[key] = proxyUrl;
  log(`Using system proxy for downloads: ${redactProxyUrl(proxyUrl)}`);
  return { source: "system", proxyUrl };
}
