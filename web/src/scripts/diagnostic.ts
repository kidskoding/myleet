// The diagnostic (/diagnostic, no account needed): intro, eight pattern questions, two or
// three coding problems in the workspace (mode=placement), then results. The run lives in
// localStorage; the finish writes one placement_done line that Today and the plan read.
import { cachedMe } from "../lib/account";
import { parseEvents, runProgress } from "../lib/attempts";
import { loadCatalog, type LoadedCatalog } from "../lib/catalog";
import {
  CODING_MAX,
  excerpt,
  gradeCoding,
  nextCoding,
  placementItems,
  QUESTIONS,
  questions,
  TOPICS,
  type DiagnosticState,
  type Grade,
  type Question,
} from "../lib/diagnostic";
import { gateSteps, signupToToday } from "../lib/ui/guest-gate";
import { sentenceCase } from "../lib/display";
import { planWeeks } from "../lib/plan";
import { planSettings, readPrefs } from "../lib/prefs";
import { appendEvent, readEvents } from "../lib/progress";
import { moduleHref, problemHref, ROUTES } from "../lib/routes";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import type { Level } from "../lib/types";
import { diff, kbd, modChip, plural, tag } from "../lib/ui/bits";
import { html, raw, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { leetcodeSlug } from "../components/workspace/statement";

const KEY = "myleet:diagnostic";

let cat: LoadedCatalog | undefined;
let trainer: TrainerApi | undefined;
let qs: Question[] = [];
let shownAt = 0;
let picked: string | null = null;
const statements = new Map<string, string | null>();

const root = () => document.querySelector<HTMLElement>("[data-diagnostic]");

function readState(): DiagnosticState | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as DiagnosticState | null;
    return v && Array.isArray(v.answers) && Array.isArray(v.coding) ? v : null;
  } catch {
    return null;
  }
}

function saveState(s: DiagnosticState | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // Without storage the run lasts as long as the tab.
  }
  memory = s;
}
let memory: DiagnosticState | null = null;
const state = (): DiagnosticState | null => readState() ?? memory;

function start(): void {
  const s: DiagnosticState = { seed: Math.floor(Math.random() * 2 ** 31), started: Date.now() - 1000, answers: [], coding: [] };
  saveState(s);
  qs = cat ? questions(cat.catalog, s.seed) : [];
  void paint();
}

const title = (id: string) => cat?.byId.get(id)?.title ?? id;
const target = (id: string) => cat?.byId.get(id)?.time_target_secs ?? 900;
const label = (topic: string) => TOPICS.find((t) => t.id === topic || t.label.toLowerCase().replace(/[:,]/g, "") === topic)?.label ?? topic;

async function codingGrades(s: DiagnosticState): Promise<(Grade | null)[]> {
  const evs = parseEvents(await readEvents());
  const progress = runProgress(evs, s.coding.map((c) => c.problem), "placement", s.started);
  return progress.map((p) => gradeCoding(p, target(p.problem)));
}

// ---- statements (LeetCode's, through the Worker) ----

async function loadStatement(id: string): Promise<void> {
  if (statements.has(id)) return;
  statements.set(id, null);
  const slug = leetcodeSlug(cat?.byId.get(id)?.url ?? "");
  try {
    const res = await fetch(`/api/statement?slug=${encodeURIComponent(slug ?? "")}`, { credentials: "same-origin" });
    const body = res.ok && (res.headers.get("content-type") ?? "").includes("json") ? ((await res.json()) as { markdown?: string }) : {};
    const text = body.markdown ? excerpt(body.markdown) : "";
    if (text) {
      const { renderMarkdown } = await import("../components/workspace/markdown");
      statements.set(id, renderMarkdown(text));
    } else statements.set(id, "");
  } catch {
    statements.set(id, "");
  }
  const slot = root()?.querySelector<HTMLElement>(`[data-statement="${CSS.escape(id)}"]`);
  if (slot) render(slot, statementBody(id));
}

function statementBody(id: string): SafeHtml {
  const s = statements.get(id);
  const url = cat?.byId.get(id)?.url;
  if (s === undefined || s === null) return html`<div class="skel" style="height:18px;width:92%"></div><div class="skel" style="height:18px;width:70%;margin-top:8px"></div>`;
  if (s) return raw(s);
  return html`<p>The statement didn't load here.</p>${url ? html`<a class="link lc" href="${url}" target="_blank" rel="noopener">Read it on LeetCode${icon("external-link")}</a>` : ""}`;
}

// ---- views ----

