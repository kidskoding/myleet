// Mock interview (/mock): setup and history, the round (the workspace in interview mode,
// one iframe per problem under a round bar), time up, self-check, and the reveal (?r=<id>).
import { attempts, parseEvents } from "../lib/attempts";
import { companySlug, loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { sentenceCase } from "../lib/display";
import {
  addReport,
  allYes,
  ANNOUNCE_AT,
  clock,
  clockNote,
  clockPhase,
  newRound,
  outcomeLines,
  pickCompanies,
  companySelection,
  pickWeak,
  problemResult,
  readHistory,
  readRound,
  readMockLink,
  roundSecs,
  type MockLink,
  saveResult,
  writeRound,
  type Checks,
  type MockResult,
  type ProblemResult,
  type Round,
  type Source,
  type WorkspaceReport,
} from "../lib/mock";
import { readPrefs } from "../lib/prefs";
import { appendEvent, readEvents } from "../lib/progress";
import { noteHref, problemHref } from "../lib/routes";
import { recordStats } from "../lib/streak";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import type { InterviewRules } from "../lib/types";
import { plural } from "../lib/ui/bits";
import { mountCompanyPicker } from "../lib/ui/company-picker";
import { html, render, type SafeHtml } from "../lib/ui/html";
import { displayRung, ladder, RUNG_DAYS } from "../lib/ui/ladder";
import { closeDialog, openDialog, toast } from "../lib/ui/overlay";
import { requireAccount, signupHref } from "../lib/access";

interface Ctx {
  t: TrainerApi;
  cat: LoadedCatalog;
  events: string;
  rules: InterviewRules;
}

const PHONE_NOTE_KEY = "myleet:mock-phone-note";
const CHECKS: [string, string][] = [
  ["Did you say your approach before coding?", "Out loud or typed: the pattern and why it fits"],
  ["Did you state time and space complexity?", "Before you were done, not after the tests"],
  ["Did you test an edge case yourself?", "Empty input, one element, duplicates, the largest values"],
];

let ctx: Ctx | null = null;
let round: Round | null = null;
let tickTimer: ReturnType<typeof setInterval> | undefined;
let announced = new Set<number>();
let timeUpShown = false;
/** Opened problems get a self-check, in round order; `checkAt` is the one showing. */
let checkQueue: string[] = [];
let checkAt = 0;

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const root = () => $("[data-mock]");

function view(name: "setup" | "ready" | "round" | "reveal"): void {
  for (const v of document.querySelectorAll<HTMLElement>("[data-mock] [data-view]")) v.hidden = v.dataset.view !== name;
  document.body.classList.toggle("mock-focus", name === "round");
}

function title(id: string): string {
  return ctx?.cat.byId.get(id)?.title ?? id;
}

function techniqueOf(id: string): { label: string; note: string | null; noteTitle: string | null } {
  const p = ctx?.cat.byId.get(id);
  const m = p ? ctx?.cat.catalog.modules[p.module] : undefined;
  const t = p ? m?.techniques[p.technique] : undefined;
  const note = t?.note ?? null;
  const noteTitle = note ? (m?.notes.find((n) => n.path === note)?.title ?? sentenceCase(t?.title ?? "")) : null;
  return { label: [m && !m.bank ? sentenceCase(m.title) : null, t ? sentenceCase(t.title) : null].filter(Boolean).join(", "), note, noteTitle };
}

// ---- setup ----

function setupSource(): Source {
  return (document.querySelector<HTMLInputElement>('[data-setup] input[name="src"]:checked')?.value as Source) ?? "mixed";
}
function setupCompanies(): string[] {
  return companySelection($<HTMLInputElement>("[data-company]")?.value ?? "");
}
function setupN(): number {
  return Number(document.querySelector<HTMLInputElement>('[data-setup] input[name="n"]:checked')?.value ?? 2);
}

const SOURCE_NAME: Record<Source, string> = { mixed: "Mixed", company: "Company sets", weak: "Weak spots" };

/** Picks a round, or explains why the choice can't make one. */
function pick(c: Ctx, n: number, source: Source, seed: number): { ids: string[]; err: string | null } {
  const states = c.t.states(c.events);
  let ids: string[] = [];
  try {
    if (source === "mixed") ids = c.t.interviewPick(c.events, n, seed);
    else if (source === "company") ids = pickCompanies(c.cat.catalog, setupCompanies(), states, n, seed);
    else ids = pickWeak(c.cat.catalog, c.t.stats(c.events).weakest, states, n, seed);
  } catch (e) {
    return { ids: [], err: `Couldn't build a round from ${SOURCE_NAME[source]}: ${e instanceof Error ? e.message : "no problems qualify"}` };
  }
  if (ids.length >= n) return { ids: ids.slice(0, n), err: null };
  const fix = n > 1 && ids.length > 0 ? `Pick ${ids.length === 1 ? "1 problem" : `${ids.length} problems`} or another source` : "Pick another source";
  return { ids, err: `Couldn't build a round from ${SOURCE_NAME[source]}: only ${plural(ids.length, "problem")} ${ids.length === 1 ? "qualifies" : "qualify"}. ${fix}` };
}

function validate(): void {
  if (!ctx) return;
  const { err } = pick(ctx, setupN(), setupSource(), 1);
  const el = $("[data-setup-err]");
  if (el) {
    el.hidden = !err;
    el.textContent = err ?? "";
  }
  const start = $<HTMLButtonElement>("[data-start]");
  if (start) start.disabled = !!err;
}

function paintMockIntro(): void {
  const intro = $("[data-mock-intro]");
  if (!intro || !ctx) return;
  const source = setupSource();
  const selected = setupCompanies();
  const companies = ctx.cat.catalog.playlists.filter((p) => selected.includes(p.id));
  if (source === "company" && companies.length) {
    const names = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).formatToParts(companies.map((p) => p.title));
    render(intro, html`Practice for ${names.map((part) => part.type === "element" ? html`<strong>${part.value}</strong>` : part.value)} with ${setupN()} ${setupN() === 1 ? "problem" : "problems"} from ${companies.length === 1 ? "their set" : "their combined sets"}, with hints and technique labels hidden until you finish`);
    return;
  }
  intro.textContent = source === "weak"
      ? "Practice the techniques you've struggled with, without hints or technique labels"
      : ctx.events.trim()
        ? "Practice techniques you've already worked on, with one timer and no hints or technique labels"
        : "Try a timed coding interview, and choose your approach without hints or technique labels";
}

