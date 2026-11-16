import { companyLogo, hasLogo } from "../company-logos";
import { companySlug } from "../catalog";
import type { Playlist } from "../types";
import { esc, raw, type SafeHtml } from "./html";

/** Company title to its logo slug, for the companies a note may name; "" for a company with no real logo. */
export type Marks = Record<string, string>;

/** Marks for the learner's companies (target and interview slugs). */
export function companyMarks(playlists: Pick<Playlist, "id" | "title">[], slugs: (string | null | undefined)[]): Marks {
  const want = new Set(slugs.filter(Boolean));
  return Object.fromEntries(playlists.filter((p) => want.has(companySlug(p.id))).map((p) => [p.title, hasLogo(companySlug(p.id)) ? companySlug(p.id) : ""]));
}

const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Bolds each term in already-escaped text; a company with a mark gets its logo, kept on one line with the name. */
function boldTerms(s: string, terms: string[], marks: Marks): string {
  const logos: string[] = [];
  const all = [...new Set([...terms, ...Object.keys(marks)])].sort((a, b) => b.length - a.length);
  for (const term of all) {
    const slug = marks[term];
    s = s.replace(new RegExp(`(^|[^>\\w])(${reEsc(esc(term))})(?=[^\\w<]|$)`, "g"), (_m, pre: string, name: string) => {
      if (!slug) return `${pre}<strong>${name}</strong>`;
      logos.push(slug);
      // A placeholder until every term is done, so later terms never match inside the logo's markup.
      return `${pre}<span class="co-inline">\u0000${logos.length - 1}\u0000<strong>${name}</strong></span>`;
    });
  }
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => companyLogo(logos[Number(i)] ?? "").value);
}

/** Bolds the company names in a line, each with its logo when it has one. */
export function markCompanies(text: string, marks: Marks): SafeHtml {
  return raw(boldTerms(esc(text), [], marks));
}

/**
 * Bolds the facts a reader scans for in a coaching note: the focus topic ("focusing on X" or
 * "time on X"), any "N days" or "N reviews", and the given company names, with logos from marks.
 * Escapes everything else.
 */
export function emphasize(text: string, companies: string[] = [], marks: Marks = {}): SafeHtml {
  let s = esc(text);
  s = s.replace(/\b(focusing on|time on|starting with) ([^,.!;]+)/, "$1 <strong>$2</strong>");
  s = s.replace(/\b(\d+ (?:days?|reviews?))\b/g, "<strong>$1</strong>");
  return raw(boldTerms(s, companies, marks));
}
