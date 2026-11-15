// Builds the CodeMirror 6 editor for solution.py: Python, the token theme, brackets,
// multi-cursor, smart indent, folding, search/replace, jedi smarts, ruff lint, failing-test
// markers, and optional Vim and minimap (loaded on demand, so they cost nothing when off).

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, startCompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import {
  bracketMatching,
  codeFolding,
  foldKeymap,
  indentOnInput,
  indentService,
  indentUnit,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import { Compartment, EditorSelection, EditorState, Prec, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { builtinSpans, synHighlighter } from "./highlight";
import type { LintReport } from "./lint";
import type { RuffApi } from "./ruff-client";
import { failingLines, markers, setFailures, type FailMark } from "./markers";
import type { EditorSettings } from "./settings";
import { closeSmartsPopups, completionSource, kindColumn, showDocsAtCursor, smartsExtensions, type Smarts } from "./smarts";
import { editorTheme } from "./theme";

export interface EditorOptions {
  parent: HTMLElement;
  doc: string;
  settings: EditorSettings;
  smarts: Smarts;
  ruff: RuffApi;
  /** Mocks turn completion and hover docs off ("Interview mode"). */
  smartsAllowed: boolean;
  onChange(code: string): void;
  onCursor(line: number, col: number): void;
  onLint(r: LintReport): void;
  /** Vim `:w`. */
  onSave(): void;
  onVimMode(mode: string | null): void;
}

export interface CodeEditor {
  view: EditorView;
  code(): string;
  setCode(code: string): void;
  applySettings(s: EditorSettings): Promise<void>;
  setFailures(marks: FailMark[]): void;
  /** `ruff format`; false (and the text kept) on a syntax error. */
  format(): Promise<boolean>;
  /** F8 / Shift+F8 over lint problems and failing lines. Returns false when there are none. */
  cycleProblem(dir: 1 | -1): boolean;
  jumpTo(line: number): void;
  docsAtCursor(): void;
  insert(text: string): void;
  focus(): void;
  setReadOnly(on: boolean): void;
  destroy(): void;
}

const BUILTIN_MARK = Decoration.mark({ class: "sb" });

const builtins = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) this.decorations = this.build(u.view);
    }
    build(view: EditorView): DecorationSet {
      const tree = syntaxTree(view.state);
      const code = view.state.doc.toString();
      const marks = view.visibleRanges.flatMap(({ from, to }) => builtinSpans(code, tree, from, to));
      return Decoration.set(marks.map((s) => BUILTIN_MARK.range(s.from, s.to)), true);
    }
  },
  { decorations: (v) => v.decorations },
);

/** After `return`, `pass`, `continue`, `break` or `raise`, the next line dedents. */
const dedentAfterExit = indentService.of((cx, pos) => {
  // On Enter, `lineAt(pos, -1)` is the text before the simulated break.
  const line = cx.lineAt(pos, -1);
  if (pos === line.from || !/^\s*(return|pass|continue|break|raise)\b/.test(line.text)) return undefined;
  return Math.max(0, cx.lineIndent(line.from, -1) - cx.unit);
});

