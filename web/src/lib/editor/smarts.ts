// Language smarts from jedi in the Pyodide worker: completions, hover docs (also Ctrl/Cmd+I
// at the cursor) and signature help on `(` and `,`. Until Python is ready, completion falls
// back to buffer words and keywords, and nothing here blocks typing.

import { type Completion as CmCompletion, type CompletionContext, type CompletionResult, type CompletionSource } from "@codemirror/autocomplete";
import { globalCompletion, localCompletionSource } from "@codemirror/lang-python";
import { StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, hoverTooltip, showTooltip, type Tooltip } from "@codemirror/view";
import type { Completion, Position, Signature } from "../runner/types";

export interface Smarts {
  /** jedi is loaded and answering. */
  ready(): boolean;
  complete(p: Position): Promise<Completion[]>;
  hover(p: Position): Promise<string>;
  signatures(p: Position): Promise<Signature[]>;
}

const KIND: Record<string, string> = {
  function: "fn",
  class: "cls",
  module: "mod",
  keyword: "kw",
  instance: "var",
  statement: "var",
  param: "var",
  property: "prop",
  path: "path",
};

const CM_TYPE: Record<string, string> = { function: "function", class: "class", module: "namespace", keyword: "keyword" };

export function position(state: EditorState, pos: number): Position {
  const line = state.doc.lineAt(pos);
  return { code: state.doc.toString(), line: line.number, col: pos - line.from };
}

export function completionSource(smarts: Smarts): CompletionSource {
  return async (ctx: CompletionContext): Promise<CompletionResult | null> => {
    if (!smarts.ready()) {
      return (await localCompletionSource(ctx)) ?? (await globalCompletion(ctx));
    }
    const word = ctx.matchBefore(/\w*$/);
    const before = ctx.state.sliceDoc(Math.max(0, ctx.pos - 1), ctx.pos);
    if (!ctx.explicit && (!word || word.from === word.to) && before !== ".") return null;
    let items: Completion[];
    try {
      items = await smarts.complete(position(ctx.state, ctx.pos));
    } catch {
      return null;
    }
    if (ctx.aborted) return null;
    const from = word ? word.from : ctx.pos;
    return {
      from,
      validFor: /^\w*$/,
      options: items
        .filter((c) => !c.name.startsWith("__") || word?.text.startsWith("__"))
        .map(
          (c, i): CmCompletion => ({
            label: c.name,
            type: CM_TYPE[c.type] ?? "variable",
            detail: c.type === "statement" ? "variable" : c.type,
            ...(c.signature ? { info: c.signature } : {}),
            boost: -i / 1000,
            kind: KIND[c.type] ?? "var",
          } as CmCompletion & { kind: string }),
        ),
    };
  };
}

/** The short kind label (fn, cls, var, mod) before each completion. */
export const kindColumn = {
  render(c: CmCompletion) {
    const s = document.createElement("i");
    s.className = "cm-completionKind";
    s.textContent = (c as CmCompletion & { kind?: string }).kind ?? (c.type === "keyword" ? "kw" : c.type === "function" ? "fn" : "var");
    return s;
  },
  position: 20,
};

function docDom(text: string): HTMLElement {
  const d = document.createElement("div");
  d.className = "cm-docs";
  const [first, ...rest] = text.trim().split("\n\n");
  const sig = document.createElement("code");
  sig.textContent = first ?? "";
  d.append(sig);
  const body = rest.join("\n\n").trim();
  if (body) {
    const p = document.createElement("p");
    p.textContent = body.length > 600 ? `${body.slice(0, 599)}…` : body;
    d.append(p);
  }
  return d;
}

export function hoverDocs(smarts: Smarts): Extension {
  return hoverTooltip(
    async (view, pos) => {
      if (!smarts.ready()) return null;
      const word = view.state.wordAt(pos);
      if (!word) return null;
      let text = "";
      try {
        text = await smarts.hover(position(view.state, word.to));
      } catch {
        return null;
      }
      if (!text.trim()) return null;
      return { pos: word.from, end: word.to, above: true, create: () => ({ dom: docDom(text) }) };
    },
    { hoverTime: 400 },
  );
}

