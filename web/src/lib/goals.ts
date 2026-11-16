// The learner's goal mix (interviews, target companies, focus topics, or none of them)
// in words and readiness. Pure, so the wording is tested without a page.
import { companySlug } from "./catalog";
import { readiness, type Readiness } from "./companies";
import { sentenceCase } from "./display";
import type { Aim, Plan } from "./prefs";
import { midSentence } from "./schedule";
import type { Catalog, Playlist, State } from "./types";

/** The goals in the order every goals editor shows them. */
export const AIMS: Aim[] = ["interview", "companies", "topics", "sharp"];

/** The goals picked, plus any implied by what's filled in (saves from before goals were picked have data but no aims). */
export function aimsOf(p: Pick<Plan, "aims" | "interviews" | "companies" | "focusTopics">): Aim[] {
  const on = new Set(p.aims);
  if (p.interviews.length) on.add("interview");
  if (p.companies.length) on.add("companies");
  if (p.focusTopics.length) on.add("topics");
  return AIMS.filter((a) => on.has(a));
}

/** "Stripe", "Stripe and Ramp", "Stripe, Ramp and Meta", "Stripe, Ramp and 2 more". */
export function names(list: string[]): string {
  const [a = "", b, c] = list;
  if (!b) return a;
  if (list.length === 2) return `${a} and ${b}`;
  if (list.length === 3) return `${a}, ${b} and ${c}`;
  return `${a}, ${b} and ${list.length - 2} more`;
}

/** Modules a learner can pick as a focus topic: the curriculum, not the bank or the mixed review. */
export const focusModules = (c: Pick<Catalog, "modules">) => c.modules.filter((m) => !m.bank && m.id !== "mixed_interview_practice");

/** A focus topic's name mid-sentence ("dynamic programming"), or null for an unknown id. */
export function topicName(c: Pick<Catalog, "modules">, id: string): string | null {
  const m = c.modules.find((x) => x.id === id);
  return m ? midSentence(m.title) : null;
}

/**
 * One sentence on what the plan works toward, for undated goals. `companies` are display
 * names, `topics` mid-sentence topic names. Staying sharp is what's left with neither.
 */
export function goalLine(companies: string[], topics: string[]): string {
  const sets = companies.length === 1 ? `${companies[0]}'s practice set` : `your ${names(companies)} sets`;
  const extra = `extra time on ${names(topics)}`;
  if (companies.length && topics.length) return `Your plan works through ${sets} and puts ${extra}`;
  if (companies.length) return `Your plan works through ${sets} and the patterns ${companies.length === 1 ? "it leans" : "they lean"} on`;
  if (topics.length) return `Your plan puts ${extra}, with reviews that keep the rest fresh`;
  return "Build a steady practice routine, learn new patterns, and review what needs another pass";
}

/** The Today panel's title for undated goals. */
export function goalTitle(companies: string[], topics: string[]): string {
  if (companies.length) return `Working towards ${names(companies)}`;
  if (topics.length) return topics.length === 1 ? `Focusing on ${topics[0]}` : "Your focus topics";
  return "Your next 4 weeks";
}

export interface GoalReady extends Readiness {
  kind: "company" | "topic";
  /** Company slug or module id. */
  id: string;
  name: string;
}

/** Readiness for each target company's set and each focus topic's problems, in the order picked. */
export function goalReadiness(
  c: Catalog,
  goals: { companies: string[]; topics: string[] },
  states: Record<string, State>,
  clean: Set<string>,
  now: number,
): GoalReady[] {
  const out: GoalReady[] = [];
  for (const slug of goals.companies) {
    const p = c.playlists.find((x) => companySlug(x.id) === slug);
    if (p) out.push({ kind: "company", id: slug, name: p.title, ...readiness(p, c, states, clean, now) });
  }
  for (const id of goals.topics) {
    const m = c.modules.findIndex((x) => x.id === id);
    const mod = c.modules[m];
    if (!mod) continue;
    const set: Playlist = { id, title: mod.title, group: "Big Tech", focus: "", entries: c.problems.flatMap((p, i) => (p.module === m ? [{ title: p.title, url: "", problem: i }] : [])) };
    out.push({ kind: "topic", id, name: sentenceCase(mod.title), ...readiness(set, c, states, clean, now) });
  }
  return out;
}
