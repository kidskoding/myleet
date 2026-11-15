import { beforeEach, describe, expect, it } from "vitest";
import { memoryStorage } from "./memory-storage";
import { catchUp, checkinDay, drawerLede, forecastLead, headCopy, onTrackLine, paceLine, progressLine } from "./plan-copy";
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
      "30 days until your Meta interview on Dec 15. You'll practice about an hour on weekday evenings and a bit more on weekends, with mock interviews getting closer together toward the end, and the plan adjusts after every solve.",
    );
    const none = headCopy({ plan: plan({ interview_date: null }), company: null, name: null, windows: [], today: "2026-11-15" });
    expect(none.title).toBe("Your next four weeks");
    expect(none.lede).toContain("and the plan adjusts after every solve. Add an interview date whenever you have one and we'll pace everything toward it.");
  });

  it("groups the forecast into one sentence", () => {
    const f = (behind: number) => ({ behind_by: behind, companies: ["Meta"] }) as Forecast;
    const forecast = [...Array.from({ length: 9 }, () => f(0)), ...Array.from({ length: 5 }, () => f(2))];
    expect(forecastLead({ forecast, date: "2026-12-15", companies: ["Meta"], weekday: 60, closeAll: 90 })).toBe(
      "At this pace you'll be ready for 9 of Meta's 14 core topics by Dec 15. Adding 30 min on weekdays gets you to all of them.",
    );
    expect(forecastLead({ forecast: forecast.slice(0, 9), date: null, companies: [], weekday: 60, closeAll: null })).toBe(
      "At this pace you'll be ready for all 9 core topics in four weeks.",
    );
  });

  it("talks about pace only once there's enough data", () => {
    const p = plan().pace;
    const targets = { easy: 15, medium: 25, hard: 40 };
    expect(paceLine({ ...p, sample: 2 }, targets)).toMatch(/^After a few more solves we'll size sessions to your own speed/);
    expect(paceLine({ ...p, sample: 8, median_secs: { medium: 22 * 60 } }, targets)).toBe("You solve mediums in about 22 minutes, a bit faster than the 25-minute target.");
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
    expect(onTrackLine(s, "2026-12-15")).toBe("You've kept one of your last two sessions, and you're right on pace for Dec 15.");
    expect(onTrackLine(s, "2026-12-15", "Meta")).toBe("You've kept one of your last two sessions, and you're right on pace for Meta on Dec 15.");
    expect(catchUp(s)?.title).toBe("Saturday's session didn't happen");
  });

  it("checks in on Sunday unless you never practice then", () => {
    expect(checkinDay([])).toBe(0);
    expect(checkinDay([{ days: ["mon", "wed"], start: "19:00", end: "20:00" }])).toBe(1);
  });
});