function paintSetup(c: Ctx): void {
  view("setup");
  const std = $("[data-std-mins]");
  if (std) std.textContent = String(Math.round(c.rules.round_secs / 60));

  const q = new URLSearchParams(location.search).get("company");
  const slug = q ?? readPrefs().plan.companies[0];
  const pl = slug ? c.cat.catalog.playlists.find((p) => companySlug(p.id) === slug) : undefined;
  const sel = $<HTMLInputElement>("[data-company]");
  if (sel && pl) {
    const slugs = q ? [q] : readPrefs().plan.companies.slice(0, 3);
    sel.value = JSON.stringify(slugs.flatMap((slug) => c.cat.catalog.playlists.filter((p) => companySlug(p.id) === slug).map((p) => p.id)));
    sel.dispatchEvent(new Event("change"));
  }
  if (q && pl) {
    const r = document.querySelector<HTMLInputElement>('[data-setup] input[value="company"]');
    if (r) r.checked = true;
  }

  mountCompanyPicker(() => { validate(); paintMockIntro(); });
  paintMockIntro();

  const weak = c.t.stats(c.events).weakest;
  const weakInput = $<HTMLInputElement>("[data-weak-input]");
  if (weakInput) {
    weakInput.disabled = weak.length === 0;
    if (weakInput.disabled && weakInput.checked) document.querySelector<HTMLInputElement>('[data-setup] input[value="mixed"]')!.checked = true;
  }
  const wt = $("[data-weak-text]");
  if (wt) wt.textContent = weak.length ? `Only techniques where you've missed clean passes: ${weak.slice(0, 2).map((w) => sentenceCase(w.technique_title)).join(", ")}${weak.length > 2 ? " and more" : ""}` : "No weak spots yet. A technique becomes one after a few attempts that weren't clean";

  paintHistory();
  const cp = c.t.checkpoint(c.events);
  const ci = $("[data-checkin]");
  if (ci) {
    ci.hidden = false;
    const txt = $("[data-checkin-text]");
    if (txt)
      txt.textContent = cp.suggest_through > 0
        ? `A check-in on modules 1 to ${cp.suggest_through} is ready: a short mixed set from what you've covered. It runs from Today`
        : "Check-ins on the modules you've covered run from Today once you've started enough of them";
  }
  validate();
}

