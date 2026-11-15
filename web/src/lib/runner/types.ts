// Same semantics as the Rust runner (src/runner/mod.rs).

export type Outcome = "passed" | "failed" | "error" | "skipped";

export interface TestResult {
  name: string;
  outcome: Outcome;
  /** First line of the failure message. */
  message: string;
  detail: string;
}

export interface RunResult {
  tests: TestResult[];
  passed: number;
  total: number;
  /** Every non-passing test hit NotImplementedError: the starter is untouched. */
  notStarted: boolean;
  timedOut: boolean;
  error: string | null;
  /** pytest's stdout and stderr, interleaved. */
  output: string;
  durationMs: number;
}

export interface RunInput {
  /** `test_problem.py`; it imports from `solution`. */
  test: string;
  /** The learner's code, staged as `solution.py`. */
  code: string;
}

export type LoadStage = "pyodide" | "pytest" | "ready";

export interface LoadProgress {
  stage: LoadStage;
  elapsedMs: number;
}

export interface Completion {
  name: string;
  /** jedi's type: function, class, module, keyword, statement, param, ... */
  type: string;
  /** Text to insert after what is already typed. */
  complete: string;
  signature: string;
}

export interface Signature {
  name: string;
  params: string[];
  /** Index of the parameter under the cursor, or null. */
  index: number | null;
  doc: string;
}

/** Editor positions: `line` is 1-based, `col` is 0-based (jedi's convention). */
export interface Position {
  code: string;
  line: number;
  col: number;
}

export function green(r: RunResult): boolean {
  return r.total > 0 && r.passed === r.total;
}
