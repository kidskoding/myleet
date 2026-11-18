// Progress (/progress): streak, mastery, heatmap, review calendar, modules, weak spots,
// recent attempts, skills, milestones and the reset. Built from local progress and the wasm core.
import { navigate } from "astro:transitions/client";
import { allAnnotations } from "../lib/annotations";
import { attempts as toAttempts, finishOf, parseEvents, type Attempt } from "../lib/attempts";
import { loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { sentenceCase } from "../lib/display";
import { CAUSE_TEXT } from "../lib/plan";
import { planSettings, readPrefs, updatePrefs } from "../lib/prefs";
import { apiTransport, clearEvents, exportEvents, readEvents } from "../lib/progress";
import {
  bestStreak,
  dueByDay,
  dueWithin,
  firstWhere,
  insights,
  masteryCounts,
  milestoneList,
  monthGrid,
  monthLabels,
  moduleRows,
  nextMilestone,
  orderMilestones,
  skillLevel,
  streakNext,
  stripDays,
  topWeakSpot,
  weeklyTable,
  weekStarts,
  type DueItem,
  type MilestoneFacts,
  type SkillLevel,
} from "../lib/progress-view";
import { reminderSupport, requestReminderPermission } from "../lib/reminders";
import { moduleHref, noteHref, problemHref, ROUTES } from "../lib/routes";
import { addDays, localDay, recordStats, STREAK_MILESTONES } from "../lib/streak";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import type { ProblemMeta, Skill, State, Stats } from "../lib/types";
import { bar, formatDuration, formatMinutes, plural, tag } from "../lib/ui/bits";
import { heatmap } from "../lib/ui/heatmap";
import { signedIn } from "../lib/account";
import { featureGate, gateSteps } from "../lib/ui/guest-gate";
import { html, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { displayRung, ladder } from "../lib/ui/ladder";
import { closeDialog, errorPanel, hideBanner, openDialog, showBanner, toast } from "../lib/ui/overlay";
import { signupHref } from "../lib/access";
import { viewEvents } from "../lib/sample";

const WEEKS = 48;
const MILESTONE_SEEN = "myleet:milestone-seen";
const CORE_MODULES = 13;
const DAY_LIST_MAX = 8;
const PRACTICE_MODES = new Set(["practice", "drill", "interview"]);

interface Ctx {
  t: TrainerApi;
  cat: LoadedCatalog;
  events: string;
  states: Record<string, State>;
  stats: Stats;
  sample?: boolean;
  today: string;
  now: Date;
}

let ctx: Ctx | null = null;
let cal: { y: number; m: number; sel: string } | null = null;
let remindOpen = false;
let remindState: "ask" | "denied" | "unsupported" = "ask";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const shortDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const longDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
const dayOf = (ms: number) => localDay(new Date(ms));
const bold = (s: string): SafeHtml => html`${s.split("**").map((p, i) => (i % 2 ? html`<strong>${p}</strong>` : p))}`;

function where(c: Ctx, p: ProblemMeta | undefined): string {
  if (!p) return "";
  const m = c.cat.catalog.modules[p.module];
  if (!m || m.bank) return "Practice set";
  const t = m.techniques[p.technique];
  return [sentenceCase(m.title), t ? sentenceCase(t.title) : ""].filter(Boolean).join(", ");
}

const targetSecs = (c: Ctx, id: string) => c.cat.byId.get(id)?.time_target_secs ?? 1500;

function streakPanel(c: Ctx, best: number): SafeHtml {
  const n = c.stats.streak;
  const strip = stripDays(c.stats.heatmap, c.today);
  const on = strip.filter((d) => d.on).length;
  const next = nextMilestone(n, STREAK_MILESTONES);
  const r = readPrefs().reminders;
  const time = new Date(`2000-01-01T${r.time}:00`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return html`<section class="panel" aria-labelledby="st">
    <h2 id="st">Streak</h2>
    ${n > 0
      ? html`<p class="big"><span class="num">${n}</span><span>${n === 1 ? "day" : "days"}, ${n >= best ? "your best" : `best ${best}`}</span></p>`
      : html`<p class="big"><span class="num">0</span><span>days${best ? `, best ${best}` : ""}</span></p>`}
    <div class="strip" role="img" aria-label="Last 14 days: practiced on ${on} of 14">${strip.map((d) => html`<i class="${d.on ? "on" : ""}${d.day === c.today ? " today" : ""}" title="${shortDay(d.day)}${d.on ? ", practiced" : ""}"></i>`)}</div>
    <div class="strip-l"><span>${shortDay(strip[0]?.day ?? c.today)}</span><span>Today</span></div>
    <p class="next">${streakNext(n, next, c.stats.rest_days ?? [])}
      ${r.on
        ? html`<span>Reminder at ${time} on days you haven't practiced. <button class="link" type="button" data-remind-open>Change</button></span>`
        : html`<button class="link" type="button" data-remind-open>Set a reminder</button>`}</p>
  </section>`;
}

function masteryPanel(c: Ctx): SafeHtml {
  const k = masteryCounts(c.cat.catalog, c.states);
  const f = (n: number) => n / Math.max(1, k.total);
  return html`<section class="panel" aria-labelledby="ms">
    <h2 id="ms">Mastery</h2>
    <p class="big"><span class="num">${k.mastered}</span><span>of ${k.total} mastered</span></p>
    <div class="mbar">${bar(
      [
        { value: f(k.mastered), kind: "m" },
        { value: f(k.climbing), kind: "c" },
        { value: f(k.started), kind: "s" },
      ],
      `${k.mastered} mastered, ${k.climbing} leveling up, ${k.started} started, ${k.notStarted} not started`,
    )}</div>
    <div class="legend"><span><i class="lg-m"></i>Mastered ${k.mastered}</span><span><i class="lg-c"></i>Leveling up ${k.climbing}</span><span><i class="lg-s"></i>Started ${k.started}</span><span><i class="lg-n"></i>Not started ${k.notStarted}</span></div>
    <p class="next">A problem is mastered once you solve it cleanly at level 4, two weeks after your last clean pass</p>
  </section>`;
}

function remindPanel(): SafeHtml {
  if (!remindOpen) return html``;
  const time = readPrefs().reminders.time;
  if (remindState === "denied")
    return html`<section class="panel remind" role="status">${icon("bell")}<p><strong>Notifications are blocked for this site</strong> Allow them in your browser's site settings, then try again</p><button class="btn btn-ghost btn-sm" type="button" data-remind-close>Close</button></section>`;
  if (remindState === "unsupported")
    return html`<section class="panel remind" role="status">${icon("bell")}<p><strong>This browser can't show notifications here</strong> On iPhone and iPad, add myleet to your Home Screen (Share, then Add to Home Screen) and open it from there</p><button class="btn btn-ghost btn-sm" type="button" data-remind-close>Close</button></section>`;
  return html`<section class="panel remind" aria-labelledby="rm">${icon("bell")}
    <p id="rm"><strong>Want a nudge on days you haven't practiced?</strong> One browser notification at the time you pick. Nothing on days you've already solved</p>
    <label class="visually-hidden" for="rt">Reminder time</label><input class="input" id="rt" type="time" value="${time}" />
    <button class="btn btn-ghost btn-sm" type="button" data-remind-close>Not now</button>
    <button class="btn btn-primary btn-sm" type="button" data-remind-on>Turn on reminders</button>
  </section>`;
}

function heatSection(c: Ctx): SafeHtml {
  const starts = weekStarts(c.today, WEEKS);
  const labels = monthLabels(starts);
  const from = starts[0] ?? c.today;
  const activeDays = Object.entries(c.stats.heatmap).filter(([d, v]) => v > 0 && d >= from && d <= c.today).length;
  const rows = weeklyTable(c.stats.heatmap, c.today, WEEKS).filter((w) => w.solves > 0);
  return html`<section class="sec" aria-labelledby="hm">
    <div class="section-head"><h2 id="hm">Practice, last ${WEEKS} weeks</h2><span class="meta">${plural(activeDays, "active day")}</span></div>
    <div class="panel heatwrap">
      <div class="heatscroll" data-heatscroll>
        <div class="months" aria-hidden="true">${labels.map(([i, m], k) => html`<span style="grid-column:${i + 1} / ${(labels[k + 1]?.[0] ?? WEEKS) + 1}">${m}</span>`)}</div>
        <div class="heatrow"><div class="days" aria-hidden="true"><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>${heatmap(c.stats.heatmap, { weeks: WEEKS, today: c.today, label: `Problems solved per day over ${WEEKS} weeks: ${activeDays} active days. A table follows` })}</div>
      </div>
      <div class="heatfoot">
        <details class="alt"><summary>Show as a table</summary>
          ${rows.length
            ? html`<table class="otable wk-table"><thead><tr><th scope="col">Week of</th><th scope="col">Solves</th><th scope="col">Days practiced</th></tr></thead><tbody>${rows.map((w) => html`<tr><td>${shortDay(w.from)}</td><td>${w.solves}</td><td>${w.days}</td></tr>`)}</tbody></table>`
            : html`<p>No solves in the last ${WEEKS} weeks</p>`}
        </details>
        <span class="scale" aria-hidden="true">Less <i style="background:var(--heat-0)"></i><i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i> More</span>
      </div>
    </div>
  </section>`;
}

function dayList(c: Ctx, by: Map<string, DueItem[]>, day: string): SafeHtml {
  const items = by.get(day) ?? [];
  const mins = Math.round(items.reduce((n, x) => n + targetSecs(c, x.id), 0) / 60);
  const head = html`<h3>${day === c.today ? `Today, ${shortDay(day)}` : longDay(day)}</h3>`;
  if (day < c.today) return html`${head}<p>Past day. Reviews show from today on</p>`;
  if (!items.length) return html`${head}<p>No reviews are due. You can work on new problems today</p>`;
  const more = items.length - DAY_LIST_MAX;
  return html`${head}<p>${plural(items.length, "review")}, about ${formatMinutes(mins)}. Most overdue first</p>
    <ol>${items.slice(0, DAY_LIST_MAX).map((x) => {
      const p = c.cat.byId.get(x.id);
      const late = x.overdue ? `, ${x.overdue === 1 ? "1 day" : `${x.overdue} days`} overdue` : "";
      return html`<li><a href="${problemHref(x.id)}"><span>${p?.title ?? x.id}<small>${where(c, p)}${late}</small></span>${ladder({ rung: displayRung(x.state.rung), due: day === c.today })}</a></li>`;
    })}</ol>${more > 0 ? html`<p class="more">And ${more} more. <a class="link" href="${ROUTES.today}">Today</a> shows them in order</p>` : ""}`;
}

function calendarSection(c: Ctx): SafeHtml {
  cal ??= { y: c.now.getFullYear(), m: c.now.getMonth(), sel: c.today };
  const by = dueByDay(c.states, c.today);
  const week = dueWithin(by, c.today, 7);
  const cells = monthGrid(cal.y, cal.m);
  const monthName = new Date(cal.y, cal.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthDue = cells.reduce((n, d) => n + (d && d >= c.today ? (by.get(d)?.length ?? 0) : 0), 0);
  const dows = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 1 + i).toLocaleDateString(undefined, { weekday: "short" }));
  return html`<section class="sec" aria-labelledby="calh" id="calendar">
    <div class="section-head"><h2 id="calh">Review calendar</h2><span class="meta">${plural(week, "review")} due in the next 7 days</span></div>
    <div class="panel cal">
      <div>
        <div class="calhead"><h3>${monthName}<span class="cal-sub">${plural(monthDue, "review")} ahead this month</span></h3><span><button class="icon-btn" type="button" data-cal="-1" aria-label="Previous month" aria-keyshortcuts="[">${icon("arrow-left")}</button><button class="icon-btn" type="button" data-cal="1" aria-label="Next month" aria-keyshortcuts="]">${icon("arrow-right")}</button></span></div>
        <div class="calgrid" role="group" aria-label="${monthName}">${dows.map((d) => html`<span class="dow" aria-hidden="true">${d}</span>`)}${cells.map((d) => {
          if (!d) return html`<span class="pad"></span>`;
          const n = by.get(d)?.length ?? 0;
          const past = d < c.today;
          const cls = [past && "past", d === c.today && "today", !past && !n && "zero"].filter(Boolean).join(" ");
          const label = `${new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric" })}${past ? "" : `, ${n} due`}${d === c.today ? ", today" : ""}`;
          return html`<button type="button" class="${cls}" data-day="${d}" aria-label="${label}" aria-pressed="${d === cal?.sel ? "true" : "false"}" tabindex="${d === cal?.sel ? "0" : "-1"}"><span class="d">${Number(d.slice(8))}</span><span class="c">${past ? "" : n}</span></button>`;
        })}</div>
      </div>
      <div class="dayl" aria-live="polite" data-daylist>${dayList(c, by, cal.sel)}</div>
    </div>
  </section>`;
}

function modulesSection(c: Ctx): SafeHtml {
  const rows = moduleRows(c.cat.catalog, c.states);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return html`<section aria-labelledby="mm">
    <div class="section-head"><h2 id="mm">By module</h2><span class="meta">Track length is module size</span></div>
    <ol class="panel mods">${rows.map(
      (r) => html`<li class="mod"><a href="${moduleHref(r.module)}">${sentenceCase(r.module.title)}</a><span class="ct">${r.mastered} / ${r.total}</span>
        <div class="track" style="width:${((r.total / max) * 100).toFixed(1)}%">${bar(
          [
            { value: r.mastered / Math.max(1, r.total), kind: "m" },
            { value: r.climbing / Math.max(1, r.total), kind: "c" },
          ],
          `${r.mastered} mastered, ${r.climbing} leveling up, of ${r.total}`,
        )}</div></li>`,
    )}</ol>
  </section>`;
}

interface WeakRow {
  title: string;
  module: string;
  attempts: number;
  missed: number;
  drill: string | null;
}

function weakRows(c: Ctx): WeakRow[] {
  return c.stats.weakest.slice(0, 4).map((w) => {
    const m = c.cat.catalog.modules.find((x) => x.id === w.module);
    const tech = m?.techniques.find((x) => x.id === w.technique || x.title === w.technique_title);
    const ids = (tech?.problems ?? []).map((i) => c.cat.catalog.problems[i]?.id).filter((x): x is string => !!x);
    const tried = ids.filter((id) => c.states[id]?.attempts).sort((a, b) => (c.states[a]?.rung ?? 0) - (c.states[b]?.rung ?? 0) || (c.states[b]?.last_ms ?? 0) - (c.states[a]?.last_ms ?? 0));
    // shortcut: fails and hints can overlap on one attempt; capped at the attempt count.
    const missed = Math.min(w.attempts, Math.round((w.fail_rate + w.hint_rate) * w.attempts));
    return { title: sentenceCase(w.technique_title), module: sentenceCase(w.module_title), attempts: w.attempts, missed, drill: tried[0] ?? ids[0] ?? null };
  });
}

function weakSection(c: Ctx): SafeHtml {
  const rows = weakRows(c);
  const body = rows.length
    ? html`<p class="weak-lede">Where your attempts most often end with a hint, a peek, overtime or a give-up</p>
      <ol>${rows.map((r) => html`<li><a href="${r.drill ? problemHref(r.drill, "drill") : ROUTES.learn}"><strong>${r.title}</strong><span>${r.module}, ${plural(r.attempts, "attempt")}</span><span class="rate">${r.missed} of ${r.attempts} missed</span></a></li>`)}</ol>
      ${rows[0]?.drill ? html`<a class="btn btn-secondary" href="${problemHref(rows[0].drill, "drill")}">${rows.length === 1 ? `Drill ${rows[0].title}` : `Drill these ${rows.length}, one problem each`}</a>` : ""}`
    : html`<p class="weak-lede">Nothing stands out yet. A technique shows here after 3 attempts with hints, peeks, overtime or give-ups</p>`;
  return html`<section aria-labelledby="wk"><div class="section-head"><h2 id="wk">Weakest techniques</h2></div><div class="panel weak">${body}</div></section>`;
}

function recentSection(c: Ctx, atts: Attempt[]): SafeHtml {
  const done = atts.filter((a) => a.end !== null && PRACTICE_MODES.has(a.mode)).sort((a, b) => (b.end ?? 0) - (a.end ?? 0));
  const recent = done.slice(0, 3);
  if (!recent.length) return html``;
  return html`<section aria-labelledby="hh">
    <div class="section-head"><h2 id="hh">Recent attempts</h2></div>
    <ol class="panel hist queue">${recent.map((a) => {
      const p = c.cat.byId.get(a.problem);
      const n = done.filter((x) => x.problem === a.problem && x.start <= a.start).length;
      const f = finishOf(a, targetSecs(c, a.problem));
      const t = f === "clean" ? tag("pass", "Clean pass") : f === "assisted" ? tag("progress", a.hints || a.peeks ? "Hint used" : "Over time") : tag("fail", "Gave up");
      const day = dayOf(a.end ?? a.start);
      const when = day === c.today ? "Today" : shortDay(day);
      const parts = [a.mode === "interview" ? `Mock, ${when}` : when, a.elapsedMs !== null && a.passed ? formatDuration(a.elapsedMs) : "", `attempt ${n}`].filter(Boolean);
      const st = c.states[a.problem];
      // shortcut: the workspace has no history deep link yet, so Diff opens the problem; its History tab has the diff.
      return html`<li><a class="qrow" href="${problemHref(a.problem)}"><div class="qmain"><div class="title">${p?.title ?? a.problem}</div><div class="sub">${t}<span>${parts.join(", ")}</span></div></div><span class="ladder-cell">${ladder({ rung: displayRung(st?.rung ?? -1) })}</span><span class="mins">Diff</span></a></li>`;
    })}</ol>
  </section>`;
}

const LEVELS: [SkillLevel, string, number][] = [
  ["strong", "Strong", 4],
  ["solid", "Solid", 3],
  ["building", "Building", 2],
  ["shaky", "Shaky", 1],
  ["new", "New", 0],
];

function skillsSection(c: Ctx, skills: Skill[] | null, atts: Attempt[]): SafeHtml {
  const notes = insights(
    atts.filter((a) => PRACTICE_MODES.has(a.mode)).map((a) => ({ ...a, clean: finishOf(a, targetSecs(c, a.problem)) === "clean" })),
    c.now,
  );
  if (!skills) return html``;
  const spot = topWeakSpot(skills);
  const counts = new Map<SkillLevel, number>();
  for (const s of skills) counts.set(skillLevel(s), (counts.get(skillLevel(s)) ?? 0) + 1);
  const act = spot?.actions[0];
  const actHref = act?.problem ? problemHref(act.problem, act.kind === "timed_rep" || act.kind === "edge_case_redo" ? "drill" : undefined) : act?.note ? noteHref(act.note) : null;
  const ev = spot?.evidence ?? {};
  return html`<section class="sec" aria-labelledby="sk">
    <div class="section-head"><h2 id="sk">Skills</h2><span class="links"><a class="link text-small" href="/plan">Your plan</a><a class="link text-small" href="/progress/skills">All skills</a></span></div>
    <div class="skills">
      <div class="panel spot">${spot
        ? html`<div class="spot-head">${tag("weak", "Weak spot")}<span class="text-muted text-small">${sentenceCase(spot.module_title)}</span></div>
          <h3>${sentenceCase(spot.technique_title)}</h3>
          <p>${ev["attempts"] ?? 0} attempts, ${ev["clean"] ?? 0} clean${spot.cause ? html`. Most misses: <strong>${CAUSE_TEXT[spot.cause]}</strong>` : ""}</p>
          ${act ? html`<p class="spot-act">${act.reason}</p>` : ""}
          ${actHref ? html`<a class="btn btn-secondary btn-sm" href="${actHref}">${act?.kind === "read_note" ? "Read the note" : "Do the next step"}</a>` : ""}`
        : html`<h3>No weak spots</h3><p>A technique becomes a weak spot after at least 4 attempts that mostly didn't pass cleanly</p>`}
      </div>
      <div class="panel lvls">
        <h3>${skills.length} techniques by level</h3>
        <ul>${LEVELS.map(([k, label, pips]) => html`<li class="lv-${k}"><span class="pips" aria-hidden="true">${[1, 2, 3, 4].map((i) => html`<b class="${i <= pips ? "on" : ""}"></b>`)}</span>${label}<strong>${counts.get(k) ?? 0}</strong></li>`)}</ul>
      </div>
    </div>
    ${notes.length ? html`<div class="panel ins-panel"><h3>Practice insights</h3><ul>${notes.map((n) => html`<li>${bold(n.text)}</li>`)}</ul></div>` : ""}
  </section>`;
}

function notesSection(c: Ctx): SafeHtml {
  const all = allAnnotations();
  if (!all.length) return html``;
  const titles = new Map([...c.cat.catalog.guide, ...c.cat.catalog.modules.flatMap((m) => m.notes)].map((n) => [n.path, n.title]));
  return html`<section class="sec" aria-labelledby="yn">
    <div class="section-head"><h2 id="yn">Your notes</h2><span class="meta">${plural(all.length, "highlight")}, saved on this device</span></div>
    <ol class="panel yn">${all.slice(0, 6).map(
      (a) => html`<li><a href="${noteHref(a.note)}"><q>${a.quote.length > 140 ? `${a.quote.slice(0, 140)}…` : a.quote}</q>${a.text ? html`<span class="yn-text">${a.text}</span>` : ""}<span class="yn-meta">${titles.get(a.note) ?? a.note}, ${shortDay(dayOf(a.updated))}</span></a></li>`,
    )}</ol>
  </section>`;
}

function milestoneFacts(c: Ctx, atts: Attempt[], best: number): MilestoneFacts {
  const lines = c.events.split("\n").filter((l) => l.trim());
  const prefix = (i: number) => `${lines.slice(0, i).join("\n")}\n`;
  const lineTime = (i: number) => {
    try {
      return Date.parse((JSON.parse(lines[i - 1] ?? "{}") as { t?: string }).t ?? "");
    } catch {
      return Date.now();
    }
  };
  const mastered = Object.values(c.states).filter((s) => s.status === "mastered").length;
  const memo = new Map<number, Record<string, State>>();
  const statesAt = (i: number) => {
    let s = memo.get(i);
    if (!s) memo.set(i, (s = c.t.states(prefix(i))));
    return s;
  };
  const countAt = (i: number) => Object.values(statesAt(i)).filter((s) => s.status === "mastered").length;
  const reach = (k: number) => {
    if (mastered < k) return null;
    const i = firstWhere(lines.length, (j) => countAt(j) >= k);
    return i === null ? null : i;
  };
  const i1 = reach(1);
  let firstMastered: MilestoneFacts["firstMastered"] = null;
  if (i1 !== null) {
    const id = Object.entries(statesAt(i1)).find(([, s]) => s.status === "mastered")?.[0];
    firstMastered = { day: dayOf(lineTime(i1)), title: (id && c.cat.byId.get(id)?.title) || "A problem" };
  }
  const masteredOn: Record<number, string | null> = {};
  for (const k of [50, 100, 250]) {
    const i = reach(k);
    masteredOn[k] = i === null ? null : dayOf(lineTime(i));
  }

  const ended = atts.filter((a) => a.end !== null && PRACTICE_MODES.has(a.mode)).sort((a, b) => (a.end ?? 0) - (b.end ?? 0));
  const clean = ended.find((a) => finishOf(a, targetSecs(c, a.problem)) === "clean");
  const mock = atts.filter((a) => a.mode === "interview").sort((a, b) => a.start - b.start)[0];

  // Core modules: the first CORE_MODULES in book order.
  const firstTouch = new Map<number, number>();
  for (const a of atts) {
    const p = c.cat.byId.get(a.problem);
    if (!p) continue;
    const prev = firstTouch.get(p.module);
    if (prev === undefined || a.start < prev) firstTouch.set(p.module, a.start);
  }
  const core = c.cat.catalog.modules.map((m, i) => ({ m, i })).filter(({ m }) => !m.bank && m.number <= CORE_MODULES);
  const coreTimes = core.map(({ i }) => firstTouch.get(i)).filter((x): x is number => x !== undefined);

  const rows = moduleRows(c.cat.catalog, c.states);
  const done = rows.filter((r) => r.total > 0 && r.mastered === r.total);
  let module: MilestoneFacts["module"] = null;
  if (done.length) {
    const ids = (r: (typeof rows)[number]) => r.module.techniques.flatMap((t) => t.problems.map((p) => c.cat.catalog.problems[p]?.id ?? ""));
    const i = firstWhere(lines.length, (j) => done.some((r) => ids(r).every((id) => statesAt(j)[id]?.status === "mastered")));
    const r = done[0];
    if (r) module = { title: sentenceCase(r.module.title), mastered: r.mastered, total: r.total, day: i === null ? c.today : dayOf(lineTime(i)) };
  } else {
    const r = [...rows].sort((a, b) => b.mastered / Math.max(1, b.total) - a.mastered / Math.max(1, a.total))[0];
    if (r) module = { title: sentenceCase(r.module.title), mastered: r.mastered, total: r.total, day: null };
  }

  return {
    firstClean: clean ? { day: dayOf(clean.end ?? clean.start), title: c.cat.byId.get(clean.problem)?.title ?? clean.problem } : null,
    firstMastered,
    masteredOn,
    mastered,
    heat: c.stats.heatmap,
    streak: c.stats.streak,
    best,
    firstMock: mock ? { day: dayOf(mock.start), detail: c.cat.byId.get(mock.problem)?.title ?? "Mixed round" } : null,
    core: { started: coreTimes.length, total: core.length, day: coreTimes.length === core.length && coreTimes.length ? dayOf(Math.max(...coreTimes)) : null },
    module,
  };
}

function milestonesSection(c: Ctx, facts: MilestoneFacts): SafeHtml {
  const list = orderMilestones(milestoneList(facts));
  const earned = list.filter((m) => m.label === "earned").length;
  return html`<section class="sec" aria-labelledby="ah">
    <div class="section-head"><h2 id="ah">Milestones</h2><span class="meta">${earned} of ${list.length}</span></div>
    <ol class="panel ach">${list.map(
      (m) =>
        html`<li class="${m.label === "earned" ? "" : "locked"}">${tag("outline", m.label === "earned" ? shortDay(m.day ?? c.today) : m.label === "next" ? "Next" : "Later", { dot: false })}<strong>${m.name}</strong><span class="w">${m.detail}</span></li>`,
    )}</ol>
  </section>`;
}

function momentBand(c: Ctx): SafeHtml {
  const n = c.stats.streak;
  const hit = [...STREAK_MILESTONES].reverse().find((m) => n >= m);
  let seen = 0;
  try {
    seen = Number(localStorage.getItem(MILESTONE_SEEN) ?? 0);
  } catch {
    seen = Infinity;
  }
  if (!hit || hit <= seen) return html``;
  try {
    localStorage.setItem(MILESTONE_SEEN, String(hit));
  } catch {
    // Shown again next visit; harmless.
  }
  const rests = c.stats.rest_days ?? [];
  const since = addDays(c.today, -(n - 1 + rests.length));
  const solves = Object.entries(c.stats.heatmap).reduce((s, [d, v]) => (d >= since ? s + v : s), 0);
  const days = rests.length ? `You've practiced ${n} of the ${n + rests.length} days since ${shortDay(since)}` : `You've practiced every day since ${shortDay(since)}`;
  return html`<section class="moment on-wall" aria-live="polite">
    <span class="num">${n}</span>
    <div><h2>${rests.length ? `A ${n}-day streak` : `${n} days in a row`}</h2><p>${days}: ${plural(solves, "solve")} in that time</p></div>
    <button class="btn btn-secondary" type="button" data-share>Share progress card</button>
  </section>`;
}

async function build(): Promise<Ctx> {
  const [t, cat, real] = await Promise.all([loadTrainer(), loadCatalog(), readEvents()]);
  const { events, sample } = viewEvents(t, cat, real);
  const now = new Date();
  const stats = t.stats(events, { now: now.getTime() });
  if (!sample) recordStats(stats);
  return { t, cat, events, sample, states: t.states(events), stats, today: localDay(now), now };
}

function sampleBanner(sample: boolean): void {
  if (!sample) return hideBanner("sample");
  showBanner("sample", {
    icon: "trending-up",
    body: html`<strong>This is an example.</strong> Your own streak, mastery and reviews will show here`,
    actions: html`<a class="btn btn-primary btn-sm" href="${signupHref()}">Sign up to track your own</a>`,
  });
}

function renderAll(c: Ctx): void {
  const root = $("[data-progress]");
  if (!root) return;
  if (!signedIn()) {
    root.removeAttribute("aria-busy");
    root.removeAttribute("aria-label");
    hideBanner("sample");
    return render(root, featureGate("progress", c.t.placement(c.events).done));
  }
  sampleBanner(c.sample === true);
  root.removeAttribute("aria-busy");
  const k = masteryCounts(c.cat.catalog, c.states);
  const started = k.mastered + k.climbing + k.started;
  if (!started) {
    render(
      root,
      html`<section class="gate" aria-labelledby="pg-h"><h1 id="pg-h">Progress</h1><p class="lede">Your streak, mastery and reviews show up here <strong>after your first solve</strong></p>
        ${gateSteps([
          ["Your streak", "Days in a row you've practiced, also in the top bar"],
          ["Topic by topic", "Which patterns are solid and which are still leveling up"],
          ["Reviews coming due", "Each clean pass levels a problem up and brings it back a little later, until it's mastered"],
        ])}
        <div class="gate-actions"><a class="btn btn-primary btn-lg" href="${ROUTES.today}">Start today's practice</a><a class="btn btn-ghost btn-lg" href="${ROUTES.learn}">Browse the modules</a></div></section>`,
    );
    return;
  }
  const evs = parseEvents(c.events);
  const atts = toAttempts(evs);
  const best = Math.max(bestStreak(c.stats.heatmap), c.stats.streak);
  const mockProblems = atts.filter((a) => a.mode === "interview").length;
  let skills: Skill[] | null = null;
  try {
    skills = c.t.skills(c.events, planSettings(), { now: c.now.getTime() }).techniques;
  } catch {
    skills = null;
  }
  const since = evs[0] ? shortDay(dayOf(evs[0].t)) : shortDay(c.today);
  const scroll = root.querySelector<HTMLElement>("[data-heatscroll]")?.scrollLeft;
  render(
    root,
    html`<h1>Progress</h1>
    <p class="lede">Since ${since}: ${started} problems started, ${k.mastered} mastered${mockProblems ? `, ${plural(mockProblems, "mock problem")}` : ""}</p>
    ${momentBand(c)}
    <div class="top">${streakPanel(c, best)}${masteryPanel(c)}</div>
    <div data-remind>${remindPanel()}</div>
    ${heatSection(c)}
    ${calendarSection(c)}
    <div class="sec two">${modulesSection(c)}<div class="col">${weakSection(c)}${recentSection(c, atts)}</div></div>
    ${skillsSection(c, skills, atts)}
    ${notesSection(c)}
    ${milestonesSection(c, milestoneFacts(c, atts, best))}
    <section class="danger" aria-labelledby="rs">
      <div><h2 id="rs">Start over</h2><p>Reset clears your levels, attempts and streak on this device${document.documentElement.dataset.auth === "in" ? " and your account" : ""}. Notes highlights and settings stay. Export first if you want a copy</p></div>
      <div class="danger-actions"><button class="btn btn-ghost" type="button" data-export>${icon("download")}Export data</button><button class="btn btn-quiet-danger" type="button" data-reset>Reset progress</button></div>
    </section>`,
  );
  const sc = root.querySelector<HTMLElement>("[data-heatscroll]");
  if (sc) sc.scrollLeft = scroll ?? sc.scrollWidth;
  if (location.hash === "#calendar" && !scroll) $("#calendar")?.scrollIntoView();
}

