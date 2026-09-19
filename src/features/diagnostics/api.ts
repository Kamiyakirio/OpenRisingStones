/** Debug-only, read-only queries and management actions for the current session. */
import { listen } from "@tauri-apps/api/event";
import { invoke } from "../../shared/diagnostics/invoke";

export type LogKind = "network" | "invoke" | "bridge";
export type LogSummary = {
  id: number;
  timestampMs: number;
  fingerprint: string;
  kind: LogKind;
  source: string;
  name: string;
  outcome: "success" | "error";
  durationMs?: number;
  method?: string;
  url?: string;
  statusCode?: number;
};

export type LogEntry = LogSummary & {
  request: unknown;
  response: unknown;
  error: unknown;
};

export function listLogs(options: {
  beforeId?: number;
  search?: string;
  kind?: LogKind;
}) {
  return invoke<LogSummary[]>("debug_log_list", { ...options, limit: 100 });
}

export function getLog(id: number) {
  return invoke<LogEntry>("debug_log_get", { id });
}

export function clearLogs() {
  return invoke<void>("debug_log_clear");
}

export function exportLogs() {
  return invoke<string>("debug_log_export");
}

export function saveAttachment(data: string, contentType: string) {
  return invoke<string>("debug_log_save_attachment", { data, contentType });
}

export function getCaptureFailures() {
  return invoke<number>("debug_log_failure_count");
}

export function listenForLogs(callback: (entry: LogSummary) => void) {
  return listen<LogSummary>("debug-log://entry", (event) =>
    callback(event.payload),
  );
}

export function listenForCaptureFailures(callback: (count: number) => void) {
  return listen<number>("debug-log://failure", (event) =>
    callback(event.payload),
  );
}
