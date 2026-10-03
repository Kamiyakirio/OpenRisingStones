/** Exercise release cleanup against isolated files without invoking real builds. */
import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cleanupReleaseBuilds,
  withReleaseCleanup,
} from "../scripts/release.mjs";

function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "ors-release-cleanup-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const create = (path: string) => {
    const directory = join(root, path);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "sentinel"), "fixture");
    return directory;
  };
  return { root, create };
}

test("cleanup removes build files while preserving releases, sources, and dependencies", (t) => {
  const { root, create } = fixture(t);
  const temporaryPaths = [
    "src-tauri/target",
    "game-bridge/target",
    "dist",
    "dist-mobile",
    "dist-ssr",
    "node_modules/.tmp",
    "node_modules/.vite",
    "node_modules/.vite-temp",
    ".release/pyinstaller",
    ".release/generated",
    ".release/venv-test-target",
    "src-tauri/binaries",
    "game-bridge/build",
    "game-bridge/artifacts/Release",
    "src-tauri/python/__pycache__",
    "src-tauri/python/client/__pycache__",
  ];
  const retainedPaths = [
    ".release/artifacts/test-target",
    "node_modules/@tauri-apps/api",
    "src-tauri/python/client",
    "game-bridge/payload",
    "game-bridge/artifacts/Debug/game-bridge",
    "public/data/fishing",
  ];
  [...temporaryPaths, ...retainedPaths].forEach(create);
  for (const workspace of ["src-tauri", "game-bridge"]) {
    writeFileSync(
      join(root, workspace, "target/CACHEDIR.TAG"),
      "Signature: 8a477f597d28d172789f06886806bc55\n",
    );
  }
  const calls: Array<{ command: string; args: string[] }> = [];
  cleanupReleaseBuilds({
    rootDirectory: root,
    runCommand: (command: string, args: string[]) => {
      calls.push({ command, args });
    },
  });
  for (const path of temporaryPaths)
    assert.equal(existsSync(join(root, path)), false, path);
  for (const path of retainedPaths)
    assert.equal(existsSync(join(root, path, "sentinel")), true, path);
  assert.deepEqual(
    calls.map(({ command, args }) => [command, args[0], args[2], args[4]]),
    [
      [
        "cargo",
        "clean",
        join(root, "src-tauri/Cargo.toml"),
        join(root, "src-tauri/target"),
      ],
      [
        "cargo",
        "clean",
        join(root, "game-bridge/Cargo.toml"),
        join(root, "game-bridge/target"),
      ],
    ],
  );
});

test("a failed cargo clean recovers through scoped removal", (t) => {
  const { root, create } = fixture(t);
  create("src-tauri/target");
  create("game-bridge/target");
  for (const workspace of ["src-tauri", "game-bridge"]) {
    writeFileSync(
      join(root, workspace, "target/CACHEDIR.TAG"),
      "Signature: 8a477f597d28d172789f06886806bc55\n",
    );
  }
  create("dist");
  create(".release/venv-test");
  let calls = 0;
  assert.doesNotThrow(() =>
    cleanupReleaseBuilds({
      rootDirectory: root,
      runCommand: () => {
        if (++calls === 1) throw new Error("Cargo unavailable");
      },
    }),
  );
  assert.equal(calls, 2);
  for (const path of ["src-tauri/target", "dist", ".release/venv-test"]) {
    assert.equal(existsSync(join(root, path)), false);
  }
});

test("legacy and missing Cargo caches clean without running cargo", (t) => {
  const { root, create } = fixture(t);
  create("src-tauri/target");
  let calls = 0;
  const cleanup = () =>
    cleanupReleaseBuilds({
      rootDirectory: root,
      runCommand: () => {
        calls++;
      },
    });
  cleanup();
  cleanup();
  assert.equal(calls, 0);
  assert.equal(existsSync(join(root, "src-tauri/target")), false);
});

test("cleanup removes read-only Release files and preserves Debug payloads", (t) => {
  const { root, create } = fixture(t);
  const release = create("game-bridge/artifacts/Release/game-bridge");
  const debug = create("game-bridge/artifacts/Debug/game-bridge");
  chmodSync(join(release, "sentinel"), 0o444);
  cleanupReleaseBuilds({ rootDirectory: root, runCommand: () => {} });
  assert.equal(existsSync(release), false);
  assert.equal(existsSync(join(debug, "sentinel")), true);
});

test("cleanup rejects a target redirected outside the project", (t) => {
  const { root, create } = fixture(t);
  const outside = mkdtempSync(join(tmpdir(), "ors-release-outside-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, "sentinel"), "keep");
  symlinkSync(
    outside,
    join(root, "dist"),
    process.platform === "win32" ? "junction" : "dir",
  );
  create("dist-mobile");
  assert.throws(
    () => cleanupReleaseBuilds({ rootDirectory: root, runCommand: () => {} }),
    /outside the project/,
  );
  assert.equal(existsSync(join(outside, "sentinel")), true);
  assert.equal(existsSync(join(root, "dist-mobile")), false);
});

test("cleanup runs after success and after an early build failure", () => {
  let cleanups = 0;
  const cleanup = () => {
    cleanups++;
  };
  assert.equal(
    withReleaseCleanup(() => "artifact", cleanup),
    "artifact",
  );
  const failure = new Error("Python discovery failed");
  assert.throws(
    () =>
      withReleaseCleanup(() => {
        throw failure;
      }, cleanup),
    (error) => error === failure,
  );
  assert.equal(cleanups, 2);
});

test("cleanup errors fail successful builds without hiding failed build diagnostics", () => {
  const cleanupError = new Error("File locked");
  const cleanup = () => {
    throw cleanupError;
  };
  assert.throws(
    () => withReleaseCleanup(() => {}, cleanup),
    (error) => error === cleanupError,
  );
  const buildError = new Error("Tauri build failed");
  assert.throws(
    () =>
      withReleaseCleanup(() => {
        throw buildError;
      }, cleanup),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(error.errors, [buildError, cleanupError]);
      assert.match(error.message, /Tauri build failed/);
      assert.match(error.message, /File locked/);
      return true;
    },
  );
});