function renderCalendar(focus = false): void {
  if (!ctx) return;
  const old = $("#calendar");
  if (!old) return;
  const tmp = document.createElement("div");
  render(tmp, calendarSection(ctx));
  const next = tmp.firstElementChild;
  if (next) old.replaceWith(next);
  if (focus) $<HTMLButtonElement>('#calendar [data-day][aria-pressed="true"]')?.focus();
}

function moveMonth(d: number): void {
  if (!cal || !ctx) return;
  const m = new Date(cal.y, cal.m + d, 1);
  cal = { y: m.getFullYear(), m: m.getMonth(), sel: localDay(m) <= ctx.today && ctx.today.slice(0, 7) === localDay(m).slice(0, 7) ? ctx.today : localDay(m) };
  renderCalendar();
}

function selectDay(day: string, focus: boolean): void {
  if (!cal) return;
  const [y, m] = day.split("-").map(Number) as [number, number];
  cal = { y, m: m - 1, sel: day };
  renderCalendar(focus);
}

async function refresh(): Promise<void> {
  if (!$("[data-progress]")) return;
  try {
    ctx = await build();
    renderAll(ctx);
  } catch {
    render(
      $("[data-progress]"),
      html`<h1>Progress</h1>${errorPanel("Couldn't read your progress", "The trainer didn't load (network error). Your progress is safe on this device")}`,
    );
  }
}