function steps(text: string, n: number, on: number, stop: boolean): SafeHtml {
  return html`<div class="steps"><span class="count">${text}</span>${
    stop ? html`<button class="btn btn-ghost btn-sm skip" type="button" data-finish>Stop and see results</button>` : ""
  }</div><div class="track" style="--n:${n}" aria-hidden="true">${Array.from({ length: n }, (_, i) => html`<i class="${i < on ? "on" : ""}"></i>`)}</div>`;
}

function intro(): SafeHtml {
  return html`<section class="q gate" aria-labelledby="d-h" style="margin-top:var(--space-4)">
    <h1 id="d-h" tabindex="-1">Find your level</h1>
    <p class="lede">It takes about 15 minutes, and you <strong>don't need an account</strong></p>
    ${gateSteps([
      [`${QUESTIONS} quick questions`, "Each one shows a real interview problem and asks which pattern solves it"],
      ["Two or three short problems", "You solve them in the editor, picked from the patterns you weren't sure about"],
      ["Your starting point", "Nothing goes on a review schedule; it only decides what you study first"],
    ])}
    <div class="gate-actions"><button class="btn btn-primary btn-lg" type="button" data-start>Start ${kbd("enter")}</button><a class="link" href="${ROUTES.howItWorks}">How myleet works</a></div>
  </section>`;
}

function questionView(s: DiagnosticState, q: Question, i: number): SafeHtml {
  const p = cat?.byId.get(q.problem);
  return html`${steps(`Question ${i + 1} of ${qs.length}`, qs.length, i, s.answers.length > 0)}
    <section class="q" aria-labelledby="dq-h">
      <h1 id="dq-h" tabindex="-1">Which pattern fits this problem?</h1>
      <div class="dq-problem">
        <div class="head"><h2>${title(q.problem)}</h2>${p ? diff(p.difficulty) : ""}</div>
        <div class="statement" data-statement="${q.problem}">${statementBody(q.problem)}</div>
      </div>
      <fieldset class="options dq" role="radiogroup" aria-labelledby="dq-h">${q.options.map(
        (o, j) => html`<label class="opt"><input type="radio" name="dq" value="${o}" ${picked === o ? "checked" : ""} /><strong>${o}</strong>${kbd(String(j + 1))}</label>`,
      )}</fieldset>
      <div class="next"><button class="btn btn-primary btn-lg" type="button" data-answer ${picked ? "" : "disabled"}>${i + 1 < qs.length ? "Next" : "On to the problems"} ${kbd("enter")}</button><button class="btn btn-ghost dk" type="button" data-dont-know>I don't know this yet</button></div>
    </section>`;
}

const GRADE_TAG: Record<Grade, SafeHtml> = {
  clean: tag("pass", "Clean pass"),
  hinted: tag("progress", "Passed with help or over time"),
  failed: tag("fail", "Missed"),
  skipped: tag("outline", "Not yet", { dot: false }),
};

function codingView(s: DiagnosticState, grades: (Grade | null)[]): SafeHtml {
  const nowIdx = grades.findIndex((g) => g === null);
  const done = grades.filter((g) => g !== null).length;
  return html`${steps(`Problem ${Math.min(done + 1, s.coding.length)} of up to ${CODING_MAX}`, CODING_MAX, done, true)}
    <section class="q" aria-labelledby="dc-h">
      <h1 id="dc-h" tabindex="-1">${done ? "Next problem" : "Now a short problem"}</h1>
      <p class="sub">Picked from a pattern you weren't sure about. Solve it as you would in an interview, with the timer on and no notes. Submit when you're done, or choose <strong>I don't know this yet</strong> in the editor</p>
      <ol class="warm">${s.coding.map((c, i) => {
        const g = grades[i];
        const p = cat?.byId.get(c.problem);
        if (g) return html`<li class="wrow done"><span class="num">${i + 1}</span><div><div class="title">${title(c.problem)}</div><div class="sub">${GRADE_TAG[g]}<span>${label(c.topic)}</span></div></div><span></span></li>`;
        const now = i === nowIdx;
        return html`<li class="wrow ${now ? "now" : "later"}"><span class="num">${i + 1}</span><div><div class="title">${title(c.problem)}</div><div class="sub"><span>${label(c.topic)}</span>${p ? diff(p.difficulty) : ""}<span>${Math.round(target(c.problem) / 60)} min target</span></div></div>${
          now ? html`<a class="btn btn-primary" href="${problemHref(c.problem, "placement")}" data-solve>Start ${kbd("enter")}</a>` : html`<span></span>`
        }</li>`;
      })}</ol>
    </section>`;
}

const LEVEL: Record<Level, SafeHtml> = {
  strong: tag("pass", "Strong"),
  shaky: tag("due", "Shaky"),
  "start here": tag("new", "Start here"),
};

