// Companies: the index (/companies) and prep pages (/companies/<slug>), filled from the
// trainer and local progress. Pins are the plan's target companies (prefs.plan.companies).
import { setRow, SET_FOLD } from "../components/companies/rows";
import { parseEvents } from "../lib/attempts";
import { companySlug, loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { companyLogo } from "../lib/company-logos";
import { entryState, lastCleanSet, leans, leanText, perDay, readiness, type Readiness } from "../lib/companies";
import { sentenceCase } from "../lib/display";
import { isDue, statusTag } from "../lib/learn";
import { daysUntil, shortDate } from "../lib/plan";
import { planSettings, readPrefs, updatePrefs } from "../lib/prefs";
import { requireAccount } from "../lib/access";
import { readEvents } from "../lib/progress";
import { ROUTES } from "../lib/routes";
import { recordStats } from "../lib/streak";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import type { Playlist, Skill, State } from "../lib/types";
import { bar, plural, tag } from "../lib/ui/bits";
import { html, raw, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { toast } from "../lib/ui/overlay";

interface Ctx {
  cat: LoadedCatalog;
  t: TrainerApi | null;
  events: string;
  states: Record<string, State>;
  clean: Set<string>;
  skills: Skill[];
  now: number;
  /** problem id to reporter count, from "I was asked this" reports. */
  reported: Map<string, number>;
}

let ctx: Ctx | null = null;
let show: "all" | "notready" | "due" = "all";

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const root = () => $("[data-cos]");

const pins = (): string[] => readPrefs().plan.companies;
const bySlug = (c: Ctx, slug: string) => c.cat.catalog.playlists.find((p) => companySlug(p.id) === slug);

function readyBar(r: Readiness, label: string): SafeHtml {
  const n = Math.max(1, r.tracked);
  return bar(
    [
      { value: r.mastered / n, kind: "m" },
      { value: r.climbing / n, kind: "c" },
      { value: r.started / n, kind: "s" },
    ],
    label,
  );
}

const readyLabel = (r: Readiness) => `${r.ready} of ${r.tracked} ready: ${r.mastered} mastered, ${r.climbing} climbing, ${r.started} started`;

/** First tracked entry that isn't ready yet, in set order. */
function nextEntry(c: Ctx, p: Playlist): string | null {
  for (const e of p.entries) {
    const meta = e.problem === null ? undefined : c.cat.catalog.problems[e.problem];
    if (meta && entryState(c.states[meta.id], c.clean.has(meta.id)) !== "ready") return meta.id;
  }
  return null;
}

// ---- index ----

function renderPinned(c: Ctx): void {
  const list = pins().map((s) => bySlug(c, s)).filter((p): p is Playlist => !!p);
  const sec = $("[data-pinned]");
  const empty = $("[data-pin-empty]");
  if (sec) sec.hidden = list.length === 0;
  if (empty) empty.hidden = list.length > 0;
  const date = readPrefs().plan.interviewDate;
  const left = date ? daysUntil(date) : null;
  const shown = list.slice(0, 5);
  render(
    $("[data-pin-list]"),
    html`${shown.map((p, i) => {
      const r = readiness(p, c.cat.catalog, c.states, c.clean, c.now);
      const next = nextEntry(c, p);
      const end =
        i === 0 && left !== null && left >= 0
          ? tag("outline", left === 0 ? "Interview today" : `Interview in ${plural(left, "day")}`, { dot: false })
          : html`<span class="text-small text-muted">${i === 0 ? "No date set" : ""}</span>`;
      return html`<li><a class="pin" href="${ROUTES.companies}/${companySlug(p.id)}">
        <div><div class="name">${companyLogo(companySlug(p.id))}<span>${p.title}</span></div><div class="grp">${p.group}, ${plural(p.entries.length, "problem")}</div></div>
        <div class="ready">${r.ready} of ${r.tracked} ready${readyBar(r, readyLabel(r))}</div>
        <div class="next">${next ? html`Next from this set<strong>${c.cat.byId.get(next)?.title ?? next}</strong>` : "Every problem is ready"}</div>
        ${end}</a></li>`;
    })}${list.length > 5 ? html`<li class="pin-more">and ${list.length - 5} more</li>` : ""}`,
  );
}

function renderBars(c: Ctx): void {
  for (const a of $$<HTMLAnchorElement>("[data-co]")) {
    const p = bySlug(c, a.dataset["co"] ?? "");
    const el = $("[data-co-bar]", a);
    if (!p || !el) continue;
    const r = readiness(p, c.cat.catalog, c.states, c.clean, c.now);
    const started = r.tracked - r.unseen;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `${started} of ${r.tracked} started`);
    el.removeAttribute("aria-hidden");
    el.innerHTML = started ? `<span class="c" style="width:${((started / Math.max(1, r.tracked)) * 100).toFixed(1)}%"></span>` : "";
  }
}

let group = "all";
let query = "";

function applyIndexFilter(): void {
  const groups = $(".groups");
  if (!groups) return;
  const q = query.trim().toLowerCase();
  groups.dataset["view"] = group === "all" ? "all" : "group";
  for (const b of $$("[role=tab][data-group]")) b.setAttribute("aria-selected", String(b.dataset["group"] === group));
  let any = false;
  for (const sec of $$("[data-grp]")) {
    let hits = 0;
    for (const li of $$<HTMLElement>("li[data-name]", sec)) {
      const name = li.dataset["name"] ?? "";
      const hit = !q || name.includes(q);
      li.hidden = !hit;
      if (hit) hits += 1;
      const el = $(".cname", li);
      if (el) {
        const title = el.textContent ?? "";
        const i = q ? title.toLowerCase().indexOf(q) : -1;
        render(el, i < 0 ? html`${title}` : html`${title.slice(0, i)}<mark class="hit">${title.slice(i, i + q.length)}</mark>${title.slice(i + q.length)}`);
      }
    }
    sec.classList.toggle("is-search", !!q);
    sec.hidden = (group !== "all" && sec.dataset["grp"] !== group) || hits === 0;
    if (!sec.hidden) any = true;
  }
  const empty = $("[data-search-empty]");
  if (empty) {
    empty.hidden = any;
    if (!any)
      render(
        empty,
        html`<h2>No set for “${query.trim()}”</h2><p>There is no practice set with that name yet. Try a similar company or continue with the core topics in Learn.</p><div class="actions"><button class="btn btn-secondary" type="button" data-clear-find>Clear search</button></div>`,
      );
  }
}

// ---- prep page ----

function setStatus(c: Ctx, id: string): [ReturnType<typeof statusTag>, State | undefined] {
  const st = c.states[id];
  return [statusTag(st, c.now), st];
}

function renderSet(c: Ctx, p: Playlist): void {
  const list = $("[data-set]");
  if (!list) return;
  const rows: string[] = [];
  let notReady = 0;
  let due = 0;
  // Reported problems first, most reported first; the sort is stable so the rest keep curated order.
  const count = (e: Playlist["entries"][number]) => (e.problem === null ? 0 : (c.reported.get(c.cat.catalog.problems[e.problem]?.id ?? "") ?? 0));
  [...p.entries].sort((a, b) => count(b) - count(a)).forEach((e, i) => {
    const meta = e.problem === null ? undefined : c.cat.catalog.problems[e.problem];
    if (meta) {
      const ready = entryState(c.states[meta.id], c.clean.has(meta.id)) === "ready";
      if (!ready) notReady += 1;
      if (isDue(c.states[meta.id], c.now)) due += 1;
      const keep = show === "all" || (show === "notready" && !ready) || (show === "due" && isDue(c.states[meta.id], c.now));
      if (!keep) return;
      const [status, st] = setStatus(c, meta.id);
      rows.push(setRow(c.cat.catalog, e, i + 1, st, status, count(e)).value);
    } else if (show === "all") rows.push(setRow(c.cat.catalog, e, i + 1).value);
  });
  list.innerHTML = rows.join("") || html`<li class="tech-empty" style="padding:var(--space-4);color:var(--ink-3);font-size:var(--text-sm)">${show === "due" ? "Nothing from this set is due" : "Every problem in this set is ready"}</li>`.value;
  // Filters show every match; only the full list folds.
  list.classList.toggle("show-all", show !== "all" || list.dataset["expanded"] === "1");
  const n = (k: string, v: number) => {
    const el = $(`[data-n="${k}"]`);
    if (el) el.textContent = String(v);
  };
  n("notready", notReady);
  n("due", due);
  for (const b of $$("[data-set-seg] button")) b.setAttribute("aria-pressed", String(b.dataset["show"] === show));
  const more = $("[data-show-all]");
  if (more) more.hidden = show !== "all" || list.dataset["expanded"] === "1";
  const untracked = p.entries.filter((e) => e.problem === null).length;
  const foot = $("[data-set-foot]");
  if (foot) {
    foot.hidden = untracked === 0;
    foot.textContent = `${plural(untracked, "problem")} ${untracked === 1 ? "opens" : "open"} on LeetCode and ${untracked === 1 ? "isn't" : "aren't"} tracked or counted in readiness`;
  }
}

function renderReadiness(c: Ctx, p: Playlist): void {
  const r = readiness(p, c.cat.catalog, c.states, c.clean, c.now);
  const date = readPrefs().plan.interviewDate;
  const left = date ? daysUntil(date) : null;
  const pace = perDay(r.tracked - r.ready, left);
  const all = r.ready === r.tracked && r.tracked > 0;
  render(
    $("[data-readiness]"),
    html`<h2 id="rd">Readiness</h2>
      <div class="big"><b>${r.ready}</b><span class="text-secondary">of ${r.tracked} ready</span></div>
      ${readyBar(r, readyLabel(r))}
      <div class="keys"><span><i style="background:var(--pass-solid)"></i>${r.mastered} mastered</span><span><i style="background:var(--ink)"></i>${r.climbing} climbing</span><span><i style="background:var(--line-strong)"></i>${r.started} started</span><span>${r.unseen} not started</span></div>
      <p class="f">${
        all
          ? `Every problem in this set is mastered or climbing. Keep it sharp with a ${p.title} mock`
          : `Ready means mastered or climbing the ladder with a clean last pass.${pace !== null && date && left !== null ? ` ${plural(left, "day")} to ${shortDate(date)}: about ${plural(pace, `${p.title} problem`)} a day gets the whole set ready` : ""}`
      }</p>`,
  );
}

function renderLeans(c: Ctx, p: Playlist): void {
  const l = leans(p, c.cat.catalog, c.states, c.clean, c.skills);
  const top = l.filter((x) => x.count >= 2).slice(0, 8);
  const rest = l.length - top.length;
  const bank = p.entries.filter((e) => e.problem !== null && c.cat.catalog.modules[c.cat.catalog.problems[e.problem]?.module ?? -1]?.bank).length;
  const cls = (k: string) => (k === "ready" ? "ok" : k === "building" ? "bld" : "low");
  const extra = [bank ? `${plural(bank, "practice-set-only problem")} that ${bank === 1 ? "isn't" : "aren't"} on the Learn map` : "", rest ? `${plural(rest, "more technique")} with one problem each` : ""].filter(Boolean);
  render(
    $("[data-leans]"),
    html`<h2 id="ln">Techniques in this set</h2>
      <p class="text-small text-muted" style="margin-top:var(--space-1)">The techniques covered by this set and your progress in each</p>
      <ol>${top.map((x) => {
        const m = x.mastery ?? 0;
        return html`<li><span>${sentenceCase(x.title)}<span class="n">${x.count}</span></span><span class="st ${cls(x.status.kind)}">${leanText(x.status)}</span>${bar([{ value: m, kind: x.status.kind === "ready" ? "m" : "c" }], `${sentenceCase(x.title)}: ${x.ready} of ${x.count} ready here, your mastery ${Math.round(m * 100)}%`)}</li>`;
      })}</ol>
      ${extra.length ? html`<p class="text-small text-muted" style="margin-top:var(--space-4)">Plus ${extra.join(", and ")}</p>` : ""}`,
  );
}

const sessionDay = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: "short" });
const sessionTime = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(":00", "");

