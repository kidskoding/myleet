import { describe, expect, it } from "vitest";
import { featureGate, guestMode, resultsLine } from "./guest-gate";

const name = (t: string) => ({ a: "Arrays and hashing", w: "Sliding window", p: "Two pointers" })[t] ?? t;

describe("guest Today branch", () => {
  it("invites a guest who has not taken the diagnostic, including one who skipped it", () => {
    expect(guestMode(false, false)).toBe("invite");
  });
  it("shows results to a guest who finished it", () => {
    expect(guestMode(false, true)).toBe("results");
  });
  it("leaves a signed-in learner on the personal Today", () => {
    expect(guestMode(true, false)).toBe("member");
    expect(guestMode(true, true)).toBe("member");
  });
});

describe("resultsLine", () => {
  it("names the strongest, the fastest gain and what is next", () => {
    const items = [{ topic: "a", level: "strong" as const }, { topic: "w", level: "shaky" as const }, { topic: "p", level: "start here" as const }];
    expect(resultsLine(items, name)).toBe("You're solid on arrays and hashing, and sliding window is where you'll grow fastest. Two pointers is next");
  });
  it("copes with no strong or no weak topics", () => {
    expect(resultsLine([{ topic: "w", level: "start here" }], name)).toContain("sliding window is where we'll begin");
    expect(resultsLine([{ topic: "a", level: "strong" }], name)).toContain("most often in interviews");
  });
});

describe("guest Progress gate", () => {
  it("offers an account and the modules, never the diagnostic", () => {
    for (const done of [false, true]) {
      const out = String(featureGate("progress", done));
      expect(out).toContain("Create your free account");
      expect(out).toContain("Browse the modules");
      expect(out).not.toContain("/diagnostic");
    }
  });
});