const topicOf = (topic: string) => TOPICS.find((t) => t.id === topic || t.label.toLowerCase().replace(/[:,]/g, "") === topic);

function resultsView(t: TrainerApi, events: string): SafeHtml {
  const c = cat as LoadedCatalog;
  const pl = t.placement(events);
  const items = pl.result?.items ?? [];
  const count = (l: Level) => items.filter((i) => i.level === l).length;
  const rec = pl.recommend ? c.catalog.modules.find((m) => m.id === pl.recommend) : undefined;
  const plan = t.plan(events, planSettings());
  const week = planWeeks(plan)[0];
  const firstNew = plan.days.flatMap((d) => d.sessions.flatMap((x) => x.items))
    .filter((x) => x.kind === "new" && x.problem)
    .slice(0, 3);
  const me = cachedMe();
  const cta = !me
    ? html`<a class="btn btn-primary btn-lg" href="${signupToToday()}">Create your free account to start your plan</a>`
    : readPrefs().plan.onboarded
      ? html`<a class="btn btn-primary btn-lg" href="${ROUTES.today}">Go to Today</a>`
      : html`<a class="btn btn-primary btn-lg" href="${ROUTES.onboarding}">Set up your plan</a>`;
  const [strong, shaky, start] = [count("strong"), count("shaky"), count("start here")];
  // The mesh is the result: each verdict's light pool grows with its count.
  const pool = (n: number) => `${Math.round(12 + (22 * n) / Math.max(1, items.length))}%`;
  const split = ([["strong", strong, "Strong"], ["shaky", shaky, "Shaky"], ["start", start, "Start here"]] as const).filter(([, n]) => n > 0);
  return html`<section class="dres" aria-labelledby="dr-h">
    <header class="dres-head">
      <div class="mesh" aria-hidden="true" style="--mesh-1: var(--pass-solid); --mesh-2: var(--due-solid); --mesh-3: var(--ctp-accent); --mesh-a: ${pool(strong)}; --mesh-b: ${pool(shaky)}; --mesh-c: ${pool(start)}"></div>
      <div class="dres-sum">
        <h1 id="dr-h" tabindex="-1">Your starting point</h1>
        <p class="sub">${plural(strong, "pattern")} strong, ${shaky} shaky and ${start} to start on. None of this goes on your review schedule. It only sets what you study first.</p>
        <div class="split" role="img" aria-label="${strong} strong, ${shaky} shaky, ${start} to start on">${split.map(([k, n]) => html`<span class="${k}" style="flex:${n}"></span>`)}</div>
        <ul class="split-key">${split.map(([k, n, name]) => html`<li class="${k}"><span class="num">${n}</span>${name}</li>`)}</ul>
      </div>
    </header>
    <section class="dres-sec" aria-labelledby="dr-topics">
      <h2 class="sec" id="dr-topics">By topic</h2>
      <ul class="topics">${items.map((it, i) => {
        const how = { skipped: `you chose "I don't know this yet"`, failed: "missed", hinted: "right, but slow or with help", clean: "" }[it.outcome] ?? "";
        const mi = c.catalog.modules.findIndex((m) => m.id === topicOf(it.topic)?.module);
        return html`<li class="rise" style="--i:${i}">${mi >= 0 ? modChip(mi) : html`<span></span>`}<span class="name">${label(it.topic)}</span><span class="src">${title(it.problem)}${how ? `, ${how}` : ""}</span>${LEVEL[it.level]}</li>`;
      })}</ul>
    </section>
    <section class="dres-sec panel start-at" aria-labelledby="dr-week">
      <h2 class="sec" id="dr-week">${rec ? `Your first module: ${sentenceCase(rec.title)}` : "Your first module: the core patterns"}</h2>
      <p>${rec ? html`It's the first pattern you marked "Start here" or got shaky on. <a class="link" href="${moduleHref(rec)}">Read its notes</a>` : "Everything came out strong, so your plan starts with the patterns asked most often in interviews"}</p>
      ${week ? html`<p>Your first week has ${plural(week.problems, "problem")} at ${plural(readPrefs().plan.dailyMinutes ?? 60, "minute")} a day. You can change the time after you sign up.</p><div class="tech">${week.techniques.slice(0, 5).map((x) => tag("new", x))}</div>` : ""}
      ${firstNew.length ? html`<ol>${firstNew.map((x) => html`<li>${x.title}</li>`)}</ol>` : ""}
    </section>
    <div class="next"><button class="btn btn-ghost" type="button" data-retake>Take it again</button></div>
    <aside class="l2 save" aria-labelledby="dr-save">
        <h2 id="dr-save">${me ? "Your plan is ready" : "Save this plan"}</h2>
        <p>${me ? "It starts with the patterns you missed." : "A free account keeps this plan and your progress on every device."}</p>
        ${cta}
        ${me ? "" : html`<p class="fine">Until then, your answers stay in this browser.</p>`}
      </aside>
  </section>`;
}

// ---- paint ----

async function finish(s: DiagnosticState): Promise<void> {
  if (!trainer || !cat) return;
  const grades = await codingGrades(s);
  const items = placementItems(s, qs, grades);
  // Stopping before any answer leaves the earlier result (if any) in place.
  if (items.length) await appendEvent(trainer.placementDone(items));
  saveState(null);
  await paint();
}

async function paint(): Promise<void> {
  const el = root();
  if (!el || !cat || !trainer) return;
  const s = state();
  const events = await readEvents();
  let body: SafeHtml;
  let focusSel = "h1";
  let results = false;
  if (!s) {
    const pl = trainer.placement(events);
    results = !!(pl.done && pl.result && !pl.result.skipped && pl.result.items.length);
    body = results ? resultsView(trainer, events) : intro();
  } else {
    if (!qs.length) qs = questions(cat.catalog, s.seed);
    const i = s.answers.length;
    const q = qs[i];
    if (q) {
      shownAt = Date.now();
      body = questionView(s, q, i);
      void loadStatement(q.problem);
      focusSel = "input:checked, h1";
    } else {
      const grades = await codingGrades(s);
      const next = nextCoding(cat.catalog, s, qs, grades);
      if (next) {
        s.coding.push(next);
        saveState(s);
        grades.push(null);
      }
      if (!grades.includes(null)) return finish(s);
      body = codingView(s, grades);
    }
  }
  el.classList.toggle("is-results", results);
  render(el, body);
  document.title = "Find your level · myleet";
  el.querySelector<HTMLElement>(focusSel)?.focus({ preventScroll: true });
}

function answer(choice: string | null): void {
  const s = state();
  const q = s ? qs[s.answers.length] : undefined;
  if (!s || !q) return;
  s.answers.push({ topic: q.topic, problem: q.problem, choice, ms: Date.now() - shownAt });
  picked = null;
  saveState(s);
  void paint();
}

function onClick(e: MouseEvent): void {
  if (!root()) return;
  const t = e.target as Element;
  if (t.closest("[data-start]")) start();
  else if (t.closest("[data-answer]")) answer(picked);
  else if (t.closest("[data-dont-know]")) answer(null);
  else if (t.closest("[data-finish]")) {
    const s = state();
    if (s) void finish(s);
  } else if (t.closest("[data-retake]")) start();
}

function onChange(e: Event): void {
  const input = e.target as HTMLInputElement;
  if (!root() || input.name !== "dq") return;
  picked = input.value;
  const b = root()?.querySelector<HTMLButtonElement>("[data-answer]");
  if (b) b.disabled = false;
}

function onKey(e: KeyboardEvent): void {
  const el = root();
  if (!el || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
  const a = document.activeElement as HTMLElement | null;
  if (a && (a.tagName === "BUTTON" || a.tagName === "A") && e.key === "Enter") return;
  const radios = [...el.querySelectorAll<HTMLInputElement>('input[name="dq"]')];
  const n = Number(e.key);
  if (radios.length && n >= 1 && n <= radios.length) {
    e.preventDefault();
    const r = radios[n - 1];
    if (r) {
      r.checked = true;
      r.focus();
      r.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } else if (e.key === "Enter") {
    const b = el.querySelector<HTMLElement>("[data-start], [data-answer]:not([disabled]), [data-solve]");
    if (b) {
      e.preventDefault();
      b.click();
    }
  }
}

async function init(): Promise<void> {
  const el = root();
  if (!el) return;
  qs = [];
  try {
    [cat, trainer] = await Promise.all([loadCatalog(), loadTrainer()]);
  } catch {
    render(
      el,
      html`<div class="panel state-note" role="alert"><h2>Couldn't load the problems</h2><p>The diagnostic needs the problem list once. Check your connection and try again.</p><div class="actions"><button class="btn btn-primary" type="button" onclick="location.reload()">Try again</button></div></div>`,
    );
    return;
  }
  await paint();
}

document.addEventListener("click", onClick);
document.addEventListener("change", onChange);
document.addEventListener("keydown", onKey);
document.addEventListener("astro:page-load", () => void init());
// Back from the workspace in the same tab (bfcache) shows the finished attempt.
addEventListener("pageshow", (e: PageTransitionEvent) => e.persisted && root() && void paint());
