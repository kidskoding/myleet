import { describe, expect, it } from "vitest";
import { isDue, keep, pstatus, statusTag, tally, textHit } from "./learn";
import type { State } from "./types";

const st = (p: Partial<State>): State => ({
  status: "learning", rung: 0, due_ms: null, last_ms: 1, first_ms: 1, attempts: 1, clean_passes: 1, fails: 0, hint_attempts: 0, best_secs: 60, ...p,
});
const NOW = 1_000_000;

describe("learn", () => {
  it("classifies mastered, climbing, started and unseen", () => {
    expect(pstatus(undefined)).toBe("unseen");
    expect(pstatus(st({ status: "mastered", rung: 4 }))).toBe("mastered");
    expect(pstatus(st({ rung: 2, status: "reviewing" }))).toBe("climbing");
    expect(pstatus(st({ rung: -1, clean_passes: 0 }))).toBe("started");
  });

  it("tallies a technique and counts due reviews", () => {
    const states = { a: st({ status: "mastered", rung: 4 }), b: st({ rung: 1, due_ms: NOW - 1 }), c: st({ rung: -1 }) };
    expect(tally(["a", "b", "c", "d"], states, NOW)).toEqual({ mastered: 1, climbing: 1, started: 1, total: 4, due: 1 });
  });

  it("tags rows and filters by mode", () => {
    const fell = st({ rung: 0, fails: 1, due_ms: NOW });
    expect(statusTag(fell, NOW)).toEqual(["due", "Review due, fell to 1 day"]);
    expect(statusTag(undefined, NOW)).toBeNull();
    expect(isDue(st({ rung: -1, due_ms: NOW }), NOW)).toBe(false);
    expect(keep("weak", fell, true, NOW)).toBe(true);
    expect(keep("weak", undefined, true, NOW)).toBe(false);
    expect(keep("new", undefined, false, NOW)).toBe(true);
  });

  it("finds filter text in a title", () => {
    expect(textHit("Two Sum", "sum")).toEqual([4, 7]);
    expect(textHit("Two Sum", "  ")).toBeNull();
  });
});
