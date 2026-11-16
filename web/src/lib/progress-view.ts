// Pure pieces of the Progress page: counts, streak runs, the heatmap's weeks, the review
// calendar, milestones and insights. The wasm core owns scheduling; this only reports.
import type { Attempt } from "./attempts";
import { addDays, localDay } from "./streak";
import { weekdayOf } from "./coach";
import { span } from "./schedule";
import type { Catalog, Module, Skill, State } from "./types";

export type Standing = "mastered" | "climbing" | "started" | "unseen";

/** Mastered = 14-day rung; climbing = on the ladder; started = tried, never passed. */
export function standing(st: State | undefined): Standing {
  if (!st) return "unseen";
  if (st.status === "mastered") return "mastered";
  if (st.status === "learning" || st.status === "reviewing") return "climbing";
  return st.attempts > 0 ? "started" : "unseen";
}

export interface Counts {
  total: number;
  mastered: number;
  climbing: number;
  started: number;
  notStarted: number;
}

function count(ids: string[], states: Record<string, State>): Counts {
  const c: Counts = { total: ids.length, mastered: 0, climbing: 0, started: 0, notStarted: 0 };
  for (const id of ids) {
    const s = standing(states[id]);
    if (s === "unseen") c.notStarted++;
    else c[s]++;
  }
  return c;
}

const moduleIds = (cat: Catalog, m: Module): string[] =>
  m.techniques.flatMap((t) => t.problems.map((i) => cat.problems[i]?.id ?? "")).filter(Boolean);

/** Curriculum only: playlist-only (bank) problems never count toward mastery. */
export function masteryCounts(cat: Catalog, states: Record<string, State>): Counts {
  return count(
    cat.modules.filter((m) => !m.bank).flatMap((m) => moduleIds(cat, m)),
    states,
  );
}

export interface ModuleRow extends Counts {
  module: Module;
}

export function moduleRows(cat: Catalog, states: Record<string, State>): ModuleRow[] {
  return cat.modules.filter((m) => !m.bank).map((module) => ({ module, ...count(moduleIds(cat, module), states) }));
}

const active = (heat: Record<string, number>, day: string) => (heat[day] ?? 0) > 0;

/** Longest run of consecutive practised days. */
export function bestStreak(heat: Record<string, number>): number {
  let best = 0;
  for (const day of Object.keys(heat)) {
    if (!active(heat, day) || active(heat, addDays(day, -1))) continue;
    let n = 0;
    while (active(heat, addDays(day, n))) n++;
    best = Math.max(best, n);
  }
  return best;
}

/** The day a run first reached `n` days, or null. */
export function streakReachedOn(heat: Record<string, number>, n: number): string | null {
  const days = Object.keys(heat).filter((d) => active(heat, d)).sort();
  for (const day of days) {
    let k = 1;
    while (k < n && active(heat, addDays(day, -k))) k++;
    if (k >= n) return day;
  }
  return null;
}

export function stripDays(heat: Record<string, number>, today: string, n = 14): { day: string; on: boolean }[] {
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(today, i - n + 1);
    return { day, on: active(heat, day) };
  });
}

export function nextMilestone(streak: number, milestones: number[]): number | null {
  return milestones.find((m) => m > streak) ?? null;
}

// Heatmap weeks: the same grid as lib/ui/heatmap.ts, Sunday-first columns ending this week.

export function weekStarts(today: string, weeks: number): string[] {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const dow = new Date(y, m - 1, d).getDay();
  const start = addDays(today, -(weeks * 7 - 1) + (6 - dow));
  return Array.from({ length: weeks }, (_, i) => addDays(start, i * 7));
}

/** Month labels for the heatmap: `[column, "Jan"]` where a new month begins. */
export function monthLabels(starts: string[]): [number, string][] {
  const out: [number, string][] = [];
  starts.forEach((s, i) => {
    const prev = starts[i - 1];
    if (prev && prev.slice(5, 7) === s.slice(5, 7)) return;
    // A first column that starts late in its month is too narrow to label.
    if (i === 0 && Number(s.slice(8)) > 21) return;
    out.push([i, new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { month: "short" })]);
  });
  return out;
}

export interface WeekRow {
  from: string;
  solves: number;
  days: number;
}

