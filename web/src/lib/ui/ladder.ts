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
  size?: "sm" | "lg";
  /** The current rung's review is due: amber ring. */
  due?: boolean;
  /** The rung it fell from (dashed drop and ghost ring). */
  fell?: number;
  /** Overrides the generated accessible label. */
  label?: string;
}

export function ladderLabel(rung: number, due = false): string {
  if (rung <= 0) return "Not started";
  const day = RUNG_DAYS[rung - 1];
  const base = rung >= MASTERED_RUNG ? `Mastered, on the ${day}-day rung` : `On the ${day}-day rung of 5`;
  return due ? `${base}, review due` : base;
}

/** The ladder topo (signature). Same geometry as the design reference renderer. */
export function ladder(o: LadderOpts): SafeHtml {
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
