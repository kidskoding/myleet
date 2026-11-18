// The availability editor: one component, three homes (the Plan side panel, onboarding's
// "When can you practice?" and Settings). It always writes the same settings record
// (prefs.plan), so every home stays in sync and the plan re-runs on each change.
import { readPrefs, updatePrefs } from "../prefs";
import {
  cellKey,
  cellsFromWindows,
  clock,
  DAY_LONG,
  DAY_SHORT,
  fmtM,
  isoDay,
  PAINT_FROM,
  PAINT_ROWS,
  presetOn,
  PRESETS,
  SESSION_LENGTHS,
  windowsByDay,
  windowsFromCells,
  weeklyMinutes,
} from "../schedule";
import type { Habits } from "../types";
import { html, render, type SafeHtml } from "./html";
import { icon } from "./icons";
import { richText } from "./personal";

export type AvailabilitySection = "suggest" | "presets" | "paint" | "session" | "daysoff";

export interface AvailabilityOpts {
  /** History dots and the suggestion (trainer.habits().history). */
  history?: Habits["history"] | null;
  sections?: AvailabilitySection[];
  /** Headings inside the editor (the panel has them; onboarding lays out its own). */
  headings?: boolean;
  /** Prefix for ids, so two editors can share a page. */
  id?: string;
}

export interface AvailabilityEditor {
  refresh(history?: Habits["history"] | null): void;
  destroy(): void;
}

const ALL: AvailabilitySection[] = ["suggest", "presets", "paint", "session", "daysoff"];

/** Consecutive dates as ranges: ["2026-11-26", "2026-11-27"] -> [["2026-11-26", "2026-11-27"]]. */
export function dayRanges(days: string[]): [string, string][] {
  const out: [string, string][] = [];
  for (const d of [...days].sort()) {
    const last = out.at(-1);
    const next = last ? new Date(`${last[1]}T12:00:00`) : null;
    next?.setDate(next.getDate() + 1);
    if (last && next && isoDay(next) === d) last[1] = d;
    else out.push([d, d]);
  }
  return out;
}

