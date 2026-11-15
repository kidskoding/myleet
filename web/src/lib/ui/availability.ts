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
  let painting: boolean | null = null;
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
        ? html`<div class="av-sec">${head("Your week")}<p class="help" id="${id}-paint-help">Drag to paint windows; drag over a window to erase it. With the keyboard: arrows move, Space toggles, Shift with arrows paints a range</p>
          <div data-paint-host>${paintGrid()}</div>
          <div class="paint-key"><span><i></i>Your windows</span>${history?.cells.length ? html`<span><i class="h"></i>You practised here in the last 4 weeks</span>` : ""}</div>
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
    const list = el.querySelector("[data-list-host]");
    if (list) render(list, listAndFits());
  }

  const cellAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>(".paint .cell");
  const keyOf = (c: HTMLElement) => (c.dataset.k ?? "0:0").split(":").map(Number) as [number, number];

  function setCell(k: string, lit: boolean): boolean {
    if (on.has(k) === lit) return false;
    if (lit) on.add(k);
    else on.delete(k);
    return true;
  }

  function onPointerDown(e: PointerEvent): void {
    const c = (e.target as Element).closest<HTMLElement>(".paint .cell");
    if (!c || e.button !== 0) return;
    e.preventDefault();
    painting = !on.has(c.dataset.k ?? "");
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const [d, r] = keyOf(c);
    cursor = { d, r };
    if (setCell(c.dataset.k ?? "", painting)) sync();
  }
  function onPointerMove(e: PointerEvent): void {
    if (painting === null) return;
    const c = cellAt(e.clientX, e.clientY);
    if (c && setCell(c.dataset.k ?? "", painting)) sync();
  }
  function onPointerUp(): void {
    if (painting === null) return;
    painting = null;
    save();
  }

  function focusCursor(): void {
    for (const c of el.querySelectorAll<HTMLElement>(".paint .cell[tabindex='0']")) c.tabIndex = -1;
    const c = el.querySelector<HTMLElement>(`.paint .cell[data-k="${cellKey(cursor.d, cursor.r)}"]`);
    if (c) {
      c.tabIndex = 0;
      c.focus();
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
      if (e.shiftKey && !anchor) anchor = { d, r };
      cursor = { d: Math.max(0, Math.min(6, d + mv[0])), r: Math.max(0, Math.min(PAINT_ROWS - 1, r + mv[1])) };
      if (e.shiftKey && anchor) {
        const lit = on.has(cellKey(anchor.d, anchor.r));
        if (setCell(cellKey(cursor.d, cursor.r), lit)) {
          sync();
          save();
        }
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
    if (e.key === "Shift") anchor = null;
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

  return {
    refresh(h) {
      if (h !== undefined) history = h;
      if (painting !== null) return;
      on = cellsFromWindows(readPrefs().plan.availability);
      draw();
    },
    destroy() {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("click", onClick);
    },
  };
}
