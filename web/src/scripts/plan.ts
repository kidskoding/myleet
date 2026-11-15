// Plan (/plan, ?view=month, #YYYY-MM-DD): the route from today to the interview as the
// learner's own schedule. Everything comes from the wasm planner; moves, days off and
// budgets are settings, so every change re-runs it and the page morphs to the new plan.
import { attempts, parseEvents } from "../lib/attempts";
import { loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { nextInterview, onPrefsChange, planSettings, readPrefs, updatePrefs, type Prefs } from "../lib/prefs";
import { catchUp, changePreview, drawerLede, forecastLead, headCopy, INSIGHTS_EMPTY, onTrackLine, paceLine, progressLine, spreadDays, topicsMoved, weekFocus, weekRecap, weeklyCheckin } from "../lib/plan-copy";
import { readLedger, recordPlanned, standing, type DayStatus, type PastDay } from "../lib/plan-progress";
import { companyLogo } from "../lib/company-logos";
import { addDays } from "../lib/streak";
import { companyTitle, mountInterviews } from "../lib/ui/interviews";
import { emphasize } from "../lib/ui/emphasis";
import { topicName } from "../lib/goals";
import { cachedMe } from "../lib/account";
import { closeDialog, openDialog } from "../lib/ui/overlay";
import { readEvents } from "../lib/progress";
import { noteHref, ROUTES, sessionHref } from "../lib/routes";
import { mockHref, readHistory } from "../lib/mock";
import {
  addMove,
  bands,
  clock,
  dateOf,
  DAY_LONG,
  DAY_SHORT,
  DEFAULT_WINDOWS,
  dropTarget,
  fmtM,
  freeDrop,
  gridHeight,
  isoDay,
  midSentence,
  minuteAt,
  minuteOf,
  moveFor,
  sittings,
  span,
  step,
  toggleDayOff,
  toMin,
  WEEKDAY_STEPS,
  WEEKDAYS,
  weekdayIndex,
  WEEKEND_STEPS,
  windowsOf,
  yOf,
  type Band,
  type DropBlock,
  type Win,
} from "../lib/schedule";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import type { Habits, Interview, Plan, PlanDay, PlanFixes, PlanNote, PlanSession } from "../lib/types";
import { mountAvailability, type AvailabilityEditor } from "../lib/ui/availability";
import { kbd, plural } from "../lib/ui/bits";
import { openCalendarSync } from "../lib/ui/calendar-sync";
import { html, raw, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { errorPanel, toast } from "../lib/ui/overlay";
import { featureGate } from "../lib/ui/guest-gate";
import { requireAccount, takePending } from "../lib/access";
import { signedIn } from "../lib/account";
import { dismissNote, forecastKey, forecastRows, insightList, mixBar, noteDismissed, reasonLine, replanNote } from "../lib/ui/personal";
import { toPlanned } from "../lib/reminders";
import { MOCK_LEAD_MIN } from "../lib/mock-today";

interface Ctx {
  t: TrainerApi;
  cat: LoadedCatalog;
  events: string;
  now: Date;
  plan: Plan;
  fixes: PlanFixes | null;
  habits: Habits | null;
}

const FOLD = 28;
const PROFILE_MAX_DAYS = 63;
const PROFILE_MAX_MIN = 180;
const FORECAST_ROWS = 4;
/** Past days shown before today on the route chart. */
const PAST_DAYS = 7;

let ctx: Ctx | undefined;
let view: "week" | "month" | "roadmap" = "week";
let offset = 0;
let liveText = "";
let openPopId: string | null = null;
let enter: "next" | "prev" | "view" | null = null;
let editor: AvailabilityEditor | null = null;
let fixesKey = "";

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const root = () => $("[data-plan]");
/** Days per page: 7, or 4 on tablets; phones show a 7-day agenda. */
/** Days from Monday to today. The 7-day view starts on that Monday, like the chart's week ticks; the 4-day view rolls. */
const lead = (c: Ctx): number => (cols() === 7 ? weekdayIndex(c.plan.start) : 0);

/** Earlier days of the week as outcomes, so the grid's index 0 is a Monday. */
function pastOf(c: Ctx): Map<string, PastDay> {
  return new Map(standing(c.plan, c.events, c.now).days.map((d) => [d.date, d]));
}

/** The days the week view pages through: this week's earlier days (empty, no sessions), then the plan. */
function vdays(c: Ctx): PlanDay[] {
  const n = lead(c);
  if (!n) return c.plan.days;
  const past = pastOf(c);
  const before = Array.from({ length: n }, (_, i): PlanDay => {
    const date = addDays(c.plan.start, i - n);
    return { date, weekday: (WEEKDAYS[weekdayIndex(date)] ?? "mon") as PlanDay["weekday"], rest: false, minutes: past.get(date)?.planned ?? 0, sessions: [], cap: 0, off: false, windows: [] };
  });
  return [...before, ...c.plan.days];
}

const cols = () => (matchMedia("(max-width: 1100px) and (min-width: 761px)").matches ? 4 : 7);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
/** Space the week grid cannot use: top bar, calendar bar, day headers, legend and margins. */
const GRID_CHROME = 290;
const HOUR_MIN = 56;
const HOUR_MAX = 112;
/** Hour height that fits the shown spans into the viewport, so the grid needs no page scroll; clamped so 15 minutes stays readable. */
function fitHour(bs: Band[]): number {
  const shown = bs.filter((b) => !b.fold);
  const hours = shown.reduce((n, b) => n + (b.to - b.from) / 60, 0);
  const room = innerHeight - GRID_CHROME - (bs.length - shown.length) * FOLD;
  return Math.round(Math.max(HOUR_MIN, Math.min(HOUR_MAX, room / Math.max(1, hours))));
}
/** Folded spans the learner opened (a click, a drag hovering, a keyboard move); forgotten when the week changes. */
let opened: [number, number][] = [];
let openedFor = -1;
const say = (m: string) => {
  const sr = $("#plan-sr");
  if (sr) sr.textContent = m;
};

const short = (d: string) => dateOf(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const longDay = (d: string) => dateOf(d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const dayName = (d: string) => DAY_LONG[weekdayIndex(d)] ?? "";

/** The next interview's company slug, or the first target company. */
function companySlugNow(): string | null {
  const p = readPrefs().plan;
  return nextInterview(p.interviews)?.company ?? p.companies[0] ?? null;
}

function company(c: Ctx): string | null {
  return companyTitle(c.cat.catalog.playlists, companySlugNow());
}

/** The interviews on a day, for flags. */
const interviewsOn = (c: Ctx, day: string): Interview[] => (c.plan.interviews ?? []).filter((i) => i.date === day);
const flag = (iv: Interview): SafeHtml => html`<span class="chip interview">${iv.company ? companyLogo(iv.company) : icon("flag")}<span>${iv.name ?? "Interview"}</span></span>`;

const isMock = (s: PlanSession) => s.items.some((i) => i.kind === "mock");

/** Problem id to its technique's title, for "moved forward on" lines. */
/** The pace line and the habit sentence after it, each ending in a period. */
const withHabit = (line: string, habit: string | null | undefined): string => (habit ? `${line.endsWith(".") ? line : `${line}.`} ${habit}` : line);

const topicOf = (c: Ctx) => (id: string): string | null => {
  const p = c.cat.catalog.problems.find((x) => x.id === id);
  return p ? (c.cat.catalog.modules[p.module]?.techniques[p.technique]?.title ?? null) : null;
};

const STATUS_TEXT: Record<DayStatus, string> = { done: "Done", partial: "Part done", missed: "Missed" };
/** Opens /mock ready to begin, with this block's length and the first target company. */
const mockLink = (s: PlanSession) => mockHref({ session: s.id, minutes: s.minutes, company: companySlugNow() });
/** A planned mock that was finished from its link. */
const mockDone = (s: PlanSession) => readHistory().find((r) => r.session === s.id) ?? null;

// ---- today's done sittings, from history ----

interface Sitting {
  start: number;
  end: number;
  clean: number;
  solved: number;
  minutes: number;
}

function doneSittings(c: Ctx): Sitting[] {
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

// ---- notes ----

function currentNote(c: Ctx): PlanNote | null {
  const p = c.plan;
  const pool: PlanNote[] = [];
  if (!navigator.onLine)
    pool.push({ kind: "offline" as PlanNote["kind"], title: "You're offline", body: "The plan is built on this device, so everything here still works. Your calendar link picks up changes once you're back online", actions: [] });
  const st = standing(p, c.events, c.now);
  const today = isoDay(c.now);
  const wd = readPrefs().plan.dailyMinutes ?? 60;
  const more = step(WEEKDAY_STEPS, wd, 1);
  const check = weeklyCheckin({ standing: st, today, windows: readPrefs().plan.availability, topics: topicsMoved(c.events, today, topicOf(c)), date: p.interview_date, recap: weekRecap(c.events, today, (id) => c.cat.byId.get(id)?.title ?? null), focus: weekFocus(p) });
  if (check)
    pool.push({ kind: "checkin" as PlanNote["kind"], title: check.title, body: check.body, actions: [{ kind: "keep_pace", label: "Keep this pace" }, ...(more > wd ? [{ kind: "add_time", label: `Weekdays at ${fmtM(more)}`, value: more }] : []), { kind: "change_plan", label: p.interview_date ? "Shift the date" : "Adjust your plan" }] } as PlanNote);
  const slip = catchUp(st);
  if (slip)
    pool.push({ kind: "catch_up" as PlanNote["kind"], title: slip.title, body: slip.body, actions: [{ kind: "spread", label: "Spread it over 3 days", value: slip.minutes }, ...(more > wd ? [{ kind: "add_time", label: `Weekdays at ${fmtM(more)}`, value: more }] : []), { kind: "change_plan", label: p.interview_date ? "Move the date" : "Adjust your plan" }] } as PlanNote);
  pool.push(...(p.notes ?? []));
  if (c.fixes?.note) pool.push(c.fixes.note);
  if (!p.interview_date && !(p.notes ?? []).some((n) => n.kind === "date_passed"))
    pool.push({
      kind: "no_date" as PlanNote["kind"],
      title: "Your next four weeks",
      body: "Keep a steady practice routine or work toward your target companies. Your plan covers the next four weeks and adjusts as you practice. An interview date is optional",
      actions: [{ kind: "change_plan", label: "Adjust your plan" }],
    });
  return pool.find((n) => !noteDismissed(n)) ?? null;
}

const STICKY_NOTES = new Set(["offline", "date_passed", "over_budget"]);

// Roadmap presets only set an end date and a daily budget; the personalized planner does the rest.
export const ROADMAPS = [
  { days: 15, label: "15-day sprint", weekday: 180, weekend: 240 },
  { days: 30, label: "30-day plan", weekday: 120, weekend: 180 },
  { days: 90, label: "90-day plan", weekday: 60, weekend: 120 },
] as const;

// shortcut: the chosen roadmap is a per-device hint; the dates and budgets it sets do sync with the account.
const ROADMAP_KEY = "myleet-roadmap";

function chosenRoadmap(): string {
  try {
    return localStorage.getItem(ROADMAP_KEY) ?? "custom";
  } catch {
    return "custom";
  }
}

function startRoadmap(days: number): void {
  const r = ROADMAPS.find((x) => x.days === days);
  if (!r) return;
  try {
    localStorage.setItem(ROADMAP_KEY, String(days));
  } catch {
    /* ignore */
  }
  const due = new Date();
  due.setDate(due.getDate() + r.days);
  // Technique emphasis comes from the learner's target companies; with none picked the planner aims at general readiness.
  updatePrefs({ plan: { interviewDate: isoDay(due), dailyMinutes: r.weekday, weekendMinutes: r.weekend, startedAt: isoDay(new Date()), history: [...readPrefs().plan.history, { date: isoDay(new Date()), kind: "preset", text: `Started the ${r.label.toLowerCase()}` }] } });
  view = "roadmap";
  history.replaceState(history.state, "", `${location.pathname}?view=roadmap`);
}

// ---- the week grid ----

interface Grid {
  days: PlanDay[];
  bs: Band[];
  hour: number;
  done: Sitting[];
}

function grid(c: Ctx): Grid {
  const days = vdays(c).slice(offset, offset + cols());
  const done = days.some((d) => d.date === c.plan.start) ? doneSittings(c) : [];
  if (openedFor !== offset) {
    opened = [];
    openedFor = offset;
  }
  // Only sessions hold the grid open; windows without one fold away like any other empty time.
  const busy: [number, number][] = [];
  for (const d of days) for (const s of d.sessions) busy.push([minuteOf(s.start_ms), minuteOf(s.start_ms) + Math.round((s.end_ms - s.start_ms) / 60000)]);
  for (const s of done) busy.push([s.start, s.end]);
  const bs = bands(busy, opened);
  return { days, bs, hour: fitHour(bs), done };
}

/** A day off has no plan windows; draw its usual ones dashed. */
function offWindows(day: string): Win[] {
  const wd = WEEKDAYS[weekdayIndex(day)];
  return readPrefs()
    .plan.availability.filter((w) => wd && w.days.includes(wd))
    .map((w) => ({ start: toMin(w.start), end: toMin(w.end) }));
}

function dayHeader(c: Ctx, d: PlanDay, g: Grid): SafeHtml {
  const isToday = d.date === c.plan.start;
  const doneMin = isToday ? g.done.reduce((n, s) => n + s.minutes, 0) : 0;
  const planned = d.minutes + doneMin;
  const was = d.date < c.plan.start ? pastOf(c).get(d.date) : undefined;
  const load = d.date < c.plan.start
    ? html`${was ? `${STATUS_TEXT[was.status]}, ${fmtM(was.practised)} of ${fmtM(was.planned)}` : "Nothing recorded"}`
    : d.off
    ? html`Day off`
    : !d.windows.length
      ? html`No window`
      : html`<span class="bar" aria-hidden="true"><span style="width:${Math.min(100, (planned / Math.max(1, d.cap)) * 100).toFixed(0)}%"></span></span>${planned}/${d.cap}m`;
  const dt = dateOf(d.date);
  return html`<div class="dh${isToday ? " today" : ""}${d.off ? " off" : ""}${d.date < c.plan.start ? ` past st-${was?.status ?? "none"}` : ""}" data-date="${d.date}" tabindex="-1" aria-label="${longDay(d.date)}${isToday ? ", today" : ""}">
    <div class="dh-top"><span class="dn">${DAY_SHORT[weekdayIndex(d.date)]} <b>${dt.getDate()}</b></span><button type="button" class="icon-btn daymenu" data-daymenu="${d.date}" aria-label="${dayName(d.date)} options" aria-haspopup="menu">${icon("ellipsis")}</button></div>
    <span class="load">${load}</span></div>`;
}

function sessionBlock(c: Ctx, d: PlanDay, s: PlanSession, g: Grid, first: boolean): SafeHtml {
  const a = minuteOf(s.start_ms);
  const len = Math.round((s.end_ms - s.start_ms) / 60000);
  const top = yOf(a, g.bs, g.hour, FOLD);
  const h = Math.max(22, yOf(a + len, g.bs, g.hour, FOLD) - top);
  const isToday = d.date === c.plan.start && first;
  const mock = isMock(s);
  const over = d.minutes - d.cap > 10 && s === d.sessions.at(-1) ? d.minutes - d.cap : 0;
  const isShort = h < 54 && !isToday;
  const finished = mock && mockDone(s) !== null;
  const cls = ["ses", isToday ? "today" : "", mock ? "mockses on-wall" : "", finished ? "mock-done" : "", isShort ? "short" : "", h >= 84 ? "tall" : ""].filter(Boolean).join(" ");
  const label = `${dayName(d.date)} ${span(a, a + len)}, ${fmtM(s.minutes)}: ${s.title}${s.moved_from ? `, moved from ${dayName(s.moved_from)}` : ""}. Open details`;
  return html`<li><div role="button" tabindex="0" aria-describedby="ses-hint" class="${cls}" style="top:${top.toFixed(1)}px;height:${h.toFixed(1)}px" data-m0="${a}" data-m1="${a + len}" data-minh="22" data-ses="${s.id}" data-date="${d.date}" aria-label="${label}" title="${s.title}, ${fmtM(s.minutes)}">
    <span class="t">${span(a, a + len)}${over ? html`, <span class="over">${over} min over</span>` : ""}</span>
    <span class="h">${finished ? html`${icon("check")}Mock done` : s.title}</span><span class="mm">${fmtM(s.minutes)}</span>${mixBar(s.items)}
    ${isToday ? html`<a class="btn btn-primary btn-sm start" href="${startHref(s, d.date)}" data-start aria-label="Start session (s)">${h >= 84 ? html`Start session ${kbd("s")}` : "Start"}</a>` : ""}
  </div></li>`;
}

function startHref(s: PlanSession, day: string): string {
  const first = s.items.find((i) => i.problem);
  if (first?.problem) return sessionHref(first.problem, day);
  if (isMock(s)) return mockLink(s);
  const note = s.items.find((i) => i.note)?.note;
  return note ? noteHref(note) : ROUTES.today;
}

/** A window as the grid draws it: clipped to the shown hours, null when it sits wholly inside a fold. */
function winBox(w: Win, g: Grid): [number, number] | null {
  const from = g.bs.find((b) => b.fold && w.start >= b.from && w.start < b.to);
  const to = g.bs.find((b) => b.fold && w.end > b.from && w.end <= b.to);
  const a = from ? from.to : w.start;
  const b = to ? to.from : w.end;
  const top = yOf(a, g.bs, g.hour, FOLD);
  const h = yOf(b, g.bs, g.hour, FOLD) - top;
  return b > a && h >= 1 ? [top, h] : null;
}

/** The hour ruler, rules and folded bands, redrawn whenever the scale changes. */
function gridLines(g: Grid): { ruler: SafeHtml[]; lines: SafeHtml[] } {
  const ruler: SafeHtml[] = [];
  const lines: SafeHtml[] = [];
  for (const b of g.bs) {
    if (b.fold) {
      lines.push(html`<button type="button" class="fold" data-unfold="${b.from}-${b.to}" style="top:${yOf(b.from, g.bs, g.hour, FOLD)}px;height:${FOLD}px" aria-label="Show ${span(b.from, b.to)}">${span(b.from, b.to)}, free</button>`);
      continue;
    }
    ruler.push(html`<span class="edge" style="top:${yOf(b.from, g.bs, g.hour, FOLD)}px">${clock(b.from)}</span>`);
    for (let m = Math.ceil(b.from / 30) * 30; m < b.to; m += 30) {
      const y = yOf(m, g.bs, g.hour, FOLD);
      if (m % 60) lines.push(html`<div class="hl half" style="top:${y}px"></div>`);
      else {
        if (m !== b.from) lines.push(html`<div class="hl" style="top:${y}px"></div>`);
        if (m - b.from >= 20) ruler.push(html`<span style="top:${y}px">${clock(m)}</span>`);
      }
    }
  }
  return { ruler, lines };
}

let fitTimer = 0;
/** Re-lays the shown week for a new scale (a band opened or the window resized) in place, so a drag in progress survives; glides for 200 ms. */
function relayout(c: Ctx): void {
  const body = $<HTMLElement>(".wk-body");
  if (!body || view !== "week") return;
  const g = grid(c);
  clearTimeout(fitTimer);
  if (!reduced()) {
    body.classList.add("fitting");
    fitTimer = window.setTimeout(() => body.classList.remove("fitting"), 260);
  }
  body.style.height = `${gridHeight(g.bs, g.hour, FOLD)}px`;
  const num = (el: HTMLElement, k: string) => Number(el.dataset[k]);
  for (const el of body.querySelectorAll<HTMLElement>(".ses[data-m0]")) {
    const top = yOf(num(el, "m0"), g.bs, g.hour, FOLD);
    const h = Math.max(num(el, "minh"), yOf(num(el, "m1"), g.bs, g.hour, FOLD) - top);
    el.style.top = `${top.toFixed(1)}px`;
    el.style.height = `${h.toFixed(1)}px`;
    el.classList.toggle("short", h < 54 && !el.classList.contains("today"));
    el.classList.toggle("tall", h >= 84);
  }
  for (const el of body.querySelectorAll<HTMLElement>(".win")) {
    const box = winBox({ start: num(el, "start"), end: num(el, "end") }, g);
    el.style.display = box ? "" : "none";
    if (box) {
      el.style.top = `${box[0]}px`;
      el.style.height = `${box[1]}px`;
    }
  }
  for (const el of body.querySelectorAll<HTMLElement>(".now")) el.style.top = `${yOf(num(el, "m0"), g.bs, g.hour, FOLD)}px`;
  const parts = gridLines(g);
  const ruler = $<HTMLElement>(".ruler", body);
  const lines = $<HTMLElement>("[data-lines]", body);
  if (ruler) render(ruler, html`${parts.ruler}`);
  if (lines) render(lines, html`${parts.lines}`);
  if (drag?.m) drag.m.g = g;
  if (kb) kb.g = g;
}

/** Opens a folded span so its hours can be seen and dropped into. */
function unfold(from: number, to: number): void {
  if (!ctx || opened.some(([a, b]) => a === from && b === to)) return;
  opened.push([from, to]);
  relayout(ctx);
}

function weekGrid(c: Ctx, g: Grid): SafeHtml {
  const n = g.days.length;
  const H = gridHeight(g.bs, g.hour, FOLD);
  const { ruler, lines } = gridLines(g);
  const nowMin = minuteOf(c.now.getTime());
  const columns = g.days.map((d, i) => {
    const isToday = d.date === c.plan.start;
    const wins = d.off ? offWindows(d.date) : windowsOf(d);
    const used = (w: Win) => d.sessions.some((s) => minuteOf(s.start_ms) < w.end && minuteOf(s.end_ms) > w.start) || (isToday && w.end <= nowMin);
    const winEls = wins.map((w) => {
      const box = winBox(w, g);
      return html`<div class="win" data-start="${w.start}" data-end="${w.end}" style="${box ? `top:${box[0]}px;height:${box[1]}px` : "display:none"}">${
        !used(w) && !d.off ? html`<span class="free">Free window</span>` : ""
      }</div>`;
    });
    const done = isToday
      ? g.done.map((s) => {
          const top = yOf(s.start, g.bs, g.hour, FOLD);
          const what = s.clean ? plural(s.clean, "clean pass", "clean passes") : s.solved ? `${s.solved} solved` : plural(s.minutes, "minute");
          return html`<li><div class="ses done" style="top:${top}px;height:${Math.max(30, yOf(s.end, g.bs, g.hour, FOLD) - top)}px" data-m0="${s.start}" data-m1="${s.end}" data-minh="30" aria-label="Done today, ${span(s.start, s.end)}: ${what}"><span class="h">${icon("check")}${what}</span></div></li>`;
        })
      : [];
    const now =
      isToday && g.bs.length && nowMin >= (g.bs[0]?.from ?? 0) && nowMin <= (g.bs.at(-1)?.to ?? 0)
        ? html`<div class="now" data-m0="${nowMin}" style="top:${yOf(nowMin, g.bs, g.hour, FOLD)}px" aria-hidden="true"></div>`
        : "";
    return html`<section class="col${isToday ? " today" : ""}${d.off ? " off" : ""}${d.date < c.plan.start ? " past" : ""}" data-day="${i}" data-date="${d.date}" aria-label="${longDay(d.date)}${d.off ? ", day off" : ""}">${winEls}${
      d.off ? html`<span class="offtag">Day off. Its work moved to the next free windows</span>` : ""
    }<ol aria-label="Sessions on ${dayName(d.date)}">${done}${d.sessions.map((s, j) => sessionBlock(c, d, s, g, j === 0))}</ol>${now}</section>`;
  });
  const empty = !g.done.length && g.days.every((d) => !d.sessions.length);
  if (empty) {
    const why = g.days.every((d) => d.off)
      ? "Every day this week is off. Put one back from its day menu, or add windows for the days around it."
      : g.days.every((d) => d.off || !d.windows.length)
        ? "None of your practice windows fall on these days. Add one and the plan fills it."
        : "Nothing is due on these days yet. Sessions appear here once a window has room for them.";
    return html`<div class="panel week-cal" style="--cols:${n}">
    <div class="wk wk-head">${raw("<div></div>")}${g.days.map((d) => dayHeader(c, d, g))}</div>
    <div class="wk-empty"><h3>No sessions this week</h3><p>${why}</p><button type="button" class="btn btn-secondary btn-sm" data-act="avail">${icon("clock-3")}Edit availability</button></div></div>`;
  }
  return html`<div class="panel week-cal" style="--cols:${n}">
    <div class="wk wk-head">${raw("<div></div>")}${g.days.map((d) => dayHeader(c, d, g))}</div>
    <div class="wk wk-body" style="height:${H}px"><div class="ruler" aria-hidden="true">${ruler}</div>${columns}<div class="lines" data-lines>${lines}</div></div>
  </div>`;
}

// ---- month and agenda ----

/** A day's load in words, summed across its sessions: "11 reviews, 2 new, mock". */
function dayHeadline(d: PlanDay): string {
  const items = d.sessions.flatMap((s) => s.items);
  const n = (k: string) => items.filter((i) => i.kind === k).length;
  return [
    n("review") ? plural(n("review"), "review") : "",
    n("new") ? `${n("new")} new` : "",
    n("drill") ? plural(n("drill"), "drill") : "",
    n("mock") ? "mock" : "",
    n("checkpoint") ? "check-in" : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function monthGrid(c: Ctx, whole = false): SafeHtml {
  const start = dateOf(c.plan.start);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const finish = [c.plan.days.at(-1)?.date ?? c.plan.start, c.plan.interview_date ?? "", ...(c.plan.interviews ?? []).map((i) => i.date)].sort().at(-1) ?? c.plan.start;
  const span = whole ? Math.ceil((dateOf(finish).getTime() - start.getTime()) / 86400000 / 7 + 1 / 7) * 7 : 35;
  const byDate = new Map(c.plan.days.map((d, i) => [d.date, [d, i] as const]));
  const practised = new Set(attempts(parseEvents(c.events)).filter((a) => a.end).map((a) => isoDay(new Date(a.end ?? 0))));
  const past = new Map(standing(c.plan, c.events, c.now).days.map((d) => [d.date, d.status]));
  const cells: SafeHtml[] = [];
  for (let i = 0; i < span; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const day = isoDay(dt);
    const hit = byDate.get(day);
    const ivs = interviewsOn(c, day);
    if (!hit) {
      const st = day < c.plan.start ? past.get(day) : undefined;
      cells.push(
        ivs.length
          ? html`<div class="mc" aria-label="${longDay(day)}: ${ivs.map((i) => `${i.name ?? "your"} interview`).join(", ")}"><span class="num"><span>${dt.getDate()}</span></span>${ivs.map(flag)}</div>`
          : st
            ? html`<div class="mc out st-${st}" aria-label="${longDay(day)}: ${STATUS_TEXT[st].toLowerCase()}"><span class="num"><span>${dt.getDate()}</span></span><span class="st">${STATUS_TEXT[st]}</span></div>`
            : html`<div class="mc out"><span class="num"><span>${dt.getDate()}</span>${day < c.plan.start && practised.has(day) ? html`<small>done</small>` : ""}</span></div>`,
      );
      continue;
    }
    const [d, idx] = hit;
    const mock = d.sessions.some(isMock);
    const check = d.sessions.some((s) => s.items.some((x) => x.kind === "checkpoint"));
    const what = dayHeadline(d);
    cells.push(html`<button type="button" class="mc${day === c.plan.start ? " today" : ""}" data-goto="${idx}" aria-label="${longDay(day)}: ${d.off ? "day off" : d.minutes ? `${fmtM(d.minutes)}, ${what}` : "nothing planned"}">
      <span class="num"><span>${whole && (i === 0 || dt.getDate() === 1) ? short(day) : dt.getDate()}</span>${d.minutes ? html`<small>${d.minutes}m</small>` : ""}</span>
      ${d.off ? html`<span class="chip off">Day off</span>` : html`${what ? html`<span class="what">${what}</span>` : ""}${whole && d.minutes ? mixBar(d.sessions.flatMap((x) => x.items)) : ""}${mock ? html`<span class="chip mock on-wall">Mock</span>` : ""}${check ? html`<span class="chip check">Check-in</span>` : ""}`}${ivs.map(flag)}
    </button>`);
  }
  return html`${whole ? html`<p class="roadmap-sum">${c.plan.summary.headline}</p>` : ""}<div class="panel month${whole ? " roadmap" : ""}">${DAY_SHORT.map((d) => html`<div class="mh">${d}</div>`)}${cells}</div>`;
}

function agenda(c: Ctx): SafeHtml {
  const days = vdays(c).slice(offset, offset + 7);
  const done = days.some((d) => d.date === c.plan.start) ? doneSittings(c) : [];
  const past = pastOf(c);
  return html`<ol class="agenda" aria-label="Next 7 days">${days.map((d, i) => {
    const isToday = d.date === c.plan.start;
    const dt = dateOf(d.date);
    const head = `${isToday ? "Today, " : ""}${DAY_SHORT[weekdayIndex(d.date)]} ${dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    const was = d.date < c.plan.start ? past.get(d.date) : undefined;
    const body = d.date < c.plan.start
      ? html`<div class="ag-empty">${was ? STATUS_TEXT[was.status] : "Nothing recorded"}</div>`
      : d.off
      ? html`<div class="ag-off">Day off. Its work moved to the next free windows</div>`
      : html`${isToday ? done.map((s) => html`<div class="ag-ses done"><span class="t">${clock(s.start)}</span><div><div class="h">Done: ${s.clean ? plural(s.clean, "clean pass", "clean passes") : `${s.solved} solved`}</div></div></div>`) : ""}${
          d.sessions.length
            ? d.sessions.map(
                (s, j) => html`<button type="button" class="ag-ses${isToday && j === 0 ? " today" : ""}${isMock(s) ? " mockses on-wall" : ""}" data-ses="${s.id}" data-date="${d.date}">
                  <span class="t">${clock(minuteOf(s.start_ms))}<br>${fmtM(s.minutes)}</span>
                  <div><div class="h">${s.title}</div>${mixBar(s.items)}<div class="r">${s.items[0]?.reason ?? ""}</div>${isToday && j === 0 ? html`<span class="btn btn-primary" data-start-href="${startHref(s, d.date)}">Start session</span>` : ""}</div>
                </button>`,
              )
            : html`<div class="ag-empty">${d.windows.length ? "Nothing planned in your windows" : "No window this day"}</div>`
        }`;
    return html`<li class="ag-day${isToday ? " today" : ""}${d.date < c.plan.start ? ` past st-${was?.status ?? "none"}` : ""}" data-agenda-day="${i}"><h3>${head}<small>${d.date < c.plan.start ? "" : d.off ? "Day off" : fmtM(d.minutes)}</small></h3>${body}</li>`;
  })}</ol>`;
}

// ---- the route ----

function profile(c: Ctx): SafeHtml {
  const days = c.plan.days.slice(0, PROFILE_MAX_DAYS);
  const before = standing(c.plan, c.events, c.now).days.filter((d) => d.date >= addDays(c.plan.start, -PAST_DAYS));
  const date = c.plan.interview_date;
  // Run the chart through the interview day itself; only a date past the 63-day maximum falls off the end.
  const gap = date && days.length ? Math.max(0, Math.round((dateOf(date).getTime() - dateOf(days.at(-1)?.date ?? date).getTime()) / 86_400_000)) : 0;
  const tail = Array.from({ length: Math.min(gap, PROFILE_MAX_DAYS - days.length) }, (_, i) => addDays(days.at(-1)?.date ?? c.plan.start, i + 1));
  const n = days.length + before.length + tail.length;
  const thin = n > 31;
  const mocks = days.filter((d) => d.sessions.some(isMock)).length;
  const checks = days.filter((d) => d.sessions.some((s) => s.items.some((x) => x.kind === "checkpoint"))).length;
  const offs = days.filter((d) => d.off).length;
  const who = company(c);
  const pastHtml = before.map((d) => {
    const bh = Math.max(3, (Math.min(d.planned, PROFILE_MAX_MIN) / PROFILE_MAX_MIN) * 82);
    return html`<span class="pcol past st-${d.status}" data-date="${d.date}" role="img" aria-label="${longDay(d.date)}: ${STATUS_TEXT[d.status].toLowerCase()}, ${fmtM(d.practised)} of ${fmtM(d.planned)}"><span class="b" style="height:${bh.toFixed(1)}%"><span class="f" style="height:${Math.min(100, (d.practised / Math.max(1, d.planned)) * 100).toFixed(0)}%"></span></span></span>`;
  });
  const colsHtml = days.map((d, i) => {
    const m = d.minutes;
    const bh = d.off ? 0 : Math.max(3, (Math.min(m, PROFILE_MAX_MIN) / PROFILE_MAX_MIN) * 82);
    const mock = d.sessions.some(isMock);
    const check = d.sessions.some((s) => s.items.some((x) => x.kind === "checkpoint"));
    const label = `${longDay(d.date)}: ${d.off ? "day off" : fmtM(m)}${mock ? ", mock interview" : ""}${check ? ", check-in" : ""}`;
    return html`<button type="button" class="pcol${i === 0 ? " today" : ""}${d.off ? " off" : ""}" data-p="${i}" data-date="${d.date}" aria-label="${label}">${mock ? html`<i class="mk mock" style="bottom:calc(${bh}% + 6px)"></i>` : ""}${
      check ? html`<i class="mk check" style="bottom:calc(${bh}% + ${mock ? 18 : 6}px)"></i>` : ""
    }${d.off ? html`<span class="offl">off</span>` : ""}<span class="b" style="height:${bh.toFixed(1)}%"></span></button>`;
  });
  const tailHtml = tail.map((d) => html`<span class="pcol empty${d === date ? " iv" : ""}" data-date="${d}" role="img" aria-label="${longDay(d)}${d === date ? ", interview day" : ", beyond the plan"}"><span class="b" style="height:${d === date ? 6 : 3}%"></span></span>`);
  const lastShown = tail.at(-1) ?? days.at(-1)?.date;
  const beyond = date && lastShown ? Math.round((dateOf(date).getTime() - dateOf(lastShown).getTime()) / 86_400_000) : 0;
  const nextIv = (c.plan.interviews ?? []).find((i) => i.date === date);
  const later = (c.plan.interviews ?? []).filter((i) => date && i.date > date);
  const summit = date
    ? html`<div class="summit${beyond > 0 ? " cut" : ""}">${nextIv?.company ? companyLogo(nextIv.company) : icon("flag")}<strong>${short(date)}</strong><span>${beyond > 0 ? `${plural(beyond, "day")} past the chart` : who ? `${who} interview` : "Interview"}</span>${later.map((i) => html`<span class="later">${i.company ? companyLogo(i.company) : ""}${i.name ?? "Interview"}, ${short(i.date)}</span>`)}</div>`
    : html`<div class="summit rolling">${icon("calendar-plus")}<strong>${short(c.plan.end)}</strong><span>Rolls forward daily</span></div>`;
  // Mondays are the ticks that always show, so the first one in each month names the month.
  let month = -1;
  const axis = [...before.map((d) => d.date), ...days.map((d) => d.date), ...tail].map((day) => {
    const dt = dateOf(day);
    const mon = weekdayIndex(day) === 0;
    const named = mon && dt.getMonth() !== month;
    if (named) month = dt.getMonth();
    // The month sits on its own line above the day number, so numbers stay in one row and never collide.
    return html`<span class="${mon ? "mon" : thin ? "thin" : ""}">${named ? html`<em>${dt.toLocaleDateString(undefined, { month: "short" })}</em>` : ""}${dt.getDate()}</span>`;
  });
  return html`<section class="panel approach" aria-labelledby="ap-h">
    <div class="section-head"><h2 id="ap-h">${date ? `${c.plan.summary.days_left} days to ${short(date)}` : "Next 4 weeks"}</h2><span class="meta">${plural(mocks, "mock")}, ${plural(checks, "check-in")}${offs ? `, ${plural(offs, "day")} off` : ""}</span></div>
    <div class="profile" style="--n:${n}" role="group" aria-label="Planned minutes per day${date ? " until the interview" : ""}, after the last week's outcomes. Choose a day to show its week.">${pastHtml}${colsHtml}${tailHtml}${summit}<div class="bracket" data-bracket></div></div>
    <div class="paxis" style="--n:${n}" aria-hidden="true">${axis}<span class="end">${date ? short(date) : ""}</span></div>
    <div class="legend"><span><i style="background:var(--accent)"></i>Today</span><span><i style="background:var(--line-strong)"></i>Planned minutes</span><span><i class="lg-mock"></i>Mock interview</span><span><i class="lg-check"></i>Check-in</span><span><i class="lg-off"></i>Day off</span>${before.length ? html`<span><i class="lg-done"></i>Done</span><span><i class="lg-missed"></i>Missed, moved forward</span>` : ""}</div>
  </section>`;
}

function forecast(c: Ctx): SafeHtml {
  const date = c.plan.interview_date;
  const all = c.plan.forecast;
  const behind = all.filter((f) => f.behind_by > 0).sort((a, b) => b.behind_by - a.behind_by);
  const started = all.filter((f) => f.behind_by === 0 && f.started_now > 0).sort((a, b) => b.started_now - a.started_now);
  const rest = all.filter((f) => f.behind_by === 0 && f.started_now === 0);
  const ordered = [...behind, ...started, ...rest];
  const rows = ordered.slice(0, FORECAST_ROWS);
  const more = ordered.slice(FORECAST_ROWS);
  const names = [...new Set(all.flatMap((f) => f.companies))];
  const lead = forecastLead({ forecast: all, date, companies: names, weekday: readPrefs().plan.dailyMinutes ?? 60, closeAll: c.fixes?.all ?? null });
  const scale = Math.max(1, ...all.map((r) => Math.max(r.goal, r.projected))) * 1.12;
  const closeAll = c.fixes?.all && behind.length > 1 ? html`<p class="fc-all"><button type="button" class="fix" data-fix="${c.fixes.all}">See what weekdays at ${fmtM(c.fixes.all)} would change</button></p>` : "";
  return html`<section class="panel fc-panel" aria-labelledby="fc-h">
    <div class="section-head" style="margin:0"><h2 id="fc-h">${date ? `Where you'll be by ${short(date)}` : "Where you'll be in four weeks"}</h2><span class="meta">If you keep to the plan</span></div>
    ${lead ? html`<p class="fc-lead">${lead}</p>` : ""}
    ${rows.length ? html`<div class="fc">${forecastRows(rows, { date, fixes: c.fixes, fix: true, scale })}</div>` : html`<p class="fineprint">Add an interview or a target company and this shows the topics their sets lean on, and whether you'll be ready for each in time</p>`}
    ${more.length ? html`<details class="fc-more"><summary>See all ${all.length} topics</summary><div class="fc">${forecastRows(more, { date, fixes: c.fixes, fix: true, scale })}</div></details>` : ""}
    ${closeAll}${rows.length ? forecastKey() : ""}
  </section>`;
}

function you(c: Ctx): SafeHtml {
  const p = c.plan.pace;
  const sample = p.sample ?? 0;
  const own = sample >= 5;
  const cell = (v: number | null | undefined, label: string) => html`<div><b>${v ?? "–"}<small>m</small></b><span>${label}</span></div>`;
  const ins = c.habits?.insights ?? [];
  return html`<div class="you">
    <section class="panel" aria-labelledby="pc-h">
      <div class="section-head" style="margin:0"><h2 id="pc-h">Your pace</h2><span class="meta">${own ? `Last ${sample} solves` : "Targets for now"}</span></div>
      <div class="pace-tbl">${cell(p.review_minutes ?? Math.round((p.new_minutes.medium ?? 25) * 0.6), "Reviews")}${cell(p.new_minutes.easy, "Easy")}${cell(p.new_minutes.medium, "Medium")}${cell(p.new_minutes.hard, "Hard")}</div>
      <p class="fineprint">${withHabit(paceLine(p, readPrefs().timeTargets), own ? p.habit : null)}</p>
    </section>
    <section class="panel" aria-labelledby="in-h">
      <div class="section-head" style="margin:0"><h2 id="in-h">Practice insights</h2><a class="link text-small" href="${ROUTES.progress}#insights">All insights</a></div>
      ${ins.length ? insightList(ins) : html`<p class="fineprint">${INSIGHTS_EMPTY}</p>`}
    </section>
  </div>`;
}

// ---- page ----

function firstName(): string | null {
  const n = cachedMe()?.user.display_name?.trim();
  return n ? (n.split(/\s+/)[0] ?? null) : null;
}

function head(c: Ctx): SafeHtml {
  const p = readPrefs().plan;
  const date = c.plan.interview_date;
  const later = (c.plan.interviews ?? []).find((i) => date && i.date > date);
  const companies = p.companies.flatMap((s) => companyTitle(c.cat.catalog.playlists, s) ?? []);
  const topics = p.focusTopics.flatMap((t) => topicName(c.cat.catalog, t) ?? []);
  const copy = headCopy({ plan: c.plan, company: company(c), companies, topics, name: firstName(), windows: p.availability, weekday: p.dailyMinutes ?? undefined, weekend: p.weekendMinutes ?? p.dailyMinutes ?? undefined, today: c.plan.start, nextAfter: later ? { company: later.name ?? null, date: later.date } : null });
  // startedAt is per device; the synced ledger's first day keeps "Day N" right on a new one.
  const first = [p.startedAt, Object.keys(readLedger()).sort()[0]].filter((d): d is string => !!d && d <= c.plan.start).sort()[0];
  const prog = date ? progressLine(first ?? c.plan.start, date, c.plan.start) : null;
  const track = onTrackLine(standing(c.plan, c.events, c.now), date, company(c));
  return html`<a class="back" href="${ROUTES.today}">${icon("arrow-left")}Today</a>
    <header class="plan-head">
      <div><h1>${copy.title}</h1>
        <p class="lede">${emphasize(copy.lede, companies)}</p>
        ${prog ? html`<div class="plan-progress"><span class="pp-text">${prog.text}</span><span class="pp-bar" role="progressbar" aria-label="Plan progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(prog.share * 100)}"><span style="width:${(prog.share * 100).toFixed(1)}%"></span></span></div>` : ""}
        ${track ? html`<p class="on-track">${track}</p>` : ""}</div>
      <div class="head-actions"><button type="button" class="btn btn-secondary" data-act="change">${icon("calendar-days")}Change plan</button><button type="button" class="btn btn-ghost" data-act="avail" aria-keyshortcuts="a">${icon("clock-3")}Availability ${kbd("a")}</button><button type="button" class="btn btn-secondary when-out" data-act="save">${icon("calendar-check")}Save plan</button><button type="button" class="btn btn-secondary" data-act="sync" aria-keyshortcuts="c">${icon("calendar-plus")}Add to calendar</button></div>
    </header>`;
}

function toolbar(c: Ctx, g: Grid): SafeHtml {
  const p = readPrefs().plan;
  const wd = p.dailyMinutes ?? 60;
  const we = p.weekendMinutes ?? wd;
  const first = g.days[0]?.date ?? c.plan.start;
  const last = g.days.at(-1)?.date ?? first;
  const range =
    view === "roadmap"
      ? `${short(c.plan.start)} to ${short(c.plan.interview_date ?? c.plan.days.at(-1)?.date ?? c.plan.start)}`
      : view === "month"
      ? (() => {
          const s = dateOf(c.plan.start);
          s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
          const e = new Date(s);
          e.setDate(s.getDate() + 34);
          return `${short(isoDay(s))} to ${short(isoDay(e))}`;
        })()
      : dateOf(first).getMonth() === dateOf(last).getMonth()
        ? `${short(first)} to ${dateOf(last).getDate()}`
        : `${short(first)} to ${short(last)}`;
  const n = cols();
  return html`<div class="cal-bar">
    <div class="nav2"><button type="button" class="icon-btn" data-nav="-1" aria-label="Previous ${n === 7 ? "week" : "4 days"} ( [ )" ${offset === 0 || view !== "week" ? "disabled" : ""}>${icon("chevron-left")}</button><button type="button" class="icon-btn" data-nav="1" aria-label="Next ${n === 7 ? "week" : "4 days"} ( ] )" ${offset + n >= vdays(c).length || view !== "week" ? "disabled" : ""}>${icon("chevron-right")}</button></div>
    <button type="button" class="btn btn-secondary btn-sm todaybtn" data-today aria-keyshortcuts="t">Today ${kbd("t")}</button>
    <h2 id="cal-h">${range}</h2>
    <button type="button" class="budget budget-read" data-act="change" aria-label="Daily time: ${fmtM(wd)} on weekdays, ${fmtM(we)} on weekends. Change plan"><span class="bl">Daily time</span><span>${fmtM(wd)} weekdays</span><span>${fmtM(we)} weekends</span></button>
    <div class="seg" role="group" aria-label="View" style="--on:${view === "week" ? 1 : view === "month" ? 2 : 3}"><span class="seg-thumb" aria-hidden="true"></span><button type="button" data-view="week" aria-pressed="${view === "week"}">${n === 7 ? "Week" : "4 days"}</button><button type="button" data-view="month" aria-pressed="${view === "month"}">Month</button><button type="button" data-view="roadmap" aria-pressed="${view === "roadmap"}">Roadmap</button></div>
  </div>
  <div data-live-host></div>`;
}

function emptyState(c: Ctx): SafeHtml {
  const sug = c.habits?.history.suggestion;
  return html`${head(c)}
    <div class="panel state-panel">
      <div><h2>When do you usually practice?</h2>
        <p>${sug ? html`${raw(sug.text.replace(/\*\*(.+?)\*\*/g, (_m, x: string) => `<b>${x.replace(/[<>&]/g, "")}</b>`))}` : "Tell myleet when you can practice and it fits your sessions into those hours. For example, choose weekday evenings or weekend mornings"}</p>
        <div class="btns"><button type="button" class="btn btn-primary" data-use-suggest>Use these times</button><button type="button" class="btn btn-secondary" data-act="avail">Choose my own</button></div></div>
      <div><h3>How sessions are scheduled</h3><ol>
        <li>Puts each day's reviews and new problems into sessions inside your windows</li>
        <li>Sizes sessions from how long you actually take, then adds weekly mocks, closer together near the date</li>
        <li>Moves anything you miss into the next free windows, without stacking it up</li></ol></div>
    </div>`;
}

function paint(): void {
  const el = root();
  const c = ctx;
  if (!el || !c) return;
  el.dataset.view = view;
  if (!readPrefs().plan.availability.length) {
    render(el, emptyState(c));
    return;
  }
  const g = grid(c);
  const note = currentNote(c);
  render(
    el,
    html`<div class="plan-flow">${head(c)}${note ? replanNote(note, { dismiss: !STICKY_NOTES.has(note.kind) }) : ""}
      <section class="week-sec" aria-labelledby="cal-h">${toolbar(c, g)}
        <div class="cal-split${openPopId && view === "week" ? " insp-open" : ""}" data-split><div class="cal-main">${view === "week" ? weekGrid(c, g) : monthGrid(c, view === "roadmap")}${agenda(c)}</div><aside class="pop" data-pop role="dialog" aria-modal="false" aria-labelledby="pop-h" hidden><div class="pop-in"></div></aside></div>
        <div class="legend cal-legend" aria-label="Session mix colours"><span><i style="background:var(--mix-review)"></i>Reviews</span><span><i style="background:var(--mix-weak)"></i>Weak spot</span><span><i style="background:var(--mix-new)"></i>New topic</span><span><i style="background:var(--mix-progress)"></i>In progress</span><span><i style="background:var(--mix-sharp)"></i>Keep sharp</span><span><i style="background:var(--mix-mock)"></i>Mock interview</span><span><i class="lg-check"></i>Check-in</span><span><i style="background:var(--window);box-shadow:inset 0 0 0 1px var(--window-edge)"></i>Your windows</span><span class="hint">Drag a session, or focus it and press Space, to move it. Day menu (…) takes a day off</span></div>
      </section>
      <div class="route">${profile(c)}${forecast(c)}</div>
      ${you(c)}
    </div>`,
  );
  placeLive();
  placeBracket();
  placeThumb();
  playEnter();
  if (openPopId && view === "week" && findSession(openPopId)) openPop(openPopId, { focus: false });
  else if (openPopId) closePop();
}

/** Week to week slides the way you moved; switching views cross-fades. Starts part-visible so fast presses never flash. */
function playEnter(): void {
  const how = enter;
  enter = null;
  const el = $<HTMLElement>(".cal-main");
  if (!how || !el) return;
  const still = reduced();
  const dx = how === "next" ? 16 : how === "prev" ? -16 : 0;
  el.animate(
    still ? [{ opacity: 0.4 }, { opacity: 1 }] : [{ opacity: 0.4, transform: dx ? `translateX(${dx}px)` : "translateY(4px)" }, { opacity: 1, transform: "none" }],
    { duration: still ? 120 : 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
}

/** The view switch's thumb sits in the pressed button's grid cell, then glides from where it was. */
function placeThumb(): void {
  const th = $<HTMLElement>(".cal-bar .seg-thumb");
  if (!th) return;
  const r = th.getBoundingClientRect();
  const prev = lastThumb;
  lastThumb = { left: r.left, width: r.width };
  if (!prev || reduced() || (prev.left === r.left && prev.width === r.width) || !r.width) return;
  th.animate([{ transform: `translateX(${prev.left - r.left}px)`, width: `${prev.width}px` }, { transform: "none", width: `${r.width}px` }], { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
}
let lastThumb: { left: number; width: number } | null = null;

/** The polite live line lives outside the re-rendered markup so updates are announced. */
function placeLive(): void {
  let live = $<HTMLParagraphElement>("#plan-live");
  if (!live) {
    live = document.createElement("p");
    live.id = "plan-live";
    live.className = "live";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
  }
  $("[data-live-host]")?.replaceWith(live);
  if (live.textContent !== liveText) live.innerHTML = liveText;
}

function placeBracket(): void {
  const prof = $(".profile");
  const br = $("[data-bracket]");
  if (!prof || !br) return;
  const win = ctx ? vdays(ctx).slice(offset, offset + cols()) : [];
  const first = win[0]?.date ?? "";
  const last = win.at(-1)?.date ?? "";
  const dates = [...prof.querySelectorAll<HTMLElement>(".pcol")].map((x) => x.dataset.date ?? "");
  const from = dates.findIndex((d) => d >= first);
  const to = dates.findLastIndex((d) => d <= last);
  const span = to - from + 1;
  if (view !== "week" || from < 0 || span <= 0) return void (br.style.display = "none");
  // Placed in the columns' own grid cells, so it follows any later layout change (fonts, resize, the inspector).
  br.style.display = "";
  br.style.gridColumn = `${from + 1} / span ${span}`;
  // The chart re-renders on every move, so glide the window from where it was instead of jumping.
  const base = prof.getBoundingClientRect();
  const r = br.getBoundingClientRect();
  const left = r.left - base.left;
  const prev = lastBracket;
  lastBracket = { left, width: r.width };
  if (prev && !reduced() && r.width && (prev.left !== left || prev.width !== r.width))
    br.animate([{ transform: `translateX(${prev.left - left}px)`, width: `${prev.width}px` }, { transform: "none", width: `${r.width}px` }], { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
}
let lastBracket: { left: number; width: number } | null = null;

// ---- morphing between plans (state feedback, 240 ms, interruptible) ----

type Snap = Map<string, Record<string, string>>;
const MORPH: [string, (el: HTMLElement) => string | null, string[]][] = [
  [".ses[data-ses]", (el) => el.dataset.ses ?? null, ["top", "height"]],
  [".pcol[data-p]", (el) => `p${el.dataset.p}`, []],
  [".dh .load .bar span", (el) => `l${el.closest<HTMLElement>(".dh")?.dataset.date}`, ["width"]],
];

function snapshot(): Snap {
  const out: Snap = new Map();
  for (const [sel, key, props] of MORPH) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-plan] ${sel}`)) {
      const k = key(el);
      if (!k) continue;
      const cs = getComputedStyle(el);
      out.set(k + sel, Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])));
      if (sel === ".pcol[data-p]") out.set(`${k}b`, { height: getComputedStyle(el.querySelector(".b") ?? el).height });
    }
  }
  document.querySelectorAll<HTMLElement>("[data-plan] .fc-row").forEach((row, i) =>
    row.querySelectorAll<HTMLElement>(".fc-bar > span, .fc-bar .need").forEach((s, j) => out.set(`f${i}.${j}`, { width: getComputedStyle(s).width, left: getComputedStyle(s).left })),
  );
  return out;
}

