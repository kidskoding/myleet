// Learn: the curriculum map (/learn) and module pages (/learn/<NN-slug>), filled from the
// wasm trainer and local progress. Markup for both comes from the server; this adds progress.
import { circle } from "../components/learn/icons";
import { signedIn } from "../lib/account";
import { allReads, type ReadState } from "../lib/annotations";
import { loadCatalog, type LoadedCatalog } from "../lib/catalog";
import { sentenceCase } from "../lib/display";
import { keep, pstatus, statusTag, tally, textHit, touched, type FilterMode, type Tally } from "../lib/learn";
import { planSettings, readPrefs } from "../lib/prefs";
import { readEvents } from "../lib/progress";
import { moduleHref, noteHref, problemHref } from "../lib/routes";
import { recordStats } from "../lib/streak";
import { loadTrainer } from "../lib/trainer";
import type { Module, State, Technique } from "../lib/types";
import { bar, diff, queueRow, tag } from "../lib/ui/bits";
import { html, raw, render, type SafeHtml } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { displayRung } from "../lib/ui/ladder";

const OPEN_KEY = "myleet:learn-open";
const TECH_KEY = "myleet:learn-tech";

interface Ctx {
  cat: LoadedCatalog;
  states: Record<string, State>;
  weak: Set<string>;
  next: string | null;
  now: number;
  reads: Record<string, ReadState>;
  minutes: Record<string, number>;
}

let ctx: Ctx | null = null;
let mode: FilterMode = "all";
let query = "";

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

function readJson<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // Expansion state lasts this visit only.
  }
}

const idsOf = (c: Ctx, t: Technique): string[] => t.problems.map((i) => c.cat.catalog.problems[i]?.id ?? "").filter(Boolean);
const moduleIds = (c: Ctx, m: Module): string[] => m.techniques.flatMap((t) => idsOf(c, t));
const weakKey = (m: Module, t: Technique) => `${m.id}/${t.id}`;

function matching(c: Ctx, m: Module, t: Technique): string[] {
  const weak = c.weak.has(weakKey(m, t));
  return idsOf(c, t).filter((id) => {
    if (!keep(mode, c.states[id], weak, c.now)) return false;
    return !query || !!textHit(c.cat.byId.get(id)?.title ?? "", query);
  });
}

const filtering = () => mode !== "all" || query.trim() !== "";

function marked(title: string): SafeHtml {
  const hit = textHit(title, query);
  if (!hit) return html`${title}`;
  return html`${title.slice(0, hit[0])}<mark class="hit">${title.slice(hit[0], hit[1])}</mark>${title.slice(hit[1])}`;
}

function railBar(t: Tally, label: string): SafeHtml {
  const n = Math.max(1, t.total);
  return bar(
    [
      { value: t.mastered / n, kind: "m" },
      { value: t.climbing / n, kind: "c" },
      { value: t.started / n, kind: "s" },
    ],
    label,
  );
}

const railLabel = (t: Tally) => `${t.mastered} mastered, ${t.climbing} leveling up, ${t.started} started of ${t.total}`;

function problemRow(c: Ctx, id: string): SafeHtml {
  const p = c.cat.byId.get(id);
  const st = c.states[id];
  const t = statusTag(st, c.now);
  const row = queueRow({
    href: problemHref(id),
    title: p?.title ?? id,
    ...(t ? { tag: tag(t[0], t[1]) } : {}),
    sub: t ? "" : "Not started",
    ladder: { rung: st ? displayRung(st.rung) : 0, due: t?.[0] === "due" },
    ...(p ? { difficulty: p.difficulty } : {}),
    mins: `${Math.round((p?.time_target_secs ?? 1500) / 60)}m`,
    vt: `p-${id}`,
  });
  // Learn shows the difficulty word beside the bars (Today's rows don't).
  const labelled = p ? raw(row.value.replace(diff(p.difficulty, { label: false }).value, diff(p.difficulty).value)) : row;
  if (!textHit(p?.title ?? id, query)) return labelled;
  return raw(labelled.value.replace(/(<div class="title"[^>]*>)[^<]*(<\/div>)/, (_, open: string, close: string) => `${open}${marked(p?.title ?? id).value}${close}`));
}

