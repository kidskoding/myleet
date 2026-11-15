import { describe, expect, it } from "vitest";
import { caseName, nextReason, planChange, resultNote, type NextFacts, type ResultFacts } from "./sheet-note";
import type { Plan } from "./types";

const now = new Date(2026, 10, 15, 9);
const facts = (f: Partial<ResultFacts> = {}): ResultFacts => ({
  kind: "clean", technique: "Sliding Window", passed: 7, total: 7, failing: [], cleanThisWeek: 3, reviewDays: 7,
  levelAfter: "building", attempts: 5, priorEdge: null, company: null, daysLeft: null, targetMins: 25, now, ...f,
});
const next = (n: Partial<NextFacts> = {}): NextFacts => ({
  title: "X", kind: "new", technique: "Sliding Window", difficulty: "medium", overdueDays: 0, started: false, weak: false,
  currentTechnique: "Sliding Window", currentDifficulty: "easy", ...n,
});
const plan = (days: { kind: string; technique: string | null }[][]) =>
  ({ days: days.map((items) => ({ sessions: [{ items }] })) }) as unknown as Plan;

describe("resultNote", () => {
  it("celebrates a clean pass with the review and the level", () => {
    expect(resultNote(facts())).toBe("That's your third clean sliding window solve this week, and it moves to a 7-day review. Sliding window is starting to feel solid.");
  });
  it("ties in a company only when given", () => {
    expect(resultNote(facts({ company: "Meta", daysLeft: 12 }))).toContain("Meta's set leans on sliding window and your interview is 12 days away.");
    expect(resultNote(facts())).not.toContain("leans");
  });
  it("holds back the level on a first read", () => {
    expect(resultNote(facts({ attempts: 1 }))).not.toContain("feel solid");
  });
  it("handles a first solve with no history", () => {
    expect(resultNote(facts({ cleanThisWeek: 0, levelAfter: null, attempts: 0, reviewDays: 1 }))).toBe("That's your first clean sliding window solve this week, and it moves to a 1-day review");
  });
  it("names the missed case and the earlier edge-case miss on a near miss", () => {
    const n = resultNote(facts({ kind: "miss", passed: 6, total: 7, failing: ["test_empty_array"], reviewDays: 1, priorEdge: { title: "Two Sum", date: "2026-11-08" } }));
    expect(n).toBe("Super close! You passed 6 of 7 test cases and only missed the empty array case. That's the same kind of edge case that tripped you up on Two Sum a week ago. Let's revisit it tomorrow so this one sticks.");
  });
  it("is plain on a far miss without a case name", () => {
    expect(resultNote(facts({ kind: "miss", passed: 2, total: 7, failing: ["test_case_3"], reviewDays: 1 }))).toBe("You passed 2 of 7 test cases. Let's come back to it tomorrow and work through it again!");
    expect(resultNote(facts({ kind: "miss", passed: 0, total: 0 }))).toBeNull();
  });
  it("says what a hint means for the review", () => {
    expect(resultNote(facts({ kind: "hint", reviewDays: 1 }))).toBe("You used a hint on this one, so the review stays at 1 day instead of climbing. A clean pass on a later day gets it moving again.");
  });
  it("explains going over the target", () => {
    expect(resultNote(facts({ kind: "over", reviewDays: 1 }))).toContain("past the 25-minute target");
  });
});

describe("caseName", () => {
  it("humanizes test names and drops generic ones", () => {
    expect(caseName("test_single_element[2]")).toBe("the single element case");
    expect(caseName("test_edge_cases")).toBe("the edge cases");
    expect(caseName("test_example_1")).toBeNull();
  });
});

describe("nextReason", () => {
  it("steps up within the same technique", () => {
    expect(nextReason(next())).toBe("More sliding window, one step harder");
  });
  it("names a due review", () => {
    expect(nextReason(next({ kind: "review", overdueDays: 2 }))).toBe("A review that's 2 days overdue, so a clean pass keeps it on schedule");
  });
  it("calls out a weak or started topic, else a fresh one", () => {
    expect(nextReason(next({ technique: "Trees", weak: true }))).toBe("Trees is your weakest spot right now");
    expect(nextReason(next({ technique: "Trees", started: true }))).toBe("You started it before, and it's trees");
    expect(nextReason(next({ technique: "Trees" }))).toBe("A fresh topic for today: trees");
  });
  it("falls back with no technique", () => {
    expect(nextReason(next({ technique: null, currentTechnique: null }))).toBe("Next in today's queue");
  });
});

describe("planChange", () => {
  const t = (technique: string) => ({ kind: "new", technique });
  it("notices the technique moving up tomorrow", () => {
    expect(planChange(plan([[], [t("Trees")]]), plan([[], [t("Trees"), t("Sliding Window")]]), "Sliding Window")).toBe("We moved sliding window up in tomorrow's session");
  });
  it("notices fewer reviews this week, and stays silent when nothing changed", () => {
    const r = { kind: "review", technique: null };
    expect(planChange(plan([[], [r], [r]]), plan([[], [r], []]), null)).toBe("One less review needed this week");
    expect(planChange(plan([[], [r]]), plan([[], [r]]), null)).toBeNull();
    expect(planChange(null, plan([[]]), null)).toBeNull();
  });
});
