// The Tests tab: the Python load card, running rows, results with the failing rows open
// (Input / Expected / Got, printed output, a Line N jump), timeouts and errors, and the
// learner's own custom cases under the suite.

import type { Failure } from "../../lib/editor/failure";
import type { RunResult } from "../../lib/runner/types";
import { icon } from "./icons";
import { h } from "./ui";

export type StepState = "ok" | "now" | "wait" | "off" | "err";

export interface LoadState {
  python: StepState;
  pythonPct: number;
  mbDone: number;
  mbTotal: number;
  smarts: StepState;
  lint: StepState;
  error: string | null;
}

export interface CaseRow {
  input: string;
  mine: string | null;
  ref: string | null;
  error: string | null;
}

const MANY = 30;

export function loadCard(s: LoadState, retry: () => void): HTMLElement {
  if (s.python === "err") {
    return h(
      "div",
      { class: "loadcard err", role: "alert" },
      h("strong", {}, "Couldn't download Python. Your code is safe"),
      `The tests need Python, which loads from the internet the first time${s.error ? ` (${s.error})` : ""}. The editor keeps working`,
      h("div", {}, h("button", { class: "btn btn-secondary btn-sm", onclick: retry }, "Retry")),
    );
  }
  const offline = navigator.onLine === false && s.python !== "ok";
  const step = (st: StepState, text: string) =>
    h("li", { class: st }, st === "ok" ? h("span", { html: icon("check", 13, "icon-xs") }) : st === "now" ? null : h("span", { html: icon("circle-dashed", 13, "icon-xs") }), text);
  const pct = Math.round(s.pythonPct);
  return h(
    "div",
    { class: "loadcard", role: "status", "aria-live": "polite" },
    h("strong", {}, offline ? "Python needs one online visit" : "Getting Python ready for the tests"),
    offline
      ? "You're offline and Python isn't saved on this device yet. Keep writing; Run works after one visit with a connection"
      : `First visit only: ${s.mbDone.toFixed(1)} of ${s.mbTotal.toFixed(1)} MB. You can start typing now; Run unlocks when it finishes, and it's cached for next time and offline`,
    h("div", { class: "bar", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Python download" }, h("span", { style: `width:${pct}%` })),
    h(
      "ul",
      { class: "loadsteps" },
      step("ok", "Editor and highlighting"),
      step(s.python, s.python === "ok" ? "Python runtime (Pyodide)" : `Python runtime (Pyodide), ${pct}%`),
      step(s.smarts, s.smarts === "off" ? "Autocomplete unavailable" : "Autocomplete and hover docs (jedi), after Python"),
      step(s.lint, s.lint === "off" ? "Lint unavailable" : "Lint and format (ruff)"),
    ),
  );
}

export function testNames(test: string): string[] {
  return [...test.matchAll(/^def (test_\w+)\s*\(/gm)].map((m) => m[1]!);
}

export function runningRows(names: string[]): HTMLElement {
  return h(
    "div",
    {},
    h("div", { class: "tsum", role: "status" }, h("span", { class: "big" }, "Running"), h("span", { class: "muted" }, names.length ? `${names.length} tests` : "")),
    h(
      "ul",
      { class: "tests" },
      names.map((n) => h("li", {}, h("details", { class: "trow", "data-s": "run" }, h("summary", {}, h("span", { class: "st" }), h("span", { class: "tname" }, n), h("span", { class: "tms" }))))),
    ),
  );
}

export function agoText(ranAt: number, now = Date.now()): string {
  const s = Math.round((now - ranAt) / 1000);
  if (s < 2) return "just now";
  if (s < 60) return `ran ${s} s ago`;
  const m = Math.round(s / 60);
  return `ran ${m} min ago`;
}

function failureDetail(f: Failure): HTMLElement {
  return h(
    "div",
    { class: "tdetail" },
    f.input ? [h("span", { class: "k" }, "Input"), h("pre", {}, f.input)] : null,
    f.expected !== null ? [h("span", { class: "k" }, "Expected"), h("pre", { class: "exp" }, f.expected)] : null,
    f.got !== null ? [h("span", { class: "k" }, "Got"), h("pre", { class: "got" }, f.got)] : null,
    f.error ? [h("span", { class: "k" }, "Error"), h("pre", { class: "got" }, f.error)] : null,
    f.printed ? [h("span", { class: "k" }, "Printed"), h("pre", {}, f.printed)] : null,
  );
}

export function renderResults(
  r: RunResult,
  fails: Failure[],
  o: { ranAt: number; submit: boolean; cases: CaseRow[]; onJump(line: number): void; onNext(): void; allPass: boolean },
): HTMLElement {
  if (r.timedOut) {
    return h(
      "div",
      {},
      h(
        "div",
        { class: "tsum bad", role: "alert" },
        h("span", { class: "big" }, `Stopped after ${Math.round(r.durationMs / 1000)} s`),
        h("span", { class: "muted" }, "The tests never finished. Usually an infinite loop: check what makes your while condition false"),
      ),
      h("pre", { class: "trace" }, "TimeoutError: the test run went past the time limit, so Python was stopped and restarted"),
    );
  }
  if (r.error || (r.total === 0 && !r.tests.length)) {
    return h(
      "div",
      {},
      h("div", { class: "tsum bad", role: "alert" }, h("span", { class: "big" }, "Couldn't run the tests"), h("span", { class: "muted" }, r.error ?? "pytest found no tests")),
      h("pre", { class: "trace" }, r.output.trim()),
    );
  }
  const collect = r.tests.find((t) => t.outcome === "error" && !t.name.startsWith("test_"));
  if (collect) {
    const f = fails.find((x) => x.test === collect.name);
    const syntax = /SyntaxError|IndentationError/.test(collect.detail);
    return h(
      "div",
      {},
      h(
        "div",
        { class: "tsum bad", role: "alert" },
        h("span", { class: "big" }, syntax ? `Syntax error${f?.line ? ` on line ${f.line}` : ""}` : "Your file didn't import"),
        h("span", { class: "muted" }, f?.error ?? collect.message),
        f?.line ? h("button", { class: "btn btn-ghost btn-sm grow", onclick: () => o.onJump(f.line!) }, `Line ${f.line}`) : null,
      ),
      h("pre", { class: "trace" }, collect.detail.split("\n").filter((l) => /^E\s/.test(l)).map((l) => l.replace(/^E\s{1,3}/, "")).join("\n") || collect.detail),
    );
  }
  const green = r.total > 0 && r.passed === r.total;
  const failing = r.tests.filter((t) => t.outcome !== "passed");
  const passing = r.tests.filter((t) => t.outcome === "passed");
  const ms = `${Math.round(r.durationMs)} ms`;
  const head = green
    ? h("div", { class: "tsum ok", role: "status" }, h("span", { class: "big" }, `All ${r.total} passed`), h("span", { class: "muted", "data-ago": o.ranAt }, ms))
    : h(
        "div",
        { class: "tsum bad", role: "status" },
        h("span", { class: "big" }, r.notStarted ? "Not started yet" : `${r.passed} of ${r.total} passed`),
        h("span", { class: "muted", "data-ago": o.ranAt }, r.notStarted ? "Every test hit NotImplementedError. Replace the raise with your code" : `${agoText(o.ranAt)}, ${ms}`),
        r.notStarted ? null : h("button", { class: "btn btn-ghost btn-sm grow", onclick: o.onNext }, "Next failure ", h("kbd", {}, "F8")),
      );

  const rows: HTMLElement[] = [];
  failing.forEach((t, i) => {
    const f = fails.find((x) => x.test === t.name);
    const det = h(
      "details",
      { class: "trow", "data-s": "fail", open: i === 0 && !r.notStarted },
      h(
        "summary",
        {},
        h("span", { class: "st", html: icon("x", 15, "icon-sm") }),
        h("span", { class: "tname", title: t.name }, t.name),
        h("span", { class: "tms" }, f?.line ? h("button", { onclick: (e: Event) => (e.preventDefault(), o.onJump(f.line!)), "aria-label": `Jump to line ${f.line}` }, `Line ${f.line}`) : ""),
      ),
      f ? failureDetail(f) : h("div", { class: "tdetail" }, h("pre", {}, t.message || t.detail)),
    );
    rows.push(h("li", {}, det));
  });
  const passRow = (name: string, i: number) =>
    h(
      "li",
      {},
      h(
        "details",
        { class: "trow", "data-s": "pass", style: `--i:${i}` },
        h("summary", {}, h("span", { class: "st", html: icon("check", 15, "icon-sm") }), h("span", { class: "tname", title: name }, name), h("span", { class: "tms" }, "passed")),
        h("div", { class: "tdetail" }, h("span", { class: "k" }, "Passed")),
      ),
    );
  const list = h("ul", { class: "tests" }, rows);
  if (r.tests.length >= MANY && !green) {
    const more = h(
      "li",
      { class: "more-passed" },
      `${passing.length} more passed. `,
      h(
        "button",
        {
          onclick: () => {
            more.replaceWith(...passing.map((t, i) => passRow(t.name, i)));
          },
        },
        "Show them",
      ),
    );
    list.append(more);
  } else passing.forEach((t, i) => list.append(passRow(t.name, i + failing.length)));

  const cases = o.cases.length
    ? [
        h("p", { class: "cases-h" }, "Your cases (not scored)"),
        h(
          "ul",
          { class: "tests" },
          o.cases.map((c) => {
            const same = c.error === null && c.ref !== null && c.mine === c.ref;
            const s = c.error ? "fail" : c.ref === null ? "idle" : same ? "pass" : "fail";
            return h(
              "li",
              {},
              h(
                "details",
                { class: "trow", "data-s": s },
                h(
                  "summary",
                  {},
                  h("span", { class: "st", html: s === "pass" ? icon("check", 15, "icon-sm") : s === "fail" ? icon("x", 15, "icon-sm") : "" }),
                  h("span", { class: "tname" }, c.input),
                  h("span", { class: "tms" }, c.error ? "error" : c.ref === null ? "no reference" : same ? "matches" : "differs"),
                ),
                h(
                  "div",
                  { class: "tdetail" },
                  h("span", { class: "k" }, "Your return"),
                  h("pre", { class: same ? "" : "got" }, c.error ?? c.mine ?? ""),
                  c.ref !== null ? [h("span", { class: "k" }, "Reference returns"), h("pre", { class: "exp" }, c.ref)] : null,
                ),
              ),
            );
          }),
        ),
      ]
    : [];
  return h("div", {}, head, list, cases);
}
