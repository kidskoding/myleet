// Notes reader (/notes/...): reading progress, contents, highlights, margin notes, the
// practice panel and the Try it runner. Highlights live on this device (lib/annotations).
import {
  annotationsFor,
  locate,
  makeAnnotation,
  markProgress,
  minutesLeft,
  putAnnotation,
  readState,
  removeAnnotation,
  type Annotation,
} from "../lib/annotations";
import { cachedMe } from "../lib/account";
import { loadCatalog } from "../lib/catalog";
import { isDue, pstatus, statusTag, tally } from "../lib/learn";
import { readEvents } from "../lib/progress";
import { isLinked } from "../lib/sync";
import { problemHref } from "../lib/routes";
import { loadTrainer } from "../lib/trainer";
import type { State } from "../lib/types";
import { queueRow, tag } from "../lib/ui/bits";
import { html, render } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { displayRung } from "../lib/ui/ladder";
import { closeDialog, openDialog, toast } from "../lib/ui/overlay";

interface Practice {
  path: string;
  ids: string[];
  examples: string[];
  technique: string;
  all: string;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const page = () => $("[data-note-page]");
const prose = () => $("[data-prose]");
const path = () => page()?.dataset["path"] ?? "";

let anns: Annotation[] = [];
let failed = new Set<string>();
let composing: { id: string; draft: string } | null = null;
let pending: { start: number; end: number } | null = null;
let openedAt = Date.now();

// ---- text offsets over the prose (UI chips and code toolbars excluded) ----

/** Where highlights live: the account when this device syncs, else this device. */
function whereSaved(subject: string): string {
  const me = cachedMe();
  if (!me) return `${subject} stay on this device until you sign in`;
  return isLinked(me.user.id) ? `${subject} sync with your account` : `${subject} stay on this device`;
}

function textNodes(root: HTMLElement): Text[] {
  const out: Text[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest("[data-ui], .code-tools, .anchor") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = w.nextNode(); n; n = w.nextNode()) out.push(n as Text);
  return out;
}

const fullText = (root: HTMLElement) => textNodes(root).map((n) => n.data).join("");

function offsetOf(root: HTMLElement, node: Node, offset: number): number | null {
  let pos = 0;
  for (const t of textNodes(root)) {
    if (t === node) return pos + offset;
    if (node.nodeType === Node.ELEMENT_NODE && node.contains(t) && (node as Element).childNodes[offset]?.contains(t)) return pos;
    pos += t.data.length;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    // Selection ended after the last text node inside `node`.
    let p = 0;
    for (const t of textNodes(root)) {
      if (node.contains(t)) p += 0;
      p += t.data.length;
    }
    return p;
  }
  return null;
}

function wrap(root: HTMLElement, start: number, end: number, a: Annotation): void {
  let pos = 0;
  for (const t of textNodes(root)) {
    const s = pos;
    const e = pos + t.data.length;
    pos = e;
    if (e <= start || s >= end || !t.data.trim()) continue;
    let node = t;
    if (start > s) node = node.splitText(start - s);
    if (end < e) node.splitText(end - Math.max(start, s));
    const mark = document.createElement("mark");
    mark.className = `hl${a.text ? " has-note" : ""}`;
    mark.dataset["hl"] = a.id;
    if (a.text) mark.setAttribute("aria-describedby", `mn-${a.id}`);
    node.replaceWith(mark);
    mark.append(node);
  }
}

function clearMarks(root: HTMLElement): void {
  for (const el of $$("[data-ui]", root)) el.remove();
  for (const m of $$("mark.hl", root)) m.replaceWith(...m.childNodes);
  root.normalize();
}

// ---- rendering highlights, margin notes and "Your notes" ----

function placed(): { a: Annotation; at: [number, number] | null }[] {
  const root = prose();
  if (!root) return [];
  const text = fullText(root);
  return anns.map((a) => ({ a, at: locate(a, text) }));
}

const shortDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function renderMarks(): void {
  const root = prose();
  if (!root) return;
  clearMarks(root);
  const list = placed();
  for (const { a, at } of list) if (at) wrap(root, at[0], at[1], a);
  // Narrow screens: a "Note" chip after each annotated passage opens it inline.
  for (const { a, at } of list) {
    if (!at || !a.text) continue;
    const last = $$(`mark[data-hl="${a.id}"]`, root).at(-1);
    if (!last) continue;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "inline-note";
    chip.dataset["ui"] = "";
    chip.dataset["chip"] = a.id;
    chip.setAttribute("aria-expanded", "false");
    chip.textContent = "Note";
    last.after(chip);
  }
  renderMargin();
  renderMine(list);
}

function noteCard(a: Annotation): string {
  const bad = failed.has(a.id);
  if (composing?.id === a.id)
    return html`<div class="mnote is-on" data-mnote="${a.id}">
      <label class="visually-hidden" for="nn-${a.id}">Note on the highlighted passage</label>
      <textarea id="nn-${a.id}" data-compose>${composing.draft}</textarea>
      <div class="acts"><button class="btn btn-ghost btn-sm" type="button" data-cancel>Cancel</button><button class="btn btn-primary btn-sm" type="button" data-save>Save note <kbd>${navigator.platform.includes("Mac") ? "⌘↵" : "Ctrl ↵"}</kbd></button></div></div>`.value;
  return html`<div class="mnote${bad ? " failed" : ""}" id="mn-${a.id}" data-mnote="${a.id}"${bad ? html` role="alert"` : ""}>
    <p>${a.text}</p>
    <div class="when">${bad ? html`<span>Not saved. This browser's storage is full or blocked</span><button type="button" data-retry-save>Retry</button>` : html`<span>${shortDate(a.updated)}</span><button type="button" data-edit>Edit</button><button type="button" data-remove>Remove</button>`}</div></div>`.value;
}

function marginVisible(): boolean {
  const m = $("[data-margin]");
  return !!m && getComputedStyle(m).display !== "none";
}

function renderMargin(): void {
  const margin = $("[data-margin]");
  if (!margin) return;
  if (!marginVisible()) {
    margin.replaceChildren();
    renderInlineComposer();
    return;
  }
  const show = anns.filter((a) => a.text || composing?.id === a.id);
  margin.innerHTML = show.map(noteCard).join("");
  const top0 = margin.getBoundingClientRect().top;
  let floor = 0;
  for (const card of $$("[data-mnote]", margin)) {
    const mark = $(`mark[data-hl="${card.dataset["mnote"]}"]`);
    const want = mark ? mark.getBoundingClientRect().top - top0 - 8 : floor;
    const top = Math.max(want, floor);
    card.style.top = `${top}px`;
    floor = top + card.offsetHeight + 8;
  }
  $<HTMLTextAreaElement>("[data-compose]", margin)?.focus();
}

/** Below the margin breakpoint the composer opens inline after the passage. */
function renderInlineComposer(): void {
  if (!composing) return;
  const last = $$(`mark[data-hl="${composing.id}"]`).at(-1);
  if (!last) return;
  const a = anns.find((x) => x.id === composing?.id);
  if (!a) return;
  const box = document.createElement("span");
  box.className = "inline-body notes-compose";
  box.dataset["ui"] = "";
  box.innerHTML = noteCard(a).replace('class="mnote is-on"', 'class="mnote-inline"');
  (last.nextElementSibling?.matches("[data-chip]") ? last.nextElementSibling : last).after(box);
  $<HTMLTextAreaElement>("[data-compose]", box)?.focus();
}

function renderMine(list = placed()): void {
  const n = anns.length;
  const count = $("[data-mine-count]");
  if (count) count.textContent = n ? String(n) : "";
  const items = (xs: typeof list) =>
    xs.map(({ a }) => html`<a href="#" data-goto="${a.id}"><q>${a.quote.length > 140 ? `${a.quote.slice(0, 140)}…` : a.quote}</q>${a.text ? html`<span>${a.text}</span>` : ""}</a>`);
  const placedOnes = list.filter((x) => x.at);
  const detached = list.filter((x) => !x.at);
  const body = n
    ? html`${items(placedOnes)}${detached.length ? html`<h3>Detached highlights</h3><p>The note's text changed and these passages are gone</p>${detached.map(({ a }) => html`<div class="mnote-detached"><q>${a.quote}</q>${a.text ? html`<span>${a.text}</span>` : ""}</div>`)}` : ""}<p>${whereSaved("Highlights and notes")}</p>`
    : html`<p>Select text in the note to highlight it or add a note. ${whereSaved("They")}</p>`;
  render($("[data-mine]"), body);
  render($("[data-mine-mob]"), n ? html`<h3>Your notes</h3>${items(placedOnes)}` : html``);
}

// ---- popover ----

function showPop(rect: DOMRect, content: ReturnType<typeof html>): void {
  const pop = $("[data-pop]");
  if (!pop) return;
  render(pop, content);
  pop.hidden = false;
  const top = rect.top + scrollY - pop.offsetHeight - 10;
  const left = Math.min(Math.max(rect.left + rect.width / 2, pop.offsetWidth / 2 + 8), innerWidth - pop.offsetWidth / 2 - 8);
  pop.style.top = `${Math.max(scrollY + 8, top)}px`;
  pop.style.left = `${left + scrollX}px`;
}

const hidePop = () => {
  const pop = $("[data-pop]");
  if (pop) pop.hidden = true;
};

function selectionRange(): { start: number; end: number; rect: DOMRect } | null {
  const root = prose();
  const sel = getSelection();
  if (!root || !sel || sel.isCollapsed || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.commonAncestorContainer)) return null;
  const s = offsetOf(root, r.startContainer, r.startOffset);
  const e = offsetOf(root, r.endContainer, r.endOffset);
  if (s === null || e === null || e <= s) return null;
  const text = fullText(root);
  // Trim surrounding whitespace so the quote re-anchors cleanly.
  let start = s;
  let end = e;
  while (start < end && /\s/.test(text[start] ?? "")) start++;
  while (end > start && /\s/.test(text[end - 1] ?? "")) end--;
  return end > start ? { start, end, rect: r.getBoundingClientRect() } : null;
}

