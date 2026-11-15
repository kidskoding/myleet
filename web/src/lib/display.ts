// Display casing: module.toml and technique.toml titles are Title Case ("Arrays And Hashing");
// the UI shows sentence case ("Arrays and hashing"). Problem and note titles keep their casing.
import type { Module } from "./types";

// Proper names in technique titles stay capitalised.
const NAMES = new Set(["Kadane", "Dijkstra", "Kruskal", "Prim", "Kahn", "Tarjan", "Manacher", "Fenwick"]);

const keep = (w: string): boolean => NAMES.has(w) || (/^[A-Z0-9]+$/.test(w) && (w.length > 1 || /[A-Z]/.test(w)));

/** "Fast And Slow Pointers" -> "Fast and slow pointers"; acronyms (DP, BFS, 2D) and lone capitals (Top-K) stay. */
export function sentenceCase(title: string): string {
  return title
    .split(" ")
    .map((word, i) =>
      word
        .split("-")
        .map((part, j) => (keep(part) || (i === 0 && j === 0) ? part : part.toLowerCase()))
        .join("-"),
    )
    .join(" ");
}

/** "Fixed window, variable window, frequency window" from the module's techniques. */
export function moduleSubtitle(m: Pick<Module, "techniques">): string {
  return m.techniques
    .map((x, i) => {
      const t = sentenceCase(x.title);
      const first = t.split(/[ -]/)[0] ?? "";
      return i === 0 || keep(first) ? t : t.charAt(0).toLowerCase() + t.slice(1);
    })
    .join(", ");
}
