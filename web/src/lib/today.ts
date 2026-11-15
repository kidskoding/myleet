// Pure pieces of the Today screen: copy, tags, the time budget and the week strip.
import type { TagKind } from "./ui/bits";
import { RUNG_DAYS } from "./ui/ladder";
import { addDays, localDay } from "./streak";
import type { State, TodayEntry } from "./types";

export function greeting(now: Date, name?: string | null): string {
  const h = now.getHours();
  const who = name ? `, ${name}` : "";
  if (h >= 23 || h < 4) return `Welcome back${who}!`;
  if (h < 12) return `Good morning${who}!`;
  if (h < 17) return `Good afternoon${who}!`;
  return `Good evening${who}!`;
}

export function dueLabel(overdueDays: number): string {
  if (overdueDays <= 0) return "due today";
  if (overdueDays === 1) return "due yesterday";
  return `due ${overdueDays} days ago`;
}

const REASONS: Record<string, [TagKind, string]> = {
  "weak spot": ["weak", "Weak spot"],
  "in progress": ["progress", "In progress"],
  "new topic": ["new", "New topic"],
  "keep sharp": ["sharp", "Keep sharp"],
  "cold redo": ["sharp", "Cold redo"],
  "interview mix": ["sharp", "Interview mix"],
};

/** Every row says which rule put it on the list. */
export function reasonTag(e: Pick<TodayEntry, "kind" | "reason" | "overdue_days">, long = false): [TagKind, string] {
  if (e.kind === "review") return ["due", long ? `Review, ${dueLabel(e.overdue_days)}` : "Review"];
  return REASONS[e.reason ?? ""] ?? (e.kind === "practice" ? ["sharp", "Keep sharp"] : ["new", "New"]);
}

/** Why this one, and what a clean pass does. `rung` is the core's -1..4. */
export function whyLine(e: TodayEntry, targetMins: number): string {
  const rule = `A clean pass, with no hints and under ${targetMins} minutes,`;
  const r = e.state.rung;
  if (e.kind === "practice") return `Extra practice that does not change your review schedule`;
  if (r < 0) return `${rule} starts its review ladder at 1 day`;
  const here = RUNG_DAYS[r] ?? 1;
  const next = RUNG_DAYS[Math.min(r + 1, RUNG_DAYS.length - 1)] ?? 30;
  if (r >= RUNG_DAYS.length - 1) return `You're on the top rung. ${rule} keeps it there for another 30 days`;
  return `You're on the ${here}-day rung. ${rule} moves it to ${next} days`;
}

export type Budget = "30" | "60" | "all" | "120";

export const BUDGETS: { id: Budget; label: string; secs: number | null }[] = [
  { id: "30", label: "30 min", secs: 30 * 60 },
  { id: "60", label: "1 h", secs: 60 * 60 },
  { id: "all", label: "All due", secs: null },
  { id: "120", label: "2 h+", secs: null },
];

/** Extra new problems the "2 h+" budget asks the scheduler for. */
export const EXTRA_NEW_FOR_LONG_DAY = 2;

/**
 * Trims a queue to a time budget: new problems go first (from the end), then the least
 * overdue reviews. Always keeps one problem so the day has a next step.
 */
export function fitBudget<T extends Pick<TodayEntry, "kind">>(entries: T[], budgetSecs: number | null, secsOf: (e: T) => number): T[] {
  if (budgetSecs === null) return entries;
  const keep = [...entries];
  let total = keep.reduce((n, e) => n + secsOf(e), 0);
  const dropFrom = (pred: (e: T) => boolean) => {
    for (let i = keep.length - 1; i >= 0 && total > budgetSecs && keep.length > 1; i--) {
      const e = keep[i] as T;
      if (!pred(e)) continue;
      total -= secsOf(e);
      keep.splice(i, 1);
    }
  };
  dropFrom((e) => e.kind !== "review");
  dropFrom(() => true);
  return keep;
}

export interface WeekDay {
  day: string;
  count: number;
  today: boolean;
}

/** Reviews due on each of the next 7 local days; today's count includes overdue ones. */
export function weekStrip(states: Record<string, State>, now: Date = new Date()): WeekDay[] {
  const today = localDay(now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const counts = new Map(days.map((d) => [d, 0]));
  for (const s of Object.values(states)) {
    if (s.status === "unseen" || s.rung < 0 || s.due_ms === null) continue;
    const d = localDay(new Date(s.due_ms));
    const key = d < today ? today : d;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return days.map((d) => ({ day: d, count: counts.get(d) ?? 0, today: d === today }));
}

const BUDGET_KEY = "myleet:budget";

/** Today's time budget is per day: tomorrow starts back at "All due". */
export function readBudget(now: Date = new Date()): Budget {
  try {
    const v = JSON.parse(localStorage.getItem(BUDGET_KEY) ?? "null") as { day: string; b: Budget } | null;
    if (v && v.day === localDay(now)) return v.b;
  } catch {
    // Default below.
  }
  return "all";
}

export function writeBudget(b: Budget, now: Date = new Date()): void {
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify({ day: localDay(now), b }));
  } catch {
    // Applies to this visit only.
  }
}

const SKIP_KEY = "myleet:skipped";

/** Problems skipped for today ("x"). */
export function readSkipped(now: Date = new Date()): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SKIP_KEY) ?? "null") as { day: string; ids: string[] } | null;
    return v && v.day === localDay(now) ? v.ids : [];
  } catch {
    return [];
  }
}

export function writeSkipped(ids: string[], now: Date = new Date()): void {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify({ day: localDay(now), ids }));
  } catch {
    // Skip lasts this visit only.
  }
}
