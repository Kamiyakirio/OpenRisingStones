// Reset the per-command marker before a new `tauri dev` session starts.
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const markerPath = resolve(scriptDirectory, "../src-tauri/.tauri-dev-started");

rmSync(markerPath, { force: true });
