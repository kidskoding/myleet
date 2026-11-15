// The workspace clock: starts on the first keystroke, pauses, restarts, and adds interview
// hint penalties. Pure so it can be tested against a fake `now`.

export type TimerPhase = "idle" | "calm" | "near" | "over" | "paused";

export interface TimerState {
  /** Wall time the clock started; null until the first keystroke. */
  startedAt: number | null;
  pausedAt: number | null;
  /** Total time spent paused, excluded from elapsed. */
  pausedMs: number;
  /** Interview hint penalties, added to elapsed. */
  penaltyMs: number;
  /** Frozen elapsed once the attempt is finished (passed or gave up). */
  stoppedMs: number | null;
}

/** "Near" starts at 80% of the target. */
export const NEAR_FRACTION = 0.8;

export const idleTimer = (): TimerState => ({
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  penaltyMs: 0,
  stoppedMs: null,
});

export function startTimer(s: TimerState, now: number): TimerState {
  return s.startedAt === null ? { ...s, startedAt: now } : s;
}

export function elapsedMs(s: TimerState, now: number): number {
  if (s.stoppedMs !== null) return s.stoppedMs;
  if (s.startedAt === null) return s.penaltyMs;
  const end = s.pausedAt ?? now;
  return Math.max(0, end - s.startedAt - s.pausedMs) + s.penaltyMs;
}

export function pauseTimer(s: TimerState, now: number): TimerState {
  if (s.startedAt === null || s.pausedAt !== null || s.stoppedMs !== null) return s;
  return { ...s, pausedAt: now };
}

export function resumeTimer(s: TimerState, now: number): TimerState {
  if (s.pausedAt === null) return s;
  return { ...s, pausedAt: null, pausedMs: s.pausedMs + (now - s.pausedAt) };
}

export function stopTimer(s: TimerState, now: number): TimerState {
  return s.stoppedMs !== null ? s : { ...s, stoppedMs: elapsedMs(s, now), pausedAt: null };
}

export function addPenalty(s: TimerState, ms: number): TimerState {
  return { ...s, penaltyMs: s.penaltyMs + ms };
}

/** Restart: the clock goes back to zero and waits for the next keystroke. */
export const restartTimer = (): TimerState => idleTimer();

export function timerPhase(s: TimerState, now: number, targetMs: number): TimerPhase {
  if (s.pausedAt !== null) return "paused";
  if (s.startedAt === null && s.penaltyMs === 0) return "idle";
  const e = elapsedMs(s, now);
  if (e > targetMs) return "over";
  if (e >= targetMs * NEAR_FRACTION) return "near";
  return "calm";
}

/** `14:32`, or `1:02:03` past an hour. */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** The label beside the clock: "of 25:00", "4 min left", "2:40 over", "Paused". */
export function timerLabel(s: TimerState, now: number, targetMs: number): string {
  const phase = timerPhase(s, now, targetMs);
  const e = elapsedMs(s, now);
  if (phase === "paused") return "Paused";
  if (phase === "over") return `${formatClock(e - targetMs)} over`;
  if (phase === "near") {
    const left = Math.ceil((targetMs - e) / 60_000);
    return left <= 1 ? "1 min left" : `${left} min left`;
  }
  return `of ${formatClock(targetMs)}`;
}

/** Spoken label for `aria-label` on the timer. */
export function timerSpoken(ms: number, targetMs: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `Elapsed ${m} minute${m === 1 ? "" : "s"} ${s} second${s === 1 ? "" : "s"} of a ${Math.round(targetMs / 60_000)} minute target`;
}