function init(): void {
  if (!$("[data-progress]")) return;
  ctx = null;
  cal = null;
  remindOpen = false;
  void refresh();
}

async function resetAll(): Promise<void> {
  const d = document.createElement("dialog");
  d.className = "dlg";
  d.setAttribute("role", "alertdialog");
  d.setAttribute("aria-labelledby", "rc");
  d.setAttribute("aria-describedby", "rcd");
  const k = ctx ? masteryCounts(ctx.cat.catalog, ctx.states) : null;
  const what = k && ctx ? `${k.mastered + k.climbing + k.started} started problems, ${k.mastered} mastered and a ${plural(ctx.stats.streak, "day")} streak will be gone` : "Your attempts and streak will be gone";
  render(
    d,
    html`<div class="dlg-head"><h2 id="rc">Reset all progress?</h2></div>
    <div class="dlg-body"><p id="rcd">${what} This can't be undone</p>
      <div class="field" style="margin-top:var(--space-5)"><label for="rc-in">Type <code>reset</code> to confirm</label><input class="input" id="rc-in" autocomplete="off" spellcheck="false" aria-describedby="rcd" /></div></div>
    <div class="dlg-actions"><button class="btn btn-secondary" type="button" value="cancel" autofocus>Cancel</button><button class="btn btn-danger" type="button" value="ok" disabled>Reset progress</button></div>`,
  );
  document.body.append(d);
  const input = d.querySelector<HTMLInputElement>("#rc-in");
  const ok = d.querySelector<HTMLButtonElement>('button[value="ok"]');
  input?.addEventListener("input", () => ok && (ok.disabled = input.value.trim().toLowerCase() !== "reset"));
  d.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button[value]");
    if (b) closeDialog(d, b.value);
  });
  d.addEventListener("close", async () => {
    const go = d.returnValue === "ok";
    d.remove();
    if (!go) return;
    try {
      if (document.documentElement.dataset.auth === "in") {
        // The account copy is replaced with nothing first, so the next sync can't bring it back.
        const api = apiTransport();
        let cur = await api.get();
        for (let i = 0; i < 3; i++) {
          const r = await api.put(cur.version, "");
          if (r.ok) break;
          cur = r.current;
          if (i === 2) throw new Error("conflict");
        }
      }
      await clearEvents();
      try {
        localStorage.removeItem("myleet:mocks");
        localStorage.removeItem(MILESTONE_SEEN);
      } catch {
        // Nothing else to clear.
      }
      recordStats({ streak: 0, heatmap: {} });
      window.dispatchEvent(new Event("myleet:progress"));
      toast("Progress reset. Today will start with the warm-up");
      void navigate(ROUTES.today);
    } catch {
      toast("Couldn't reset your account's progress. Nothing was deleted. Try again when you're online");
    }
  });
  openDialog(d);
}

