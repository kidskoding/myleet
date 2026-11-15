import { describe, expect, it } from "vitest";
import { actionHref, causeCounts, inPlanOn, skillsState, spotList } from "./skills-view";
import type { Plan, Skill } from "./types";

const sk = (o: Partial<Skill>): Skill =>
  ({ module: "m", technique: "t", technique_title: "T", module_title: "M", evidence: { attempts: 0 }, recent: 0, weak_spot: false, watch: false, priority: 0, cause: null, actions: [], ...o }) as Skill;

describe("skills view", () => {
  it("picks the page state from the attempt counts", () => {
    expect(skillsState([sk({ evidence: { attempts: 9 }, recent: 9 })])).toBe("empty");
    expect(skillsState([sk({ evidence: { attempts: 6 }, recent: 3 }), sk({ evidence: { attempts: 6 }, recent: 3 })])).toBe("low-data");
    expect(skillsState([sk({ evidence: { attempts: 12 }, recent: 12 })])).toBe("none-weak");
    expect(skillsState([sk({ evidence: { attempts: 12 }, recent: 12, weak_spot: true })])).toBe("default");
  });
  it("orders weak spots by priority with first reads last", () => {
    const list = spotList([sk({ technique: "a", watch: true, priority: 9 }), sk({ technique: "b", weak_spot: true, priority: 1 }), sk({ technique: "c", weak_spot: true, priority: 5 }), sk({ technique: "d" })]);
    expect(list.map((s) => s.technique)).toEqual(["c", "b", "a"]);
  });
  it("keeps zero counts and links next steps back to the diagnosis", () => {
    expect(causeCounts(sk({ evidence: { edge_cases: 3 } })).map(([, n]) => n)).toEqual([3, 0, 0, 0, 0]);
    const s = sk({ technique: "grid-dfs", cause: "edge_cases" });
    expect(actionHref(s, { kind: "edge_case_redo", problem: "number-of-enclaves", note: null, reason: "", title: "", minutes: 20 })).toBe("/p/number-of-enclaves?from=skills&target=grid-dfs&cause=edge_cases");
    expect(actionHref(s, { kind: "read_note", problem: null, note: "curriculum/a/notes/b.md", reason: "", title: "", minutes: 10 })).toBe("/notes/curriculum/a/notes/b");
  });
  it("finds a step already in the plan", () => {
    const plan = { days: [{ date: "2026-11-16", sessions: [{ items: [{ problem: "x" }] }] }] } as unknown as Plan;
    expect(inPlanOn(plan, "x")).toBe("2026-11-16");
    expect(inPlanOn(plan, "y")).toBeNull();
  });
});
