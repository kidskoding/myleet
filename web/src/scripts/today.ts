// Today (/app): built live from the wasm trainer and local progress.
import { editGoalsLabel, editGoalsLink } from "../lib/ui/goals-editor";
import { navigate } from "astro:transitions/client";
import { cachedMe } from "../lib/account";
import { signedIn } from "../lib/account";
import { signupHref } from "../lib/access";
import { moduleOneStart, topicById } from "../lib/diagnostic";
import { sentenceCase } from "../lib/display";
import { companyLogo } from "../lib/company-logos";
import { guestMode, resultsLine, todayInvite, todayResults, WELCOME_KEY } from "../lib/ui/guest-gate";
import { viewEvents } from "../lib/sample";
import { checkpointResults, doneToday, parseEvents, runProgress, type DoneItem } from "../lib/attempts";
import { loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { MOCK_LEAD_MIN, mockState } from "../lib/mock-today";
import { mockHref, readHistory } from "../lib/mock";
import { addMove, midSentence, minuteOf, moveFor } from "../lib/schedule";
import { daysUntil, paceRows, shortDate } from "../lib/plan";
import { planSettings, readPrefs, updatePrefs } from "../lib/prefs";
import { appendEvent, readEvents } from "../lib/progress";
import { reminderSupport, requestReminderPermission, toPlanned } from "../lib/reminders";
import { planDayHref, problemHref, ROUTES, skillHref } from "../lib/routes";
import { actionHref, inPlanOn } from "../lib/skills-view";
import { addDays, localDay, readStreak, recordStats, streakNow } from "../lib/streak";
import { forecastLead, planStatus, spreadDays, weekFocus } from "../lib/plan-copy";
import { backlogLine, milestone, milestoneLine, momentum, onThisDay, personalCards, reviewWhy, todaySummary, wrapUp, type Card } from "../lib/coach";
import {
  BUDGETS,
  EXTRA_NEW_FOR_LONG_DAY,
  fitBudget,
  greeting,
  readBudget,
  readSkipped,
  reasonTag,
  weekStrip,
  writeBudget,
  writeSkipped,
  type Budget,
} from "../lib/today";
import { setupCard } from "../lib/setup";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import type { LeetcodeImport, Plan, PlanItem, PlanNote, PlanSession, ProblemMeta, Skill, State, TodayEntry } from "../lib/types";
import { arrive, diff, keepArriving, formatDuration, formatMinutes, kbd, modChip, plural, queueRow, tag } from "../lib/ui/bits";
import { companyMarks, emphasize, markCompanies, type Marks } from "../lib/ui/emphasis";
import { goalLine, goalReadiness, goalTitle, topicName, type GoalReady } from "../lib/goals";
import { lastCleanSet } from "../lib/companies";
import { html, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { displayRung, ladder, RUNG_DAYS } from "../lib/ui/ladder";
import { bannerDismissed, errorPanel, hideBanner, showBanner, toast } from "../lib/ui/overlay";
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
  /** A guest with no practice yet: events are a labelled example. */
  sample?: boolean;
  /** Computed per paint; null if the planner failed (Today still works without it). */
  plan?: Plan | null;
  skills?: Skill[] | null;
  /** The LeetCode import, when connected. */
  leetcode?: LeetcodeImport | null;
}

/** Today's plan item for a problem: its reason, tag and why chips. */
function planItem(c: Ctx, problem: string): PlanItem | undefined {
  return c.plan?.days[0]?.sessions.flatMap((s) => s.items).find((i) => i.problem === problem);
}

/** A queue entry in the plan's item shape, for when the plan has nothing left today. */
function queueItem(c: Ctx, e: TodayEntry): Pick<PlanItem, "kind" | "tag" | "technique" | "chips"> | undefined {
  const p = meta(c.cat, e.problem);
  if (!p) return undefined;
  return { kind: e.kind === "review" ? "review" : "new", tag: e.kind === "review" ? "review" : "new", technique: c.cat.catalog.modules[p.module]?.techniques[p.technique]?.title ?? null, chips: [] };
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);

function meta(cat: LoadedCatalog, id: string): ProblemMeta | undefined {
  return cat.byId.get(id);
}

function where(cat: LoadedCatalog, p: ProblemMeta): string {
  const m = cat.catalog.modules[p.module];
  const tech = m?.techniques[p.technique];
  return [m ? sentenceCase(m.title) : "", tech ? midSentence(tech.title) : ""].filter(Boolean).join(", ");
}

/** "overdue 2d, just learned" reads as "Overdue 2d, just learned". */
const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const targetMins = (p: ProblemMeta | undefined) => Math.round((p?.time_target_secs ?? 1500) / 60);

function ago(ms: number, now: Date): string {
  const days = Math.round((new Date(localDay(now)).getTime() - new Date(localDay(new Date(ms))).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

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
    const cos = companyNames(c);
    const topics = topicNames(c);
    const rows = cos.length || topics.length ? goalRows(c) : [];
    return {
      panel: html`<section class="panel" aria-labelledby="cd"><div class="section-head"><h2 id="cd">${markCompanies(goalTitle(cos, topics), marks(c))}</h2><a class="link text-small" href="${ROUTES.plan}">Open plan</a></div>
        <p class="plan-note">${emphasize(goalLine(cos, topics), [...cos, ...topics], marks(c))}</p>
        ${rows.length ? html`<ul class="goal-ready" aria-label="Readiness for your goals">${rows.map((r) => {
          const pct = Math.round((r.ready / Math.max(1, r.tracked)) * 100);
          return html`<li><span class="gr-name">${r.kind === "company" ? companyLogo(r.id, "ready-logo") : ""}${r.name}</span><span class="gr-n"><b>${r.ready}</b> of ${r.tracked} ready</span><span class="ready-bar" role="meter" aria-label="${r.name}: ${r.ready} of ${r.tracked} problems ready" aria-valuemin="0" aria-valuemax="${r.tracked}" aria-valuenow="${r.ready}"><span style="width:${pct}%"></span></span></li>`;
        })}</ul>` : ""}
        <div class="goal-actions">${editGoalsLink()}</div></section>`,
      inline: "",
    };
  }
  const left = daysUntil(p.interviewDate, today);
  if (left < 0) {
    return {
      panel: html`<section class="panel" aria-labelledby="cd"><h2 id="cd">${markCompanies(title, marks(c))}</h2>
        <p class="plan-note">${markCompanies(`Your ${who ? `${who} ` : ""}interview date was ${shortDate(p.interviewDate)}. Keep practicing or set a date for your next interview`, marks(c))}</p>
        <div class="goal-actions"><a class="btn btn-secondary btn-sm" href="${ROUTES.goals}">${editGoalsLabel()}</a><button class="btn btn-ghost btn-sm" type="button" data-remove-date>Keep practicing without a date</button></div></section>`,
      inline: "",
    };
  }
  const rows = c.plan ? paceRows(c.plan.forecast) : [];
  const behind = rows.find((r) => r.status === "behind") ?? null;
  const inline = `${title} in ${plural(left, "day")}.${behind ? ` ${behind.title} is behind by ${behind.behind_by}` : c.plan?.summary.on_track ? " On track" : ""}`;
  return {
    panel: html`<section class="panel" aria-labelledby="cd">
      <div class="section-head"><h2 id="cd">${markCompanies(title, marks(c))}</h2><a class="link text-small" href="${ROUTES.plan}">Open plan</a></div>
      <p class="countdown"><span class="count-num">${left}</span><span class="text-secondary">${left === 1 ? "day" : "days"} left, ${shortDate(p.interviewDate)}</span></p>
      ${readiness(c, p.interviewDate)}
      ${rows.length ? html`<div class="fc">${forecastRows(rows, { date: p.interviewDate })}</div>` : ""}
      <p class="fineprint">${rows.length ? "If you keep to the plan. Behind by N means N problems short on the date" : (c.plan?.summary.headline.replace(/\.$/, "") ?? "")}</p>
      <div class="goal-actions">${editGoalsLink()}</div>
    </section>`,
    inline,
  };
}

/** How many of the plan's core topics are on pace for the date: the Plan page's forecast sentence and a meter. */
function readiness(c: Ctx, date: string): SafeHtml {
  const fc = c.plan?.forecast ?? [];
  if (!fc.length || !c.plan) return html``;
  const ready = fc.filter((f) => f.behind_by === 0).length;
  const lead = forecastLead({ forecast: fc, date, companies: [...new Set(fc.flatMap((f) => f.companies))], weekday: readPrefs().plan.dailyMinutes ?? 60, closeAll: null });
  const focus = weekFocus(c.plan);
  const co = targetCompany(c);
  const pct = Math.round((ready / fc.length) * 100);
  return html`<div class="ready"><div class="ready-head"><h3>Ready for ${co ? markCompanies(co, marks(c)) : "your interview"}</h3><span class="ready-pct">${pct}%</span></div>
    <p class="ready-line">${lead}</p>
    <div class="ready-bar" role="meter" aria-label="Core topics on pace" aria-valuemin="0" aria-valuemax="${fc.length}" aria-valuenow="${ready}"><span style="width:${((ready / fc.length) * 100).toFixed(0)}%"></span></div>
    ${focus && ready < fc.length ? html`<p class="fineprint">Clean passes in ${midSentence(focus)} move this the most</p>` : ""}</div>`;
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
    return (parts[1] ?? parts[0] ?? "").replace(/\.$/, "");
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

function budgetPanel(b: Budget, planned: number): SafeHtml {
  const opts = planned > 0 ? [{ id: "plan" as Budget, label: `Your plan, ${formatMinutes(planned)}` }, ...BUDGETS] : BUDGETS;
  return html`<section class="panel" aria-labelledby="tb"><h2 id="tb">Time today</h2>
    <div class="budget"><div class="seg seg-block" role="group" aria-labelledby="tb">${opts.map(
      (o) => html`<button type="button" data-budget="${o.id}" aria-pressed="${o.id === b ? "true" : "false"}">${o.label}</button>`,
    )}</div></div>
    <p class="fineprint">Reducing your time removes new problems before reviews. Any one problem you practice counts towards your streak</p></section>`;
}

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
  return html`<article class="l2 nextup" aria-labelledby="nu-title">
    <div>
      <div class="tags">${tag(k, label)}</div>
      <h2 id="nu-title"><a href="${problemHref(e.problem, e.kind === "practice" ? "drill" : undefined)}" style="view-transition-name:p-${e.problem}">${m?.title ?? e.problem}</a></h2>
      <div class="meta"><span class="mod-name">${m ? html`${modChip(m.module)}${where(c.cat, m)}` : ""}</span>${m ? diff(m.difficulty) : ""}<span>${icon("timer")} <span class="fig">${targetMins(m)}:00</span> target</span></div>
      ${whyChips(item?.chips)}
    </div>
    <div class="rail">${ladder({ rung, size: "xl", due: e.kind === "review", draw: true, w: 340, h: 156 })}<p class="cap">${cap}</p></div>
    <div class="why">
      <p><strong class="why-lead">Why this one:</strong> ${markCompanies((e.kind === "review" ? reviewWhy(e, c.skills ?? null, c.now) : item ? item.reason : e.kind === "practice" ? "Extra practice on a topic you've worked on, and it doesn't change your review schedule" : e.why ? sentence(e.why) : "It's next in your curriculum").replace(/\.$/, ""), marks(c))}</p>
      <button class="btn btn-ghost" type="button" data-skip="${e.problem}" aria-keyshortcuts="x">Skip for today ${kbd("x")}</button>
      <a class="btn btn-primary btn-lg" href="${problemHref(e.problem, e.kind === "practice" ? "drill" : undefined)}" data-start aria-keyshortcuts="s">Start ${kbd("s")}</a>
    </div>
  </article>`;
}

function entryRow(c: Ctx, e: TodayEntry): SafeHtml {
  const m = meta(c.cat, e.problem);
  const [k, label] = reasonTag(e);
  const item = planItem(c, e.problem);
  const why = (item?.reason ?? (e.why ? sentence(e.why) : "")).replace(/\.$/, "");
  return queueRow({
    href: problemHref(e.problem, e.kind === "practice" ? "drill" : undefined),
    title: m?.title ?? e.problem,
    ...(m ? { mod: m.module } : {}),
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
    ...(m ? { mod: m.module } : {}),
    tag: t,
    sub,
    ladder: { rung },
    mins: d.elapsedMs !== null ? `${Math.max(1, Math.round(d.elapsedMs / 60000))}m` : "",
    done: true,
    vt: `p-${d.problem}`,
  });
}

function firstRun(c: Ctx): SafeHtml {
  const name = cachedMe()?.user.display_name?.trim().split(/\s+/)[0] || null;
  return todayInvite(`Welcome to myleet${name ? `, ${name}` : ""}`, targetCompany(c), readPrefs().plan.companies[0] ?? null);
}

/**
 * "Finish setting up": the setup answers still open, each opening just that question. Painted
 * twice, in the side column on wide screens and under the next problem on narrow ones.
 */
function setupPanel(card: ReturnType<typeof setupCard>, where: "side" | "main" | "first"): SafeHtml {
  if (!card) return html``;
  const pct = Math.round((card.done / card.total) * 100);
  return html`<section class="panel setup-card setup-${where}" aria-labelledby="su-${where}">
    <div class="su-head"><h2 id="su-${where}">Finish setting up</h2><button type="button" class="icon-btn" data-setup-hide aria-label="Hide this checklist">${icon("x")}</button></div>
    <div class="su-progress"><span>${card.done} of ${card.total} done</span><span class="su-bar" role="progressbar" aria-label="Setup" aria-valuemin="0" aria-valuemax="${card.total}" aria-valuenow="${card.done}"><span style="width:${pct}%"></span></span></div>
    <ul class="su-list">${card.open.map(
      (i) => html`<li><span class="su-label">${i.label}${i.optional ? html`<small>Optional</small>` : ""}</span><a class="btn btn-ghost btn-sm" href="${i.href}">${i.action}</a></li>`,
    )}</ul>
  </section>`;
}

/** "For you": up to three cards built from the learner's own data. */
function cardsRow(cards: Card[]): SafeHtml {
  if (!cards.length) return html``;
  return html`<ul class="foryou" aria-label="For you">${cards.map(
    (k) => html`<li class="panel"><span class="foryou-label">${k.label}</span><a class="foryou-title" href="${k.problem ? problemHref(k.problem) : ROUTES.skills}">${k.title}</a><p>${k.body}</p></li>`,
  )}</ul>`;
}

const MILESTONE_KEY = "myleet:milestone";

/** A clean-pass milestone shows on the day it is reached, then never again. */
function milestoneNote(states: Record<string, State>, now: Date): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(MILESTONE_KEY) ?? "null") as { seen: number; day: string } | null;
    // First visit on this device: record milestones already passed silently, so only new ones are celebrated.
    if (!v) {
      localStorage.setItem(MILESTONE_KEY, JSON.stringify({ seen: milestone(states, 0) ?? 0, day: "" }));
      return null;
    }
    const m = milestone(states, v.seen);
    if (m !== null) {
      localStorage.setItem(MILESTONE_KEY, JSON.stringify({ seen: m, day: localDay(now) }));
      return milestoneLine(m);
    }
    return v && v.day === localDay(now) ? milestoneLine(v.seen) : null;
  } catch {
    return null;
  }
}

