import { describe, expect, it } from "vitest";
import { diffLines, diffStats, sideBySide } from "./diff";

const mine = "seen = set(nums)\nbest = 1\nfor n in seen:\n    best = max(best, 1)\nreturn best\n";
const ref = "seen = set(nums)\nlongest = 0\nfor n in seen:\n    longest = max(longest, 1)\nreturn longest\n";

describe("diff", () => {
  it("finds the changed lines", () => {
    const ops = diffLines(mine, ref);
    expect(ops.filter((o) => o.kind === "same").map((o) => o.text)).toEqual(["seen = set(nums)", "for n in seen:"]);
    expect(diffStats(ops)).toEqual({ added: 3, removed: 3 });
  });

  it("is empty of changes for equal text and handles one empty side", () => {
    expect(diffLines(mine, mine).every((o) => o.kind === "same")).toBe(true);
    expect(diffStats(diffLines("", "a\nb\n"))).toEqual({ added: 2, removed: 1 });
  });

  it("pairs deletions with additions side by side", () => {
    const rows = sideBySide(diffLines(mine, ref));
    expect(rows).toHaveLength(5);
    expect(rows[1]).toEqual({ left: { text: "best = 1", kind: "del" }, right: { text: "longest = 0", kind: "add" } });
    const uneven = sideBySide(diffLines("a\nb\nc\n", "a\nc\nd\ne\n"));
    expect(uneven.map((r) => [r.left?.text ?? null, r.right?.text ?? null])).toEqual([
      ["a", "a"],
      ["b", null],
      ["c", "c"],
      [null, "d"],
      [null, "e"],
    ]);
  });
});
