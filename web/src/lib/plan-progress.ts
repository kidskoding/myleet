// How the learner is keeping to the plan. The planner only looks forward, so each day's
// planned load is written to a small ledger the first time a plan is built that day; past
// days are then compared with what was actually practised (from the event log).
import { attempts, parseEvents, type Attempt } from "./attempts";
import { addDays } from "./streak";
import { isoDay, sittings } from "./schedule";
import type { Plan } from "./types";

export type DayStatus = "done" | "partial" | "missed";

export interface PastDay {
  date: string;
  status: DayStatus;
  planned: number;
  practised: number;
  sessions: number;
  kept: number;
}

export interface Standing {
  /** Planned sessions kept, out of the last `of` (at most 10). */
  kept: number;
  of: number;
  /** Days in a row with practice, ending today or yesterday. */
  run: number;
  onPace: boolean;
  /** Days in the last week that slipped (missed, or under half done), oldest first. */
  slipped: PastDay[];
  days: PastDay[];
}

const LEDGER_KEY = "myleet:plan-ledger";
const KEEP_DAYS = 120;
/** A day counts as done at 80% of its planned minutes. */
const DONE_SHARE = 0.8;
const RECENT = 10;

/** `at` is when the record was written (epoch ms), so devices can keep the newest. */
export type Ledger = Record<string, { minutes: number; sessions: number; at?: number }>;

/** Union of two ledgers: the newest record per day wins, the larger load on a tie. */
export function mergeLedger(a: Ledger, b: Ledger): Ledger {
  const out: Ledger = { ...a };
  for (const [day, r] of Object.entries(b)) {
    const cur = out[day];
    const newer = !cur || (r.at ?? 0) > (cur.at ?? 0) || ((r.at ?? 0) === (cur.at ?? 0) && r.minutes > cur.minutes);
    if (newer) out[day] = r;
  }
  return out;
}

export function writeLedger(led: Ledger): void {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(led));
  } catch {
    // Without storage the record starts again next visit.
  }
}

export function readLedger(): Ledger {
  try {
    return JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "{}") as Ledger;
  } catch {
    return {};
  }
}

/** Notes today's planned load. The first full plan of the day wins, so finishing work never shrinks the record. */
export function recordPlanned(plan: Plan): void {
  const d = plan.days[0];
  if (!d) return;
  const led = readLedger();
  const cur = led[d.date];
  if (cur && cur.minutes >= d.minutes) return;
  led[d.date] = { minutes: d.minutes, sessions: d.sessions.length, at: Date.now() };
  const cutoff = addDays(d.date, -KEEP_DAYS);
  for (const k of Object.keys(led)) if (k < cutoff) delete led[k];
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(led));
  } catch {
    // Without storage the record starts again next visit.
  }
}

function runOf(done: Attempt[], today: string): number {
  const days = new Set(done.map((a) => isoDay(new Date(a.end ?? a.start))));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

/** Past planned days with their outcome, and the on-track summary. Pure apart from the ledger read. */
export function standing(plan: Plan, events: string, now: Date = new Date(), ledger: Ledger = readLedger()): Standing {
  const today = isoDay(now);
  const done = attempts(parseEvents(events)).filter((a) => a.end !== null && (a.passed || a.gaveUp));
  const byDay = new Map<string, Attempt[]>();
  for (const a of done) {
    const k = isoDay(new Date(a.end ?? a.start));
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  const days: PastDay[] = Object.entries(ledger)
    .filter(([date, p]) => date < today && p.minutes > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, p]) => {
      const sits = sittings(byDay.get(date) ?? []);
      const practised = Math.round(sits.reduce((m, s) => m + Math.max(10, (s.end - s.start) / 60_000), 0));
      const status: DayStatus = practised >= p.minutes * DONE_SHARE ? "done" : practised > 0 ? "partial" : "missed";
      return { date, status, planned: p.minutes, practised, sessions: p.sessions, kept: Math.min(p.sessions, sits.length) };
    });
  let kept = 0;
  let of = 0;
  for (const d of [...days].reverse()) {
    if (of >= RECENT) break;
    const take = Math.min(d.sessions, RECENT - of);
    of += take;
    kept += Math.min(d.kept, take);
  }
  const weekAgo = addDays(today, -7);
  const slipped = days.filter((d) => d.date >= weekAgo && (d.status === "missed" || (d.status === "partial" && d.practised < d.planned / 2)));
  return { kept, of, run: runOf(done, today), onPace: plan.summary.on_track, slipped, days };
}

/** Minutes the slipped days left undone, for the catch-up note. */
export const missedMinutes = (s: Standing): number => s.slipped.reduce((m, d) => m + Math.max(0, d.planned - d.practised), 0);
