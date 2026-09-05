/** Mirrors desktop network diagnostics into the application console. */
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { isTauriRuntime } from "../../shared/utils/runtime";

export function useNetworkLog() {
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    void listen<{ message: string }>("log://log", (event) => {
      const message = event.payload.message;
      try {
        const payload = JSON.parse(message) as Record<string, unknown>;
        const phase = typeof payload.phase === "string" ? payload.phase : "log";
        console.log(`[network][${phase}]`, payload);
      } catch {
        console.log("[network]", message);
      }
    })
      .then((stopListening) => {
        // A late subscription still needs cleanup after an unmount.
        if (disposed) stopListening();
        else unlisten = stopListening;
      })
      .catch(() => {
        // Diagnostics must not prevent authentication or network requests.
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
