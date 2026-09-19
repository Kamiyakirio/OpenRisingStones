/** Debug-only bridge that sends structured operation records to the native session store. */
import { invoke as nativeInvoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../utils/runtime.ts";

export type LogRecord = {
  kind: "invoke" | "network" | "bridge";
  source: "webview" | "python" | "game-bridge";
  name: string;
  outcome: "success" | "error";
  durationMs?: number;
  request?: unknown;
  response?: unknown;
  error?: unknown;
};

export function canCapture() {
  return (
    typeof __DEBUG_BUILD__ !== "undefined" &&
    __DEBUG_BUILD__ &&
    isTauriRuntime()
  );
}

/** Capture failure never changes the result of the operation being observed. */
export async function captureRecord(entry: LogRecord) {
  if (!canCapture()) return;
  try {
    await nativeInvoke("debug_log_record", { entry });
  } catch {
    // The inspected operation remains authoritative when diagnostics are unavailable.
  }
}

/** Copy serializable values before an asynchronous operation can mutate them. */
export function snapshotValue(value: unknown): unknown {
  const seen = new WeakSet<object>();
  const copy = (current: unknown): unknown => {
    if (current === undefined) return { type: "undefined" };
    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "boolean"
    ) {
      return current;
    }
    if (typeof current === "number") {
      return Number.isFinite(current) ? current : String(current);
    }
    if (typeof current === "bigint") return current.toString();
    if (typeof current !== "object") return String(current);
    if (current instanceof ArrayBuffer)
      return encodeBinary(new Uint8Array(current));
    if (ArrayBuffer.isView(current)) {
      return encodeBinary(
        new Uint8Array(current.buffer, current.byteOffset, current.byteLength),
      );
    }
    if (current instanceof Error) {
      return {
        name: current.name,
        message: current.message,
        stack: current.stack,
      };
    }
    if (current instanceof Date) return current.toISOString();
    if (seen.has(current)) return { type: "circular-reference" };
    seen.add(current);
    if (Array.isArray(current)) return current.map(copy);
    return Object.fromEntries(
      Object.entries(current).map(([key, item]) => [key, copy(item)]),
    );
  };
  try {
    return copy(value);
  } catch (reason) {
    return { type: "capture-error", message: String(reason) };
  }
}

export function encodeBinary(bytes: Uint8Array, contentType?: string) {
  let encoded = "";
  for (let offset = 0; offset < bytes.length; offset += 0x4000) {
    encoded += String.fromCharCode(...bytes.subarray(offset, offset + 0x4000));
  }
  return {
    encoding: "base64",
    value: btoa(encoded),
    byteLength: bytes.length,
    contentType: contentType || "application/octet-stream",
  };
}
