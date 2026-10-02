/** Typed IPC boundary for local Mentor records, monitoring, and legacy migration. */
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "../../shared/diagnostics/invoke";

export type MentorResult =
  "completed" | "exited" | "needs_review" | "legacy_unknown";

export type MentorRecord = {
  id: string;
  characterId: string;
  characterName: string;
  dutyId: number | null;
  dutyName: string;
  jobId: number | null;
  jobName: string | null;
  startedAtMs: number;
  endedAtMs: number | null;
  result: MentorResult;
  source: "game" | "manual" | "legacy_site";
  note: string;
  legacyKey: string | null;
};

export type MonitorStatus = {
  running: boolean;
  phase: "idle" | "waiting" | "queued" | "in_duty" | "disconnected" | "error";
  activeRecordId: string | null;
  dutyId: number | null;
  error: string | null;
};

export type LegacyPreview = {
  token: string;
  fetchedCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  earliestAtMs: number | null;
  latestAtMs: number | null;
  examples: MentorRecord[];
};

export function listMentorRecords() {
  return invoke<MentorRecord[]>("mentor_list_records");
}

export function getMentorMonitorStatus() {
  return invoke<MonitorStatus>("mentor_monitor_status");
}

export function startMentorMonitor() {
  return invoke<MonitorStatus>("mentor_start_monitor");
}

export function stopMentorMonitor() {
  return invoke<MonitorStatus>("mentor_stop_monitor");
}

export function addManualRecord(request: {
  characterId: string;
  characterName: string;
  dutyName: string;
  jobId: number | null;
  jobName: string | null;
  startedAtMs: number;
  result: MentorResult;
  note: string;
}) {
  return invoke<MentorRecord>("mentor_add_manual_record", { request });
}

export function correctRecord(id: string, result: MentorResult, note: string) {
  return invoke<MentorRecord>("mentor_correct_record", {
    correction: { id, result, note },
  });
}

export function deleteRecord(id: string) {
  return invoke<void>("mentor_delete_record", { id });
}

export function previewLegacy(username: string, password: string) {
  return invoke<LegacyPreview>("mentor_preview_legacy", { username, password });
}

export function importLegacy(
  token: string,
  characterName: string,
  treatAsCompleted: boolean,
) {
  return invoke<{ importedCount: number; skippedCount: number }>(
    "mentor_import_legacy",
    { token, characterId: "", characterName, treatAsCompleted },
  );
}

export async function observeMentor(
  onStatus: (status: MonitorStatus) => void,
  onRecords: () => void,
): Promise<UnlistenFn> {
  const unlistenStatus = await listen<MonitorStatus>(
    "mentor://status",
    (event) => onStatus(event.payload),
  );
  let unlistenRecords: UnlistenFn;
  try {
    unlistenRecords = await listen("mentor://records", onRecords);
  } catch (error) {
    unlistenStatus();
    throw error;
  }
  return () => {
    unlistenStatus();
    unlistenRecords();
  };
}
