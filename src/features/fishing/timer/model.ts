/** Monotonic stopwatch transitions; rendering cadence never changes elapsed time. */
export type Tug = "light" | "medium" | "heavy";
export type TimerState = {
  phase: "idle" | "casting" | "holding";
  startedAt: number;
  elapsed: number;
  tug: Tug | null;
};
export type TimerAction =
  | { type: "cast"; at: number }
  | { type: "stop"; at: number; tug?: Tug }
  | { type: "reset" };
export const idleTimer: TimerState = {
  phase: "idle",
  startedAt: 0,
  elapsed: 0,
  tug: null,
};
export function elapsedTime(state: TimerState, now: number) {
  return state.phase === "casting"
    ? Math.max(0, now - state.startedAt)
    : state.elapsed;
}
export function timerReducer(
  state: TimerState,
  action: TimerAction,
): TimerState {
  if (action.type === "reset") return idleTimer;
  if (action.type === "cast")
    return { phase: "casting", startedAt: action.at, elapsed: 0, tug: null };
  if (state.phase !== "casting") return state;
  return {
    ...state,
    phase: "holding",
    elapsed: elapsedTime(state, action.at),
    tug: action.tug ?? null,
  };
}
/** The reference timer expands the first ten seconds threefold on a 70-unit scale. */
export function timerProgress(milliseconds: number, shortCast: boolean) {
  const seconds = Math.max(0, milliseconds / 1000);
  return Math.min(
    1,
    shortCast ? (seconds < 10 ? seconds * 3 : seconds + 20) / 70 : seconds / 50,
  );
}