let ctx: Ctx | undefined;

async function load(): Promise<Ctx> {
  const [t, cat, real] = await Promise.all([loadTrainer(), loadCatalog(), readEvents()]);
  return { t, cat, ...viewEvents(t, cat, real), now: new Date() };
}

/** Titles of the learner's pinned companies, for bolding in the coaching note. */
function companyNames(c: Ctx): string[] {
  return readPrefs().plan.companies.flatMap((slug) => c.cat.catalog.playlists.find((p) => p.id.replace(/^\d+_/, "") === slug)?.title ?? []);
}

/** Logos for the learner's target and interview companies, for the copy that names them. */
function marks(c: Ctx): Marks {
  const p = readPrefs().plan;
  return companyMarks(c.cat.catalog.playlists, [...p.companies, ...p.interviews.map((i) => i.company)]);
}

/** Focus topics mid-sentence ("graphs"), in the order picked. */
function topicNames(c: Ctx): string[] {
  return readPrefs().plan.focusTopics.flatMap((t) => topicName(c.cat.catalog, t) ?? []);
}

/** Technique title to its focus topic, for the coaching paragraph. */
function focusByTechnique(c: Ctx): Record<string, string> {
  const ids = readPrefs().plan.focusTopics;
  return Object.fromEntries(c.cat.catalog.modules.filter((m) => ids.includes(m.id)).flatMap((m) => m.techniques.map((t) => [t.title, midSentence(m.title)])));
}

