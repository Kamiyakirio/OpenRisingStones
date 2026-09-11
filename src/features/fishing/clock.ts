/** One visibility-aware clock; subscribers choose display precision without extra timers. */
import { useSyncExternalStore } from "react";

let timestamp = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function tick() {
  if (document.visibilityState === "hidden") return;
  timestamp = Date.now();
  listeners.forEach((notify) => notify());
}
function subscribe(notify: () => void) {
  listeners.add(notify);
  if (listeners.size === 1) {
    timer = setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    tick();
  }
  return () => {
    listeners.delete(notify);
    if (!listeners.size) {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    }
  };
}
export function useFishingClock(precision = 1000) {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(timestamp / precision) * precision,
  );
}