/** One row per week, newest first, for the heatmap's table alternative. */
export function weeklyTable(heat: Record<string, number>, today: string, weeks: number): WeekRow[] {
  return weekStarts(today, weeks)
    .map((from) => {
      let solves = 0;
      let days = 0;
      for (let i = 0; i < 7; i++) {
        const n = heat[addDays(from, i)] ?? 0;
        solves += n;
        if (n > 0) days++;
      }
      return { from, solves, days };
    })
    .reverse();
}

/** Sunday-first month grid: nulls pad the first week. `month` is 0-11. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= days; d++) cells.push(localDay(new Date(year, month, d)));
  return cells;
}

export interface DueItem {
  id: string;
  state: State;
  /** Days past due as of today (0 when due today or later). */
  overdue: number;
}

/** Reviews by local due day; anything overdue lands on today, most overdue first. */
export function dueByDay(states: Record<string, State>, today: string): Map<string, DueItem[]> {
  const out = new Map<string, DueItem[]>();
  const t0 = new Date(`${today}T00:00:00`).getTime();
  for (const [id, state] of Object.entries(states)) {
    if (state.due_ms === null || state.rung < 0) continue;
    const due = localDay(new Date(state.due_ms));
    const day = due < today ? today : due;
    const overdue = due < today ? Math.round((t0 - new Date(`${due}T00:00:00`).getTime()) / 86_400_000) : 0;
    const list = out.get(day) ?? [];
    list.push({ id, state, overdue });
    out.set(day, list);
  }
  for (const list of out.values()) list.sort((a, b) => b.overdue - a.overdue || (a.state.due_ms ?? 0) - (b.state.due_ms ?? 0));
  return out;
}

export function dueWithin(byDay: Map<string, DueItem[]>, today: string, days: number): number {
  let n = 0;
  for (let i = 0; i < days; i++) n += byDay.get(addDays(today, i))?.length ?? 0;
  return n;
}