/** Readiness for each target company and focus topic; up to four rows. */
function goalRows(c: Ctx): GoalReady[] {
  const p = readPrefs().plan;
  const target = (id: string) => c.cat.byId.get(id)?.time_target_secs ?? 1500;
  return goalReadiness(c.cat.catalog, { companies: p.companies, topics: p.focusTopics }, c.t.states(c.events), lastCleanSet(parseEvents(c.events), target), c.now.getTime()).slice(0, 4);
}

function targetCompany(c: Ctx): string | null {
  const slug = readPrefs().plan.companies[0];
  return (slug && c.cat.catalog.playlists.find((p) => p.id.replace(/^\d+_/, "") === slug)?.title) || null;
}

/** A guest sees the diagnostic invitation or their results, never a personal Today. */
function paintGuest(c: Ctx, main: HTMLElement, aside: HTMLElement): void {
  const pl = c.t.placement(c.events);
  const items = pl.result && !pl.result.skipped ? pl.result.items : [];
  const greet = greeting(c.now, null);
  const mode = guestMode(false, pl.done && items.length > 0);
  if (mode === "results") {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      // The welcome line is a nicety.
    }
  }
  render(main, mode === "results" ? todayResults(greet, resultsLine(items, (t) => topicById(t)?.label ?? t)) : todayInvite(greet, targetCompany(c), readPrefs().plan.companies[0] ?? null));
  main.removeAttribute("aria-busy");
  main.removeAttribute("aria-label");
  main.closest(".today-layout")?.classList.add("is-first-run");
  render(aside, html``);
  hideBanner("sample");
  hideBanner("local");
}