function sourceLabel(m: Pick<MockResult, "source" | "company" | "companies">): string {
  if (m.source === "company") {
    const ids = m.companies ?? (m.company ? [m.company] : []);
    const names = ctx?.cat.catalog.playlists.filter((p) => ids.includes(p.id)).map((p) => p.title) ?? [];
    return names.length ? `${new Intl.ListFormat("en", { type: "conjunction" }).format(names)} ${names.length > 1 ? "sets" : "set"}` : "company sets";
  }
  return m.source === "weak" ? "weak spots" : "mixed";
}

function paintHistory(): void {
  const host = $("[data-hist]");
  const hist = readHistory();
  const count = $("[data-hist-count]");
  if (count) count.textContent = hist.length ? plural(hist.length, "round") : "";
  host?.removeAttribute("aria-busy");
  render(
    host,
    hist.length
      ? html`<ol class="hist">${hist.slice(0, 8).map((m) => {
          const solved = m.problems.filter((p) => p.green).length;
          const mins = Math.round((m.end - m.start) / 60000);
          const when = new Date(m.start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
          return html`<li><a href="/mock?r=${m.id}"><span class="when">${when}</span><span class="what">${plural(m.problems.length, "problem")}, ${sourceLabel(m)}, ${mins} min${m.timeUp ? ", time up" : ""}</span><span class="score">${solved}<small> / ${m.problems.length}</small></span></a></li>`;
        })}</ol>`
      : html`<p class="empty-hist">You have not completed a mock interview yet. Start with two problems to practice choosing an approach and managing your time without technique labels</p>`,
  );
}

function startRound(): void {
  if (!ctx) return;
  const n = setupN();
  const source = setupSource();
  const { ids, err } = pick(ctx, n, source, Date.now() % 2_147_483_647);
  if (err) return validate();
  round = newRound({
    problems: ids,
    secs: roundSecs(n, ctx.rules.round_secs),
    source,
    company: source === "company" ? (setupCompanies()[0] ?? null) : null,
    ...(source === "company" ? { companies: setupCompanies() } : {}),
    ...(link ? { session: link.session } : {}),
    now: Date.now(),
  });
  writeRound(round);
  enterRound();
}

// ---- the round ----

function enterRound(): void {
  if (!round) return;
  view("round");
  announced = new Set();
  timeUpShown = round.overtime;
  const host = $("[data-frames]");
  if (host) host.replaceChildren();
  const note = $("[data-phone-note]");
  if (note) note.hidden = !matchMedia("(max-width: 760px)").matches || localStorage.getItem(PHONE_NOTE_KEY) === "1";
  showProblem(round.current);
  clearInterval(tickTimer);
  tickTimer = setInterval(tick, 1000);
  tick();
}

/** Hides the workspace's own back arrow and timer: the round bar owns both. */
const FRAME_CSS = ".wbar a[data-back], .wbar [data-timer] { display: none !important; }";

function frameFor(id: string): HTMLIFrameElement {
  const host = $("[data-frames]") as HTMLElement;
  let f = host.querySelector<HTMLIFrameElement>(`iframe[data-p="${CSS.escape(id)}"]`);
  if (f) return f;
  f = document.createElement("iframe");
  f.dataset.p = id;
  f.title = `${title(id)}, workspace`;
  f.src = problemHref(id, "interview");
  f.addEventListener("load", () => {
    const w = f?.contentWindow;
    const doc = f?.contentDocument;
    if (!w || !doc) return;
    const st = doc.createElement("style");
    st.textContent = FRAME_CSS;
    doc.head.append(st);
    w.addEventListener("myleet:workspace-report", (e) => onReport((e as CustomEvent<WorkspaceReport>).detail));
    w.addEventListener("keydown", roundKeys, { capture: true });
  });
  host.append(f);
  return f;
}

