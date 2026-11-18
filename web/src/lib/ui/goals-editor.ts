// "Your goals": the one editor for what the plan works toward. Onboarding fills it the first
// time, Settings saves it as you go and Plan's "Edit goals" dialog keeps a draft until the
// change is applied. The caller decides where `set` saves; the fields and their order never change.
import { companySlug, listedCompany } from "../catalog";
import { companyLogo } from "../company-logos";
import { sentenceCase } from "../display";
import { aimsOf, focusModules } from "../goals";
import { TIME_OPTIONS } from "../plan";
import type { Aim, Goal, Prefs } from "../prefs";
import { ROUTES } from "../routes";
import { fmtM, step, WEEKDAY_STEPS, WEEKEND_STEPS } from "../schedule";
import { ROLES, roleOf } from "../setup";
import type { Catalog, Interview } from "../types";
import { pickCompany } from "./company-picker";
import { html, render, type SafeHtml } from "./html";
import { icon } from "./icons";
import { companyTitle, mountInterviews } from "./interviews";
import { toast } from "./overlay";

export interface Goals {
  aims: Aim[];
  interviews: Interview[];
  /** Playlist slugs. */
  companies: string[];
  /** Curriculum module ids. */
  focusTopics: string[];
  weekday: number;
  weekend: number;
}

/** The one label and icon every way into the editor uses. */
export const EDIT_GOALS = "Edit goals";
export const GOALS_ICON = "target" as const;
/** Icon and label for an "Edit goals" button or link. */
export const editGoalsLabel = (): SafeHtml => html`${icon(GOALS_ICON)}${EDIT_GOALS}`;
/** "Edit goals" from any page: opens the editor on Plan, where the change's cost shows first. */
export const editGoalsLink = (cls = "btn btn-secondary btn-sm"): SafeHtml => html`<a class="${cls}" href="${ROUTES.goals}">${editGoalsLabel()}</a>`;
/** The quiet link beside a personal line. */
export const goalsLink = (): SafeHtml => html`<a class="goals-link" href="${ROUTES.goals}">${icon(GOALS_ICON)}Your goals</a>`;

export function goalsOf(p: Prefs["plan"]): Goals {
  const weekday = p.dailyMinutes ?? 60;
  return { aims: aimsOf(p), interviews: p.interviews, companies: p.companies, focusTopics: p.focusTopics, weekday, weekend: p.weekendMinutes ?? weekday };
}

/** A goals change as a prefs plan patch. */
export function planPatch(g: Partial<Goals>): Partial<Prefs["plan"]> {
  const { weekday, weekend, ...rest } = g;
  return { ...rest, ...(weekday !== undefined ? { dailyMinutes: weekday } : {}), ...(weekend !== undefined ? { weekendMinutes: weekend } : {}) };
}

const SECTIONS: { aim: Aim | "time"; title: string; desc: string }[] = [
  { aim: "interview", title: "Interviews", desc: "Each one with a date and, if you know it, the company. The plan paces toward the nearest and leans on that company's set before it" },
  { aim: "companies", title: "Dream companies", desc: "The plan works through their practice sets. Curated sets, not actual interview questions" },
  { aim: "topics", title: "Focus topics", desc: "These get extra time, and the rest still gets covered" },
  { aim: "time", title: "Time per day", desc: "Reviews come first, then new problems if time allows" },
  { aim: "sharp", title: "Just staying sharp", desc: "A steady routine of new patterns and reviews, with no deadline" },
];

/** Data a goal holds, cleared when it's turned off. */
const CLEARS: Partial<Record<Aim, keyof Goals>> = { interview: "interviews", companies: "companies", topics: "focusTopics" };

export interface GoalsEditorOpts {
  /** Prefix for ids, so two editors can share a page. */
  id: string;
  catalog: Pick<Catalog, "playlists" | "modules" | "problems">;
  get: () => Goals;
  set: (patch: Partial<Goals>) => void;
  /** Saves as you go: turning a goal off offers Undo. */
  live?: boolean;
  /** "When do you practice?": a handler, or the plan page's drawer by default. */
  availability?: () => void;
  /** Settings shows the role from onboarding above the goals. */
  role?: { get: () => Goal | null; set: (g: Goal) => void };
}

export interface GoalsEditor {
  refresh(): void;
}

/** Techniques the chosen companies' sets lean on, by tracked problems in them. */
function lean(c: GoalsEditorOpts["catalog"], slugs: string[]): { title: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const pl of c.playlists.filter((p) => slugs.includes(companySlug(p.id)))) {
    for (const e of pl.entries) {
      const p = e.problem !== null && e.problem !== undefined ? c.problems[e.problem] : undefined;
      const t = p ? c.modules[p.module]?.techniques[p.technique]?.title : undefined;
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([title, n]) => ({ title, n }))
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title))
    .slice(0, 5);
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const nearestTime = (m: number) => TIME_OPTIONS.reduce((a, b) => (Math.abs(b.minutes - m) < Math.abs(a.minutes - m) ? b : a));