/** One welcome line, the first time a guest who took the diagnostic lands here signed in. */
function welcome(main: HTMLElement, hasDiagnostic: boolean): void {
  let flag: string | null = null;
  try {
    flag = localStorage.getItem(WELCOME_KEY);
    if (flag) localStorage.removeItem(WELCOME_KEY);
  } catch {
    // Nothing to show.
  }
  if (!flag || !hasDiagnostic) return;
  const name = cachedMe()?.user.display_name?.trim().split(/\s+/)[0];
  const p = document.createElement("p");
  p.className = "plan-note";
  p.textContent = `Welcome${name ? `, ${name}` : ""}! Your diagnostic is saved and your plan is ready`;
  main.querySelector(".greet")?.append(p);
}

function paint(c: Ctx): void {
  const main = $("[data-today-main]");
  const aside = $("[data-today-aside]");
  if (!main || !aside) return;
  if (!signedIn()) return paintGuest(c, main, aside);
  const prefs = readPrefs();
  const planned = c.plan?.days[0]?.minutes ?? 0;
  const budget = readBudget(c.now, planned > 0);
  const skipped = new Set(readSkipped(c.now));
  const extra = budget === "120" ? EXTRA_NEW_FOR_LONG_DAY : 0;
  const states = c.t.states(c.events);
  const stats = c.t.stats(c.events);
  if (!c.sample) recordStats(stats);
  const evs = parseEvents(c.events);
  const done = doneToday(evs, (id) => meta(c.cat, id)?.time_target_secs ?? 0, c.now);
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
  try {
    c.leetcode = c.t.leetcode(c.events);
  } catch {
    c.leetcode = null;
  }
  if (c.plan) {
    try {
      const d0 = c.plan.days[0];
      localStorage.setItem("myleet:sessions", JSON.stringify({ day: d0?.date, sessions: (d0?.sessions ?? []).map((s) => toPlanned(s, MOCK_LEAD_MIN)) }));
    } catch {
      // Reminders fall back to the daily time.
    }
  }
  const plan = planInfo(c);
  const note = (c.plan?.notes ?? []).find((n) => n.kind !== "date_passed" && !noteDismissed(n));
  const noteHtml = note ? replanNote(note, { marks: marks(c), dismiss: true, link: html`<a class="btn btn-ghost btn-sm" href="${ROUTES.plan}">See the plan</a>` }) : html``;

  // Plan status: the on-track line, this week's check-in and the catch-up note. Each is empty without data.
  let status: ReturnType<typeof planStatus> | null = null;
  if (c.plan && !c.sample) {
    try {
      const next = (c.plan.interviews ?? []).find((i) => i.date === c.plan?.interview_date);
      status = planStatus(c.plan, c.events, { windows: readPrefs().plan.availability, now: c.now, company: next?.name ?? null, titleOf: (id) => meta(c.cat, id)?.title ?? null, topicOf: (id) => { const p = c.cat.catalog.problems.find((x) => x.id === id); return p ? (c.cat.catalog.modules[p.module]?.techniques[p.technique]?.title ?? null) : null; } });
    } catch {
      status = null;
    }
  }
  const slip = status?.catchUp && !noteDismissed({ kind: "catch_up" as PlanNote["kind"], title: status.catchUp.title }) ? status.catchUp : null;
  const check = status?.checkin && !noteDismissed({ kind: "checkin" as PlanNote["kind"], title: status.checkin.title }) ? status.checkin : null;
  const statusHtml = html`${check ? replanNote({ kind: "checkin" as PlanNote["kind"], title: check.title, body: check.body }, { marks: marks(c), link: html`<a class="btn btn-ghost btn-sm" href="${ROUTES.plan}">Open check-in</a>` }) : ""}${slip ? replanNote({ kind: "catch_up" as PlanNote["kind"], title: slip.title, body: slip.body, actions: [{ kind: "spread", label: "Spread it over 3 days", value: slip.minutes }] }, { marks: marks(c), link: html`<a class="btn btn-ghost btn-sm" href="${ROUTES.plan}">See the plan</a>` }) : ""}`;
  // The check-in already says how the week went, so the on-track line waits for another day.
  const trackLine = check ? "" : status?.line || "";

  const reviews = entries.filter((e) => e.kind === "review");
  const backlog = reviews.length >= BACKLOG_AT;
  if (backlog) {
    const show = new Set(reviews.slice(0, BACKLOG_SHOW).map((e) => e.problem));
    entries = entries.filter((e) => e.kind !== "review" || show.has(e.problem));
  }
  const visible = entries.filter((e) => !skipped.has(e.problem));
  const BUDGET_SECS = budget === "plan" ? planned * 60 : (BUDGETS.find((b) => b.id === budget)?.secs ?? null);
  const queue = fitBudget(visible, BUDGET_SECS, (e) => meta(c.cat, e.problem)?.time_target_secs ?? 1500);
  const mins = (list: TodayEntry[]) => list.reduce((n, e) => n + targetMins(meta(c.cat, e.problem)), 0);
  const work = queue.filter((e) => e.kind !== "practice");
  const nReview = work.filter((e) => e.kind === "review").length;
  const nNew = work.length - nReview;
  // Counted after the time budget, so it matches the queue below it.
  const backlogNote = backlog && nReview ? backlogLine(reviews.length, nReview) : "";

  try {
    localStorage.setItem("myleet:today", JSON.stringify({ day: localDay(c.now), due: nReview, mins: mins(work) }));
  } catch {
    // Only the reminder text uses this.
  }

  const placement = c.t.placement(c.events);
  const setup = setupCard(prefs, placement.needs, Object.values(states).filter((s) => s.rung >= 0).length);
  const name = cachedMe()?.user.display_name?.trim().split(/\s+/)[0] || null;
  const hello = greeting(c.now, name);
  let body: SafeHtml;
  if (placement.needs && Object.keys(states).length === 0) {
    // The welcome screen is itself the setup step, so the checklist waits for the normal Today.
    body = firstRun(c);
  } else if (work.length === 0) {
    const cleanCount = done.filter((d) => d.finish === "clean").length;
    const spent = done.reduce((n, d) => n + (d.elapsedMs ?? 0), 0) / 60000;
    const drills = queue.filter((e) => e.kind === "practice");
    const next = c.plan?.days.find((d) => d.date > localDay(c.now) && d.sessions.length);
    const items = next?.sessions.flatMap((s) => s.items) ?? [];
    const techs = items.filter((i) => i.kind === "new" && i.technique).map((i) => i.technique as string);
    const tomorrow = next && next.date === addDays(localDay(c.now), 1) ? { technique: techs.sort((a, b) => techs.filter((x) => x === b).length - techs.filter((x) => x === a).length)[0] ?? null, reviews: items.filter((i) => i.kind === "review").length } : null;
    const wrap = wrapUp({ clean: cleanCount, total: done.length, minutes: spent }, tomorrow);
    body = html`<section aria-labelledby="ad-h">
      <div class="greet"><h1 id="ad-h">${hello}</h1>${noteHtml}${statusHtml}<p>${wrap}</p>${trackLine ? html`<p>${trackLine}</p>` : ""}<p class="countdown-inline">${plan.inline}</p></div>
      ${setupPanel(setup, "main")}
      ${drills.length
        ? html`<div class="panel state-note" style="margin-top:var(--space-8)"><h2>More practice</h2>
          <p>If you'd like more, these revisit topics you've practiced, including ones you found hard, and they don't change your review schedule.</p>
          <ol class="queue" style="margin-top:var(--space-4)" aria-label="Keep sharp drills">${drills.map((e) => entryRow(c, e))}</ol></div>`
        : ""}
      ${done.length ? html`<div class="group"><div class="section-head"><h2>Done today</h2><span class="meta">${plural(cleanCount, "clean pass", "clean passes")}</span></div><ol class="panel queue" aria-label="Done today">${done.map((d) => doneRow(c, d, states))}</ol></div>` : ""}
    </section>`;
  } else {
    const [first, ...rest] = queue as [TodayEntry, ...TodayEntry[]];
    const parts = [nReview ? plural(nReview, "review") + (backlog ? " today" : " due") : "", nNew ? plural(nNew, "new problem") : ""].filter(Boolean).join(" and ");
    const cleanCount = done.filter((d) => d.finish === "clean").length;
    const summary = todaySummary({
      // Once today's windows have passed the plan has no items for today; the queue still does.
      items: work.map((e) => planItem(c, e.problem) ?? queueItem(c, e)).filter((i) => i !== undefined),
      skills: c.skills ?? null,
      daysLeft: c.plan?.interview_date ? (c.plan.summary.days_left ?? null) : null,
      now: c.now,
      leetcodeWeak: c.leetcode?.weak,
      sets: Object.fromEntries((c.plan?.forecast ?? []).map((f) => [f.title, f.companies])),
      focus: focusByTechnique(c),
    });
    const cards = personalCards(work, c.skills ?? null, (id) => meta(c.cat, id)?.title ?? id, c.now, first.problem);
    const quiet = [onThisDay(work, c.skills ?? null, c.now), c.sample ? null : milestoneNote(states, c.now), c.sample ? null : momentum(streakNow(readStreak(), c.now).n, readStreak().rests)].filter(Boolean);
    body = html`<section aria-labelledby="greet">
      <div class="greet"><h1 id="greet">${hello}</h1>${noteHtml}${statusHtml}${[backlogNote || summary || "", trackLine].filter(Boolean).join("\n\n").split("\n\n").filter(Boolean).map((para) => html`<p>${emphasize(para, [...companyNames(c), ...topicNames(c)], marks(c))}</p>`)}${quiet.length ? html`<p class="quiet">${quiet.join(" · ")}</p>` : ""}<p class="meta">${parts} · About ${formatMinutes(mins(work))}</p><p class="countdown-inline">${plan.inline}</p></div>
      ${cardsRow(cards)}
      <div data-mock-card></div>
      ${nextUp(c, first)}
      ${setupPanel(setup, "main")}
      ${rest.length
        ? html`<div class="group"><div class="section-head"><h2>Also today</h2><span class="meta">${plural(rest.length, "problem")}, about ${formatMinutes(mins(rest))}</span></div>
          <ol class="panel queue" aria-label="Today's queue">${rest.map((e) => entryRow(c, e))}</ol></div>`
        : ""}
      ${done.length ? html`<div class="group"><div class="section-head"><h2>Done today</h2><span class="meta">${plural(cleanCount, "clean pass", "clean passes")}</span></div><ol class="panel queue" aria-label="Done today">${done.map((d) => doneRow(c, d, states))}</ol></div>` : ""}
    </section>`;
  }
  render(main, body);
  keepArriving($("[data-today]"));
  main.removeAttribute("aria-busy");
  main.removeAttribute("aria-label");
  const first = main.querySelector(".gate-split") !== null;
  main.closest(".today-layout")?.classList.toggle("is-first-run", first);
  paintMock();
  welcome(main, placement.done);
  const next = queueFirst(entries, skipped);
  const nm = next ? meta(c.cat, next) : undefined;
  const skipKey = nm ? `${c.cat.catalog.modules[nm.module]?.id}/${c.cat.catalog.modules[nm.module]?.techniques[nm.technique]?.id}` : null;
  render(aside, first ? html`` : html`${setupPanel(setup, "side")}${plan.panel}${weakPanel(c, skipKey)}${checkinPanel(c)}${weekPanel(c)}${budgetPanel(budget, planned)}`);
  banners(Object.keys(states).length, Object.keys(stats.heatmap).length, c.sample === true);
}