function noteLine(c: Ctx, t: Technique): SafeHtml {
  if (!t.note) return html``;
  const r = c.reads[t.note];
  const title = c.cat.catalog.modules.flatMap((m) => m.notes).find((n) => n.path === t.note)?.title ?? "Note";
  const read = r?.read ? "read" : r && r.pct > 0.02 ? `${Math.round(r.pct * 100)}% read` : "";
  return html`<div class="note">${icon("book-open")}<a href="${noteHref(t.note)}" data-tech-note>${title}</a>${c.minutes[t.note] ? `${c.minutes[t.note]} min` : ""}${read ? `, ${read}` : ""}</div>`;
}

function techBlock(c: Ctx, m: Module, t: Technique, open: boolean): SafeHtml {
  const all = idsOf(c, t);
  const ids = filtering() ? matching(c, m, t) : all;
  const tl = tally(all, c.states, c.now);
  const title = sentenceCase(t.title);
  if (!open) {
    const noteTitle = t.note ? c.cat.catalog.modules.flatMap((x) => x.notes).find((n) => n.path === t.note)?.title : null;
    return html`<button class="tech-collapsed" type="button" aria-expanded="false" data-tech="${t.id}" data-tech-mod="${m.id}">
      <span><strong>${title}</strong><span class="t">${all.length} problems${noteTitle ? `, note: ${noteTitle}` : ""}</span></span>
      <span class="tbar">${railBar(tl, railLabel(tl))}</span><span class="k">${tl.mastered} mastered, ${tl.climbing} leveling up</span></button>`;
  }
  const hid = `t-${m.id}-${t.id}`;
  return html`<section class="tech" aria-labelledby="${hid}" data-tech-open="${t.id}">
    <div class="tech-head">
      <div><h3 id="${hid}">${title}</h3>${noteLine(c, t)}</div>
      <div class="tbar">${railBar(tl, railLabel(tl))}<div class="mini">${tl.mastered} mastered, ${tl.climbing} leveling up of ${tl.total}</div></div>
      <button class="btn btn-ghost btn-sm" type="button" data-tech="${t.id}" data-tech-mod="${m.id}" aria-expanded="true">Collapse</button>
    </div>
    ${ids.length ? html`<ol class="queue">${ids.map((id) => problemRow(c, id))}</ol>` : html`<p class="tech-empty">No problems here match the filter</p>`}
  </section>`;
}

/** Which techniques start open in a module: stored choice, else the one holding the next problem or a due review. */
function openTechs(c: Ctx, m: Module): Set<string> {
  const requested = new URLSearchParams(location.search).get("technique");
  if (requested && m.techniques.some((t) => t.id === requested)) return new Set([requested]);
  const stored = readJson<Record<string, string[]>>(TECH_KEY, {})[m.id];
  if (stored) return new Set(stored);
  const has = (t: Technique, pred: (id: string) => boolean) => idsOf(c, t).some(pred);
  const t =
    m.techniques.find((x) => c.next !== null && has(x, (id) => id === c.next)) ??
    m.techniques.find((x) => tally(idsOf(c, x), c.states, c.now).due > 0) ??
    m.techniques.find((x) => { const tl = tally(idsOf(c, x), c.states, c.now); return tl.mastered < tl.total; }) ??
    m.techniques[0];
  return new Set(t ? [t.id] : []);
}

function techList(c: Ctx, m: Module): SafeHtml {
  const open = openTechs(c, m);
  const techs = filtering() ? m.techniques.filter((t) => matching(c, m, t).length > 0) : m.techniques;
  // A text filter opens every technique with a match.
  return html`${techs.map((t) => techBlock(c, m, t, open.has(t.id) || query.trim() !== ""))}`;
}

