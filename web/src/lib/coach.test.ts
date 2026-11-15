import { describe, expect, it } from "vitest";
import { milestone, milestoneLine, momentum, onThisDay, personalCards, reviewWhy, todaySummary, wrapUp } from "./coach";
import type { Skill, SkillAttempt, State, TodayEntry } from "./types";

const now = new Date(2026, 10, 15, 9);
const attempt = (a: Partial<SkillAttempt>): SkillAttempt => ({ problem: "swm", title: "Sliding Window Maximum", date: "2026-11-14", mark: "missed", cause: null, detail: "passed 5 of 7 tests", ...a });
const skill = (s: Partial<Skill>): Skill =>
  ({ technique_title: "Sliding Window", level: "shaky", weak_spot: false, need: 0.5, evidence: { attempts: 3 }, history: [], ...s }) as Skill;
const item = (kind: "new" | "review", technique: string, tag = "new", chips: { icon: string; text: string }[] = []) => ({ kind, tag, technique, chips }) as never;
const state = (s: Partial<State>): State => ({ status: "learning", rung: 0, due_ms: null, last_ms: null, first_ms: null, attempts: 1, clean_passes: 0, fails: 0, hint_attempts: 0, best_secs: null, ...s });
const entry = (problem: string, kind: TodayEntry["kind"], s: Partial<State> = {}, overdue = 0): TodayEntry => ({ problem, index: 0, kind, reason: null, overdue_days: overdue, state: state(s) });

describe("todaySummary", () => {
  it("weaves the last miss, the company, the reviews and the level move", () => {
    const items = [item("review", "Hashing"), item("review", "Trees"), ...[1, 2, 3].map(() => item("new", "Sliding Window", "weak", [{ icon: "b", text: "Meta leans on sliding window" }]))];
    const skills = [skill({ weak_spot: true, history: [attempt({ cause: "edge_cases" })] })];
    expect(todaySummary({ items, skills, daysLeft: 12, now })).toBe(
      "Today we're focusing on sliding window, your weakest spot right now. Yesterday on Sliding Window Maximum you passed 5 of 7 tests but missed edge cases. Meta's set leans on sliding window and your interview is 12 days away, so it's likely to come up.\n\nWe'll warm up with two quick reviews, then work through three sliding window problems! Solve them cleanly and you'll stop needing hints on sliding window.",
    );
  });
  it("names a hint without a company", () => {
    const skills = [skill({ level: "building", history: [attempt({ mark: "hint", detail: "used a hint", date: "2026-11-12" })] })];
    expect(todaySummary({ items: [item("new", "Sliding Window")], skills, daysLeft: null, now })).toBe(
      "Today we're spending most of our time on sliding window. 3 days ago on Sliding Window Maximum you needed a hint.\n\nWe'll start with one sliding window problem! Solve it cleanly and sliding window will start to feel solid.",
    );
  });
  it("folds a short why and the plan into one paragraph", () => {
    const items = [item("new", "Hashing"), item("new", "Trees"), item("new", "Graphs")];
    expect(todaySummary({ items, skills: null, daysLeft: 30, now })).toBe(
      "Today we're spending most of our time on hashing. Your interview is 30 days away, so we'll start with one hashing problem and then work through two more from other topics!",
    );
    expect(todaySummary({ items: [item("review", "Trees"), item("new", "Hashing")], skills: null, daysLeft: null, now })).toBe(
      "Today we're spending most of our time on hashing. We'll warm up with a quick review, then work through one hashing problem!",
    );
  });
  it("stays short with no history and leaves clauses out without data", () => {
    expect(todaySummary({ items: [item("new", "Hashing")], skills: null, daysLeft: null, now })).toBe("Today we're spending most of our time on hashing.");
    expect(todaySummary({ items: [item("review", "Hashing")], skills: null, daysLeft: null, now })).toBe("Today is a review day, with one older problem to keep on schedule.");
    expect(todaySummary({ items: [], skills: null, daysLeft: null, now })).toBeNull();
  });
});

describe("personal cards", () => {
  const title = (id: string) => id.toUpperCase();
  it("shows jump back in, due and weak spot from real data", () => {
    const q = [entry("a", "new", { rung: -1, attempts: 2 }), entry("r", "review", {}, 3)];
    const skills = [skill({ history: [attempt({ problem: "a", date: "2026-11-13" })] }), skill({ technique_title: "Hashing", level: "solid", need: 0.1 })];
    expect(personalCards(q, skills, title, now)).toEqual([
      { kind: "resume", label: "Jump back in", title: "A", body: "Last time you passed 5 of 7 tests, 2 days ago", problem: "a" },
      { kind: "due", label: "Due before it slips", title: "R", body: "It came due 3 days ago, so a clean pass today keeps it on schedule", problem: "r" },
      { kind: "weak", label: "Your weak spot", title: "Sliding Window", body: "Sliding window is still shaky. A few clean solves and you'll stop needing hints on it.", problem: null },
    ]);
  });
  it("renders nothing without data", () => {
    expect(personalCards([entry("n", "new", { attempts: 0 })], null, title, now)).toEqual([]);
  });
});

describe("on this day, milestones and momentum", () => {
  it("recalls a miss from a week ago that is due today", () => {
    const skills = [skill({ history: [attempt({ problem: "r", title: "Two Sum", date: "2026-11-08" })] })];
    expect(onThisDay([entry("r", "review")], skills, now)).toBe("A week ago you couldn't solve Two Sum. It's due today, so try it clean.");
    expect(onThisDay([], skills, now)).toBeNull();
  });
  it("fires each milestone once", () => {
    const s = { a: state({ clean_passes: 6 }), b: state({ clean_passes: 4 }) };
    expect(milestone(s, 0)).toBe(10);
    expect(milestone(s, 10)).toBeNull();
    expect(milestoneLine(10)).toBe("That's your 10th clean pass");
    expect(milestoneLine(1000)).toBe("That's your 1000th clean pass");
  });
  it("only shows momentum when true", () => {
    expect(momentum(3)).toBe("3 days in a row");
    expect(momentum(1)).toBeNull();
  });
});

describe("empty Today", () => {
  it("wraps up the day and offers a retake after 30 days", () => {
    const old = now.getTime() - 40 * 86_400_000;
    expect(wrapUp({ clean: 2, total: 3, minutes: 52 }, old, now)).toEqual({
      text: "You worked through three problems today, two of them cleanly, in about 52 minutes. Nothing else is due until tomorrow, so the rest of the day is yours. Your last diagnostic was over a month ago, so a retake would move your plan to where you are now.",
      retake: true,
    });
    expect(wrapUp({ clean: 0, total: 0, minutes: 0 }, now.getTime(), now)).toEqual({
      text: "Nothing is due today, so your reviews are on schedule and the rest of the day is yours.",
      retake: false,
    });
  });
});

describe("reviewWhy", () => {
  it("uses the last attempt, else the due date", () => {
    const skills = [skill({ history: [attempt({ problem: "r", mark: "hint", detail: "used a hint", date: "2026-11-09" })] })];
    expect(reviewWhy(entry("r", "review", { rung: 1 }), skills, now)).toBe("6 days ago you needed a hint, so a clean pass now puts the next review 7 days out");
    expect(reviewWhy(entry("x", "review", { rung: 0 }, 2), null, now)).toBe("It came due 2 days ago, and a clean pass puts the next review 3 days out");
  });
});