function onSelection(): void {
  const s = selectionRange();
  if (!s) {
    pending = null;
    if (!$("[data-pop]")?.matches(":focus-within")) hidePop();
    return;
  }
  pending = { start: s.start, end: s.end };
  showPop(
    s.rect,
    html`<button type="button" data-act="highlight">${icon("check")}Highlight <kbd>h</kbd></button><button type="button" data-act="note">${icon("plus")}Add note <kbd>n</kbd></button><button type="button" data-act="link">${icon("copy")}Copy link</button>`,
  );
}

function save(a: Annotation): boolean {
  try {
    putAnnotation(a);
    failed.delete(a.id);
    return true;
  } catch {
    failed.add(a.id);
    return false;
  }
}

function highlight(withNote: boolean): void {
  const root = prose();
  if (!root || !pending) return;
  const a = makeAnnotation(path(), fullText(root), pending.start, pending.end);
  pending = null;
  getSelection()?.removeAllRanges();
  hidePop();
  anns = [...anns, a].sort((x, y) => x.start - y.start);
  if (!save(a)) toast("Couldn't save the highlight: this browser's storage is full or blocked");
  if (withNote) composing = { id: a.id, draft: "" };
  renderMarks();
}

function copyLink(): void {
  const root = prose();
  if (!root || !pending) return;
  const q = fullText(root).slice(pending.start, pending.end).replace(/\s+/g, " ").trim();
  const words = q.split(" ");
  const frag = words.length > 8 ? `${encodeURIComponent(words.slice(0, 4).join(" "))},${encodeURIComponent(words.slice(-4).join(" "))}` : encodeURIComponent(q);
  const url = `${location.origin}${location.pathname}#:~:text=${frag}`;
  void navigator.clipboard?.writeText(url).then(
    () => toast("Link copied. It opens this note at the passage"),
    () => toast("Couldn't copy the link"),
  );
  hidePop();
}

