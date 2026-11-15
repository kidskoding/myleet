import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPyodide, type PyodideAPI } from "pyodide";
import { beforeAll, describe, expect, it } from "vitest";
import { ROOT } from "../test-util";
import { bootPython, runTests } from "../runner/engine";
import { customTest, parseSignature, readCases } from "./custom";

const libDir = join(ROOT, "public/data/lib");
const lib = Object.fromEntries(readdirSync(libDir).map((f) => [f, readFileSync(join(libDir, f), "utf8")]));
let py: PyodideAPI;

beforeAll(async () => {
  py = await loadPyodide({ packageCacheDir: join(ROOT, "node_modules/.cache/pyodide") });
  await bootPython(py, lib);
}, 180_000);

describe("custom input in Pyodide", () => {
  it("returns the value, printed output and timing, and reports errors with their line", () => {
    const sig = parseSignature("def f(nums: list[int]) -> int:\n    raise NotImplementedError\n")!;
    const code = "def f(nums):\n    print('len', len(nums))\n    return nums[0] * 2\n";
    const r = runTests(py, customTest(sig, [["[4, 5]"], ["[]"]]), code);
    const [ok, bad] = readCases(r, 2);
    expect(ok).toMatchObject({ value: "8", error: null, printed: "len 2\n" });
    expect(ok?.ms).toBeGreaterThanOrEqual(0);
    expect(bad).toMatchObject({ value: null, error: "IndexError: list index out of range", line: 3 });
  });

  it("builds linked lists and trees from lists and turns them back", () => {
    const sig = parseSignature("def rev(head: ListNode | None) -> ListNode | None:\n    pass\n")!;
    const code = "def rev(head):\n    prev = None\n    while head:\n        head.next, prev, head = prev, head, head.next\n    return prev\n";
    expect(readCases(runTests(py, customTest(sig, [["[1, 2, 3]"]]), code), 1)[0]?.value).toBe("[3, 2, 1]");
  });

  it("drives a design class from a call list", () => {
    const sig = parseSignature("class Counter:\n    def __init__(self, start: int) -> None:\n        pass\n")!;
    const code = "class Counter:\n    def __init__(self, start):\n        self.n = start\n    def inc(self):\n        self.n += 1\n        return self.n\n";
    expect(readCases(runTests(py, customTest(sig, [['[["Counter", 5], ["inc"], ["inc"]]']]), code), 1)[0]?.value).toBe("[None, 6, 7]");
  });
});
