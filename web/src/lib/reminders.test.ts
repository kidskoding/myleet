import { describe, expect, it } from "vitest";
import { inQuiet, nextSessionReminder } from "./reminders";

const at = (h: number, m = 0) => new Date(2026, 10, 14, h, m).getTime();
const o = { lead: 15, quietFrom: "23:00", quietTo: "08:00", sent: [] as number[] };

describe("session reminders", () => {
  it("fires lead minutes before the next session ahead", () => {
    const r = nextSessionReminder(new Date(at(20)), [{ start_ms: at(21), title: "3 reviews, 1 new", minutes: 60 }], o);
    expect(r?.delay).toBe(45 * 60_000);
    expect(r?.body).toMatch(/^Session at 9\s?PM: 3 reviews, 1 new\. About 1 h\.$/i);
  });
  it("skips past, already-sent and quiet-hour sessions", () => {
    const now = new Date(at(20));
    expect(nextSessionReminder(now, [{ start_ms: at(19), title: "x", minutes: 30 }], o)).toBeNull();
    expect(nextSessionReminder(now, [{ start_ms: at(21), title: "x", minutes: 30 }], { ...o, sent: [at(21)] })).toBeNull();
    expect(nextSessionReminder(now, [{ start_ms: at(23, 30), title: "x", minutes: 30 }], o)).toBeNull();
    expect(nextSessionReminder(now, [{ start_ms: at(23, 30), title: "late", minutes: 90 }, { start_ms: at(21), title: "first", minutes: 30 }], o)?.body).toContain("first");
  });
  it("quiet hours wrap midnight", () => {
    expect(inQuiet(new Date(at(23, 30)), "23:00", "08:00")).toBe(true);
    expect(inQuiet(new Date(at(7)), "23:00", "08:00")).toBe(true);
    expect(inQuiet(new Date(at(12)), "23:00", "08:00")).toBe(false);
    expect(inQuiet(new Date(at(13)), "12:00", "14:00")).toBe(true);
  });
});
