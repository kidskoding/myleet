// Today (/app): built live from the wasm trainer and local progress.
import { navigate } from "astro:transitions/client";
import { cachedMe } from "../lib/account";
import { checkpointResults, doneToday, parseEvents, runProgress, type DoneItem } from "../lib/attempts";
import { loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { daysUntil, paceRows, shortDate } from "../lib/plan";
import { planSettings, readPrefs, updatePrefs } from "../lib/prefs";
import { appendEvent, readEvents } from "../lib/progress";
import { reminderSupport, requestReminderPermission } from "../lib/reminders";
import { noteHref, planDayHref, problemHref, ROUTES, skillHref } from "../lib/routes";
import { actionHref, inPlanOn } from "../lib/skills-view";
import { localDay, recordStats } from "../lib/streak";
import {
  BUDGETS,
  EXTRA_NEW_FOR_LONG_DAY,
  fitBudget,
  greeting,
  readBudget,
  readSkipped,
  reasonTag,
  weekStrip,
  whyLine,
  writeBudget,
  writeSkipped,
  type Budget,
} from "../lib/today";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import type { Plan, PlanItem, ProblemMeta, Skill, State, TodayEntry } from "../lib/types";
import { diff, formatDuration, formatMinutes, kbd, plural, queueRow, tag } from "../lib/ui/bits";
import { html, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { displayRung, ladder, RUNG_DAYS } from "../lib/ui/ladder";
import { bannerDismissed, hideBanner, showBanner, toast } from "../lib/ui/overlay";
import { dismissNote, forecastRows, noteDismissed, replanNote, trend, whyChips } from "../lib/ui/personal";

const CHECKIN_KEY = "myleet:checkin";
/** Above this many due reviews, Today shows only the most overdue ones. */
const BACKLOG_AT = 40;
const BACKLOG_SHOW = 12;


interface Ctx {
  t: TrainerApi;
  cat: LoadedCatalog;
  events: string;
  now: Date;
  /** Computed per paint; null if the planner failed (Today still works without it). */
  plan?: Plan | null;
  skills?: Skill[] | null;
}

/** Today's plan item for a problem: its reason, tag and why chips. */
function planItem(c: Ctx, problem: string): PlanItem | undefined {
  return c.plan?.days[0]?.sessions.flatMap((s) => s.items).find((i) => i.problem === problem);
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);

function meta(cat: LoadedCatalog, id: string): ProblemMeta | undefined {
  return cat.byId.get(id);
}

function where(cat: LoadedCatalog, p: ProblemMeta): string {
  const m = cat.catalog.modules[p.module];
  const tech = m?.techniques[p.technique];
  return [m?.title, tech?.title].filter(Boolean).join(", ");
}

/** "overdue 2d: 1-day review" reads as "Overdue 2d: 1-day review". */
const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const targetMins = (p: ProblemMeta | undefined) => Math.round((p?.time_target_secs ?? 1500) / 60);

function ago(ms: number, now: Date): string {
  const days = Math.round((new Date(localDay(now)).getTime() - new Date(localDay(new Date(ms))).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

// ---- check-in (wasm checkpoint) ----

interface ActiveCheckin {
  through: number;
  ids: string[];
  since: number;
}

function readCheckin(): ActiveCheckin | null {
  try {
    return JSON.parse(localStorage.getItem(CHECKIN_KEY) ?? "null") as ActiveCheckin | null;
  } catch {
    return null;
  }
}
function writeCheckin(v: ActiveCheckin | null): void {
  try {
    if (v) localStorage.setItem(CHECKIN_KEY, JSON.stringify(v));
    else localStorage.removeItem(CHECKIN_KEY);
  } catch {
    // Check-in lasts this visit only.
  }
}

function checkinPanel(c: Ctx): SafeHtml {
  const active = readCheckin();
  if (active) {
    const progress = runProgress(parseEvents(c.events), active.ids, "checkpoint", active.since);
    const finished = progress.filter((p) => p.finished).length;
    return html`<section class="panel checkin" aria-labelledby="ci-h">
      <div class="section-head"><h2 id="ci-h">Check-in</h2><span class="meta">${finished} of ${active.ids.length} done</span></div>
      <p>Modules 1 to ${active.through}. Solve them cold, like an interview. Anything you don't finish counts as skipped</p>
      <ol class="queue">${progress.map((p) => {
        const m = meta(c.cat, p.problem);
        const f = p.finished;
        const t = f ? (f.passed && !f.hints && !f.peeks ? tag("pass", "Clean pass") : f.passed ? tag("progress", "With help") : tag("fail", "Missed")) : p.started ? tag("progress", "Started") : undefined;
        return queueRow({ href: problemHref(p.problem, "checkpoint"), title: m?.title ?? p.problem, ...(t ? { tag: t } : {}), sub: m ? where(c.cat, m) : "", mins: `${targetMins(m)}m` });
      })}</ol>
      <div class="actions"><button class="btn btn-primary btn-sm" type="button" data-checkin-finish ${finished ? "" : "disabled"}>Finish check-in</button><button class="btn btn-ghost btn-sm" type="button" data-checkin-cancel>Cancel</button></div>
    </section>`;
  }
  const cp = c.t.checkpoint(c.events);
  if (cp.suggest_through <= 0) return html``;
  return html`<section class="panel checkin" aria-labelledby="ci-h">
    <h2 id="ci-h">Check-in on modules 1 to ${cp.suggest_through}</h2>
    <p>Review the topics you have covered in a mixed set that takes about 45 minutes. The results show what needs more practice without changing your review schedule</p>
    <div class="actions"><button class="btn btn-secondary btn-sm" type="button" data-checkin-start="${cp.suggest_through}">Start the check-in</button><button class="btn btn-ghost btn-sm" type="button" data-checkin-snooze="${cp.suggest_through}">Not now</button></div>
  </section>`;
}

// ---- plan panel ----

function companyName(cat: LoadedCatalog, slug: string | undefined): string | null {
  if (!slug) return null;
  return cat.catalog.playlists.find((p) => p.id.replace(/^\d+_/, "") === slug)?.title ?? null;
}

function planInfo(c: Ctx): { panel: SafeHtml; inline: string } {
  const p = readPrefs().plan;
  const who = companyName(c.cat, p.companies[0]);
  const title = who ? `${who} interview` : "Your interview";
  const today = localDay(c.now);
  if (!p.interviewDate) {
    return {
      panel: html`<section class="panel" aria-labelledby="cd"><div class="section-head"><h2 id="cd">Your next 4 weeks</h2><a class="link text-small" href="${ROUTES.plan}">Open plan</a></div>
        <p class="plan-note">Add an interview date and the plan builds toward it: which techniques to start, a forecast for the date, and mocks closer together near the end</p>
        <a class="btn btn-secondary btn-sm" style="margin-top:var(--space-4)" href="${ROUTES.settings}#plan">Set date</a></section>`,
      inline: "",
    };
  }
  const left = daysUntil(p.interviewDate, today);
  if (left < 0) {
    return {
      panel: html`<section class="panel" aria-labelledby="cd"><h2 id="cd">${title}</h2>
        <p class="plan-note">Your ${who ? `${who} ` : ""}interview date was ${shortDate(p.interviewDate)}. Keep practicing or set a date for your next interview</p>
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4);flex-wrap:wrap"><a class="btn btn-secondary btn-sm" href="${ROUTES.settings}#plan">Set a new date</a><button class="btn btn-ghost btn-sm" type="button" data-remove-date>Keep practicing without a date</button></div></section>`,
      inline: "",
    };
  }
  const rows = c.plan ? paceRows(c.plan.forecast) : [];
  const behind = rows.find((r) => r.status === "behind") ?? null;
  const inline = `${title} in ${plural(left, "day")}.${behind ? ` ${behind.title} is behind by ${behind.behind_by}` : c.plan?.summary.on_track ? " On track" : ""}`;
  return {
    panel: html`<section class="panel" aria-labelledby="cd">
      <div class="section-head"><h2 id="cd">${title}</h2><a class="link text-small" href="${ROUTES.plan}">Open plan</a></div>
      <p class="countdown"><span class="count-num">${left}</span><span class="text-secondary">${left === 1 ? "day" : "days"} left, ${shortDate(p.interviewDate)}</span></p>
      ${rows.length ? html`<div class="fc">${forecastRows(rows, { date: p.interviewDate })}</div>` : ""}
      <p class="fineprint">${rows.length ? "If you keep to the plan. Behind by N means N problems short on the date" : (c.plan?.summary.headline ?? "")}</p>
    </section>`,
    inline,
  };
}

/** Up to two weak spots, never the one next-up already drills. */
function weakPanel(c: Ctx, skip: string | null): SafeHtml {
  const list = (c.skills ?? [])
    .filter((s) => s.weak_spot && `${s.module}/${s.technique}` !== skip)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2);
  if (!list.length) return html``;
  const line = (s: Skill) => {
    const parts = s.diagnosis.split(/(?<=\.) /);
    return parts[1] ?? parts[0] ?? "";
  };
  return html`<section class="panel" aria-labelledby="tws">
    <div class="section-head"><h2 id="tws">Weak spots</h2><a class="link text-small" href="${ROUTES.skills}">All skills</a></div>
    <ul class="wsmini">${list.map((s) => {
      const step = s.actions[0];
      const planned = step && inPlanOn(c.plan ?? null, step.problem) === localDay(c.now);
      return html`<li><span class="t"><a href="${skillHref(s.module, s.technique)}">${s.technique_title}</a>${trend(s.trend, s.recent)}</span><p>${line(s)}</p>${
        planned
          ? html`<span class="text-muted text-small">The next step is in today's plan</span>`
          : step
            ? html`<a class="btn btn-secondary btn-sm" href="${actionHref(s, step)}">${step.title}, ${step.minutes} min</a>`
            : ""
      }</li>`;
    })}</ul></section>`;
}

function weekPanel(c: Ctx): SafeHtml {
  const days = weekStrip(c.t.states(c.events), c.now);
  const fmt = (d: string, long: boolean) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: long ? "long" : "short" });
  return html`<section class="panel" aria-labelledby="wk">
    <div class="section-head"><h2 id="wk">Reviews this week</h2><a class="link text-small" href="${ROUTES.plan}">Plan</a></div>
    <ol class="week">${days.map(
      (d) =>
        html`<li class="day${d.today ? " is-today" : ""}${d.count <= 1 && !d.today ? " light" : ""}"><a href="${planDayHref(d.day)}" aria-label="${fmt(d.day, true)}${d.today ? ", today" : ""}, ${d.count ? `${d.count} due` : "none due"}. Open in the plan"><span class="n" aria-hidden="true">${d.count}</span><span aria-hidden="true">${fmt(d.day, false)}</span></a></li>`,
    )}</ol></section>`;
}

function budgetPanel(b: Budget): SafeHtml {
  return html`<section class="panel" aria-labelledby="tb"><h2 id="tb">Time today</h2>
    <div class="budget"><div class="seg seg-block" role="group" aria-labelledby="tb">${BUDGETS.map(
      (o) => html`<button type="button" data-budget="${o.id}" aria-pressed="${o.id === b ? "true" : "false"}">${o.label}</button>`,
    )}</div></div>
    <p class="fineprint">Reducing your time removes new problems before reviews. Solving one problem counts toward your streak</p></section>`;
}

// ---- main column ----

function nextUp(c: Ctx, e: TodayEntry): SafeHtml {
  const m = meta(c.cat, e.problem);
  const item = planItem(c, e.problem);
  const [k, label] = reasonTag(e, true);
  const rung = displayRung(e.state.rung);
  const cap =
    e.state.last_ms !== null
      ? `Last solved ${ago(e.state.last_ms, c.now)}`
      : e.state.attempts > 0
        ? "Started, not solved yet"
        : "Not started";
  return html`<article class="panel nextup" aria-labelledby="nu-title">
    <div>
      <div class="tags">${tag(k, label)}</div>
      <h2 id="nu-title"><a href="${problemHref(e.problem, e.kind === "practice" ? "drill" : undefined)}" style="view-transition-name:p-${e.problem}">${m?.title ?? e.problem}</a></h2>
      <div class="meta"><span>${m ? where(c.cat, m) : ""}</span>${m ? diff(m.difficulty) : ""}<span>${icon("timer")} ${targetMins(m)} min target</span></div>
      ${whyChips(item?.chips)}
    </div>
    <div class="rail">${ladder({ rung, size: "lg", due: e.kind === "review" })}<p class="cap">${cap}</p></div>
    <div class="why">
      <p>${item && item.tag !== "review" ? html`<strong class="why-lead">Why this one:</strong> ${item.reason}. ` : e.why ? html`<strong class="why-lead">${sentence(e.why)}</strong> ` : ""}${whyLine(e, targetMins(m))}</p>
      <button class="btn btn-ghost" type="button" data-skip="${e.problem}" aria-keyshortcuts="x">Skip for today ${kbd("x")}</button>
      <a class="btn btn-primary btn-lg" href="${problemHref(e.problem, e.kind === "practice" ? "drill" : undefined)}" data-start aria-keyshortcuts="s">Start ${kbd("s")}</a>
    </div>
  </article>`;
}

function entryRow(c: Ctx, e: TodayEntry): SafeHtml {
  const m = meta(c.cat, e.problem);
  const [k, label] = reasonTag(e);
  const item = planItem(c, e.problem);
  const why = item?.reason ?? (e.why ? sentence(e.why) : "");
  return queueRow({
    href: problemHref(e.problem, e.kind === "practice" ? "drill" : undefined),
    title: m?.title ?? e.problem,
    tag: tag(k, label),
    sub: m ? where(c.cat, m) : "",
    ...(why ? { why } : {}),
    ladder: { rung: displayRung(e.state.rung), due: e.kind === "review" },
    ...(m ? { difficulty: m.difficulty } : {}),
    mins: `${targetMins(m)}m`,
    vt: `p-${e.problem}`,
  });
}

function doneRow(c: Ctx, d: DoneItem, states: Record<string, State>): SafeHtml {
  const m = meta(c.cat, d.problem);
  const s = states[d.problem];
  const rung = displayRung(s?.rung ?? -1);
  const time = d.elapsedMs !== null ? formatDuration(d.elapsedMs) : "";
  const next = rung ? `${RUNG_DAYS[rung - 1]} ${RUNG_DAYS[rung - 1] === 1 ? "day" : "days"}` : "";
  const t = d.finish === "clean" ? tag("pass", "Clean pass") : d.finish === "assisted" ? tag("progress", "Passed with help") : tag("fail", "Gave up");
  const sub = d.finish === "clean" ? `Up to ${next}${time ? `, ${time}` : ""}` : `Back to 1 day${time ? `, ${time}` : ""}`;
  return queueRow({
    href: problemHref(d.problem),
    title: m?.title ?? d.problem,
    tag: t,
    sub,
    ladder: { rung },
    mins: d.elapsedMs !== null ? `${Math.max(1, Math.round(d.elapsedMs / 60000))}m` : "",
    done: true,
    vt: `p-${d.problem}`,
  });
}

function firstRun(c: Ctx): SafeHtml {
  const items = c.t.placement(c.events).items.map((i) => meta(c.cat, i.problem)?.title ?? i.problem);
  const guide = c.cat.catalog.guide[0];
  const name = cachedMe()?.user.display_name?.trim().split(/\s+/)[0] || (cachedMe() ? null : "Guest");
  return html`<section aria-labelledby="fr-title">
    <div class="greet"><h1>Welcome to myleet${name ? `, ${name}` : ""}</h1><p>Start with a warm-up or a module. Your results help choose what to practice next</p></div>
    <div class="panel firstrun">
      <div><h2 id="fr-title">Find your starting point</h2>
        <p>Try ${items.length} short problems to see which topics you know and which need practice. The warm-up takes about 40 minutes and does not change your review schedule. You can stop after any problem</p></div>
      <div class="choices">
        <a class="choice" href="${ROUTES.onboarding}?step=warm-up">${icon("flag")}<strong>Take the warm-up</strong><span>${items.join(", ")}</span></a>
        <a class="choice" href="${guide ? noteHref(guide.path) : ROUTES.learn}">${icon("book-open")}<strong>I'm new to DSA, start at the beginning</strong><span>Read ${guide?.title ?? "How to prepare"}, then module 1: ${c.cat.catalog.modules[0]?.title ?? "Arrays and hashing"}</span></a>
        <a class="choice" href="${ROUTES.companies}">${icon("building-2")}<strong>I have a company in mind</strong><span>Pick a company set; Today will mix it in</span></a>
      </div>
    </div></section>`;
}

let ctx: Ctx | undefined;

async function load(): Promise<Ctx> {
  const [t, cat, events] = await Promise.all([loadTrainer(), loadCatalog(), readEvents()]);
  return { t, cat, events, now: new Date() };
}

function paint(c: Ctx): void {
  const main = $("[data-today-main]");
  const aside = $("[data-today-aside]");
  if (!main || !aside) return;
  const prefs = readPrefs();
  const budget = readBudget(c.now);
  const skipped = new Set(readSkipped(c.now));
  const extra = budget === "120" ? EXTRA_NEW_FOR_LONG_DAY : 0;
  const states = c.t.states(c.events);
  const stats = c.t.stats(c.events);
  recordStats(stats);
  const done = doneToday(parseEvents(c.events), (id) => meta(c.cat, id)?.time_target_secs ?? 0, c.now);
  const doneIds = new Set(done.map((d) => d.problem));
  let entries = c.t.today(c.events, { newPerDay: prefs.newPerDay + extra }).filter((e) => !doneIds.has(e.problem));
  try {
    c.plan = c.t.plan(c.events, planSettings(), { now: c.now.getTime() });
  } catch {
    c.plan = null;
  }
  try {
    c.skills = c.t.skills(c.events, planSettings(), { now: c.now.getTime() }).techniques;
  } catch {
    c.skills = null;
  }
  if (c.plan) {
    try {
      const d0 = c.plan.days[0];
      localStorage.setItem("myleet:sessions", JSON.stringify({ day: d0?.date, sessions: (d0?.sessions ?? []).map((s) => ({ start_ms: s.start_ms, title: s.title, minutes: s.minutes })) }));
    } catch {
      // Reminders fall back to the daily time.
    }
  }
  const plan = planInfo(c);
  const note = (c.plan?.notes ?? []).find((n) => n.kind !== "date_passed" && !noteDismissed(n));
  const noteHtml = note ? replanNote(note, { dismiss: true, link: html`<a class="link" href="${ROUTES.plan}">See the plan</a>` }) : html``;

  const reviews = entries.filter((e) => e.kind === "review");
  let backlogNote = "";
  if (reviews.length >= BACKLOG_AT) {
    const show = new Set(reviews.slice(0, BACKLOG_SHOW).map((e) => e.problem));
    entries = entries.filter((e) => e.kind !== "review" || show.has(e.problem));
    backlogNote = `${reviews.length} reviews due. Today shows the ${BACKLOG_SHOW} most overdue; the rest roll to tomorrow`;
  }
  const visible = entries.filter((e) => !skipped.has(e.problem));
  const BUDGET_SECS = BUDGETS.find((b) => b.id === budget)?.secs ?? null;
  const queue = fitBudget(visible, BUDGET_SECS, (e) => meta(c.cat, e.problem)?.time_target_secs ?? 1500);
  const mins = (list: TodayEntry[]) => list.reduce((n, e) => n + targetMins(meta(c.cat, e.problem)), 0);
  const work = queue.filter((e) => e.kind !== "practice");
  const nReview = work.filter((e) => e.kind === "review").length;
  const nNew = work.length - nReview;

  try {
    localStorage.setItem("myleet:today", JSON.stringify({ day: localDay(c.now), due: nReview, mins: mins(work) }));
  } catch {
    // Only the reminder text uses this.
  }

  const placement = c.t.placement(c.events);
  const name = cachedMe()?.user.display_name?.trim().split(/\s+/)[0] || (cachedMe() ? null : "Guest");
  const hello = greeting(c.now, name);
  let body: SafeHtml;
  if (placement.needs && Object.keys(states).length === 0) {
    body = firstRun(c);
  } else if (work.length === 0) {
    const cleanCount = done.filter((d) => d.finish === "clean").length;
    const spent = done.reduce((n, d) => n + (d.elapsedMs ?? 0), 0) / 60000;
    const drills = queue.filter((e) => e.kind === "practice");
    body = html`<section aria-labelledby="ad-h">
      <div class="greet">${
        done.length
          ? html`<h1 id="ad-h">You finished today's practice</h1><p>${plural(done.length, "problem")}, ${plural(cleanCount, "clean pass", "clean passes")}${spent >= 1 ? `, ${formatMinutes(spent)}` : ""}. Nothing else is due until tomorrow</p>`
          : html`<h1 id="ad-h">${hello}</h1>${noteHtml}<p>Nothing is due today</p>`
      }<p class="countdown-inline">${plan.inline}</p></div>
      ${drills.length
        ? html`<div class="panel state-note" style="margin-top:var(--space-8)"><h2>More practice</h2>
          <p>These problems revisit topics you have practiced, including ones you found difficult. They do not change your review schedule</p>
          <ol class="queue" style="margin-top:var(--space-4)" aria-label="Keep sharp drills">${drills.map((e) => entryRow(c, e))}</ol></div>`
        : ""}
      ${done.length ? html`<div class="group"><div class="section-head"><h2>Done today</h2><span class="meta">${plural(cleanCount, "clean pass", "clean passes")}</span></div><ol class="panel queue" aria-label="Done today">${done.map((d) => doneRow(c, d, states))}</ol></div>` : ""}
    </section>`;
  } else {
    const [first, ...rest] = queue as [TodayEntry, ...TodayEntry[]];
    const parts = [nReview ? plural(nReview, "review") + " due" : "", nNew ? plural(nNew, "new problem") : ""].filter(Boolean).join(" and ");
    const cleanCount = done.filter((d) => d.finish === "clean").length;
    body = html`<section aria-labelledby="greet">
      <div class="greet"><h1 id="greet">${hello}</h1>${noteHtml}<p>${backlogNote || `${parts} · About ${formatMinutes(mins(work))}`}</p><p class="countdown-inline">${plan.inline}</p></div>
      ${nextUp(c, first)}
      ${rest.length
        ? html`<div class="group"><div class="section-head"><h2>Also today</h2><span class="meta">${plural(rest.length, "problem")}, about ${formatMinutes(mins(rest))}</span></div>
          <ol class="panel queue" aria-label="Today's queue">${rest.map((e) => entryRow(c, e))}</ol></div>`
        : ""}
      ${done.length ? html`<div class="group"><div class="section-head"><h2>Done today</h2><span class="meta">${plural(cleanCount, "clean pass", "clean passes")}</span></div><ol class="panel queue" aria-label="Done today">${done.map((d) => doneRow(c, d, states))}</ol></div>` : ""}
    </section>`;
  }
  render(main, body);
  main.removeAttribute("aria-busy");
  main.removeAttribute("aria-label");
  const first = main.querySelector("#fr-title") !== null;
  main.closest(".today-layout")?.classList.toggle("is-first-run", first);
  const next = queueFirst(entries, skipped);
  const nm = next ? meta(c.cat, next) : undefined;
  const skipKey = nm ? `${c.cat.catalog.modules[nm.module]?.id}/${c.cat.catalog.modules[nm.module]?.techniques[nm.technique]?.id}` : null;
  render(aside, first ? html`` : html`${plan.panel}${weakPanel(c, skipKey)}${checkinPanel(c)}${weekPanel(c)}${budgetPanel(budget)}`);
  banners(Object.keys(states).length, Object.keys(stats.heatmap).length);
}

function queueFirst(entries: TodayEntry[], skipped: Set<string>): string | null {
  return entries.find((e) => !skipped.has(e.problem) && e.kind !== "practice")?.problem ?? null;
}

function banners(practised: number, days: number): void {
  const nudge = !cachedMe() && practised >= 3 && !bannerDismissed("local");
  if (nudge) {
    showBanner("local", {
      icon: "hard-drive",
      body: html`<strong>Saved on this device</strong> Sign in to keep your progress on every device`,
      actions: html`<button class="btn btn-secondary btn-sm" type="button" data-signin>Keep my progress</button>`,
      dismissDays: 7,
    });
  } else hideBanner("local");
  const prefs = readPrefs();
  // One offer at a time: the reminder line waits until the sign-in nudge is gone.
  if (!nudge && days >= 3 && !prefs.reminders.on && reminderSupport() !== "unsupported" && reminderSupport() !== "denied") {
    const el = showBanner("remind", {
      icon: "bell",
      body: html`Want a reminder at 7 pm on days you haven't practised?`,
      actions: html`<button class="btn btn-secondary btn-sm" type="button" data-remind-on>Turn on</button><button class="btn btn-ghost btn-sm" type="button" data-remind-no>No thanks</button>`,
    });
    el?.querySelector("[data-remind-on]")?.addEventListener("click", async () => {
      const r = await requestReminderPermission();
      if (r === "granted") {
        updatePrefs({ reminders: { on: true, time: "19:00" } });
        toast("Reminder on: 7 pm on days you haven't practised. Change it in Settings");
      } else toast("The browser blocked notifications. You can allow them in its site settings");
      hideBanner("remind");
      dismiss("remind");
    });
    el?.querySelector("[data-remind-no]")?.addEventListener("click", () => {
      hideBanner("remind");
      dismiss("remind");
    });
  }
  const install = (window as { __myleetInstall?: () => void }).__myleetInstall;
  if (!nudge && install && days >= 3 && !bannerDismissed("install")) {
    const el = showBanner("install", {
      icon: "download",
      body: html`Install myleet for one-click practice and offline use`,
      actions: html`<button class="btn btn-secondary btn-sm" type="button" data-install>Install</button><button class="btn btn-ghost btn-sm" type="button" data-install-no>Not now</button>`,
    });
    el?.querySelector("[data-install]")?.addEventListener("click", () => (install(), hideBanner("install")));
    el?.querySelector("[data-install-no]")?.addEventListener("click", () => (hideBanner("install"), dismiss("install", 30)));
  }
}