export function mountGoalsEditor(host: HTMLElement, o: GoalsEditorOpts): GoalsEditor {
  const companies = o.catalog.playlists.filter(listedCompany);
  const mods = focusModules(o.catalog);
  const id = o.id;

  const companiesBody = (g: Goals): SafeHtml => {
    const leans = lean(o.catalog, g.companies);
    const max = Math.max(1, ...leans.map((l) => l.n));
    return html`<ul class="ge-chips" aria-label="Dream companies">${g.companies.map((s) => {
      const name = companyTitle(companies, s) ?? s;
      return html`<li class="chip ge-chip">${companyLogo(s)}<span>${name}</span><button type="button" data-ge-co-remove="${s}" aria-label="Remove ${name}">${icon("x")}</button></li>`;
    })}<li><button type="button" class="btn btn-ghost btn-sm" data-ge-co-add>${icon("plus")}Add a company</button></li></ul>
    ${leans.length ? html`<div class="ge-lean" aria-label="Techniques your companies lean on, by problem count in their sets"><p>Their sets lean on</p>${leans.map((l) => html`<div><span>${sentenceCase(l.title)}</span><span class="bar" aria-hidden="true"><span style="width:${((l.n / max) * 100).toFixed(0)}%"></span></span><b>${l.n}</b></div>`)}</div>` : ""}`;
  };

  const stepper = (k: "weekday" | "weekend", v: number, steps: number[], label: string): SafeHtml =>
    html`<span class="stepper" role="group" aria-label="${label}"><button type="button" data-ge-step="${k}" data-by="-1" aria-label="Less ${label.toLowerCase()}" ${v <= (steps[0] ?? 0) ? "disabled" : ""}>${icon("minus")}</button><output>${fmtM(v)}</output><button type="button" data-ge-step="${k}" data-by="1" aria-label="More ${label.toLowerCase()}" ${v >= (steps.at(-1) ?? 0) ? "disabled" : ""}>${icon("plus")}</button></span>`;

  const timeBody = (g: Goals): SafeHtml =>
    html`<div class="ge-time"><span>Weekdays</span>${stepper("weekday", g.weekday, WEEKDAY_STEPS, "Weekday time")}<span>Weekends</span>${stepper("weekend", g.weekend, WEEKEND_STEPS, "Weekend time")}</div>
    <p class="ge-hint">On weekdays that's ${lowerFirst(nearestTime(g.weekday).detail)}</p>`;

  const topicsBody = (g: Goals): SafeHtml =>
    html`<div class="ge-chips" role="group" aria-label="Focus topics">${mods.map((m) => {
      const on = g.focusTopics.includes(m.id);
      return html`<button type="button" class="chip" data-ge-topic="${m.id}" aria-pressed="${on ? "true" : "false"}">${on ? icon("check") : ""}${sentenceCase(m.title)}</button>`;
    })}</div>`;

  const roleBody = (): SafeHtml => {
    const cur = roleOf(o.role?.get() ?? null);
    const desc = ROLES.find((r) => r.id === cur)?.detail ?? "Pick the one you're preparing for";
    return html`<div class="ge-head"><span><span class="ge-title" id="${id}-role">Role</span><span class="ge-desc">${desc}</span></span></div>
      <div class="ge-body"><div class="seg" role="group" aria-labelledby="${id}-role">${ROLES.map((r) => html`<button type="button" data-ge-role="${r.id}" aria-pressed="${r.id === cur ? "true" : "false"}">${r.label}</button>`)}</div></div>`;
  };

  const paint = (): void => {
    const g = o.get();
    render(
      host,
      html`<div class="ge">${o.role ? html`<section class="ge-sec" data-sec="role" aria-labelledby="${id}-role">${roleBody()}</section>` : ""}${SECTIONS.map((s) => {
        const on = s.aim === "time" || g.aims.includes(s.aim);
        const head = html`<span class="ge-title" id="${id}-${s.aim}">${s.title}</span><span class="ge-desc">${s.desc}</span>`;
        return html`<section class="ge-sec" data-sec="${s.aim}" data-on="${on ? "true" : "false"}" aria-labelledby="${id}-${s.aim}">
          ${s.aim === "time" ? html`<div class="ge-head"><span>${head}</span></div>` : html`<label class="ge-head switch"><span>${head}</span><input type="checkbox" data-ge-aim="${s.aim}" ${on ? "checked" : ""} /></label>`}
          ${s.aim === "sharp" ? "" : html`<div class="ge-body" data-ge-body="${s.aim}">${s.aim === "companies" ? companiesBody(g) : s.aim === "topics" ? topicsBody(g) : s.aim === "time" ? timeBody(g) : ""}</div>`}
        </section>`;
      })}
      <p class="ge-foot"><span>Sessions only go in the hours you set in your availability</span><button type="button" class="btn btn-secondary btn-sm" data-ge-avail>${icon("clock-3")}Edit availability</button></p></div>`,
    );
    const ivHost = host.querySelector<HTMLElement>('[data-ge-body="interview"]');
    if (ivHost) iv = mountInterviews(ivHost, o.catalog.playlists, { id: `${id}-iv`, get: () => o.get().interviews, set: (interviews) => o.set({ interviews }) });
  };
  let iv: { refresh: () => void } | null = null;

  const repaintBody = (aim: "companies" | "topics" | "time"): void => {
    const el = host.querySelector<HTMLElement>(`[data-ge-body="${aim}"]`);
    if (!el) return;
    const g = o.get();
    render(el, aim === "companies" ? companiesBody(g) : aim === "topics" ? topicsBody(g) : timeBody(g));
  };

  const toggle = (aim: Aim, on: boolean): void => {
    const before = o.get();
    const key = CLEARS[aim];
    const aims = on ? [...before.aims, aim] : before.aims.filter((a) => a !== aim);
    const had = key && (before[key] as unknown[]).length > 0;
    o.set({ aims: (["interview", "companies", "topics", "sharp"] as Aim[]).filter((a) => aims.includes(a)), ...(!on && key ? { [key]: [] } : {}) });
    const sec = host.querySelector<HTMLElement>(`[data-sec="${aim}"]`);
    if (sec) sec.dataset.on = String(on);
    if (aim === "interview") iv?.refresh();
    else if (aim === "companies" || aim === "topics") repaintBody(aim);
    if (!on && had && o.live && key) {
      const title = SECTIONS.find((s) => s.aim === aim)?.title ?? "That goal";
      toast(`${title} removed from your goals`, { action: { label: "Undo", run: () => (o.set({ aims: before.aims, [key]: before[key] }), paint()) } });
    }
  };

  const onClick = async (e: MouseEvent): Promise<void> => {
    const t = e.target as Element;
    const rm = t.closest<HTMLElement>("[data-ge-co-remove]");
    const topic = t.closest<HTMLElement>("[data-ge-topic]");
    const st = t.closest<HTMLElement>("[data-ge-step]");
    const role = t.closest<HTMLElement>("[data-ge-role]");
    if (role && o.role) {
      o.role.set(role.dataset.geRole as Goal);
      const sec = host.querySelector<HTMLElement>('[data-sec="role"]');
      if (sec) render(sec, roleBody());
      host.querySelector<HTMLElement>(`[data-ge-role="${role.dataset.geRole}"]`)?.focus();
    } else if (rm) {
      const list = o.get().companies;
      const i = list.indexOf(rm.dataset.geCoRemove ?? "");
      o.set({ companies: list.filter((s) => s !== rm.dataset.geCoRemove) });
      repaintBody("companies");
      const rest = host.querySelectorAll<HTMLElement>("[data-ge-co-remove]");
      (rest[Math.min(i, rest.length - 1)] ?? host.querySelector<HTMLElement>("[data-ge-co-add]"))?.focus();
    } else if (t.closest("[data-ge-co-add]")) {
      const g = o.get();
      const slug = await pickCompany(companies.filter((c) => !g.companies.includes(companySlug(c.id))), null, { title: "Add a dream company", none: false });
      if (slug) o.set({ companies: [...o.get().companies, slug] });
      repaintBody("companies");
      host.querySelector<HTMLElement>("[data-ge-co-add]")?.focus();
    } else if (topic?.dataset.geTopic) {
      const tid = topic.dataset.geTopic;
      const cur = o.get().focusTopics;
      const on = !cur.includes(tid);
      o.set({ focusTopics: on ? [...cur, tid] : cur.filter((x) => x !== tid) });
      repaintBody("topics");
      host.querySelector<HTMLElement>(`[data-ge-topic="${tid}"]`)?.focus();
    } else if (st) {
      const g = o.get();
      const k = st.dataset.geStep as "weekday" | "weekend";
      const dir = Number(st.dataset.by) > 0 ? 1 : -1;
      o.set({ [k]: step(k === "weekday" ? WEEKDAY_STEPS : WEEKEND_STEPS, g[k], dir) });
      repaintBody("time");
      const same = host.querySelector<HTMLButtonElement>(`[data-ge-step="${k}"][data-by="${st.dataset.by}"]`);
      (same && !same.disabled ? same : host.querySelector<HTMLElement>(`[data-ge-step="${k}"]:not([disabled])`))?.focus();
    } else if (t.closest("[data-ge-avail]")) {
      if (o.availability) o.availability();
      else location.href = `${ROUTES.plan}?edit=availability`;
    }
  };
  host.addEventListener("click", (e) => void onClick(e));
  host.addEventListener("change", (e) => {
    const el = e.target as HTMLInputElement;
    if (el.matches("[data-ge-aim]")) toggle(el.dataset.geAim as Aim, el.checked);
  });
  paint();
  return { refresh: paint };
}