function showProblem(i: number): void {
  if (!round) return;
  round.current = Math.max(0, Math.min(round.problems.length - 1, i));
  writeRound(round);
  const id = round.problems[round.current] as string;
  const f = frameFor(id);
  for (const other of document.querySelectorAll<HTMLIFrameElement>("[data-frames] iframe")) other.hidden = other !== f;
  f.focus();
  paintBar();
}

function paintBar(): void {
  if (!round) return;
  const n = round.problems.length;
  const cur = round.current;
  render(
    $("[data-pips]"),
    html`${round.problems.map((id, i) => html`<span class="pip${i === cur ? " on" : round?.reports[id]?.green ? " done" : ""}"></span>`)}`,
  );
  const lbl = $("[data-step-label]");
  if (lbl) lbl.textContent = `Problem ${cur + 1} of ${n}`;
  const prev = $<HTMLButtonElement>("[data-prev]");
  if (prev) prev.disabled = cur === 0;
  const next = $("[data-next]");
  if (next) next.textContent = cur === n - 1 ? "Finish round" : "Next problem";
}

function tick(): void {
  if (!round || round.phase !== "round") return;
  const elapsed = Date.now() - round.start;
  const phase = clockPhase(elapsed, round.secs);
  const wrap = $("[data-clock-wrap]");
  if (wrap) {
    wrap.dataset.state = phase;
    wrap.setAttribute("aria-label", `Round time ${clock(elapsed)}, ${clockNote(elapsed, round.secs)}`);
  }
  const c = $("[data-clock]");
  if (c) c.textContent = clock(elapsed);
  const note = $("[data-clock-note]");
  if (note) note.textContent = clockNote(elapsed, round.secs);
  const track = $("[data-clock-track]");
  if (track) track.style.width = `${Math.min(100, (elapsed / (round.secs * 1000)) * 100).toFixed(1)}%`;
  const leftMin = (round.secs * 1000 - elapsed) / 60000;
  for (const m of ANNOUNCE_AT)
    if (leftMin <= m && leftMin > m - 1 && !announced.has(m)) {
      announced.add(m);
      const live = $("[data-announce]");
      if (live) live.textContent = `${plural(m, "minute")} left`;
    }
  if (phase === "over" && !timeUpShown) {
    timeUpShown = true;
    openTimeUp(true);
  }
}

function onReport(r: WorkspaceReport): void {
  if (!round || r.mode !== "interview") return;
  round = addReport(round, r, Date.now());
  writeRound(round);
  paintBar();
}

function reportLine(id: string, i: number): string {
  const r = round?.reports[id];
  const name = `Problem ${i + 1}`;
  if (!r) return `${name} has no test run yet`;
  if (r.event === "submit" && r.green) return `${name} passes all tests`;
  return `${name} passes ${r.passed} of ${r.total}`;
}

function openTimeUp(timeUp: boolean): void {
  if (!round) return;
  const d = $<HTMLDialogElement>("#mk-timeup");
  const t = $("[data-tu-title]");
  const body = $("[data-tu-body]");
  const keep = $("[data-keep]");
  const mins = Math.round(round.secs / 60);
  if (t) t.textContent = timeUp ? "Time's up" : "End the round now?";
  if (body)
    body.textContent = `${timeUp ? `The ${mins}-minute time limit has ended` : "The clock is still running. Unsubmitted problems count as attempted only if you opened them"} Your code is saved as it is: ${round.problems.map(reportLine).join(", ")}. Submit in each workspace to count a pass`;
  if (keep) keep.textContent = timeUp ? "Keep coding, mark as over time" : "Keep going";
  d?.setAttribute("role", timeUp ? "alertdialog" : "dialog");
  openDialog(d);
}

async function finishRound(): Promise<void> {
  if (!round || !ctx) return;
  closeDialog($<HTMLDialogElement>("#mk-timeup"));
  clearInterval(tickTimer);
  ctx.events = await readEvents();
  round = { ...round, phase: "check", end: round.end ?? Date.now() };
  writeRound(round);
  startChecks();
}

