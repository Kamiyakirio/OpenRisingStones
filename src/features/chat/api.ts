/** Typed desktop commands for the LAN-only phone chat service. */
// eslint-disable-next-line no-restricted-imports -- Chat payloads must not enter persistent diagnostic logs.
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../shared/utils/runtime";
import type { ChatBridgeError, ChatBridgeStatus } from "./types";

function requireDesktopRuntime() {
  if (!isTauriRuntime()) {
    throw {
      code: "desktop_runtime_required",
      message: "The phone chat bridge requires the desktop runtime.",
    } satisfies ChatBridgeError;
  }
}

// Chat text is intentionally kept outside the Debug IPC capture pipeline.

export function getChatBridgeStatus() {
  requireDesktopRuntime();
  return invoke<ChatBridgeStatus>("chat_bridge_status");
}

export function startChatBridge() {
  requireDesktopRuntime();
  return invoke<ChatBridgeStatus>("chat_bridge_start");
}

export function stopChatBridge() {
  requireDesktopRuntime();
  return invoke<ChatBridgeStatus>("chat_bridge_stop");
}

export function normalizeChatBridgeError(reason: unknown): ChatBridgeError {
  if (isErrorEnvelope(reason)) return reason;
  if (reason instanceof Error) {
    return { code: "frontend_error", message: reason.message };
  }
  if (typeof reason === "string") {
    try {
      const parsed: unknown = JSON.parse(reason);
      if (isErrorEnvelope(parsed)) return parsed;
    } catch {
      // Preserve legacy string errors below.
    }
    return { code: "chat_bridge_error", message: reason };
  }
  return {
    code: "chat_bridge_error",
    message: "The phone chat bridge request failed.",
  };
}

function isErrorEnvelope(value: unknown): value is ChatBridgeError {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.code === "string" && typeof record.message === "string";
}
