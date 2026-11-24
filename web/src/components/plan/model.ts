// The Plan page's view model: pure helpers over the plan, the catalog and saved prefs. No DOM.
import { attempts, parseEvents } from "../../lib/attempts";
import type { LoadedCatalog } from "../../lib/catalog";
import { mockHref, readHistory } from "../../lib/mock";
import { catchUp, topicsMoved, weekFocus, weekRecap, weeklyCheckin } from "../../lib/plan-copy";
import { standing, type DayStatus, type PastDay } from "../../lib/plan-progress";
import { pacingInterview, readPrefs, type Prefs } from "../../lib/prefs";
import { noteHref, ROUTES, sessionHref } from "../../lib/routes";
import {
  addDays,
  bands,
  clock,
  dateOf,
  DAY_LONG,
  dropTarget,
  fmtM,
  isoDay,
  minuteOf,
  sittings,
  step,
  toMin,
  WEEKDAY_STEPS,
  WEEKDAYS,
  weekdayIndex,
  windowsOf,
  type Band,
  type Win,
} from "../../lib/schedule";
import type { TrainerApi } from "../../lib/trainer";
import type { Habits, Interview, Plan, PlanDay, PlanFixes, PlanNote, PlanSession } from "../../lib/types";
import { plural } from "../../lib/ui/bits";
import type { Goals } from "../../lib/ui/goals-editor";
import { noteDismissed } from "../../lib/ui/personal";

export interface Ctx {
  t: TrainerApi;
  cat: LoadedCatalog;
  events: string;
  now: Date;
  plan: Plan;
  fixes: PlanFixes | null;
  habits: Habits | null;
}

export type View = "week" | "month" | "roadmap";

/** Height of a folded (empty) band in the week grid. */
export const FOLD = 28;
export const FORECAST_ROWS = 4;
/** Space the week grid cannot use: top bar, calendar bar, day headers, legend and margins. */
const GRID_CHROME = 290;
const HOUR_MIN = 56;
const HOUR_MAX = 112;

/** The planner's own phase lengths (crates/core/src/planner.rs NEAR_DAYS, REVIEW_ONLY_DAYS and PREP_DAYS). */
const NEAR_DAYS = 14;
const REVIEW_ONLY_DAYS = 2;
const PREP_DAYS = 21;

export const STATUS_TEXT: Record<DayStatus, string> = { done: "Done", partial: "Part done", missed: "Missed" };
export const STICKY_NOTES = new Set(["offline", "date_passed", "over_budget"]);

/** Toasts for `/plan?gcal=<outcome>` after connecting Google Calendar. */
export const GCAL_LANDED: Record<string, string> = {
  connected: "Google Calendar is connected. Your sessions show up there in a moment, and your meetings now stay off your plan",
  denied: "Google Calendar wasn't connected. You can connect it any time from Add to calendar",
  scope: "Google Calendar needs both permissions to sync. Connect again and leave both boxes ticked",
  signin: "Sign in first, then connect Google Calendar",
  upstream: "Couldn't connect Google Calendar. Try again in a moment",
};

// Roadmap presets only set an end date and a daily budget; the personalized planner does the rest.
export const ROADMAPS = [
  { days: 15, label: "15-day sprint", weekday: 180, weekend: 240 },
  { days: 30, label: "30-day plan", weekday: 120, weekend: 180 },
  { days: 90, label: "90-day plan", weekday: 60, weekend: 120 },
] as const;

// shortcut: the chosen roadmap is a per-device hint; the dates and budgets it sets do sync with the account.
const ROADMAP_KEY = "myleet-roadmap";

export function chosenRoadmap(): string {
  try {
    return localStorage.getItem(ROADMAP_KEY) ?? "custom";
  } catch {
    return "custom";
  }
}

export function rememberRoadmap(v: string): void {
  try {
    localStorage.setItem(ROADMAP_KEY, v);
  } catch {
    // Only the highlight is lost.
  }
}

