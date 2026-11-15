// Skills (/progress/skills): weak spots with their evidence and one next step each, and
// the skill map of every technique. All text comes from the wasm skill model.
import { planSettings } from "../lib/prefs";
import { readEvents } from "../lib/progress";
import { ROUTES } from "../lib/routes";
import { dateOf, isoDay, weekdayIndex, DAY_LONG } from "../lib/schedule";
import { actionHref, CARDS_SHOWN, causeCounts, CAUSE_WORD, inPlanOn, skillsState, spotList } from "../lib/skills-view";
import { loadTrainer } from "../lib/trainer";
import type { Plan, Skill, SkillAction } from "../lib/types";
import { bar, tag } from "../lib/ui/bits";
import { html, render, type SafeHtml } from "../lib/ui/html";
import { icon, type IconName } from "../lib/ui/icons";
import { confidence, LEVEL_WORD, LEVELS, levelIndex, trend } from "../lib/ui/personal";

interface Ctx {
  skills: Skill[];
  plan: Plan | null;
  today: string;
}

const MODE_KEY = "myleet:skills-mode";
let ctx: Ctx | undefined;
let showAll = false;
let openKey: string | null = null;

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const root = () => $("[data-skills]");
const keyOf = (s: Skill) => `${s.module}/${s.technique}`;
const fmtDay = (d: string) => dateOf(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function mode(): "weak" | "module" {
  try {
    return localStorage.getItem(MODE_KEY) === "module" ? "module" : "weak";
  } catch {
    return "weak";
  }
}

const MARK_ICON: Record<string, IconName> = { clean: "check", missed: "x", hint: "lightbulb", over: "clock-3" };
const MARK_WORD: Record<string, string> = { clean: "clean pass", missed: "missed", hint: "passed with help", over: "passed over time" };
const ACTION_ICON: Record<SkillAction["kind"], IconName> = {
  read_note: "book-open",
  warmup: "footprints",
  edge_case_redo: "crosshair",
  timed_rep: "timer",
  spaced_redo: "repeat",
  next: "arrow-right",
};

function whenPlanned(c: Ctx, a: SkillAction): string | null {
  const d = inPlanOn(c.plan, a.problem);
  if (!d) return null;
  const diff = Math.round((dateOf(d).getTime() - dateOf(c.today).getTime()) / 86_400_000);
  const when = diff === 0 ? "for tonight" : diff === 1 ? "for tomorrow" : `for ${DAY_LONG[weekdayIndex(d)]}`;
  return diff === 0 ? `Planned ${when}. Starting it here is the same session` : `Planned ${when}. Starting it now moves it up`;
}

function attemptStrip(s: Skill): SafeHtml {
  const h = s.history;
  return html`<ol class="attempts" aria-label="Attempts, oldest first">${h.map(
    (a, i) =>
      html`<li class="att ${a.mark}${i === h.length - 1 ? " newest" : ""}"><span class="mk" role="img" aria-label="${fmtDay(a.date)}: ${a.title}, ${a.detail}, ${MARK_WORD[a.mark] ?? a.mark}">${icon(MARK_ICON[a.mark] ?? "check")}</span><span>${dateOf(a.date).getDate()}</span></li>`,
  )}</ol>`;
}

function spotCard(c: Ctx, s: Skill, i: number, compact: boolean): SafeHtml {
  const first = !s.weak_spot && s.watch;
  const tags = html`${first ? html`<span class="tag watch">Watching</span>` : tag("weak", "Weak spot")}${s.cause ? html`<span class="tag cause">${CAUSE_WORD[s.cause]}</span>` : ""}${trend(s.trend, s.recent)}${confidence(s)}`;
  const title = html`<h3 id="sp-${i}"><button type="button" data-open="${keyOf(s)}">${s.technique_title}</button><small>${s.module_title}</small></h3>`;
  if (compact) {
    return html`<li><article class="panel spot compact${first ? " lowconf" : ""}" aria-labelledby="sp-${i}" tabindex="-1" data-spot="${keyOf(s)}"><div><div class="spot-top">${tags}</div>${title}</div><button type="button" class="btn btn-ghost btn-sm" data-open="${keyOf(s)}">Details</button></article></li>`;
  }
  const [step, ...alts] = s.actions;
  const range = s.history.length ? `${fmtDay(s.history[0]!.date)} to ${fmtDay(s.history.at(-1)!.date)}` : "";
  const counts = causeCounts(s).filter(([, n]) => n > 0);
  return html`<li><article class="panel spot${first ? " lowconf" : ""}" aria-labelledby="sp-${i}" tabindex="-1" data-spot="${keyOf(s)}">
    <div>
      <div class="spot-top">${tags}</div>${title}
      <p class="diag">${s.diagnosis}</p>
      <div class="evid">${attemptStrip(s)}<div class="counts"><span class="range">${range}, oldest first</span>${counts.map(([k, n]) => html`<span><b>${n}</b> ${CAUSE_WORD[k].toLowerCase()}</span>`)}</div></div>
    </div>
    <div class="act"><h4>Next step</h4>
      ${step
        ? html`<div class="step"><a class="btn ${i === 0 ? "btn-primary" : "btn-secondary"}" href="${actionHref(s, step)}" data-step-link>${icon(ACTION_ICON[step.kind])}<span>${step.title}<small>${step.minutes} min. ${step.reason}</small></span></a>${
            whenPlanned(c, step) ? html`<p>${whenPlanned(c, step)}</p>` : ""
          }</div>`
        : html`<p class="fineprint">Keep going: the next attempt sharpens this read</p>`}
      ${alts.length ? html`<ul class="alts" aria-label="Other options">${alts.slice(0, 2).map((a) => html`<li>${icon(ACTION_ICON[a.kind])}<a href="${actionHref(s, a)}">${a.title}<small>${a.reason}</small></a><span class="m">${a.minutes}m</span></li>`)}</ul>` : ""}
    </div>
  </article></li>`;
}

function mapCell(s: Skill, low: boolean): SafeHtml {
  const tries = s.recent;
  const faint = tries > 0 && tries < 4;
  const lvl = (s.evidence.attempts ?? 0) > 0 ? Math.max(1, levelIndex(s.level)) : 0;
  const weak = s.weak_spot && !low;
  const label = `${s.technique_title}: ${lvl ? LEVEL_WORD[s.level] : "not started"}${faint ? `, only ${tries} ${tries === 1 ? "try" : "tries"}` : ""}${s.trend === "improving" ? ", improving" : s.trend === "slipping" ? ", slipping" : ""}${weak ? ", weak spot" : ""}`;
  return html`<button type="button" role="gridcell" class="cell${faint ? " faint" : ""}${lvl ? "" : " new"}" data-l="${lvl}" data-open="${keyOf(s)}" aria-label="${label}" aria-pressed="${openKey === keyOf(s) ? "true" : "false"}" tabindex="-1">
    <span class="n">${s.technique_title}</span>
    <span class="l">${lvl ? html`<span class="pips" aria-hidden="true"><b></b><b></b><b></b><b></b></span>${LEVEL_WORD[s.level]}` : "New"}${faint ? `, ${tries} ${tries === 1 ? "try" : "tries"}` : ""}${
      s.trend === "improving" ? icon("trending-up") : s.trend === "slipping" ? icon("trending-down") : ""
    }${weak ? html`<span class="wkw">Weak spot</span>` : ""}</span>
  </button>`;
}

function skillMap(c: Ctx, low: boolean): SafeHtml {
  const mods: { id: string; title: string; ts: Skill[] }[] = [];
  for (const s of c.skills) {
    const last = mods.at(-1);
    if (last?.id === s.module) last.ts.push(s);
    else mods.push({ id: s.module, title: s.module_title, ts: [s] });
  }
  return html`<div class="panel map" role="grid" aria-label="Skill map: every technique by module" data-map>${mods.map((m) => {
    const started = m.ts.filter((s) => (s.evidence.attempts ?? 0) > 0).length;
    return html`<div class="mrow" role="row"><h3 role="rowheader">${m.title}<small>${started ? `${started} of ${m.ts.length} started` : "Not started"}</small></h3><div class="cells">${m.ts.map((s) => mapCell(s, low))}</div></div>`;
  })}</div>`;
}

function detail(c: Ctx, s: Skill): SafeHtml {
  const li = levelIndex(s.level);
  const max = Math.max(1, ...causeCounts(s).map(([, n]) => n));
  const weeks = s.clean_per_week;
  const wmax = Math.max(1, ...weeks);
  const start = dateOf(c.today);
  start.setDate(start.getDate() - 7 * (weeks.length - 1) - 6);
  const weekLabel = (i: number) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    return i === 0 || d.getDate() <= 7 ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : String(d.getDate());
  };
  return html`<div class="dr-head"><div><h2 id="dt-h">${s.technique_title}</h2><p>${s.module_title}, technique ${s.technique_number} of ${s.techniques_in_module}. ${s.total} problems, ${s.seen} started</p></div><button type="button" class="icon-btn" data-close aria-label="Close (Esc)">${icon("x")}</button></div>
    <div class="lvlrow" aria-label="Level: ${LEVEL_WORD[s.level]}">${LEVELS.map((l, i) => html`<span class="${i === li ? "on" : ""}" style="--lvl:var(--lvl-${i})">${LEVEL_WORD[l]}</span>`)}</div>
    <div class="dmeta">${trend(s.trend, s.recent)}${confidence(s)}</div>
    ${s.diagnosis ? html`<div class="dsec"><h3>Diagnosis</h3><p class="diag">${s.diagnosis}</p></div>` : html`<div class="dsec"><p class="fineprint">Complete a few attempts to see which parts need practice</p></div>`}
    <div class="dsec"><h3>Where attempts went wrong</h3><div class="causes">${causeCounts(s).map(
      ([k, n]) => html`<div><span>${CAUSE_WORD[k]}</span>${bar([{ value: n / max, kind: "c" }])}<b>${n}</b></div>`,
    )}</div></div>
    <div class="dsec"><h3>Clean passes per week</h3><div class="weeks" role="img" aria-label="Clean passes per week, last 6 weeks: ${weeks.join(", ")}">${weeks.map(
      (n, i) => html`<div><i class="${n ? "c" : "x"}" style="height:${n ? Math.max(8, (n / wmax) * 52) : 4}px"></i><span>${weekLabel(i)}</span></div>`,
    )}</div></div>
    ${s.history.length
      ? html`<div class="dsec"><h3>Attempts</h3><table class="att-tbl"><tbody>${[...s.history].reverse().map(
          (a) => html`<tr><td>${a.title}</td><td>${a.mark === "clean" ? tag("pass", "Clean") : a.mark === "missed" ? tag("fail", "Missed") : tag("outline", a.mark === "hint" ? "With help" : "Over time")} ${a.cause ? CAUSE_WORD[a.cause] : ""}</td><td>${fmtDay(a.date)}</td></tr>`,
        )}</tbody></table></div>`
      : ""}
    ${s.actions.length
      ? html`<div class="dsec"><h3>Recommended practice</h3><ul class="alts">${s.actions.map(
          (a) => html`<li>${icon(ACTION_ICON[a.kind])}<a href="${actionHref(s, a)}">${a.title}<small>${a.reason}.${whenPlanned(c, a) ? ` ${whenPlanned(c, a)}` : ""}</small></a><span class="m">${a.minutes}m</span></li>`,
        )}</ul></div>`
      : ""}`;
}

