// Prepare native Debug assets and reset the per-command marker before `tauri dev` starts.
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDebugPayload } from "./ensure-game-bridge-debug.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const markerPath = resolve(scriptDirectory, "../src-tauri/.tauri-dev-started");

ensureDebugPayload();
rmSync(markerPath, { force: true });