export const short = (d: string) => dateOf(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const longDay = (d: string) => dateOf(d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
export const dayName = (d: string) => DAY_LONG[weekdayIndex(d)] ?? "";
/** Days from `a` to `b`, both `YYYY-MM-DD`. */
export const dayDiff = (a: string, b: string): number => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86_400_000);
export const lenOf = (s: PlanSession) => Math.round((s.end_ms - s.start_ms) / 60000);

/** Days per page: 7, or 4 on tablets; phones show a 7-day agenda. */
export const colsNow = () => (matchMedia("(max-width: 1100px) and (min-width: 761px)").matches ? 4 : 7);
export const narrow = () => matchMedia("(max-width: 760px)").matches;
export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";

/** Days from Monday to today. The 7-day view starts on that Monday, like the chart's week ticks; the 4-day view rolls. */
export const lead = (plan: Plan, cols: number): number => (cols === 7 ? weekdayIndex(plan.start) : 0);

/** Earlier days of the week as outcomes, so the grid's index 0 is a Monday. */
export const pastOf = (c: Ctx): Map<string, PastDay> => new Map(standing(c.plan, c.events, c.now).days.map((d) => [d.date, d]));

/** The days the week view pages through: this week's earlier days (empty, no sessions), then the plan. */
export function vdays(c: Ctx, cols: number): PlanDay[] {
  const n = lead(c.plan, cols);
  if (!n) return c.plan.days;
  const past = pastOf(c);
  const before = Array.from({ length: n }, (_, i): PlanDay => {
    const date = addDays(c.plan.start, i - n);
    return { date, weekday: (WEEKDAYS[weekdayIndex(date)] ?? "mon") as PlanDay["weekday"], rest: false, minutes: past.get(date)?.planned ?? 0, sessions: [], cap: 0, off: false, windows: [] };
  });
  return [...before, ...c.plan.days];
}

/** Hour height that fits the shown spans into the viewport, so the grid needs no page scroll; clamped so 15 minutes stays readable. */
export function fitHour(bs: Band[], viewport: number): number {
  const shown = bs.filter((b) => !b.fold);
  const hours = shown.reduce((n, b) => n + (b.to - b.from) / 60, 0);
  const room = viewport - GRID_CHROME - (bs.length - shown.length) * FOLD;
  return Math.round(Math.max(HOUR_MIN, Math.min(HOUR_MAX, room / Math.max(1, hours))));
}

export interface Sitting {
  start: number;
  end: number;
  clean: number;
  solved: number;
  minutes: number;
}

/** Today's finished sittings, drawn as done blocks. */
export function doneSittings(c: Ctx): Sitting[] {
  const today = isoDay(c.now);
  const done = attempts(parseEvents(c.events)).filter((a) => a.end !== null && isoDay(new Date(a.end)) === today && (a.passed || a.gaveUp));
  return sittings(done).map((s) => ({
    start: minuteOf(s.start),
    end: Math.max(minuteOf(s.end), minuteOf(s.start) + 15),
    clean: s.items.filter((a) => a.passed && !a.hints && !a.peeks).length,
    solved: s.items.filter((a) => a.passed).length,
    minutes: Math.round((s.end - s.start) / 60000),
  }));
}

export interface Grid {
  days: PlanDay[];
  bs: Band[];
  hour: number;
  done: Sitting[];
}

/** The shown days, their bands (sessions hold the grid open; empty time folds) and the hour height. */
export function gridOf(c: Ctx, days: PlanDay[], opened: [number, number][], viewport: number): Grid {
  const done = days.some((d) => d.date === c.plan.start) ? doneSittings(c) : [];
  const busy: [number, number][] = [];
  for (const d of days) for (const s of d.sessions) busy.push([minuteOf(s.start_ms), minuteOf(s.start_ms) + lenOf(s)]);
  for (const s of done) busy.push([s.start, s.end]);
  const bs = bands(busy, opened);
  return { days, bs, hour: fitHour(bs, viewport), done };
}

/** A day off has no plan windows; draw its usual ones dashed. */
export function offWindows(day: string, p: Prefs["plan"] = readPrefs().plan): Win[] {
  const wd = WEEKDAYS[weekdayIndex(day)];
  return p.availability.filter((w) => wd && w.days.includes(wd)).map((w) => ({ start: toMin(w.start), end: toMin(w.end) }));
}

/** Google Calendar busy time on `day` inside your usual practice hours, as minutes from midnight. Titles are never read.
 * The plan's own windows already have busy time cut out, so this clips to the availability you set. */
export function busyOn(day: string, p: Prefs["plan"] = readPrefs().plan): Win[] {
  const wins = offWindows(day, p);
  const d0 = new Date(`${day}T00:00:00`).getTime();
  const out: Win[] = [];
  for (const b of p.busy) {
    const s = (b.start_ms - d0) / 60000;
    const e = (b.end_ms - d0) / 60000;
    for (const w of wins) {
      const a = Math.max(s, w.start);
      const z = Math.min(e, w.end);
      if (z > a) out.push({ start: Math.round(a), end: Math.round(z) });
    }
  }
  return out.sort((x, y) => x.start - y.start);
}

/** The interviews on a day, for flags. */
export const interviewsOn = (plan: Plan, day: string): Interview[] => (plan.interviews ?? []).filter((i) => i.date === day);
/** "Google interview, 2 pm": the name, and the start time when it's known. */
export const ivLabel = (iv: Interview): string => `${iv.name ? `${iv.name} interview` : "Interview"}${iv.time ? `, ${clock(toMin(iv.time))}` : ""}`;

export const isMock = (s: PlanSession) => s.items.some((i) => i.kind === "mock");
export const hasCheckpoint = (s: PlanSession) => s.items.some((i) => i.kind === "checkpoint");

/** The next interview's company slug, or the first target company. */
export function companySlugNow(): string | null {
  const p = readPrefs().plan;
  return pacingInterview(p.interviews)?.company ?? p.companies[0] ?? null;
}

/** Opens /mock ready to begin, with this block's length and the first target company. */
export const mockLink = (s: PlanSession) => mockHref({ session: s.id, minutes: s.minutes, company: companySlugNow() });
/** A planned mock that was finished from its link. */
export const mockDone = (s: PlanSession) => readHistory().find((r) => r.session === s.id) ?? null;

export function startHref(s: PlanSession, day: string): string {
  const first = s.items.find((i) => i.problem);
  if (first?.problem) return sessionHref(first.problem, day);
  if (isMock(s)) return mockLink(s);
  const note = s.items.find((i) => i.note)?.note;
  return note ? noteHref(note) : ROUTES.today;
}

/** The pace line and the habit sentence after it, each ending in a period. */
export const withHabit = (line: string, habit: string | null | undefined): string => (habit ? `${line.endsWith(".") ? line : `${line}.`} ${habit}` : line).replace(/\.$/, "");

/** Problem id to its technique's title, for "moved forward on" lines. */
export const topicOf =
  (c: Ctx) =>
  (id: string): string | null => {
    const p = c.cat.catalog.problems.find((x) => x.id === id);
    return p ? (c.cat.catalog.modules[p.module]?.techniques[p.technique]?.title ?? null) : null;
  };

/** A day's load in words, summed across its sessions: "11 reviews, 2 new, mock". */
export function dayHeadline(d: PlanDay): string {
  const items = d.sessions.flatMap((s) => s.items);
  const n = (k: string) => items.filter((i) => i.kind === k).length;
  return [n("review") ? plural(n("review"), "review") : "", n("new") ? `${n("new")} new` : "", n("drill") ? plural(n("drill"), "drill") : "", n("mock") ? "mock" : "", n("checkpoint") ? "check-in" : ""]
    .filter(Boolean)
    .join(", ");
}

/** The note shown above the calendar: the first one the learner hasn't dismissed. */
export function currentNote(c: Ctx): PlanNote | null {
  const p = c.plan;
  const pool: PlanNote[] = [];
  if (!navigator.onLine)
    pool.push({ kind: "offline" as PlanNote["kind"], title: "You're offline", body: "The plan is built on this device, so everything here still works. Your calendar link picks up changes once you're back online", actions: [] });
  const st = standing(p, c.events, c.now);
  const today = isoDay(c.now);
  const prefs = readPrefs().plan;
  const wd = prefs.dailyMinutes ?? 60;
  const more = step(WEEKDAY_STEPS, wd, 1);
  const check = weeklyCheckin({ standing: st, today, windows: prefs.availability, topics: topicsMoved(c.events, today, topicOf(c)), date: p.interview_date, recap: weekRecap(c.events, today, (id) => c.cat.byId.get(id)?.title ?? null), focus: weekFocus(p) });
  const change = { kind: "change_plan", label: p.interview_date ? "Move the date" : "Edit goals" };
  const addTime = more > wd ? [{ kind: "add_time", label: `Weekdays at ${fmtM(more)}`, value: more }] : [];
  if (check) pool.push({ kind: "checkin" as PlanNote["kind"], title: check.title, body: check.body, actions: [{ kind: "keep_pace", label: "Keep this pace" }, ...addTime, change] } as PlanNote);
  const slip = catchUp(st);
  if (slip) pool.push({ kind: "catch_up" as PlanNote["kind"], title: slip.title, body: slip.body, actions: [{ kind: "spread", label: "Spread it over 3 days", value: slip.minutes }, ...addTime, change] } as PlanNote);
  // Before an interview, fitting its company's list comes ahead of everything else.
  if (c.fixes?.note && p.prep) pool.unshift(c.fixes.note);
  pool.push(...(p.notes ?? []));
  if (c.fixes?.note && !p.prep) pool.push(c.fixes.note);
  if (!p.interview_date && !(p.notes ?? []).some((n) => n.kind === "date_passed"))
    pool.push({
      kind: "no_date" as PlanNote["kind"],
      title: "Your next four weeks",
      body: "Keep a steady practice routine or work toward your target companies. Your plan covers the next four weeks and adjusts as you practice. An interview date is optional",
      actions: [{ kind: "change_plan", label: "Edit goals" }],
    });
  return pool.find((n) => !noteDismissed(n)) ?? null;
}

/** Where a session could move to in the next week: the first free slot in each window. */
export function moveTargets(c: Ctx, from: PlanDay, s: PlanSession): { day: PlanDay; start: number }[] {
  const out: { day: PlanDay; start: number }[] = [];
  const nowMin = minuteOf(c.now.getTime());
  const len = lenOf(s);
  for (const d of c.plan.days.slice(0, 8)) {
    if (d.off) continue;
    for (const w of windowsOf(d)) {
      const t = dropTarget([w], w.start, len, d.date === c.plan.start ? nowMin : 0);
      if (t && !(d.date === from.date && t.start === minuteOf(s.start_ms))) out.push({ day: d, start: t.start });
    }
  }
  return out;
}

export interface Phase {
  from: string;
  to: string;
  kind: "learn" | "prep" | "near" | "tail" | "steady";
  label: string;
}

export interface Milestone {
  date: string;
  kind: "interview" | "mock" | "check" | "off";
  label: string;
  iv?: Interview;
}

/** The road to your interviews: what each stretch of the plan is for, following the planner, and its milestones. */
export function roadOf(plan: Plan): { end: string; phases: Phase[]; milestones: Milestone[] } {
  const start = plan.start;
  const ivs = (plan.interviews ?? []).filter((i) => i.date >= start).sort((a, b) => a.date.localeCompare(b.date));
  const end = [plan.days.at(-1)?.date ?? start, ...ivs.map((i) => i.date)].sort().at(-1) ?? start;
  // Phases follow the planner: new topics, then mocks closer together, then reviews only.
  const phases: Phase[] = [];
  let prev = start;
  for (const iv of ivs) {
    const near = addDays(iv.date, -NEAR_DAYS);
    const tail = addDays(iv.date, -REVIEW_ONLY_DAYS);
    const push = (from: string, to: string, kind: Phase["kind"], label: string) => {
      const f = from < prev ? prev : from;
      if (to > f) phases.push({ from: f, to, kind, label });
    };
    // With a company, the planner's last PREP_DAYS go to that company's list.
    const prep = iv.company && iv.name ? addDays(iv.date, -PREP_DAYS) : near;
    push(prev, prep, "learn", "New topics and reviews");
    if (prep < near) push(prep, tail, "prep", `${iv.name} prep`);
    else push(near, tail, "near", "Mocks closer together");
    push(tail, iv.date, "tail", "Reviews only");
    prev = iv.date;
  }
  if (end > prev) phases.push({ from: prev, to: end, kind: "steady", label: ivs.length ? "Steady practice" : "Steady practice: reviews, weak spots and new topics" });

  const milestones: Milestone[] = [];
  for (const d of plan.days) {
    if (d.off) milestones.push({ date: d.date, kind: "off", label: "Day off" });
    if (d.sessions.some(isMock)) milestones.push({ date: d.date, kind: "mock", label: "Mock interview" });
    if (d.sessions.some(hasCheckpoint)) milestones.push({ date: d.date, kind: "check", label: "Check-in" });
  }
  for (const iv of ivs) milestones.push({ date: iv.date, kind: "interview", label: ivLabel(iv), iv });
  milestones.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "interview" ? -1 : b.kind === "interview" ? 1 : 0));
  return { end, phases, milestones };
}

