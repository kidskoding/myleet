// Onboarding (/onboarding?step=...): role, your goals (the shared goals editor, filled here the
// first time), LeetCode, hours and the plan.
// Each step is a URL so Back works. Answers save as you go (lib/prefs). The placement
// diagnostic lives at /diagnostic.
import { brandIcon } from "../lib/ui/brand";
import { navigate } from "astro:transitions/client";
import { loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { daysUntil, planWeeks, shortDate, TIME_OPTIONS } from "../lib/plan";
import { aimsOf } from "../lib/goals";
import { planSettings, readPrefs, updatePrefs, type Goal } from "../lib/prefs";
import { DEFAULT_WINDOWS } from "../lib/schedule";
import { mountAvailability, type AvailabilityEditor } from "../lib/ui/availability";
import { openCalendarSync } from "../lib/ui/calendar-sync";
import { readEvents } from "../lib/progress";
import { ROUTES } from "../lib/routes";
import { localDay } from "../lib/streak";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import { kbd, plural, tag } from "../lib/ui/bits";
import { html, raw, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { goalsOf, mountGoalsEditor, planPatch } from "../lib/ui/goals-editor";
import { mountLeetcodePanel } from "../lib/ui/leetcode-connect";

const STEPS = ["goal", "goals", "leetcode", "when", "plan"] as const;
type Step = (typeof STEPS)[number];
/** Steps from before the goals editor, folded into it. */
const OLD_STEPS = ["aims", "companies", "date", "topics", "time"];
const steps = (): Step[] => [...STEPS];

const GOALS: { id: Goal; label: string; detail: string }[] = [
  { id: "internship", label: "Internship", detail: "Mostly easy and medium problems, arrays to trees first" },
  { id: "coop", label: "Co-op", detail: "The same core topics as internships, often with more interview rounds" },
  { id: "newgrad", label: "New grad", detail: "Medium and some hard problems, with more graphs and dynamic programming" },
];
let cat: LoadedCatalog | undefined;
let trainer: TrainerApi | undefined;

const root = () => document.querySelector<HTMLElement>("[data-onboarding]");

function currentStep(): Step {
  const s = new URLSearchParams(location.search).get("step") ?? "";
  if (OLD_STEPS.includes(s)) return "goals";
  return (STEPS as readonly string[]).includes(s) ? (s as Step) : "goal";
}

function go(step: Step, replace = false): void {
  const url = `${ROUTES.onboarding}?step=${step}`;
  if (replace) history.replaceState(history.state, "", url);
  else history.pushState(history.state, "", url);
  void paint();
}

function head(step: Step, opts: { skip?: boolean } = {}): SafeHtml {
  const all = steps();
  const i = all.indexOf(step);
  const back = i > 0 ? html`<button class="icon-btn back" type="button" data-back aria-label="Back">${icon("arrow-left")}</button>` : "";
  return html`<div class="steps">${back}<span class="count">Step ${i + 1} of ${all.length}</span>${
    opts.skip === false ? "" : html`<button class="btn btn-ghost btn-sm skip" type="button" data-skip>Skip setup</button>`
  }</div>
  <div class="track" style="--n:${all.length}" aria-hidden="true">${all.map((_, j) => html`<i class="${j <= i ? "on" : ""}"></i>`)}</div>`;
}

function radios(name: string, label: string, opts: { id: string; label: string; detail: string }[], value: string | null): SafeHtml {
  return html`<fieldset class="options" role="radiogroup" aria-labelledby="${label}">${opts.map(
    (o, i) =>
      html`<label class="opt"><input type="radio" name="${name}" value="${o.id}" ${o.id === value ? "checked" : ""} /><strong>${o.label}</strong><span>${o.detail}</span>${kbd(String(i + 1))}</label>`,
  )}</fieldset>`;
}

function goalStep(): SafeHtml {
  const g = readPrefs().plan.goal;
  return html`${head("goal")}<section class="q" aria-labelledby="q1">
    <h1 id="q1">What are you preparing for?</h1>
    <p class="sub">This sets your time targets and the order of topics</p>
    ${radios("goal", "q1", GOALS, g)}
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-continue ${g ? "" : "disabled"}>Continue</button><span class="hint">${kbd("1")}–${kbd("3")} to pick, ${kbd("enter")} to continue</span></div>
  </section>`;
}

function goalsStep(error?: string): SafeHtml {
  const any = aimsOf(readPrefs().plan).length > 0;
  return html`${head("goals")}<section class="q ob-goals" aria-labelledby="q2">
    <h1 id="q2">What are you working towards?</h1>
    <p class="sub">Turn on as many as fit. Your plan blends them, and you can edit your goals any time</p>
    <div class="panel ob-goals-panel" data-goals-host></div>
    <p class="err field" id="ge-err" role="alert" ${error ? "" : "hidden"} style="margin-top:var(--space-3)">${error ?? ""}</p>
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-continue ${any ? "" : "disabled"}>Continue</button><span class="hint" data-goals-hint>${any ? html`${kbd("1")}–${kbd("4")} to turn goals on or off` : "Turn on at least one goal"}</span></div>
  </section>`;
}

function leetcodeStep(): SafeHtml {
  return html`${head("leetcode")}<section class="q" aria-labelledby="q3b">
    <h1 id="q3b">Connect your <span class="co-inline">${raw(brandIcon("leetcode", 30))}LeetCode</span></h1>
    <p class="sub">This is optional. If you already practice on LeetCode, your plan can skip what you know and start with the topics you've done least</p>
    <div data-lc-host></div>
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-continue>Continue</button></div>
  </section>`;
}

let planEvents = "";
let whenEditor: AvailabilityEditor | null = null;

function whenStep(): SafeHtml {
  // First run starts from two common patterns, already pressed; painting adjusts them.
  if (!readPrefs().plan.availability.length) updatePrefs({ plan: { availability: DEFAULT_WINDOWS } }, { silent: true });
  return html`${head("when")}<section class="q ob-when" aria-labelledby="q5w">
    <h1 id="q5w">When can you practice?</h1>
    <p class="sub">Choose a schedule, then drag to adjust your available hours. Practice sessions stay within those hours. You can change them later</p>
    <div data-when-editor></div>
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-continue>Build my plan ${kbd("enter")}</button><span class="hint">You can add days off in Settings</span></div>
  </section>`;
}

function planStep(): SafeHtml {
  const c = cat?.catalog;
  const t = trainer;
  if (!c || !t) return html`${head("plan", { skip: false })}<div class="q"><div class="skel" style="height:44px;width:60%"></div><div class="weeks">${[1, 2, 3].map(() => html`<div class="skel" style="height:52px;margin-top:8px"></div>`)}</div></div>`;
  const p = readPrefs().plan;
  const plan = t.plan(planEvents, planSettings());
  const weeks = planWeeks(plan);
  const title = p.interviewDate && daysUntil(p.interviewDate) > 0 ? `Your plan to ${shortDate(p.interviewDate)}` : "Your next 4 weeks";
  const later = plan.summary.behind.slice(0, 6);
  return html`${head("plan", { skip: false })}<section class="q" aria-labelledby="q5">
    <h1 id="q5">${title}</h1>
    <p class="sub">${plan.summary.headline} Techniques come in by how often they're asked${p.companies.length ? ", weighted towards what your companies lean on" : ""}${p.focusTopics.length ? `${p.companies.length ? " and" : ","} with extra time on your focus topics` : ""}, around your daily time</p>
    <ol class="weeks" aria-label="Week by week">${weeks.map(
      (w) =>
        html`<li class="week"><div class="when">${w.label}<small>${shortDate(w.from)}${w.from !== w.to ? ` to ${shortDate(w.to)}` : ""}</small></div><div class="tech">${
          w.reviewsOnly
            ? html`${tag("due", "Reviews only")}${w.mocks ? tag("outline", plural(w.mocks, "mock interview"), { dot: false }) : ""}`
            : html`${w.techniques.slice(0, 5).map((x) => tag("new", x))}${w.techniques.length > 5 ? html`<span class="text-muted text-small">and ${w.techniques.length - 5} more</span>` : ""}${w.techniques.length === 0 ? html`<span class="text-muted text-small">Reviews and the techniques above</span>` : ""}`
        }</div><span class="n">${plural(w.problems, "problem")}</span></li>`,
    )}</ol>
    ${later.length ? html`<p class="later-list">Short of the plan's goal at this pace: ${later.join(", ")}${plan.summary.behind.length > later.length ? ", and more" : ""}. More daily time, or an earlier start on them, closes the gap</p>` : ""}
    <div class="how">
      <p><strong>On track</strong> means a technique is projected to reach the plan's goal by the date</p>
      <p><strong>Behind</strong> pulls that technique into Today first, never past your daily time. The plan never hides a review to catch up</p>
    </div>
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-finish-plan>${placeNext() ? "Find your level" : "Go to Today"}</button><button class="btn btn-secondary" type="button" data-add-cal>${icon("calendar-plus")}Add to calendar</button><button class="btn btn-ghost" type="button" data-change>Change answers</button></div>
  </section>`;
}

async function paint(): Promise<void> {
  const el = root();
  if (!el) return;
  const step = currentStep();
  el.classList.toggle("wide", step === "plan" || step === "when");
  const body = step === "goal" ? goalStep() : step === "goals" ? goalsStep() : step === "leetcode" ? leetcodeStep() : step === "when" ? whenStep() : planStep();
  whenEditor?.destroy();
  whenEditor = null;
  render(el, body);
  mountGoals();
  const lc = el.querySelector<HTMLElement>("[data-lc-host]");
  if (lc) mountLeetcodePanel(lc, { onSkip: () => go("when") });
  const host = el.querySelector<HTMLElement>("[data-when-editor]");
  if (host) whenEditor = mountAvailability(host, { sections: ["presets", "paint", "session"], headings: false, id: "ob-av" });
  document.title = "Set up your plan · myleet";
  const focus = el.querySelector<HTMLElement>(".options input:checked, [data-ge-aim]") ?? el.querySelector<HTMLElement>("h1");
  if (focus?.tagName === "H1") focus.setAttribute("tabindex", "-1");
  focus?.focus({ preventScroll: true });
}

/** The goals step: the same editor as Settings and Plan, saving as you go. */
function mountGoals(): void {
  const host = root()?.querySelector<HTMLElement>("[data-goals-host]");
  if (!host || !cat) return;
  // The editor starts from an hour a day, the planner's default.
  if (readPrefs().plan.dailyMinutes === null) updatePrefs({ plan: { dailyMinutes: 60 } }, { silent: true });
  mountGoalsEditor(host, {
    id: "ob-goals",
    catalog: cat.catalog,
    get: () => goalsOf(readPrefs().plan),
    set: (g) => {
      updatePrefs({ plan: planPatch(g) });
      const any = aimsOf(readPrefs().plan).length > 0;
      const btn = root()?.querySelector<HTMLButtonElement>("[data-continue]");
      if (btn) btn.disabled = !any;
      const hint = root()?.querySelector<HTMLElement>("[data-goals-hint]");
      if (hint) render(hint, any ? html`${kbd("1")}–${kbd("4")} to turn goals on or off` : html`Turn on at least one goal`);
    },
    availability: () => go("when"),
  });
}

function advance(): void {
  const step = currentStep();
  if (step === "goals" && readPrefs().plan.interviews.some((i) => i.date <= localDay())) {
    render(root(), goalsStep("Each interview needs a date after today"));
    mountGoals();
    root()?.querySelector<HTMLElement>("[data-iv-date]")?.focus();
    return;
  }
  const all = steps();
  const next = all[all.indexOf(step) + 1];
  if (next) go(next);
}

/** Setup ends in the diagnostic until it's done, so Today opens on a placed plan. */
const placeNext = (): boolean => trainer?.placement(planEvents).needs ?? false;

/** New problems a day for the daily time picked: the nearest of the usual budgets. */
const newPerDayFor = (m: number) => TIME_OPTIONS.reduce((a, b) => (Math.abs(b.minutes - m) < Math.abs(a.minutes - m) ? b : a)).newPerDay;

function onClick(e: MouseEvent): void {
  if (!root()) return;
  const t = e.target as Element;
  if (t.closest("[data-continue]")) advance();
  if (t.closest("[data-add-cal]") && trainer) {
    const tr = trainer;
    void openCalendarSync(() => {
      const plan = tr.plan(planEvents, planSettings());
      const next = plan.days.find((d) => d.sessions.length);
      return next ? tr.planIcs({ ...plan, days: [{ ...next, sessions: next.sessions.slice(0, 1) }] }, { site: location.origin, alarm_minutes: readPrefs().plan.reminderMinutes }) : null;
    });
  } else if (t.closest("[data-back]")) history.back();
  else if (t.closest("[data-skip]")) {
    updatePrefs({ plan: { onboarded: true } });
    void navigate(ROUTES.today);
  } else if (t.closest("[data-change]")) go("goal");
  else if (t.closest("[data-finish-plan]")) {
    const minutes = readPrefs().plan.dailyMinutes ?? 60;
    updatePrefs({ newPerDay: newPerDayFor(minutes), plan: { dailyMinutes: minutes, startedAt: localDay(), onboarded: true } });
    void navigate(placeNext() ? ROUTES.diagnostic : ROUTES.today);
  }
}

function onChange(e: Event): void {
  const input = e.target as HTMLInputElement;
  if (input.name !== "goal") return;
  updatePrefs({ plan: { goal: input.value as Goal } });
  const btn = root()?.querySelector<HTMLButtonElement>("[data-continue]");
  if (btn) btn.disabled = false;
}

function onKey(e: KeyboardEvent): void {
  if (!root() || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
  const a = document.activeElement as HTMLElement | null;
  const step = currentStep();
  const typing = a && (/^(TEXTAREA|SELECT)$/.test(a.tagName) || (a.tagName === "INPUT" && !["radio", "checkbox"].includes((a as HTMLInputElement).type)));
  if (typing && e.key !== "Enter") return;
  const radiosEl = [...(root()?.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]') ?? [])];
  const n = Number(e.key);
  if (radiosEl.length && n >= 1 && n <= radiosEl.length) {
    e.preventDefault();
    const r = radiosEl[n - 1];
    if (r) {
      r.checked = r.type === "checkbox" ? !r.checked : true;
      r.focus();
      r.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } else if (e.key === "Enter") {
    if (a?.tagName === "BUTTON" || a?.tagName === "A") return;
    e.preventDefault();
    if (step === "plan") root()?.querySelector<HTMLButtonElement>("[data-finish-plan]")?.click();
    else {
      const b = root()?.querySelector<HTMLButtonElement>("[data-continue]");
      if (b && !b.disabled) advance();
    }
  } else if (e.key === "Escape" && steps().indexOf(step) > 0) {
    history.back();
  }
}

async function init(): Promise<void> {
  if (!root()) return;
  // Old links to the warm-up step land on the diagnostic, which replaced it.
  if (new URLSearchParams(location.search).get("step") === "warm-up") return location.replace(ROUTES.diagnostic);
  void paint();
  const [c, t] = await Promise.all([loadCatalog(), loadTrainer()]).catch(() => [undefined, undefined] as const);
  cat = c;
  trainer = t;
  planEvents = await readEvents();
  if (!cat) {
    render(
      root(),
      html`<div class="panel state-note" role="alert"><h2>Couldn't load the curriculum</h2><p>Setup needs the problem list once. Your answers so far are saved on this device. Check your connection and try again</p><div class="actions"><button class="btn btn-primary" type="button" onclick="location.reload()">Try again</button></div></div>`,
    );
    return;
  }
  void paint();
}

document.addEventListener("click", onClick);
document.addEventListener("change", onChange);
document.addEventListener("keydown", onKey);
addEventListener("popstate", () => root() && void paint());
document.addEventListener("astro:page-load", () => void init());
