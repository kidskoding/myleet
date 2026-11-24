import { beforeEach, describe, expect, it } from "vitest";
import { memoryStorage } from "../../lib/memory-storage";
import { readPrefs } from "../../lib/prefs";
import type { Interview, Plan, PlanDay, PlanItem } from "../../lib/types";
import { changeLines, dayHeadline, fitHour, roadOf, type Draft } from "./model";

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

const item = (kind: string): PlanItem => ({ kind, title: "", minutes: 10, reason: "" }) as unknown as PlanItem;
const day = (date: string, kinds: string[] = [], off = false): PlanDay =>
  ({ date, weekday: "mon", off, minutes: kinds.length * 10, cap: 60, rest: false, windows: [], sessions: kinds.length ? [{ id: date, start_ms: 0, end_ms: 0, minutes: 10, title: "", items: kinds.map(item) }] : [] }) as unknown as PlanDay;

function plan(o: Partial<Plan> = {}): Plan {
  return {
    start: "2026-11-01",
    end: "2026-11-28",
    interview_date: null,
    interviews: [],
    days: Array.from({ length: 28 }, (_, i) => day(`2026-11-${String(i + 1).padStart(2, "0")}`)),
    forecast: [],
    ...o,
  } as unknown as Plan;
}

describe("Plan view model", () => {
  it("splits the road like the planner: new topics, company prep, then reviews only", () => {
    const r = roadOf(plan({ interviews: [{ date: "2026-11-30", company: "google", name: "Google" }] as Interview[] }));
    expect(r.end).toBe("2026-11-30");
    expect(r.phases.map((p) => [p.kind, p.from, p.to])).toEqual([
      ["learn", "2026-11-01", "2026-11-09"],
      ["prep", "2026-11-09", "2026-11-28"],
      ["tail", "2026-11-28", "2026-11-30"],
    ]);
    expect(r.milestones.at(-1)).toMatchObject({ kind: "interview", date: "2026-11-30", label: "Google interview" });
  });

  it("is one steady stretch with no interview, and lists mocks, check-ins and days off", () => {
    const p = plan();
    p.days[2] = day("2026-11-03", ["mock"]);
    p.days[5] = day("2026-11-06", ["checkpoint"]);
    p.days[6] = day("2026-11-07", [], true);
    const r = roadOf(p);
    expect(r.phases).toEqual([{ from: "2026-11-01", to: "2026-11-28", kind: "steady", label: "Steady practice: reviews, weak spots and new topics" }]);
    expect(r.milestones.map((m) => m.kind)).toEqual(["mock", "check", "off"]);
  });

  it("sums a day's load in words", () => {
    expect(dayHeadline(day("2026-11-01", ["review", "review", "new", "mock"]))).toBe("2 reviews, 1 new, mock");
    expect(dayHeadline(day("2026-11-01"))).toBe("");
  });

  it("keeps an hour between 56 and 112 pixels", () => {
    expect(fitHour([{ from: 0, to: 60, fold: false }], 10_000)).toBe(112);
    expect(fitHour([{ from: 0, to: 24 * 60, fold: false }], 800)).toBe(56);
  });

  it("writes goal history lines for what changed", () => {
    const before = { ...readPrefs().plan, dailyMinutes: 60, weekendMinutes: 60, companies: [], interviews: [] };
    const draft: Draft = { aims: [], interviews: [{ date: "2026-12-01", company: "meta" }], companies: ["google"], focusTopics: [], weekday: 90, weekend: 60, preset: null } as unknown as Draft;
    const names = (s: string | null) => (s ? s.toUpperCase() : null);
    const lines = changeLines(before, draft, names, () => null, "2026-11-24").map((l) => l.text);
    expect(lines).toEqual(["Set the interview for Dec 1", "Added META on Dec 1", "Added GOOGLE to your dream companies", "Daily time from 1 h to 1 h 30 on weekdays"]);
    // A preset names itself instead of listing the time it sets.
    expect(changeLines(before, { ...draft, preset: 30 }, names, () => null, "2026-11-24")[0]?.text).toBe("Switched to the 30-day plan");
  });
});
