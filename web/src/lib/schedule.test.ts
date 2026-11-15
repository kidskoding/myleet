import { describe, expect, it } from "vitest";
import {
  addMove,
  bands,
  cellsFromWindows,
  dropTarget,
  freeDrop,
  fmtM,
  midSentence,
  minuteAt,
  moveFor,
  presetOn,
  PRESETS,
  sittings,
  span,
  step,
  stepMove,
  toggleDayOff,
  windowsByDay,
  windowsFromCells,
  WEEKDAY_STEPS,
  yOf,
} from "./schedule";
import type { PlanSession } from "./types";

const H = 64;
const F = 28;

describe("time text", () => {
  it("reads like the design", () => {
    expect(span(21 * 60, 22 * 60 + 40)).toBe("9 to 10:40 pm");
    expect(span(10 * 60 + 30, 12 * 60 + 10)).toBe("10:30 am to 12:10 pm");
    expect([45, 60, 90, 100].map(fmtM)).toEqual(["45 min", "1 h", "1 h 30", "1 h 40"]);
  });
});

describe("week grid scale", () => {
  const bs = bands([
    [10 * 60, 12 * 60 + 30],
    [21 * 60, 22 * 60 + 30],
  ]);
  it("pads to hours and folds an empty gap of 3 h or more", () => {
    expect(bs).toEqual([
      { from: 600, to: 780, fold: false },
      { from: 780, to: 1260, fold: true },
      { from: 1260, to: 1380, fold: false },
    ]);
  });
  it("keeps short gaps open", () => {
    expect(bands([[19 * 60, 20 * 60], [21 * 60, 22 * 60]])).toEqual([{ from: 1140, to: 1320, fold: false }]);
  });
  it("maps minutes to y and back across a fold", () => {
    expect(yOf(600, bs, H, F)).toBe(0);
    expect(yOf(660, bs, H, F)).toBe(64);
    expect(yOf(1260, bs, H, F)).toBe(3 * 64 + 28);
    expect(yOf(1290, bs, H, F)).toBe(3 * 64 + 28 + 32);
    for (const m of [600, 700, 1260, 1350]) expect(Math.round(minuteAt(yOf(m, bs, H, F), bs, H, F))).toBe(m);
  });
});

