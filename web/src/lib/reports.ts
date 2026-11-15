// "I was asked this at <company>": learners' interview reports (worker/src/reports.rs).
// The Worker only returns a company's count once 3 different people reported it.
import { companySlug } from "./catalog";
import type { Playlist } from "./types";

export interface CompanyCount {
  company: string;
  count: number;
}

export interface Reports {
  counts: CompanyCount[];
  /** The signed-in learner's own reports; empty when signed out. */
  mine: { company: string; season: string | null }[];
}

async function call(init: RequestInit, query = ""): Promise<Reports> {
  const res = await fetch(`/api/reports${query}`, { credentials: "include", ...init });
  if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) throw new Error(`reports: ${res.status}`);
  return (await res.json()) as Reports;
}

export const fetchReports = (problem: string): Promise<Reports> => call({}, `?problem=${encodeURIComponent(problem)}`);

export const setReport = (body: { problem: string; company: string; season: string | null; reported: boolean }): Promise<Reports> =>
  call({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** "Reported by 5 people at Google". Unknown slugs (a playlist since removed) drop out. */
export function countLines(counts: CompanyCount[], playlists: Pick<Playlist, "id" | "title">[]): { company: string; text: string }[] {
  const titles = new Map(playlists.map((p) => [companySlug(p.id), p.title]));
  return counts.flatMap(({ company, count }) => {
    const title = titles.get(company);
    return title ? [{ company, text: `Reported by ${count} ${count === 1 ? "person" : "people"} at ${title}` }] : [];
  });
}

/** The last `n` interview months, newest first, as `YYYY-MM` with a readable label. */
export function recentMonths(now: Date, n = 12): { value: string; label: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  });
}
