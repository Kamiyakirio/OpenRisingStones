/** Keeps the packaged Debug payload synchronized with its native build inputs. */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const bridgeRoot = resolve(projectRoot, "game-bridge");
const artifactDirectory = resolve(
  bridgeRoot,
  "artifacts",
  "Debug",
  "game-bridge",
);
const payloadPath = resolve(artifactDirectory, "game_bridge_payload.dll");
const stampPath = resolve(artifactDirectory, ".payload-build.json");
const buildScriptPath = resolve(bridgeRoot, "build-windows.ps1");

function buildInputFiles() {
  return [
    buildScriptPath,
    ...filesBelow(resolve(bridgeRoot, "payload")),
    ...filesBelow(resolve(bridgeRoot, "config", "manifests")),
    ...existingFiles([
      resolve(bridgeRoot, "config", "worlds-cn.json"),
      resolve(bridgeRoot, "config", "worlds-cn.example.json"),
    ]),
  ].sort((left, right) => left.localeCompare(right));
}

/** Hashes paths and contents so deletions and Git checkouts also invalidate the build. */
function inputHash(files) {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(relative(bridgeRoot, file).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function filesBelow(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function existingFiles(files) {
  return files.filter((file) => existsSync(file) && statSync(file).isFile());
}

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readStamp() {
  try {
    const value = JSON.parse(readFileSync(stampPath, "utf8"));
    return value?.schemaVersion === 1 ? value : null;
  } catch {
    return null;
  }
}

function writeStamp(files) {
  writeFileSync(
    stampPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        inputHash: inputHash(files),
        payloadHash: fileHash(payloadPath),
      },
      null,
      2,
    )}\n`,
  );
}

export function ensureDebugPayload() {
  if (process.platform !== "win32") return;

  const files = buildInputFiles();
  const currentInputHash = inputHash(files);
  const stamp = readStamp();
  if (
    existsSync(payloadPath) &&
    stamp?.inputHash === currentInputHash &&
    stamp.payloadHash === fileHash(payloadPath)
  ) {
    console.log("Game bridge Debug payload is current.");
    return;
  }

  // Adopt an existing pre-stamp artifact only when it is newer than every current input.
  if (
    !stamp &&
    existsSync(payloadPath) &&
    statSync(payloadPath).mtimeMs >=
      Math.max(...files.map((file) => statSync(file).mtimeMs))
  ) {
    writeStamp(files);
    console.log(
      "Game bridge Debug payload is current; recorded its build fingerprint.",
    );
    return;
  }

  console.log(
    "Game bridge Debug payload is stale; rebuilding it before Tauri starts.",
  );
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      buildScriptPath,
      "-Configuration",
      "Debug",
      "-Compiler",
      "MSVC",
    ],
    { cwd: projectRoot, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Game bridge Debug payload build failed with exit code ${result.status ?? "unknown"}. Unload the payload from the game or close the game before retrying.`,
    );
  }
  if (!existsSync(payloadPath)) {
    throw new Error(
      "Game bridge Debug payload build produced no packaged DLL.",
    );
  }

  writeStamp(buildInputFiles());
}
