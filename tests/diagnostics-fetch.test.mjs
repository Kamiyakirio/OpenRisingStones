/** Exercise native IPC exclusions and ensure ordinary HTTP requests still produce logs. */
import assert from "node:assert/strict";
import test from "node:test";

test("debug fetch capture excludes native IPC without suppressing HTTP logs", async () => {
  const original = {
    fetch: globalThis.fetch,
    window: globalThis.window,
    location: globalThis.location,
    internals: globalThis.__TAURI_INTERNALS__,
    debug: globalThis.__DEBUG_BUILD__,
  };
  const calls = [];
  const records = [];
  let ipcScheme = "http";
  try {
    globalThis.window = globalThis;
    globalThis.location = { href: "http://localhost:1420/" };
    globalThis.__DEBUG_BUILD__ = true;
    globalThis.fetch = async (...args) => {
      const response = new Response("null", {
        headers: { "content-type": "application/json" },
      });
      calls.push({ args, response });
      return response;
    };
    globalThis.__TAURI_INTERNALS__ = {
      invoke: async (command, args) => {
        records.push({ command, ...args });
        // Bound the broken implementation so a regression fails instead of hanging.
        if (records.length >= 8) {
          globalThis.__DEBUG_BUILD__ = false;
          return;
        }
        return globalThis.fetch(`${ipcScheme}://ipc.localhost/${command}`, {
          method: "POST",
          body: JSON.stringify(args),
          headers: { "content-type": "application/json" },
        });
      },
    };
    const { installFetchCapture } =
      await import("../src/shared/diagnostics/fetch.ts");
    installFetchCapture();

    // Drain response-body capture and any IPC it schedules before checking counts.
    const settle = async () => {
      for (let turn = 0; turn < 30; turn += 1) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    };
    for (const address of [
      "ipc://localhost/debug_log_record",
      "http://ipc.localhost/debug_log_record",
      "https://ipc.localhost/debug_log_record",
      "http://ipc.localhost/startup_command",
      "https://ipc.localhost/plugin%3Aevent%7Clisten",
    ]) {
      for (const input of [address, new URL(address), new Request(address)]) {
        const init = { method: "POST", body: "{}" };
        const count = calls.length;
        const result = await globalThis.fetch(input, init);
        await settle();
        assert.equal(calls.length, count + 1, address);
        assert.equal(result, calls.at(-1).response);
        assert.equal(calls.at(-1).args[0], input);
        assert.equal(calls.at(-1).args[1], init);
        assert.equal(records.length, 0, address);
      }
    }

    for (const scheme of ["http", "https"]) {
      ipcScheme = scheme;
      const count = records.length;
      const address = `${scheme}://example.com/data`;
      await globalThis.fetch(address);
      await settle();
      assert.equal(records.length, count + 1);
      assert.equal(records.at(-1).command, "debug_log_record");
      assert.equal(records.at(-1).entry.request.url, address);
      assert.equal(records.at(-1).entry.outcome, "success");
    }
  } finally {
    globalThis.fetch = original.fetch;
    globalThis.window = original.window;
    globalThis.location = original.location;
    globalThis.__TAURI_INTERNALS__ = original.internals;
    globalThis.__DEBUG_BUILD__ = original.debug;
  }
});