function toggleTech(modId: string, techId: string): void {
  if (!ctx) return;
  const m = ctx.cat.catalog.modules.find((x) => x.id === modId);
  if (!m) return;
  const curOpen = openTechs(ctx, m);
  const url = new URL(location.href);
  url.searchParams.delete("technique");
  history.replaceState(history.state, "", url);
  const all = readJson<Record<string, string[]>>(TECH_KEY, {});
  const cur = curOpen;
  if (cur.has(techId)) cur.delete(techId);
  else cur.add(techId);
  all[modId] = [...cur];
  writeJson(TECH_KEY, all);
  if ($("[data-learn='map']")) renderBody(ctx, m);
  else renderModulePage(ctx);
  $<HTMLElement>(`[data-tech="${techId}"][data-tech-mod="${modId}"]`)?.focus();
}

function openModules(c: Ctx): Set<string> {
  const stored = readJson<string[] | null>(OPEN_KEY, null);
  if (stored) return new Set(stored);
  const nextModule = c.next ? c.cat.catalog.modules[c.cat.byId.get(c.next)?.module ?? -1]?.id : undefined;
  return new Set(nextModule ? [nextModule] : []);
}

function renderBody(c: Ctx, m: Module): void {
  const li = $(`[data-module="${m.id}"]`);
  const body = li && $(".mod-body", li);
  const btn = li && $<HTMLButtonElement>(".mod-row", li);
  if (!li || !body || !btn) return;
  const open = openModules(c).has(m.id) || query.trim() !== "";
  btn.setAttribute("aria-expanded", String(open));
  body.hidden = !open;
  if (!open) return render(body, html``);
  render(body, html`${techList(c, m)}<a class="link text-small" href="${moduleHref(m)}">Open ${sentenceCase(m.title)} as a page</a>`);
}

function renderMap(c: Ctx): void {
  const mods = c.cat.catalog.modules.filter((m) => !m.bank);
  const allIds = mods.flatMap((m) => moduleIds(c, m));
  const all = tally(allIds, c.states, c.now);
  const lede = $("[data-lede]");
  if (lede && touched(all) > 0)
    lede.textContent = `${lede.dataset["count"]} modules by interview pattern. ${touched(all)} of ${all.total} problems started, ${all.mastered} mastered`;

  const guide = c.cat.catalog.guide;
  let read = 0;
  for (const a of $$<HTMLAnchorElement>("[data-start] a[data-note]")) {
    const r = c.reads[a.dataset["note"] ?? ""];
    a.classList.toggle("read", !!r?.read);
    if (r?.read) read += 1;
  }
  const meta = $("[data-start-meta]");
  if (meta && read > 0) meta.textContent = `${read} of ${guide.length} read`;

  let weakN = 0;
  for (const m of mods) for (const t of m.techniques) if (c.weak.has(weakKey(m, t))) weakN += idsOf(c, t).filter((id) => pstatus(c.states[id]) !== "unseen").length;
  const n = (k: string, v: number) => { const el = $(`[data-n="${k}"]`); if (el) el.textContent = v ? String(v) : ""; };
  n("due", all.due);
  n("weak", weakN);
  for (const b of $$("[data-seg] button")) b.setAttribute("aria-pressed", String(b.dataset["mode"] === mode));

  const firstPaint = !sessionStorage.getItem("myleet:rails");
  let shown = 0;
  for (const m of mods) {
    const li = $(`[data-module="${m.id}"]`);
    if (!li) continue;
    const tl = tally(moduleIds(c, m), c.states, c.now);
    const visible = !filtering() || m.techniques.some((t) => matching(c, m, t).length > 0);
    li.hidden = !visible;
    if (visible) shown += 1;
    const rail = $("[data-rail]", li);
    if (rail) {
      rail.innerHTML = railBar(tl, railLabel(tl)).value.replace('class="bar"', 'class="bar" style="width:var(--w)"');
      rail.classList.toggle("fill", firstPaint && touched(tl) > 0);
    }
    const count = $("[data-count]", li);
    if (count)
      render(count, touched(tl) ? html`<b>${tl.mastered}</b> mastered<span class="line2">${touched(tl)} of ${tl.total} started</span>` : html`${tl.total} problems<span class="line2">Not started</span>`);
    const weak = m.techniques.some((t) => c.weak.has(weakKey(m, t)));
    render($("[data-mod-tags]", li), html`${tl.due ? tag("due", `${tl.due} due`) : ""}${weak ? tag("weak", "Weak spot") : ""}`);
    renderBody(c, m);
  }
  try {
    sessionStorage.setItem("myleet:rails", "1");
  } catch {
    // Rails animate again next visit.
  }
  const empty = $("[data-empty]");
  if (empty) {
    empty.hidden = shown > 0;
    if (!shown) render(empty, emptyCopy(all.due));
  }
}