export function createEditor(o: EditorOptions): CodeEditor {
  const vimC = new Compartment();
  const miniC = new Compartment();
  const wrapC = new Compartment();
  const tabC = new Compartment();
  const completeC = new Compartment();
  const roC = new Compartment();
  const lazyC = new Compartment();
  let forEachDiagnostic: typeof import("@codemirror/lint").forEachDiagnostic | null = null;
  let settings = o.settings;
  let vimOn = false;
  let miniOn = false;

  const completion = (on: boolean): Extension =>
    on && o.smartsAllowed
      ? [
          autocompletion({ override: [completionSource(o.smarts)], addToOptions: [kindColumn], icons: false, activateOnTypingDelay: 60 }),
          smartsExtensions(o.smarts),
        ]
      : [];

  const tabs = (n: number): Extension => [indentUnit.of(" ".repeat(n)), EditorState.tabSize.of(n)];

  const state = EditorState.create({
    doc: o.doc,
    extensions: [
      vimC.of([]),
      lineNumbers(),
      markers,
      highlightActiveLineGutter(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      dedentAfterExit,
      syntaxHighlighting(synHighlighter),
      builtins,
      bracketMatching(),
      closeBrackets(),
      codeFolding({ placeholderText: "…" }),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      // Search and lint arrive a moment after the editor (they never block typing).
      lazyC.of([]),
      python(),
      completeC.of(completion(settings.autocomplete)),
      tabC.of(tabs(settings.tabSize)),
      wrapC.of(settings.wrap ? EditorView.lineWrapping : []),
      miniC.of([]),
      roC.of([]),
      Prec.high(
        keymap.of([
          {
            key: "Escape",
            run: (v) => closeSmartsPopups(v),
          },
        ]),
      ),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap.filter((b) => b.key !== "Mod-Enter" && b.key !== "Mod-i"),
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        { key: "Ctrl-Space", run: startCompletion },
        indentWithTab,
      ]),
      editorTheme,
      EditorView.contentAttributes.of({ "aria-label": "Code editor, Python", spellcheck: "false", autocapitalize: "off", autocorrect: "off" }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) o.onChange(u.state.doc.toString());
        if (u.docChanged || u.selectionSet) {
          const head = u.state.selection.main.head;
          const line = u.state.doc.lineAt(head);
          o.onCursor(line.number, head - line.from + 1);
        }
      }),
    ],
  });

  const view = new EditorView({ state, parent: o.parent });
  void Promise.all([import("@codemirror/search"), import("@codemirror/lint"), import("./lint")]).then(([s, cmLint, l]) => {
    forEachDiagnostic = cmLint.forEachDiagnostic;
    view.dispatch({
      effects: lazyC.reconfigure([s.search({ top: true }), s.highlightSelectionMatches(), keymap.of(s.searchKeymap), l.ruffLinter(o.ruff, o.onLint)]),
    });
  });

  async function vimExtension(): Promise<Extension> {
    const m = await import("@replit/codemirror-vim");
    m.Vim.defineEx("write", "w", () => o.onSave());
    queueMicrotask(() => {
      const cm = m.getCM(view);
      o.onVimMode("normal");
      cm?.on("vim-mode-change", (e: { mode: string; subMode?: string }) => o.onVimMode(e.subMode ? `${e.mode} ${e.subMode}` : e.mode));
    });
    return m.vim({ status: false });
  }

  async function minimapExtension(): Promise<Extension> {
    const m = await import("@replit/codemirror-minimap");
    return m.showMinimap.compute(["doc"], () => ({
      create: () => ({ dom: document.createElement("div") }),
      displayText: "blocks",
      showOverlay: "mouse-over",
    }));
  }

  const editor: CodeEditor = {
    view,
    code: () => view.state.doc.toString(),
    setCode(code) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code }, selection: { anchor: 0 } });
    },
    async applySettings(s) {
      settings = s;
      const effects = [
        tabC.reconfigure(tabs(s.tabSize)),
        wrapC.reconfigure(s.wrap ? EditorView.lineWrapping : []),
        completeC.reconfigure(completion(s.autocomplete)),
      ];
      if (s.vim !== vimOn) {
        effects.push(vimC.reconfigure(s.vim ? await vimExtension() : []));
        vimOn = s.vim;
        if (!s.vim) o.onVimMode(null);
      }
      if (s.minimap !== miniOn) {
        effects.push(miniC.reconfigure(s.minimap ? await minimapExtension() : []));
        miniOn = s.minimap;
      }
      view.dispatch({ effects });
    },
    setFailures(marks) {
      view.dispatch({ effects: setFailures.of(marks) });
    },
    async format() {
      const before = view.state.doc.toString();
      let after: string;
      try {
        after = await o.ruff.format(before);
      } catch {
        return false;
      }
      if (view.state.doc.toString() !== before || after === before) return after === before;
      const head = view.state.selection.main.head;
      const line = view.state.doc.lineAt(head);
      const col = head - line.from;
      const newDoc = EditorState.create({ doc: after }).doc;
      const l = newDoc.line(Math.min(line.number, newDoc.lines));
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: after },
        selection: EditorSelection.cursor(Math.min(l.from + col, l.to)),
      });
      return true;
    },
    cycleProblem(dir) {
      const st = view.state;
      const targets = new Set<number>();
      forEachDiagnostic?.(st, (d) => targets.add(d.from));
      for (const n of failingLines(st)) targets.add(st.doc.line(n).from);
      const list = [...targets].sort((a, b) => a - b);
      if (!list.length) return false;
      const head = st.selection.main.head;
      const lineStart = st.doc.lineAt(head).from;
      const pick =
        dir === 1 ? (list.find((p) => p > head && st.doc.lineAt(p).from !== lineStart) ?? list[0]!) : ([...list].reverse().find((p) => p < lineStart) ?? list[list.length - 1]!);
      view.dispatch({ selection: { anchor: pick }, effects: EditorView.scrollIntoView(pick, { y: "center" }) });
      view.focus();
      return true;
    },
    jumpTo(line) {
      const l = view.state.doc.line(Math.min(Math.max(1, line), view.state.doc.lines));
      const at = l.from + (/^\s*/.exec(l.text)?.[0].length ?? 0);
      view.dispatch({ selection: { anchor: at }, effects: EditorView.scrollIntoView(at, { y: "center" }) });
      view.focus();
    },
    docsAtCursor() {
      void showDocsAtCursor(view, o.smarts);
    },
    insert(text) {
      if (text === "\t") {
        indentWithTab.run?.(view);
        return;
      }
      view.dispatch(view.state.replaceSelection(text));
      view.focus();
    },
    focus: () => view.focus(),
    setReadOnly(on) {
      view.dispatch({ effects: roC.reconfigure(on ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []) });
    },
    destroy: () => view.destroy(),
  };
  if (settings.vim || settings.minimap) void editor.applySettings(settings);
  return editor;
}
