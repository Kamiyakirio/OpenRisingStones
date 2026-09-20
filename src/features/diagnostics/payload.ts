/** Debug-only transport for explicitly unloading the injected game payload. */
import { invoke } from "../../shared/diagnostics/invoke";
import type { GameBridgeStatus } from "../../shared/game-bridge/types";

export type DebugPayloadUnloadResult = {
  unloaded: boolean;
  processId: number;
  status: GameBridgeStatus;
};

export function unloadDebugPayload() {
  return invoke<DebugPayloadUnloadResult>("game_bridge_debug_unload_payload");
}