function paint(): void {
  const el = root();
  const c = ctx;
  if (!el || !c) return;
  const state = skillsState(c.skills);
  const recent = c.skills.reduce((n, s) => n + s.recent, 0);
  const total = c.skills.reduce((n, s) => n + (s.evidence.attempts ?? 0), 0);
  const back = html`<a class="back" href="${ROUTES.progress}">${icon("arrow-left")}Progress</a>`;
  if (state === "empty") {
    render(
      el,
      html`${back}<header class="head"><div><h1>Skills</h1></div></header>
      <div class="panel empty"><div><h2>Weak spots show up after about 10 attempts</h2><p>You've made ${total} so far. Each attempt records how it went: clean, a hint, over time, or a miss, and where it went wrong. Once a technique has a few, this page says what's holding it back and what to do about it.</p><div style="margin-top:var(--space-5)"><a class="btn btn-primary" href="${ROUTES.today}">Practice on Today</a></div></div>
        <div><h3>What it looks for</h3><ol><li><b>Can't start.</b> No test passed before you stopped</li><li><b>Wrong approach.</b> You needed a hint or a restart to find the idea</li><li><b>Edge cases.</b> Most tests passed; an empty input or a boundary failed</li><li><b>Too slow.</b> Clean, but past the time target</li><li><b>Forgetting.</b> Clean once, then missed on a later review</li></ol></div></div>
      ${skillMap(c, true)}`,
    );
    return;
  }
  const low = state === "low-data";
  const spots = spotList(c.skills);
  const m = mode();
  const shown = showAll ? spots : spots.slice(0, CARDS_SHOWN);
  const ordered = m === "module" ? [...shown].sort((a, b) => c.skills.indexOf(a) - c.skills.indexOf(b)) : shown;
  const confirmed = spots.filter((s) => s.weak_spot).length;
  const watching = spots.length - confirmed;
  const planned = spots.filter((s) => s.actions[0] && inPlanOn(c.plan, s.actions[0].problem)).length;
  const meta = low
    ? `Nothing confirmed yet, ${watching} to watch`
    : `${confirmed} ${confirmed === 1 ? "weak spot" : "weak spots"}${watching ? ` and ${watching} to watch` : ""}.${planned ? ` Your plan already has the first step for ${planned}` : ""}`;
  render(
    el,
    html`${back}
    <header class="head"><div><h1>Skills</h1><p class="lede">${
      low
        ? `Based on your ${recent} recent attempts. Each technique needs at least 4 attempts before it can be identified as a weak spot. Those with fewer attempts appear faded`
        : `Recommended practice based on your ${recent} attempts over the last 6 weeks. These recommendations update after each attempt`
    }</p></div>
      <div class="seg" role="group" aria-label="Show"><button type="button" data-mode="weak" aria-pressed="${m === "weak"}">Weak spots first</button><button type="button" data-mode="module" aria-pressed="${m === "module"}">By module</button></div></header>
    ${state === "none-weak"
      ? html`<div class="panel calm">${icon("circle-check")}<div><h2>No weak spots found</h2><p>Your latest attempt was a clean pass for every technique you have started. Your plan will continue with new topics and review drills.</p></div><a class="btn btn-secondary" href="${ROUTES.plan}">See the plan</a></div>`
      : html`<section class="sec" aria-labelledby="ws-h"><div class="section-head"><h2 id="ws-h">Your weak spots</h2><span class="meta">${meta}</span></div>
        <ol class="spots">${ordered.map((s, i) => spotCard(c, s, i, m === "module"))}</ol>
        ${spots.length > CARDS_SHOWN && !showAll ? html`<button type="button" class="btn btn-ghost spots-more" data-more>Show ${spots.length - CARDS_SHOWN} more</button>` : ""}</section>`}
    <section class="sec" aria-labelledby="map-h"><div class="section-head"><h2 id="map-h">Skill map</h2><span class="meta">${new Set(c.skills.map((s) => s.module)).size} modules, ${c.skills.length} techniques. Select a technique to see its attempt history.</span></div>
      <div class="map-legend" aria-label="How to read the map"><span><i style="background:var(--lvl-0)"></i>New</span><span><i style="background:var(--lvl-1)"></i>Shaky</span><span><i style="background:var(--lvl-2)"></i>Building</span><span><i style="background:var(--lvl-3)"></i>Solid</span><span><i style="background:var(--lvl-4)"></i>Strong</span><span><i class="faint"></i>Fewer than 4 attempts: limited history</span><span class="weakw"><i class="wk"></i>Weak spot</span><span>${icon("trending-up")}Improving</span><span>${icon("trending-down")}Slipping</span></div>
      ${skillMap(c, low)}</section>`,
  );
  // Roving tabindex: the map is one tab stop.
  const cells = [...el.querySelectorAll<HTMLElement>(".map .cell")];
  const current = cells.find((x) => x.dataset.open === openKey) ?? cells.find((x) => !x.classList.contains("new")) ?? cells[0];
  if (current) current.tabIndex = 0;
}

