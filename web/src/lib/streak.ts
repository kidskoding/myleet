// The top bar's streak without loading the wasm trainer on every page: pages that
// already run the trainer record the latest stats here, and the shell reads them.
import type { Stats } from "./types";

const KEY = "myleet:streak";

export interface StreakCache {
  n: number;
  best: number;
  /** Latest local day with practice, `YYYY-MM-DD`. */
  last: string | null;
  /** Rest days inside the streak, newest first (absent in caches from older builds). */
  rests?: string[];
}

/** `YYYY-MM-DD` in the browser's zone. */
export function localDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return localDay(new Date(y, m - 1, d + n));
}

export function readStreak(): StreakCache {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return JSON.parse(v) as StreakCache;
  } catch {
    // Fall through to an empty streak.
  }
  return { n: 0, best: 0, last: null };
}

export function recordStats(stats: Pick<Stats, "streak" | "heatmap"> & Partial<Pick<Stats, "rest_days" | "last_practiced">>): StreakCache {
  const days = Object.entries(stats.heatmap)
    .filter(([, v]) => v > 0)
    .map(([d]) => d)
    .sort();
  const prev = readStreak();
  const c: StreakCache = { n: stats.streak, best: Math.max(prev.best, stats.streak), last: stats.last_practiced ?? days.at(-1) ?? null, rests: stats.rest_days ?? [] };
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // Not cached; the next trainer page recomputes it.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("myleet:streak", { detail: c }));
  return c;
}

export const STREAK_MILESTONES = [7, 30, 100, 365];

/** Days between rest days, matching the core's REST_EVERY_DAYS. */
export const REST_EVERY_DAYS = 7;

/**
 * What the top bar shows now. Yesterday can be a rest day when no other rest day falls within
 * a week of it; past that the streak reads 0. It is at risk after 8 pm with no practice.
 */
export function streakNow(c: StreakCache, now: Date = new Date()): { n: number; solvedToday: boolean; atRisk: boolean } {
  const today = localDay(now);
  const yesterday = addDays(today, -1);
  const solvedToday = c.last === today;
  const restOk = c.last === addDays(today, -2) && !(c.rests ?? []).some((r) => r > addDays(yesterday, -REST_EVERY_DAYS));
  const alive = solvedToday || c.last === yesterday || restOk;
  const n = alive ? c.n : 0;
  return { n, solvedToday, atRisk: n > 0 && !solvedToday && now.getHours() >= 20 };
}
