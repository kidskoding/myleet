// Fuzzy search for the command palette: pure, so it is unit-tested without a DOM.

export type PaletteKind = "problem" | "note" | "company" | "command";

export interface PaletteItem {
  /** Stable key for "recent". */
  key: string;
  kind: PaletteKind;
  title: string;
  /** Secondary text, searched at lower weight (technique, module, group). */
  hint?: string;
  /** Extra words searched like the hint but never shown ("flavor", "colour"). */
  keywords?: string;
  /** Exact-match aliases such as a LeetCode number. */
  aliases?: string[];
  href?: string;
  /** Command id run by the palette host. */
  command?: string;
  /** Right-aligned extra (shortcut, rung) rendered by the host. */
  meta?: unknown;
}

export interface Hit {
  item: PaletteItem;
  score: number;
  /** [start, end) ranges in `item.title` to highlight. */
  ranges: [number, number][];
}

const isBoundary = (s: string, i: number): boolean => i === 0 || /[\s\-_/(,.]/.test(s[i - 1] ?? "");

interface Match {
  score: number;
  ranges: [number, number][];
}

/** One token against one string. Substring beats subsequence; word starts and early hits score higher. */
export function matchToken(token: string, text: string): Match | null {
  if (!token) return { score: 0, ranges: [] };
  const lower = text.toLowerCase();
  let best: Match | null = null;
  for (let i = lower.indexOf(token); i >= 0; i = lower.indexOf(token, i + 1)) {
    const score = 100 + (i === 0 ? 40 : 0) + (isBoundary(lower, i) ? 30 : 0) - Math.min(i, 40) * 0.5;
    if (!best || score > best.score) best = { score, ranges: [[i, i + token.length]] };
  }
  if (best) return best;
  // Subsequence: prefer jumping to word starts so "lcs" finds Longest Common Subsequence.
  let pos = 0;
  let score = 30;
  const ranges: [number, number][] = [];
  for (const ch of token) {
    const next = lower.indexOf(ch, pos);
    if (next < 0) return null;
    let at = next;
    if (!isBoundary(lower, next)) {
      for (let j = next + 1; j < Math.min(lower.length, next + 8); j++) {
        if (lower[j] === ch && isBoundary(lower, j)) {
          at = j;
          break;
        }
      }
    }
    score += isBoundary(lower, at) ? 6 : 0;
    score -= Math.min(at - pos, 10);
    const last = ranges[ranges.length - 1];
    if (last && last[1] === at) last[1] = at + 1;
    else ranges.push([at, at + 1]);
    pos = at + 1;
  }
  return score > 0 ? { score, ranges } : null;
}

export function scoreItem(query: string, item: PaletteItem): Hit | null {
  const q = query.trim().toLowerCase();
  if (!q) return { item, score: 0, ranges: [] };
  if (item.aliases?.some((a) => a.toLowerCase() === q)) return { item, score: 400, ranges: [] };
  let score = 0;
  const ranges: [number, number][] = [];
  for (const token of q.split(/\s+/)) {
    const t = matchToken(token, item.title);
    const extra = item.keywords ? `${item.hint ?? ""} ${item.keywords}` : item.hint;
    const h = extra ? matchToken(token, extra) : null;
    if (t && (!h || t.score >= h.score * 0.6)) {
      score += t.score;
      ranges.push(...t.ranges);
    } else if (h) {
      score += h.score * 0.6;
    } else {
      return null;
    }
  }
  if (item.title.toLowerCase() === q) score += 200;
  // Shorter titles win ties ("Two Sum" before "Two Sum II").
  score -= item.title.length * 0.05;
  ranges.sort((a, b) => a[0] - b[0]);
  return { item, score, ranges };
}

export const KIND_ORDER: PaletteKind[] = ["problem", "note", "company", "command"];
const LIMIT: Record<PaletteKind, number> = { problem: 8, note: 5, company: 5, command: 6 };

/** Grouped, ranked results; `only` filters to one kind (Tab in the palette). */
export function search(items: PaletteItem[], query: string, only?: PaletteKind): { kind: PaletteKind; hits: Hit[] }[] {
  const groups = new Map<PaletteKind, Hit[]>();
  for (const item of items) {
    if (only && item.kind !== only) continue;
    const hit = scoreItem(query, item);
    if (!hit) continue;
    const list = groups.get(item.kind) ?? [];
    list.push(hit);
    groups.set(item.kind, list);
  }
  const limit = (k: PaletteKind) => (only ? 50 : LIMIT[k]);
  return KIND_ORDER.filter((k) => groups.has(k))
    .map((kind) => ({ kind, hits: (groups.get(kind) ?? []).sort((a, b) => b.score - a.score).slice(0, limit(kind)) }))
    .filter((g) => g.hits.length > 0);
}

/** Splits a title into plain and marked parts for highlighting. */
export function highlight(title: string, ranges: [number, number][]): { text: string; mark: boolean }[] {
  const out: { text: string; mark: boolean }[] = [];
  let at = 0;
  for (const [s, e] of ranges) {
    if (s < at) continue;
    if (s > at) out.push({ text: title.slice(at, s), mark: false });
    out.push({ text: title.slice(s, e), mark: true });
    at = e;
  }
  if (at < title.length) out.push({ text: title.slice(at), mark: false });
  return out;
}
