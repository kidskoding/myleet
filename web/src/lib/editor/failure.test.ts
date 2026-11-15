import { describe, expect, it } from "vitest";
import type { TestResult } from "../runner/types";
import { capturedOutput, chipText, parseFailure, returnLine, tracebackLine } from "./failure";

const code = [
  "def longest_consecutive(nums: list[int]) -> int:",
  "    seen = set(nums)",
  "    best = 1",
  "    for n in seen:",
  "        def helper(x):",
  "            return x",
  "        best = max(best, helper(n))",
  "    return best",
  "",
].join("\n");

const wrong: TestResult = {
  name: "test_longest_consecutive_empty",
  outcome: "failed",
  message: "assert 1 == 0",
  detail: [
    "def test_longest_consecutive_empty():",
    ">       assert longest_consecutive([]) == 0",
    "E       assert 1 == 0",
    "E        +  where 1 = longest_consecutive([])",
    "",
    "test_problem.py:9: AssertionError",
  ].join("\n"),
};

const raised: TestResult = {
  name: "test_longest_consecutive_normal",
  outcome: "failed",
  message: "IndexError: list index out of range",
  detail: [
    ">       assert longest_consecutive([1]) == 1",
    "test_problem.py:5: ",
    "_ _ _ _",
    "solution.py:3: in longest_consecutive",
    "    return helper(nums)",
    "_ _ _ _",
    "    def helper(n):",
    ">       return n[5] + 1",
    "E       IndexError: list index out of range",
    "",
    "solution.py:6: IndexError",
  ].join("\n"),
};

const output = [
  "=================================== FAILURES ===================================",
  "_______________________ test_longest_consecutive_normal ________________________",
  "",
  "solution.py:6: IndexError",
  "----------------------------- Captured stdout call -----------------------------",
  "hi [1]",
  "seen 1",
  "________________________ test_longest_consecutive_empty ________________________",
  "test_problem.py:9: AssertionError",
  "=========================== short test summary info ============================",
].join("\n");

describe("failure parsing", () => {
  it("marks the return that produced a wrong answer, with the chip text", () => {
    const f = parseFailure(wrong, output, code);
    expect(f).toMatchObject({ got: "1", expected: "0", input: "longest_consecutive([])", line: 8, fromTraceback: false, printed: "" });
    expect(chipText(f)).toBe("returned 1 for [], expected 0");
  });

  it("marks the innermost solution.py frame of an exception", () => {
    const f = parseFailure(raised, output, code);
    expect(f.line).toBe(6);
    expect(f.fromTraceback).toBe(true);
    expect(f.error).toBe("IndexError: list index out of range");
    expect(f.printed).toBe("hi [1]\nseen 1");
    expect(chipText(f)).toBe("IndexError: list index out of range");
  });

  it("reads `is` assertions as wrong answers", () => {
    const t = { ...wrong, message: "assert True is False", detail: ">       assert longest_consecutive('', '') is False\nE       AssertionError: assert True is False\nE        +  where True = longest_consecutive('', '')" };
    const f = parseFailure(t, "", code);
    expect(chipText(f)).toBe("returned True for '', '', expected False");
    expect(f.line).toBe(8);
  });

  it("reads syntax errors from the import traceback", () => {
    expect(tracebackLine('E     File "/run/solution.py", line 4\nE   SyntaxError: invalid syntax')).toBe(4);
  });

  it("skips nested defs when finding the return line", () => {
    expect(returnLine(code, "longest_consecutive")).toBe(8);
    expect(returnLine(code, "missing")).toBeNull();
  });

  it("finds only the named test's captured output", () => {
    expect(capturedOutput(output, "test_longest_consecutive_empty")).toBe("");
  });
});
