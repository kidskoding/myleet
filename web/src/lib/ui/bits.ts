// Small shared renderers: tags, difficulty bars, progress bars, queue rows, kbd.
import type { Difficulty } from "../types";
import { html, raw, type SafeHtml } from "./html";
import { ladder, type LadderOpts } from "./ladder";

/** Route-tape tag kinds; each hold colour means one thing. */
export type TagKind = "due" | "new" | "weak" | "progress" | "sharp" | "pass" | "fail" | "outline" | "plain";

export function tag(kind: TagKind, label: string, opts: { dot?: boolean } = {}): SafeHtml {
  const cls = `tag${kind === "plain" ? "" : ` tag-${kind}`}${opts.dot === false ? " no-dot" : ""}`;
  return html`<span class="${cls}">${label}</span>`;
}

const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

/** Three bars, colored by difficulty with the count as a second cue. `label: false` keeps only the bars (with an SR label). */
export function diff(level: Difficulty, opts: { label?: boolean } = {}): SafeHtml {
  const text = DIFF_LABEL[level];
  return opts.label === false
    ? html`<span class="diff" data-level="${level}" role="img" aria-label="${text}"><i><b></b><b></b><b></b></i></span>`
    : html`<span class="diff" data-level="${level}"><i aria-hidden="true"><b></b><b></b><b></b></i>${text}</span>`;
}

export interface BarSegment {
  /** 0-1 share of the track. */
  value: number;
  /** m mastered (green), c climbing (ink), s started (line), or the default accent. */
  kind?: "m" | "c" | "s";
}

export function bar(segments: BarSegment[], label?: string): SafeHtml {
  const spans = segments.map(
    (s) => raw(`<span${s.kind ? ` class="${s.kind}"` : ""} style="width:${(Math.max(0, Math.min(1, s.value)) * 100).toFixed(1)}%"></span>`),
  );
  return label
    ? html`<div class="bar" role="img" aria-label="${label}">${spans}</div>`
    : html`<div class="bar" aria-hidden="true">${spans}</div>`;
}

export const kbd = (...keys: string[]): SafeHtml => html`${keys.map((k) => html`<kbd>${k}</kbd>`)}`;

/** The module chip: its number in its hue (01-14 have one each; 15 and up share a neutral). Index is 0-based. */
export const modChip = (index: number): SafeHtml => {
  const n = String(index + 1).padStart(2, "0");
  return html`<span class="mod-chip" data-hue="${n}" aria-hidden="true">${n}</span>`;
};

export interface QueueRowOpts {
  href: string;
  /** 0-based module index: the row leads with its module chip. */
  mod?: number;
  title: string;
  tag?: SafeHtml;
  sub: string;
  /** The reason line under the sub line (Plan's `.why`), from the planner. */
  why?: string;
  ladder?: LadderOpts;
  difficulty?: Difficulty;
  /** Right column text, e.g. "25m". */
  mins?: string;
  done?: boolean;
  /** Shared-element view transition name (`p-<id>`). */
  vt?: string;
  attrs?: Record<string, string>;
}

/** Fixed furniture in a fixed order: title / tag + sub / ladder / difficulty / minutes. */
export function queueRow(o: QueueRowOpts): SafeHtml {
  const extra = Object.entries(o.attrs ?? {}).map(([k, v]) => html` ${k}="${v}"`);
  return html`<li><a class="qrow${o.done ? " done-row" : ""}${o.mod !== undefined ? " has-mod" : ""}" href="${o.href}"${extra}>
    ${o.mod !== undefined ? modChip(o.mod) : ""}<div class="qmain"><div class="title"${o.vt ? raw(` style="view-transition-name:${o.vt}"`) : ""}>${o.title}</div><div class="sub">${o.tag ?? ""}<span>${o.sub}</span></div>${o.why ? html`<span class="why">${o.why}</span>` : ""}</div>
    <span class="ladder-cell">${o.ladder ? ladder(o.ladder) : ""}</span>${o.difficulty ? diff(o.difficulty, { label: false }) : raw("<span></span>")}<span class="mins">${o.mins ?? ""}</span></a></li>`;
}

/** "25 min", "1 h 40 min". */
export function formatMinutes(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** "6 min 40 s". */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r} s`;
  return `${m} min ${String(r).padStart(2, "0")} s`;
}

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
