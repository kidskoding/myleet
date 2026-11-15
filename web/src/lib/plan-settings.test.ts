// The Plan page re-runs the wasm planner from settings; these check that each control
// the learner touches (budget, moves, days off, availability) reshapes the plan.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { memoryStorage } from "./memory-storage";
import { DEFAULT_PREFS, planSettings, readPrefs, updatePrefs } from "./prefs";
import { addMove, moveFor, toggleDayOff } from "./schedule";
import { ROOT } from "./test-util";
import { createTrainer } from "./trainer";

const t = createTrainer(readFileSync(join(ROOT, "public/data/catalog.json"), "utf8"), { module: readFileSync(join(ROOT, "src/wasm/myleet_wasm_bg.wasm")) });
const NOW = Date.parse("2026-11-14T14:00:00Z"); // Saturday 08:00 in Chicago
const TZ = "America/Chicago";
const WINDOWS = [
  { days: ["mon", "tue", "wed", "thu", "fri"] as const, start: "21:00", end: "22:30" },
  { days: ["tue", "thu"] as const, start: "19:00", end: "20:00" },
  { days: ["sat", "sun"] as const, start: "10:00", end: "12:30" },
].map((w) => ({ ...w, days: [...w.days] }));

const plan = () => t.plan("", planSettings(), { now: NOW, tz: TZ });
const day = (date: string) => plan().days.find((d) => d.date === date);

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
  updatePrefs({ ...DEFAULT_PREFS, plan: { ...DEFAULT_PREFS.plan, interviewDate: "2026-12-07", dailyMinutes: 60, availability: WINDOWS } }, { silent: true });
});

describe("plan re-runs from settings", () => {
  it("weekday and weekend budgets set each day's cap", () => {
    updatePrefs({ plan: { dailyMinutes: 90, weekendMinutes: 150 } }, { silent: true });
    expect(day("2026-11-16")?.cap).toBe(90);
    expect(day("2026-11-15")?.cap).toBe(150);
    expect(plan().days.every((d) => d.minutes <= d.cap || d.sessions.flatMap((s) => s.items).length === 1)).toBe(true);
  });

  it("a dragged session moves its time to the new window", () => {
    const tue = day("2026-11-17");
    const s = tue?.sessions[0];
    expect(s).toBeDefined();
    if (!s || !tue) return;
    const moves = addMove(readPrefs().plan.moves, moveFor(s, tue.date, "2026-11-19", 19 * 60), "2026-11-14");
    updatePrefs({ plan: { moves } }, { silent: true });
    const thu = day("2026-11-19");
    expect(thu?.sessions.some((x) => x.moved_from === "2026-11-17")).toBe(true);
    expect(thu?.windows.some((w) => w.start === "19:00")).toBe(true);
    expect(day("2026-11-17")?.cap).toBeLessThan(60);
  });

  it("a day off empties the day without overloading the others", () => {
    updatePrefs({ plan: { daysOff: toggleDayOff([], "2026-11-17", "2026-11-14") } }, { silent: true });
    const off = day("2026-11-17");
    expect(off?.off).toBe(true);
    expect(off?.sessions).toEqual([]);
    expect(plan().days.every((d) => d.minutes <= d.cap || d.sessions.flatMap((s) => s.items).length === 1)).toBe(true);
  });

  it("availability decides where sessions sit", () => {
    updatePrefs({ plan: { availability: [{ days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], start: "06:00", end: "07:30" }] } }, { silent: true });
    const first = plan().days.flatMap((d) => d.sessions)[0];
    expect(new Date(first?.start_ms ?? 0).getUTCHours()).toBe(12); // 06:00 Chicago
  });

  it("fixes name a weekday budget from the stepper", () => {
    updatePrefs({ plan: { dailyMinutes: 30, weekendMinutes: 60, companies: ["google"] } }, { silent: true });
    const f = t.planFixes("", planSettings(), { now: NOW, tz: TZ });
    for (const x of f.techniques) if (x.weekday_minutes !== null) expect([45, 60, 75, 90, 105, 120]).toContain(x.weekday_minutes);
    if (f.note) expect(f.note.title).toMatch(/^At 30 min on weekdays/);
  });

  it("items carry a tag, a reason and at most three chips", () => {
    updatePrefs({ plan: { companies: ["google"] } }, { silent: true });
    for (const it of plan().days.flatMap((d) => d.sessions).flatMap((s) => s.items)) {
      expect(it.reason.length).toBeGreaterThan(0);
      expect(["review", "weak", "new", "progress", "sharp", "mock", "check"]).toContain(it.tag);
      expect((it.chips ?? []).length).toBeLessThanOrEqual(3);
    }
  });
});
