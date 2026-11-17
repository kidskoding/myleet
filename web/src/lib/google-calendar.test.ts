// Changes made in Google Calendar come back as the same moves and skips a drag on Plan
// makes, and busy time goes to the planner, which then never plans over it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { mergeGoogle, upcoming } from "./google-calendar";
import { memoryStorage } from "./memory-storage";
import { DEFAULT_PREFS, planSettings, updatePrefs } from "./prefs";
import { ROOT } from "./test-util";
import { createTrainer } from "./trainer";
import type { Plan, PlanDay, PlanSession } from "./types";

// Local times, so the moves read the same in any test time zone.
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m).getTime();

function session(id: string, start: number, minutes: number): PlanSession {
  return { id, start_ms: start, end_ms: start + minutes * 60_000, minutes, title: "1 review", items: [] };
}

function day(date: string, sessions: PlanSession[], cap = 60): PlanDay {
  return { date, weekday: "tue", rest: !sessions.length, minutes: sessions.reduce((n, s) => n + s.minutes, 0), sessions, cap, off: false, windows: [] };
}

const tue1 = session("2026-11-17-1", at(17, 19), 45);
const tue2 = session("2026-11-17-2", at(17, 20), 15);
const plan = { start: "2026-11-14", days: [day("2026-11-17", [tue1, tue2])] } as unknown as Plan;
const empty = { moves: [], dayMinutes: [], busy: [] };

describe("Google changes merge into the plan settings", () => {
  it("nothing changed is no patch", () => {
    expect(mergeGoogle({ connected: true, moves: [], skips: [], busy: [] }, plan, empty)).toBeNull();
  });

  it("a moved event becomes a move to its new day and time", () => {
    const to = at(19, 7, 30);
    const p = mergeGoogle({ connected: true, moves: [{ key: "k", from_start_ms: tue1.start_ms, from_end_ms: tue1.end_ms, to_start_ms: to, to_end_ms: to + 45 * 60_000 }] }, plan, empty);
    expect(p?.moves).toEqual([{ from: "2026-11-17", from_start: "19:00", to: "2026-11-19", to_start: "07:30", minutes: 45 }]);
    expect(p?.dayMinutes).toEqual([]);
  });

  it("a deleted event skips its session: the day loses those minutes", () => {
    const p = mergeGoogle({ connected: true, skips: [{ key: "k", start_ms: tue2.start_ms, end_ms: tue2.end_ms }] }, plan, empty);
    expect(p?.dayMinutes).toEqual([{ date: "2026-11-17", minutes: 45 }]);
    const both = mergeGoogle({ connected: true, skips: [tue1, tue2].map((s) => ({ key: s.id, start_ms: s.start_ms, end_ms: s.end_ms })) }, plan, empty);
    expect(both?.dayMinutes).toEqual([{ date: "2026-11-17", minutes: 0 }]);
  });

  it("a change to a session the plan no longer has is left alone", () => {
    const gone = at(18, 9);
    expect(mergeGoogle({ connected: true, skips: [{ key: "k", start_ms: gone, end_ms: gone + 1 }], moves: [{ key: "k", from_start_ms: gone, from_end_ms: gone + 1, to_start_ms: at(19, 9), to_end_ms: at(19, 10) }] }, plan, empty)).toBeNull();
  });

  it("busy time replaces what was known, and is kept when the answer has none", () => {
    const busy = [{ start_ms: at(17, 19), end_ms: at(17, 20) }];
    expect(mergeGoogle({ connected: true, busy }, plan, empty)?.busy).toEqual(busy);
    expect(mergeGoogle({ connected: true, busy }, plan, { ...empty, busy })).toBeNull();
    expect(mergeGoogle({ connected: true }, plan, { ...empty, busy })).toBeNull();
    const whole = [{ start_ms: at(17, 0), end_ms: at(17, 0) + 28 * 86_400_000 }];
    expect(mergeGoogle({ connected: true, busy_complete: false, busy: whole }, plan, { ...empty, busy })).toBeNull();
  });

  it("only sessions that haven't started and fall in the next four weeks go out", () => {
    const far = session("far", at(17, 19) + 29 * 86_400_000, 30);
    const p = { ...plan, days: [day("2026-11-17", [tue1, tue2, far])] } as Plan;
    expect(upcoming(p, at(17, 19, 30)).map((s) => s.id)).toEqual(["2026-11-17-2"]);
  });
});

describe("busy time reaches the planner", () => {
  const t = createTrainer(readFileSync(join(ROOT, "public/data/catalog.json"), "utf8"), { module: readFileSync(join(ROOT, "src/wasm/myleet_wasm_bg.wasm")) });
  const NOW = Date.parse("2026-11-14T14:00:00Z");
  const run = () => t.plan("", planSettings(), { now: NOW, tz: "America/Chicago" });

  beforeEach(() => {
    (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
    updatePrefs({ ...DEFAULT_PREFS, plan: { ...DEFAULT_PREFS.plan, dailyMinutes: 60, availability: [{ days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], start: "19:00", end: "21:00" }] } }, { silent: true });
  });

  it("no session overlaps a meeting, and a fully busy stretch plans nothing", () => {
    const tue = run().days.find((d) => d.date === "2026-11-17");
    const first = tue?.sessions[0];
    expect(first).toBeDefined();
    if (!first) return;
    const meeting = { start_ms: first.start_ms, end_ms: first.start_ms + 60 * 60_000 };
    updatePrefs({ plan: { busy: [meeting] } }, { silent: true });
    const after = run().days.flatMap((d) => d.sessions);
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((s) => s.end_ms <= meeting.start_ms || s.start_ms >= meeting.end_ms)).toBe(true);
    updatePrefs({ plan: { busy: [{ start_ms: NOW, end_ms: NOW + 28 * 86_400_000 }] } }, { silent: true });
    expect(run().days.flatMap((d) => d.sessions).filter((s) => s.start_ms < NOW + 28 * 86_400_000)).toEqual([]);
  });
});
