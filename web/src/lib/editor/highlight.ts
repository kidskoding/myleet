// One mapping from Python syntax to token classes, shared by the server-rendered starter
// (paint before JS) and CodeMirror, so the swap from static HTML to the editor never
// shifts or recolours text. Colours live in CSS (`.sk` reads `--syn-keyword`, ...).

import { highlightTree, tagHighlighter, tags as t } from "@lezer/highlight";
import { parser } from "@lezer/python";
import type { Tree } from "@lezer/common";

export const synHighlighter = tagHighlighter([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword, t.bool, t.null, t.modifier], class: "sk" },
  { tag: [t.function(t.definition(t.variableName)), t.definition(t.className)], class: "sd" },
  { tag: [t.string, t.special(t.string), t.escape], class: "ss" },
  { tag: t.number, class: "sn" },
  { tag: t.lineComment, class: "sc" },
  {
    tag: [t.arithmeticOperator, t.bitwiseOperator, t.compareOperator, t.definitionOperator, t.updateOperator, t.derefOperator],
    class: "so",
  },
  { tag: [t.paren, t.squareBracket, t.brace, t.separator, t.punctuation], class: "sp" },
  { tag: t.meta, class: "sb" },
]);

/** Builtins and the standard modules interview code leans on; coloured like the spec's `len`, `range`, `heapq`. */
export const BUILTINS = new Set(
  (
    "abs all any ascii bin bool bytearray bytes callable chr classmethod complex dict dir divmod enumerate " +
    "filter float format frozenset getattr globals hasattr hash hex id input int isinstance issubclass iter " +
    "len list locals map max memoryview min next object oct open ord pow print property range repr reversed " +
    "round set setattr slice sorted staticmethod str sum super tuple type vars zip " +
    "heapq collections itertools functools math bisect typing string random re deque defaultdict Counter " +
    "OrderedDict heappush heappop heapify heappushpop heapreplace nlargest nsmallest lru_cache cache inf " +
    "Optional List Dict Set Tuple self cls NotImplementedError ValueError IndexError KeyError Exception"
  ).split(" "),
);

export interface Span {
  from: number;
  to: number;
  cls: string;
}

/** Builtin names among plain variable references (not definitions, not attributes). */
export function builtinSpans(code: string, tree: Tree, from = 0, to = code.length): Span[] {
  const out: Span[] = [];
  tree.iterate({
    from,
    to,
    enter(n) {
      if (n.name !== "VariableName") return;
      const parent = n.node.parent?.name;
      if (parent === "FunctionDefinition" || parent === "ClassDefinition") return;
      if (BUILTINS.has(code.slice(n.from, n.to))) out.push({ from: n.from, to: n.to, cls: "sb" });
    },
  });
  return out;
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Static highlighted HTML, one `<div class="cl">` per line, for the paint before the editor loads. */
export function highlightLines(code: string): string[] {
  const tree = parser.parse(code);
  const spans: Span[] = [];
  highlightTree(tree, synHighlighter, (from, to, cls) => spans.push({ from, to, cls }));
  const built = builtinSpans(code, tree);
  const byPos = new Map(built.map((s) => [s.from, s]));
  const all = [...spans.filter((s) => !byPos.has(s.from)), ...built].sort((a, b) => a.from - b.from);
  let html = "";
  let pos = 0;
  for (const s of all) {
    if (s.from < pos) continue;
    html += escape(code.slice(pos, s.from));
    // A span may cross lines (strings, comments); close and reopen it at each newline.
    html += code
      .slice(s.from, s.to)
      .split("\n")
      .map((part) => `<span class="${s.cls}">${escape(part)}</span>`)
      .join("\n");
    pos = s.to;
  }
  html += escape(code.slice(pos));
  const lines = html.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}
