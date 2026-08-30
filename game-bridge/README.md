# Game Bridge

This directory contains the Windows-only bridge between the desktop application and the game process.

## Ownership boundary

- `crates/host` owns process discovery, DLL loading, authenticated IPC, monitoring, world metadata, and semantic commands.
- `crates/protocol` owns Rust wire types and the protocol version.
- `payload` owns every in-process pointer access, address resolution, Framework-thread command, native call, and hook lifecycle.
- `src-tauri/src/game_bridge.rs` owns the typed desktop API, resource selection, lifecycle preparation, and versioned read batching. It does not contain process or game-memory implementation logic.

The host never accepts or exposes arbitrary memory read, memory write, or function-call commands. The payload accepts only the fixed protocol commands defined by protocol version 3.

The Tauri API accepts only a process ID, an optional manifest filename, and fixed semantic read resources. DLL and data paths are resolved from the packaged `game-bridge` resource directory, so webview input cannot select an arbitrary DLL. When no manifest is supplied, the adapter selects the newest packaged manifest. Debug builds may override the resource directory with `ORS_GAME_BRIDGE_DIR`.

## Safety gates

The payload validates all of the following before installing its Framework hook:

1. Exact game version from `ffxivgame.ver`.
2. Main executable filename.
3. SHA-256 of the executable's raw `.text` section.
4. Exactly one match for every required signature.
5. All resolved addresses remain inside the main module.

Manifest schema 4 defines `textSha256` as the SHA-256 of the executable's raw `.text` section and includes LocalPlayer, GameMain, InventoryManager, and ItemFinderModule definitions used by the read-only diagnostics. The template manifest is deliberately unusable because its version and hash are placeholders. Create one manifest per verified game version. Never replace a failed signature with a guessed address.

The template also sets `privateLayoutVerified` to `false`. The collector intentionally preserves that value. Snapshot collection remains available, but region switching is rejected until the private Lobby context fields have been verified against the exact target version.

## Manifest collection

Run the collector against an existing Windows game installation:

```powershell
.\game-bridge\collect-manifest.ps1 `
  -GamePath "D:\Games\FFXIV\game" `
  -ExpectedVersion "2026.08.05.0000.0000"
```

The collector reads `ffxivgame.ver`, parses the PE section table, hashes the raw `.text` bytes, verifies that every AOB matches exactly once, resolves direct and relative addresses to module RVAs, and writes the completed file under `config\manifests`. It does not derive private structure offsets.

## Active character diagnostic

After connecting the bridge and entering the game world, call the read-only Tauri command:

```ts
import { invoke } from "@tauri-apps/api/core";

const character = await invoke("game_bridge_capture_active_character");
console.log(character);
```

The response includes character identity, current and home World IDs, class job, level, HP/MP, position, Territory ID, and zone load state. `not_in_world` means no LocalPlayer exists yet; `territory_not_ready` means the character is still zoning. This command does not require the private Lobby layout gate.

## Versioned Tauri read API

Frontend features should prefer the typed preparation and batch read commands:

```ts
await invoke("game_bridge_prepare", {
  request: { processId: null, manifestFile: null },
});
const response = await invoke("game_bridge_read", {
  request: { resources: ["active_character", "inventory"] },
});
```

`game_bridge_prepare` reuses a ready connection, recovers a faulted connection, selects controlled resources, and waits for the payload handshake. `game_bridge_read` returns a `schemaVersion`, optional typed resource values, and per-resource failures so adding another semantic read does not require another frontend lifecycle implementation. Tauri failures use a stable `{ code, message }` envelope.

## Inventory diagnostic

Use one read-only Tauri command for equipped items, four player inventory pages, the Armoury Chest, and the cached Glamour Dresser:

```ts
const inventory = await invoke("game_bridge_capture_inventory");
```

Local containers are enumerated from `InventoryManager`; the Glamour Dresser uses the persistent `ItemFinderModule` cache used by item search. The response marks the dresser as `cached` and `mayBeStale`. It returns Item IDs and item state rather than localized names; the Rust/UI layer should map Item IDs through a separate item catalog.

## IPC

The Rust host creates a randomized local Named Pipe and a 256-bit one-time token before loading the payload. Frames use a little-endian four-byte length followed by UTF-8 JSON. The maximum frame size is 1 MiB.

The payload has separate IPC and publisher threads. Neither performs game access. Commands are copied into a bounded Framework-thread queue, and snapshots are copied out before the IPC thread serializes them.

## Windows build

Run from PowerShell:

```powershell
.\game-bridge\build-windows.ps1 -Configuration Release
```

Requirements:

- Windows x64
- Visual Studio 2022 Build Tools with the Windows SDK
- CMake 3.26 or newer
- Git, because CMake downloads pinned C++ dependencies
- Rust toolchain with `x86_64-pc-windows-msvc`

MSVC is the default. Use `-Compiler ClangCL` only when the Visual Studio ClangCL toolset is installed. Each compiler uses a separate CMake directory so switching toolsets does not corrupt an existing cache. The script intentionally supports Windows only.

The output directory has the resource layout expected by the Tauri adapter:

```text
artifacts/Release/game-bridge/
├── game_bridge_payload.dll
├── game_bridge_payload.pdb
├── manifests/
└── worlds-cn.json
```

Verified manifests belong in `config/manifests/`, and the generated world map belongs at `config/worlds-cn.json`. The build script copies them when they exist. Release packaging should map this output directory to a resource directory named `game-bridge`.