// ---- Docs at the cursor (Ctrl/Cmd+I) ----

const setDocs = StateEffect.define<Tooltip | null>();

const docsField = StateField.define<Tooltip | null>({
  create: () => null,
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setDocs)) return e.value;
    return tr.docChanged || tr.selection ? null : v;
  },
  provide: (f) => showTooltip.from(f),
});

export async function showDocsAtCursor(view: EditorView, smarts: Smarts): Promise<void> {
  const pos = view.state.selection.main.head;
  let text = "";
  if (smarts.ready()) {
    try {
      text = await smarts.hover(position(view.state, pos));
    } catch {
      text = "";
    }
  }
  const msg = smarts.ready() ? text.trim() || "No docs for this name" : "Docs arrive once Python finishes loading";
  view.dispatch({ effects: setDocs.of({ pos, above: true, create: () => ({ dom: docDom(msg) }) }) });
}

// ---- Signature help ----

const setSig = StateEffect.define<{ pos: number; sig: Signature } | null>();

function sigDom(sig: Signature): HTMLElement {
  const d = document.createElement("div");
  d.className = "cm-sighelp";
  d.append(`${sig.name}(`);
  sig.params.forEach((p, i) => {
    if (i) d.append(", ");
    if (i === sig.index) {
      const b = document.createElement("b");
      b.textContent = p;
      d.append(b);
    } else d.append(p);
  });
  d.append(")");
  return d;
}

const sigField = StateField.define<{ pos: number; sig: Signature } | null>({
  create: () => null,
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setSig)) return e.value;
    if (!v) return v;
    const head = tr.state.selection.main.head;
    // Closing the call or moving to another line ends the help.
    if (tr.state.doc.lineAt(head).number !== tr.state.doc.lineAt(Math.min(v.pos, tr.state.doc.length)).number) return null;
    return { ...v, pos: tr.changes.mapPos(v.pos) };
  },
  provide: (f) =>
    showTooltip.compute([f], (s) => {
      const v = s.field(f);
      return v ? { pos: v.pos, above: false, create: () => ({ dom: sigDom(v.sig) }) } : null;
    }),
});

function signatureHelp(smarts: Smarts): Extension {
  const plugin = ViewPlugin.define((view) => {
    let seq = 0;
    return {
      update(u) {
        if (!u.docChanged || !smarts.ready()) return;
        let typed = "";
        u.changes.iterChanges((_a, _b, _c, _d, ins) => (typed = ins.toString()));
        if (typed.length > 2 || !typed) return;
        const head = u.state.selection.main.head;
        const before = u.state.sliceDoc(Math.max(0, head - 1), head);
        if (before !== "(" && before !== ",") {
          if (typed === ")") queueMicrotask(() => view.dispatch({ effects: setSig.of(null) }));
          return;
        }
        const pos = u.state.selection.main.head;
        const mine = ++seq;
        smarts
          .signatures(position(u.state, pos))
          .then((sigs) => {
            if (mine !== seq) return;
            const sig = sigs[0];
            view.dispatch({ effects: setSig.of(sig ? { pos, sig } : null) });
          })
          .catch(() => {});
      },
    };
  });
  return [sigField, plugin];
}

export function smartsExtensions(smarts: Smarts): Extension {
  return [docsField, hoverDocs(smarts), signatureHelp(smarts)];
}

/** Escape closes docs and signature help (only when one is open, so Vim keeps its Esc). */
export function closeSmartsPopups(view: EditorView): boolean {
  const open = view.state.field(docsField, false) || view.state.field(sigField, false);
  if (!open) return false;
  view.dispatch({ effects: [setDocs.of(null), setSig.of(null)] });
  return true;
}
