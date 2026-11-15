import { describe, expect, it } from "vitest";
import { countLines, recentMonths } from "./reports";

describe("reports", () => {
  it("names companies by their playlist title and skips unknown ones", () => {
    const playlists = [{ id: "001_google", title: "Google" }, { id: "015_x", title: "X" }];
    expect(countLines([{ company: "google", count: 5 }, { company: "gone", count: 4 }, { company: "x", count: 3 }], playlists)).toEqual([
      { company: "google", text: "Reported by 5 people at Google" },
      { company: "x", text: "Reported by 3 people at X" },
    ]);
  });

  it("lists recent months newest first, across a year boundary", () => {
    const months = recentMonths(new Date(2026, 1, 15), 3);
    expect(months.map((m) => m.value)).toEqual(["2026-02", "2026-01", "2025-12"]);
    expect(months[2]?.label).toBe("December 2025");
  });
});
