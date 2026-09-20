/** Frontend contract for the local phone chat service. */
export type ChatBridgePhase = "stopped" | "starting" | "running" | "faulted";

export type ChatMessage = {
  sequence: number;
  timestamp: number;
  logKind: number;
  sourceKind: number;
  targetKind: number;
  sender: string;
  message: string;
};

export type ChatBridgeError = {
  code: string;
  message: string;
};

export type ChatBridgeStatus = {
  phase: ChatBridgePhase;
  url: string | null;
  qrDataUrl: string | null;
  canSend: boolean;
  paired: boolean;
  messageCount: number;
  droppedCount: number;
  recentMessages: ChatMessage[];
  error: ChatBridgeError | null;
};