function emptyCopy(due: number): SafeHtml {
  if (query.trim()) return html`<h2>No problem matches “${query.trim()}”</h2><p>Filters match problem titles. Try part of the name, or clear the filter</p><div class="actions"><button class="btn btn-secondary" type="button" data-clear>Clear filter</button></div>`;
  if (mode === "weak")
    return html`<h2>No weak spots right now</h2><p>A technique becomes a weak spot when you've started its problems but mostly not passed them cleanly. Everything you've started is on track.${due ? ` The Due filter has ${due} ${due === 1 ? "review" : "reviews"} waiting` : ""}</p>${due ? html`<div class="actions"><button class="btn btn-secondary" type="button" data-set-mode="due">Show due reviews</button></div>` : ""}`;
  if (mode === "due") return html`<h2>Nothing due</h2><p>Every review is on schedule. Each clean pass levels a problem up, and it comes back after 1, 3, 7, 14, then 30 days</p><div class="actions"><button class="btn btn-secondary" type="button" data-set-mode="all">Show all modules</button></div>`;
  return html`<h2>You have started every problem</h2><p>Use the Due filter to find your next reviews</p>`;
}

function toggleModule(id: string, force?: boolean): void {
  if (!ctx) return;
  const set = openModules(ctx);
  const open = force ?? !set.has(id);
  if (open) set.add(id);
  else set.delete(id);
  writeJson(OPEN_KEY, [...set]);
  const m = ctx.cat.catalog.modules.find((x) => x.id === id);
  if (m) renderBody(ctx, m);
}

function renderModulePage(c: Ctx): void {
  const root = $("[data-learn='module']");
  const m = c.cat.catalog.modules.find((x) => x.id === root?.dataset["module"]);
  if (!root || !m) return;
  const tl = tally(moduleIds(c, m), c.states, c.now);
  const n = Math.max(1, tl.total);
  const b = $("[data-mod-bar]");
  if (b) {
    b.innerHTML = [["m", tl.mastered], ["c", tl.climbing], ["s", tl.started]].map(([k, v]) => `<span class="${k}" style="width:${((Number(v) / n) * 100).toFixed(1)}%"></span>`).join("");
    b.setAttribute("aria-label", railLabel(tl));
  }
  render($("[data-stats]"), html`<span><b>${tl.mastered}</b>mastered</span><span><b>${tl.climbing}</b>leveling up</span><span><b>${tl.started}</b>started</span><span><b>${tl.total - touched(tl)}</b>not started</span>`);
  const techs = $("[data-techs]");
  if (techs) {
    techs.removeAttribute("aria-busy");
    render(techs, techList(c, m));
  }
  for (const a of $$<HTMLAnchorElement>(".notes-list a[data-note]")) {
    const r = c.reads[a.dataset["note"] ?? ""];
    const ic = $("[data-note-icon]", a);
    const meta = $("[data-note-meta]", a);
    if (r?.read) render(ic, icon("circle-check", { cls: "ok", label: "Read" }));
    else if (r && r.pct > 0.02) render(ic, icon("book-open", { cls: "reading", label: "In progress" }));
    else render(ic, raw(circle("unread").value.replace('aria-hidden="true"', 'role="img" aria-label="Not read"')));
    if (meta) meta.textContent = !r?.read && r && r.pct > 0.02 ? `${Math.round(r.pct * 100)}% read` : "";
  }
  render($("[data-next]"), nextPanel(c, m));
}

