import { describe, expect, it } from "vitest";
import { mockState } from "./mock-today";

const at = (h: number, m = 0) => new Date(2026, 10, 14, h, m).getTime();

describe("mockState", () => {
  const [s, e] = [at(18), at(19)];
  it("moves before, now, missed by clock time", () => {
    expect(mockState(at(17, 49), s, e, false)).toBe("before");
    expect(mockState(at(17, 50), s, e, false)).toBe("now");
    expect(mockState(at(18, 30), s, e, false)).toBe("now");
    expect(mockState(at(19), s, e, false)).toBe("missed");
  });
  it("done wins at any time", () => {
    expect(mockState(at(9), s, e, true)).toBe("done");
    expect(mockState(at(20), s, e, true)).toBe("done");
  });
});