function queueFirst(entries: TodayEntry[], skipped: Set<string>): string | null {
  return entries.find((e) => !skipped.has(e.problem) && e.kind !== "practice")?.problem ?? null;
}

function banners(practised: number, days: number, sample: boolean): void {
  if (sample) {
    showBanner("sample", {
      icon: "sunrise",
      body: html`<strong>This is a sample day.</strong> Sign up for free to get yours`,
      actions: html`<a class="btn btn-primary btn-sm" href="${signupHref()}">Sign up for free</a>`,
    });
    hideBanner("local");
    return;
  }
  hideBanner("sample");
  const nudge = !cachedMe() && practised >= 1 && !bannerDismissed("local");
  if (nudge) {
    showBanner("local", {
      icon: "hard-drive",
      body: html`<strong>Saved on this device.</strong> Sign up for free to keep it`,
      actions: html`<a class="btn btn-secondary btn-sm" href="${signupHref()}">Sign up for free</a>`,
      dismissDays: 7,
    });
  } else hideBanner("local");
  const prefs = readPrefs();
  // One offer at a time: the reminder line waits until the sign-in nudge is gone.
  if (!nudge && days >= 3 && !prefs.reminders.on && reminderSupport() !== "unsupported" && reminderSupport() !== "denied") {
    const el = showBanner("remind", {
      icon: "bell",
      body: html`Want a reminder at 7 pm on days you haven't practiced?`,
      actions: html`<button class="btn btn-secondary btn-sm" type="button" data-remind-on>Turn on</button><button class="btn btn-ghost btn-sm" type="button" data-remind-no>No thanks</button>`,
    });
    el?.querySelector("[data-remind-on]")?.addEventListener("click", async () => {
      const r = await requestReminderPermission();
      if (r === "granted") {
        updatePrefs({ reminders: { on: true, time: "19:00" } });
        toast("Reminder on: 7 pm on days you haven't practiced. Change it in Settings");
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
    html`<div class="greet"><h1>${greeting(new Date(), cachedMe()?.user.display_name?.trim().split(/\s+/)[0] || null)}</h1></div>
    <div style="margin-top:var(--space-8)">${errorPanel("Couldn't load the curriculum", `The problem list didn't download (${offline ? "you're offline and it isn't cached yet" : err instanceof Error ? err.message : "network error"}). Your progress is safe on this device. Try again, or open a problem you've already practiced; those work offline`)}</div>`,
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
      for (const f of ["pyodide.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"])
        void fetch(`${PYODIDE_URL}${f}`, { mode: "cors" }).catch(() => undefined);
    });
  });
}