/** "In your plan": upcoming sessions with this set's problems and the forecast for its techniques. */
function renderInPlan(c: Ctx, p: Playlist): void {
  const el = $("[data-inplan]");
  if (!el) return;
  const pinned = pins().includes(companySlug(p.id));
  el.hidden = false;
  if (!pinned || !c.t) {
    render(el, html`<h2 id="ip">In your plan</h2><p class="text-small text-secondary" style="margin-top:var(--space-2)">Pin ${p.title} and your plan schedules its problems into your sessions, with a forecast for the techniques it leans on</p>`);
    return;
  }
  let plan;
  try {
    plan = c.t.plan(c.events, planSettings());
  } catch {
    render(el, html`<h2 id="ip">In your plan</h2><p class="text-small text-secondary" style="margin-top:var(--space-2)">The plan couldn't be built right now</p><div class="foot"><a class="link" href="/plan">Open plan</a></div>`);
    return;
  }
  const ids = new Set(p.entries.map((e) => (e.problem === null ? "" : (c.cat.catalog.problems[e.problem]?.id ?? ""))));
  const sessions = plan.days
    .flatMap((d) => d.sessions)
    .map((s) => ({ s, picks: s.items.filter((it) => ids.has(it.problem ?? "")) }))
    .filter((x) => x.picks.length > 0)
    .slice(0, 4);
  const fc = plan.forecast.filter((f) => f.companies.includes(p.title)).slice(0, 4);
  render(
    el,
    html`<h2 id="ip">In your plan</h2>
      ${
        sessions.length
          ? html`<ol class="ses">${sessions.map(
              ({ s, picks }) =>
                html`<li><span class="d">${sessionDay(s.start_ms)} ${sessionTime(s.start_ms)}</span><span>${picks.map((x) => x.title).join(", ")}<span class="why">${picks[0]?.reason ?? ""}</span></span></li>`,
            )}</ol>`
          : html`<p class="text-small text-secondary" style="margin-top:var(--space-2)">No ${p.title} problems in the next sessions: reviews and other techniques come first right now</p>`
      }
      ${
        fc.length
          ? html`<div class="fc">${fc.map((f) => {
              const goal = Math.max(1, f.goal);
              const behind = f.status === "behind";
              return html`<div class="fc-row"><span class="nm">${sentenceCase(f.title)}</span>
                <span class="pace-st${behind ? " behind" : ""}">${icon(behind ? "trending-down" : "circle-check")}${behind ? `Behind by ${f.behind_by}` : "On track"}</span>
                <div class="bar" role="img" aria-label="${sentenceCase(f.title)}: ${f.started_now} started now, ${f.projected} by the date, ${f.goal} planned">${raw(
                  `<span class="c" style="width:${Math.min(100, (f.started_now / goal) * 100).toFixed(1)}%"></span><span class="p" style="width:${Math.max(0, Math.min(100, ((f.projected - f.started_now) / goal) * 100)).toFixed(1)}%"></span>`,
                )}</div>
                <span class="detail">${f.started_now} started. ${f.projected >= f.goal ? `Plan goal of ${f.goal} met` : `${f.projected} of ${f.goal} by ${plan.interview_date ? shortDate(plan.interview_date) : "the end of the plan"}`}</span></div>`;
            })}</div>`
          : ""
      }
      <div class="foot"><span class="text-muted">${plan.summary.headline}</span><a class="link" href="/plan">Open plan</a></div>`,
  );
}

