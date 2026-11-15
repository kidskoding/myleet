// A practice journey keeps its source when moving between problems.
import { companySlug } from "./catalog";
import { companyHref, problemHref, ROUTES } from "./routes";
import type { Catalog } from "./types";

export interface PracticeContext {
  title: string;
  backHref: string;
  exitHref: string;
  position: number;
  total: number;
  previous: { href: string; title: string } | null;
  next: { href: string; title: string } | null;
}

export const companyProblemHref = (id: string, slug: string): string => `${problemHref(id)}?company=${encodeURIComponent(slug)}`;

/** Ignore unknown sets and URLs whose problem doesn't belong to the set. */
export function companyPracticeContext(c: Catalog, id: string, slug: string | null): PracticeContext | null {
  if (!slug) return null;
  const set = c.playlists.find((p) => companySlug(p.id) === slug);
  if (!set) return null;
  const problems = [...new Set(set.entries.flatMap((e) => e.problem === null ? [] : [c.problems[e.problem]?.id]).filter((x): x is string => !!x))];
  const at = problems.indexOf(id);
  if (at < 0) return null;
  const target = (i: number) => {
    const next = problems[i];
    if (!next) return null;
    return { href: companyProblemHref(next, slug), title: c.problems.find((p) => p.id === next)?.title ?? next };
  };
  return { title: set.title, backHref: companyHref(set.id), exitHref: ROUTES.companies, position: at + 1, total: problems.length, previous: target(at - 1), next: target(at + 1) };
}