async function init(): Promise<void> {
  if (!$("[data-today]")) return;
  try {
    ctx = await load();
    paint(ctx);
    arrive($("[data-today]"));
    prefetchPython();
  } catch (e) {
    errorState(e);
  }
}

async function refresh(): Promise<void> {
  if (!$("[data-today]") || !ctx) return;
  ctx = { ...ctx, ...viewEvents(ctx.t, ctx.cat, await readEvents()), now: new Date() };
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
  // Signed in, skipping is recorded so the diagnostic counts as done everywhere; a guest just browses.
  if (ctx && signedIn() && t.closest("[data-skip-placement]")) {
    e.preventDefault();
    await appendEvent(ctx.t.placementSkip());
    const first = moduleOneStart(ctx.cat.catalog);
    void navigate(first ? problemHref(first) : ROUTES.today);
    return;
  }
  if (t.closest("[data-setup-hide]")) {
    const was = readPrefs().setupHidden;
    updatePrefs({ setupHidden: [...was, "card"] });
    toast("Checklist hidden. You can still change your role and goals in Settings", { action: { label: "Undo", run: () => updatePrefs({ setupHidden: was }) } });
    return;
  }
  const skipBtn = t.closest<HTMLElement>("[data-skip]");
  const budgetBtn = t.closest<HTMLElement>("[data-budget]");
  const spread = t.closest<HTMLElement>("[data-note-act='spread']");
  if (spread && ctx?.plan) {
    const s = spreadDays(ctx.plan, readPrefs().plan, Number(spread.dataset.value));
    const was = readPrefs().plan.dayMinutes;
    if (s) {
      updatePrefs({ plan: { dayMinutes: s.dayMinutes } });
      toast(`Added ${formatMinutes(s.each)} to each of the next ${s.count === 1 ? "day" : `${s.count} days`}`, { action: { label: "Undo", run: () => { updatePrefs({ plan: { dayMinutes: was } }); void refresh(); } } });
    }
    void refresh();
    return;
  }
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

/** Today's mock session from the plan, with whether a mock was finished today. */
function todaysMock(): { s: PlanSession; done: MockResultLite | null } | null {
  const s = ctx?.plan?.days[0]?.sessions.find((x) => x.items.some((i) => i.kind === "mock"));
  if (!ctx || !s) return null;
  const today = localDay(new Date());
  const m = readHistory().find((r) => localDay(new Date(r.end)) === today);
  return { s, done: m ? { solved: m.problems.filter((p) => p.green).length, total: m.problems.length } : null };
}
type MockResultLite = { solved: number; total: number };

function paintMock(): void {
  const el = $("[data-mock-card]");
  const m = todaysMock();
  if (!el) return;
  if (!m) return void render(el, html``);
  const { s, done } = m;
  const st = mockState(Date.now(), s.start_ms, s.end_ms, done !== null);
  const at = new Date(s.start_ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const len = formatMinutes(s.minutes);
  if (st === "done") {
    return void render(el, html`<p class="plan-note" style="margin-block:var(--space-4)">Mock done: ${done?.solved} of ${done?.total} solved.</p>`);
  }
  const copy =
    st === "before"
      ? { h: `Mock interview today at ${at}`, p: `About ${len}.` }
      : st === "now"
        ? { h: "Your mock interview starts now", p: `Planned for ${at}, about ${len}.` }
        : { h: "You missed today's mock interview", p: `It was planned for ${at}.` };
  const tomorrow = ctx?.plan?.days[1];
  render(
    el,
    html`<article class="l2" aria-live="polite" style="margin-block:var(--space-4)"><div><h2>${copy.h}</h2><p class="text-muted">${copy.p}</p></div>
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap"><a class="btn ${st === "now" ? "btn-primary" : "btn-secondary"}" href="${mockHref({ session: s.id, minutes: s.minutes, company: readPrefs().plan.companies[0] ?? null })}">${st === "now" ? "Start mock" : "Start now"}</a>${
        st === "missed" ? html`<button class="btn btn-ghost" type="button" data-mock-move ${tomorrow && !tomorrow.rest ? "" : "disabled"}>Move to tomorrow</button>` : ""
      }</div></article>`,
  );
}

function moveMockTomorrow(): void {
  const c = ctx;
  const m = todaysMock();
  const d0 = c?.plan?.days[0];
  const d1 = c?.plan?.days[1];
  if (!c?.plan || !m || !d0 || !d1) return;
  const prev = readPrefs().plan.moves;
  updatePrefs({ plan: { moves: addMove(prev, moveFor(m.s, d0.date, d1.date, minuteOf(m.s.start_ms)), c.plan.start) } });
  toast("Moved to tomorrow", { ms: 8000, action: { label: "Undo", run: () => updatePrefs({ plan: { moves: prev } }) } });
}

document.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("[data-mock-move]")) moveMockTomorrow();
});
setInterval(paintMock, 60_000);

document.addEventListener("astro:page-load", () => void init());
window.addEventListener("myleet:auth", () => void init());
for (const ev of ["myleet:synced", "myleet:progress", "myleet:prefs"]) addEventListener(ev, () => void refresh());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") paintMock();
  if (document.visibilityState === "visible" && ctx && localDay(ctx.now) !== localDay()) void refresh();
});