function focusAnnotation(id: string): void {
  for (const el of $$(".is-on")) el.classList.remove("is-on");
  const marks = $$(`mark[data-hl="${id}"]`);
  for (const m of marks) m.classList.add("is-on");
  $(`[data-mnote="${id}"]`)?.classList.add("is-on");
  marks[0]?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function saveComposer(): void {
  if (!composing) return;
  const ta = $<HTMLTextAreaElement>("[data-compose]");
  const text = (ta?.value ?? composing.draft).trim();
  const a = anns.find((x) => x.id === composing?.id);
  composing = null;
  if (!a) return renderMarks();
  const next = { ...a, text, updated: Date.now() };
  anns = anns.map((x) => (x.id === a.id ? next : x));
  save(next);
  renderMarks();
}

function remove(id: string): void {
  const gone = removeAnnotation(id);
  anns = anns.filter((a) => a.id !== id);
  renderMarks();
  if (gone)
    toast("Highlight removed", {
      action: {
        label: "Undo",
        run: () => {
          anns = [...anns, gone].sort((x, y) => x.start - y.start);
          save(gone);
          renderMarks();
        },
      },
    });
}

// ---- reading progress and contents ----

let lastSaved = -1;
let raf = 0;

function onScroll(): void {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    progress();
  });
}

