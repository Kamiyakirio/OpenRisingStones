/** Verify that only packaged release WebViews suppress the browser context menu. */
import assert from "node:assert/strict";
import test from "node:test";

import { installReleaseContextMenuGuard } from "../src/shared/utils/contextMenu.ts";

test("context-menu guard is limited to release WebViews", () => {
  const original = {
    debugBuild: globalThis.__DEBUG_BUILD__,
    document: globalThis.document,
    window: globalThis.window,
  };

  try {
    for (const scenario of [
      { debug: true, tauri: true, prevented: false },
      { debug: false, tauri: false, prevented: false },
      { debug: false, tauri: true, prevented: true },
    ]) {
      const document = new EventTarget();
      globalThis.__DEBUG_BUILD__ = scenario.debug;
      globalThis.document = document;
      globalThis.window = scenario.tauri ? { __TAURI_INTERNALS__: {} } : {};

      installReleaseContextMenuGuard();
      const event = new Event("contextmenu", { cancelable: true });
      document.dispatchEvent(event);

      assert.equal(event.defaultPrevented, scenario.prevented);
    }
  } finally {
    globalThis.__DEBUG_BUILD__ = original.debugBuild;
    globalThis.document = original.document;
    globalThis.window = original.window;
  }
});