function nextPanel(c: Ctx, m: Module): SafeHtml {
  const unread = m.notes.find((n) => !c.reads[n.path]?.read);
  const tech = (unread && m.techniques.find((t) => t.note === unread.path)) ?? m.techniques.find((t) => idsOf(c, t).some((id) => pstatus(c.states[id]) === "unseen"));
  const due = moduleIds(c, m).find((id) => statusTag(c.states[id], c.now)?.[0] === "due");
  const fresh = (tech ? idsOf(c, tech) : moduleIds(c, m)).filter((id) => pstatus(c.states[id]) === "unseen");
  const practice = due ?? fresh[0] ?? null;
  const pTitle = practice ? c.cat.byId.get(practice)?.title : null;
  const head = html`<h2 id="nx">Next in this module</h2>`;
  if (unread) {
    const r = c.reads[unread.path];
    const started = !!r && r.pct > 0.02;
    const line = `${started ? "Finish" : "Read"} “${unread.title}”${fresh.length ? `, then the ${fresh.length === 1 ? "problem" : `${Math.min(fresh.length, 3)} ${tech ? sentenceCase(tech.title).toLowerCase() : ""} problems`} you haven't started` : "."}`;
    return html`${head}<p class="text-small text-secondary" style="margin-top:var(--space-2)">${line}</p>
      <a class="btn btn-primary btn-block" style="margin-top:var(--space-4)" href="${noteHref(unread.path)}">${started ? "Continue reading" : "Start reading"}</a>
      ${practice ? html`<a class="btn btn-ghost btn-block" style="margin-top:var(--space-2)" href="${problemHref(practice)}">Practice ${pTitle ?? practice}</a>` : ""}`;
  }
  if (practice)
    return html`${head}<p class="text-small text-secondary" style="margin-top:var(--space-2)">${due ? "A review here is due" : "Every note in this module is read. Keep going with the problems"}</p>
      <a class="btn btn-primary btn-block" style="margin-top:var(--space-4)" href="${problemHref(practice)}">Practice ${pTitle ?? practice}</a>`;
  return html`${head}<p class="text-small text-secondary" style="margin-top:var(--space-2)">You have read every note and started every problem. Upcoming reviews will appear on Today</p>`;
}

async function load(): Promise<void> {
  const root = $("[data-learn]");
  if (!root) return;
  const minutes = JSON.parse($("[data-minutes]")?.textContent ?? "{}") as Record<string, number>;
  try {
    // Signed out, the map is read-only: no progress, even if this browser has some.
    const [cat, t, events] = await Promise.all([loadCatalog(), loadTrainer(), readEvents()]);
    const now = Date.now();
    const states = events.trim() ? t.states(events) : {};
    let weak = new Set<string>();
    let next: string | null = null;
    if (events.trim()) {
      try {
        weak = new Set(t.skills(events, planSettings()).techniques.filter((s) => s.weak).map((s) => `${s.module}/${s.technique}`));
      } catch {
        // Weak spots need the skill model; without it the Weak filter is just empty.
      }
      recordStats(t.stats(events, { now }));
    }
    try {
      next = t.today(events, { now, newPerDay: readPrefs().newPerDay })[0]?.problem ?? null;
    } catch {
      next = null;
    }
    ctx = { cat, states, weak, next, now, reads: signedIn() ? allReads() : {}, minutes };
    $("[data-error]")?.setAttribute("hidden", "");
    if (root.dataset["learn"] === "map") renderMap(ctx);
    else renderModulePage(ctx);
  } catch {
    $("[data-error]")?.removeAttribute("hidden");
  }
}

