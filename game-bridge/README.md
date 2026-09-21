# Game Bridge

This directory contains the Windows-only bridge between the desktop application and the game process.

## Ownership boundary

- `crates/host` owns process discovery, DLL loading, shared-memory command encoding, monitoring, world metadata, and semantic commands.
- `crates/protocol` owns the Rust-facing semantic models.
- `payload` owns only resolved-address validation, pointer access, Framework-thread commands, native calls, and hook lifecycle.
- `src-tauri/src/game_bridge.rs` owns the typed desktop API, resource selection, lifecycle preparation, and versioned read batching. It does not contain process or game-memory implementation logic.

The host never accepts or exposes arbitrary memory read, memory write, or function-call commands. The payload accepts only the fixed command IDs defined by shared-memory ABI version 7.

The Tauri API accepts only a process ID, an optional manifest filename, and fixed semantic read resources. DLL and data paths are resolved from the packaged `game-bridge` resource directory, so webview input cannot select an arbitrary DLL. When no manifest is supplied, the adapter selects the newest packaged manifest. Debug builds may override the resource directory with `ORS_GAME_BRIDGE_DIR`.

## Safety gates

The fishing timer has a separate read-only path in `crates/host/src/fishing*.rs`. It opens the selected game with `PROCESS_VM_READ`, validates unique executable signatures against live instruction bytes, and reads fixed animation/condition fields without loading a DLL. Its optional catch reader follows the Framework/UI log pointers, validates bounded vectors, skips existing entries on attachment, and decodes only local gathering item links during gathering and for five seconds after leaving the stance; result handling does not depend on the current animation. Only the item ID and a session-local sequence reach the timer; chat text is neither emitted nor persisted. Layout/read failures disable catch display without disabling the stopwatch.

