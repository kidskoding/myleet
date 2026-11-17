import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, type Prefs } from "./prefs";
import { SETUP_SOLVES, setupCard, setupItems } from "./setup";

const prefs = (p: { plan?: Partial<Prefs["plan"]>; leetcodeUsername?: string | null; setupHidden?: Prefs["setupHidden"] } = {}): Prefs => ({
  ...DEFAULT_PREFS,
  leetcodeUsername: p.leetcodeUsername ?? null,
  setupHidden: p.setupHidden ?? [],
  plan: { ...DEFAULT_PREFS.plan, ...p.plan },
});
const ids = (card: ReturnType<typeof setupCard>) => card?.open.map((i) => i.id);

describe("finish setting up", () => {
  it("lists every item for a new account that skipped setup", () => {
    const card = setupCard(prefs({ plan: { onboarded: true } }), true);
    expect(ids(card)).toEqual(["role", "goal", "leetcode", "level"]);
    expect(card).toMatchObject({ done: 0, total: 4 });
    expect(card?.open.find((i) => i.id === "leetcode")?.optional).toBe(true);
  });

  it("lists only what's still open after partial setup", () => {
    const card = setupCard(prefs({ plan: { goal: "coop", companies: ["google"] } }), true);
    expect(ids(card)).toEqual(["leetcode", "level"]);
    expect(card).toMatchObject({ done: 2, total: 4 });
    // A skipped LeetCode step and a finished or skipped diagnostic both count as done.
    expect(ids(setupCard(prefs({ plan: { goal: "coop" }, setupHidden: ["leetcode"] }), false))).toEqual(["goal"]);
    expect(ids(setupCard(prefs({ plan: { goal: "coop", aims: ["sharp"] }, leetcodeUsername: "neetcode" }), true))).toEqual(["level"]);
  });

  it("goes away once everything is done", () => {
    const all = prefs({ plan: { goal: "newgrad", aims: ["sharp"] }, leetcodeUsername: "neetcode" });
    expect(setupItems(all, false).every((i) => i.done)).toBe(true);
    expect(setupCard(all, false)).toBeNull();
  });

  it("stays hidden for good once dismissed", () => {
    expect(setupCard(prefs({ setupHidden: ["card"] }), true)).toBeNull();
  });

  it("bows out once the learner has solved enough problems, even with items open", () => {
    expect(setupCard(prefs({}), true, SETUP_SOLVES - 1)).not.toBeNull();
    expect(setupCard(prefs({}), true, SETUP_SOLVES)).toBeNull();
  });

  it("opens each question on its own, coming back to Today", () => {
    const href = Object.fromEntries(setupItems(prefs(), true).map((i) => [i.id, i.href]));
    expect(href).toEqual({ role: "/onboarding?step=role&return=/app", goal: "/plan?edit=goals", leetcode: "/onboarding?step=leetcode&return=/app", level: "/diagnostic" });
  });
});