function progress(): void {
  const pg = page();
  const art = $("article", pg ?? document);
  if (!pg || !art) return;
  const r = art.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (innerHeight - r.top) / Math.max(1, r.height)));
  const left = minutesLeft(Number(pg.dataset["proseWords"]), Number(pg.dataset["codeWords"]), pct);
  const p = Math.round(pct * 100);
  const pctEl = $("[data-pct]");
  if (pctEl) pctEl.textContent = `${p}% read`;
  const leftEl = $("[data-left]");
  if (leftEl) leftEl.textContent = left ? `${left} min left` : "Done";
  const bar = $("[data-progress]");
  bar?.setAttribute("aria-valuenow", String(p));
  for (const b of $$(".notes-page .bar > span")) b.style.width = `${p}%`;
  const mob = $("[data-mob-prog]");
  if (mob) mob.textContent = `${p}% read, ${left} min left`;
  // Contents: the section under the reading line is current, earlier ones done.
  const hs = $$("[data-prose] h2");
  let cur = -1;
  hs.forEach((h, i) => {
    if (h.getBoundingClientRect().top < 140) cur = i;
  });
  $$("[data-toc] a").forEach((a, i) => {
    const idx = i - 1;
    a.classList.toggle("done", idx < cur);
    if (idx === cur) a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  });
  // Reaching the summary after enough time counts as read.
  const minutes = Number(pg.dataset["minutes"]);
  const summary = hs.find((h) => /summary/i.test(h.id)) ?? hs.at(-1);
  const reached = summary ? summary.getBoundingClientRect().top < innerHeight : pct > 0.95;
  const spent = (Date.now() - openedAt) / 60_000;
  if (reached && spent >= minutes * 0.4 && !readState(path())?.read) {
    markProgress(path(), pct, true);
    setReadButton(true);
  } else if (Math.abs(p - lastSaved) >= 2) {
    lastSaved = p;
    markProgress(path(), pct);
  }
}

function setReadButton(read: boolean): void {
  const b = $("[data-mark-read]");
  if (!b) return;
  b.setAttribute("aria-pressed", String(read));
  render(b, read ? html`${icon("circle-check")}<span>Read</span>` : html`${icon("check")}<span>Mark as read</span>`);
}

function toggleRead(): void {
  const st = readState(path());
  const read = !st?.read;
  markProgress(path(), st?.pct ?? 0, read);
  setReadButton(read);
}

// ---- practice panel ----

async function renderPractice(): Promise<void> {
  const list = $("[data-practice]");
  const data = JSON.parse($("[data-practice-data]")?.textContent ?? "null") as Practice | null;
  if (!list || !data?.ids.length) return;
  let states: Record<string, State> = {};
  const [cat, events] = await Promise.all([loadCatalog(), readEvents().catch(() => "")]);
  try {
    if (events.trim()) states = (await loadTrainer()).states(events);
  } catch {
    // Rows still render, without ladders.
  }
  const now = Date.now();
  const rank = (id: string) => (data.examples.includes(id) ? 0 : isDue(states[id], now) ? 1 : pstatus(states[id]) === "unseen" ? 3 : 2);
  const pick = [...data.ids].sort((a, b) => rank(a) - rank(b) || data.ids.indexOf(a) - data.ids.indexOf(b)).slice(0, 3);
  render(
    list,
    html`${pick.map((id) => {
      const p = cat.byId.get(id);
      const st = states[id];
      const t = statusTag(st, now);
      const why = data.examples.includes(id) ? "Worked example in this note" : `${data.technique} practice`;
      return queueRow({
        href: problemHref(id),
        title: p?.title ?? id,
        ...(t ? { tag: tag(t[0], t[1]) } : {}),
        sub: t ? why : `Not started. ${why}`,
        ladder: { rung: st ? displayRung(st.rung) : 0, due: t?.[0] === "due" },
        ...(p ? { difficulty: p.difficulty } : {}),
        mins: `${Math.round((p?.time_target_secs ?? 1500) / 60)}m`,
      });
    })}`,
  );
  const tl = tally(data.ids, states, now);
  const meta = $("[data-practice-meta]");
  if (meta) meta.textContent = `${tl.mastered} mastered, ${tl.climbing} climbing of ${tl.total}`;
}

// ---- Try it ----

