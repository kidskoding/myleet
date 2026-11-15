// Reads pytest's failure text (the runner's `detail`) for the bits the workspace shows:
// the solution.py line to mark, the call, expected vs got, the exception, and the
// output that test printed.

import type { RunResult, TestResult } from "../runner/types";

export interface Failure {
  test: string;
  /** 1-based line in solution.py the traceback points to, or the `return` that produced a wrong answer. */
  line: number | null;
  /** True when `line` came from a traceback rather than the returning line. */
  fromTraceback: boolean;
  /** The call that failed, e.g. `longest_consecutive([])`. */
  input: string | null;
  expected: string | null;
  got: string | null;
  /** `IndexError: list index out of range` for exceptions. */
  error: string | null;
  printed: string;
}

const SOLUTION_LINE = /solution\.py(?::(\d+)|", line (\d+))/g;

/** Innermost solution.py frame in a traceback. */
export function tracebackLine(text: string): number | null {
  let last: number | null = null;
  for (const m of text.matchAll(SOLUTION_LINE)) last = Number(m[1] ?? m[2]);
  return last;
}

/** The text inside a call's outermost parentheses: `f([1], 2)` gives `[1], 2`. */
export function callArgs(call: string): string | null {
  const open = call.indexOf("(");
  if (open < 0 || !call.endsWith(")")) return null;
  return call.slice(open + 1, -1);
}

/** The output a test printed, from pytest's "Captured stdout call" section for it. */
export function capturedOutput(output: string, test: string): string {
  const lines = output.split("\n");
  const head = lines.findIndex((l) => /^_{3,} .+ _{3,}$/.test(l) && l.includes(` ${test} `));
  if (head < 0) return "";
  let out: string[] | null = null;
  for (let i = head + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (/^_{3,} .+ _{3,}$/.test(l) || /^={3,} /.test(l)) break;
    if (/^-{3,} Captured std(out|err) (call|setup|teardown) -{3,}$/.test(l)) {
      out ??= [];
      continue;
    }
    if (out && /^-{3,} .+ -{3,}$/.test(l)) break;
    out?.push(l);
  }
  return (out ?? []).join("\n").replace(/\n+$/, "");
}

/**
 * The last `return` inside `def name(...)` (nested defs excluded), 1-based, for marking the
 * line that produced a wrong answer.
 */
export function returnLine(code: string, name: string): number | null {
  const lines = code.split("\n");
  const def = lines.findIndex((l) => new RegExp(`^\\s*def\\s+${name}\\s*\\(`).test(l));
  if (def < 0) return null;
  const indent = (s: string) => s.length - s.trimStart().length;
  const base = indent(lines[def]!);
  let nested: number | null = null;
  let found: number | null = null;
  for (let i = def + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (!l.trim() || l.trimStart().startsWith("#")) continue;
    const ind = indent(l);
    if (ind <= base) break;
    if (nested !== null && ind <= nested) nested = null;
    if (nested === null && /^\s*(async\s+)?def\s/.test(l)) {
      nested = ind;
      continue;
    }
    if (nested === null && /^\s*return\b/.test(l)) found = i + 1;
  }
  return found;
}

export function parseFailure(t: TestResult, output: string, code: string): Failure {
  const text = t.detail || t.message;
  const f: Failure = {
    test: t.name,
    line: tracebackLine(text),
    fromTraceback: true,
    input: null,
    expected: null,
    got: null,
    error: null,
    printed: capturedOutput(output, t.name),
  };
  const lines = text.split("\n");
  for (const l of lines) {
    const a = /^E\s+(?:AssertionError: )?assert (.+?) (?:==|is) (.+)$/.exec(l);
    if (a && f.got === null) {
      f.got = a[1]!.trim();
      f.expected = a[2]!.trim();
    }
    const w = /^E\s+\+\s+where .+? = (\w[\w.]*\(.*\))$/.exec(l);
    if (w && f.input === null) f.input = w[1]!;
  }
  if (f.input === null) {
    const src = lines.find((l) => /^>\s+assert /.test(l));
    const lhs = src && /^>\s+assert\s+(\w[\w.]*\(.*\))\s*(==|!=|is\b|in\b)/.exec(src);
    if (lhs) f.input = lhs[1]!;
  }
  const errs = lines.filter((l) => /^E\s+\w*(Error|Exception|Interrupt)\b/.test(l) || /^E\s+\w+Error:/.test(l));
  if (errs.length && f.got === null) f.error = errs[errs.length - 1]!.replace(/^E\s+/, "").trim();
  if (f.line === null && f.got !== null && f.input) {
    const fn = /^(\w+)\(/.exec(f.input)?.[1];
    const r = fn ? returnLine(code, fn) : null;
    if (r) {
      f.line = r;
      f.fromTraceback = false;
    }
  }
  return f;
}

/** The inline chip on the marked line: "returned 1 for [], expected 0". */
export function chipText(f: Failure, max = 72): string {
  let s: string;
  if (f.got !== null && f.expected !== null) {
    const args = f.input ? callArgs(f.input) : null;
    s = args !== null ? `returned ${f.got} for ${args}, expected ${f.expected}` : `returned ${f.got}, expected ${f.expected}`;
  } else if (f.error) {
    s = f.error;
  } else {
    s = "failing test";
  }
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Failing tests, then the collection error when nothing ran (a syntax error). */
export function failures(r: RunResult, code: string): Failure[] {
  return r.tests.filter((t) => t.outcome === "failed" || t.outcome === "error").map((t) => parseFailure(t, r.output, code));
}

/** "Expected 0 / Got 1" row text for one test, or null when it is not a wrong answer. */
export function isWrongAnswer(f: Failure): boolean {
  return f.got !== null && f.expected !== null;
}
