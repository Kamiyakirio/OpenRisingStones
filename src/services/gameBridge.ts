/** Single typed transport boundary for all game bridge lifecycle and read calls. */
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  GameBridgeApiError,
  GameBridgeStatus,
  GameReadResource,
  GameReadResponse,
} from "../models/gameBridge";
import { isTauriRuntime } from "./runtime";

const STATUS_EVENT = "game-bridge://status";
let pendingPrepare: Promise<GameBridgeStatus> | null = null;

function requireDesktopRuntime() {
  if (!isTauriRuntime()) {
    throw {
      code: "desktop_runtime_required",
      message: "The game bridge requires the desktop runtime.",
    } satisfies GameBridgeApiError;
  }
}

/** Connects once, auto-selecting the newest packaged manifest. */
export function prepareGameBridge() {
  requireDesktopRuntime();
  if (pendingPrepare) return pendingPrepare;
  pendingPrepare = invoke<GameBridgeStatus>("game_bridge_prepare", {
    request: { processId: null, manifestFile: null },
  }).finally(() => {
    pendingPrepare = null;
  });
  return pendingPrepare;
}

/** Reads one or more fixed semantic resources in a single versioned response. */
export async function readGameBridge(resources: GameReadResource[]) {
  requireDesktopRuntime();
  const response = await invoke<GameReadResponse>("game_bridge_read", {
    request: { resources },
  });
  if (response.schemaVersion !== 1) {
    throw {
      code: "read_schema_mismatch",
      message: `Unsupported game read schema: ${response.schemaVersion}`,
    } satisfies GameBridgeApiError;
  }
  return response;
}

export function getGameBridgeStatus() {
  requireDesktopRuntime();
  return invoke<GameBridgeStatus>("game_bridge_status");
}

export async function disconnectGameBridge() {
  requireDesktopRuntime();
  pendingPrepare = null;
  return invoke<GameBridgeStatus>("game_bridge_disconnect");
}

/** Relaunches the desktop process through the Windows UAC prompt. */
export function restartAsAdministrator() {
  requireDesktopRuntime();
  return invoke<void>("restart_as_administrator");
}

export async function observeGameBridgeStatus(
  observer: (status: GameBridgeStatus) => void,
): Promise<UnlistenFn> {
  requireDesktopRuntime();
  return listen<GameBridgeStatus>(STATUS_EVENT, (event) =>
    observer(event.payload),
  );
}

/** Normalizes both structured Tauri rejections and legacy string errors. */
export function normalizeGameBridgeError(reason: unknown): GameBridgeApiError {
  if (isErrorEnvelope(reason)) return reason;
  if (reason instanceof Error) {
    return { code: "frontend_error", message: reason.message };
  }
  if (typeof reason === "string") {
    try {
      const parsed: unknown = JSON.parse(reason);
      if (isErrorEnvelope(parsed)) return parsed;
    } catch {
      // Plain legacy errors are preserved below.
    }
    return { code: "bridge_error", message: reason };
  }
  return { code: "bridge_error", message: "The game bridge request failed." };
}

function isErrorEnvelope(value: unknown): value is GameBridgeApiError {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.code === "string" && typeof record.message === "string";
}
