/** The global Debug fetch adapter must leave Tauri's internal IPC transport alone. */
import assert from "node:assert/strict";
import test from "node:test";

test("debug fetch capture does not intercept the Tauri IPC scheme", async () => {
  const original = {
    fetch: globalThis.fetch,
    window: globalThis.window,
    location: globalThis.location,
    internals: globalThis.__TAURI_INTERNALS__,
    debug: globalThis.__DEBUG_BUILD__,
  };
  const calls = [];
  const response = { source: "native-ipc" };
  try {
    globalThis.window = globalThis;
    globalThis.location = { href: "http://localhost:1420/" };
    globalThis.__TAURI_INTERNALS__ = {};
    globalThis.__DEBUG_BUILD__ = true;
    globalThis.fetch = async (...args) => {
      calls.push(args);
      return response;
    };
    const { installFetchCapture } =
      await import("../src/shared/diagnostics/fetch.ts");
    installFetchCapture();
    const result = await globalThis.fetch("ipc://localhost/debug_log_record", {
      method: "POST",
    });
    assert.equal(result, response);
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = original.fetch;
    globalThis.window = original.window;
    globalThis.location = original.location;
    globalThis.__TAURI_INTERNALS__ = original.internals;
    globalThis.__DEBUG_BUILD__ = original.debug;
  }
});
