// Pure pieces of Learn: where each problem stands, per-technique tallies and the filters.
import type { TagKind } from "./ui/bits";
import type { State } from "./types";

export type PStatus = "mastered" | "climbing" | "started" | "unseen";

/** Mastered = 14-day rung; climbing = on the ladder; started = tried, never finished. */
export function pstatus(st: State | undefined): PStatus {
  if (!st || st.status === "unseen") return "unseen";
  if (st.status === "mastered") return "mastered";
  return st.rung >= 0 ? "climbing" : "started";
}

export const isDue = (st: State | undefined, now: number): boolean =>
  !!st && st.status !== "unseen" && st.rung >= 0 && st.due_ms !== null && st.due_ms <= now;

export interface Tally {
  mastered: number;
  climbing: number;
  started: number;
  total: number;
  due: number;
}

export function tally(ids: string[], states: Record<string, State>, now: number): Tally {
  const t: Tally = { mastered: 0, climbing: 0, started: 0, total: ids.length, due: 0 };
  for (const id of ids) {
    const s = pstatus(states[id]);
    if (s !== "unseen") t[s] += 1;
    if (isDue(states[id], now)) t.due += 1;
  }
  return t;
}

export const touched = (t: Tally): number => t.mastered + t.climbing + t.started;

/** The row's status tag; null means plain "Not started". */
export function statusTag(st: State | undefined, now: number): [TagKind, string] | null {
  const s = pstatus(st);
  if (s === "unseen" || !st) return null;
  if (isDue(st, now)) return ["due", st.rung === 0 && st.fails > 0 ? "Review due, back to level 1" : "Review due"];
  if (s === "mastered") return ["pass", "Mastered"];
  return ["progress", "In progress"];
}

export type FilterMode = "all" | "due" | "weak" | "new";

export function keep(mode: FilterMode, st: State | undefined, weakTechnique: boolean, now: number): boolean {
  if (mode === "due") return isDue(st, now);
  if (mode === "weak") return weakTechnique && pstatus(st) !== "unseen";
  if (mode === "new") return pstatus(st) === "unseen";
  return true;
}

/** Case-insensitive substring hit in a title, for the accent underline. */
export function textHit(title: string, query: string): [number, number] | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const i = title.toLowerCase().indexOf(q);
  return i < 0 ? null : [i, i + q.length];
}
