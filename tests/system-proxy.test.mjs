/** Verify cross-platform system proxy discovery without changing host settings. */
import test from "node:test";
import assert from "node:assert/strict";
import { resolveProxyOptions } from "../scripts/gearing/download.mjs";
import {
  configureSystemProxy,
  detectSystemProxy,
  parseMacSystemProxy,
  parseWindowsProxyServer,
  redactProxyUrl,
} from "../scripts/system-proxy.mjs";

test("macOS system proxy prefers the HTTPS endpoint", () => {
  const output = `
<dictionary> {
  HTTPEnable : 1
  HTTPPort : 8080
  HTTPProxy : 127.0.0.1
  HTTPSEnable : 1
  HTTPSPort : 8443
  HTTPSProxy : proxy.example
}`;
  assert.equal(parseMacSystemProxy(output), "http://proxy.example:8443");
});

test("Windows proxy lists prefer the HTTPS endpoint", () => {
  assert.equal(
    parseWindowsProxyServer("http=proxy.local:80;https=secure.local:443"),
    "http://secure.local:443",
  );
  assert.equal(
    parseWindowsProxyServer("127.0.0.1:7890"),
    "http://127.0.0.1:7890",
  );
});

test("Windows system proxy falls back to WinINet PAC resolution", () => {
  const calls = [];
  const proxyUrl = detectSystemProxy({
    platform: "win32",
    captureCommand(command) {
      calls.push(command);
      return command === "powershell.exe" ? "http://pac-proxy:9000/" : null;
    },
  });
  assert.equal(proxyUrl, "http://pac-proxy:9000");
  assert.deepEqual(calls, ["reg.exe", "powershell.exe"]);
});

test("system proxy is published for Node and dependency downloaders", () => {
  const environment = {};
  const logs = [];
  const configured = configureSystemProxy({
    environment,
    platform: "darwin",
    captureCommand: () => `
HTTPSEnable : 1
HTTPSProxy : localhost
HTTPSPort : 7890`,
    log: (message) => logs.push(message),
  });

  assert.deepEqual(configured, {
    source: "system",
    proxyUrl: "http://localhost:7890",
  });
  assert.equal(environment.HTTP_PROXY, configured.proxyUrl);
  assert.equal(environment.HTTPS_PROXY, configured.proxyUrl);
  assert.equal(environment.CARGO_HTTP_PROXY, configured.proxyUrl);
  assert.equal(logs.length, 1);
});

test("proxy credentials are redacted from progress output", () => {
  assert.equal(
    redactProxyUrl("http://user:password@localhost:7890"),
    "http://***:***@localhost:7890",
  );
});

test("explicit proxy environment takes precedence over OS discovery", () => {
  const environment = { npm_config_http_proxy: "http://explicit.proxy:8080" };
  let detected = false;
  const configured = configureSystemProxy({
    environment,
    captureCommand: () => {
      detected = true;
      return null;
    },
  });
  assert.equal(configured.source, "environment");
  assert.equal(detected, false);
  assert.equal(environment.HTTP_PROXY, environment.npm_config_http_proxy);
  assert.equal(environment.HTTPS_PROXY, environment.npm_config_http_proxy);
});

test("proxy fetch options support ALL_PROXY and NO_PROXY", () => {
  assert.deepEqual(
    resolveProxyOptions({
      ALL_PROXY: "http://fallback.proxy:8080",
      NO_PROXY: "localhost,.example.com",
    }),
    {
      httpProxy: "http://fallback.proxy:8080",
      httpsProxy: "http://fallback.proxy:8080",
      noProxy: "localhost,.example.com",
    },
  );
});
