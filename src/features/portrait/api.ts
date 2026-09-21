/** Typed Tauri calls for reading and changing the native portrait editor. */
import { invoke } from "../../shared/diagnostics/invoke";
import type { PortraitLighting, PortraitLightingUpdate } from "./types";

export function capturePortraitLighting() {
  return invoke<PortraitLighting>("game_bridge_capture_portrait_lighting");
}

export function updatePortraitLighting(update: PortraitLightingUpdate) {
  return invoke<PortraitLighting>("game_bridge_update_portrait_lighting", {
    update,
  });
}
