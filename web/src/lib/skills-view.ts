// What the Skills page shows, from the skill model (trainer.skills): which state, which
// cards in which order, and where a next step already sits in the plan.
import { noteHref, problemHref } from "./routes";
import type { Plan, Skill, SkillAction, SkillCause } from "./types";

/** Below this many attempts the page explains itself instead of guessing. */
export const EMPTY_BELOW = 10;
export const CARDS_SHOWN = 5;

export type SkillsState = "empty" | "low-data" | "none-weak" | "default";

export function skillsState(ts: Skill[]): SkillsState {
  const attempts = ts.reduce((n, s) => n + (s.evidence.attempts ?? 0), 0);
  if (attempts < EMPTY_BELOW) return "empty";
  if (!ts.some((s) => s.recent >= 4)) return "low-data";
  if (!ts.some((s) => s.weak_spot || s.watch)) return "none-weak";
  return "default";
}

/** Weak spots by the model's priority, first reads (Watching) last. */
export function spotList(ts: Skill[]): Skill[] {
  return ts
    .filter((s) => s.weak_spot || s.watch)
    .sort((a, b) => Number(a.watch && !a.weak_spot) - Number(b.watch && !b.weak_spot) || b.priority - a.priority);
}

export const CAUSE_WORD: Record<SkillCause, string> = {
  cant_start: "Can't start",
  wrong_approach: "Wrong approach",
  edge_cases: "Edge cases",
  too_slow: "Too slow",
  forgetting: "Forgetting",
};

/** Evidence counts in cause order, zeros included (absence is information). */
export function causeCounts(s: Skill): [SkillCause, number][] {
  const e = s.evidence;
  return [
    ["edge_cases", e.edge_cases ?? 0],
    ["wrong_approach", e.wrong_approach ?? 0],
    ["too_slow", e.too_slow ?? 0],
    ["cant_start", e.cant_start ?? 0],
    ["forgetting", e.forgot ?? 0],
  ];
}

/** Where a next step starts: the problem (reporting back against the diagnosis) or the note. */
export function actionHref(s: Skill, a: SkillAction): string {
  if (a.note) return noteHref(a.note);
  if (!a.problem) return "#";
  const q = new URLSearchParams({ from: "skills", target: s.technique, ...(s.cause ? { cause: s.cause } : {}) });
  return `${problemHref(a.problem)}?${q}`;
}

/** The first plan day that already holds this problem, if any. */
export function inPlanOn(plan: Plan | null, problem: string | null): string | null {
  if (!plan || !problem) return null;
  return plan.days.find((d) => d.sessions.some((s) => s.items.some((i) => i.problem === problem)))?.date ?? null;
}