function startChecks(): void {
  if (!round) return;
  checkQueue = round.problems.filter((id) => !!openedAttempt(id));
  checkAt = Math.max(0, checkQueue.findIndex((id) => !round?.checks[id] || round.checks[id]?.some((x) => x === null)));
  if (checkQueue.every((id) => round?.checks[id]?.every((x) => x !== null))) checkAt = checkQueue.length;
  nextCheck();
}

/** The interview attempt opened for `id` during this round, from events.jsonl. */
function openedAttempt(id: string): string | null {
  if (!round || !ctx) return round?.reports[id]?.attempt ?? null;
  const mine = attempts(parseEvents(ctx.events)).filter((a) => a.problem === id && a.mode === "interview" && a.start >= round!.start - 1000);
  return round.reports[id]?.attempt ?? mine.at(-1)?.id ?? null;
}

function nextCheck(): void {
  if (!round) return;
  const id = checkQueue[checkAt];
  if (!id) return void record();
  const d = $<HTMLDialogElement>("#mk-check");
  const t = $("[data-sc-title]");
  if (t) t.textContent = `${title(id)}: be honest`;
  const checks: Checks = round.checks[id] ?? [null, null, null];
  round.checks[id] = checks;
  const last = checkAt === checkQueue.length - 1;
  const nextBtn = $<HTMLButtonElement>("[data-check-next]");
  if (nextBtn) nextBtn.innerHTML = html`${last ? "See the reveal" : "Next problem"} <kbd>enter</kbd>`.value;
  paintChecks(id);
  openDialog(d);
  d?.querySelector<HTMLButtonElement>(".check button")?.focus();
}

function paintChecks(id: string, focusRow = 0): void {
  const checks = round?.checks[id] ?? [null, null, null];
  render(
    $("[data-checks]"),
    html`${CHECKS.map(
      ([q, sub], i) => html`<div class="check${i === focusRow ? " is-kbd" : ""}" data-row="${i}"><div><strong id="ck${i}">${q}</strong><p>${sub}</p></div>
        <div class="seg" role="group" aria-labelledby="ck${i}"><button type="button" data-ans="1" aria-pressed="${String(checks[i] === true)}">Yes</button><button type="button" data-ans="0" aria-pressed="${String(checks[i] === false)}">No</button></div></div>`,
    )}`,
  );
  const nextBtn = $<HTMLButtonElement>("[data-check-next]");
  if (nextBtn) nextBtn.disabled = checks.some((x) => x === null);
}

function answer(row: number, yes: boolean): void {
  if (!round) return;
  const id = checkQueue[checkAt];
  if (!id) return;
  const c = (round.checks[id] ?? [null, null, null]) as Checks;
  c[row] = yes;
  round.checks[id] = c;
  writeRound(round);
  const nextRow = c.findIndex((x) => x === null);
  paintChecks(id, nextRow < 0 ? row : nextRow);
  const btn = document.querySelector<HTMLButtonElement>(`#mk-check [data-row="${nextRow < 0 ? row : nextRow}"] button[data-ans="${nextRow < 0 ? (yes ? 1 : 0) : 1}"]`);
  (nextRow < 0 ? $<HTMLButtonElement>("[data-check-next]") : btn)?.focus();
}

