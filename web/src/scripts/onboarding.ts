// Onboarding (/onboarding?step=...): goal, companies, date, time, hours, then the plan.
// Each step is a URL so Back works. Answers save as you go (lib/prefs). The placement
// diagnostic lives at /diagnostic.
import { navigate } from "astro:transitions/client";
import { companySlug, listedCompany, loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { daysUntil, planWeeks, shortDate, TIME_OPTIONS, timeOption } from "../lib/plan";
import { planSettings, readPrefs, updatePrefs, type Goal } from "../lib/prefs";
import { DEFAULT_WINDOWS } from "../lib/schedule";
import { mountAvailability, type AvailabilityEditor } from "../lib/ui/availability";
import { openCalendarSync } from "../lib/ui/calendar-sync";
import { readEvents } from "../lib/progress";
import { ROUTES } from "../lib/routes";
import { addDays, localDay } from "../lib/streak";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import type { Playlist, PlaylistGroup } from "../lib/types";
import { kbd, plural, tag } from "../lib/ui/bits";
import { html, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { mountInterviews } from "../lib/ui/interviews";
import { mountLeetcodePanel } from "../lib/ui/leetcode-connect";

const STEPS = ["goal", "companies", "date", "leetcode", "time", "when", "plan"] as const;
type Step = (typeof STEPS)[number];

const GOALS: { id: Goal; label: string; detail: string }[] = [
  { id: "internship", label: "Internship", detail: "Mostly easy and medium problems, arrays to trees first" },
  { id: "coop", label: "Co-op", detail: "The same core topics as internships, often with more interview rounds" },
  { id: "newgrad", label: "New grad", detail: "Medium and some hard problems, with more graphs and dynamic programming" },
];
const GROUPS: PlaylistGroup[] = ["Big Tech", "AI & Startups", "Trading Firms", "Consumer and Business Tech", "Fortune 500"];
const GROUP_SHOWN = 10;

let cat: LoadedCatalog | undefined;
let trainer: TrainerApi | undefined;
const expanded = new Set<PlaylistGroup>();
let query = "";

const root = () => document.querySelector<HTMLElement>("[data-onboarding]");

function currentStep(): Step {
  const s = new URLSearchParams(location.search).get("step");
  return (STEPS as readonly string[]).includes(s ?? "") ? (s as Step) : "goal";
}

function go(step: Step, replace = false): void {
  const url = `${ROUTES.onboarding}?step=${step}`;
  if (replace) history.replaceState(history.state, "", url);
  else history.pushState(history.state, "", url);
  void paint();
}

function head(step: Step, opts: { skip?: boolean } = {}): SafeHtml {
  const i = STEPS.indexOf(step);
  const back = i > 0 ? html`<button class="icon-btn back" type="button" data-back aria-label="Back">${icon("arrow-left")}</button>` : "";
  return html`<div class="steps">${back}<span class="count">Step ${i + 1} of ${STEPS.length}</span>${
    opts.skip === false ? "" : html`<button class="btn btn-ghost btn-sm skip" type="button" data-skip>Skip setup</button>`
  }</div>
  <div class="track" style="--n:${STEPS.length}" aria-hidden="true">${STEPS.map((_, j) => html`<i class="${j <= i ? "on" : ""}"></i>`)}</div>`;
}

function radios(name: string, label: string, opts: { id: string; label: string; detail: string }[], value: string | null): SafeHtml {
  return html`<fieldset class="options" role="radiogroup" aria-labelledby="${label}">${opts.map(
    (o, i) =>
      html`<label class="opt"><input type="radio" name="${name}" value="${o.id}" ${o.id === value ? "checked" : ""} /><strong>${o.label}</strong><span>${o.detail}</span>${kbd(String(i + 1))}</label>`,
  )}</fieldset>`;
}

// ---- steps ----

function goalStep(): SafeHtml {
  const g = readPrefs().plan.goal;
  return html`${head("goal")}<section class="q" aria-labelledby="q1">
    <h1 id="q1">What are you preparing for?</h1>
    <p class="sub">Your goal helps set time targets and the order of topics. You can change it in Settings</p>
    ${radios("goal", "q1", GOALS, g)}
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-continue ${g ? "" : "disabled"}>Continue</button><span class="hint">${kbd("1")}–${kbd("3")} to pick, ${kbd("enter")} to continue</span></div>
  </section>`;
}

function companyChip(p: Playlist, picked: boolean): SafeHtml {
  return html`<button class="chip" type="button" data-company="${companySlug(p.id)}" aria-pressed="${picked ? "true" : "false"}">${p.title}${picked ? icon("x") : ""}</button>`;
}

function companiesBody(): SafeHtml {
  const c = cat?.catalog;
  if (!c) return html`<div class="picked">${[1, 2, 3].map(() => html`<span class="skel" style="width:90px;height:34px"></span>`)}</div>`;
  const picked = readPrefs().plan.companies;
  const bySlug = new Map(c.playlists.map((p) => [companySlug(p.id), p]));
  const chosen = picked.map((s) => bySlug.get(s)).filter((p): p is Playlist => !!p);
  const q = query.trim().toLowerCase();
  let groups: SafeHtml;
  if (q) {
    const hits = c.playlists.filter(listedCompany).filter((p) => p.title.toLowerCase().includes(q) && !picked.includes(companySlug(p.id))).slice(0, 24);
    groups = hits.length
      ? html`<div class="groups"><div><h2>Matches</h2><div class="row" data-results>${hits.map((p) => companyChip(p, false))}</div></div></div>`
      : html`<p class="empty-note" role="status">No company called "${query.trim()}". Try the group lists below, or skip</p>`;
  } else {
    groups = html`<div class="groups">${GROUPS.map((g) => {
      const all = c.playlists.filter(listedCompany).filter((p) => p.group === g && !picked.includes(companySlug(p.id)));
      if (!all.length) return "";
      const shown = expanded.has(g) ? all : all.slice(0, GROUP_SHOWN);
      return html`<div><h2>${g === "AI & Startups" ? "AI labs and high growth" : g}</h2><div class="row">${shown.map((p) => companyChip(p, false))}${
        all.length > shown.length ? html`<button class="chip more" type="button" data-more="${g}">${all.length - shown.length} more</button>` : ""
      }</div></div>`;
    })}</div>`;
  }
  return html`<div class="picked" aria-label="Selected companies">${chosen.map((p) => companyChip(p, true))}</div>${groups}`;
}

function companiesStep(): SafeHtml {
  const n = readPrefs().plan.companies.length;
  return html`${head("companies")}<section class="q" aria-labelledby="q2">
    <h1 id="q2">Which companies are you preparing for?</h1>
    <p class="sub">This is optional. Your plan will include their practice sets after you have started the core topics. Each company page shows your progress</p>
    <div class="search">${icon("search")}<input type="search" placeholder="Search ${cat?.catalog.playlists.filter(listedCompany).length ?? ""} companies" aria-label="Search companies" value="${query}" data-company-search autocomplete="off" /></div>
    <div data-company-body>${companiesBody()}</div>
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-continue>${n ? `Continue with ${n}` : "Continue"}</button>${n ? "" : html`<button class="btn btn-ghost" type="button" data-continue>No company yet</button>`}</div>
  </section>`;
}

function dateStep(error?: string): SafeHtml {
  const d = readPrefs().plan.interviewDate;
  const today = localDay();
  const left = d ? daysUntil(d, today) : null;
  return html`${head("date")}<section class="q" aria-labelledby="q3">
    <h1 id="q3">When are your interviews?</h1>
    <p class="sub">Add each one you have lined up, with the company if you know it. The plan paces toward the nearest and leans on that company's problems before it. No date yet is fine too: the plan then covers the next four weeks.</p>
    <div class="date-row">
      <div class="field" data-iv-host aria-describedby="iv-err"></div>
      <div class="quick" role="group" aria-label="Quick picks">${[
        [14, "In 2 weeks"],
        [30, "In a month"],
        [90, "In 3 months"],
      ].map(([n, l]) => html`<button class="chip" type="button" data-quick="${n}" aria-pressed="${d === addDays(today, n as number) ? "true" : "false"}">${l}</button>`)}</div>
    </div>
    <p class="err field" id="iv-err" role="alert" ${error ? "" : "hidden"} style="margin-top:var(--space-2)">${error ?? ""}</p>
    ${d && left !== null && left > 0 ? html`<p class="date-note">${shortDate(d)} is ${plural(left, "day")} away.${left < 7 ? " That's close: the plan becomes a short cram plan of reviews and the most common patterns" : " You can change it any time from Today"}</p>` : ""}
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-continue>Continue</button><button class="btn btn-ghost" type="button" data-no-date>No date yet</button></div>
  </section>`;
}

function leetcodeStep(): SafeHtml {
  return html`${head("leetcode")}<section class="q" aria-labelledby="q3b">
    <h1 id="q3b">Connect your LeetCode</h1>
    <p class="sub">This is optional. If you already practice on LeetCode, your plan can skip what you know and start with the topics you've done least</p>
    <div data-lc-host></div>
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-continue>Continue</button></div>
  </section>`;
}

function timeStep(): SafeHtml {
  const m = readPrefs().plan.dailyMinutes;
  return html`${head("time")}<section class="q" aria-labelledby="q4">
    <h1 id="q4">How much time do you have on most days?</h1>
    <p class="sub">Your plan schedules reviews first, then new problems. You can reduce the time for a single day on Today</p>
    ${radios("time", "q4", TIME_OPTIONS.map((o) => ({ id: String(o.minutes), label: o.label, detail: o.detail })), m === null ? null : String(m))}
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-continue ${m ? "" : "disabled"}>Continue</button><span class="hint">${kbd("1")}–${kbd("4")} to pick, ${kbd("esc")} to go back</span></div>
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

function mountDateEditor(): void {
  const host = root()?.querySelector<HTMLElement>("[data-iv-host]");
  if (host) mountInterviews(host, cat?.catalog.playlists ?? [], { id: "ob-iv", get: () => readPrefs().plan.interviews, set: (interviews) => (updatePrefs({ plan: { interviews } }), refreshDateNote()) });
}

function renderDate(error?: string): void {
  render(root(), dateStep(error));
  mountDateEditor();
}

/** The quick picks and the "N days away" line follow the editor without re-rendering it. */
function refreshDateNote(): void {
  const fresh = document.createElement("div");
  render(fresh, dateStep());
  for (const sel of [".quick", ".date-note"]) {
    const cur = root()?.querySelector(sel);
    const next = fresh.querySelector(sel);
    if (cur && next) cur.replaceWith(next);
    else if (next) root()?.querySelector(".date-row")?.after(next);
    else cur?.remove();
  }
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
    <p class="sub"><strong>${plan.summary.headline}</strong> Techniques come in by how often they're asked${p.companies.length ? ", weighted toward what your companies lean on" : ""}, around your daily time</p>
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
    <div class="next"><button class="btn btn-primary btn-lg" type="button" data-finish-plan>Go to Today</button><button class="btn btn-secondary" type="button" data-add-cal>${icon("calendar-plus")}Add to calendar</button><button class="btn btn-ghost" type="button" data-change>Change answers</button></div>
  </section>`;
}

// ---- paint + events ----

async function paint(): Promise<void> {
  const el = root();
  if (!el) return;
  const step = currentStep();
  el.classList.toggle("wide", step === "plan" || step === "when");
  const body =
    step === "goal"
      ? goalStep()
      : step === "companies"
        ? companiesStep()
        : step === "date"
          ? dateStep()
          : step === "leetcode"
            ? leetcodeStep()
          : step === "time"
            ? timeStep()
            : step === "when"
              ? whenStep()
              : planStep();
  whenEditor?.destroy();
  whenEditor = null;
  render(el, body);
  mountDateEditor();
  const lc = el.querySelector<HTMLElement>("[data-lc-host]");
  if (lc) mountLeetcodePanel(lc, { onSkip: () => go("time") });
  const host = el.querySelector<HTMLElement>("[data-when-editor]");
  if (host) whenEditor = mountAvailability(host, { sections: ["presets", "paint", "session"], headings: false, id: "ob-av" });
  document.title = "Set up your plan · myleet";
  const focus = el.querySelector<HTMLElement>("input:checked, [data-company-search], [data-iv-date]") ?? el.querySelector<HTMLElement>("h1");
  if (focus?.tagName === "H1") focus.setAttribute("tabindex", "-1");
  focus?.focus({ preventScroll: true });
}

function refreshCompanies(): void {
  const body = root()?.querySelector("[data-company-body]");
  if (body) render(body, companiesBody());
  const n = readPrefs().plan.companies.length;
  const next = root()?.querySelector(".next");
  if (next)
    render(
      next,
      html`<button class="btn btn-primary btn-lg" type="button" data-continue>${n ? `Continue with ${n}` : "Continue"}</button>${n ? "" : html`<button class="btn btn-ghost" type="button" data-continue>No company yet</button>`}`,
    );
}

function toggleCompany(slug: string): void {
  const cur = readPrefs().plan.companies;
  updatePrefs({ plan: { companies: cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug] } });
  refreshCompanies();
}

function advance(): void {
  const step = currentStep();
  if (step === "date" && readPrefs().plan.interviews.some((i) => i.date <= localDay())) {
    renderDate("Each interview needs a date after today");
    root()?.querySelector<HTMLElement>("[data-iv-date]")?.focus();
    return;
  }
  const i = STEPS.indexOf(step);
  const next = STEPS[i + 1];
  if (next) go(next);
}

function onClick(e: MouseEvent): void {
  if (!root()) return;
  const t = e.target as Element;
  const company = t.closest<HTMLElement>("[data-company]");
  const quick = t.closest<HTMLElement>("[data-quick]");
  const more = t.closest<HTMLElement>("[data-more]");
  if (t.closest("[data-continue]")) advance();
  if (t.closest("[data-add-cal]") && trainer) {
    const tr = trainer;
    void openCalendarSync(() => {
      const plan = tr.plan(planEvents, planSettings());
      const next = plan.days.find((d) => d.sessions.length);
      return next ? tr.planIcs({ ...plan, days: [{ ...next, sessions: next.sessions.slice(0, 1) }] }, { site: location.origin, alarm_minutes: readPrefs().plan.reminderMinutes }) : null;
    });
  }
  else if (t.closest("[data-back]")) history.back();
  else if (t.closest("[data-skip]")) {
    updatePrefs({ plan: { onboarded: true } });
    void navigate(ROUTES.today);
  } else if (company?.dataset.company) toggleCompany(company.dataset.company);
  else if (more) {
    expanded.add(more.dataset.more as PlaylistGroup);
    refreshCompanies();
  } else if (quick) {
    updatePrefs({ plan: { interviewDate: addDays(localDay(), Number(quick.dataset.quick)) } });
    renderDate();
  } else if (t.closest("[data-no-date]")) {
    updatePrefs({ plan: { interviewDate: null } });
    go("time");
  } else if (t.closest("[data-change]")) go("goal");
  else if (t.closest("[data-finish-plan]")) {
    const opt = timeOption(readPrefs().plan.dailyMinutes);
    updatePrefs({ newPerDay: opt.newPerDay, plan: { dailyMinutes: opt.minutes, startedAt: localDay(), onboarded: true } });
    void navigate(ROUTES.today);
  }
}

function onChange(e: Event): void {
  const input = e.target as HTMLInputElement;
  if (input.name === "goal") updatePrefs({ plan: { goal: input.value as Goal } });
  else if (input.name === "time") updatePrefs({ plan: { dailyMinutes: Number(input.value) }, newPerDay: timeOption(Number(input.value)).newPerDay });
  else return;
  const btn = root()?.querySelector<HTMLButtonElement>("[data-continue]");
  if (btn) btn.disabled = false;
}

function onInput(e: Event): void {
  const input = e.target as HTMLInputElement;
  if (!input.matches("[data-company-search]")) return;
  query = input.value;
  const body = root()?.querySelector("[data-company-body]");
  if (body) render(body, companiesBody());
}

function onKey(e: KeyboardEvent): void {
  if (!root() || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
  const a = document.activeElement as HTMLElement | null;
  const step = currentStep();
  if (a?.matches("[data-company-search]")) {
    if (e.key === "Enter") {
      e.preventDefault();
      const first = root()?.querySelector<HTMLElement>("[data-results] [data-company]");
      if (first?.dataset.company) {
        toggleCompany(first.dataset.company);
        query = "";
        const s = root()?.querySelector<HTMLInputElement>("[data-company-search]");
        if (s) s.value = "";
        refreshCompanies();
      }
    } else if (e.key === "Backspace" && !a.matches("[value]:not([value=''])") && !(a as HTMLInputElement).value) {
      const last = readPrefs().plan.companies.at(-1);
      if (last) toggleCompany(last);
    }
    return;
  }
  const typing = a && (/^(TEXTAREA|SELECT)$/.test(a.tagName) || (a.tagName === "INPUT" && (a as HTMLInputElement).type !== "radio"));
  if (typing && e.key !== "Enter") return;
  const radiosEl = [...(root()?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [])];
  const n = Number(e.key);
  if (radiosEl.length && n >= 1 && n <= radiosEl.length) {
    e.preventDefault();
    const r = radiosEl[n - 1];
    if (r) {
      r.checked = true;
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
  } else if (e.key === "Escape" && STEPS.indexOf(step) > 0) {
    history.back();
  }
}

async function init(): Promise<void> {
  if (!root()) return;
  // The old warm-up step is the diagnostic now.
  if (new URLSearchParams(location.search).get("step") === "warm-up") return location.replace(ROUTES.diagnostic);
  query = "";
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
document.addEventListener("input", onInput);
document.addEventListener("keydown", onKey);
addEventListener("popstate", () => root() && void paint());
document.addEventListener("astro:page-load", () => void init());
