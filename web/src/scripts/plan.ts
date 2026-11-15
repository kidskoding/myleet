// Plan (/plan, ?view=month, #YYYY-MM-DD): the route from today to the interview as the
// learner's own schedule. Everything comes from the wasm planner; moves, days off and
// budgets are settings, so every change re-runs it and the page morphs to the new plan.
import { attempts, parseEvents } from "../lib/attempts";
import { loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { onPrefsChange, planSettings, readPrefs, updatePrefs, type Prefs } from "../lib/prefs";
import { readEvents } from "../lib/progress";
import { noteHref, ROUTES, sessionHref } from "../lib/routes";
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
  gridHeight,
  isoDay,
  midSentence,
  minuteAt,
  minuteOf,
  moveFor,
  sittings,
  span,
  step,
  stepMove,
  toggleDayOff,
  toMin,
  WEEKDAY_STEPS,
  WEEKDAYS,
  weekdayIndex,
  WEEKEND_STEPS,
  windowsOf,
  yOf,
  type Band,
  type KeyMove,
  type Win,
} from "../lib/schedule";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import type { Habits, Plan, PlanDay, PlanFixes, PlanNote, PlanSession } from "../lib/types";
import { mountAvailability, type AvailabilityEditor } from "../lib/ui/availability";
import { kbd, plural } from "../lib/ui/bits";
import { openCalendarSync } from "../lib/ui/calendar-sync";
import { html, raw, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { toast } from "../lib/ui/overlay";
import { dismissNote, forecastKey, forecastRows, insightList, mixBar, noteDismissed, reasonLine, replanNote } from "../lib/ui/personal";

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
const FORECAST_ROWS = 6;

let ctx: Ctx | undefined;
let view: "week" | "month" = "week";
let offset = 0;
let liveText = "";
let openPopId: string | null = null;
let editor: AvailabilityEditor | null = null;
let fixesKey = "";

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const root = () => $("[data-plan]");
/** Days per page: 7, or 4 on tablets; phones show a 7-day agenda. */
const cols = () => (matchMedia("(max-width: 1100px) and (min-width: 761px)").matches ? 4 : 7);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
const hourPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hour")) || 112;
const say = (m: string) => {
  const sr = $("#plan-sr");
  if (sr) sr.textContent = m;
};

const short = (d: string) => dateOf(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const longDay = (d: string) => dateOf(d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const dayName = (d: string) => DAY_LONG[weekdayIndex(d)] ?? "";

function company(c: Ctx): string | null {
  const slug = readPrefs().plan.companies[0];
  return slug ? (c.cat.catalog.playlists.find((p) => p.id.replace(/^\d+_/, "") === slug)?.title ?? null) : null;
}

const isMock = (s: PlanSession) => s.items.some((i) => i.kind === "mock");

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
  pool.push(...(p.notes ?? []));
  if (c.fixes?.note) pool.push(c.fixes.note);
  if (!p.interview_date && !(p.notes ?? []).some((n) => n.kind === "date_passed"))
    pool.push({
      kind: "no_date" as PlanNote["kind"],
      title: "No interview date yet",
      body: "This plan covers the next 4 weeks and rolls forward each day. Add a date and it builds toward it, with mocks closer together near the end",
      actions: [{ kind: "set_date", label: "Add a date" }],
    });
  return pool.find((n) => !noteDismissed(n)) ?? null;
}

const STICKY_NOTES = new Set(["offline", "date_passed", "over_budget"]);

// ---- the week grid ----

interface Grid {
  days: PlanDay[];
  bs: Band[];
  hour: number;
  done: Sitting[];
}

function grid(c: Ctx): Grid {
  const days = c.plan.days.slice(offset, offset + cols());
  const done = offset === 0 ? doneSittings(c) : [];
  const busy: [number, number][] = [];
  for (const d of days) {
    for (const w of windowsOf(d)) busy.push([w.start, w.end]);
    for (const s of d.sessions) busy.push([minuteOf(s.start_ms), minuteOf(s.start_ms) + Math.round((s.end_ms - s.start_ms) / 60000)]);
    if (d.off) for (const w of offWindows(d.date)) busy.push([w.start, w.end]);
  }
  for (const s of done) busy.push([s.start, s.end]);
  return { days, bs: bands(busy), hour: hourPx(), done };
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
  const load = d.off
    ? html`Day off`
    : !d.windows.length
      ? html`No window`
      : html`<span class="bar" aria-hidden="true"><span style="width:${Math.min(100, (planned / Math.max(1, d.cap)) * 100).toFixed(0)}%"></span></span>${planned}/${d.cap}m`;
  const dt = dateOf(d.date);
  return html`<div class="dh${isToday ? " today" : ""}${d.off ? " off" : ""}" data-date="${d.date}" tabindex="-1" aria-label="${longDay(d.date)}${isToday ? ", today" : ""}">
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
  const cls = ["ses", isToday ? "today" : "", mock ? "mockses on-wall" : "", isShort ? "short" : "", h >= 84 ? "tall" : ""].filter(Boolean).join(" ");
  const label = `${dayName(d.date)} ${span(a, a + len)}, ${fmtM(s.minutes)}: ${s.title}${s.moved_from ? `, moved from ${dayName(s.moved_from)}` : ""}. Open details`;
  return html`<li><div role="button" tabindex="0" aria-describedby="ses-hint" class="${cls}" style="top:${top.toFixed(1)}px;height:${h.toFixed(1)}px" data-ses="${s.id}" data-date="${d.date}" aria-label="${label}" title="${s.title}, ${fmtM(s.minutes)}">
    <span class="t">${span(a, a + len)}${over ? html`, <span class="over">${over} min over</span>` : ""}</span>
    <span class="h">${s.title}</span><span class="mm">${fmtM(s.minutes)}</span>${mixBar(s.items)}
    ${isToday ? html`<a class="btn btn-primary btn-sm start" href="${startHref(s, d.date)}" data-start aria-label="Start session (s)">${h >= 84 ? html`Start session ${kbd("s")}` : "Start"}</a>` : ""}
  </div></li>`;
}

function startHref(s: PlanSession, day: string): string {
  const first = s.items.find((i) => i.problem);
  if (first?.problem) return sessionHref(first.problem, day);
  if (s.items.some((i) => i.kind === "mock")) return ROUTES.mock;
  const note = s.items.find((i) => i.note)?.note;
  return note ? noteHref(note) : ROUTES.today;
}

function weekGrid(c: Ctx, g: Grid): SafeHtml {
  const n = g.days.length;
  const H = gridHeight(g.bs, g.hour, FOLD);
  const ruler: SafeHtml[] = [];
  const lines: SafeHtml[] = [];
  for (const b of g.bs) {
    if (b.fold) {
      lines.push(html`<div class="fold" style="top:${yOf(b.from, g.bs, g.hour, FOLD)}px;height:${FOLD}px">${span(b.from, b.to)}, no windows</div>`);
      continue;
    }
    for (let m = b.from; m < b.to; m += 60) {
      const y = yOf(m, g.bs, g.hour, FOLD);
      ruler.push(html`<span class="${m === b.from ? "edge" : ""}" style="top:${y}px">${clock(m)}</span>`);
      if (m !== b.from) lines.push(html`<div class="hl" style="top:${y}px"></div>`);
      lines.push(html`<div class="hl half" style="top:${y + g.hour / 2}px"></div>`);
    }
  }
  const nowMin = minuteOf(c.now.getTime());
  const columns = g.days.map((d, i) => {
    const isToday = d.date === c.plan.start;
    const wins = d.off ? offWindows(d.date) : windowsOf(d);
    const used = (w: Win) => d.sessions.some((s) => minuteOf(s.start_ms) < w.end && minuteOf(s.end_ms) > w.start) || (isToday && w.end <= nowMin);
    const winEls = wins.map(
      (w) =>
        html`<div class="win" data-start="${w.start}" data-end="${w.end}" style="top:${yOf(w.start, g.bs, g.hour, FOLD)}px;height:${yOf(w.end, g.bs, g.hour, FOLD) - yOf(w.start, g.bs, g.hour, FOLD)}px">${
          !used(w) && !d.off ? html`<span class="free">Free window</span>` : ""
        }</div>`,
    );
    const done = isToday
      ? g.done.map((s) => {
          const top = yOf(s.start, g.bs, g.hour, FOLD);
          const what = s.clean ? plural(s.clean, "clean pass", "clean passes") : s.solved ? `${s.solved} solved` : plural(s.minutes, "minute");
          return html`<li><div class="ses done" style="top:${top}px;height:${Math.max(30, yOf(s.end, g.bs, g.hour, FOLD) - top)}px" aria-label="Done today, ${span(s.start, s.end)}: ${what}"><span class="h">${icon("check")}${what}</span></div></li>`;
        })
      : [];
    const now =
      isToday && g.bs.length && nowMin >= (g.bs[0]?.from ?? 0) && nowMin <= (g.bs.at(-1)?.to ?? 0)
        ? html`<div class="now" style="top:${yOf(nowMin, g.bs, g.hour, FOLD)}px" aria-hidden="true"></div>`
        : "";
    return html`<section class="col${isToday ? " today" : ""}${d.off ? " off" : ""}" data-day="${i}" data-date="${d.date}" aria-label="${longDay(d.date)}${d.off ? ", day off" : ""}">${winEls}${
      d.off ? html`<span class="offtag">Day off. Its work moved to the next free windows</span>` : ""
    }<ol aria-label="Sessions on ${dayName(d.date)}">${done}${d.sessions.map((s, j) => sessionBlock(c, d, s, g, j === 0))}</ol>${now}</section>`;
  });
  return html`<div class="panel week-cal" style="--cols:${n}">
    <div class="wk wk-head">${raw("<div></div>")}${g.days.map((d) => dayHeader(c, d, g))}</div>
    <div class="wk wk-body" style="height:${H}px"><div class="ruler" aria-hidden="true">${ruler}</div>${columns}${lines}</div>
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

function monthGrid(c: Ctx): SafeHtml {
  const start = dateOf(c.plan.start);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const byDate = new Map(c.plan.days.map((d, i) => [d.date, [d, i] as const]));
  const practised = new Set(attempts(parseEvents(c.events)).filter((a) => a.end).map((a) => isoDay(new Date(a.end ?? 0))));
  const cells: SafeHtml[] = [];
  for (let i = 0; i < 35; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const day = isoDay(dt);
    const hit = byDate.get(day);
    if (!hit) {
      const interview = day === c.plan.interview_date;
      cells.push(
        interview
          ? html`<div class="mc" aria-label="${longDay(day)}: ${company(c) ?? "your"} interview"><span class="num"><span>${dt.getDate()}</span></span><span class="chip interview">${icon("flag")}<span>${company(c) ?? "Interview"}</span></span></div>`
          : html`<div class="mc out"><span class="num"><span>${dt.getDate()}</span>${day < c.plan.start && practised.has(day) ? html`<small>done</small>` : ""}</span></div>`,
      );
      continue;
    }
    const [d, idx] = hit;
    const mock = d.sessions.some(isMock);
    const check = d.sessions.some((s) => s.items.some((x) => x.kind === "checkpoint"));
    const what = dayHeadline(d);
    cells.push(html`<button type="button" class="mc${day === c.plan.start ? " today" : ""}" data-goto="${idx}" aria-label="${longDay(day)}: ${d.off ? "day off" : d.minutes ? `${fmtM(d.minutes)}, ${what}` : "nothing planned"}">
      <span class="num"><span>${dt.getDate()}</span>${d.minutes ? html`<small>${d.minutes}m</small>` : ""}</span>
      ${d.off ? html`<span class="chip off">Day off</span>` : html`${what ? html`<span class="what">${what}</span>` : ""}${mock ? html`<span class="chip mock on-wall">Mock</span>` : ""}${check ? html`<span class="chip check">Check-in</span>` : ""}`}
    </button>`);
  }
  return html`<div class="panel month">${DAY_SHORT.map((d) => html`<div class="mh">${d}</div>`)}${cells}</div>`;
}

function agenda(c: Ctx): SafeHtml {
  const days = c.plan.days.slice(offset, offset + 7);
  const done = offset === 0 ? doneSittings(c) : [];
  return html`<ol class="agenda" aria-label="Next 7 days">${days.map((d, i) => {
    const isToday = d.date === c.plan.start;
    const dt = dateOf(d.date);
    const head = `${isToday ? "Today, " : ""}${DAY_SHORT[weekdayIndex(d.date)]} ${dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    const body = d.off
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
    return html`<li class="ag-day${isToday ? " today" : ""}" data-agenda-day="${i}"><h3>${head}<small>${d.off ? "Day off" : fmtM(d.minutes)}</small></h3>${body}</li>`;
  })}</ol>`;
}

// ---- the route ----

function profile(c: Ctx): SafeHtml {
  const days = c.plan.days.slice(0, PROFILE_MAX_DAYS);
  const n = days.length;
  const thin = n > 31;
  const total = days.reduce((m, d) => m + d.minutes, 0);
  const mocks = days.filter((d) => d.sessions.some(isMock)).length;
  const checks = days.filter((d) => d.sessions.some((s) => s.items.some((x) => x.kind === "checkpoint"))).length;
  const offs = days.filter((d) => d.off).length;
  const date = c.plan.interview_date;
  const who = company(c);
  const colsHtml = days.map((d, i) => {
    const m = d.minutes;
    const bh = d.off ? 0 : Math.max(3, (Math.min(m, PROFILE_MAX_MIN) / PROFILE_MAX_MIN) * 82);
    const mock = d.sessions.some(isMock);
    const check = d.sessions.some((s) => s.items.some((x) => x.kind === "checkpoint"));
    const label = `${longDay(d.date)}: ${d.off ? "day off" : fmtM(m)}${mock ? ", mock interview" : ""}${check ? ", check-in" : ""}`;
    return html`<button type="button" class="pcol${i === 0 ? " today" : ""}${d.off ? " off" : ""}" data-p="${i}" aria-label="${label}">${mock ? html`<i class="mk mock" style="bottom:calc(${bh}% + 6px)"></i>` : ""}${
      check ? html`<i class="mk check" style="bottom:calc(${bh}% + ${mock ? 18 : 6}px)"></i>` : ""
    }${d.off ? html`<span class="offl">off</span>` : ""}<span class="b" style="height:${bh.toFixed(1)}%"></span></button>`;
  });
  const summit = date
    ? html`<div class="summit">${icon("flag")}<strong>${short(date)}</strong><span>${who ? `${who} interview` : "Interview"}</span></div>`
    : html`<div class="summit rolling">${icon("calendar-plus")}<strong>${short(c.plan.end)}</strong><span>Rolls forward daily</span></div>`;
  const axis = days.map((d) => {
    const dt = dateOf(d.date);
    const mon = weekdayIndex(d.date) === 0;
    return html`<span class="${mon ? "mon" : thin ? "thin" : ""}">${dt.getDate() === 1 ? short(d.date) : dt.getDate()}</span>`;
  });
  return html`<section class="panel approach" aria-labelledby="ap-h">
    <div class="section-head"><h2 id="ap-h">${date ? `${c.plan.summary.days_left} days to ${short(date)}` : "Next 4 weeks"}</h2><span class="meta">About ${fmtM(total)} planned, ${plural(mocks, "mock")}, ${plural(checks, "check-in")}${offs ? `, ${plural(offs, "day")} off` : ""}</span></div>
    <div class="profile" style="--n:${n}" role="group" aria-label="Planned minutes per day${date ? " until the interview" : ""}. Choose a day to show its week.">${colsHtml}${summit}<div class="bracket" data-bracket></div></div>
    <div class="paxis" style="--n:${n}" aria-hidden="true">${axis}<span class="end">${date ? short(date) : ""}</span></div>
    <div class="legend"><span><i style="background:var(--accent)"></i>Today</span><span><i style="background:var(--line-strong)"></i>Planned minutes</span><span><i class="lg-mock"></i>Mock interview</span><span><i class="lg-check"></i>Check-in</span><span><i class="lg-off"></i>Day off</span></div>
  </section>`;
}

function forecast(c: Ctx): SafeHtml {
  const date = c.plan.interview_date;
  const all = c.plan.forecast;
  const behind = all.filter((f) => f.behind_by > 0).sort((a, b) => b.behind_by - a.behind_by);
  const started = all.filter((f) => f.behind_by === 0 && f.started_now > 0).sort((a, b) => b.started_now - a.started_now);
  const rest = all.filter((f) => f.behind_by === 0 && f.started_now === 0);
  const rows = [...behind, ...started, ...rest].slice(0, FORECAST_ROWS);
  const hidden = all.length - rows.length;
  const closeAll = c.fixes?.all && behind.length > 1 ? html`<p class="fc-all"><button type="button" class="fix" data-fix="${c.fixes.all}">Weekdays at ${fmtM(c.fixes.all)} closes every gap</button></p>` : "";
  return html`<section class="panel fc-panel" aria-labelledby="fc-h">
    <div class="section-head" style="margin:0"><h2 id="fc-h">${date ? `Forecast for ${short(date)}` : "Four-week forecast"}</h2><span class="meta">If you keep to the plan</span></div>
    ${rows.length ? html`<div class="fc">${forecastRows(rows, { date, fixes: c.fixes, fix: true })}</div>` : html`<p class="fineprint">Pick target companies in Settings and the forecast shows the techniques their sets lean on</p>`}
    ${hidden > 0 ? html`<p class="fc-more">${plural(hidden, "more technique")}${behind.length > rows.length ? "" : ", all on track"}</p>` : ""}
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
      <p class="fineprint">${own ? `Sessions are sized from these times, not the targets, and they update after every solve. ${p.habit ?? ""}` : "We'll use your own times after 5 solves; until then sessions are sized from the targets"}</p>
    </section>
    <section class="panel" aria-labelledby="in-h">
      <div class="section-head" style="margin:0"><h2 id="in-h">Practice insights</h2><a class="link text-small" href="${ROUTES.progress}#insights">All insights</a></div>
      ${ins.length ? insightList(ins) : html`<p class="fineprint">Practice insights appear after a week or two. Each includes the observations it is based on</p>`}
    </section>
  </div>`;
}

// ---- page ----

function head(c: Ctx): SafeHtml {
  const date = c.plan.interview_date;
  const who = company(c);
  const left = c.plan.summary.days_left;
  return html`<a class="back" href="${ROUTES.today}">${icon("arrow-left")}Today</a>
    <header class="plan-head">
      <div><h1>${date ? `Plan to ${short(date)}` : "Your next 4 weeks"}</h1>
        <p class="lede">${date ? html`<b>${who ? `${who} interview` : "Interview"} in ${plural(left ?? 0, "day")}.</b> Sessions use your available hours and usual solving time` : "Sessions use your available hours and usual solving time"}. The plan updates after each solve.</p></div>
      <div class="head-actions"><button type="button" class="btn btn-ghost" data-act="avail" aria-keyshortcuts="a">${icon("clock-3")}Availability ${kbd("a")}</button><button type="button" class="btn btn-secondary" data-act="sync" aria-keyshortcuts="c">${icon("calendar-plus")}Add to calendar</button></div>
    </header>`;
}

function toolbar(c: Ctx, g: Grid): SafeHtml {
  const p = readPrefs().plan;
  const wd = p.dailyMinutes ?? 60;
  const we = p.weekendMinutes ?? wd;
  const first = g.days[0]?.date ?? c.plan.start;
  const last = g.days.at(-1)?.date ?? first;
  const range =
    view === "month"
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
  const stepper = (k: "wd" | "we", v: number, steps: number[], label: string) =>
    html`<span class="bg"><span id="${k}-l">${label}</span><span class="stepper" role="group" aria-labelledby="${k}-l"><button type="button" data-step="${k}" data-by="-1" aria-label="Less ${label.toLowerCase()} time" ${v <= (steps[0] ?? 0) ? "disabled" : ""}>${icon("minus")}</button><output aria-live="off">${fmtM(v)}</output><button type="button" data-step="${k}" data-by="1" aria-label="More ${label.toLowerCase()} time" ${v >= (steps.at(-1) ?? 0) ? "disabled" : ""}>${icon("plus")}</button></span></span>`;
  const n = cols();
  return html`<div class="cal-bar">
    <div class="nav2"><button type="button" class="icon-btn" data-nav="-1" aria-label="Previous ${n === 7 ? "week" : "4 days"} ( [ )" ${offset === 0 || view === "month" ? "disabled" : ""}>${icon("chevron-left")}</button><button type="button" class="icon-btn" data-nav="1" aria-label="Next ${n === 7 ? "week" : "4 days"} ( ] )" ${offset + n >= c.plan.days.length || view === "month" ? "disabled" : ""}>${icon("chevron-right")}</button></div>
    <button type="button" class="btn btn-secondary btn-sm todaybtn" data-today aria-keyshortcuts="t">Today ${kbd("t")}</button>
    <h2 id="cal-h">${range}</h2>
    <div class="budget" role="group" aria-labelledby="dt-l"><span class="bl" id="dt-l">Daily time</span>${stepper("wd", wd, WEEKDAY_STEPS, "Weekdays")}${stepper("we", we, WEEKEND_STEPS, "Weekends")}</div>
    <div class="seg" role="group" aria-label="View"><button type="button" data-view="week" aria-pressed="${view === "week"}">${n === 7 ? "Week" : "4 days"}</button><button type="button" data-view="month" aria-pressed="${view === "month"}">Month</button></div>
  </div>
  <div data-live-host></div>`;
}

function emptyState(c: Ctx): SafeHtml {
  const sug = c.habits?.history.suggestion;
  return html`${head(c)}
    <div class="panel state-panel">
      <div><h2>When do you usually practice?</h2>
        <p>${sug ? html`${raw(sug.text.replace(/\*\*(.+?)\*\*/g, (_m, x: string) => `<b>${x.replace(/[<>&]/g, "")}</b>`))}` : "Tell myleet when you can practice and it lays out every session from now to your interview. For example, choose weekday evenings or weekend mornings"}</p>
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
        ${view === "week" ? weekGrid(c, g) : monthGrid(c)}${agenda(c)}
        <div class="legend cal-legend" aria-label="Session mix colours"><span><i style="background:var(--mix-review)"></i>Reviews</span><span><i style="background:var(--mix-weak)"></i>Weak spot</span><span><i style="background:var(--mix-new)"></i>New topic</span><span><i style="background:var(--mix-progress)"></i>In progress</span><span><i style="background:var(--mix-sharp)"></i>Keep sharp</span><span><i style="background:var(--mix-mock)"></i>Mock interview</span><span><i class="lg-check"></i>Check-in</span><span><i style="background:var(--window);box-shadow:inset 0 0 0 1px var(--window-edge)"></i>Your windows</span><span class="hint">Drag a session, or focus it and press Space, to move it. Day menu (…) takes a day off</span></div>
      </section>
      <div class="route">${profile(c)}${forecast(c)}</div>
      ${you(c)}
    </div><div class="pop" data-pop role="dialog" aria-modal="false" aria-labelledby="pop-h" hidden></div>`,
  );
  placeLive();
  placeBracket();
  if (openPopId) openPop(openPopId);
}

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
  const all = [...prof.querySelectorAll<HTMLElement>(".pcol")];
  const a = all[offset];
  const b = all[Math.min(all.length - 1, offset + cols() - 1)];
  if (!a || !b || view === "month") return void (br.style.display = "none");
  const base = prof.getBoundingClientRect();
  br.style.left = `${a.getBoundingClientRect().left - base.left}px`;
  br.style.width = `${b.getBoundingClientRect().right - a.getBoundingClientRect().left}px`;
}

// ---- morphing between plans (state feedback, 240 ms, interruptible) ----

type Snap = Map<string, Record<string, string>>;
const MORPH: [string, (el: HTMLElement) => string | null, string[]][] = [
  [".ses[data-ses]", (el) => el.dataset.ses ?? null, ["top", "height"]],
  [".pcol", (el) => `p${el.dataset.p}`, []],
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
      if (sel === ".pcol") out.set(`${k}b`, { height: getComputedStyle(el.querySelector(".b") ?? el).height });
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
      if (sel === ".pcol") {
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
  offset = Math.min(offset, Math.max(0, ctx.plan.days.length - 1));
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

/** Today's planned sessions, for the session reminders (shell.ts). */
function rememberSessions(p: Plan): void {
  const day = p.days[0];
  try {
    localStorage.setItem(
      "myleet:sessions",
      JSON.stringify({ day: day?.date, sessions: (day?.sessions ?? []).map((s) => ({ start_ms: s.start_ms, title: s.title, minutes: s.minutes })) }),
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

function openPop(id: string, opts: { move?: boolean } = {}): void {
  const c = ctx;
  const pop = $("[data-pop]");
  const hit = findSession(id);
  if (!c || !pop || !hit) return;
  const [d, s] = hit;
  openPopId = id;
  const a = minuteOf(s.start_ms);
  const len = Math.round((s.end_ms - s.start_ms) / 60000);
  const isToday = d.date === c.plan.start && d.sessions[0] === s;
  const itemHref = (i: PlanSession["items"][number]) =>
    i.problem ? sessionHref(i.problem, d.date) : i.note ? noteHref(i.note) : i.kind === "mock" ? ROUTES.mock : ROUTES.today;
  const targets = opts.move ? moveTargets(c, d, s) : [];
  render(
    pop,
    html`<div class="pop-head"><div><h3 id="pop-h">${longDay(d.date)}</h3><p>${span(a, a + len)}, about ${fmtM(s.minutes)}${s.moved_from ? `. Moved from ${dayName(s.moved_from)}` : ""}</p></div><button type="button" class="icon-btn" data-pop-close aria-label="Close (Esc)">${icon("x")}</button></div>
      ${mixBar(s.items, { tall: true })}
      <ol class="items" aria-label="Why each problem is here">${s.items.map(
        (i) => html`<li class="item"><a class="ti" href="${itemHref(i)}">${i.title}</a><span class="m">${i.minutes}m</span>${reasonLine(i)}</li>`,
      )}</ol>
      <p class="pop-sum">Reviews come first, followed by your weakest technique and new topics. Time estimates use your usual solving time</p>
      ${opts.move
        ? html`<div class="moveto"><h4>Move to</h4>${targets.length ? html`<ul>${targets.map((t) => html`<li><button type="button" class="btn btn-ghost btn-sm" data-move-to="${t.day.date}|${t.start}">${DAY_SHORT[weekdayIndex(t.day.date)]} ${short(t.day.date)}, ${span(t.start, t.start + len)}</button></li>`)}</ul>` : html`<p class="fineprint">No other window in the next week has room. Add one in Availability</p>`}</div>`
        : html`<div class="pop-foot"><button type="button" class="btn btn-secondary btn-sm" data-pop-move>${icon("move")}Move</button><button type="button" class="btn btn-ghost btn-sm" data-pop-skip>Skip this session</button>${
            isToday ? html`<a class="btn btn-primary btn-sm" href="${startHref(s, d.date)}" data-start>Start session ${kbd("s")}</a>` : ""
          }</div>`}`,
  );
  pop.hidden = false;
  const anchor = $<HTMLElement>(`[data-ses="${id}"]:not([hidden])`, root() ?? document);
  const host = root();
  if (anchor && host && !matchMedia("(max-width: 760px)").matches) {
    const hr = host.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    const right = r.right + 12 + 384 < innerWidth - 8;
    pop.style.left = `${(right ? r.right + 12 : Math.max(8, r.left - 12 - 384)) - hr.left}px`;
    pop.style.top = `${Math.max(r.top - 40, 70) - hr.top}px`;
    pop.style.setProperty("--origin", right ? "left top" : "right top");
  }
  ($("[data-pop-close]", pop) as HTMLElement | null)?.focus({ preventScroll: true });
}

function closePop(): void {
  const pop = $("[data-pop]");
  if (!pop || pop.hidden) return;
  pop.hidden = true;
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

// ---- dragging a session (pointer) ----

interface Drag {
  el: HTMLElement;
  id: string;
  pointer: number;
  x0: number;
  y0: number;
  top0: number;
  minutes: number;
  lifted: boolean;
  ghost?: HTMLElement;
  tip?: HTMLElement;
  target?: { date: string; start: number } | undefined;
}
let drag: Drag | null = null;

function gridGeom(): { g: Grid; body: HTMLElement; cols: HTMLElement[] } | null {
  const body = $<HTMLElement>(".wk-body");
  if (!ctx || !body) return null;
  return { g: grid(ctx), body, cols: [...body.querySelectorAll<HTMLElement>(".col")] };
}

function onPointerDown(e: PointerEvent): void {
  const el = (e.target as Element).closest<HTMLElement>(".wk-body .ses:not(.done)");
  if (!el || e.button !== 0 || (e.target as Element).closest("a,button")) return;
  const hit = findSession(el.dataset.ses ?? "");
  if (!hit) return;
  el.classList.add("pressed");
  el.setPointerCapture(e.pointerId);
  drag = { el, id: hit[1].id, pointer: e.pointerId, x0: e.clientX, y0: e.clientY, top0: el.offsetTop, minutes: Math.round((hit[1].end_ms - hit[1].start_ms) / 60000), lifted: false };
}

function onPointerMove(e: PointerEvent): void {
  if (!drag || e.pointerId !== drag.pointer || !ctx) return;
  const dx = e.clientX - drag.x0;
  const dy = e.clientY - drag.y0;
  if (!drag.lifted) {
    if (Math.hypot(dx, dy) < 6) return;
    drag.lifted = true;
    closePop();
    drag.el.classList.add("lifted");
    drag.ghost = document.createElement("div");
    drag.ghost.className = "ghost-ses";
    drag.ghost.style.cssText = `top:${drag.top0}px;height:${drag.el.offsetHeight}px`;
    drag.el.closest(".col")?.append(drag.ghost);
    drag.tip = document.createElement("div");
    drag.tip.className = "dragtip on-wall";
    $(".wk-body")?.append(drag.tip);
  }
  drag.el.style.transition = "none";
  drag.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.02)`;
  const geo = gridGeom();
  if (!geo) return;
  const col = geo.cols.find((cEl) => {
    const r = cEl.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX < r.right;
  });
  geo.body.querySelectorAll(".win.target").forEach((w) => w.classList.remove("target"));
  drag.target = undefined;
  if (!col || col.classList.contains("off")) return void (drag.tip && (drag.tip.hidden = true));
  const day = geo.g.days[Number(col.dataset.day)];
  if (!day) return;
  const minute = minuteAt(drag.top0 + dy, geo.g.bs, geo.g.hour, FOLD);
  const nowMin = day.date === ctx.plan.start ? minuteOf(ctx.now.getTime()) : 0;
  const t = dropTarget(windowsOf(day), minute, drag.minutes, nowMin);
  if (!t || !drag.tip) return void (drag.tip && (drag.tip.hidden = true));
  col.querySelector(`.win[data-start="${t.win.start}"]`)?.classList.add("target");
  drag.target = { date: day.date, start: t.start };
  const label = `${DAY_SHORT[weekdayIndex(day.date)]} ${span(t.start, t.start + drag.minutes)}`;
  drag.tip.hidden = false;
  drag.tip.textContent = label;
  drag.tip.style.left = `${col.offsetLeft + 6}px`;
  drag.tip.style.top = `${Math.max(0, yOf(t.start, geo.g.bs, geo.g.hour, FOLD) - 30)}px`;
  const tEl = drag.el.querySelector(".t");
  if (tEl) tEl.textContent = span(t.start, t.start + drag.minutes);
}

function endDrag(e: PointerEvent, cancelled = false): void {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  d.el.classList.remove("pressed");
  if (!d.lifted) {
    if (!cancelled) openPop(d.id);
    return;
  }
  d.tip?.remove();
  document.querySelectorAll(".win.target").forEach((w) => w.classList.remove("target"));
  const target = cancelled ? undefined : d.target;
  const hit = findSession(d.id);
  const same = target && hit && target.date === hit[0].date && target.start === minuteOf(hit[1].start_ms);
  if (!target || same) {
    // Back along the same path to where it came from.
    const settle = () => {
      d.el.classList.remove("lifted");
      d.ghost?.remove();
      d.el.style.transition = "";
      d.el.style.transform = "";
      paint();
    };
    if (reduced()) return settle();
    d.el.style.transition = `transform var(--dur-base) var(--ease-spring)`;
    d.el.style.transform = "translate(0, 0)";
    setTimeout(settle, 240);
    return;
  }
  const from = d.el.getBoundingClientRect();
  applyMove(d.id, target.date, target.start);
  // Settle from the release point: FLIP the moved block into its new slot.
  const moved = [...document.querySelectorAll<HTMLElement>(`.wk-body .ses[data-date="${target.date}"]`)].find((el) => {
    const s = findSession(el.dataset.ses ?? "");
    return s && minuteOf(s[1].start_ms) === target.start;
  });
  if (moved && !reduced()) {
    const to = moved.getBoundingClientRect();
    moved.animate(
      [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(1.02)`, boxShadow: "var(--shadow-md)" }, { transform: "none", boxShadow: "none" }],
      { duration: 240, easing: getComputedStyle(document.documentElement).getPropertyValue("--ease-spring").trim() || "ease-out" },
    );
  }
  moved?.focus({ preventScroll: true });
}

// ---- moving a session (keyboard) ----

let kb: { id: string; at: KeyMove; wins: Win[][]; days: PlanDay[] } | null = null;

function kbTarget(): { day: PlanDay; start: number } | null {
  if (!kb || !ctx) return null;
  const day = kb.days[kb.at.day];
  const w = kb.wins[kb.at.day]?.[kb.at.win];
  const s = findSession(kb.id)?.[1];
  if (!day || !w || !s) return null;
  const t = dropTarget([w], w.start, Math.round((s.end_ms - s.start_ms) / 60000));
  return t ? { day, start: t.start } : null;
}

function kbShow(): void {
  document.querySelectorAll(".win.target").forEach((w) => w.classList.remove("target"));
  const t = kbTarget();
  if (!kb || !t) return;
  const win = kb.wins[kb.at.day]?.[kb.at.win];
  $(`.wk-body .col[data-date="${t.day.date}"] .win[data-start="${win?.start}"]`)?.classList.add("target");
  const s = findSession(kb.id)?.[1];
  const len = s ? Math.round((s.end_ms - s.start_ms) / 60000) : 0;
  say(`${dayName(t.day.date)} ${span(t.start, t.start + len)}. Space or Enter to move here, Escape to cancel`);
}

function kbLift(el: HTMLElement): void {
  const c = ctx;
  const hit = findSession(el.dataset.ses ?? "");
  if (!c || !hit) return;
  const days = c.plan.days.slice(offset, offset + cols());
  const nowMin = minuteOf(c.now.getTime());
  const wins = days.map((d) => (d.off ? [] : windowsOf(d).map((w) => (d.date === c.plan.start ? { start: Math.max(w.start, nowMin), end: w.end } : w)).filter((w) => w.end - w.start >= 5)));
  const di = Math.max(0, days.findIndex((d) => d.date === hit[0].date));
  const len = Math.round((hit[1].end_ms - hit[1].start_ms) / 60000);
  const a = minuteOf(hit[1].start_ms);
  const wi = Math.max(0, (wins[di] ?? []).findIndex((w) => a >= w.start && a < w.end));
  kb = { id: hit[1].id, at: { day: di, win: wi }, wins, days };
  el.classList.add("kb-lifted");
  say(`Picked up ${span(a, a + len)} on ${dayName(hit[0].date)}. Arrows choose a window: left and right change day, up and down step through its windows. Space drops, Escape cancels`);
}

function kbEnd(drop: boolean): void {
  if (!kb) return;
  const t = drop ? kbTarget() : null;
  const id = kb.id;
  kb = null;
  document.querySelectorAll(".win.target").forEach((w) => w.classList.remove("target"));
  $(`[data-ses="${id}"]`)?.classList.remove("kb-lifted");
  if (!t) return say("Move cancelled");
  const s = findSession(id);
  if (s && s[0].date === t.day.date && minuteOf(s[1].start_ms) === t.start) return say("Left where it was");
  applyMove(id, t.day.date, t.start);
  const moved = [...document.querySelectorAll<HTMLElement>(`.wk-body .ses[data-date="${t.day.date}"]`)].find((el) => {
    const x = findSession(el.dataset.ses ?? "");
    return x && minuteOf(x[1].start_ms) === t.start;
  });
  moved?.focus();
}

// ---- availability panel ----

function openDrawer(): void {
  const d = $<HTMLElement>("[data-av-drawer]");
  if (!d || !ctx) return;
  if (!d.hidden) return void d.querySelector<HTMLElement>("button")?.focus();
  render(
    d,
    html`<div class="dr-head"><div><h2 id="dr-h">When you practice</h2><p>Your plan updates as you change your available hours</p></div><button type="button" class="icon-btn" data-drawer-close aria-label="Close (Esc)">${icon("x")}</button></div>
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
  if (!d || d.hidden) return;
  const done = () => {
    d.hidden = true;
    d.classList.remove("is-leaving");
    editor?.destroy();
    editor = null;
    $<HTMLElement>('[data-act="avail"]')?.focus();
  };
  if (reduced()) return done();
  d.classList.add("is-leaving");
  setTimeout(done, 240);
}

function openSync(): void {
  const c = ctx;
  void openCalendarSync(() => {
    if (!c) return null;
    const next = c.plan.days.find((d) => d.sessions.length);
    if (!next) return null;
    const one = { ...c.plan, days: [{ ...next, sessions: next.sessions.slice(0, 1) }] };
    return c.t.planIcs(one, { site: location.origin, alarm_minutes: readPrefs().plan.reminderMinutes });
  });
}

// ---- wiring ----

function goTo(index: number, openFirst = false): void {
  if (!ctx) return;
  const n = cols();
  view = "week";
  offset = Math.max(0, Math.min(index, ctx.plan.days.length - 1));
  if (n === 4 || offset > 0) offset = Math.max(0, Math.min(offset, ctx.plan.days.length - n));
  if (index < offset || index >= offset + n) offset = index;
  const day = ctx.plan.days[index];
  openPopId = null;
  paint();
  if (!day) return;
  if (openFirst && day.sessions[0]) openPop(day.sessions[0].id);
  else $<HTMLElement>(`.dh[data-date="${day.date}"]`)?.focus();
}

function onClick(e: MouseEvent): void {
  if (!root() || !ctx) return;
  const t = e.target as Element;
  const a = t.closest<HTMLElement>("[data-act],[data-step],[data-fix],[data-view],[data-nav],[data-today],[data-daymenu],[data-dayoff],[data-shorter],[data-goto],.pcol,.ag-ses[data-ses],[data-pop-close],[data-pop-move],[data-pop-skip],[data-move-to],[data-note-act],[data-note-dismiss],[data-use-suggest],[data-drawer-close],[data-start-href]");
  if (!t.closest(".daymenu-pop") && !t.closest("[data-daymenu]")) closeDayMenu();
  if (!a) {
    if (!t.closest("[data-pop]") && !t.closest(".ses") && !t.closest(".toast")) closePop();
    return;
  }
  const d = a.dataset;
  if (d.startHref) return void (location.href = d.startHref);
  if (d.act === "avail") return (closeDayMenu(), openDrawer());
  if (d.act === "sync") return openSync();
  if (a.matches("[data-drawer-close]")) return closeDrawer();
  if (d.step) {
    const p = readPrefs().plan;
    const k = d.step as "wd" | "we";
    const cur = k === "wd" ? (p.dailyMinutes ?? 60) : (p.weekendMinutes ?? p.dailyMinutes ?? 60);
    return setBudget(k, step(k === "wd" ? WEEKDAY_STEPS : WEEKEND_STEPS, cur, Number(d.by) > 0 ? 1 : -1));
  }
  if (d.fix) return setBudget("wd", Number(d.fix));
  if (d.view) {
    view = d.view === "month" ? "month" : "week";
    history.replaceState(history.state, "", view === "month" ? `${location.pathname}?view=month` : location.pathname);
    return paint();
  }
  if (d.nav) {
    offset = Math.max(0, Math.min(ctx.plan.days.length - 1, offset + Number(d.nav) * cols()));
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
    if (d.noteAct === "weekday_minutes") return setBudget("wd", Number(d.value));
    if (d.noteAct === "availability") return openDrawer();
    if (d.noteAct === "set_date") return void (location.href = `${ROUTES.settings}#plan`);
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
      kb.at = stepMove(kb.at, e.key, kb.wins);
      return kbShow();
    }
    if (e.key === " " || e.key === "Enter") return (e.preventDefault(), kbEnd(true));
    return;
  }
  if (ses && e.key === " ") return (e.preventDefault(), kbLift(ses), kbShow());
  if (ses && e.key === "Enter") return (e.preventDefault(), openPop(ses.dataset.ses ?? ""));
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
    <div class="panel state-panel" role="alert" style="grid-template-columns:1fr"><div><h2>Couldn't build the plan</h2>
      <p>${navigator.onLine ? `The planner stopped before it finished (${err instanceof Error ? err.message : "unknown error"}).` : "You're offline and the curriculum isn't cached on this device yet"} Your progress and your settings are safe, and Today's queue works as usual</p>
      <div class="btns"><button type="button" class="btn btn-primary" data-retry>Try again</button><a class="btn btn-secondary" href="${ROUTES.today}">Go to Today</a></div></div></div>`,
  );
  el.querySelector("[data-retry]")?.addEventListener("click", () => void init());
}

async function init(): Promise<void> {
  if (!root()) return;
  view = new URLSearchParams(location.search).get("view") === "month" ? "month" : "week";
  offset = 0;
  openPopId = null;
  liveText = "";
  try {
    const [t, cat, events] = await Promise.all([loadTrainer(), loadCatalog(), readEvents()]);
    const now = new Date();
    const plan = t.plan(events, planSettings(), { now: now.getTime() });
    let habits: Habits | null = null;
    try {
      habits = t.habits(events, { now: now.getTime(), limit: 3 });
    } catch {
      habits = null;
    }
    ctx = { t, cat, events, now, plan, fixes: null, habits };
    rememberSessions(plan);
    const hash = location.hash.slice(1);
    const hi = /^\d{4}-\d{2}-\d{2}$/.test(hash) ? plan.days.findIndex((d) => d.date === hash) : -1;
    if (hi >= 0) goTo(hi, true);
    else paint();
    computeFixes(ctx);
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
  addEventListener("resize", () => {
    if (!root() || !ctx) return;
    if (cols() !== wasNarrow) {
      wasNarrow = cols();
      paint();
    } else placeBracket();
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
document.addEventListener("astro:before-swap", () => {
  closeDrawer();
  ctx = undefined;
});