async function record(): Promise<void> {
  if (!round || !ctx) return;
  closeDialog($<HTMLDialogElement>("#mk-check"));
  const r = round;
  const c = ctx;
  const before = c.t.states(c.events);
  const results: ProblemResult[] = r.problems.map((id) => problemResult(r, id, openedAttempt(id), before[id]));
  try {
    for (const p of results) {
      if (!p.attempt) continue;
      const hints = r.reports[p.id]?.hints ?? 0;
      for (const l of outcomeLines(p, hints, c.rules.hint_penalty_secs))
        c.events = await appendEvent(c.t.eventLine({ kind: l.kind, problem: p.id, attempt: p.attempt, mode: "interview", ...(l.data ? { data: l.data } : {}) }));
    }
  } catch {
    toast("Couldn't save this round's results to your progress. Try again from this page");
    return;
  }
  const after = c.t.states(c.events);
  for (const p of results) p.rungAfter = after[p.id]?.rung ?? -1;
  const end = r.end ?? Date.now();
  const result: MockResult = { id: r.id, start: r.start, end, secs: r.secs, source: r.source, company: r.company, ...(r.companies ? { companies: r.companies } : {}), timeUp: r.overtime || end > r.start + r.secs * 1000, problems: results, ...(r.session ? { session: r.session } : {}) };
  saveResult(result);
  writeRound(null);
  round = null;
  recordStats(c.t.stats(c.events));
  history.replaceState(history.state, "", `/mock?r=${result.id}`);
  paintReveal(result);
  // Let the score land first, then offer to keep it.
  setTimeout(() => requireAccount("save-mock"), 900);
}

// ---- reveal ----

function effectText(p: ProblemResult): string {
  const days = (rung: number) => plural(RUNG_DAYS[Math.max(0, rung)] ?? 1, "day");
  if (!p.started) return p.rungBefore < 0 ? "Not started. Nothing recorded" : "Not started. Its schedule didn't change";
  if (!p.green) return `${p.total ? `${p.passed} of ${p.total} tests` : "No submit"}. Back to 1 day`;
  if (p.rungBefore < 0) return allYes(p.checks) && !p.overTime ? "First pass. Review in 1 day" : "Passed with help. Review in 1 day";
  if (p.rungAfter > p.rungBefore) return `Clean pass. Up to ${days(p.rungAfter)}`;
  if (p.rungAfter === p.rungBefore && p.rungAfter > 0) return `Clean pass, same day as the last one. Stays at ${days(p.rungAfter)}`;
  const why = !allYes(p.checks) ? "self-check not all yes" : p.overTime ? "after time ran out" : "over its time target";
  return `Passed, not clean (${why}). Back to 1 day`;
}

const yesNo = (c: Checks | null) => (c ?? []).map((x) => (x ? "yes" : "no")).join(", ");

function paintReveal(m: MockResult): void {
  view("reveal");
  const host = $<HTMLElement>("[data-view=reveal]");
  const solved = m.problems.filter((p) => p.green).length;
  const used = m.end - m.start;
  const when = new Date(m.start).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const checksYes = m.problems.filter((p) => allYes(p.checks)).length;
  const panels: SafeHtml[] = m.problems.map((p, i) => {
    const tech = techniqueOf(p.id);
    const before = displayRung(p.rungBefore);
    const after = displayRung(p.rungAfter);
    const fell = p.started && after < before ? before : undefined;
    const facts: SafeHtml[] = [];
    if (p.started) facts.push(html`<span><b>${clock(p.elapsedMs)}</b> on the problem's clock</span>`);
    if (p.total) facts.push(html`<span><b>${p.passed} of ${p.total}</b> tests</span>`);
    if (p.checks) facts.push(html`<span>Approach, complexity, edge case: <b>${yesNo(p.checks)}</b></span>`);
    if (!p.started) facts.push(html`<span>Not opened in this round</span>`);
    facts.push(html`<a class="link" href="${problemHref(p.id)}">Open the problem</a>`);
    if (tech.note && tech.noteTitle && !(p.green && allYes(p.checks))) facts.push(html`<a class="link" href="${noteHref(tech.note)}">Read: ${tech.noteTitle}</a>`);
    return html`<li class="panel">
      <div><h3>${title(p.id)}</h3><div class="tech">Technique <span class="unveil" style="--i:${i}">${tech.label || "Unlabelled"}</span></div></div>
      <div class="effect">${ladder({ rung: after, size: "lg", ...(fell ? { fell } : {}) })}<p>${effectText(p)}</p></div>
      <div class="facts">${facts}</div>
    </li>`;
  });
  render(
    host,
    html`<div class="reveal-head">
        <div><h1 id="rv-title" tabindex="-1">Round results</h1>
        <p class="lede">${when}. ${solved} of ${m.problems.length} solved, ${clock(used)} used${m.timeUp ? ", time ran out" : ""}. ${sourceLabel(m) === "mixed" ? "Mixed" : sourceLabel(m)} draw</p>
        <p class="track-cta when-out"><span><a class="link" href="${signupHref()}">Sign up for free</a> to save this score and add your misses to your plan</span></p></div>
        <div class="btns"><a class="btn btn-secondary" href="/mock">Back to mocks</a><a class="btn btn-primary" href="/mock" data-again>Another round</a></div>
      </div>
      <div class="summary">
        <div><div class="v">${solved} / ${m.problems.length}</div><div class="l">Problems with all tests passing</div></div>
        <div><div class="v">${clock(used)}</div><div class="l">${used > m.secs * 1000 ? `Over the ${Math.round(m.secs / 60)} min round` : `Of ${Math.round(m.secs / 60)} min used`}</div></div>
        <div><div class="v">${checksYes} / ${m.problems.length}</div><div class="l">Self-checks all yes</div></div>
      </div>
      <ol class="rv">${panels}</ol>`,
  );
  $<HTMLElement>("#rv-title")?.focus();
}

