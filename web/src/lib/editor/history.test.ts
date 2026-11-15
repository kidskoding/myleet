import { describe, expect, it } from "vitest";
import { attemptsFor, eventsThrough, outcomeTag } from "./history";

const line = (t: string, kind: string, attempt: string, data?: Record<string, string>, problem = "p") =>
  JSON.stringify({ t, kind, problem, attempt, mode: "practice", ...(data ? { data } : {}) });

const events = [
  line("2026-11-10T10:00:00Z", "opened", "a"),
  line("2026-11-10T10:00:30Z", "opened", "x", undefined, "other"),
  line("2026-11-10T10:05:00Z", "hint_revealed", "a"),
  line("2026-11-10T10:10:00Z", "test_run", "a", { passed: "6", total: "6" }),
  line("2026-11-10T10:10:00Z", "passed", "a", { elapsed_ms: "600000" }),
  line("2026-11-12T09:00:00Z", "opened", "b"),
  line("2026-11-12T09:20:00Z", "test_run", "b", { passed: "4", total: "6" }),
  line("2026-11-12T09:20:01Z", "gave_up", "b", { reason: "failed_submit" }),
  line("2026-11-13T09:00:00Z", "opened", "c"),
  "not json",
].join("\n");

describe("history", () => {
  it("summarises attempts newest first", () => {
    const list = attemptsFor(events, "p");
    expect(list.map((a) => a.id)).toEqual(["c", "b", "a"]);
    expect(list[2]).toMatchObject({ outcome: "passed", hints: 1, elapsedMs: 600000, lastRun: { passed: 6, total: 6 } });
    expect(list[1]).toMatchObject({ outcome: "missed", lastRun: { passed: 4, total: 6 } });
    expect(list[0]?.outcome).toBe("open");
  });

  it("tags outcomes honestly", () => {
    const [c, b, a] = attemptsFor(events, "p");
    expect(outcomeTag(a!, 1_500_000)).toEqual({ text: "Hint used", tone: "due" });
    expect(outcomeTag(b!, 1_500_000)).toEqual({ text: "Missed, 4 of 6", tone: "fail" });
    expect(outcomeTag(c!, 1_500_000)).toEqual({ text: "In progress", tone: "progress" });
  });

  it("cuts the events after an attempt's end", () => {
    const a = attemptsFor(events, "p")[2]!;
    expect(eventsThrough(events, a).trim().split("\n")).toHaveLength(5);
  });
});
