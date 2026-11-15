// ruff lint diagnostics in the editor (150 ms debounce), from the ruff worker.
// Only interview-relevant rules show: pyflakes (F), syntax (E9) and real errors; no style nags.

import { linter, type Diagnostic as CmDiagnostic } from "@codemirror/lint";
import type { Text } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import type { Diagnostic } from "@astral-sh/ruff-wasm-web";
import type { RuffApi } from "./ruff-client";
import { setLintLines, type LintSeverity } from "./markers";

/** Rules worth seeing while practising. Syntax errors have no code. */
export function relevant(d: Diagnostic): boolean {
  return d.code === null || d.code.startsWith("F") || d.code.startsWith("E9") || d.code.startsWith("B");
}

export function severity(d: Diagnostic): LintSeverity {
  if (d.code === null || d.code.startsWith("E9") || d.code === "F821" || d.code === "F822" || d.code === "F823") return "error";
  return "warning";
}

function offset(doc: Text, row: number, column: number): number {
  const line = doc.line(Math.min(Math.max(1, row), doc.lines));
  return Math.min(line.from + Math.max(0, column - 1), line.to);
}

export interface LintReport {
  diagnostics: Diagnostic[];
  failed: boolean;
}

export function ruffLinter(api: RuffApi, onReport: (r: LintReport) => void): Extension {
  return linter(
    async (view) => {
      const doc = view.state.doc;
      let diags: Diagnostic[];
      try {
        diags = (await api.lint(doc.toString())).filter(relevant);
      } catch {
        onReport({ diagnostics: [], failed: true });
        return [];
      }
      if (view.state.doc !== doc) return [];
      const lines = new Map<number, { severity: LintSeverity; message: string }>();
      const out: CmDiagnostic[] = diags.map((d) => {
        const sev = severity(d);
        const label = d.code ? `${d.code} ${d.message}` : d.message;
        const prev = lines.get(d.start_location.row);
        if (!prev || (prev.severity === "warning" && sev === "error")) lines.set(d.start_location.row, { severity: sev, message: label });
        const from = offset(doc, d.start_location.row, d.start_location.column);
        const to = Math.max(from, offset(doc, d.end_location.row, d.end_location.column));
        return { from, to, severity: sev, message: d.message, source: d.code ?? "syntax" };
      });
      queueMicrotask(() => view.dispatch({ effects: setLintLines.of(lines) }));
      onReport({ diagnostics: diags, failed: false });
      return out;
    },
    { delay: 150 },
  );
}
