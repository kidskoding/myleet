// The Python half of the runner, independent of the Web Worker so Node tests can drive it.
import type { PyodideAPI } from "pyodide";
import type { Completion, Position, RunResult, Signature, TestResult } from "./types";

export const LIB_DIR = "/lib";
const RUN_DIR = "/run";

const SETUP = String.raw`
import contextlib, importlib, io, json, os, sys
import xml.etree.ElementTree as ET

sys.dont_write_bytecode = True
if ${JSON.stringify(LIB_DIR)} not in sys.path:
    sys.path.insert(0, ${JSON.stringify(LIB_DIR)})

def _myleet_first_line(s):
    return s.strip().split("\n")[0]

def _myleet_cases(suite, out):
    for case in suite.findall("testcase"):
        tr = {"name": case.get("name", ""), "outcome": "passed", "message": "", "detail": ""}
        for tag, outcome in (("failure", "failed"), ("error", "error"), ("skipped", "skipped")):
            found = case.findall(tag)
            if found:
                node = found[-1]
                tr["outcome"] = outcome
                tr["message"] = _myleet_first_line(node.get("message", ""))
                if tag != "skipped":
                    tr["detail"] = (node.text or "").strip()
                break
        out.append(tr)
    for child in suite.findall("testsuite"):
        _myleet_cases(child, out)

def _myleet_run(test_src, code_src):
    import pytest
    d = ${JSON.stringify(RUN_DIR)}
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        p = os.path.join(d, f)
        if os.path.isfile(p):
            os.remove(p)
    with open(os.path.join(d, "solution.py"), "w") as f:
        f.write(code_src)
    with open(os.path.join(d, "test_problem.py"), "w") as f:
        f.write(test_src)
    # Drop the last run's modules so edits are re-imported.
    for name, mod in list(sys.modules.items()):
        if (getattr(mod, "__file__", None) or "").startswith(d + "/"):
            del sys.modules[name]
    importlib.invalidate_caches()
    os.chdir(d)
    report = os.path.join(d, "r.xml")
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            pytest.main(["-q", "-p", "no:cacheprovider", "--capture=sys", "--junitxml=" + report, "test_problem.py"])
        except BaseException as e:
            print(repr(e))
    res = {"output": out.getvalue(), "tests": None, "error": None}
    if not os.path.exists(report):
        res["error"] = "pytest did not produce results: " + res["output"].strip().split("\n")[0]
        return json.dumps(res)
    try:
        tests = []
        _myleet_cases(ET.parse(report).getroot(), tests)
        res["tests"] = tests
    except ET.ParseError as e:
        res["error"] = "read pytest results: " + str(e)
    return json.dumps(res)

def _myleet_script(code, line, col):
    import jedi
    return jedi.Script(code, path=${JSON.stringify(RUN_DIR + "/solution.py")}), line, col

def _myleet_complete(code, line, col):
    s, line, col = _myleet_script(code, line, col)
    out = []
    for c in s.complete(line, col)[:200]:
        sig = c.get_signatures()
        out.append({"name": c.name, "type": c.type, "complete": c.complete or "", "signature": sig[0].to_string() if sig else ""})
    return json.dumps(out)

def _myleet_hover(code, line, col):
    s, line, col = _myleet_script(code, line, col)
    names = s.help(line, col) or s.infer(line, col)
    return json.dumps("\n\n".join(n.docstring() for n in names if n.docstring()))

def _myleet_signatures(code, line, col):
    s, line, col = _myleet_script(code, line, col)
    return json.dumps([
        {"name": g.name, "params": [p.to_string() for p in g.params], "index": g.index, "doc": g.docstring(raw=True)}
        for g in s.get_signatures(line, col)
    ])
`;

/** Loads pytest, writes the shared helpers (`lib/*.py`) and defines the run functions. */
export async function bootPython(py: PyodideAPI, lib: Record<string, string>): Promise<void> {
  await py.loadPackage("pytest", { messageCallback: () => {} });
  py.FS.mkdirTree(LIB_DIR);
  for (const [name, src] of Object.entries(lib)) {
    if (!/^[\w.-]+\.py$/.test(name)) throw new Error(`bad lib file name: ${name}`);
    py.FS.writeFile(`${LIB_DIR}/${name}`, src);
  }
  await py.runPythonAsync(SETUP);
}

function call(py: PyodideAPI, fn: string, ...args: (string | number)[]): string {
  const f = py.globals.get(fn) as { (...a: (string | number)[]): string; destroy(): void };
  try {
    return f(...args);
  } finally {
    f.destroy();
  }
}

/** Runs pytest on the staged files. `timedOut` is decided by the caller, which owns the clock. */
export function runTests(py: PyodideAPI, test: string, code: string): RunResult {
  const start = performance.now();
  const raw = JSON.parse(call(py, "_myleet_run", test, code)) as {
    output: string;
    tests: TestResult[] | null;
    error: string | null;
  };
  const tests = raw.tests ?? [];
  const passed = tests.filter((t) => t.outcome === "passed").length;
  const failing = tests.filter((t) => t.outcome !== "passed");
  const notImplemented = failing.filter(
    (t) => t.message.includes("NotImplementedError") || t.detail.includes("NotImplementedError"),
  ).length;
  return {
    tests,
    passed,
    total: tests.length,
    notStarted: failing.length > 0 && notImplemented === failing.length,
    timedOut: false,
    error: raw.error,
    output: raw.output,
    durationMs: performance.now() - start,
  };
}

const jediLoaded = new WeakMap<PyodideAPI, Promise<unknown>>();

async function jedi(py: PyodideAPI): Promise<void> {
  let p = jediLoaded.get(py);
  if (!p) jediLoaded.set(py, (p = py.loadPackage("jedi", { messageCallback: () => {} })));
  await p;
}

export async function complete(py: PyodideAPI, p: Position): Promise<Completion[]> {
  await jedi(py);
  return JSON.parse(call(py, "_myleet_complete", p.code, p.line, p.col)) as Completion[];
}

export async function hover(py: PyodideAPI, p: Position): Promise<string> {
  await jedi(py);
  return JSON.parse(call(py, "_myleet_hover", p.code, p.line, p.col)) as string;
}

export async function signatures(py: PyodideAPI, p: Position): Promise<Signature[]> {
  await jedi(py);
  return JSON.parse(call(py, "_myleet_signatures", p.code, p.line, p.col)) as Signature[];
}