const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function datesBetween(a: string, b: string): string[] {
  const out: string[] = [];
  const d = new Date(`${a}T12:00:00`);
  const end = new Date(`${b}T12:00:00`);
  for (let i = 0; d <= end && i < 366; i++) {
    out.push(isoDay(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function mountAvailability(el: HTMLElement, opts: AvailabilityOpts = {}): AvailabilityEditor {
  const id = opts.id ?? "av";
  const sections = opts.sections ?? ALL;
  let history = opts.history ?? null;
  let on = cellsFromWindows(readPrefs().plan.availability);
  let cursor = { d: 0, r: 28 };
  let anchor: { d: number; r: number } | null = null;
  let addingOff = false;

  const hist = () => new Set((history?.cells ?? []).map(([d, s]) => cellKey(d, s - PAINT_FROM / 30)));

  const save = () => updatePrefs({ plan: { availability: windowsFromCells(on) } });

  function paintGrid(): SafeHtml {
    const h = hist();
    const rows: SafeHtml[] = [];
    for (let r = 0; r < PAINT_ROWS; r++) {
      const m = PAINT_FROM + r * 30;
      rows.push(html`<div role="row" class="prow"><span class="pr" role="rowheader">${r % 4 === 0 ? clock(m) : ""}</span>${DAY_SHORT.map((_, d) => {
        const k = cellKey(d, r);
        const lit = on.has(k);
        const isCursor = cursor.d === d && cursor.r === r;
        return html`<span role="gridcell" class="cell${r % 2 === 0 ? " hr" : ""}${lit ? " on" : ""}${h.has(k) ? " hist" : ""}" data-k="${k}" aria-selected="${lit ? "true" : "false"}" aria-label="${DAY_LONG[d]} ${clock(m)}${h.has(k) ? ", you practised here" : ""}" tabindex="${isCursor ? "0" : "-1"}"></span>`;
      })}</div>`);
    }
    return html`<div class="paint" role="grid" aria-label="Practice windows, half-hour cells, Monday to Sunday" aria-describedby="${id}-paint-help">
      <div role="row" class="prow"><span></span>${DAY_SHORT.map((d) => html`<span class="ph" role="columnheader">${d}</span>`)}</div>
      ${rows}
    </div>`;
  }

  function listAndFits(): SafeHtml {
    const ws = windowsFromCells(on);
    const byDay = windowsByDay(ws);
    const total = weeklyMinutes(ws);
    const len = readPrefs().plan.sessionMinutes;
    const n = Math.floor(total / (len + 10));
    return html`<ul class="winlist" aria-label="Windows as a list">${DAY_SHORT.map((d, i) => html`<li><b>${d}</b><span>${byDay[i] || "No windows"}</span></li>`)}</ul>
      <p class="fits" data-fits>${total ? html`${fmtM(total)} a week <span>fits about ${n} ${n === 1 ? "session" : "sessions"} at ${fmtM(len)} each</span>` : html`No windows yet. <span>Without any, the plan uses the hour you usually practice</span>`}</p>`;
  }

  function daysOff(): SafeHtml {
    const today = isoDay(new Date());
    const ranges = dayRanges(readPrefs().plan.daysOff.filter((d) => d >= today));
    return html`<ul class="offlist">${ranges.map(
      ([a, b]) =>
        html`<li><span>${a === b ? fmtDay(a) : a.slice(0, 7) === b.slice(0, 7) ? `${fmtDay(a)} to ${Number(b.slice(8))}` : `${fmtDay(a)} to ${fmtDay(b)}`}</span><button type="button" class="btn btn-ghost btn-sm" data-off-remove="${a}|${b}">Remove</button></li>`,
    )}</ul>
    ${addingOff
      ? html`<div class="off-add"><label class="field"><span>From</span><input class="input" type="date" min="${today}" data-off-from /></label><label class="field"><span>To</span><input class="input" type="date" min="${today}" data-off-to /></label><button type="button" class="btn btn-secondary btn-sm" data-off-save>Add</button><button type="button" class="btn btn-ghost btn-sm" data-off-cancel>Cancel</button></div>`
      : html`<button type="button" class="btn btn-secondary btn-sm" data-off-add>${icon("plus")}Add days off</button>`}`;
  }

  function draw(): void {
    const p = readPrefs().plan;
    const head = (t: string) => (opts.headings === false ? "" : html`<h3>${t}</h3>`);
    const sug = history?.suggestion;
    render(
      el,
      html`${sections.includes("suggest") && sug
        ? html`<div class="suggest">${icon("history")}<span>${richText(sug.text)} The dots below show when</span><button type="button" class="btn btn-secondary btn-sm" data-suggest>Use these times</button></div>`
        : ""}
      ${sections.includes("presets")
        ? html`<div class="av-sec">${head("Quick patterns")}<div class="presets" role="group" aria-label="Quick patterns">${PRESETS.map(
            (pr) => html`<button type="button" class="chipbtn" data-preset="${pr.id}" aria-pressed="${presetOn(on, pr.windows) ? "true" : "false"}">${pr.label}</button>`,
          )}</div></div>`
        : ""}
      ${sections.includes("paint")
        ? html`<div class="av-sec">${head("Your week")}<p class="help" id="${id}-paint-help">Drag across the hours you're free, even across several days. Starting on a lit cell erases instead. On a phone, press and hold to start. With the keyboard, arrows move, Space toggles and Shift with arrows paints a block</p>
          <div data-paint-host>${paintGrid()}</div>
          <div class="paint-key"><span><i></i>Your windows</span>${history?.cells.length ? html`<span><i class="h"></i>You practiced here in the last 4 weeks</span>` : ""}</div>
          <div data-list-host>${listAndFits()}</div></div>`
        : ""}
      ${sections.includes("session")
        ? html`<div class="av-sec">${head("Each session")}<div class="seg" role="group" aria-label="Session length">${SESSION_LENGTHS.map(
            (m) => html`<button type="button" data-session="${m}" aria-pressed="${p.sessionMinutes === m ? "true" : "false"}">${fmtM(m)}</button>`,
          )}</div><p class="help" style="margin-top:var(--space-2)">The longest single sitting. Longer days split into two</p></div>`
        : ""}
      ${sections.includes("daysoff") ? html`<div class="av-sec">${head("Days off")}${opts.headings === false ? "" : html`<p class="help">Nothing is planned on these days, and nothing piles up after them</p>`}<div data-off-host>${daysOff()}</div></div>` : ""}`,
    );
  }

  /** Repaints cells and the list without rebuilding the grid (keeps pointer capture and focus). */
  function sync(): void {
    for (const c of el.querySelectorAll<HTMLElement>(".paint .cell")) {
      const lit = on.has(c.dataset.k ?? "");
      c.classList.toggle("on", lit);
      c.setAttribute("aria-selected", lit ? "true" : "false");
    }
    for (const b of el.querySelectorAll<HTMLElement>("[data-preset]")) {
      const pr = PRESETS.find((x) => x.id === b.dataset.preset);
      if (pr) b.setAttribute("aria-pressed", presetOn(on, pr.windows) ? "true" : "false");
    }
    syncSide();
  }

  /** The presets' pressed state and the windows list, which follow the cells. */
  function syncSide(): void {
    for (const b of el.querySelectorAll<HTMLElement>("[data-preset]")) {
      const pr = PRESETS.find((x) => x.id === b.dataset.preset);
      if (pr) b.setAttribute("aria-pressed", presetOn(on, pr.windows) ? "true" : "false");
    }
    const list = el.querySelector("[data-list-host]");
    if (list) render(list, listAndFits());
  }

  const keyOf = (c: HTMLElement) => (c.dataset.k ?? "0:0").split(":").map(Number) as [number, number];
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";

  function setCell(k: string, lit: boolean): boolean {
    if (on.has(k) === lit) return false;
    if (lit) on.add(k);
    else on.delete(k);
    return true;
  }

  // Pointer, touch (after a short press) and Shift+arrows all paint through this.

  type Cell = { d: number; r: number };
  interface Drag {
    pointer: number;
    anchor: Cell;
    at: Cell;
    add: boolean;
    grid: HTMLElement;
    sel: HTMLElement;
    /** Column and row edges relative to the grid, measured once at the start. */
    cols: [number, number][];
    rows: [number, number][];
    scroller: HTMLElement | null;
    x: number;
    y: number;
    frame: number;
  }
  let drag: Drag | null = null;
  let press: { timer: ReturnType<typeof setTimeout>; x: number; y: number; e: PointerEvent } | null = null;
  /** The cells as they were before a keyboard range began, so shrinking the range restores them. */
  let kbBase: Set<string> | null = null;

  const EDGE = 36;
  const PRESS_MS = 220;
  const SLOP = 8;

  function rectCells(a: Cell, b: Cell): string[] {
    const out: string[] = [];
    for (let d = Math.min(a.d, b.d); d <= Math.max(a.d, b.d); d++) for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) out.push(cellKey(d, r));
    return out;
  }

  function scrollParent(n: HTMLElement): HTMLElement | null {
    for (let p = n.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowY;
      if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
    }
    return null;
  }

  function measure(grid: HTMLElement): { cols: [number, number][]; rows: [number, number][] } {
    const g = grid.getBoundingClientRect();
    const box = (d: number, r: number) => grid.querySelector<HTMLElement>(`.cell[data-k="${cellKey(d, r)}"]`)?.getBoundingClientRect();
    const cols = DAY_SHORT.map((_, d) => {
      const b = box(d, 0);
      return [(b?.left ?? 0) - g.left, (b?.right ?? 0) - g.left] as [number, number];
    });
    const rows = Array.from({ length: PAINT_ROWS }, (_, r) => {
      const b = box(0, r);
      return [(b?.top ?? 0) - g.top, (b?.bottom ?? 0) - g.top] as [number, number];
    });
    return { cols, rows };
  }

  /** The nearest cell to a point, clamped to the grid, from the measured edges (no elementFromPoint). */
  function cellAt(dr: Drag, x: number, y: number): Cell {
    const g = dr.grid.getBoundingClientRect();
    const nearest = (edges: [number, number][], v: number) => {
      let best = 0;
      for (let i = 0; i < edges.length; i++) if (v >= (edges[i]?.[0] ?? 0)) best = i;
      return best;
    };
    return { d: nearest(dr.cols, x - g.left), r: nearest(dr.rows, y - g.top) };
  }

  function placeSel(dr: Drag): void {
    const [c0, c1] = [Math.min(dr.anchor.d, dr.at.d), Math.max(dr.anchor.d, dr.at.d)];
    const [r0, r1] = [Math.min(dr.anchor.r, dr.at.r), Math.max(dr.anchor.r, dr.at.r)];
    const left = dr.cols[c0]?.[0] ?? 0;
    const top = dr.rows[r0]?.[0] ?? 0;
    dr.sel.style.transform = `translate(${left}px, ${top}px)`;
    dr.sel.style.width = `${(dr.cols[c1]?.[1] ?? 0) - left}px`;
    dr.sel.style.height = `${(dr.rows[r1]?.[1] ?? 0) - top}px`;
    dr.sel.dataset.label = `${dr.add ? "Add" : "Remove"} ${fmtM((r1 - r0 + 1) * 30)}${c1 > c0 ? ` × ${c1 - c0 + 1} days` : ""}`;
  }

  function startDrag(e: PointerEvent, c: HTMLElement): void {
    const grid = c.closest<HTMLElement>(".paint");
    if (!grid) return;
    const [d, r] = keyOf(c);
    const sel = document.createElement("div");
    sel.className = `paint-sel ${on.has(c.dataset.k ?? "") ? "rm" : "add"}`;
    sel.setAttribute("aria-hidden", "true");
    grid.append(sel);
    const { cols, rows } = measure(grid);
    drag = { pointer: e.pointerId, anchor: { d, r }, at: { d, r }, add: !on.has(c.dataset.k ?? ""), grid, sel, cols, rows, scroller: scrollParent(grid), x: e.clientX, y: e.clientY, frame: 0 };
    cursor = { d, r };
    try {
      grid.setPointerCapture(e.pointerId);
    } catch {
      // Already released (a very short tap); the drag still ends on pointerup.
    }
    placeSel(drag);
  }

  /** One frame of a drag: auto-scroll near the scroller's edges, then snap the rectangle. */
  function frame(): void {
    const dr = drag;
    if (!dr) return;
    dr.frame = 0;
    let scrolling = false;
    if (dr.scroller) {
      const b = dr.scroller.getBoundingClientRect();
      const v = dr.y < b.top + EDGE ? -(b.top + EDGE - dr.y) : dr.y > b.bottom - EDGE ? dr.y - (b.bottom - EDGE) : 0;
      if (v) {
        const before = dr.scroller.scrollTop;
        dr.scroller.scrollTop += Math.sign(v) * Math.min(18, 4 + Math.abs(v) / 2);
        scrolling = dr.scroller.scrollTop !== before;
      }
    }
    const at = cellAt(dr, dr.x, dr.y);
    if (at.d !== dr.at.d || at.r !== dr.at.r) {
      dr.at = at;
      placeSel(dr);
    }
    if (scrolling) dr.frame = requestAnimationFrame(frame);
  }

  function endDrag(commit: boolean): void {
    const dr = drag;
    if (!dr) return;
    drag = null;
    cancelAnimationFrame(dr.frame);
    try {
      dr.grid.releasePointerCapture(dr.pointer);
    } catch {
      // Not captured.
    }
    if (!commit) return dr.sel.remove();
    const changed = rectCells(dr.anchor, dr.at).filter((k) => setCell(k, dr.add));
    cursor = { ...dr.at };
    // Keyboard painting carries on from where the pointer stopped.
    focusCursor(false);
    settle(changed);
    if (reduced()) dr.sel.remove();
    else {
      dr.sel.classList.add("done");
      setTimeout(() => dr.sel.remove(), 180);
    }
    if (changed.length) save();
  }

  /** Repaints only the changed cells, with a short settle so the result reads as placed. */
  function settle(keys: string[]): void {
    const motion = !reduced();
    for (const k of keys) {
      const c = el.querySelector<HTMLElement>(`.paint .cell[data-k="${k}"]`);
      if (!c) continue;
      const lit = on.has(k);
      c.classList.toggle("on", lit);
      c.setAttribute("aria-selected", lit ? "true" : "false");
      if (motion) {
        c.classList.remove("settle");
        void c.offsetWidth;
        c.classList.add("settle");
      }
    }
    syncSide();
  }

  function onPointerDown(e: PointerEvent): void {
    const c = (e.target as Element).closest<HTMLElement>(".paint .cell");
    if (!c || e.button !== 0) return;
    if (e.pointerType === "touch") {
      // A short press starts painting; moving first is a scroll.
      if (press) clearTimeout(press.timer);
      press = { x: e.clientX, y: e.clientY, e, timer: setTimeout(() => {
        const p = press;
        press = null;
        if (p) {
          startDrag(p.e, c);
          navigator.vibrate?.(8);
        }
      }, PRESS_MS) };
      return;
    }
    e.preventDefault();
    startDrag(e, c);
  }
  function onPointerMove(e: PointerEvent): void {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP) {
      clearTimeout(press.timer);
      press = null;
    }
    if (!drag || e.pointerId !== drag.pointer) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (!drag.frame) drag.frame = requestAnimationFrame(frame);
  }
  function onPointerUp(e: PointerEvent): void {
    if (press) {
      clearTimeout(press.timer);
      press = null;
      // A plain tap toggles one cell.
      const c = (e.target as Element).closest<HTMLElement>(".paint .cell");
      if (c && e.type === "pointerup") {
        setCell(c.dataset.k ?? "", !on.has(c.dataset.k ?? ""));
        settle([c.dataset.k ?? ""]);
        save();
      }
      return;
    }
    if (drag && e.pointerId === drag.pointer) endDrag(e.type === "pointerup");
  }
  /** Once painting has begun on touch, the page must not scroll under the finger. */
  const onTouchMove = (e: TouchEvent) => {
    if (drag && e.cancelable) e.preventDefault();
  };

  function focusCursor(scroll = true): void {
    for (const c of el.querySelectorAll<HTMLElement>(".paint .cell[tabindex='0']")) c.tabIndex = -1;
    const c = el.querySelector<HTMLElement>(`.paint .cell[data-k="${cellKey(cursor.d, cursor.r)}"]`);
    if (c) {
      c.tabIndex = 0;
      c.focus({ preventScroll: !scroll });
    }
  }

  function onKey(e: KeyboardEvent): void {
    const c = (e.target as Element).closest<HTMLElement>(".paint .cell");
    if (!c) return;
    const [d, r] = keyOf(c);
    cursor = { d, r };
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const mv = moves[e.key];
    if (mv) {
      e.preventDefault();
      if (e.shiftKey && !anchor) {
        anchor = { d, r };
        kbBase = new Set(on);
        // The first Shift+arrow paints from the cell you're on: add if it's empty, remove if it's lit.
        setCell(cellKey(d, r), !on.has(cellKey(d, r)));
      }
      cursor = { d: Math.max(0, Math.min(6, d + mv[0])), r: Math.max(0, Math.min(PAINT_ROWS - 1, r + mv[1])) };
      if (e.shiftKey && anchor && kbBase) {
        const lit = on.has(cellKey(anchor.d, anchor.r));
        const before = new Set(on);
        on = new Set(kbBase);
        for (const k of rectCells(anchor, cursor)) setCell(k, lit);
        settle([...new Set([...before, ...on])].filter((k) => before.has(k) !== on.has(k)));
      }
      focusCursor();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setCell(c.dataset.k ?? "", !on.has(c.dataset.k ?? ""));
      sync();
      save();
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== "Shift" || !anchor) return;
    anchor = null;
    kbBase = null;
    save();
  };

  function onClick(e: MouseEvent): void {
    const t = e.target as Element;
    const preset = t.closest<HTMLElement>("[data-preset]");
    const sessionBtn = t.closest<HTMLElement>("[data-session]");
    const rm = t.closest<HTMLElement>("[data-off-remove]");
    if (preset) {
      const pr = PRESETS.find((x) => x.id === preset.dataset.preset);
      if (!pr) return;
      const lit = !presetOn(on, pr.windows);
      for (const k of cellsFromWindows(pr.windows)) setCell(k, lit);
      sync();
      save();
    } else if (t.closest("[data-suggest]") && history?.suggestion) {
      on = cellsFromWindows(history.suggestion.windows);
      sync();
      save();
    } else if (sessionBtn) {
      updatePrefs({ plan: { sessionMinutes: Number(sessionBtn.dataset.session) } });
      for (const b of el.querySelectorAll<HTMLElement>("[data-session]")) b.setAttribute("aria-pressed", b === sessionBtn ? "true" : "false");
      sync();
    } else if (rm) {
      const [a = "", b = ""] = (rm.dataset.offRemove ?? "").split("|");
      const drop = new Set(datesBetween(a, b));
      updatePrefs({ plan: { daysOff: readPrefs().plan.daysOff.filter((d) => !drop.has(d)) } });
      redrawOff();
    } else if (t.closest("[data-off-add]")) {
      addingOff = true;
      redrawOff();
      el.querySelector<HTMLInputElement>("[data-off-from]")?.focus();
    } else if (t.closest("[data-off-cancel]")) {
      addingOff = false;
      redrawOff();
    } else if (t.closest("[data-off-save]")) {
      const from = el.querySelector<HTMLInputElement>("[data-off-from]")?.value ?? "";
      const to = el.querySelector<HTMLInputElement>("[data-off-to]")?.value || from;
      if (!from) return;
      const [a, b] = from <= to ? [from, to] : [to, from];
      const next = [...new Set([...readPrefs().plan.daysOff, ...datesBetween(a, b)])].sort().slice(-366);
      addingOff = false;
      updatePrefs({ plan: { daysOff: next } });
      redrawOff();
    }
  }

  function redrawOff(): void {
    const host = el.querySelector("[data-off-host]");
    if (host) render(host, daysOff());
  }

  draw();
  el.classList.add("av-editor");
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
  el.addEventListener("keydown", onKey);
  el.addEventListener("keyup", onKeyUp);
  el.addEventListener("click", onClick);
  el.addEventListener("touchmove", onTouchMove, { passive: false });

  return {
    refresh(h) {
      if (h !== undefined) history = h;
      if (drag) return;
      const next = cellsFromWindows(readPrefs().plan.availability);
      // Our own save comes back as a refresh: nothing to redraw, and keep focus where it is.
      if (h === undefined && next.size === on.size && [...next].every((k) => on.has(k))) return;
      const focused = el.contains(document.activeElement);
      on = next;
      draw();
      if (focused) focusCursor(false);
    },
    destroy() {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("click", onClick);
      el.removeEventListener("touchmove", onTouchMove);
      if (press) clearTimeout(press.timer);
      endDrag(false);
    },
  };
}
