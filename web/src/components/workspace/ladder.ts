// The review ladder (signature component): rungs 1 3 7 14 30 days rising left to right.
// rung 0 = not started, 1..5 = on the 1d..30d rung. A local port of the design's
// reference renderer (screens/_shared/proto.js) until the shared component lands.

export const DAYS = [1, 3, 7, 14, 30];

export interface LadderProps {
  rung: number;
  size?: "sm" | "lg";
  due?: boolean;
  /** The rung fallen from (a hint, peek, overtime or give-up), drawn as a dashed drop. */
  fell?: number;
}

/** Core rung (-1..4) to ladder rung (0..5). */
export const ladderRung = (coreRung: number) => Math.max(0, Math.min(5, coreRung + 1));

export function ladderLabel(rung: number): string {
  if (rung <= 0) return "Not started";
  return rung >= 4 ? `Mastered, on level ${rung} of 5` : `On level ${rung} of 5`;
}

function geometry(lg: boolean) {
  const W = lg ? 260 : 72;
  const H = lg ? 64 : 20;
  const pad = lg ? 10 : 4;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / 4;
  const y = (i: number) => H - pad - (i * (H - 2 * pad - (lg ? 14 : 0))) / 4 - (lg ? 14 : 0);
  return { W, H, x, y, r: lg ? 6 : 3.6 };
}

export function ladderSvg(p: LadderProps): string {
  const lg = p.size === "lg";
  const { W, H, x, y, r } = geometry(lg);
  const rung = p.rung;
  const fell = p.fell ?? 0;
  const pts = (n: number) => DAYS.slice(0, n).map((_, i) => `${x(i)},${y(i)}`).join(" ");
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
  s += `<polyline class="track" points="${pts(5)}"/>`;
  if (rung > 1) s += `<polyline class="route" pathLength="1" points="${pts(rung)}"/>`;
  if (fell > 1) {
    s += `<path class="fall" d="M${x(fell - 1)},${y(fell - 1)} L${x(fell - 1)},${y(0)} L${x(0)},${y(0)}"/>`;
    s += `<circle class="ghost" cx="${x(fell - 1)}" cy="${y(fell - 1)}" r="${r}"/>`;
  }
  DAYS.forEach((_, i) => {
    const cls = i < rung - 1 ? "done" : i === rung - 1 ? `current${p.due ? " due" : ""}` : "";
    s += `<circle class="node ${cls}" cx="${x(i)}" cy="${y(i)}" r="${r}"/>`;
    if (lg) s += `<text class="lbl${i === rung - 1 ? " on" : ""}" x="${x(i)}" y="${H - 1}" text-anchor="middle">L${i + 1}</text>`;
  });
  return `${s}</svg>`;
}

export function renderLadder(el: HTMLElement, p: LadderProps): void {
  el.classList.add("ladder");
  el.classList.toggle("mastered", p.rung >= 4);
  el.innerHTML = ladderSvg(p);
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", ladderLabel(p.rung));
}

/**
 * The one authored motion: the ring travels from the old rung to the new one along the
 * route while the route draws behind it. Under reduced motion the final state just appears.
 */
export function climb(el: HTMLElement, from: number, to: number, p: Omit<LadderProps, "rung">): void {
  renderLadder(el, { ...p, rung: to });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || from <= 0 || to <= from) return;
  const { x, y } = geometry(p.size === "lg");
  const ring = el.querySelector<SVGCircleElement>(".node.current");
  const route = el.querySelector<SVGPolylineElement>(".route");
  if (!ring) return;
  const dx = x(from - 1) - x(to - 1);
  const dy = y(from - 1) - y(to - 1);
  ring.style.transform = `translate(${dx}px, ${dy}px)`;
  ring.style.transition = "none";
  if (route) {
    // Draw only the new segment: start from the share of the route already climbed.
    const shown = (from - 1) / (to - 1);
    route.style.strokeDasharray = "1";
    route.style.strokeDashoffset = String(1 - shown);
    route.style.transition = "none";
  }
  void el.getBoundingClientRect();
  requestAnimationFrame(() => {
    ring.style.transition = "transform var(--dur-climb) var(--ease-spring)";
    ring.style.transform = "translate(0, 0)";
    if (route) {
      route.style.transition = "stroke-dashoffset var(--dur-climb) var(--ease-spring)";
      route.style.strokeDashoffset = "0";
    }
  });
}
