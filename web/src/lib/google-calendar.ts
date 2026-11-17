// Two-way Google Calendar sync, the client half. The Worker writes sessions into a
// "myleet" calendar and reports what changed there; this turns those changes into the
// same moves and skips a drag on Plan makes, and keeps busy time for the planner.
import { addMove, isoDay, minuteOf, moveFor, skipBudget } from "./schedule";
import type { BusyBlock, GoogleState, Plan, PlanDay, PlanMove, PlanSession } from "./types";

/** sessionStorage: when this tab last read Google, and whether it was connected. */
export const GCAL_KEY = "myleet:gcal";
/** sessionStorage: the sessions last sent, so an unchanged plan sends nothing. */
export const GCAL_SENT = "myleet:gcal-sent";

/** Forgets what this tab knows, after connecting or disconnecting. */
export function forgetGoogle(): void {
  try {
    sessionStorage.removeItem(GCAL_KEY);
    sessionStorage.removeItem(GCAL_SENT);
  } catch {
    // Nothing kept, nothing to forget.
  }
}

/** Sessions go out, and busy time comes back, this far ahead. Matches the Worker. */
export const HORIZON_MS = 28 * 86_400_000;

/** The sessions Google should hold: not started yet, within the horizon. */
export function upcoming(plan: Plan, now: number): PlanSession[] {
  return plan.days.flatMap((d) => d.sessions).filter((s) => s.start_ms > now && s.start_ms < now + HORIZON_MS);
}

export interface GooglePatch {
  moves: PlanMove[];
  dayMinutes: { date: string; minutes: number }[];
  busy: BusyBlock[];
}

function at(plan: Plan, start: number): [PlanDay, PlanSession] | null {
  for (const d of plan.days) for (const s of d.sessions) if (s.start_ms === start) return [d, s];
  return null;
}

/**
 * The plan settings after what changed in Google, or null when nothing did. A moved event
 * is a drag to its new time, a deleted one is a skip; a session the plan no longer has at
 * that time is left alone, and the next sync puts Google back in step with the plan.
 */
export function mergeGoogle(state: GoogleState, plan: Plan, cur: { moves: PlanMove[]; dayMinutes: { date: string; minutes: number }[]; busy: BusyBlock[] }): GooglePatch | null {
  let { moves, dayMinutes } = cur;
  for (const m of state.moves ?? []) {
    const hit = at(plan, m.from_start_ms);
    if (hit) moves = addMove(moves, moveFor(hit[1], hit[0].date, isoDay(new Date(m.to_start_ms)), minuteOf(m.to_start_ms)), plan.start);
  }
  for (const k of state.skips ?? []) {
    const hit = at(plan, k.start_ms);
    if (hit) dayMinutes = skipBudget(dayMinutes, hit[0], hit[1], plan.start);
  }
  // Unreadable busy time blocks writes to Google, but the plan keeps the last good busy time instead of going blank.
  const busy = state.busy_complete === false ? cur.busy : (state.busy ?? cur.busy);
  if (moves === cur.moves && dayMinutes === cur.dayMinutes && JSON.stringify(busy) === JSON.stringify(cur.busy)) return null;
  return { moves, dayMinutes, busy };
}