// ---- wiring ----

/** "Keep coding" (or Esc) at time up: the round runs over and later passes can't be clean. */
function keepCoding(): void {
  if (!round || !timeUpShown) return;
  round.overtime = true;
  writeRound(round);
}

function roundKeys(e: KeyboardEvent): void {
  if (!round || round.phase !== "round" || !(e.metaKey || e.ctrlKey) || (e.key !== "]" && e.key !== "[")) return;
  e.preventDefault();
  e.stopPropagation();
  showProblem(round.current + (e.key === "]" ? 1 : -1));
}

async function init(): Promise<void> {
  if (!root()) return;
  clearInterval(tickTimer);
  try {
    const [t, cat, events] = await Promise.all([loadTrainer(), loadCatalog(), readEvents()]);
    ctx = { t, cat, events, rules: t.interviewRules() };
    if (events.trim()) recordStats(t.stats(events));
  } catch (e) {
    view("setup");
    const el = $("[data-setup-err]");
    if (el) {
      el.hidden = false;
      el.textContent = `Couldn't load the problem list (${e instanceof Error ? e.message : "network error"}). Your progress is safe on this device. Reload to try again`;
    }
    const start = $<HTMLButtonElement>("[data-start]");
    if (start) start.disabled = true;
    render($("[data-hist]"), html``);
    return;
  }
  const tu = $<HTMLDialogElement>("#mk-timeup");
  if (tu) tu.oncancel = () => keepCoding();
  const ck = $<HTMLDialogElement>("#mk-check");
  if (ck) ck.oncancel = (e) => e.preventDefault(); // the self-check can't be skipped
  const rid = new URLSearchParams(location.search).get("r");
  const past = rid ? readHistory().find((m) => m.id === rid) : undefined;
  round = readRound();
  if (past) return paintReveal(past);
  if (round?.phase === "round") return enterRound();
  if (round?.phase === "check") {
    view("round");
    return startChecks();
  }
  paintSetup(ctx);
  link = readMockLink(location.search);
  if (link) paintReady(link);
}

/** From the plan: preset the form from the link (paintSetup already applied ?company), then offer one Begin button. */
let link: MockLink | null = null;
function paintReady(l: MockLink): void {
  const n = document.querySelector<HTMLInputElement>(`[data-setup] input[name="n"][value="${l.n}"]`);
  if (n) n.checked = true;
  const company = l.company && setupCompanies().length ? l.company : null;
  if (!company) {
    const mixed = document.querySelector<HTMLInputElement>('[data-setup] input[value="mixed"]');
    if (mixed) mixed.checked = true;
  }
  const mins = Math.round(roundSecs(l.n, ctx?.rules.round_secs ?? 2700) / 60);
  const set = company ? `from your ${sourceLabel({ source: "company", company: setupCompanies()[0] ?? null, companies: setupCompanies() })}` : "from across what you've covered";
  const txt = $("[data-ready-text]");
  if (txt) txt.textContent = `${plural(l.n, "problem")} ${set}, with one ${mins}-minute timer for the whole round. Hints and technique labels stay hidden until you finish.`;
  view("ready");
  $<HTMLButtonElement>("[data-begin]")?.focus();
}