function openTry(block: HTMLElement): void {
  const d = $<HTMLDialogElement>("[data-try-dlg]");
  const ta = $<HTMLTextAreaElement>("[data-try-code]");
  if (!d || !ta) return;
  ta.value = $("pre", block)?.textContent ?? "";
  render($("[data-try-out]"), html``);
  openDialog(d);
  ta.focus();
}

const TRY_TEST = "import importlib\n\n\ndef test_runs_as_written():\n    import solution\n\n    importlib.reload(solution)\n";

async function runTry(): Promise<void> {
  const out = $("[data-try-out]");
  const btn = $<HTMLButtonElement>("[data-try-run]");
  const code = $<HTMLTextAreaElement>("[data-try-code]")?.value ?? "";
  if (!out || !btn) return;
  btn.setAttribute("aria-busy", "true");
  render(out, html`<span>Preparing Python. The first run downloads about 10 MB, then it's cached</span>`);
  try {
    const { getRunner } = await import("../lib/runner");
    const r = await getRunner().run({ test: TRY_TEST, code });
    const t = r.tests[0];
    if (r.timedOut) render(out, html`<span class="bad">Stopped after 10 seconds</span> An infinite loop is the usual cause`);
    else if (t?.outcome === "passed") render(out, html`<span class="ok">Every assert passed</span> ${Math.round(r.durationMs)} ms`);
    else render(out, html`<span class="bad">${t ? (t.message || "An assert failed") : (r.error ?? "It didn't run")}</span><pre>${t?.detail || r.output}</pre>`);
  } catch {
    render(out, html`<span class="bad">Python didn't load</span> Check your connection and try again`);
  } finally {
    btn.removeAttribute("aria-busy");
  }
}

// ---- wiring ----

function load(): void {
  if (!page()) return;
  openedAt = Date.now();
  composing = null;
  pending = null;
  failed = new Set();
  lastSaved = -1;
  anns = annotationsFor(path());
  renderMarks();
  setReadButton(!!readState(path())?.read);
  progress();
  void renderPractice();
}

document.addEventListener("astro:page-load", load);
window.addEventListener("scroll", () => page() && onScroll(), { passive: true });
window.addEventListener("resize", () => page() && renderMargin());
window.addEventListener("myleet:notes", () => {
  if (page() && !composing) anns = annotationsFor(path());
});

let selTimer: ReturnType<typeof setTimeout> | undefined;
document.addEventListener("selectionchange", () => {
  if (!page()) return;
  clearTimeout(selTimer);
  selTimer = setTimeout(onSelection, 180);
});