async function exportData(): Promise<void> {
  const blob = await exportEvents();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `myleet-events-${localDay()}.jsonl`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function turnOnReminders(): Promise<void> {
  const time = $<HTMLInputElement>("#rt")?.value || "20:00";
  const r = await requestReminderPermission();
  if (r === "granted") {
    updatePrefs({ reminders: { on: true, time } });
    remindOpen = false;
    toast("Reminders on");
  } else remindState = r === "unsupported" ? "unsupported" : "denied";
  if (ctx) renderAll(ctx);
}

document.addEventListener("click", (e) => {
  if (!$("[data-progress]")) return;
  const t = e.target as Element;
  const day = t.closest<HTMLElement>("[data-day]")?.dataset.day;
  const month = t.closest<HTMLElement>("[data-cal]")?.dataset.cal;
  if (day) selectDay(day, true);
  else if (month) moveMonth(Number(month));
  else if (t.closest("[data-remind-open]")) {
    const s = reminderSupport();
    remindState = s === "denied" ? "denied" : s === "unsupported" ? "unsupported" : "ask";
    remindOpen = true;
    if (ctx) renderAll(ctx);
    $("[data-remind] .remind")?.scrollIntoView({ block: "nearest" });
    $<HTMLInputElement>("#rt")?.focus();
  } else if (t.closest("[data-remind-close]")) {
    remindOpen = false;
    if (ctx) renderAll(ctx);
  } else if (t.closest("[data-remind-on]")) void turnOnReminders();
  else if (t.closest("[data-share]")) void import("./share").then((m) => m.openShare());
  else if (t.closest("[data-export]")) void exportData();
  else if (t.closest("[data-reset]")) void resetAll();
  else if (t.closest("[data-retry]")) void refresh();
});

document.addEventListener("keydown", (e) => {
  if (!$("[data-progress]") || !cal || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
  const a = document.activeElement as HTMLElement | null;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
  if (e.key === "[" || e.key === "]") {
    e.preventDefault();
    moveMonth(e.key === "]" ? 1 : -1);
    return;
  }
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
  if (step && a?.closest("#calendar [data-day]")) {
    e.preventDefault();
    selectDay(addDays(cal.sel, step), true);
  }
});

document.addEventListener("astro:page-load", init);
window.addEventListener("myleet:auth", () => void init());
for (const ev of ["myleet:synced", "myleet:progress", "myleet:notes"]) addEventListener(ev, () => void refresh());
