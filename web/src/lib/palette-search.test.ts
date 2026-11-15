import { describe, expect, it } from "vitest";
import { highlight, matchToken, search, type PaletteItem } from "./palette-search";

const p = (title: string, hint = "", aliases: string[] = []): PaletteItem => ({ key: `p:${title}`, kind: "problem", title, hint, aliases });
const items: PaletteItem[] = [
  p("Longest Substring Without Repeating Characters", "Sliding window, Variable-size window", ["3"]),
  p("Sliding Window Maximum", "Sliding window, Window max and min", ["239"]),
  p("Two Sum II - Input Array Is Sorted", "Two pointers, Opposite-end pointers", ["167"]),
  p("Two Sum", "Arrays and hashing, Hashing", ["1"]),
  p("Longest Common Subsequence", "Dynamic programming, 2D DP", ["1143"]),
  { key: "n:var", kind: "note", title: "Variable-size sliding window", hint: "Note, Sliding window" },
  { key: "c:google", kind: "company", title: "Google", hint: "Big tech" },
  { key: "cmd:theme", kind: "command", title: "Switch to dark theme" },
];

const titles = (q: string, only?: PaletteItem["kind"]) => search(items, q, only).flatMap((g) => g.hits.map((h) => h.item.title));

describe("palette search", () => {
  it("puts title matches ahead of hint-only matches", () => {
    const r = titles("slid");
    expect(r[0]).toBe("Sliding Window Maximum");
    expect(r.indexOf("Sliding Window Maximum")).toBeLessThan(r.indexOf("Longest Substring Without Repeating Characters"));
  });

  it("prefers the exact and shorter title", () => {
    expect(titles("two sum")[0]).toBe("Two Sum");
  });

  it("finds a problem by its LeetCode number", () => {
    expect(titles("1")[0]).toBe("Two Sum");
    expect(titles("239")[0]).toBe("Sliding Window Maximum");
  });

  it("matches initials as a subsequence at word starts", () => {
    expect(titles("lcs")).toContain("Longest Common Subsequence");
    expect(matchToken("lcs", "Longest Common Subsequence")?.ranges).toEqual([
      [0, 1],
      [8, 9],
      [15, 16],
    ]);
  });

  it("groups by kind in a fixed order and filters by kind", () => {
    expect(search(items, "window").map((g) => g.kind)).toEqual(["problem", "note"]);
    expect(titles("window", "note")).toEqual(["Variable-size sliding window"]);
    expect(titles("dark")).toEqual(["Switch to dark theme"]);
  });

  it("returns nothing for a miss", () => {
    expect(search(items, "zzzz")).toEqual([]);
  });

  it("splits a title into marked parts", () => {
    expect(highlight("Two Sum", [[0, 3]])).toEqual([
      { text: "Two", mark: true },
      { text: " Sum", mark: false },
    ]);
  });
});