function dismiss(id: string, days = 3650): void {
  try {
    localStorage.setItem(`myleet:banner:${id}`, String(Date.now() + days * 86_400_000));
  } catch {
    // Not remembered.
  }
}

function errorState(err: unknown): void {
  const main = $("[data-today-main]");
  const aside = $("[data-today-aside]");
  const offline = !navigator.onLine;
  render(
    main,
    html`<div class="greet"><h1>${greeting(new Date(), cachedMe()?.user.display_name?.trim().split(/\s+/)[0] || (cachedMe() ? null : "Guest"))}</h1></div>
    <div class="panel state-note" style="margin-top:var(--space-8)" role="alert">
      <h2>Couldn't load the curriculum</h2>
      <p>The problem list didn't download (${offline ? "you're offline and it isn't cached yet" : err instanceof Error ? err.message : "network error"}). Your progress is safe on this device. Try again, or open a problem you've already practised; those work offline</p>
      <div class="actions"><button class="btn btn-primary" type="button" data-retry>Try again</button></div>
    </div>`,
  );
  main?.removeAttribute("aria-busy");
  render(aside, html``);
  main?.querySelector("[data-retry]")?.addEventListener("click", () => void init());
}

/** Warms Pyodide into the service worker's cache while the learner reads Today. */
function prefetchPython(): void {
  const conn = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!navigator.onLine || !navigator.serviceWorker?.controller || conn?.saveData || /2g/.test(conn?.effectiveType ?? "")) return;
  const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 3000));
  idle(() => {
    void import("../lib/runner").then(({ PYODIDE_URL }) => {
      for (const f of ["pyodide.mjs", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"])
        void fetch(`${PYODIDE_URL}${f}`, { mode: "cors" }).catch(() => undefined);
    });
  });
}

async function init(): Promise<void> {
  if (!$("[data-today]")) return;
  try {
    ctx = await load();
    paint(ctx);
    prefetchPython();
  } catch (e) {
    errorState(e);
  }
}

async function refresh(): Promise<void> {
  if (!$("[data-today]") || !ctx) return;
  ctx = { ...ctx, events: await readEvents(), now: new Date() };
  paint(ctx);
}

function skip(id: string): void {
  const list = readSkipped();
  writeSkipped([...list, id]);
  void refresh();
  const title = ctx ? (meta(ctx.cat, id)?.title ?? id) : id;
  toast(`Skipped ${title} for today`, {
    ms: 8000,
    action: {
      label: "Undo",
      run: () => {
        writeSkipped(readSkipped().filter((x) => x !== id));
        void refresh();
      },
    },
  });
}

function moveKbd(d: number): void {
  const rows = [...document.querySelectorAll<HTMLAnchorElement>("[data-today-main] .qrow:not(.done-row)")];
  if (!rows.length) return;
  const i = rows.findIndex((r) => r.classList.contains("is-kbd"));
  rows[i]?.classList.remove("is-kbd");
  const next = rows[i < 0 ? (d > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, i + d))];
  next?.classList.add("is-kbd");
  next?.focus({ preventScroll: false });
}