describe("drag and keyboard moves", () => {
  const wins = [
    { start: 19 * 60, end: 20 * 60 },
    { start: 21 * 60, end: 22 * 60 + 30 },
  ];
  it("lands in the nearest window, snapped and kept inside it", () => {
    expect(dropTarget(wins, 19 * 60 + 2, 55)).toEqual({ win: wins[0], start: 19 * 60 });
    expect(dropTarget(wins, 21 * 60 + 47, 30)).toEqual({ win: wins[1], start: 21 * 60 + 45 });
    expect(dropTarget(wins, 23 * 60, 30)?.start).toBe(22 * 60);
    expect(dropTarget(wins, 21 * 60 + 10, 120)?.start).toBe(21 * 60);
    expect(dropTarget([], 600, 30)).toBeNull();
    // Today's windows that are already past are not targets.
    expect(dropTarget(wins, 19 * 60, 30, 20 * 60 + 30)?.win.end).toBe(22 * 60 + 30);
  });
  it("free drops snap to 15 minutes anywhere and only block real conflicts", () => {
    const day = { wins, busy: [{ start: 21 * 60, end: 21 * 60 + 30 }], off: false };
    expect(freeDrop(19 * 60 + 8, 30, day)).toEqual({ start: 19 * 60 + 15, outside: false, blocked: null });
    expect(freeDrop(7 * 60 + 2, 30, day)).toEqual({ start: 7 * 60, outside: true, blocked: null });
    expect(freeDrop(21 * 60 + 20, 30, day).blocked).toBe("overlap");
    expect(freeDrop(19 * 60, 30, { ...day, notBefore: 19 * 60 + 10 }).blocked).toBe("past");
    expect(freeDrop(19 * 60, 30, { ...day, off: true }).blocked).toBe("off");
    expect(freeDrop(23 * 60 + 50, 30, day).start).toBe(23 * 60 + 30);
  });
  it("arrows skip windowless days and wrap through a day's windows", () => {
    const days = [[wins[0]!], [], [wins[0]!, wins[1]!]];
    expect(stepMove({ day: 0, win: 0 }, "ArrowRight", days)).toEqual({ day: 2, win: 0 });
    expect(stepMove({ day: 2, win: 0 }, "ArrowUp", days)).toEqual({ day: 2, win: 1 });
    expect(stepMove({ day: 2, win: 1 }, "ArrowDown", days)).toEqual({ day: 2, win: 0 });
    expect(stepMove({ day: 0, win: 0 }, "ArrowLeft", days)).toEqual({ day: 0, win: 0 });
  });
  it("records moves without chaining and drops past ones", () => {
    const s = { start_ms: new Date("2026-11-17T21:00:00").getTime(), end_ms: new Date("2026-11-17T21:55:00").getTime() } as PlanSession;
    const m1 = moveFor(s, "2026-11-17", "2026-11-19", 19 * 60);
    expect(m1).toEqual({ from: "2026-11-17", from_start: "21:00", to: "2026-11-19", to_start: "19:00", minutes: 55 });
    const moved = { start_ms: new Date("2026-11-19T19:00:00").getTime(), end_ms: new Date("2026-11-19T19:55:00").getTime() } as PlanSession;
    const again = addMove([m1], moveFor(moved, "2026-11-19", "2026-11-20", 21 * 60), "2026-11-14");
    expect(again).toEqual([{ ...m1, to: "2026-11-20", to_start: "21:00" }]);
    // Moving it back home clears the move.
    const home = addMove([m1], moveFor(moved, "2026-11-19", "2026-11-17", 21 * 60), "2026-11-14");
    expect(home).toEqual([]);
    expect(addMove([{ ...m1, to: "2026-11-01" }], m1, "2026-11-14")).toEqual([m1]);
  });
  it("toggles days off", () => {
    expect(toggleDayOff(["2026-11-01", "2026-11-20"], "2026-11-17", "2026-11-14")).toEqual(["2026-11-17", "2026-11-20"]);
    expect(toggleDayOff(["2026-11-17"], "2026-11-17", "2026-11-14")).toEqual([]);
  });
  it("steps budgets and snaps odd values", () => {
    expect(step(WEEKDAY_STEPS, 60, 1)).toBe(75);
    expect(step(WEEKDAY_STEPS, 70, -1)).toBe(60);
    expect(step(WEEKDAY_STEPS, 120, 1)).toBe(120);
    expect(step(WEEKDAY_STEPS, 30, -1)).toBe(30);
  });
});

describe("availability painter", () => {
  it("round-trips windows through cells and merges days with the same run", () => {
    const ws = [
      { days: ["mon", "tue", "wed", "thu", "fri"] as const, start: "21:00", end: "22:30" },
      { days: ["sat"] as const, start: "10:00", end: "12:00" },
    ].map((w) => ({ ...w, days: [...w.days] }));
    const cells = cellsFromWindows(ws);
    expect(cells.size).toBe(5 * 3 + 4);
    expect(windowsFromCells(cells)).toEqual(ws);
    cells.delete("2:28"); // Wednesday 21:00
    const back = windowsFromCells(cells);
    expect(back.find((w) => w.days.includes("wed"))).toEqual({ days: ["wed"], start: "21:30", end: "22:30" });
    expect(windowsByDay(back)[2]).toBe("9:30 to 10:30 pm");
    expect(windowsByDay(back)[6]).toBe("");
  });
  it("paints to midnight and knows which presets are on", () => {
    const late = windowsFromCells(cellsFromWindows([{ days: ["fri"], start: "23:00", end: "24:00" }]));
    expect(late).toEqual([{ days: ["fri"], start: "23:00", end: "24:00" }]);
    const on = cellsFromWindows(PRESETS[1]!.windows);
    expect(presetOn(on, PRESETS[1]!.windows)).toBe(true);
    expect(presetOn(on, PRESETS[0]!.windows)).toBe(false);
  });
});

describe("mid-sentence titles", () => {
  it("lowercases title-case words and keeps acronyms", () => {
    expect(["Merge And Split", "Grid DFS", "Top-K", "Kadane"].map(midSentence)).toEqual(["merge and split", "grid DFS", "top-K", "Kadane"]);
  });
});

describe("sittings", () => {
  it("groups attempts closer than 45 minutes", () => {
    const m = 60_000;
    const s = sittings([
      { start: 0, end: 10 * m },
      { start: 20 * m, end: 30 * m },
      { start: 120 * m, end: 130 * m },
      { start: 5 * m, end: null },
    ]);
    expect(s.map((x) => [x.start, x.end, x.items.length])).toEqual([
      [0, 30 * m, 2],
      [120 * m, 130 * m, 1],
    ]);
  });
});
