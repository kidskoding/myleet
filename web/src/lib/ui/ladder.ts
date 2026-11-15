import { esc, raw, type SafeHtml } from "./html";

/** Review rungs in days, left to right. */
export const RUNG_DAYS = [1, 3, 7, 14, 30] as const;

/** Rung 4 (14 days) and up counts as mastered, matching the core's status. */
export const MASTERED_RUNG = 4;

/** Core `State.rung` is -1 (never finished) to 4; the ladder shows 0 (not started) to 5. */
export const displayRung = (coreRung: number): number => Math.max(0, Math.min(5, coreRung + 1));

export interface LadderOpts {
  /** 0 = not started, 1 = on the 1-day rung … 5 = 30 days. */
  rung: number;
  size?: "sm" | "lg" | "xl";
  /** The current rung's review is due: amber ring. */
  due?: boolean;
  /** The rung it fell from (dashed drop and ghost ring). */
  fell?: number;
  /** Overrides the generated accessible label. */
  label?: string;
  /** xl only: draw the next rung dashed in the accent (what a clean pass earns). Default true. */
  next?: boolean;
  /** xl only: the route was just climbed by a clean pass, so it draws green to the new rung. */
  climbed?: boolean;
  /** xl only: the route draws in once and the halo blooms (the one authored moment on a screen). */
  draw?: boolean;
  /** xl only: viewBox size; the SVG scales to its container width. */
  w?: number;
  h?: number;
}

export function ladderLabel(rung: number, due = false): string {
  if (rung <= 0) return "Not started";
  const base = rung >= MASTERED_RUNG ? `Mastered, on level ${rung} of 5` : `On level ${rung} of 5`;
  return due ? `${base}, review due` : base;
}

/** The ladder topo (signature). Same geometry as the design reference renderer. */
export function ladder(o: LadderOpts): SafeHtml {
  if (o.size === "xl") return ladderXl(o);
  const lg = o.size === "lg";
  const rung = Math.max(0, Math.min(5, Math.round(o.rung)));
  const fell = o.fell ?? 0;
  const W = lg ? 260 : 72;
  const H = lg ? 64 : 20;
  const pad = lg ? 10 : 4;
  const lift = lg ? 14 : 0;
  const x = (i: number) => +(pad + (i * (W - 2 * pad)) / 4).toFixed(2);
  const y = (i: number) => +(H - pad - (i * (H - 2 * pad - lift)) / 4 - lift).toFixed(2);
  const r = lg ? 6 : 3.6;
  const pts = (n: number) => RUNG_DAYS.slice(0, n).map((_, i) => `${x(i)},${y(i)}`).join(" ");
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
  s += `<polyline class="track" points="${pts(5)}"/>`;
  if (rung > 1) s += `<polyline class="route" points="${pts(rung)}"/>`;
  if (fell > 0)
    s += `<path class="fall" d="M${x(fell - 1)},${y(fell - 1)} L${x(fell - 1)},${y(0)} L${x(0)},${y(0)}"/><circle class="ghost" cx="${x(fell - 1)}" cy="${y(fell - 1)}" r="${r}"/>`;
  RUNG_DAYS.forEach((d, i) => {
    const cls = i < rung - 1 ? "done" : i === rung - 1 ? `current${o.due ? " due" : ""}` : "";
    s += `<circle class="node ${cls}" cx="${x(i)}" cy="${y(i)}" r="${r}"/>`;
    if (lg) s += `<text class="lbl${i === rung - 1 ? " on" : ""}" x="${x(i)}" y="${H - 1}" text-anchor="middle">${d}d</text>`;
  });
  s += "</svg>";
  const cls = `ladder${lg ? " ladder-lg" : ""}${rung >= MASTERED_RUNG ? " mastered" : ""}`;
  const label = o.label ?? ladderLabel(rung, o.due);
  return raw(`<span class="${cls}" role="img" aria-label="${esc(label)}">${s}</span>`);
}

let xlId = 0;

/** The expressive ladder: rung guides with day labels, a gradient route over a faint area, a halo on the current rung. */
function ladderXl(o: LadderOpts): SafeHtml {
  const rung = Math.max(0, Math.min(5, Math.round(o.rung)));
  const { w = 320, h = 132, next = true, climbed = false, draw = false } = o;
  const id = ++xlId;
  const [padL, padR, padT, padB] = [10, 40, 12, 12];
  const x = (i: number) => +(padL + (i * (w - padL - padR)) / 4).toFixed(2);
  const y = (i: number) => +(h - padB - (i * (h - padT - padB)) / 4).toFixed(2);
  const done = RUNG_DAYS.slice(0, rung).map((_, i) => [x(i), y(i)] as const);
  let len = 0;
  for (let i = 1; i < done.length; i++) len += Math.hypot(done[i]![0] - done[i - 1]![0], done[i]![1] - done[i - 1]![1]);
  const line = (pts: readonly (readonly [number, number])[]) => pts.map((p) => p.join(",")).join(" ");
  let s = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs>`;
  s += `<linearGradient id="lx-r${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="stop-a"/><stop offset="1" class="stop-b"/></linearGradient>`;
  s += `<linearGradient id="lx-a${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="area-a"/><stop offset="1" class="area-b"/></linearGradient></defs>`;
  RUNG_DAYS.forEach((d, i) => {
    s += `<line class="guide" x1="${x(i)}" x2="${w - padR + 8}" y1="${y(i)}" y2="${y(i)}"/><text class="guide-lbl${i === rung - 1 ? " on" : ""}" x="${w - padR + 14}" y="${y(i) + 4}">${d}d</text>`;
  });
  const last = done.at(-1);
  if (rung > 1 && last) s += `<path class="area" style="fill:url(#lx-a${id})" d="M${done.map((p) => p.join(",")).join(" L")} L${last[0]},${h - padB} L${x(0)},${h - padB} Z"/>`;
  s += `<polyline class="track" points="${line(RUNG_DAYS.map((_, i) => [x(i), y(i)] as const))}"/>`;
  if (next && rung > 0 && rung < 5) s += `<line class="next-seg" x1="${x(rung - 1)}" y1="${y(rung - 1)}" x2="${x(rung)}" y2="${y(rung)}"/>`;
  if (rung > 1) s += `<polyline class="route" style="stroke:url(#lx-r${id});--len:${len.toFixed(1)}" points="${line(done)}"/>`;
  RUNG_DAYS.forEach((_, i) => {
    if (i === rung - 1) s += `<circle class="halo${o.due ? " due" : ""}" cx="${x(i)}" cy="${y(i)}" r="13"/>`;
    const cls = i < rung - 1 ? "done" : i === rung - 1 ? `current${o.due ? " due" : ""}` : i === rung && next ? "next" : "";
    s += `<circle class="node ${cls}" cx="${x(i)}" cy="${y(i)}" r="${i === rung - 1 ? 6.5 : 5}"/>`;
  });
  s += "</svg>";
  const cls = `ladder-xl${rung >= MASTERED_RUNG && !climbed ? " mastered" : ""}${climbed ? " climbed" : ""}${draw ? " draw" : ""}`;
  return raw(`<span class="${cls}" role="img" aria-label="${esc(o.label ?? ladderLabel(rung, o.due))}">${s}</span>`);
}