function renderPin(p: Playlist): void {
  const pinned = pins().includes(companySlug(p.id));
  const b = $("[data-pin]");
  if (b) {
    b.setAttribute("aria-pressed", String(pinned));
    b.className = `btn ${pinned ? "btn-secondary" : "btn-primary"}`;
    b.textContent = pinned ? "Unpin" : "Pin to your plan";
  }
  const note = $("[data-pinned-note]");
  if (note) {
    const date = readPrefs().plan.interviewDate;
    note.hidden = !pinned;
    note.textContent = `Pinned. Your plan leans toward ${p.title}'s problems and techniques${date ? ` until ${shortDate(date)}` : ""}`;
  }
}

function togglePin(p: Playlist): void {
  const slug = companySlug(p.id);
  const before = pins();
  const pinned = before.includes(slug);
  updatePrefs({ plan: { companies: pinned ? before.filter((s) => s !== slug) : [...before, slug] } });
  rerender();
  toast(pinned ? `${p.title} unpinned` : `${p.title} pinned to your plan`, {
    action: {
      label: "Undo",
      run: () => {
        updatePrefs({ plan: { companies: before } });
        rerender();
      },
    },
  });
}

// ---- load ----

function rerender(): void {
  const c = ctx;
  const r = root();
  if (!c || !r) return;
  if (r.dataset["cos"] === "index") {
    renderPinned(c);
    renderBars(c);
    applyIndexFilter();
    return;
  }
  const p = c.cat.catalog.playlists.find((x) => x.id === r.dataset["playlist"]);
  if (!p) return;
  renderPin(p);
  renderSet(c, p);
  renderReadiness(c, p);
  renderLeans(c, p);
  renderInPlan(c, p);
}

