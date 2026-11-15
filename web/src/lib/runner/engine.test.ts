import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPyodide, type PyodideAPI } from "pyodide";
import { beforeAll, describe, expect, it } from "vitest";
import type { ProblemFiles } from "../types";
import { ROOT } from "../test-util";
import { bootPython, complete, runTests, signatures } from "./engine";

// Real Pyodide under Node; packages (pytest, jedi) download from the jsDelivr CDN on first use.
const problem = (id: string) =>
  JSON.parse(readFileSync(join(ROOT, "public/data/problems", `${id}.json`), "utf8")) as ProblemFiles;
const libDir = join(ROOT, "public/data/lib");
const lib = Object.fromEntries(readdirSync(libDir).map((f) => [f, readFileSync(join(libDir, f), "utf8")]));

let py: PyodideAPI;

beforeAll(async () => {
  py = await loadPyodide({ packageCacheDir: join(ROOT, "node_modules/.cache/pyodide") });
  await bootPython(py, lib);
}, 180_000);

describe("pyodide runner", () => {
  it("passes a reference solution", () => {
    const p = problem("circular-array-loop");
    const r = runTests(py, p.test, p.solution ?? "");
    expect(r.error).toBeNull();
    expect(r.total).toBeGreaterThan(0);
    expect(r.passed).toBe(r.total);
    expect(r.notStarted).toBe(false);
  });

  it("uses the shared lib helpers", () => {
    const p = problem("insertion-sort-list");
    expect(p.test).toMatch(/^from list_node import/m);
    const r = runTests(py, p.test, p.solution ?? "");
    expect(r.passed).toBe(r.total);
  });

  it("reports an untouched starter as not started", () => {
    const p = problem("two-sum");
    const r = runTests(py, p.test, p.starter);
    expect(r.passed).toBe(0);
    expect(r.total).toBeGreaterThan(0);
    expect(r.notStarted).toBe(true);
  });

  it("reports failures with a first-line message, and re-imports edited code", () => {
    const p = problem("two-sum");
    const wrong = runTests(py, p.test, "def two_sum(nums, target):\n    return [9, 9]\n");
    const failed = wrong.tests.find((t) => t.outcome === "failed");
    expect(failed?.message).toContain("assert");
    expect(failed?.message).not.toContain("\n");
    expect(wrong.notStarted).toBe(false);
    const right = runTests(
      py,
      p.test,
      "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []\n",
    );
    expect(right.passed).toBe(right.total);
  });

  it("surfaces a syntax error in the output, like the CLI", () => {
    const p = problem("two-sum");
    const r = runTests(py, p.test, "def two_sum(:\n");
    expect(r.passed).toBe(0);
    expect(r.output).toContain("SyntaxError");
  });

  it("completes and shows signatures with jedi", async () => {
    const code = "import collections\ncollections.deq";
    const c = await complete(py, { code, line: 2, col: 15 });
    expect(c.map((x) => x.name)).toContain("deque");
    const s = await signatures(py, { code: "print(1, ", line: 1, col: 9 });
    expect(s[0]?.name).toBe("print");
  }, 120_000);
});
