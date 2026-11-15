import { describe, expect, it } from "vitest";
import { doneToday, parseEvents, placementResults, runProgress } from "./attempts";
import { reminderDelay } from "./reminders";
import { addDays, localDay, streakNow } from "./streak";
import { dueLabel, fitBudget, greeting, reasonTag, weekStrip } from "./today";
import type { State } from "./types";

const line = (t: string, kind: string, problem: string, attempt: string, mode = "practice", data?: Record<string, string>) =>
  JSON.stringify({ t, kind, problem, attempt, mode, ...(data ? { data } : {}) });

describe("time budget", () => {
  const q = [
    { kind: "review" as const, id: "r1", secs: 1500 },
    { kind: "review" as const, id: "r2", secs: 1500 },
    { kind: "new" as const, id: "n1", secs: 1500 },
    { kind: "new" as const, id: "n2", secs: 1500 },
  ];
  const ids = (b: number | null) => fitBudget(q, b, (e) => e.secs).map((e) => e.id);
  it("drops new problems first, then the least overdue reviews", () => {
    expect(ids(null)).toEqual(["r1", "r2", "n1", "n2"]);
    expect(ids(3600)).toEqual(["r1", "r2"]);
    expect(ids(1800)).toEqual(["r1"]);
  });
  it("always keeps one problem", () => {
    expect(ids(60)).toEqual(["r1"]);
  });
});

describe("copy", () => {
  it("greets by local time", () => {
    expect(greeting(new Date(2026, 10, 14, 9), "Ani")).toBe("Good morning, Ani.");
    expect(greeting(new Date(2026, 10, 14, 19))).toBe("Good evening.");
    expect(greeting(new Date(2026, 10, 14, 23, 30), "Ani")).toBe("Late one, Ani.");
  });
  it("says why each row is on the list", () => {
    expect(reasonTag({ kind: "review", reason: null, overdue_days: 1 }, true)).toEqual(["due", "Review, due yesterday"]);
    expect(reasonTag({ kind: "new", reason: "weak spot", overdue_days: 0 })).toEqual(["weak", "Weak spot"]);
    expect(dueLabel(3)).toBe("due 3 days ago");
  });
});

describe("week strip", () => {
  it("counts overdue reviews on today and ignores unseen problems", () => {
    const now = new Date(2026, 10, 14, 12);
    const st = (dueDay: string, status: State["status"] = "learning"): State => ({
      status,
      rung: 0,
      due_ms: new Date(`${dueDay}T09:00:00`).getTime(),
      last_ms: null,
      first_ms: null,
      attempts: 1,
      clean_passes: 1,
      fails: 0,
      hint_attempts: 0,
      best_secs: null,
    });
    const today = localDay(now);
    const days = weekStrip({ a: st(addDays(today, -2)), b: st(today), c: st(addDays(today, 3)), d: st(today, "unseen") }, now);
    expect(days.map((d) => d.count)).toEqual([2, 0, 0, 1, 0, 0, 0]);
    expect(days[0]?.today).toBe(true);
  });
});

describe("attempts", () => {
  const ev = parseEvents(
    [
      line("2026-11-14T10:00:00Z", "opened", "two-sum", "a1"),
      line("2026-11-14T10:05:00Z", "passed", "two-sum", "a1", "practice", { elapsed_ms: "300000" }),
      line("2026-11-14T11:00:00Z", "opened", "valid-anagram", "a2"),
      line("2026-11-14T11:01:00Z", "hint_revealed", "valid-anagram", "a2"),
      line("2026-11-14T11:09:00Z", "passed", "valid-anagram", "a2", "practice", { elapsed_ms: "480000" }),
      line("2026-11-14T12:00:00Z", "opened", "binary-search", "p1", "placement"),
      line("2026-11-14T12:20:00Z", "passed", "binary-search", "p1", "placement", { elapsed_ms: "1200000" }),
      "not json",
    ].join("\n"),
  );

  it("lists today's finishes, clean or with help", () => {
    const done = doneToday(ev, () => 900, new Date("2026-11-14T15:00:00Z"));
    expect(done.map((d) => [d.problem, d.finish])).toEqual([
      ["valid-anagram", "assisted"],
      ["two-sum", "clean"],
    ]);
  });

  it("turns placement attempts into results, unfinished ones skipped", () => {
    const items = [
      { topic: "binary search", problem: "binary-search" },
      { topic: "trees", problem: "maximum-depth-of-binary-tree" },
    ];
    const r = placementResults(items, runProgress(ev, items.map((i) => i.problem), "placement"), () => 900);
    expect(r).toEqual([
      { topic: "binary search", problem: "binary-search", passed: true, hints: 0, over_time: true },
      { topic: "trees", problem: "maximum-depth-of-binary-tree", passed: false, skipped: true },
    ]);
  });
});

describe("exam attempts", () => {
  it("finish on Submit's test_run, the latest one deciding", () => {
    const ev = parseEvents(
      [
        line("2026-11-14T13:00:00Z", "opened", "two-sum", "c1", "checkpoint"),
        line("2026-11-14T13:10:00Z", "test_run", "two-sum", "c1", "checkpoint", { passed: "5", total: "6" }),
        line("2026-11-14T13:12:00Z", "test_run", "two-sum", "c1", "checkpoint", { passed: "6", total: "6" }),
        line("2026-11-14T13:20:00Z", "opened", "valid-anagram", "c2", "checkpoint"),
      ].join("\n"),
    );
    const [a, b] = runProgress(ev, ["two-sum", "valid-anagram"], "checkpoint");
    expect(a?.finished).toMatchObject({ passed: true, elapsedMs: 720_000 });
    expect(b).toMatchObject({ finished: null, started: true });
  });
});

describe("streak and reminders", () => {
  const now = new Date(2026, 10, 14, 21);
  it("lapses after a missed day and is at risk after 8 pm", () => {
    expect(streakNow({ n: 5, best: 5, last: localDay(now) }, now)).toEqual({ n: 5, solvedToday: true, atRisk: false });
    expect(streakNow({ n: 5, best: 5, last: addDays(localDay(now), -1) }, now)).toEqual({ n: 5, solvedToday: false, atRisk: true });
    expect(streakNow({ n: 5, best: 5, last: addDays(localDay(now), -2) }, now).n).toBe(0);
  });
  it("fires once a day, never after a solve", () => {
    const at = new Date(2026, 10, 14, 18);
    expect(reminderDelay(at, "19:00", false, null)).toBe(3_600_000);
    expect(reminderDelay(now, "19:00", false, null)).toBe(0);
    expect(reminderDelay(now, "19:00", true, null)).toBeNull();
    expect(reminderDelay(now, "19:00", false, localDay(now))).toBeNull();
  });
});
