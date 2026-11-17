// "Finish setting up" on Today: the setup answers a learner skipped, each one a row that opens
// just that question. The card leaves once every item is done, or for good once hidden.
import { aimsOf } from "./goals";
import type { Goal, Prefs } from "./prefs";
import { ROUTES } from "./routes";

export type SetupItemId = "role" | "goal" | "leetcode" | "level";

export interface SetupItem {
  id: SetupItemId;
  label: string;
  action: string;
  href: string;
  optional?: boolean;
  done: boolean;
}

/** The roles onboarding and Settings offer, with the same words in both. */
export const ROLES: { id: Goal; label: string; detail: string }[] = [
  { id: "internship", label: "Internship", detail: "Mostly easy and medium problems, arrays to trees first" },
  { id: "coop", label: "Co-op", detail: "The same core topics as internships, often with more interview rounds" },
  { id: "newgrad", label: "New grad", detail: "Medium and some hard problems, with more graphs and dynamic programming" },
];

/** One onboarding question on its own, coming back to Today. */
export const setupStepHref = (step: "role" | "leetcode"): string => `${ROUTES.onboarding}?step=${step}&return=${ROUTES.today}`;

/**
 * Every setup item with whether it's done. `placementNeeded` is the trainer's `placement().needs`,
 * the same check onboarding uses before sending a learner to the diagnostic.
 */
export function setupItems(p: Pick<Prefs, "plan" | "leetcodeUsername" | "setupHidden">, placementNeeded: boolean): SetupItem[] {
  return [
    { id: "role", label: "Pick your role", action: "Pick", href: setupStepHref("role"), done: p.plan.goal !== null },
    { id: "goal", label: "Add a goal", action: "Add", href: ROUTES.goals, done: aimsOf(p.plan).length > 0 },
    { id: "leetcode", label: "Connect LeetCode", action: "Connect", href: setupStepHref("leetcode"), optional: true, done: p.leetcodeUsername !== null || p.setupHidden.includes("leetcode") },
    { id: "level", label: "Find your level", action: "Start", href: ROUTES.diagnostic, done: !placementNeeded },
  ];
}

/** The card's rows, or null when it shouldn't show: everything done, or hidden for good. */
export function setupCard(p: Pick<Prefs, "plan" | "leetcodeUsername" | "setupHidden">, placementNeeded: boolean): { open: SetupItem[]; done: number; total: number } | null {
  if (p.setupHidden.includes("card")) return null;
  const items = setupItems(p, placementNeeded);
  const open = items.filter((i) => !i.done);
  return open.length ? { open, done: items.length - open.length, total: items.length } : null;
}
