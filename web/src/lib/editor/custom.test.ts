import { describe, expect, it } from "vitest";
import { checkInput, customTest, describeType, parseLiteral, parseSignature, placeholderFor, readCases, supported } from "./custom";
import type { RunResult } from "../runner/types";

describe("custom input", () => {
  it("reads the function signature from the starter", () => {
    const sig = parseSignature("from typing import Optional\n\ndef two_sum(\n    nums: list[int],\n    target: int = 0,\n) -> list[int]:\n    raise NotImplementedError\n");
    expect(sig).toEqual({ kind: "function", name: "two_sum", params: [{ name: "nums", type: "list[int]" }, { name: "target", type: "int" }], returns: "list[int]" });
    expect(parseSignature("class LRUCache:\n    def __init__(self, capacity: int) -> None:\n        pass\n")).toEqual({ kind: "class", name: "LRUCache" });
  });

  it("parses Python literals", () => {
    expect(parseLiteral("[1, -2, 3.5]")).toEqual({ t: "list", v: [{ t: "int", v: 1 }, { t: "int", v: -2 }, { t: "float", v: 3.5 }] });
    expect(parseLiteral("(None, True, 'a')").t).toBe("tuple");
    expect(parseLiteral("{'a': 1}").t).toBe("dict");
    expect(parseLiteral("{1, 2}").t).toBe("set");
    expect(() => parseLiteral("[1, 2,")).toThrow();
  });

  it("explains a bad literal in the field's type", () => {
    expect(checkInput("[1, 2, 3]", "list[int]")).toBeNull();
    expect(checkInput("[1, 2,", "list[int]")).toBe("Expected a list of ints, got '[1, 2,'");
    expect(checkInput("['a']", "list[int]")).toBe("Expected a list of ints, got '['a']'");
    expect(checkInput("[[1, 2], [3]]", "list[list[int]]")).toBeNull();
    expect(checkInput("3", "float")).toBeNull();
    expect(checkInput("None", "TreeNode | None")).toBeNull();
    expect(checkInput("[1, None, 2]", "TreeNode | None")).toBeNull();
    expect(describeType("list[list[int]]")).toBe("a list of lists of ints");
  });

  it("knows which signatures it can build", () => {
    expect(supported({ kind: "function", name: "f", params: [{ name: "head", type: "ListNode | None" }], returns: "" })).toBe(true);
    expect(supported({ kind: "function", name: "f", params: [{ name: "reader", type: "ArrayReader" }], returns: "" })).toBe(false);
    expect(placeholderFor("list[list[int]]")).toBe("[[1, 2], [3, 4]]");
  });

  it("generates one test per case and reads the reports back", () => {
    const sig = parseSignature("def f(nums: list[int]) -> int:\n    pass\n")!;
    const src = customTest(sig, [["[1]"], ["[]"]]);
    expect(src).toContain("def test_case_0():");
    expect(src).toContain("def test_case_1():");
    const run: RunResult = {
      tests: [
        { name: "test_case_0", outcome: "failed", message: 'AssertionError: __MYLEET__{"value": "1", "error": null, "line": null, "ms": 0.1, "printed": "hi\\n"}', detail: "" },
        { name: "test_case_1", outcome: "error", message: "boom", detail: "" },
      ],
      passed: 0,
      total: 2,
      notStarted: false,
      timedOut: false,
      error: null,
      output: "",
      durationMs: 1,
    };
    const [a, b] = readCases(run, 2);
    expect(a).toEqual({ value: "1", error: null, line: null, ms: 0.1, printed: "hi\n" });
    expect(b?.error).toBe("boom");
  });
});
