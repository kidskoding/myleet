import { describe, expect, it } from "vitest";
import {
  bestStreak,
  dueByDay,
  dueWithin,
  firstWhere,
  insights,
  milestoneList,
  monthGrid,
  monthLabels,
  orderMilestones,
  standing,
  streakReachedOn,
  stripDays,
  weekStarts,
  weeklyTable,
  type MilestoneFacts,
} from "./progress-view";
import type { State } from "./types";

const st = (p: Partial<State>): State => ({
  status: "unseen",
  rung: -1,
  due_ms: null,
  last_ms: null,
  first_ms: null,
  attempts: 0,
  clean_passes: 0,
  fails: 0,
  hint_attempts: 0,
  best_secs: null,
  ...p,
});

const heat = { "2026-11-01": 1, "2026-11-02": 2, "2026-11-03": 1, "2026-11-05": 1, "2026-11-06": 3 };

describe("standing", () => {
  it("splits mastered, climbing, started and unseen", () => {
    expect(standing(st({ status: "mastered", rung: 3 }))).toBe("mastered");
    expect(standing(st({ status: "reviewing", rung: 2 }))).toBe("climbing");
    expect(standing(st({ attempts: 2 }))).toBe("started");
    expect(standing(undefined)).toBe("unseen");
  });
});

describe("streaks", () => {
  it("finds the longest run and when a length was first reached", () => {
    expect(bestStreak(heat)).toBe(3);
    expect(streakReachedOn(heat, 3)).toBe("2026-11-03");
    expect(streakReachedOn(heat, 4)).toBeNull();
  });
  it("builds a 14-day strip ending today", () => {
    const s = stripDays(heat, "2026-11-06");
    expect(s).toHaveLength(14);
    expect(s.at(-1)).toEqual({ day: "2026-11-06", on: true });
    expect(s.at(-3)).toEqual({ day: "2026-11-04", on: false });
  });
});

describe("heatmap weeks", () => {
  it("ends with the Sunday-first week holding today", () => {
    const w = weekStarts("2026-11-14", 48);
    expect(w).toHaveLength(48);
    expect(w.at(-1)).toBe("2026-11-08");
    expect(new Date(`${w[0]}T12:00:00`).getDay()).toBe(0);
  });
  it("labels each new month once", () => {
    const labels = monthLabels(["2026-10-25", "2026-11-01", "2026-11-08"]);
    expect(labels.map(([i]) => i)).toEqual([1]);
  });
  it("sums weeks newest first", () => {
    const t = weeklyTable(heat, "2026-11-07", 2);
    expect(t[0]).toEqual({ from: "2026-11-01", solves: 8, days: 5 });
    expect(t[1]?.solves).toBe(0);
  });
});

describe("review calendar", () => {
  it("pads the first week so day 1 sits under its weekday", () => {
    const g = monthGrid(2026, 10);
    expect(g[0]).toBe("2026-11-01");
    expect(monthGrid(2026, 9).indexOf("2026-10-01")).toBe(4);
  });
  it("moves overdue reviews to today, most overdue first", () => {
    const at = (d: string) => new Date(`${d}T09:00:00`).getTime();
    const by = dueByDay(
      {
        a: st({ rung: 0, due_ms: at("2026-11-12") }),
        b: st({ rung: 1, due_ms: at("2026-11-10") }),
        c: st({ rung: 2, due_ms: at("2026-11-16") }),
        d: st({ rung: -1, due_ms: at("2026-11-14") }),
      },
      "2026-11-14",
    );
    expect(by.get("2026-11-14")?.map((x) => [x.id, x.overdue])).toEqual([
      ["b", 4],
      ["a", 2],
    ]);
    expect(dueWithin(by, "2026-11-14", 7)).toBe(3);
  });
});

describe("milestones", () => {
  it("binary-searches the first prefix that meets a condition", () => {
    expect(firstWhere(100, (i) => i >= 37)).toBe(37);
    expect(firstWhere(10, () => false)).toBeNull();
  });
  it("orders earned by date, then the two nearest as next", () => {
    const f: MilestoneFacts = {
      firstClean: { day: "2026-09-28", title: "Contains Duplicate" },
      firstMastered: null,
      masteredOn: { 50: null, 100: null, 250: null },
      mastered: 0,
      heat,
      streak: 2,
      best: 3,
      firstMock: null,
      core: { started: 12, total: 13, day: null },
      module: { title: "Arrays and hashing", mastered: 18, total: 50, day: null },
    };
    const list = orderMilestones(milestoneList(f));
    expect(list).toHaveLength(11);
    expect(list[0]).toMatchObject({ name: "First clean pass", label: "earned" });
    expect(list[1]).toMatchObject({ name: "Every core module started", label: "next", detail: "12 of 13 started" });
    expect(list.filter((m) => m.label === "next")).toHaveLength(2);
    expect(list.find((m) => m.name === "30-day streak")?.detail).toBe("After 7");
    expect(list.find((m) => m.name === "7-day streak")?.detail).toBe("5 days to go");
  });
});

describe("insights", () => {
  it("compares misses week over week with counts, and stays quiet with little data", () => {
    const now = new Date("2026-11-14T20:00:00");
    const day = 86_400_000;
    const mk = (daysAgo: number, clean: boolean) => {
      const end = now.getTime() - daysAgo * day;
      return { id: "", problem: "", mode: "practice", start: end, end, passed: true, gaveUp: false, hints: 0, peeks: 0, elapsedMs: 1, clean };
    };
    const atts = [...[1, 1, 2, 3, 4].map((d, i) => mk(d, i > 0)), ...[8, 9, 9, 10, 11].map((d, i) => mk(d, i > 2))];
    const out = insights(atts, now);
    expect(out[0]?.text).toBe("Not clean: **1 of 5 attempts** this week, down from 3 of 5 last week");
    expect(insights(atts.slice(0, 3), now)).toEqual([]);
  });
});