document.addEventListener("submit", (e) => {
  if (!(e.target as Element).matches?.("[data-setup]")) return;
  e.preventDefault();
  startRound();
});

document.addEventListener("change", (e) => {
  if ((e.target as Element).closest?.("[data-setup]")) { validate(); paintMockIntro(); }
});

document.addEventListener("click", (e) => {
  if (!root()) return;
  const t = e.target as Element;
  const menu = $("#mk-menu");
  const more = $("[data-more]");
  if (t.closest("[data-more]")) {
    const open = menu?.hidden ?? false;
    if (menu) menu.hidden = !open;
    more?.setAttribute("aria-expanded", String(open));
    if (open) menu?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return;
  }
  if (menu && !menu.hidden && !t.closest("#mk-menu")) (menu.hidden = true), more?.setAttribute("aria-expanded", "false");
  if (t.closest("[data-end]")) {
    if (menu) menu.hidden = true;
    openTimeUp(false);
  } else if (t.closest("[data-prev]") && round) showProblem(round.current - 1);
  else if (t.closest("[data-next]") && round) {
    if (round.current === round.problems.length - 1) openTimeUp(false);
    else showProblem(round.current + 1);
  } else if (t.closest("[data-finish]")) void finishRound();
  else if (t.closest("[data-keep]")) {
    keepCoding();
    closeDialog($<HTMLDialogElement>("#mk-timeup"));
  } else if (t.closest("[data-ans]")) {
    const b = t.closest<HTMLElement>("[data-ans]");
    const row = Number(b?.closest<HTMLElement>("[data-row]")?.dataset.row ?? 0);
    answer(row, b?.dataset.ans === "1");
  } else if (t.closest("[data-begin]")) startRound();
  else if (t.closest("[data-change]")) {
    link = null;
    history.replaceState(history.state, "", location.pathname);
    view("setup");
  } else if (t.closest("[data-phone-ok]")) {
    try {
      localStorage.setItem(PHONE_NOTE_KEY, "1");
    } catch {
      // Shown again next round.
    }
    const n = $("[data-phone-note]");
    if (n) n.hidden = true;
  } else if (t.closest("[data-again]")) {
    e.preventDefault();
    history.replaceState(history.state, "", "/mock");
    if (ctx) paintSetup(ctx);
  }
});

document.addEventListener("keydown", (e) => {
  if (!root()) return;
  const check = $<HTMLDialogElement>("#mk-check");
  if (check?.open) {
    if (e.key === "y" || e.key === "n") {
      e.preventDefault();
      const row = Number(check.querySelector<HTMLElement>(".check.is-kbd")?.dataset.row ?? 0);
      answer(row, e.key === "y");
    }
    return;
  }
  roundKeys(e);
  if (e.key === "Enter" && !$("[data-view=setup]")?.hidden && !(e.target as Element).closest?.("select, button, a, textarea")) {
    if ((e.target as Element).closest?.("[data-setup]") || e.target === document.body) {
      e.preventDefault();
      startRound();
    }
  }
});

document.addEventListener("submit", (e) => {
  if (!(e.target as Element).matches?.("[data-check-form]")) return;
  e.preventDefault();
  const id = checkQueue[checkAt];
  if (!id || round?.checks[id]?.some((x) => x === null)) return; // unanswered rows keep the sheet open
  checkAt += 1;
  if (checkAt >= checkQueue.length) return void record();
  closeDialog($<HTMLDialogElement>("#mk-check"));
  setTimeout(nextCheck, 160);
});

document.addEventListener("astro:page-load", () => void init());
// On a new device the account's history and pins arrive after the first paint; redraw the setup with them.
for (const ev of ["myleet:auth", "myleet:synced"])
  addEventListener(ev, async () => {
    if (!root() || !ctx || $("[data-view=setup]")?.hidden || round) return;
    ctx.events = await readEvents();
    paintSetup(ctx);
  });
document.addEventListener("astro:before-swap", () => {
  clearInterval(tickTimer);
  document.body.classList.remove("mock-focus");
});
