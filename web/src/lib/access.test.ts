import { describe, expect, it } from "vitest";
import { ACCESS, canUse, promptMode } from "./access";

describe("access", () => {
  it("lets guests use the core loop and keeps personal views and saving behind an account", () => {
    for (const f of ["learn", "companies", "solve", "notes", "diagnostic", "mock"] as const) expect(canUse(f, false)).toBe(true);
    for (const f of ["today", "build-plan", "progress", "save-plan", "calendar-sync", "save-mock", "pin-company", "asked-report"] as const) {
      expect(canUse(f, false)).toBe(false);
      expect(canUse(f, true)).toBe(true);
    }
  });

  it("gives every account feature a reason line", () => {
    for (const r of Object.values(ACCESS)) if (r.tier === "account") expect("reason" in r && r.reason.length > 0).toBe(true);
  });

  it("shows a sheet once per feature and never after a dismissal", () => {
    expect(promptMode("save-plan", true, [], false)).toBe("allow");
    expect(promptMode("save-plan", false, [], false)).toBe("sheet");
    expect(promptMode("save-plan", false, ["save-plan"], false)).toBe("link");
    expect(promptMode("save-mock", false, [], true)).toBe("link");
  });
});
