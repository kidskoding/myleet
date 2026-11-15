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
      "Today we're focusing on sliding window, your weakest spot right now. Yesterday on Sliding Window Maximum you passed 5 of 7 tests but missed edge cases. Meta's set leans on sliding window and your interview is 12 days away, so it's likely to come up.\n\nWe'll warm up with two quick reviews, then work through three sliding window problems! Solve them cleanly and you'll stop needing hints on sliding window",
    );
  });
  it("says when LeetCode history is why a topic comes first", () => {
    const skills = [skill({ module: "sliding_window", seen: 0, evidence: { attempts: 0 } as never })];
    const text = todaySummary({ items: [item("new", "Sliding Window")], skills, daysLeft: null, now, leetcodeWeak: ["sliding_window"] });
    expect(text).toContain("Your LeetCode history is light on sliding window, so this is where we're starting.");
    expect(todaySummary({ items: [item("new", "Sliding Window")], skills, daysLeft: null, now, leetcodeWeak: ["dp"] })).not.toContain("LeetCode");
  });
  it("names a hint without a company", () => {
    const skills = [skill({ level: "building", history: [attempt({ mark: "hint", detail: "used a hint", date: "2026-11-12" })] })];
    expect(todaySummary({ items: [item("new", "Sliding Window")], skills, daysLeft: null, now })).toBe(
      "Today we're spending most of our time on sliding window. 3 days ago on Sliding Window Maximum you needed a hint.\n\nWe'll start with one sliding window problem! Solve it cleanly and sliding window will start to feel solid",
    );
  });
  it("folds a short why and the plan into one paragraph", () => {
    const items = [item("new", "Hashing"), item("new", "Trees"), item("new", "Graphs")];
    expect(todaySummary({ items, skills: null, daysLeft: 30, now })).toBe("Today spreads three new problems across hashing, trees and graphs, with your interview 30 days away");
    expect(todaySummary({ items: [item("review", "Arrays"), item("review", "Arrays"), ...items], skills: null, daysLeft: null, now })).toBe(
      "Today starts with two reviews to keep on schedule, then three new problems in hashing, trees and graphs",
    );
    expect(todaySummary({ items: [item("new", "Hashing"), item("new", "Hashing"), item("new", "Trees")], skills: null, daysLeft: 30, now })).toBe(
      "Today we're spending most of our time on hashing. Your interview is 30 days away, so we'll start with two hashing problems and then work through one more from another topic!",
    );
    expect(todaySummary({ items: [item("review", "Trees"), item("new", "Hashing")], skills: null, daysLeft: null, now })).toBe(
      "Today we're spending most of our time on hashing. We'll warm up with a quick review, then work through one hashing problem!",
    );
  });
  it("stays short with no history and leaves clauses out without data", () => {
    expect(todaySummary({ items: [item("new", "Hashing")], skills: null, daysLeft: null, now })).toBe("Today we're spending most of our time on hashing");
    expect(todaySummary({ items: [item("review", "Hashing")], skills: null, daysLeft: null, now })).toBe("Today is a review day, with one older problem to keep on schedule");
    expect(todaySummary({ items: [], skills: null, daysLeft: null, now })).toBeNull();
  });
});

describe("personal cards", () => {
  const title = (id: string) => id.toUpperCase();
  it("shows jump back in, due and still building from real data", () => {
    const q = [entry("a", "new", { rung: -1, attempts: 2 }), entry("r", "review", {}, 3), entry("s", "review", {}, 1)];
    const skills = [skill({ history: [attempt({ problem: "a", date: "2026-11-13" })] }), skill({ technique_title: "Hashing", level: "solid", need: 0.1 })];
    expect(personalCards(q, skills, title, now)).toEqual([
      { kind: "resume", label: "Jump back in", title: "A", body: "Last time you passed 5 of 7 tests, 2 days ago", problem: "a" },
      { kind: "due", label: "Waiting the longest", title: "R", body: "It's been waiting 3 days, and one clean pass puts it back on schedule", problem: "r" },
      { kind: "weak", label: "Still building", title: "Sliding Window", body: "It's still shaky. A few clean solves and you'll stop needing hints on it.", problem: null },
    ]);
  });
  it("leaves the hero's problem and a flagged weak spot to their own cards", () => {
    const q = [entry("r", "review", {}, 3), entry("s", "review", {}, 1)];
    const skills = [skill({ weak_spot: true }), skill({ technique_title: "Hashing", level: "building", need: 0.9 })];
    expect(personalCards(q, skills, title, now, "r")).toEqual([
      { kind: "due", label: "Due before it slips", title: "S", body: "It came due yesterday, so a clean pass today keeps it on schedule", problem: "s" },
    ]);
  });
  it("renders nothing without data", () => {
    expect(personalCards([entry("n", "new", { attempts: 0 })], null, title, now)).toEqual([]);
  });
});

describe("on this day, milestones and momentum", () => {
  it("recalls a miss from a week ago that is due today", () => {
    const skills = [skill({ history: [attempt({ problem: "r", title: "Two Sum", date: "2026-11-08" })] })];
    expect(onThisDay([entry("r", "review")], skills, now)).toBe("A week ago you couldn't solve Two Sum. It's back in today's reviews, so try it clean");
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
    expect(momentum(12, ["2026-11-15"])).toBe("12 days, with your rest day on Sunday");
    expect(momentum(20, ["2026-11-15", "2026-11-06"])).toBe("20 days, with a rest day each week");
    expect(momentum(1)).toBeNull();
  });
});

describe("empty Today", () => {
  it("wraps up the day and offers a retake after 30 days", () => {
    const old = now.getTime() - 40 * 86_400_000;
    expect(wrapUp({ clean: 2, total: 3, minutes: 52 }, old, now)).toEqual({
      text: "You worked through three problems today, two of them cleanly, in about 52 minutes. Nothing else is due until tomorrow, so the rest of the day is yours. Your last diagnostic was over a month ago, so a retake would move your plan to where you are now",
      retake: true,
    });
    expect(wrapUp({ clean: 2, total: 2, minutes: 40 }, now.getTime(), now, { technique: "Opposite-End Pointers", reviews: 2 }).text).toBe(
      "You worked through two problems today, all cleanly, in about 40 minutes! Nothing else is due until tomorrow, so the rest of the day is yours. Tomorrow we'll pick up opposite-end pointers, after two quick reviews",
    );
    expect(wrapUp({ clean: 0, total: 0, minutes: 0 }, now.getTime(), now)).toEqual({
      text: "Nothing is due today, so your reviews are on schedule and the rest of the day is yours",
      retake: false,
    });
  });
});

describe("reviewWhy", () => {
  it("uses the last attempt, else the due date", () => {
    const skills = [skill({ history: [attempt({ problem: "r", mark: "hint", detail: "used a hint", date: "2026-11-09" })] })];
    expect(reviewWhy(entry("r", "review", { rung: 1 }), skills, now)).toBe("6 days ago you needed a hint, so a clean pass now puts the next review in a week");
    const lc = { ...entry("lc", "review", { rung: 0 }, 20), why: "overdue 20d: 1-day review, you solved this on LeetCode 3 weeks ago, so let's see if it stuck" };
    expect(reviewWhy(lc, null, now)).toBe("You solved this on LeetCode 3 weeks ago, so let's see if it stuck, and a clean pass now puts the next review on Wednesday");
    expect(reviewWhy(entry("x", "review", { rung: 0 }, 2), null, now)).toBe("It came due 2 days ago, and a clean pass puts the next review on Wednesday");
  });
});
