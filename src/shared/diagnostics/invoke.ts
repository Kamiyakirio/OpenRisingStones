/** Shared IPC entrypoint: regular callers never need to invoke a logging API. */
import { invoke as nativeInvoke } from "@tauri-apps/api/core";
import { captureRecord, snapshotValue } from "./capture";

export async function invoke<T>(
  command: string,
  args?: Parameters<typeof nativeInvoke>[1],
  options?: Parameters<typeof nativeInvoke>[2],
): Promise<T> {
  if (typeof __DEBUG_BUILD__ === "undefined" || !__DEBUG_BUILD__) {
    return nativeInvoke<T>(command, args, options);
  }
  if (command.startsWith("debug_log_") || command === "clear_all_local_data") {
    return nativeInvoke<T>(command, args, options);
  }

  const request = snapshotValue(args);
  const started = performance.now();
  const kind = command.startsWith("game_bridge_") ? "bridge" : "invoke";
  try {
    const result = await nativeInvoke<T>(command, args, options);
    void captureRecord({
      kind,
      source: "webview",
      name: command,
      outcome: "success",
      durationMs: performance.now() - started,
      request,
      response: snapshotValue(result),
    });
    return result;
  } catch (error) {
    void captureRecord({
      kind,
      source: "webview",
      name: command,
      outcome: "error",
      durationMs: performance.now() - started,
      request,
      error: snapshotValue(error),
    });
    throw error;
  }
}
