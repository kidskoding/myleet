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
  { id: "internship", label: "Internship or co-op", detail: "Mostly easy and medium problems, arrays to trees first" },
  { id: "newgrad", label: "New grad", detail: "Medium and some hard problems, with more graphs and dynamic programming" },
];

/** Co-op interviews match internship ones, so a saved "coop" shows as the shared option. */
export const roleOf = (g: Goal | null): Goal | null => (g === "coop" ? "internship" : g);

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

/** After this many solved problems the learner clearly knows what they're working towards, so the card bows out. */
export const SETUP_SOLVES = 5;

/** The card's rows, or null when it shouldn't show: everything done, hidden for good, or enough solves. */
export function setupCard(p: Pick<Prefs, "plan" | "leetcodeUsername" | "setupHidden">, placementNeeded: boolean, solved = 0): { open: SetupItem[]; done: number; total: number } | null {
  if (p.setupHidden.includes("card") || solved >= SETUP_SOLVES) return null;
  const items = setupItems(p, placementNeeded);
  const open = items.filter((i) => !i.done);
  return open.length ? { open, done: items.length - open.length, total: items.length } : null;
}