function rerender(): void {
  if (!ctx) return;
  if ($("[data-learn='map']")) renderMap(ctx);
  else renderModulePage(ctx);
}

document.addEventListener("astro:page-load", () => {
  ctx = null;
  mode = "all";
  query = "";
  void load();
});
window.addEventListener("myleet:progress", () => void ($("[data-learn]") && load()));

document.addEventListener("click", (e) => {
  if (!$("[data-learn]")) return;
  const t = e.target as Element;
  const modRow = t.closest<HTMLButtonElement>(".mod-row");
  const tech = t.closest<HTMLElement>("[data-tech]");
  const seg = t.closest<HTMLElement>("[data-seg] button");
  const set = t.closest<HTMLElement>("[data-set-mode]");
  if (modRow) toggleModule(modRow.closest<HTMLElement>("[data-module]")?.dataset["module"] ?? "");
  else if (tech) toggleTech(tech.dataset["techMod"] ?? "", tech.dataset["tech"] ?? "");
  else if (seg || set) setMode(((seg ?? set)?.dataset[seg ? "mode" : "setMode"] ?? "all") as FilterMode);
  else if (t.closest("[data-clear]")) {
    const f = $<HTMLInputElement>("[data-filter]");
    if (f) f.value = "";
    query = "";
    rerender();
  } else if (t.closest("[data-retry]")) void load();
});

document.addEventListener("input", (e) => {
  const f = (e.target as Element).closest<HTMLInputElement>("[data-filter]");
  if (!f) return;
  query = f.value;
  rerender();
});

function setMode(m: FilterMode): void {
  mode = m;
  rerender();
}

const rows = () => $$(".mod:not([hidden]) .mod-row, .tech-collapsed, .tech .qrow").filter((el) => el.offsetParent !== null);

function move(d: 1 | -1): void {
  const list = rows();
  if (!list.length) return;
  const cur = list.findIndex((el) => el.classList.contains("is-kbd"));
  const next = list[Math.max(0, Math.min(list.length - 1, cur < 0 ? 0 : cur + d))];
  for (const el of list) el.classList.remove("is-kbd");
  next?.classList.add("is-kbd");
  next?.focus({ preventScroll: true });
  next?.scrollIntoView({ block: "nearest" });
}

const focused = () => $(".is-kbd") ?? (document.activeElement as HTMLElement | null);

document.addEventListener("keydown", (e) => {
  if (!$("[data-learn]") || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || document.querySelector("dialog[open]")) return;
  const a = document.activeElement as HTMLElement | null;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) {
    if (e.key === "Escape" && a.matches("[data-filter]")) a.blur();
    return;
  }
  const el = focused();
  const modId = el?.closest<HTMLElement>("[data-module]")?.dataset["module"];
  const map = !!$("[data-learn='map']");
  const keys: Record<string, () => void> = {
    j: () => move(1),
    k: () => move(-1),
    "/": () => $<HTMLInputElement>("[data-filter]")?.focus(),
    "1": () => setMode("all"),
    "2": () => setMode("due"),
    "3": () => setMode("weak"),
    "4": () => setMode("new"),
    ArrowRight: () => map && modId && el?.matches(".mod-row") && toggleModule(modId, true),
    ArrowLeft: () => map && modId && el?.matches(".mod-row") && toggleModule(modId, false),
    o: () => {
      const href = el?.closest(".mod")?.querySelector<HTMLElement>(".mod-row")?.dataset["href"];
      if (href) location.assign(href);
    },
    n: () => {
      const sec = el?.closest(".tech") ?? el;
      const note = sec?.querySelector<HTMLAnchorElement>("[data-tech-note]");
      if (note) location.assign(note.href);
    },
  };
  const fn = keys[e.key];
  if (!fn) return;
  e.preventDefault();
  fn();
});
