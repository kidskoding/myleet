import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "../test-util";
import { createTrainer } from "../trainer";
import { Attempt } from "./attempt";
import type { Mode } from "../types";

const t = createTrainer(readFileSync(join(ROOT, "public/data/catalog.json"), "utf8"), { module: readFileSync(join(ROOT, "src/wasm/myleet_wasm_bg.wasm")) });
const P = "longest-consecutive-sequence";
const DAY = 86_400_000;

function harness(mode: Mode = "practice", start = Date.parse("2026-11-14T15:00:00Z"), events = "") {
  let clock = start;
  const store = { text: events };
  const a = new Attempt(P, mode, {
    eventLine: (e) => t.eventLine(e),
    newAttemptId: () => t.newAttemptId(),
    append: async (line) => (store.text += `${line}\n`),
    now: () => clock,
  });
  return {
    a,
    store,
    advance: (ms: number) => (clock += ms),
    kinds: () => store.text.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as { kind: string; data?: Record<string, string>; mode: string }),
    state: () => t.states(store.text, "UTC")[P],
  };
}

describe("attempt recording", () => {
  it("records opened once, then test_run and passed with elapsed_ms on a green Submit", async () => {
    const h = harness();
    await h.a.open();
    await h.a.open();
    h.advance(60_000);
    expect(await h.a.submit(6, 6, 60_000)).toBe(true);
    expect(h.kinds().map((e) => e.kind)).toEqual(["opened", "test_run", "passed"]);
    expect(h.kinds()[1]?.data).toEqual({ passed: "6", total: "6" });
    expect(h.kinds()[2]?.data).toEqual({ elapsed_ms: "60000" });
    expect(h.state()).toMatchObject({ rung: 0, clean_passes: 1, attempts: 1 });
  });

  it("climbs a rung after a clean pass on a later day, and falls after a hint", async () => {
    const first = harness();
    await first.a.submit(6, 6, 60_000);
    const later = harness("practice", Date.parse("2026-11-14T15:00:00Z") + 2 * DAY, first.store.text);
    await later.a.submit(6, 6, 60_000);
    expect(later.state()?.rung).toBe(1);
    const third = harness("practice", Date.parse("2026-11-14T15:00:00Z") + 6 * DAY, later.store.text);
    await third.a.hint();
    expect(third.a.assisted).toBe(true);
    await third.a.submit(6, 6, 60_000);
    expect(third.state()?.rung).toBe(0);
    expect(third.state()?.hint_attempts).toBe(1);
  });

  it("treats overtime as not clean", async () => {
    const first = harness();
    await first.a.submit(6, 6, 60_000);
    const later = harness("practice", Date.parse("2026-11-16T15:00:00Z"), first.store.text);
    await later.a.submit(6, 6, 30 * 60_000);
    expect(later.state()?.rung).toBe(0);
  });

  it("records a confirmed failing Submit as a miss, and a give-up", async () => {
    const h = harness();
    await h.a.submitFailing(4, 6);
    expect(h.kinds().map((e) => e.kind)).toEqual(["opened", "test_run", "gave_up"]);
    expect(h.kinds()[2]?.data).toEqual({ reason: "failed_submit" });
    expect(h.state()?.fails).toBe(1);
    const g = harness();
    await g.a.giveUp();
    await g.a.giveUp();
    expect(g.kinds().map((e) => e.kind)).toEqual(["opened", "gave_up"]);
  });

  it("records peeks, say-aloud and restarts, and left only for an opened unfinished attempt", async () => {
    const h = harness();
    await h.a.leave();
    expect(h.store.text).toBe("");
    await h.a.peek();
    await h.a.sayAloud("complexity");
    await h.a.restart();
    await h.a.leave();
    expect(h.kinds().map((e) => e.kind)).toEqual(["opened", "solution_peeked", "say_aloud_checked", "timer_restarted", "left"]);
    expect(h.kinds()[2]?.data).toEqual({ item: "complexity" });
    expect(h.a.peeks + h.a.restarts).toBe(2);
  });

  it("never records passed, gave_up, left, peeks or restarts in exam modes", async () => {
    for (const mode of ["interview", "placement", "checkpoint"] as Mode[]) {
      const h = harness(mode);
      await h.a.hint(120_000);
      await h.a.peek();
      await h.a.restart();
      expect(await h.a.submit(6, 6, 60_000)).toBe(false);
      await h.a.giveUp();
      await h.a.leave();
      expect(h.kinds().map((e) => e.kind)).toEqual(["opened", "hint_revealed", "test_run"]);
      expect(h.kinds().every((e) => e.mode === mode)).toBe(true);
      expect(h.kinds()[1]?.data).toEqual({ penalty_ms: "120000" });
    }
  });

  it("drills record a pass without moving the ladder", async () => {
    const first = harness();
    await first.a.submit(6, 6, 60_000);
    const drill = harness("drill", Date.parse("2026-11-16T15:00:00Z"), first.store.text);
    await drill.a.submit(6, 6, 60_000);
    expect(drill.state()?.rung).toBe(0);
    expect(drill.state()?.attempts).toBe(2);
  });
});
