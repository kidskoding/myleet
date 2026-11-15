import { describe, expect, it } from "vitest";
import { focusModules, goalLine, goalReadiness, goalTitle, names, topicName } from "./goals";
import type { Catalog, State } from "./types";

const prob = (id: string, module: number) => ({ id, title: id, module, technique: 0 });
const cat = {
  guide: [],
  modules: [
    { id: "graphs", title: "Graphs", bank: false, techniques: [] },
    { id: "dp", title: "Dynamic Programming", bank: false, techniques: [] },
    { id: "mixed_interview_practice", title: "Mixed Interview Practice", bank: false, techniques: [] },
    { id: "bank", title: "Problem Bank", bank: true, techniques: [] },
  ],
  problems: [prob("a", 0), prob("b", 0), prob("c", 1)],
  playlists: [{ id: "002_stripe", title: "Stripe", group: "AI & Startups", focus: "", entries: [{ title: "c", url: "", problem: 2 }] }],
} as unknown as Catalog;

const mastered: State = { status: "mastered", rung: 5, due_ms: null, last_ms: 1, first_ms: 1, attempts: 3, clean_passes: 3, fails: 0, hint_attempts: 0, best_secs: 60 };

describe("goal mix", () => {
  it("joins names the way a person would", () => {
    expect(names([])).toBe("");
    expect(names(["Stripe"])).toBe("Stripe");
    expect(names(["Stripe", "Ramp"])).toBe("Stripe and Ramp");
    expect(names(["Stripe", "Ramp", "Meta"])).toBe("Stripe, Ramp and Meta");
    expect(names(["Stripe", "Ramp", "Meta", "Uber"])).toBe("Stripe, Ramp and 2 more");
  });

  it("offers only curriculum topics", () => {
    expect(focusModules(cat).map((m) => m.id)).toEqual(["graphs", "dp"]);
    expect(topicName(cat, "dp")).toBe("dynamic programming");
    expect(topicName(cat, "nope")).toBeNull();
  });

  it("describes any mix without trailing periods", () => {
    expect(goalLine(["Stripe", "Ramp"], ["graphs"])).toBe("Your plan works through your Stripe and Ramp sets and puts extra time on graphs");
    expect(goalLine(["Google"], [])).toBe("Your plan works through Google's practice set and the patterns it leans on");
    expect(goalLine([], ["graphs", "trees"])).toBe("Your plan puts extra time on graphs and trees, with reviews that keep the rest fresh");
    expect(goalLine([], [])).toContain("steady practice routine");
    for (const s of [goalLine(["A"], ["b"]), goalLine([], [])]) expect(s.endsWith(".")).toBe(false);
    expect(goalTitle(["Stripe", "Ramp"], ["graphs"])).toBe("Working toward Stripe and Ramp");
    expect(goalTitle([], ["graphs"])).toBe("Focusing on graphs");
    expect(goalTitle([], ["graphs", "trees"])).toBe("Your focus topics");
    expect(goalTitle([], [])).toBe("Your next 4 weeks");
  });

  it("measures readiness for each company and topic picked", () => {
    const rows = goalReadiness(cat, { companies: ["stripe", "gone"], topics: ["graphs"] }, { a: mastered }, new Set(), 0);
    expect(rows.map((r) => [r.kind, r.name, r.ready, r.tracked])).toEqual([
      ["company", "Stripe", 0, 1],
      ["topic", "Graphs", 1, 2],
    ]);
  });
});