/** Smallest i in 1..n with `pred(i)`, assuming it stays true once reached; null if never. */
export function firstWhere(n: number, pred: (i: number) => boolean): number | null {
  if (n < 1 || !pred(n)) return null;
  let lo = 1;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pred(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export interface MilestoneFacts {
  firstClean: { day: string; title: string } | null;
  firstMastered: { day: string; title: string } | null;
  /** Day each mastered count was first reached. */
  masteredOn: Record<number, string | null>;
  mastered: number;
  heat: Record<string, number>;
  streak: number;
  best: number;
  firstMock: { day: string; detail: string } | null;
  core: { started: number; total: number; day: string | null };
  /** First fully mastered module, or the closest one. */
  module: { title: string; mastered: number; total: number; day: string | null } | null;
}

export interface Milestone {
  name: string;
  /** Earned: the local day. */
  day: string | null;
  detail: string;
  /** For ordering locked ones: 0-1 of the way there. */
  near: number;
}

export function milestoneList(f: MilestoneFacts): Milestone[] {
  const items: Milestone[] = [];
  items.push({ name: "First clean pass", day: f.firstClean?.day ?? null, detail: f.firstClean?.title ?? "Pass a problem with no hints, under the target", near: 0.5 });
  items.push({
    name: "First problem mastered",
    day: f.firstMastered?.day ?? null,
    detail: f.firstMastered ? `${f.firstMastered.title}, on level 4` : "A clean cold redo on level 4",
    near: f.mastered > 0 ? 1 : 0.3,
  });
  let prevStreak = 0;
  for (const n of [7, 30, 100]) {
    const day = streakReachedOn(f.heat, n);
    items.push({
      name: `${n}-day streak`,
      day,
      detail: day ? `Best so far: ${f.best}` : f.best >= prevStreak ? `${n - f.streak} days to go` : `After ${prevStreak}`,
      near: f.streak / n,
    });
    prevStreak = n;
  }
  items.push({ name: "First mock", day: f.firstMock?.day ?? null, detail: f.firstMock?.detail ?? "One timed round, technique hidden", near: 0.2 });
  for (const n of [50, 100, 250]) {
    const day = f.masteredOn[n] ?? null;
    items.push({ name: `${n} problems mastered`, day, detail: day ? `Now ${f.mastered}` : `${f.mastered} of ${n}`, near: f.mastered / n });
  }
  const coreDone = f.core.started >= f.core.total && f.core.day;
  items.push({
    name: "Every core module started",
    day: coreDone ? f.core.day : null,
    detail: coreDone ? `Modules 1 to ${f.core.total}` : `${f.core.started} of ${f.core.total} started`,
    near: f.core.started / Math.max(1, f.core.total),
  });
  const m = f.module;
  items.push({
    name: "First module mastered",
    day: m?.day ?? null,
    detail: m ? (m.day ? m.title : `${m.title} is closest: ${m.mastered} of ${m.total}`) : "Master every problem in one module",
    near: m ? m.mastered / Math.max(1, m.total) : 0,
  });
  return items;
}

/** Earned (oldest first), then locked: the two nearest are "Next", the rest "Later". */
export function orderMilestones(list: Milestone[]): (Milestone & { label: "earned" | "next" | "later" })[] {
  const earned = list.filter((m) => m.day).sort((a, b) => (a.day ?? "").localeCompare(b.day ?? ""));
  const locked = list.filter((m) => !m.day).sort((a, b) => b.near - a.near);
  return [
    ...earned.map((m) => ({ ...m, label: "earned" as const })),
    ...locked.map((m, i) => ({ ...m, label: i < 2 ? ("next" as const) : ("later" as const) })),
  ];
}

export type SkillLevel = "new" | "shaky" | "building" | "solid" | "strong";

/** skills/design.md buckets. */
export function skillLevel(s: Pick<Skill, "mastery" | "evidence">): SkillLevel {
  if (!s.evidence["attempts"]) return "new";
  return s.mastery < 0.35 ? "shaky" : s.mastery < 0.65 ? "building" : s.mastery < 0.85 ? "solid" : "strong";
}

/** A weak spot needs at least 4 attempts (the confidence table); highest priority first. */
export function topWeakSpot(skills: Skill[]): Skill | null {
  return skills.filter((s) => s.weak && (s.evidence["attempts"] ?? 0) >= 4).sort((a, b) => b.priority - a.priority)[0] ?? null;
}

export interface Insight {
  text: string;
}

const pct = (a: number, b: number) => (b ? a / b : 0);

/**
 * Two honest comparisons from finished attempts: misses this week vs last week, and the
 * hour with the most clean passes over four weeks. Nothing below 5 attempts.
 */
export function insights(atts: (Attempt & { clean: boolean })[], now: Date): Insight[] {
  const done = atts.filter((a) => a.end !== null);
  const week = 7 * 86_400_000;
  const t = now.getTime();
  const inWin = (from: number, to: number) => done.filter((a) => (a.end ?? 0) > t - from && (a.end ?? 0) <= t - to);
  const out: Insight[] = [];
  const thisW = inWin(week, 0);
  const lastW = inWin(2 * week, week);
  if (thisW.length >= 5 && lastW.length >= 5) {
    const miss = (l: typeof done) => l.filter((a) => !a.clean).length;
    const a = miss(thisW);
    const b = miss(lastW);
    const dir = pct(a, thisW.length) < pct(b, lastW.length) ? "down from" : pct(a, thisW.length) > pct(b, lastW.length) ? "up from" : "same as";
    out.push({ text: `Not clean: **${a} of ${thisW.length} attempts** this week, ${dir} ${b} of ${lastW.length} last week` });
  }
  const month = inWin(4 * week, 0);
  if (month.length >= 5) {
    const by = new Map<number, { clean: number; all: number }>();
    for (const a of month) {
      const h = new Date(a.end ?? 0).getHours();
      const v = by.get(h) ?? { clean: 0, all: 0 };
      v.all++;
      if (a.clean) v.clean++;
      by.set(h, v);
    }
    const best = [...by.entries()].filter(([, v]) => v.all >= 3).sort((x, y) => y[1].clean - x[1].clean || pct(y[1].clean, y[1].all) - pct(x[1].clean, x[1].all))[0];
    if (best && best[1].clean > 0) {
      out.push({ text: `Your cleanest hour is **${span(best[0] * 60, best[0] * 60 + 60)}**: ${best[1].clean} of ${best[1].all} clean passes in the last four weeks` });
    }
  }
  return out;
}

/** The line under the streak: the next milestone and how the rest day works. */
export function streakNext(n: number, next: number | null | undefined, rests: string[]): string {
  if (n === 0) return "No streak yet. Practice one problem today to start one. After that, one rest day a week won't break it.";
  const rest = rests[0] ? `${weekdayOf(rests[0])} was your rest day` : "one rest day a week won't break it";
  return `${next ? `Next milestone: ${next} days, ${next - n} to go. ` : ""}Any practice counts, and ${rest}.`;
}
