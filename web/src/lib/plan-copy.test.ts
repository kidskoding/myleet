import { beforeEach, describe, expect, it } from "vitest";
import { memoryStorage } from "./memory-storage";
import { catchUp, checkinDay, drawerLede, forecastLead, headCopy, onTrackLine, paceLine, proseMinutes, progressLine, weekRecap, weeklyCheckin } from "./plan-copy";
import { recordPlanned, standing } from "./plan-progress";
import type { Availability, Forecast, Plan } from "./types";

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
});

const day = (date: string, minutes: number, sessions = 1) => ({
  date,
  weekday: "mon",
  off: false,
  minutes,
  windows: [],
  sessions: Array.from({ length: sessions }, (_, i) => ({ id: `${date}-${i}`, start_ms: 0, end_ms: 0, minutes, title: "", items: [] })),
});

function plan(o: Partial<Plan> = {}): Plan {
  return {
    version: 1,
    generated_ms: 0,
    tz: "UTC",
    start: "2026-11-15",
    end: "2026-12-14",
    interview_date: "2026-12-15",
    pace: { median_secs: {}, speed: { easy: 1, medium: 1, hard: 1 }, new_minutes: { easy: 15, medium: 25, hard: 40 }, best_hour: null },
    days: Array.from({ length: 30 }, (_, i) => day(`2026-11-${String(15 + i).padStart(2, "0")}`, 112)) as unknown as Plan["days"],
    forecast: [],
    summary: { days_left: 30, sessions: 30, minutes: 3360, reviews: 0, new: 0, drills: 0, mocks: 7, checkpoints: 0, on_track: true, behind: [], headline: "" },
    ...o,
  };
}

const evenings: Availability[] = [{ days: ["mon", "tue", "wed", "thu", "fri"], start: "19:00", end: "21:00" }];

