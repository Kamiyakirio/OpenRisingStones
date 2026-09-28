/** Reads character catch status through the IPC adapter's private-data exemption. */
import { invoke } from "../../shared/diagnostics/invoke";
import type { GameFishingLog } from "./gameLog";

export function captureFishingLog() {
  return invoke<GameFishingLog>("capture_fishing_log");
}