function openDetail(key: string): void {
  const c = ctx;
  const d = $<HTMLElement>("[data-detail]");
  const s = c?.skills.find((x) => keyOf(x) === key);
  if (!c || !d || !s) return;
  openKey = key;
  render(d, detail(c, s));
  d.hidden = false;
  d.classList.remove("is-leaving");
  for (const cell of document.querySelectorAll<HTMLElement>(".map .cell")) cell.setAttribute("aria-pressed", cell.dataset.open === key ? "true" : "false");
  history.replaceState(history.state, "", `#${key}`);
  d.querySelector<HTMLElement>("[data-close]")?.focus();
}

function closeDetail(): void {
  const d = $<HTMLElement>("[data-detail]");
  if (!d || d.hidden) return;
  const key = openKey;
  openKey = null;
  history.replaceState(history.state, "", location.pathname);
  const done = () => {
    d.hidden = true;
    d.classList.remove("is-leaving");
    for (const cell of document.querySelectorAll<HTMLElement>(".map .cell")) cell.setAttribute("aria-pressed", "false");
    document.querySelector<HTMLElement>(`.map .cell[data-open="${key}"]`)?.focus();
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce") return done();
  d.classList.add("is-leaving");
  setTimeout(done, 240);
}

function onClick(e: MouseEvent): void {
  if (!root()) return;
  const t = e.target as Element;
  const open = t.closest<HTMLElement>("[data-open]");
  const m = t.closest<HTMLElement>("[data-mode]");
  if (t.closest("[data-detail] [data-close]")) return closeDetail();
  if (open?.dataset.open) return openDetail(open.dataset.open);
  if (m) {
    try {
      localStorage.setItem(MODE_KEY, m.dataset.mode ?? "weak");
    } catch {
      // This visit only.
    }
    return paint();
  }
  if (t.closest("[data-more]")) {
    showAll = true;
    return paint();
  }
}

function onKey(e: KeyboardEvent): void {
  if (!root() || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
  if (e.key === "Escape") return closeDetail();
  const a = document.activeElement as HTMLElement | null;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
  const cell = a?.closest<HTMLElement>(".map .cell");
  if (cell && e.key.startsWith("Arrow")) {
    e.preventDefault();
    const cells = [...document.querySelectorAll<HTMLElement>(".map .cell")];
    const r = cell.getBoundingClientRect();
    let next: HTMLElement | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") next = cells[cells.indexOf(cell) + (e.key === "ArrowRight" ? 1 : -1)];
    else {
      const down = e.key === "ArrowDown";
      const rows = cells.filter((x) => (down ? x.getBoundingClientRect().top > r.bottom - 2 : x.getBoundingClientRect().bottom < r.top + 2));
      const rowTop = down ? Math.min(...rows.map((x) => x.getBoundingClientRect().top)) : Math.max(...rows.map((x) => x.getBoundingClientRect().top));
      next = rows.filter((x) => x.getBoundingClientRect().top === rowTop).sort((x, y) => Math.abs(x.getBoundingClientRect().left - r.left) - Math.abs(y.getBoundingClientRect().left - r.left))[0];
    }
    if (next) {
      cell.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    }
    return;
  }
  const cards = [...document.querySelectorAll<HTMLElement>(".spot")];
  const card = a?.closest<HTMLElement>(".spot");
  if (e.key === "j" || e.key === "k") {
    e.preventDefault();
    const i = card ? cards.indexOf(card) : -1;
    cards[i < 0 ? 0 : Math.max(0, Math.min(cards.length - 1, i + (e.key === "j" ? 1 : -1)))]?.focus();
  } else if (card && e.key === "Enter" && a === card) {
    card.querySelector<HTMLAnchorElement>("[data-step-link]")?.click();
  } else if (card && e.key === "o") {
    openDetail(card.dataset.spot ?? "");
  }
}

async function init(): Promise<void> {
  if (!root()) return;
  showAll = false;
  try {
    const [t, events] = await Promise.all([loadTrainer(), readEvents()]);
    const now = new Date();
    const skills = t.skills(events, planSettings(), { now: now.getTime() }).techniques;
    let plan: Plan | null = null;
    try {
      plan = t.plan(events, planSettings(), { now: now.getTime() });
    } catch {
      plan = null;
    }
    ctx = { skills, plan, today: isoDay(now) };
    paint();
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash.includes("/")) openDetail(hash);
  } catch {
    render(
      root(),
      html`<a class="back" href="${ROUTES.progress}">${icon("arrow-left")}Progress</a><header class="head"><div><h1>Skills</h1></div></header>
      <div class="panel empty" role="alert" style="grid-template-columns:1fr"><div><h2>Couldn't read your attempts</h2><p>Your progress is safe. Try again in a moment.</p><div style="margin-top:var(--space-5)"><button type="button" class="btn btn-primary" data-retry>Try again</button></div></div></div>`,
    );
    root()?.querySelector("[data-retry]")?.addEventListener("click", () => void init());
  }
}

document.addEventListener("click", onClick);
document.addEventListener("keydown", onKey);
document.addEventListener("astro:page-load", () => void init());
for (const ev of ["myleet:synced", "myleet:progress", "myleet:prefs"]) addEventListener(ev, () => root() && void init());

