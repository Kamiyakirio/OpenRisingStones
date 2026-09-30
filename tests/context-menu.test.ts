/** Verify that only packaged release WebViews suppress the browser context menu. */
import assert from "node:assert/strict";
import test from "node:test";
import { mockBrowserGlobals } from "./helpers/browser-globals.ts";

import { installReleaseContextMenuGuard } from "../src/shared/utils/contextMenu.ts";

test("context-menu guard is limited to release WebViews", () => {
  for (const scenario of [
    { debug: true, tauri: true, prevented: false },
    { debug: false, tauri: false, prevented: false },
    { debug: false, tauri: true, prevented: true },
  ]) {
    const document = new EventTarget();
    const restore = mockBrowserGlobals({
      __DEBUG_BUILD__: scenario.debug,
      document,
      window: scenario.tauri ? { __TAURI_INTERNALS__: {} } : {},
    });
    try {
      installReleaseContextMenuGuard();
      const event = new Event("contextmenu", { cancelable: true });
      document.dispatchEvent(event);

      assert.equal(event.defaultPrevented, scenario.prevented);
    } finally {
      restore();
    }
  }
});