function morph(before: Snap): void {
  if (reduced()) return;
  const ease = getComputedStyle(document.documentElement).getPropertyValue("--ease-spring").trim() || "ease-out";
  const go = (el: HTMLElement, from: Record<string, string>, props: string[]) => {
    const cs = getComputedStyle(el);
    const to = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    if (props.every((p) => from[p] === to[p])) return;
    el.animate([Object.fromEntries(props.map((p) => [p, from[p] ?? to[p]])), to], { duration: 240, easing: ease });
  };
  for (const [sel, key, props] of MORPH) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-plan] ${sel}`)) {
      const k = key(el);
      if (!k) continue;
      const from = before.get(k + sel);
      if (from && props.length) go(el, from, props);
      if (sel === ".pcol[data-p]") {
        const b = el.querySelector<HTMLElement>(".b");
        const fb = before.get(`${k}b`);
        if (b && fb) go(b, fb, ["height"]);
      }
    }
  }
  document.querySelectorAll<HTMLElement>("[data-plan] .fc-row").forEach((row, i) =>
    row.querySelectorAll<HTMLElement>(".fc-bar > span, .fc-bar .need").forEach((s, j) => {
      const f = before.get(`f${i}.${j}`);
      if (f) go(s, f, s.classList.contains("need") ? ["left"] : ["width"]);
    }),
  );
}

// ---- re-planning ----

type Change = { kind: "budget"; label: string } | { kind: "quiet" };
let pendingChange: Change | null = null;
let replanQueued = false;

function computeFixes(c: Ctx): void {
  const key = JSON.stringify(planSettings()) + c.events.length + isoDay(c.now);
  if (key === fixesKey) return;
  fixesKey = key;
  const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 50));
  idle(() => {
    if (!ctx || key !== fixesKey) return;
    try {
      ctx.fixes = ctx.t.planFixes(ctx.events, planSettings(), { now: ctx.now.getTime() });
    } catch {
      ctx.fixes = null;
    }
    const before = snapshot();
    paint();
    morph(before);
  });
}

/** "Graphs is on track; dynamic programming is behind by 1." from the new forecast. */
function forecastLine(prev: Plan, next: Plan): string {
  const changed = next.forecast.filter((f) => {
    const p = prev.forecast.find((x) => x.module === f.module && x.technique === f.technique);
    return p && p.behind_by !== f.behind_by;
  });
  const parts = (changed.length ? changed : next.forecast.filter((f) => f.behind_by > 0)).slice(0, 3).map((f, i) => {
    const name = i === 0 ? f.title : midSentence(f.title);
    return f.behind_by ? `${name} is behind by ${f.behind_by}` : `${name} is on track`;
  });
  if (!parts.length) return next.forecast.length ? "Every target is on track" : "";
  return `${parts.join("; ")}`;
}

function replan(): void {
  replanQueued = false;
  if (!ctx) return;
  const prev = ctx.plan;
  const before = snapshot();
  try {
    ctx.plan = ctx.t.plan(ctx.events, planSettings(), { now: ctx.now.getTime() });
  } catch (e) {
    return errorState(e);
  }
  ctx.fixes = null;
  if (pendingChange?.kind === "budget") liveText = `<strong>Updated</strong> ${pendingChange.label}. ${forecastLine(prev, ctx.plan)}`;
  pendingChange = null;
  offset = Math.min(offset, Math.max(0, vdays(ctx).length - 1));
  rememberSessions(ctx.plan);
  paint();
  morph(before);
  editor?.refresh();
  computeFixes(ctx);
}

function queueReplan(): void {
  if (replanQueued) return;
  replanQueued = true;
  requestAnimationFrame(replan);
}

/** Today's planned sessions, for the session reminders (shell.ts), and today's load for the kept-sessions record. */
function rememberSessions(p: Plan): void {
  recordPlanned(p);
  const day = p.days[0];
  try {
    localStorage.setItem(
      "myleet:sessions",
      JSON.stringify({ day: day?.date, sessions: (day?.sessions ?? []).map((s) => toPlanned(s, MOCK_LEAD_MIN)) }),
    );
  } catch {
    // Reminders fall back to the daily time.
  }
}

// ---- popover, sheet and day menu ----

function findSession(id: string): [PlanDay, PlanSession] | null {
  for (const d of ctx?.plan.days ?? []) for (const s of d.sessions) if (s.id === id) return [d, s];
  return null;
}

function moveTargets(c: Ctx, from: PlanDay, s: PlanSession): { day: PlanDay; start: number }[] {
  const out: { day: PlanDay; start: number }[] = [];
  const nowMin = minuteOf(c.now.getTime());
  const len = Math.round((s.end_ms - s.start_ms) / 60000);
  for (const d of c.plan.days.slice(0, 8)) {
    if (d.off) continue;
    for (const w of windowsOf(d)) {
      const t = dropTarget([w], w.start, len, d.date === c.plan.start ? nowMin : 0);
      if (t && !(d.date === from.date && t.start === minuteOf(s.start_ms))) out.push({ day: d, start: t.start });
    }
  }
  return out;
}

function openPop(id: string, opts: { move?: boolean; focus?: boolean } = {}): void {
  const c = ctx;
  const pop = $<HTMLElement>("[data-pop]");
  const inner = $<HTMLElement>("[data-pop] .pop-in");
  const hit = findSession(id);
  if (!c || !pop || !inner || !hit) return;
  const [d, s] = hit;
  const swap = !pop.hidden && openPopId !== id && !pop.classList.contains("is-leaving");
  const fresh = pop.hidden || pop.classList.contains("is-leaving");
  openPopId = id;
  const a = minuteOf(s.start_ms);
  const len = Math.round((s.end_ms - s.start_ms) / 60000);
  const isToday = d.date === c.plan.start && d.sessions[0] === s;
  const itemHref = (i: PlanSession["items"][number]) =>
    i.problem ? sessionHref(i.problem, d.date) : i.note ? noteHref(i.note) : i.kind === "mock" ? ROUTES.mock : ROUTES.today;
  const targets = opts.move ? moveTargets(c, d, s) : [];
  const done = isMock(s) ? mockDone(s) : null;
  render(
    inner,
    html`<div class="pop-head"><div><h3 id="pop-h">${longDay(d.date)}</h3><p>${span(a, a + len)}, about ${fmtM(s.minutes)}${s.moved_from ? `. Moved from ${dayName(s.moved_from)}` : ""}</p></div><button type="button" class="icon-btn" data-pop-close aria-label="Close (Esc)">${icon("x")}</button></div>
      ${mixBar(s.items, { tall: true })}
      <ol class="items" aria-label="Why each problem is here">${s.items.map(
        (i) => html`<li class="item"><a class="ti" href="${itemHref(i)}">${i.title}</a><span class="m">${i.minutes}m</span>${reasonLine(i)}</li>`,
      )}</ol>
      <p class="pop-sum">Reviews come first, followed by your weakest technique and new topics. Time estimates use your usual solving time</p>
      ${opts.move
        ? html`<div class="moveto"><h4>Move to</h4>${targets.length ? html`<ul>${targets.map((t) => html`<li><button type="button" class="btn btn-ghost btn-sm" data-move-to="${t.day.date}|${t.start}">${DAY_SHORT[weekdayIndex(t.day.date)]} ${short(t.day.date)}, ${span(t.start, t.start + len)}</button></li>`)}</ul>` : html`<p class="fineprint">No other window in the next week has room. Add one in Availability</p>`}</div>`
        : html`<div class="pop-foot"><button type="button" class="btn btn-secondary btn-sm" data-pop-move>${icon("move")}Move</button><button type="button" class="btn btn-ghost btn-sm" data-pop-skip>Skip this session</button>${
            done
              ? html`<a class="btn btn-secondary btn-sm" href="${ROUTES.mock}?r=${done.id}">${icon("check")}See results</a>`
              : isMock(s)
                ? html`<a class="btn btn-primary btn-sm" href="${mockLink(s)}" data-start>Start mock interview</a>`
                : isToday
                  ? html`<a class="btn btn-primary btn-sm" href="${startHref(s, d.date)}" data-start>Start session ${kbd("s")}</a>`
                  : ""
          }</div>`}`,
  );
  clearTimeout(popTimer);
  pop.hidden = false;
  pop.classList.remove("is-leaving");
  // Docked beside the week on wide screens: the grid narrows (CSS) so nothing is covered.
  $("[data-split]")?.classList.add("insp-open");
  if (!reduced() && (fresh || swap))
    inner.animate(swap ? [{ opacity: 0.5 }, { opacity: 1 }] : [{ opacity: 0, transform: narrow() ? "translateY(24px)" : "translateX(16px)" }, { opacity: 1, transform: "none" }], { duration: swap ? 150 : 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  const anchor = $<HTMLElement>(`[data-ses="${id}"]:not([hidden])`, root() ?? document);
  document.querySelectorAll(".ses.is-open").forEach((el) => el.classList.remove("is-open"));
  anchor?.classList.add("is-open");
  if (opts.focus !== false) ($("[data-pop-close]", pop) as HTMLElement | null)?.focus({ preventScroll: true });
}
let popTimer: ReturnType<typeof setTimeout> | undefined;
const narrow = () => matchMedia("(max-width: 760px)").matches;

function closePop(): void {
  const pop = $<HTMLElement>("[data-pop]");
  if (!pop || pop.hidden || pop.classList.contains("is-leaving")) return;
  $("[data-split]")?.classList.remove("insp-open");
  // The column collapses over 200 ms; keep the content until it has, unless something reopens it.
  const hide = () => {
    pop.hidden = true;
    pop.classList.remove("is-leaving");
  };
  clearTimeout(popTimer);
  if (reduced() || narrow()) hide();
  else {
    pop.classList.add("is-leaving");
    popTimer = setTimeout(hide, 200);
  }
  document.querySelectorAll(".ses.is-open").forEach((el) => el.classList.remove("is-open"));
  const id = openPopId;
  openPopId = null;
  if (id) $<HTMLElement>(`[data-ses="${id}"]`)?.focus({ preventScroll: true });
}

function openDayMenu(day: string, btn: HTMLElement): void {
  closeDayMenu();
  const c = ctx;
  if (!c) return;
  const d = c.plan.days.find((x) => x.date === day);
  if (!d) return;
  const p = readPrefs().plan;
  const shorter = p.dayMinutes.find((x) => x.date === day);
  const m = document.createElement("div");
  m.className = "menu daymenu-pop";
  m.setAttribute("role", "menu");
  m.dataset.daymenuFor = day;
  render(
    m,
    html`<button type="button" role="menuitem" class="menu-item" data-dayoff="${day}">${d.off ? `Put ${dayName(day)} back` : `Take ${dayName(day)} off`}</button>${
      d.off ? "" : html`<button type="button" role="menuitem" class="menu-item" data-shorter="${day}">${shorter ? `Back to the usual time on ${dayName(day)}` : "Shorter day: 30 min"}</button>`
    }<button type="button" role="menuitem" class="menu-item" data-act="avail">Edit windows</button>`,
  );
  const host = root();
  host?.append(m);
  const hr = host?.getBoundingClientRect();
  const r = btn.getBoundingClientRect();
  if (hr) {
    m.style.left = `${Math.min(r.right - 220, innerWidth - 236) - hr.left}px`;
    m.style.top = `${r.bottom + 4 - hr.top}px`;
  }
  m.querySelector<HTMLElement>("button")?.focus();
}

function closeDayMenu(): void {
  document.querySelector(".daymenu-pop")?.remove();
}

// ---- setting changes, each with Undo ----

function withUndo(message: string, patch: Parameters<typeof updatePrefs>[0], previous: Parameters<typeof updatePrefs>[0]): void {
  updatePrefs(patch);
  toast(message, { ms: 8000, action: { label: "Undo", run: () => updatePrefs(previous) } });
}

function toggleOff(day: string): void {
  const c = ctx;
  if (!c) return;
  const before = c.plan.days.find((d) => d.date === day);
  const count = before?.sessions.flatMap((s) => s.items).length ?? 0;
  const prev = readPrefs().plan.daysOff;
  const next = toggleDayOff(prev, day, c.plan.start);
  const turningOff = next.includes(day);
  withUndo(
    turningOff
      ? `${dayName(day)} is off.${count ? ` Its ${plural(count, "item")} moved to the next free windows` : ""} Nothing is late`
      : `${dayName(day)} is back in the plan`,
    { plan: { daysOff: next } },
    { plan: { daysOff: prev } },
  );
}

function toggleShorter(day: string): void {
  const prev = readPrefs().plan.dayMinutes;
  const has = prev.some((x) => x.date === day);
  const today = ctx?.plan.start ?? isoDay(new Date());
  const next = has ? prev.filter((x) => x.date !== day) : [...prev.filter((x) => x.date >= today), { date: day, minutes: 30 }];
  withUndo(has ? `${dayName(day)} is back to its usual time` : `${dayName(day)} is 30 min. The rest moves to the next free windows`, { plan: { dayMinutes: next } }, { plan: { dayMinutes: prev } });
}

function skipSession(id: string): void {
  const hit = findSession(id);
  if (!hit || !ctx) return;
  const [d, s] = hit;
  const prev = readPrefs().plan.dayMinutes;
  const cur = prev.find((x) => x.date === d.date)?.minutes ?? d.cap;
  const next = [...prev.filter((x) => x.date !== d.date && x.date >= ctx!.plan.start), { date: d.date, minutes: Math.max(0, cur - s.minutes) }];
  closePop();
  withUndo(`Skipped. Its ${plural(s.items.length, "item")} moved to the next free windows`, { plan: { dayMinutes: next } }, { plan: { dayMinutes: prev } });
}

/** Applies a drop; returns the toast text from the re-planned result. */
function applyMove(id: string, to: string, start: number): void {
  const c = ctx;
  const hit = findSession(id);
  if (!c || !hit) return;
  const [d, s] = hit;
  const prev = readPrefs().plan.moves;
  const next = addMove(prev, moveFor(s, d.date, to, start), c.plan.start);
  const reviewsBefore = c.plan.days.find((x) => x.date === to)?.sessions.flatMap((x) => x.items).filter((i) => i.kind === "review").length ?? 0;
  updatePrefs({ plan: { moves: next } });
  replan();
  // The inspector follows the session to where it landed.
  const landed = ctx?.plan.days.find((x) => x.date === to)?.sessions.find((x) => minuteOf(x.start_ms) === start);
  if (openPopId && landed) openPop(landed.id, { focus: false });
  const after = ctx?.plan.days.find((x) => x.date === to)?.sessions.flatMap((x) => x.items).filter((i) => i.kind === "review").length ?? 0;
  const fit = after >= reviewsBefore ? "Reviews due that day still fit" : `${plural(reviewsBefore - after, "review")} moved to the next day`;
  const msg = `Moved to ${dayName(to)}, ${clock(start)}. ${fit}`;
  say(msg);
  toast(msg, { ms: 8000, action: { label: "Undo", run: () => updatePrefs({ plan: { moves: prev } }) } });
}

function setBudget(k: "wd" | "we", value: number): void {
  const p = readPrefs().plan;
  const label = `${k === "wd" ? "Weekdays" : "Weekends"} ${fmtM(value)}`;
  pendingChange = { kind: "budget", label };
  if (k === "wd") updatePrefs({ plan: { dailyMinutes: value, weekendMinutes: p.weekendMinutes ?? p.dailyMinutes ?? 60 } });
  else updatePrefs({ plan: { weekendMinutes: value } });
}

// ---- moving a session: pointer drag and keyboard share one preview ----

/** A visible day column, measured once when a move starts so moving never reads layout. */
interface Lane {
  x: number;
  w: number;
  day: PlanDay;
  wins: Win[];
  busy: Win[];
  notBefore: number;
}

/** Where a move would land and whether it can. */
interface Landing {
  lane: number;
  start: number;
  outside: boolean;
  blocked: DropBlock | null;
}

interface Mover {
  el: HTMLElement;
  id: string;
  minutes: number;
  from: { lane: number; start: number };
  lanes: Lane[];
  g: Grid;
  ghost: HTMLElement;
  tip: HTMLElement;
  key: string;
  at: Landing | null;
}

const BLOCK_TEXT: Record<DropBlock, string> = { off: "That day is off", past: "That time has passed", overlap: "Overlaps another session" };
const SPRING = "cubic-bezier(0.34, 1.32, 0.64, 1)";

function startMove(el: HTMLElement): Mover | null {
  const c = ctx;
  const body = $<HTMLElement>(".wk-body");
  const hit = findSession(el.dataset.ses ?? "");
  if (!c || !body || !hit) return null;
  const g = grid(c);
  const nowMin = minuteOf(c.now.getTime());
  const cols = [...body.querySelectorAll<HTMLElement>(".col")];
  const lanes = g.days.map((d, i): Lane => {
    const col = cols[i];
    const busy = d.sessions.filter((s) => s.id !== hit[1].id).map((s) => ({ start: minuteOf(s.start_ms), end: minuteOf(s.end_ms) }));
    if (d.date === c.plan.start) for (const s of g.done) busy.push({ start: s.start, end: s.end });
    return { x: col?.offsetLeft ?? 0, w: col?.offsetWidth ?? 0, day: d, wins: windowsOf(d), busy, notBefore: d.date === c.plan.start ? nowMin : 0 };
  });
  const minutes = Math.round((hit[1].end_ms - hit[1].start_ms) / 60000);
  const ghost = document.createElement("div");
  ghost.className = "ghost-ses";
  ghost.style.height = `${el.offsetHeight}px`;
  const tip = document.createElement("div");
  tip.className = "dragtip on-wall";
  ghost.append(tip);
  body.append(ghost);
  const lane = Math.max(0, lanes.findIndex((l) => l.day.date === hit[0].date));
  return { el, id: hit[1].id, minutes, from: { lane, start: minuteOf(hit[1].start_ms) }, lanes, g, ghost, tip, key: "", at: null };
}

/** Moves the ghost to a slot (CSS glides it) and says what a drop there would do. */
function preview(m: Mover, lane: number, minute: number): Landing | null {
  const l = m.lanes[lane];
  if (!l) return null;
  const f = freeDrop(minute, m.minutes, { wins: l.wins, busy: l.busy, off: l.day.off, notBefore: l.notBefore });
  const at: Landing = { lane, ...f };
  m.at = at;
  const key = `${lane}|${f.start}|${f.blocked}`;
  if (key === m.key) return at;
  m.key = key;
  const y = yOf(f.start, m.g.bs, m.g.hour, FOLD);
  m.ghost.style.width = `${l.w - 8}px`;
  m.ghost.style.transform = `translate3d(${l.x + 4}px, ${y}px, 0)`;
  m.ghost.classList.toggle("bad", !!f.blocked);
  m.ghost.classList.add("on");
  const when = `${DAY_SHORT[weekdayIndex(l.day.date)]} ${span(f.start, f.start + m.minutes)}`;
  m.tip.textContent = f.blocked ? `${when}. ${BLOCK_TEXT[f.blocked]}` : f.outside ? `${when}. Outside your usual hours` : when;
  return at;
}

function endMove(m: Mover): void {
  m.ghost.remove();
  m.el.classList.remove("lifted", "kb-lifted", "pressed");
}

/** Drops at the landing, or glides back when there is none. The moved block settles with a short spring. */
function finishMove(m: Mover, drop: boolean): void {
  const at = drop ? m.at : null;
  const same = at && at.lane === m.from.lane && at.start === m.from.start;
  const to = at && !at.blocked && !same ? { date: m.lanes[at.lane]?.day.date ?? "", start: at.start } : null;
  const fromRect = m.el.getBoundingClientRect();
  const still = reduced();
  if (!to) {
    const tf = m.el.style.transform;
    m.el.style.transform = "";
    endMove(m);
    if (tf && !still) m.el.animate([{ transform: tf }, { transform: "none" }], { duration: 180, easing: SPRING });
    if (at?.blocked) say(`Not moved. ${BLOCK_TEXT[at.blocked]}`);
    return;
  }
  endMove(m);
  applyMove(m.id, to.date, to.start);
  const moved = [...document.querySelectorAll<HTMLElement>(`.wk-body .ses[data-date="${to.date}"]`)].find((el) => {
    const s = findSession(el.dataset.ses ?? "");
    return s && minuteOf(s[1].start_ms) === to.start;
  });
  if (moved && !still) {
    const r = moved.getBoundingClientRect();
    moved.animate(
      [{ transform: `translate(${fromRect.left - r.left}px, ${fromRect.top - r.top}px) scale(1.02)`, boxShadow: "var(--shadow-md)" }, { transform: "none", boxShadow: "none" }],
      { duration: 180, easing: SPRING },
    );
  }
  // The planner can merge a block into its neighbour; then keep focus on that day's first session.
  (moved ?? $<HTMLElement>(`.wk-body .ses[data-date="${to.date}"]`))?.focus({ preventScroll: true });
}

// Pointer: the block follows the pointer 1:1 with a transform; all work happens once per frame.
interface Drag {
  el: HTMLElement;
  pointer: number;
  x0: number;
  y0: number;
  sy0: number;
  top0: number;
  bodyLeft: number;
  cx: number;
  cy: number;
  m: Mover | null;
  frame: number;
  /** The folded band the block is over and the timer that opens it. */
  over: string;
  overTimer: number;
}
let drag: Drag | null = null;
let lastTap = { id: "", at: 0 };
const EDGE = 48;

function laneAt(m: Mover, x: number): number {
  const i = m.lanes.findIndex((l) => x >= l.x && x < l.x + l.w);
  if (i >= 0) return i;
  return x < (m.lanes[0]?.x ?? 0) ? 0 : m.lanes.length - 1;
}

function onPointerDown(e: PointerEvent): void {
  const el = (e.target as Element).closest<HTMLElement>(".wk-body .ses:not(.done)");
  if (!el || e.button !== 0 || kb || (e.target as Element).closest("a,button")) return;
  const body = $<HTMLElement>(".wk-body");
  if (!body || !findSession(el.dataset.ses ?? "")) return;
  el.classList.add("pressed");
  el.setPointerCapture(e.pointerId);
  drag = { el, pointer: e.pointerId, x0: e.clientX, y0: e.clientY, sy0: scrollY, top0: el.offsetTop, bodyLeft: body.getBoundingClientRect().left, cx: e.clientX, cy: e.clientY, m: null, frame: 0, over: "", overTimer: 0 };
}

function onPointerMove(e: PointerEvent): void {
  if (!drag || e.pointerId !== drag.pointer || !ctx) return;
  drag.cx = e.clientX;
  drag.cy = e.clientY;
  if (!drag.m) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    drag.m = startMove(drag.el);
    if (!drag.m) return;
    drag.el.classList.add("lifted");
    edgeTop = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--topbar-h")) || 56) + EDGE;
  }
  if (!drag.frame) drag.frame = requestAnimationFrame(dragFrame);
}
let edgeTop = 104;

function dragFrame(): void {
  const d = drag;
  if (!d?.m) return;
  d.frame = 0;
  // Near the top or bottom edge the page scrolls, faster the closer the pointer is.
  const bottom = innerHeight - EDGE;
  const v = d.cy < edgeTop ? -Math.min(16, (edgeTop - d.cy) / 3) : d.cy > bottom ? Math.min(16, (d.cy - bottom) / 3) : 0;
  if (v) scrollBy(0, v);
  const dy = d.cy - d.y0 + (scrollY - d.sy0);
  d.el.style.transform = `translate3d(${d.cx - d.x0}px, ${dy}px, 0)${reduced() ? "" : " scale(1.02)"}`;
  hoverFold(d, d.top0 + dy);
  preview(d.m, laneAt(d.m, d.cx - d.bodyLeft), minuteAt(d.top0 + dy, d.m.g.bs, d.m.g.hour, FOLD));
  if (v) d.frame = requestAnimationFrame(dragFrame);
}

/** A block held over a folded band for 400 ms opens it, so a drop can land in those hours. */
function hoverFold(d: Drag, y: number): void {
  const g = d.m?.g;
  if (!g) return;
  let top = 0;
  let band: Band | null = null;
  for (const b of g.bs) {
    const len = b.fold ? FOLD : ((b.to - b.from) / 60) * g.hour;
    if (y >= top && y < top + len) band = b.fold ? b : null;
    top += len;
  }
  const key = band ? `${band.from}-${band.to}` : "";
  if (key === d.over) return;
  clearTimeout(d.overTimer);
  d.over = key;
  if (!band) return;
  const { from, to } = band;
  d.overTimer = window.setTimeout(() => {
    if (drag !== d || !d.m) return;
    const was = d.top0;
    unfold(from, to);
    // The block keeps its place under the pointer while the hours open around it.
    d.top0 = d.el.offsetTop;
    d.y0 += d.top0 - was;
    d.m.key = "";
    d.over = "";
    if (!d.frame) d.frame = requestAnimationFrame(dragFrame);
  }, 400);
}

function endDrag(e: PointerEvent, cancelled = false): void {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  cancelAnimationFrame(d.frame);
  clearTimeout(d.overTimer);
  d.el.classList.remove("pressed");
  if (!d.m) {
    if (cancelled) return;
    const id = d.el.dataset.ses ?? "";
    // A second press within 400 ms is a double-click (counted here: pointer capture eats native dblclick). It starts a planned mock.
    const hit = findSession(id);
    if (lastTap.id === id && Date.now() - lastTap.at < 400 && hit && isMock(hit[1]) && !mockDone(hit[1])) return void (location.href = mockLink(hit[1]));
    lastTap = { id, at: Date.now() };
    openPop(id);
    return;
  }
  finishMove(d.m, !cancelled);
}

// Keyboard: Space lifts, arrows move a day or 15 minutes (any free time), Space or Enter drops, Escape cancels.
let kb: (Mover & { lane: number; start: number }) | null = null;

function kbLift(el: HTMLElement): void {
  const m = startMove(el);
  if (!m) return;
  kb = { ...m, lane: m.from.lane, start: m.from.start };
  el.classList.add("kb-lifted");
  kbShow();
  say(`Picked up ${span(m.from.start, m.from.start + m.minutes)} on ${dayName(m.lanes[m.from.lane]?.day.date ?? "")}. Left and right change day, up and down move 15 minutes. Space drops, Escape cancels`);
}

/** Up/down step 15 minutes inside the grid's shown hours, hopping over folded gaps. */
function kbStep(key: string): void {
  if (!kb) return;
  if (key === "ArrowLeft" || key === "ArrowRight") kb.lane = Math.max(0, Math.min(kb.lanes.length - 1, kb.lane + (key === "ArrowRight" ? 1 : -1)));
  else {
    const dir = key === "ArrowDown" ? 1 : -1;
    let next = kb.start + dir * 15;
    const fold = kb.g.bs.find((b) => b.fold && next + kb!.minutes > b.from && next < b.to);
    // Stepping into a folded span opens it, so the move lands in real hours.
    if (fold) unfold(fold.from, fold.to);
    const bs = kb.g.bs;
    kb.start = Math.max(bs[0]?.from ?? 0, Math.min(next, (bs.at(-1)?.to ?? 24 * 60) - kb.minutes));
  }
  kbShow();
}

function kbShow(): void {
  if (!kb) return;
  const at = preview(kb, kb.lane, kb.start);
  const l = kb.lanes[kb.lane];
  const home = kb.lanes[kb.from.lane];
  if (!at || !l || !home) return;
  // The block glides to the slot (CSS transition on .kb-lifted); the ghost marks it.
  kb.el.style.transform = `translate3d(${l.x - home.x}px, ${yOf(at.start, kb.g.bs, kb.g.hour, FOLD) - yOf(kb.from.start, kb.g.bs, kb.g.hour, FOLD)}px, 0)`;
  say(kb.tip.textContent ?? "");
}

function kbEnd(drop: boolean): void {
  const m = kb;
  if (!m) return;
  kb = null;
  if (!drop) say("Move cancelled");
  finishMove(m, drop);
}

// ---- availability panel ----

function openDrawer(): void {
  const d = $<HTMLElement>("[data-av-drawer]");
  if (!d || !ctx) return;
  if (d.classList.contains("is-leaving")) {
    // Reopened mid-close: keep the mounted editor and slide back in.
    clearTimeout(drawerTimer);
    d.classList.remove("is-leaving");
  }
  if (!d.hidden) return void d.querySelector<HTMLElement>("button")?.focus();
  render(
    d,
    html`<div class="dr-head"><div><h2 id="dr-h">When do you want to practice?</h2><p>${drawerLede(ctx.habits?.history ?? null)}</p></div><button type="button" class="icon-btn" data-drawer-close aria-label="Close (Esc)">${icon("x")}</button></div>
      <div data-av-host></div>
      <div class="dr-foot"><span>Saved as you go</span><button type="button" class="btn btn-secondary" data-drawer-close>Done</button></div>`,
  );
  d.hidden = false;
  d.classList.remove("is-leaving");
  const host = $<HTMLElement>("[data-av-host]", d);
  if (host) editor = mountAvailability(host, { history: ctx.habits?.history ?? null, id: "plan-av" });
  d.querySelector<HTMLElement>("[data-drawer-close]")?.focus();
}

function closeDrawer(): void {
  const d = $<HTMLElement>("[data-av-drawer]");
  if (!d || d.hidden || d.classList.contains("is-leaving")) return;
  const done = () => {
    d.hidden = true;
    d.classList.remove("is-leaving");
    editor?.destroy();
    editor = null;
    $<HTMLElement>('[data-act="avail"]')?.focus();
  };
  if (reduced()) return done();
  d.classList.add("is-leaving");
  drawerTimer = setTimeout(done, 200);
}
let drawerTimer: ReturnType<typeof setTimeout> | undefined;

function openSync(): void {
  if (!requireAccount("calendar-sync")) return;
  const c = ctx;
  void openCalendarSync(() => {
    if (!c) return null;
    const next = c.plan.days.find((d) => d.sessions.length);
    if (!next) return null;
    const one = { ...c.plan, days: [{ ...next, sessions: next.sessions.slice(0, 1) }] };
    return c.t.planIcs(one, { site: location.origin, alarm_minutes: readPrefs().plan.reminderMinutes });
  });
}


// ---- Change plan: the goal (dates, companies, daily time) changes here, with its cost shown first ----

interface Draft {
  interviews: Interview[];
  weekday: number;
  weekend: number;
  preset: number | null;
}

function draftSettings(d: Draft) {
  return { ...planSettings(), interviews: d.interviews, interview_date: nextInterview(d.interviews, ctx?.plan.start)?.date ?? null, daily_minutes: d.weekday, weekend_minutes: d.weekend };
}

/** What changed, as plan-history lines. */
function changeLines(before: Prefs["plan"], d: Draft, names: (slug: string | null) => string | null): Prefs["plan"]["history"] {
  const today = isoDay(new Date());
  const out: Prefs["plan"]["history"] = [];
  const preset = ROADMAPS.find((r) => r.days === d.preset);
  if (preset) out.push({ date: today, kind: "preset", text: `Switched to the ${preset.label.toLowerCase()}` });
  const a = nextInterview(before.interviews)?.date ?? null;
  const b = nextInterview(d.interviews)?.date ?? null;
  if (a !== b) out.push({ date: today, kind: "date", text: a && b ? `Moved the interview from ${short(a)} to ${short(b)}` : b ? `Set the interview for ${short(b)}` : `Cleared the date from ${short(a ?? today)}` });
  const key = (l: Interview[]) => l.map((i) => i.company ?? "").sort().join(",");
  if (key(before.interviews) !== key(d.interviews)) {
    const added = d.interviews.filter((i) => i.company && !before.interviews.some((x) => x.company === i.company));
    out.push({ date: today, kind: "company", text: added.length ? `Added ${added.map((i) => `${names(i.company)} on ${short(i.date)}`).join(" and ")}` : "Changed which companies the plan leans on" });
  }
  const wd = before.dailyMinutes ?? 60;
  const we = before.weekendMinutes ?? wd;
  if (!preset && (wd !== d.weekday || we !== d.weekend)) out.push({ date: today, kind: "time", text: `Daily time from ${fmtM(wd)} to ${fmtM(d.weekday)} on weekdays${we !== d.weekend ? ` and ${fmtM(we)} to ${fmtM(d.weekend)} on weekends` : ""}` });
  return out;
}

function openChange(o: { weekday?: number; focusDate?: boolean } = {}): void {
  const c = ctx;
  if (!c) return;
  const p = readPrefs().plan;
  const draft: Draft = { interviews: [...p.interviews], weekday: o.weekday ?? p.dailyMinutes ?? 60, weekend: p.weekendMinutes ?? p.dailyMinutes ?? 60, preset: null };
  const dlg = document.createElement("dialog");
  dlg.className = "dlg change-dlg";
  dlg.setAttribute("aria-labelledby", "cp-h");
  const names = (slug: string | null) => companyTitle(c.cat.catalog.playlists, slug);
  const cur = chosenRoadmap();
  const moves = p.history.filter((h) => h.kind === "date").length;
  render(dlg, html`<div class="dlg-head"><h2 id="cp-h">Change plan</h2><button type="button" class="icon-btn" data-cp-close aria-label="Close">${icon("x")}</button></div>
    <div class="cp-body">
      <p class="cp-intro">Your goal is the interview, the company and the time you give each day. Moving a single session on the calendar never changes it. Changes here reshape the days ahead and keep everything you've already done.</p>
      <h3>Interviews</h3><div data-cp-iv></div>
      <h3>Start a fresh plan</h3><div class="seg" role="group" aria-label="Plan length">${ROADMAPS.map((r) => html`<button type="button" data-cp-preset="${r.days}" aria-pressed="${cur === String(r.days) ? "true" : "false"}">${r.label}</button>`)}</div>
      <h3 id="cp-dt">Daily time</h3><div class="cp-time" role="group" aria-labelledby="cp-dt"><span>Weekdays</span><span class="stepper"><button type="button" data-cp-step="wd" data-by="-1" aria-label="Less weekday time">${icon("minus")}</button><output data-cp-out="wd"></output><button type="button" data-cp-step="wd" data-by="1" aria-label="More weekday time">${icon("plus")}</button></span><span>Weekends</span><span class="stepper"><button type="button" data-cp-step="we" data-by="-1" aria-label="Less weekend time">${icon("minus")}</button><output data-cp-out="we"></output><button type="button" data-cp-step="we" data-by="1" aria-label="More weekend time">${icon("plus")}</button></span></div>
      <h3>Days off</h3><div data-cp-off></div>
      <p class="cp-preview" aria-live="polite" data-cp-preview></p>
      ${p.history.length ? html`<details class="cp-history"><summary>Plan history</summary><ol>${[...p.history].reverse().map((h) => html`<li><time datetime="${h.date}">${short(h.date)}</time> ${h.text}</li>`)}</ol></details>` : ""}
    </div>
    <div class="cp-foot"><button type="button" class="btn btn-ghost" data-cp-close>Keep my plan</button><button type="button" class="btn btn-primary" data-cp-apply disabled>Update my plan</button></div>`);
  document.body.append(dlg);
  const offEditor = mountAvailability($<HTMLElement>("[data-cp-off]", dlg) as HTMLElement, { sections: ["daysoff"], headings: false, id: "cp-off" });
  const changed = () => changeLines(readPrefs().plan, draft, names).length > 0;
  const preview = (): void => {
    const out = (k: "wd" | "we") => $(`[data-cp-out="${k}"]`, dlg);
    const wdOut = out("wd");
    const weOut = out("we");
    if (wdOut) wdOut.textContent = fmtM(draft.weekday);
    if (weOut) weOut.textContent = fmtM(draft.weekend);
    const apply = $<HTMLButtonElement>("[data-cp-apply]", dlg);
    const box = $("[data-cp-preview]", dlg);
    if (!changed()) {
      if (box) box.textContent = "";
      if (apply) apply.disabled = true;
      return;
    }
    if (apply) apply.disabled = false;
    try {
      const after = c.t.plan(c.events, draftSettings(draft), { now: c.now.getTime() });
      const who = names(nextInterview(draft.interviews, c.plan.start)?.company ?? null);
      if (box) box.textContent = changePreview({ before: c.plan, after, company: who, dateMoves: moves });
    } catch {
      if (box) box.textContent = "Check the dates: each interview needs a real day.";
    }
  };
  const iv = mountInterviews($<HTMLElement>("[data-cp-iv]", dlg) as HTMLElement, c.cat.catalog.playlists, {
    id: "cp-iv",
    get: () => draft.interviews,
    set: (list) => {
      draft.interviews = list;
      draft.preset = null;
      preview();
    },
  });
  dlg.addEventListener("click", (e) => {
    const el = e.target as Element;
    const st = el.closest<HTMLElement>("[data-cp-step]");
    const pre = el.closest<HTMLElement>("[data-cp-preset]");
    if (el.closest("[data-cp-close]")) return closeDialog(dlg);
    if (st) {
      const dir = Number(st.dataset.by) > 0 ? 1 : -1;
      if (st.dataset.cpStep === "wd") draft.weekday = step(WEEKDAY_STEPS, draft.weekday, dir);
      else draft.weekend = step(WEEKEND_STEPS, draft.weekend, dir);
      return preview();
    }
    if (pre) {
      const r = ROADMAPS.find((x) => x.days === Number(pre.dataset.cpPreset));
      if (!r) return;
      for (const b of dlg.querySelectorAll<HTMLElement>("[data-cp-preset]")) b.setAttribute("aria-pressed", String(b === pre));
      const next = nextInterview(draft.interviews, c.plan.start);
      const rest = draft.interviews.filter((i) => i !== next);
      draft.interviews = [...rest, { date: addDays(c.plan.start, r.days), company: next?.company ?? null }].sort((a, b) => a.date.localeCompare(b.date));
      Object.assign(draft, { weekday: r.weekday, weekend: r.weekend, preset: r.days });
      iv.refresh();
      return preview();
    }
    if (el.closest("[data-cp-apply]")) {
      const before = readPrefs().plan;
      const lines = changeLines(before, draft, names);
      if (draft.preset)
        try {
          localStorage.setItem(ROADMAP_KEY, String(draft.preset));
        } catch {
          /* only the highlight is lost */
        }
      else if (lines.some((l) => l.kind !== "company"))
        try {
          localStorage.setItem(ROADMAP_KEY, "custom");
        } catch {
          /* ignore */
        }
      pendingChange = { kind: "budget", label: "your plan" };
      updatePrefs({ plan: { interviews: draft.interviews, dailyMinutes: draft.weekday, weekendMinutes: draft.weekend, startedAt: draft.preset ? c.plan.start : (before.startedAt ?? c.plan.start), history: [...before.history, ...lines].slice(-50) } });
      closeDialog(dlg);
      toast("Plan updated. Everything you've done so far stays");
    }
  });
  dlg.addEventListener("keydown", (e) => e.stopPropagation());
  dlg.addEventListener("close", () => (offEditor.destroy(), dlg.remove(), $<HTMLElement>('[data-act="change"]')?.focus()), { once: true });
  openDialog(dlg);
  preview();
  (o.focusDate ? $<HTMLElement>("[data-iv-date]", dlg) : $<HTMLElement>("[data-cp-close]", dlg))?.focus();
}

/** Catch-up after a slip: the missed minutes spread over the next three planned days. */
function spreadMissed(minutes: number): void {
  const c = ctx;
  if (!c) return;
  const p = readPrefs().plan;
  const s = spreadDays(c.plan, p, minutes);
  if (!s) return;
  withUndo(`Added ${fmtM(s.each)} to each of the next ${s.count === 1 ? "day" : `${s.count} days`}`, { plan: { dayMinutes: s.dayMinutes } }, { plan: { dayMinutes: p.dayMinutes } });
}

// ---- wiring ----

function goTo(index: number, openFirst = false): void {
  if (!ctx) return;
  const n = cols();
  const was = { view, offset };
  view = "week";
  const lead0 = lead(ctx);
  const total = vdays(ctx).length;
  // Whole calendar weeks in the 7-day view; the 4-day view rolls from the day you picked.
  offset = Math.max(0, Math.min(index + lead0, total - 1));
  if (n === 7) offset = Math.floor(offset / 7) * 7;
  else {
    if (offset > 0) offset = Math.max(0, Math.min(offset, total - n));
    if (index < offset || index >= offset + n) offset = index;
  }
  enter = was.view !== "week" ? "view" : offset > was.offset ? "next" : offset < was.offset ? "prev" : null;
  const day = ctx.plan.days[index];
  openPopId = null;
  paint();
  if (!day) return;
  if (openFirst && day.sessions[0]) openPop(day.sessions[0].id);
  else $<HTMLElement>(`.dh[data-date="${day.date}"]`)?.focus({ preventScroll: true });
}

function onClick(e: MouseEvent): void {
  if (!root() || !ctx) return;
  const t = e.target as Element;
  const a = t.closest<HTMLElement>("[data-act],[data-step],[data-fix],[data-view],button[data-nav],[data-today],[data-unfold],[data-daymenu],[data-dayoff],[data-shorter],[data-goto],.pcol[data-p],.ag-ses[data-ses],[data-pop-close],[data-pop-move],[data-pop-skip],[data-move-to],[data-note-act],[data-note-dismiss],[data-use-suggest],[data-drawer-close],[data-start-href]");
  if (!t.closest(".daymenu-pop") && !t.closest("[data-daymenu]")) closeDayMenu();
  // Any click outside the popover closes it; a session click reopens it on that session.
  if (!t.closest("[data-pop]") && !t.closest(".ses") && !t.closest(".toast")) closePop();
  if (!a) return;
  const d = a.dataset;
  if (d.startHref) return void (location.href = d.startHref);
  if (d.act === "avail") return (closeDayMenu(), openDrawer());
  if (d.act === "change") return (closeDayMenu(), openChange());
  if (d.act === "sync") return openSync();
  if (d.act === "save") return void requireAccount("save-plan");
  if (a.matches("[data-drawer-close]")) return closeDrawer();
  if (d.unfold) {
    const [from, to] = d.unfold.split("-").map(Number);
    return unfold(from ?? 0, to ?? 0);
  }
  if (d.step) {
    const p = readPrefs().plan;
    const k = d.step as "wd" | "we";
    const cur = k === "wd" ? (p.dailyMinutes ?? 60) : (p.weekendMinutes ?? p.dailyMinutes ?? 60);
    return setBudget(k, step(k === "wd" ? WEEKDAY_STEPS : WEEKEND_STEPS, cur, Number(d.by) > 0 ? 1 : -1));
  }
  if (d.fix) return openChange({ weekday: Number(d.fix) });
  if (d.view) {
    const next = d.view === "month" || d.view === "roadmap" ? d.view : "week";
    if (next !== view) enter = "view";
    view = next;
    history.replaceState(history.state, "", view === "week" ? location.pathname : `${location.pathname}?view=${view}`);
    return paint();
  }
  if (d.nav) {
    const next = Math.max(0, Math.min(vdays(ctx).length - 1, offset + Number(d.nav) * cols()));
    if (next !== offset) enter = next > offset ? "next" : "prev";
    offset = next;
    return paint();
  }
  if (a.matches("[data-today]")) return goTo(0);
  if (d.daymenu) return openDayMenu(d.daymenu, a);
  if (d.dayoff) return (closeDayMenu(), toggleOff(d.dayoff));
  if (d.shorter) return (closeDayMenu(), toggleShorter(d.shorter));
  if (d.goto) return goTo(Number(d.goto), true);
  if (a.classList.contains("pcol")) return goTo(Number(d.p), true);
  if (a.classList.contains("ag-ses") && d.ses) return openPop(d.ses);
  if (a.matches("[data-pop-close]")) return closePop();
  if (a.matches("[data-pop-move]") && openPopId) return openPop(openPopId, { move: true });
  if (a.matches("[data-pop-skip]") && openPopId) return skipSession(openPopId);
  if (d.moveTo && openPopId) {
    const [day = "", start = "0"] = d.moveTo.split("|");
    const id = openPopId;
    closePop();
    return applyMove(id, day, Number(start));
  }
  if (d.noteDismiss !== undefined) {
    const n = currentNote(ctx);
    if (n) dismissNote(n);
    return paint();
  }
  if (d.noteAct) {
    const note = currentNote(ctx);
    if (d.noteAct === "weekday_minutes") return openChange({ weekday: Number(d.value) });
    if (d.noteAct === "availability") return openDrawer();
    if (d.noteAct === "set_date" || d.noteAct === "change_plan") return openChange({ focusDate: true });
    if (d.noteAct === "keep_pace") return (note && dismissNote(note), paint());
    if (d.noteAct === "spread") return (note && dismissNote(note), spreadMissed(Number(d.value)));
    if (d.noteAct === "add_time") {
      if (note) dismissNote(note);
      const p = readPrefs().plan;
      updatePrefs({ plan: { history: [...p.history, { date: isoDay(new Date()), kind: "time", text: `Weekdays from ${fmtM(p.dailyMinutes ?? 60)} to ${fmtM(Number(d.value))} to catch up` }] } }, { silent: true });
      return setBudget("wd", Number(d.value));
    }
    if (d.noteAct === "roadmap") return startRoadmap(Number(d.value));
    if (d.noteAct === "clear_date") return void updatePrefs({ plan: { interviewDate: null } });
  }
  if (a.matches("[data-use-suggest]")) {
    const sug = ctx.habits?.history.suggestion;
    updatePrefs({ plan: { availability: sug?.windows ?? DEFAULT_WINDOWS } });
  }
}

let lastKey = { key: "", at: 0 };

function onKey(e: KeyboardEvent): void {
  if (!root() || !ctx) return;
  const prevKey = lastKey;
  lastKey = { key: e.key, at: Date.now() };
  if (e.key === "Escape") {
    if (kb) return (e.preventDefault(), kbEnd(false));
    if (document.querySelector(".daymenu-pop")) return closeDayMenu();
    if (!$<HTMLElement>("[data-pop]")?.hidden) return closePop();
    if (!$<HTMLElement>("[data-av-drawer]")?.hidden) return closeDrawer();
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || document.querySelector("dialog[open]")) return;
  const active = document.activeElement as HTMLElement | null;
  if (active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable)) return;
  if (active?.closest("[data-av-drawer]")) return;
  const ses = active?.closest<HTMLElement>(".wk-body .ses:not(.done)");
  if (kb) {
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      return kbStep(e.key);
    }
    if (e.key === " " || e.key === "Enter") return (e.preventDefault(), kbEnd(true));
    return;
  }
  if (ses && e.key === " ") return (e.preventDefault(), kbLift(ses));
  if (ses && e.key === "Enter") {
    e.preventDefault();
    const hit = findSession(ses.dataset.ses ?? "");
    if (hit && isMock(hit[1]) && !mockDone(hit[1])) return void (location.href = mockLink(hit[1]));
    return openPop(ses.dataset.ses ?? "");
  }
  // "g t" belongs to the shell's go-to keys.
  if (prevKey.key === "g" && Date.now() - prevKey.at < 1200) return;
  const dh = active?.closest<HTMLElement>(".dh");
  if (e.key === "o" && dh?.dataset.date) return (e.preventDefault(), toggleOff(dh.dataset.date));
  const keys: Record<string, () => void> = {
    t: () => goTo(0),
    "[": () => $<HTMLElement>('[data-nav="-1"]')?.click(),
    "]": () => $<HTMLElement>('[data-nav="1"]')?.click(),
    w: () => $<HTMLElement>('[data-view="week"]')?.click(),
    m: () => $<HTMLElement>('[data-view="month"]')?.click(),
    a: openDrawer,
    c: openSync,
    s: () => {
      const start = $<HTMLAnchorElement>("[data-start]");
      if (start) location.href = start.href;
    },
    j: () => moveFocus(1),
    k: () => moveFocus(-1),
  };
  const fn = keys[e.key];
  if (fn) {
    e.preventDefault();
    fn();
  }
}

/** j / k: session to session in time order. */
function moveFocus(dir: 1 | -1): void {
  const all = [...document.querySelectorAll<HTMLElement>(".wk-body .ses:not(.done)")].sort((a, b) => {
    const x = findSession(a.dataset.ses ?? "")?.[1].start_ms ?? 0;
    const y = findSession(b.dataset.ses ?? "")?.[1].start_ms ?? 0;
    return x - y;
  });
  const i = all.indexOf(document.activeElement as HTMLElement);
  all[i < 0 ? (dir > 0 ? 0 : all.length - 1) : Math.max(0, Math.min(all.length - 1, i + dir))]?.focus();
}

function errorState(err: unknown): void {
  const el = root();
  if (!el) return;
  render(
    el,
    html`<a class="back" href="${ROUTES.today}">${icon("arrow-left")}Today</a><header class="plan-head"><div><h1>Plan</h1></div></header>
    ${errorPanel("Couldn't build the plan", `${navigator.onLine ? `The planner stopped before it finished (${err instanceof Error ? err.message : "unknown error"}).` : "You're offline and the curriculum isn't cached on this device yet"} Your progress and your settings are safe, and Today's queue works as usual`)}`,
  );
  el.querySelector("[data-retry]")?.addEventListener("click", () => void init());
}

async function init(): Promise<void> {
  if (!root()) return;
  const v = new URLSearchParams(location.search).get("view");
  view = v === "month" || v === "roadmap" ? v : "week";
  offset = 0;
  openPopId = null;
  liveText = "";
  try {
    const [t, cat, events] = await Promise.all([loadTrainer(), loadCatalog(), readEvents()]);
    if (!signedIn()) {
      const el = root();
      if (el) render(el, featureGate("plan", t.placement(events).done));
      return;
    }
    const now = new Date();
    const plan = t.plan(events, planSettings(), { now: now.getTime() });
    let habits: Habits | null = null;
    try {
      habits = t.habits(events, { now: now.getTime(), limit: 3 });
    } catch {
      habits = null;
    }
    ctx = { t, cat, events, now, plan, fixes: null, habits };
    // Plans made before the progress line had no start; count from the first visit with a date.
    if (plan.interview_date && !readPrefs().plan.startedAt) updatePrefs({ plan: { startedAt: plan.start } }, { silent: true });
    rememberSessions(plan);
    const hash = location.hash.slice(1);
    const hi = /^\d{4}-\d{2}-\d{2}$/.test(hash) ? plan.days.findIndex((d) => d.date === hash) : -1;
    if (hi >= 0) goTo(hi, true);
    else paint();
    computeFixes(ctx);
    // Back from sign-up with the calendar dialog still wanted: reopen it.
    if (signedIn() && takePending("calendar-sync")) openSync();
  } catch (e) {
    errorState(e);
  }
}

async function refreshEvents(): Promise<void> {
  if (!root() || !ctx) return;
  ctx.events = await readEvents();
  ctx.now = new Date();
  try {
    ctx.habits = ctx.t.habits(ctx.events, { now: ctx.now.getTime(), limit: 3 });
  } catch {
    // Keep the last insights.
  }
  replan();
}

let wired = false;
function wire(): void {
  if (wired) return;
  wired = true;
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", (e) => endDrag(e));
  document.addEventListener("pointercancel", (e) => endDrag(e, true));
  onPrefsChange((_p: Prefs) => {
    if (root() && ctx) queueReplan();
  });
  for (const ev of ["myleet:synced", "myleet:progress"]) addEventListener(ev, () => void refreshEvents());
  addEventListener("online", () => root() && ctx && paint());
  addEventListener("offline", () => root() && ctx && paint());
  let wasNarrow = cols();
  let refit = 0;
  addEventListener("resize", () => {
    if (!root() || !ctx) return;
    if (cols() !== wasNarrow) {
      wasNarrow = cols();
      paint();
    } else {
      placeBracket();
      cancelAnimationFrame(refit);
      refit = requestAnimationFrame(() => ctx && relayout(ctx));
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx && root()) {
      ctx.now = new Date();
      replan();
    }
  });
  // The now line keeps up while the page is open.
  setInterval(() => {
    if (ctx && root() && document.visibilityState === "visible" && !drag && !kb) {
      ctx.now = new Date();
      const now = $<HTMLElement>(".now");
      const g = grid(ctx);
      if (now) now.style.top = `${yOf(minuteOf(ctx.now.getTime()), g.bs, g.hour, FOLD)}px`;
    }
  }, 60_000);
}

wire();
document.addEventListener("astro:page-load", () => void init());
window.addEventListener("myleet:auth", () => void init());
document.addEventListener("astro:before-swap", () => {
  closeDrawer();
  ctx = undefined;
});
