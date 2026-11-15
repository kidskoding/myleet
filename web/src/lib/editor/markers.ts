// The editor's one marker column (failing test dot, lint square, or fold chevron) and the
// failing-line wash with its inline "returned 1 for [], expected 0" chip.

import { foldable, foldEffect, foldedRanges, unfoldEffect } from "@codemirror/language";
import { StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, GutterMarker, WidgetType, gutter, type DecorationSet } from "@codemirror/view";

export interface FailMark {
  /** 1-based line. */
  line: number;
  chip: string;
}

export type LintSeverity = "warning" | "error";

export const setFailures = StateEffect.define<FailMark[]>();
export const setLintLines = StateEffect.define<Map<number, { severity: LintSeverity; message: string }>>();

class Chip extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  override eq(o: Chip) {
    return o.text === this.text;
  }
  override toDOM() {
    const s = document.createElement("span");
    s.className = "cm-failChip";
    s.textContent = this.text;
    return s;
  }
  override ignoreEvent() {
    return true;
  }
}

function build(view: { doc: { lines: number; line(n: number): { from: number; to: number } } }, marks: FailMark[]): DecorationSet {
  // One chip per line: the first failure that points at it.
  const ranges = marks
    .filter((m, i) => m.line >= 1 && m.line <= view.doc.lines && marks.findIndex((x) => x.line === m.line) === i)
    .sort((a, b) => a.line - b.line)
    .flatMap((m) => {
      const l = view.doc.line(m.line);
      return [
        Decoration.line({ class: "cm-failLine", attributes: { "data-fail": "" } }).range(l.from),
        Decoration.widget({ widget: new Chip(m.chip), side: 1 }).range(l.to),
      ];
    });
  return Decoration.set(ranges, true);
}

export const failField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    let next = deco.map(tr.changes);
    for (const e of tr.effects) if (e.is(setFailures)) next = build(tr.state, e.value);
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const lintLinesField = StateField.define<Map<number, { severity: LintSeverity; message: string }>>({
  create: () => new Map(),
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setLintLines)) return e.value;
    return v;
  },
});

/** 1-based lines currently marked as failing, in order. */
export function failingLines(state: EditorView["state"]): number[] {
  const out: number[] = [];
  state.field(failField).between(0, state.doc.length, (from, _to, d) => {
    if (d.spec.class === "cm-failLine") out.push(state.doc.lineAt(from).number);
  });
  return out;
}

class Dot extends GutterMarker {
  constructor(readonly kind: "fail" | LintSeverity, readonly title: string) {
    super();
  }
  override eq(o: Dot) {
    return o.kind === this.kind && o.title === this.title;
  }
  override toDOM() {
    const s = document.createElement("span");
    s.className = `cm-mark cm-mark-${this.kind}`;
    s.title = this.title;
    return s;
  }
}

class Chevron extends GutterMarker {
  constructor(readonly folded: boolean) {
    super();
  }
  override eq(o: Chevron) {
    return o.folded === this.folded;
  }
  override toDOM() {
    const s = document.createElement("span");
    s.className = `cm-chev${this.folded ? " is-folded" : ""}`;
    s.setAttribute("aria-hidden", "true");
    s.innerHTML =
      '<svg viewBox="0 0 10 10" width="10" height="10"><path d="M2.5 3.75 5 6.25l2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return s;
  }
}

function foldedAt(state: EditorView["state"], from: number, to: number) {
  let hit: { from: number; to: number } | null = null;
  foldedRanges(state).between(from, to, (a, b) => {
    if (!hit && a >= from && a <= to) hit = { from: a, to: b };
  });
  return hit as { from: number; to: number } | null;
}

const marksGutter = gutter({
  class: "cm-marks",
  lineMarker(view, line) {
    const n = view.state.doc.lineAt(line.from).number;
    if (failingLines(view.state).includes(n)) return new Dot("fail", "Failing test");
    const lint = view.state.field(lintLinesField).get(n);
    if (lint) return new Dot(lint.severity, lint.message);
    const folded = foldedAt(view.state, line.from, line.to);
    if (folded) return new Chevron(true);
    return foldable(view.state, line.from, line.to) ? new Chevron(false) : null;
  },
  lineMarkerChange: (u) =>
    u.docChanged ||
    u.transactions.some((t) => t.effects.some((e) => e.is(setFailures) || e.is(setLintLines) || e.is(foldEffect) || e.is(unfoldEffect))),
  initialSpacer: () => new Dot("warning", ""),
  domEventHandlers: {
    click(view, line) {
      const folded = foldedAt(view.state, line.from, line.to);
      if (folded) {
        view.dispatch({ effects: unfoldEffect.of(folded) });
        return true;
      }
      const range = foldable(view.state, line.from, line.to);
      if (range) {
        view.dispatch({ effects: foldEffect.of(range) });
        return true;
      }
      return false;
    },
  },
});

export const markers: Extension = [failField, lintLinesField, marksGutter];
