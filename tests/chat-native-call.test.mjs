/** Guards the nullable ProcessChatBoxEntry context against the crashing history branch. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runtimeSource = await readFile(
  new URL("../game-bridge/payload/src/game_runtime.cpp", import.meta.url),
  "utf8",
);

test("disables chat history when ProcessChatBoxEntry receives a null context", () => {
  assert.match(
    runtimeSource,
    /ui_module,\s*native_message\.data\(\),\s*0,\s*false\s*\)/,
  );
  assert.doesNotMatch(
    runtimeSource,
    /ui_module,\s*native_message\.data\(\),\s*0,\s*true\s*\)/,
  );
});