/** Fills in report counts after first paint; any failure leaves the curated order. */
async function loadReported(): Promise<void> {
  const mine = ctx;
  const slug = root()?.dataset["slug"];
  if (!mine || !slug) return;
  try {
    const res = await fetch(`/api/reports/company?company=${encodeURIComponent(slug)}`);
    if (!res.ok) return;
    const body = (await res.json()) as { problems?: { problem: string; count: number }[] };
    if (ctx !== mine || !body.problems?.length) return;
    mine.reported = new Map(body.problems.map((r) => [r.problem, r.count]));
    rerender();
  } catch {
    // Offline or blocked: the curated order stays.
  }
}

async function load(): Promise<void> {
  if (!root()) return;
  // Signed out, the sets are read-only: no progress, even if this browser has some.
  const [cat, events] = await Promise.all([loadCatalog(), readEvents().catch(() => "")]);
  let t: TrainerApi | null = null;
  let states: Record<string, State> = {};
  let skills: Skill[] = [];
  const now = Date.now();
  try {
    t = await loadTrainer();
    if (events.trim()) {
      states = t.states(events);
      recordStats(t.stats(events, { now }));
      if (root()?.dataset["cos"] === "prep") skills = t.skills(events, planSettings()).techniques;
    }
  } catch {
    // Without the trainer the pages still list every set; progress fills in on the next load.
  }
  const target = (id: string) => cat.byId.get(id)?.time_target_secs ?? 1500;
  ctx = { cat, t, events, states, clean: lastCleanSet(parseEvents(events), target), skills, now, reported: new Map() };
  rerender();
  void loadReported();
}