document.addEventListener("click", (e) => {
  if (!page()) return;
  const t = e.target as Element;
  const act = t.closest<HTMLElement>("[data-pop] [data-act]")?.dataset["act"];
  const mark = t.closest<HTMLElement>("mark.hl");
  const card = t.closest<HTMLElement>("[data-mnote], .mnote-inline, .notes-compose");
  const cardId = t.closest<HTMLElement>("[data-mnote]")?.dataset["mnote"];
  if (act === "highlight") highlight(false);
  else if (act === "note") highlight(true);
  else if (act === "link") copyLink();
  else if (act === "add-note" || act === "edit-note") {
    const id = $("[data-pop]")?.dataset["for"] ?? "";
    const a = anns.find((x) => x.id === id);
    hidePop();
    if (a) {
      composing = { id, draft: a.text };
      renderMarks();
    }
  } else if (act === "remove") {
    hidePop();
    remove($("[data-pop]")?.dataset["for"] ?? "");
  } else if (t.closest("[data-chip]")) {
    const chip = t.closest<HTMLElement>("[data-chip]");
    const a = anns.find((x) => x.id === chip?.dataset["chip"]);
    if (!chip || !a) return;
    const open = chip.getAttribute("aria-expanded") === "true";
    chip.setAttribute("aria-expanded", String(!open));
    if (open) chip.nextElementSibling?.matches(".inline-body") && chip.nextElementSibling.remove();
    else {
      const body = document.createElement("span");
      body.className = "inline-body";
      body.dataset["ui"] = "";
      body.textContent = a.text;
      chip.after(body);
    }
  } else if (mark && getSelection()?.isCollapsed !== false) {
    const id = mark.dataset["hl"] ?? "";
    const a = anns.find((x) => x.id === id);
    focusAnnotation(id);
    const pop = $("[data-pop]");
    if (pop) pop.dataset["for"] = id;
    showPop(
      mark.getBoundingClientRect(),
      html`<button type="button" data-act="${a?.text ? "edit-note" : "add-note"}">${icon("plus")}${a?.text ? "Edit note" : "Add note"}</button><button type="button" data-act="remove">${icon("trash")}Remove highlight</button>`,
    );
  } else if (t.closest("[data-save]")) saveComposer();
  else if (t.closest("[data-cancel]")) {
    const id = composing?.id;
    const a = anns.find((x) => x.id === id);
    composing = null;
    // A highlight made only to hold a note that was never written keeps the highlight.
    renderMarks();
    if (a) focusAnnotation(a.id);
  } else if (t.closest("[data-edit]") && cardId) {
    composing = { id: cardId, draft: anns.find((x) => x.id === cardId)?.text ?? "" };
    renderMargin();
  } else if (t.closest("[data-remove]") && cardId) remove(cardId);
  else if (t.closest("[data-retry-save]") && cardId) {
    const a = anns.find((x) => x.id === cardId);
    if (a) save(a);
    renderMargin();
  } else if (card && cardId) focusAnnotation(cardId);
  else if (t.closest("[data-goto]")) {
    e.preventDefault();
    const d = $<HTMLDetailsElement>("[data-mob-toc]");
    if (d) d.open = false;
    focusAnnotation(t.closest<HTMLElement>("[data-goto]")?.dataset["goto"] ?? "");
  } else if (t.closest("[data-tab]")) {
    const which = t.closest<HTMLElement>("[data-tab]")?.dataset["tab"];
    for (const b of $$("[data-tab]")) b.setAttribute("aria-selected", String(b.dataset["tab"] === which));
    $("[data-toc]")?.toggleAttribute("hidden", which !== "toc");
    $("[data-mine]")?.toggleAttribute("hidden", which !== "mine");
  } else if (t.closest("[data-mark-read]")) toggleRead();
  else if (t.closest("[data-copy]")) {
    const b = t.closest<HTMLElement>("[data-copy]");
    const code = b?.closest(".codeblock")?.querySelector("pre")?.textContent ?? "";
    void navigator.clipboard?.writeText(code).then(() => {
      if (!b) return;
      b.textContent = "Copied";
      setTimeout(() => (b.textContent = "Copy"), 1500);
    });
  } else if (t.closest("[data-try]")) openTry(t.closest<HTMLElement>(".codeblock") as HTMLElement);
  else if (t.closest("[data-try-run]")) void runTry();
  else if (t.closest("[data-try-close]")) closeDialog($<HTMLDialogElement>("[data-try-dlg]"));
  else if (!t.closest("[data-pop]")) {
    for (const el of $$(".is-on")) el.classList.remove("is-on");
    if (getSelection()?.isCollapsed !== false) hidePop();
  }
});

function jumpSection(d: 1 | -1): void {
  const hs = [$("#top"), ...$$("[data-prose] h2")].filter((h): h is HTMLElement => !!h);
  const cur = hs.findLastIndex((h) => h.getBoundingClientRect().top < 141);
  const next = hs[Math.max(0, Math.min(hs.length - 1, cur + d))];
  next?.scrollIntoView({ block: "start" });
}

document.addEventListener("keydown", (e) => {
  if (!page()) return;
  const a = document.activeElement as HTMLElement | null;
  if (a?.matches("[data-compose]")) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveComposer();
    } else if (e.key === "Escape") {
      e.preventDefault();
      composing = null;
      renderMarks();
    }
    return;
  }
  if (e.key === "Escape" && !$("[data-pop]")?.hidden) {
    hidePop();
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || document.querySelector("dialog[open]")) return;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
  const go = (sel: string) => {
    const href = $<HTMLAnchorElement>(sel)?.href;
    if (href) location.assign(href);
  };
  const keys: Record<string, () => void> = {
    "[": () => jumpSection(-1),
    "]": () => jumpSection(1),
    ",": () => go("[data-prev]"),
    ".": () => go("[data-next]"),
    h: () => pending && highlight(false),
    n: () => pending && highlight(true),
    m: toggleRead,
    t: () => {
      const d = $<HTMLDetailsElement>("[data-mob-toc]");
      if (d) d.open = !d.open;
    },
    p: () => $("#practice")?.scrollIntoView({ block: "start" }),
  };
  const fn = keys[e.key];
  if (!fn) return;
  e.preventDefault();
  fn();
});
