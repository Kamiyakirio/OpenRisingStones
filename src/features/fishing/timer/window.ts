/** Opens an isolated entrypoint without mounting the main application or its polling hooks. */
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../../shared/utils/runtime";
export async function openFishingTimer() {
  if (isTauriRuntime()) return invoke<void>("open_fishing_timer");
  const url = new URL(import.meta.env.BASE_URL, location.href);
  url.searchParams.set("window", "fishing-timer");
  const popup = window.open(
    url,
    "ors-fishing-timer",
    "popup,width=420,height=340",
  );
  if (!popup) throw new Error("The browser blocked the timer window.");
  popup.focus();
}
export async function controlTimer(action: "pin" | "unpin" | "lock" | "close") {
  if (isTauriRuntime())
    return invoke<void>("control_fishing_timer", { action });
  if (action === "close") window.close();
}