/** The goals dialog's draft: the shared editor's goals plus a chosen roadmap preset. */
export interface Draft extends Goals {
  preset: number | null;
}

/** What changed, as plan-history lines. */
export function changeLines(before: Prefs["plan"], d: Draft, names: (slug: string | null) => string | null, topic: (id: string) => string | null, today = isoDay(new Date())): Prefs["plan"]["history"] {
  const out: Prefs["plan"]["history"] = [];
  const preset = ROADMAPS.find((r) => r.days === d.preset);
  if (preset) out.push({ date: today, kind: "preset", text: `Switched to the ${preset.label.toLowerCase()}` });
  const a = pacingInterview(before.interviews)?.date ?? null;
  const b = pacingInterview(d.interviews)?.date ?? null;
  if (a !== b) out.push({ date: today, kind: "date", text: a && b ? `Moved the interview from ${short(a)} to ${short(b)}` : b ? `Set the interview for ${short(b)}` : `Cleared the date from ${short(a ?? today)}` });
  const key = (l: Interview[]) =>
    l
      .map((i) => i.company ?? "")
      .sort()
      .join(",");
  if (key(before.interviews) !== key(d.interviews)) {
    const added = d.interviews.filter((i) => i.company && !before.interviews.some((x) => x.company === i.company));
    out.push({ date: today, kind: "company", text: added.length ? `Added ${added.map((i) => `${names(i.company)} on ${short(i.date)}`).join(" and ")}` : "Changed which companies the interviews are with" });
  }
  const list = (xs: (string | null)[]) => xs.filter((x): x is string => !!x).join(", ");
  const coIn = d.companies.filter((x) => !before.companies.includes(x));
  const coOut = before.companies.filter((x) => !d.companies.includes(x));
  if (coIn.length) out.push({ date: today, kind: "company", text: `Added ${list(coIn.map(names))} to your dream companies` });
  if (coOut.length) out.push({ date: today, kind: "company", text: `Removed ${list(coOut.map(names))} from your dream companies` });
  const tIn = d.focusTopics.filter((x) => !before.focusTopics.includes(x));
  const tOut = before.focusTopics.filter((x) => !d.focusTopics.includes(x));
  if (tIn.length) out.push({ date: today, kind: "topic", text: `Focusing on ${list(tIn.map(topic))}` });
  if (tOut.length) out.push({ date: today, kind: "topic", text: `Stopped focusing on ${list(tOut.map(topic))}` });
  const wd = before.dailyMinutes ?? 60;
  const we = before.weekendMinutes ?? wd;
  if (!preset && (wd !== d.weekday || we !== d.weekend))
    out.push({ date: today, kind: "time", text: `Daily time from ${fmtM(wd)} to ${fmtM(d.weekday)} on weekdays${we !== d.weekend ? ` and ${fmtM(we)} to ${fmtM(d.weekend)} on weekends` : ""}` });
  return out.map((l) => ({ ...l, text: l.text.slice(0, 200) }));
}

export const sameAims = (x: string[], y: string[]) => x.length === y.length && x.every((a) => y.includes(a));