describe("Plan copy", () => {
  it("writes a personal header from the plan", () => {
    const h = headCopy({ plan: plan(), company: "Meta", name: "Anirudh", windows: evenings, weekday: 60, weekend: 90, today: "2026-11-15" });
    expect(h.title).toBe("Your road to Meta, Anirudh");
    expect(h.lede).toBe(
      "30 days until your Meta interview on Dec 15. You'll practice about an hour on weekday evenings and a bit more on weekends, with mock interviews getting closer together toward the end, and the plan adjusts after every solve",
    );
    const none = headCopy({ plan: plan({ interview_date: null }), company: null, name: null, windows: [], today: "2026-11-15" });
    expect(none.title).toBe("Your next four weeks");
    expect(none.lede).toContain("and the plan adjusts after every solve. Keep building a steady practice routine, with reviews that help what you learn stick");
  });

  it("supports working toward a company without an interview date", () => {
    const h = headCopy({ plan: plan({ interview_date: null }), company: "Google", name: "Alex", windows: evenings, weekday: 60, today: "2026-11-15" });
    expect(h.title).toBe("Your road to Google, Alex");
    expect(h.lede).toContain("Your plan works toward Google through its practice set");
    expect(h.lede).not.toContain("days until");
  });

  it("names the mix of companies and focus topics", () => {
    const both = headCopy({ plan: plan({ interview_date: null }), company: "Stripe", companies: ["Stripe", "Ramp"], topics: ["graphs"], name: null, windows: evenings, weekday: 60, today: "2026-11-15" });
    expect(both.title).toBe("Your road to Stripe and Ramp");
    expect(both.lede).toMatch(/Your plan works through your Stripe and Ramp sets and puts extra time on graphs$/);
    const topics = headCopy({ plan: plan({ interview_date: null }), company: null, topics: ["graphs", "trees"], name: null, windows: evenings, weekday: 60, today: "2026-11-15" });
    expect(topics.title).toBe("Your next four weeks");
    expect(topics.lede).toMatch(/Your plan puts extra time on graphs and trees, with reviews that keep the rest fresh$/);
    const dated = headCopy({ plan: plan(), company: "Meta", topics: ["graphs"], name: null, windows: evenings, weekday: 60, today: "2026-11-15" });
    expect(dated.lede).toMatch(/^30 days until your Meta interview on Dec 15\. .* Extra time goes to graphs$/);
  });

  it("groups the forecast into one sentence", () => {
    const f = (behind: number) => ({ behind_by: behind, companies: ["Meta"] }) as Forecast;
    const forecast = [...Array.from({ length: 9 }, () => f(0)), ...Array.from({ length: 5 }, () => f(2))];
    expect(forecastLead({ forecast, date: "2026-12-15", companies: ["Meta"], weekday: 60, closeAll: 90 })).toBe(
      "At this pace you'll be ready for 9 of Meta's 14 core topics by Dec 15. Adding 30 min on weekdays gets you to all of them",
    );
    expect(forecastLead({ forecast: forecast.slice(0, 9), date: null, companies: [], weekday: 60, closeAll: null })).toBe(
      "At this pace you'll be ready for all 9 core topics in four weeks",
    );
  });

  it("talks about pace only once there's enough data", () => {
    const p = plan().pace;
    const targets = { easy: 15, medium: 25, hard: 40 };
    expect(paceLine({ ...p, sample: 2 }, targets)).toMatch(/^After a few more solves we'll size sessions to your own speed/);
    expect(paceLine({ ...p, sample: 8, median_secs: { medium: 22 * 60 } }, targets)).toBe("You solve mediums in about 22 minutes, a bit faster than the 25-minute target");
  });

  it("names the evenings you usually practice", () => {
    const cells: [number, number][] = [0, 1, 2, 3, 4].map((d) => [d, 40]);
    expect(drawerLede({ sessions: 5, cells, suggestion: null })).toBe("You've been solving weekday evenings around 8 pm, so we started there. Change anything and your plan reshapes as you go.");
  });

  it("counts days through the plan", () => {
    expect(progressLine("2026-11-12", "2026-12-12", "2026-11-15")).toEqual({ text: "Day 4 of 30 · 27 days to Dec 12", share: 4 / 30 });
  });

  it("records planned days and tells kept from missed", () => {
    recordPlanned(plan({ start: "2026-11-13", days: [day("2026-11-13", 60)] as never }));
    recordPlanned(plan({ start: "2026-11-14", days: [day("2026-11-14", 60)] as never }));
    // Solved on the 13th for 70 minutes; nothing on the 14th.
    const t = (h: number, m = 0) => new Date(2026, 10, 13, h, m).toISOString();
    const events = [
      { t: t(19), kind: "started", problem: "a", attempt: "x", mode: "practice" },
      { t: t(20, 10), kind: "passed", problem: "a", attempt: "x", mode: "practice" },
    ]
      .map((e) => JSON.stringify(e))
      .join("\n");
    const s = standing(plan(), events, new Date("2026-11-15T12:00:00"));
    expect(s.days.map((d) => d.status)).toEqual(["done", "missed"]);
    expect([s.kept, s.of]).toEqual([1, 2]);
    expect(onTrackLine(s, "2026-12-15")).toBe("You've kept one of your last two sessions, and you're right on pace for Dec 15");
    expect(onTrackLine(s, "2026-12-15", "Meta")).toBe("You've kept one of your last two sessions, and you're right on pace for Meta on Dec 15");
    expect(catchUp(s)?.title).toBe("Saturday's session didn't happen");
  });

  it("never counts a slipped day as kept, so the check-in and catch-up agree", () => {
    localStorage.setItem("myleet:plan-ledger", JSON.stringify({ "2026-11-12": { minutes: 60, sessions: 1 }, "2026-11-13": { minutes: 60, sessions: 1 } }));
    // Ten minutes on the 13th: under half the hour, so slipped and not kept.
    const t = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();
    const events = [
      { t: t(12, 19), kind: "opened", problem: "a", attempt: "x", mode: "practice" },
      { t: t(12, 19, 50), kind: "passed", problem: "a", attempt: "x", mode: "practice" },
      { t: t(13, 19), kind: "opened", problem: "b", attempt: "y", mode: "practice" },
      { t: t(13, 19, 5), kind: "gave_up", problem: "b", attempt: "y", mode: "practice" },
    ]
      .map((e) => JSON.stringify(e))
      .join("\n");
    const s = standing(plan(), events, new Date("2026-11-15T12:00:00"));
    expect([s.kept, s.of, s.slipped.length]).toEqual([1, 2, 1]);
    expect(onTrackLine(s, null)).toBe("You've kept one of your last two sessions, and you're on pace for the next four weeks");
    expect(weeklyCheckin({ standing: s, today: "2026-11-15", windows: [], topics: ["Opposite-End Pointers"], date: "2026-11-27", focus: "Stack Fundamentals" })?.body).toBe(
      "This week you kept one of two sessions. You moved forward on opposite-end pointers. You're on pace for Nov 27. Next week leans on stack fundamentals, the topic furthest behind. Keep this pace, add a little time, or shift the date if your interview moved",
    );
    expect(catchUp(s)?.body).toContain("spread those 50 minutes");
  });

  it("recaps the week with solves, clean passes and the best comeback", () => {
    const t = (d: number, h: number) => new Date(2026, 10, d, h).getTime();
    const line = (ms: number, kind: string, problem: string, attempt: string) => JSON.stringify({ t: new Date(ms).toISOString(), kind, problem, attempt, mode: "practice" });
    const events = [
      line(t(10, 19), "opened", "lswr", "a1"),
      line(t(10, 20), "gave_up", "lswr", "a1"),
      line(t(12, 19), "opened", "two", "a2"),
      line(t(12, 19) + 600_000, "passed", "two", "a2"),
      line(t(13, 19), "opened", "lswr", "a3"),
      line(t(13, 19) + 1_200_000, "passed", "lswr", "a3"),
    ].join("\n");
    const titles: Record<string, string> = { lswr: "Longest Substring", two: "Two Sum" };
    const r = weekRecap(events, "2026-11-15", (id) => titles[id] ?? null);
    expect(r).toEqual({ solved: 2, clean: 2, best: { title: "Longest Substring", days: 3 } });
    const s = { kept: 3, of: 4, run: 0, onPace: false, slipped: [], days: [{ date: "2026-11-13", status: "done", planned: 60, practised: 60, sessions: 4, kept: 3 }] } as never;
    expect(weeklyCheckin({ standing: s, today: "2026-11-15", windows: [], topics: [], date: null, recap: r })?.body).toBe(
      "This week you kept three of four sessions and solved two problems, all of them clean. Your best moment: Longest Substring, clean three days after it got the better of you! A few topics are behind. Keep this pace, add a little time, or adjust your practice schedule",
    );
    expect(proseMinutes(1)).toBe("1 minute");
    expect(proseMinutes(150)).toBe("about 3 hours");
  });

  it("checks in on Sunday unless you never practice then", () => {
    expect(checkinDay([])).toBe(0);
    expect(checkinDay([{ days: ["mon", "wed"], start: "19:00", end: "20:00" }])).toBe(1);
  });
});
