import { addDays, localDay } from "../streak";
import { html, type SafeHtml } from "./html";

/** 0 none, 1 one solve, 2 two, 3 three or four, 4 five or more. */
export const heatLevel = (n: number): number => (n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);

/**
 * Weeks x 7 grid of daily solves, oldest week left, ending with the week holding `today`.
 * Each cell has a tooltip; pair it with a table or a sentence for screen readers.
 */
export function heatmap(counts: Record<string, number>, opts: { weeks?: number; today?: string; label: string }): SafeHtml {
  const weeks = opts.weeks ?? 48;
  const today = opts.today ?? localDay();
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const dow = new Date(y, m - 1, d).getDay();
  const start = addDays(today, -(weeks * 7 - 1) + (6 - dow));
  const cells: SafeHtml[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const day = addDays(start, i);
    if (day > today) {
      cells.push(html`<i class="pad"></i>`);
      continue;
    }
    const n = counts[day] ?? 0;
    const when = new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    cells.push(html`<i data-l="${heatLevel(n)}"${day === today ? html` class="today"` : ""} title="${when}: ${n ? `${n} solved` : "no practice"}"></i>`);
  }
  return html`<div class="heat" role="img" aria-label="${opts.label}">${cells}</div>`;
}
