import { describe, expect, it } from "vitest";
import {
  addPenalty,
  elapsedMs,
  formatClock,
  idleTimer,
  pauseTimer,
  restartTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  timerLabel,
  timerPhase,
} from "./timer";

const MIN = 60_000;
const TARGET = 25 * MIN;

describe("timer", () => {
  it("waits for the first keystroke", () => {
    const t = idleTimer();
    expect(elapsedMs(t, 1_000_000)).toBe(0);
    expect(timerPhase(t, 1_000_000, TARGET)).toBe("idle");
    expect(timerLabel(t, 0, TARGET)).toBe("of 25:00");
  });

  it("counts, excludes pauses, and stops at the finish", () => {
    let t = startTimer(idleTimer(), 0);
    expect(startTimer(t, 5000)).toBe(t);
    t = pauseTimer(t, 10 * MIN);
    expect(timerPhase(t, 12 * MIN, TARGET)).toBe("paused");
    expect(elapsedMs(t, 12 * MIN)).toBe(10 * MIN);
    t = resumeTimer(t, 15 * MIN);
    expect(elapsedMs(t, 16 * MIN)).toBe(11 * MIN);
    t = stopTimer(t, 20 * MIN);
    expect(elapsedMs(t, 99 * MIN)).toBe(15 * MIN);
    expect(pauseTimer(t, 30 * MIN)).toBe(t);
  });

  it("turns near at 80% and over past the target, with honest labels", () => {
    const t = startTimer(idleTimer(), 0);
    expect(timerPhase(t, 19 * MIN, TARGET)).toBe("calm");
    expect(timerPhase(t, 21 * MIN, TARGET)).toBe("near");
    expect(timerLabel(t, 21 * MIN, TARGET)).toBe("4 min left");
    expect(timerLabel(t, 24.5 * MIN, TARGET)).toBe("1 min left");
    expect(timerPhase(t, 27 * MIN + 40_000, TARGET)).toBe("over");
    expect(timerLabel(t, 27 * MIN + 40_000, TARGET)).toBe("2:40 over");
  });

  it("adds penalties and restarts to zero", () => {
    let t = addPenalty(startTimer(idleTimer(), 0), 2 * MIN);
    expect(elapsedMs(t, MIN)).toBe(3 * MIN);
    t = restartTimer();
    expect(elapsedMs(t, 50 * MIN)).toBe(0);
  });

  it("formats the clock", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(14 * MIN + 32_000)).toBe("14:32");
    expect(formatClock(62 * MIN + 3000)).toBe("1:02:03");
  });
});