document.addEventListener("astro:page-load", () => {
  ctx = null;
  show = "all";
  // /companies#big-tech opens on that group's tab (the landing's "See all" links)
  const h = decodeURIComponent(location.hash.slice(1));
  group = h && document.querySelector(`[role=tab][data-group="${CSS.escape(h)}"]`) ? h : "all";
  query = "";
  void load();
});
window.addEventListener("myleet:progress", () => void (root() && load()));

document.addEventListener("click", (e) => {
  const r = root();
  if (!r) return;
  const t = e.target as Element;
  const p = ctx?.cat.catalog.playlists.find((x) => x.id === r.dataset["playlist"]);
  const groupBtn = t.closest<HTMLElement>("[data-group]");
  if (groupBtn) {
    group = groupBtn.dataset["group"] ?? "all";
    applyIndexFilter();
    if (groupBtn.classList.contains("more")) $(".groups")?.scrollIntoView({ block: "start" });
  } else if (t.closest("[data-clear-find]")) {
    const f = $<HTMLInputElement>("[data-find]");
    if (f) f.value = "";
    query = "";
    applyIndexFilter();
  } else if (t.closest("[data-pin]") && p) requireAccount("pin-company") && togglePin(p);
  else if (t.closest("[data-set-seg] button")) {
    show = (t.closest<HTMLElement>("[data-set-seg] button")?.dataset["show"] ?? "all") as typeof show;
    if (ctx && p) renderSet(ctx, p);
  } else if (t.closest("[data-show-all]")) {
    const list = $("[data-set]");
    if (list) {
      list.dataset["expanded"] = "1";
      list.classList.add("show-all");
      $$<HTMLAnchorElement>(`li:nth-child(${SET_FOLD + 1}) a`, list)[0]?.focus();
    }
    const more = $("[data-show-all]");
    if (more) more.hidden = true;
  }
});

document.addEventListener("input", (e) => {
  const f = (e.target as Element).closest<HTMLInputElement>("[data-find]");
  if (!f) return;
  query = f.value;
  applyIndexFilter();
});

function move(d: 1 | -1): void {
  const list = $$(".pin, .co, [data-set] .qrow").filter((el) => el.offsetParent !== null);
  if (!list.length) return;
  const cur = list.findIndex((el) => el.classList.contains("is-kbd"));
  const next = list[Math.max(0, Math.min(list.length - 1, cur < 0 ? 0 : cur + d))];
  for (const el of list) el.classList.remove("is-kbd");
  next?.classList.add("is-kbd");
  next?.focus({ preventScroll: true });
  next?.scrollIntoView({ block: "nearest" });
}

document.addEventListener("keydown", (e) => {
  const r = root();
  if (!r || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || document.querySelector("dialog[open]")) return;
  const a = document.activeElement as HTMLElement | null;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) {
    if (e.key === "Escape") a.blur();
    return;
  }
  const p = ctx?.cat.catalog.playlists.find((x) => x.id === r.dataset["playlist"]);
  const tabs = ["all", ...$$("[role=tab][data-group]").map((b) => b.dataset["group"] ?? "").filter((g) => g !== "all")];
  const keys: Record<string, () => void> = {
    j: () => move(1),
    k: () => move(-1),
    "/": () => $<HTMLInputElement>("[data-find]")?.focus(),
    p: () => p && requireAccount("pin-company") && togglePin(p),
    m: () => p && location.assign(`${ROUTES.mock}?company=${companySlug(p.id)}`),
  };
  const n = Number(e.key);
  if (r.dataset["cos"] === "index" && n >= 1 && n <= tabs.length) {
    e.preventDefault();
    group = tabs[n - 1] ?? "all";
    applyIndexFilter();
    return;
  }
  const fn = keys[e.key];
  if (!fn) return;
  e.preventDefault();
  fn();
});