document.addEventListener("click", async (e) => {
  if (!$("[data-today]")) return;
  const t = e.target as Element;
  const skipBtn = t.closest<HTMLElement>("[data-skip]");
  const budgetBtn = t.closest<HTMLElement>("[data-budget]");
  if (t.closest("[data-note-dismiss]") && ctx?.plan) {
    const n = (ctx.plan.notes ?? []).find((x) => x.kind !== "date_passed" && !noteDismissed(x));
    if (n) dismissNote(n);
    void refresh();
    return;
  }
  if (skipBtn?.dataset.skip) skip(skipBtn.dataset.skip);
  else if (budgetBtn) {
    writeBudget(budgetBtn.dataset.budget as Budget);
    void refresh();
  } else if (t.closest("[data-remove-date]")) {
    updatePrefs({ plan: { interviewDate: null } });
    void refresh();
  } else if (ctx && t.closest("[data-checkin-start]")) {
    const through = Number((t.closest("[data-checkin-start]") as HTMLElement).dataset.checkinStart);
    const ids = ctx.t.checkpointPick(ctx.events, through, Date.now() % 1_000_000);
    writeCheckin({ through, ids, since: Date.now() });
    void refresh();
  } else if (ctx && t.closest("[data-checkin-snooze]")) {
    const through = Number((t.closest("[data-checkin-snooze]") as HTMLElement).dataset.checkinSnooze);
    await appendEvent(ctx.t.checkpointSnooze(through));
    void refresh();
  } else if (t.closest("[data-checkin-cancel]")) {
    writeCheckin(null);
    void refresh();
  } else if (ctx && t.closest("[data-checkin-finish]")) {
    const active = readCheckin();
    if (!active) return;
    const results = checkpointResults(runProgress(parseEvents(ctx.events), active.ids, "checkpoint", active.since));
    await appendEvent(ctx.t.checkpointDone(active.through, results));
    writeCheckin(null);
    const clean = results.filter((r) => r.passed && !r.hints).length;
    await refresh();
    const weak = ctx.t.checkpoint(ctx.events).weak_modules.map((id) => ctx?.cat.catalog.modules.find((m) => m.id === id)?.title).filter(Boolean);
    toast(`Check-in saved: ${clean} of ${results.length} clean.${weak.length ? ` ${weak[0]} comes first in new problems` : ""}`);
  }
});

document.addEventListener("keydown", (e) => {
  if (!$("[data-today]") || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
  const a = document.activeElement as HTMLElement | null;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
  if (e.key === "s") {
    const start = $<HTMLAnchorElement>("[data-start]");
    if (start) (e.preventDefault(), void navigate(start.href));
  } else if (e.key === "x") {
    const s = $("[data-skip]");
    if (s?.dataset.skip) (e.preventDefault(), skip(s.dataset.skip));
  } else if (e.key === "j" || e.key === "k") {
    e.preventDefault();
    moveKbd(e.key === "j" ? 1 : -1);
  }
});

document.addEventListener("astro:page-load", () => void init());
for (const ev of ["myleet:synced", "myleet:progress", "myleet:prefs"]) addEventListener(ev, () => void refresh());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && ctx && localDay(ctx.now) !== localDay()) void refresh();
});