Layout references are [FFXIVClientStructs Framework](https://github.com/aers/FFXIVClientStructs/blob/main/FFXIVClientStructs/FFXIV/Client/System/Framework/Framework.cs), [UIModule](https://github.com/aers/FFXIVClientStructs/blob/main/FFXIVClientStructs/FFXIV/Client/UI/UIModule.cs), and [LogModule](https://github.com/aers/FFXIVClientStructs/blob/main/FFXIVClientStructs/FFXIV/Component/Log/LogModule.cs). Channel and item-link formats are documented by [Dalamud XivChatType](https://github.com/goatcorp/Dalamud/blob/master/Dalamud/Game/Text/XivChatType.cs) and [ItemPayload](https://github.com/goatcorp/Dalamud/blob/master/Dalamud/Game/Text/SeStringHandling/Payloads/ItemPayload.cs). Game updates may require revalidation. `cargo run --manifest-path game-bridge/Cargo.toml -p game-bridge-host --example fishing_probe -- 120` observes transitions and catch IDs without performing game actions.

The Rust host validates all of the following before loading the payload:

1. Exact game version from `ffxivgame.ver`.
2. Main executable filename.
3. SHA-256 of the executable's raw `.text` section.
4. Exactly one match for every required signature.
5. All resolved addresses remain inside the main module.

## Phone chat bridge

Shared-memory ABI 5 adds an optional bounded chat ring and the fixed `SendChat` semantic command. Chat reading hooks `RaptureLogModule::PrintMessage`; chat sending constructs a native `Utf8String` and calls `UIModule::ProcessChatBoxEntry` only from the Framework tick. The call uses a null context with history saving disabled. Enabling history with a null context makes the game dereference that context as a native string. The public path rejects slash commands and never exposes arbitrary calls, memory writes, or packet construction.

The four chat signatures in `version-manifest.template.json` are optional so existing verified manifests retain all earlier capabilities. A manifest advertises `chat_read` after the read hook installs successfully and advertises `chat_send` only when all required native string and chat addresses are present. Regenerate and verify the manifest against the exact game executable before enabling the phone chat workspace; do not copy unverified addresses into an existing manifest.

Chat text remains in bounded process memory. Debug command diagnostics redact `SendChat` content, and the phone-chat frontend deliberately bypasses the generic Debug IPC response recorder so captured conversations are not written to diagnostic storage.

## Portrait lighting bridge

Shared-memory ABI 7 provides fixed commands for reading and updating lighting in the currently open native portrait editor. The payload resolves `AgentBannerEditor`, requires a loaded `CharaViewPortrait`, and exposes only ambient RGB/brightness plus directional RGB/brightness/vertical angle/horizontal angle. Updates call the game's own lighting setters on the Framework thread, synchronize the matching native slider components, and mark the editor state as changed; they do not expose arbitrary portrait memory writes, add game UI, or save the portrait.

Portrait function signatures and layouts are optional manifest capabilities. Existing manifests continue to support their previous bridge features but report portrait lighting as unavailable. Before enabling the editor for a new game version, collect and uniquely verify every portrait signature and confirm the `AgentBannerEditorState` and `CharaViewPortrait` offsets against that exact executable. The implementation is adapted from the AGPL-3.0-licensed HaselTweaks Portrait Helper and the MIT-licensed FFXIVClientStructs definitions.

Manifest schema 7 defines `textSha256` as the SHA-256 of the executable's raw `.text` section and includes the definitions used by typed reads, logout, title-screen switching, and the server-loaded Cabinet instance. The template manifest is deliberately unusable because its version and hash are placeholders. Create one manifest per verified game version. Never replace a failed signature with a guessed address.

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
  request: {
    resources: ["game_state", "active_character", "selected_character", "inventory"],
  },
});
```

`game_bridge_prepare` reuses a ready connection, recovers a faulted connection, selects controlled resources, and waits for the payload handshake. `game_bridge_read` returns a `schemaVersion`, optional typed resource values, and per-resource failures so adding another semantic read does not require another frontend lifecycle implementation. Tauri failures use a stable `{ code, message }` envelope.

## Inventory diagnostic

Use one read-only Tauri command for equipped items, four player inventory pages, the Armoury Chest, the cached Glamour Dresser, and the cached Armoire:

```ts
const inventory = await invoke("game_bridge_capture_inventory");
```

Local containers are enumerated from `InventoryManager`. The Glamour Dresser uses the persistent `ItemFinderModule` cache; its outfit bits mark missing pieces (1 = absent, 0 = present), despite the upstream `setUnlockBits` name. Resolve outfit rows through `MirageStoreSetItem` before matching individual equipment.

Armoire reads use the signature-resolved `Cabinet` instance only when its state is `Loaded` (2), then decode its bounded byte vector with absolute Cabinet row indexes. The current game uses the ItemFinder armoire bitset for rows starting at 1048, while the ItemFinder state tracks search requests; neither is a complete loaded-armoire indicator. Enter the armoire deposit/withdraw list and wait for it to populate before scanning. No item transfer is necessary. Unloaded storage is not interpreted as empty.

The Cabinet signature and vector layout were checked against game version `2026.09.15.0000.0000`, raw `.text` SHA-256 `8d145203ba3015da0ddbc7e6170b21ad14438499f1b6db98f9e4c1580b98cf96`. The matched ItemFinder update reads the Cabinet instance, checks state 2, and calls the Cabinet membership routine with row index + 1048. The membership routine reads the byte vector at offsets 8/16 and tests one bit per absolute row. Future versions still require manifest verification.

The glamour workspace normalizes these reads into a character-scoped item index. Debug builds store the index as readable JSON in `owned-items.debug.dat` in the working directory and require only the authenticated account profile, not game-login secrets. Old encrypted Debug caches are treated as cache misses and replaced on the next scan. Release builds encrypt the index with AES-256-GCM before local persistence. HKDF-SHA256 derives the encryption key from the authenticated game-login TGT and GUID with a random per-file salt. Logout removes the in-memory key material but preserves ciphertext; clearing all local data removes the cache file.

## Shared-memory transport

The Rust host creates an anonymous Windows file mapping and duplicates only its kernel handle into the target process. There is no global object name, token, socket, Named Pipe, or JSON parser in the command path.

Rust owns command encoding, result decoding, timeouts, monitoring, and all user-facing serialization. The payload checks an atomic request sequence during Framework Tick, performs one fixed semantic command, writes POD output, and publishes the response sequence with release ordering.

The bootstrap records the desktop host process ID. If a debug restart or crash leaves the payload loaded, a later initialization reclaims it only after Windows confirms that the previous host process exited. A live owner still receives initialization code 2, preventing a second desktop instance from taking over its hooks.

Rust also parses the Manifest, hashes the executable, performs unique AOB scans, resolves RVAs, and writes a verified `SharedGameApi` POD. The payload contains no JSON dependency or signature scanner.

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
