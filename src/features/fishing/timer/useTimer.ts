/** Joins native monotonic telemetry with a manual stopwatch and stale-event cleanup. */
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useReducer, useState } from "react";
import { isTauriRuntime } from "../../../shared/utils/runtime";
import { idleTimer, timerReducer, type TimerState, type Tug } from "./model";

type MonitorEvent = {
  sessionId: string;
  connection: "ready" | "error";
  sample: {
    phase: TimerState["phase"];
    elapsedMs: number;
    tug: Tug | null;
    processId: number;
    catchItemId: number | null;
    catchSequence: number;
    catchAvailable: boolean;
  } | null;
  errorCode: string | null;
  errorMessage: string | null;
};
export function useTimer() {
  const desktop = isTauriRuntime();
  const [automatic, setAutomatic] = useState(desktop);
  const [manual, dispatch] = useReducer(timerReducer, idleTimer);
  const [native, setNative] = useState(idleTimer);
  const [connection, setConnection] = useState("connecting");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [processId, setProcessId] = useState<number | null>(null);
  const [connectedPid, setConnectedPid] = useState<number | null>(null);
  const [caught, setCaught] = useState<{
    itemId: number;
    sequence: number;
  } | null>(null);
  const [catchAvailable, setCatchAvailable] = useState(true);
  useEffect(() => {
    if (!automatic || !desktop) return;
    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    let started = false;
    const sessionId = crypto.randomUUID();
    async function connect() {
      try {
        unlisten = await listen<MonitorEvent>(
          "fishing-timer://sample",
          (event) => {
            if (disposed || event.payload.sessionId !== sessionId) return;
            const { sample, connection, errorCode } = event.payload;
            setConnection(connection);
            setErrorCode(errorCode);
            setConnectedPid(sample?.processId ?? null);
            setCatchAvailable(sample?.catchAvailable ?? true);
            setCaught((previous) => {
              if (!sample?.catchItemId) return null;
              if (
                previous?.sequence === sample.catchSequence &&
                previous.itemId === sample.catchItemId
              )
                return previous;
              return {
                itemId: sample.catchItemId,
                sequence: sample.catchSequence,
              };
            });
            setNative(
              sample
                ? {
                    phase: sample.phase,
                    elapsed: sample.elapsedMs,
                    startedAt: performance.now() - sample.elapsedMs,
                    tug: sample.tug,
                  }
                : idleTimer,
            );
          },
        );
        if (disposed) {
          unlisten();
          return;
        }
        started = true;
        await invoke("start_fishing_monitor", { processId, sessionId });
      } catch {
        if (!disposed) {
          setConnection("error");
          setErrorCode("read_failed");
          setNative(idleTimer);
        }
      }
    }
    void connect();
    return () => {
      disposed = true;
      unlisten?.();
      if (started) void invoke("stop_fishing_monitor").catch(() => undefined);
    };
  }, [automatic, desktop, attempt, processId]);
  // Waiting for a game is recoverable without repeatedly pressing Reconnect.
  useEffect(() => {
    if (
      !automatic ||
      !["process_not_found", "game_closed"].includes(errorCode ?? "")
    )
      return;
    const retry = setTimeout(() => {
      setErrorCode(null);
      setConnection("connecting");
      setAttempt((value) => value + 1);
    }, 3000);
    return () => clearTimeout(retry);
  }, [automatic, errorCode, attempt]);
  const state = automatic ? native : manual;
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (state.phase !== "casting") return;
    const timer = setInterval(() => setNow(performance.now()), 50);
    return () => clearInterval(timer);
  }, [state.phase]);
  function changeMode(value: boolean) {
    if (value === automatic) return;
    dispatch({ type: "reset" });
    setNative(idleTimer);
    setCaught(null);
    setErrorCode(null);
    setConnection("connecting");
    setAutomatic(value);
  }
  function reconnect(pid: number | null = processId) {
    setErrorCode(null);
    setConnection("connecting");
    setNative(idleTimer);
    setCaught(null);
    setProcessId(pid);
    setAttempt((n) => n + 1);
  }
  return {
    desktop,
    automatic,
    changeMode,
    state,
    now,
    dispatch,
    connection,
    errorCode,
    reconnect,
    connectedPid,
    caught,
    catchAvailable,
  };
}
