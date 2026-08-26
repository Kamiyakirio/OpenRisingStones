/** Regression coverage for Chrome cURL credential extraction. */
import assert from "node:assert/strict";
import test from "node:test";
import { extractCurlCredentials } from "../src/utils/curlCredentials.ts";

test("extracts Cookie and User-Agent from Chrome cURL bash output", () => {
  const request = String.raw`curl 'https://example.test/api' \
  -H 'accept: application/json' \
  -H 'cookie: session=abc123; route=shard-2' \
  -H 'user-agent: Mozilla/5.0 Test Browser'`;

  assert.deepEqual(extractCurlCredentials(request), {
    recognized: true,
    cookie: "session=abc123; route=shard-2",
    userAgent: "Mozilla/5.0 Test Browser",
  });
});

test("matches header names without case sensitivity", () => {
  const request =
    "curl 'https://example.test' --header='Cookie: token=value' --header='USER-AGENT: Browser/1.0'";

  assert.deepEqual(extractCurlCredentials(request), {
    recognized: true,
    cookie: "token=value",
    userAgent: "Browser/1.0",
  });
});

test("supports cURL cookie and user-agent options", () => {
  const request =
    "curl 'https://example.test' --cookie 'token=value' --user-agent 'Browser/1.0'";

  assert.deepEqual(extractCurlCredentials(request), {
    recognized: true,
    cookie: "token=value",
    userAgent: "Browser/1.0",
  });
});

test("reports missing request headers without guessing values", () => {
  assert.deepEqual(extractCurlCredentials("curl 'https://example.test'"), {
    recognized: true,
    cookie: null,
    userAgent: null,
  });
});

test("rejects fetch and PowerShell input", () => {
  assert.equal(
    extractCurlCredentials('fetch("https://example.test")').recognized,
    false,
  );
  assert.equal(
    extractCurlCredentials('Invoke-WebRequest -Uri "https://example.test"')
      .recognized,
    false,
  );
});
