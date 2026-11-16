// Custom input: one typed field per parameter (from the starter's signature), checked as a
// Python literal before running, then run against your code and the reference through a
// generated pytest file whose single test reports its result in the failure message.

import type { RunResult } from "../runner/types";

export interface Param {
  name: string;
  /** Annotation text, "" when missing. */
  type: string;
}

export type Signature =
  | { kind: "function"; name: string; params: Param[]; returns: string }
  | { kind: "class"; name: string };

/** Top-level parameter split: commas outside brackets. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((p) => p.trim()).filter(Boolean);
}

/** The function or design class the problem asks for, read from the starter. */
export function parseSignature(starter: string): Signature | null {
  const cls = /^class\s+(\w+)/m.exec(starter);
  const fn = /^def\s+(\w+)\s*\(([\s\S]*?)\)\s*(?:->\s*([^:]+))?:/m.exec(starter);
  if (cls && (!fn || cls.index < fn.index)) return { kind: "class", name: cls[1]! };
  if (!fn) return null;
  const params = splitTop(fn[2]!)
    .filter((p) => !p.startsWith("*") && p !== "self" && p !== "/")
    .map((p) => {
      const [head] = p.split("=");
      const [name, ...type] = head!.split(":");
      return { name: name!.trim(), type: type.join(":").trim() };
    });
  return { kind: "function", name: fn[1]!, params, returns: (fn[3] ?? "").trim() };
}

// Python literals are checked in the page so the error shows as you type.

type Lit =
  | { t: "int" | "float"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "none" }
  | { t: "list" | "tuple" | "set"; v: Lit[] }
  | { t: "dict"; v: [Lit, Lit][] };

class LitError extends Error {}

export function parseLiteral(src: string): Lit {
  let i = 0;
  const ws = () => {
    while (i < src.length && /\s/.test(src[i]!)) i++;
  };
  const fail = (): never => {
    throw new LitError("bad literal");
  };
  const value = (): Lit => {
    ws();
    const c = src[i];
    if (c === undefined) fail();
    if (c === "[" || c === "(" || c === "{") return seq(c);
    if (c === "'" || c === '"') {
      const q = c;
      let s = "";
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") i++;
        s += src[i++] ?? "";
      }
      if (src[i] !== q) fail();
      i++;
      return { t: "str", v: s };
    }
    const word = /^(True|False|None)\b/.exec(src.slice(i));
    if (word) {
      i += word[1]!.length;
      return word[1] === "None" ? { t: "none" } : { t: "bool", v: word[1] === "True" };
    }
    const num = /^[-+]?(\d[\d_]*(\.\d*)?([eE][-+]?\d+)?|\.\d+|inf\b)/.exec(src.slice(i));
    if (num) {
      i += num[0].length;
      const isFloat = /[.eE]|inf/.test(num[0]);
      return { t: isFloat ? "float" : "int", v: Number(num[0].replace(/_/g, "")) };
    }
    return fail();
  };
  const seq = (open: string): Lit => {
    const close = open === "[" ? "]" : open === "(" ? ")" : "}";
    i++;
    const items: Lit[] = [];
    const pairs: [Lit, Lit][] = [];
    let dict = false;
    let sawComma = false;
    for (;;) {
      ws();
      if (src[i] === close) {
        i++;
        break;
      }
      const k = value();
      ws();
      if (open === "{" && src[i] === ":") {
        i++;
        dict = true;
        pairs.push([k, value()]);
      } else items.push(k);
      ws();
      if (src[i] === ",") {
        i++;
        sawComma = true;
        continue;
      }
      if (src[i] === close) {
        i++;
        break;
      }
      fail();
    }
    if (open === "[") return { t: "list", v: items };
    if (open === "(") return items.length === 1 && !sawComma ? items[0]! : { t: "tuple", v: items };
    return dict || (items.length === 0 && pairs.length === 0) ? { t: "dict", v: pairs } : { t: "set", v: items };
  };
  const out = value();
  ws();
  if (i !== src.length) fail();
  return out;
}

/** Splits `A | B` and `Optional[A]` into alternatives. */
function alternatives(type: string): string[] {
  const t = type.replace(/\s+/g, "");
  const opt = /^Optional\[(.+)\]$/.exec(t);
  if (opt) return [opt[1]!, "None"];
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of t) {
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    if (ch === "|" && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

const PLURAL: Record<string, string> = { int: "ints", float: "numbers", str: "strings", bool: "booleans" };

function plural(type: string): string {
  const one = alternatives(type).filter((a) => a !== "None")[0] ?? type;
  const inner = /^(?:list|List)\[(.+)\]$/.exec(one);
  if (inner) return `lists of ${plural(inner[1]!)}`;
  return PLURAL[one] ?? `${one} values`;
}

/** "a list of ints" for messages. */
export function describeType(type: string): string {
  const one = alternatives(type).filter((a) => a !== "None")[0] ?? type;
  const inner = /^(?:list|List)\[(.+)\]$/.exec(one);
  if (inner) return `a list of ${plural(inner[1]!)}`;
  if (one === "int") return "an int";
  if (one === "str") return "a string";
  if (one === "float") return "a number";
  if (one === "bool") return "True or False";
  if (/ListNode/.test(one)) return "a list of values for the linked list";
  if (/TreeNode/.test(one)) return "a level-order list (None for gaps)";
  return one;
}

function matches(v: Lit, type: string): boolean {
  if (!type) return true;
  return alternatives(type).some((alt) => {
    if (alt === "None") return v.t === "none";
    if (alt === "Any" || alt === "object") return true;
    if (alt === "int") return v.t === "int";
    if (alt === "float") return v.t === "int" || v.t === "float";
    if (alt === "str") return v.t === "str";
    if (alt === "bool") return v.t === "bool";
    if (/ListNode/.test(alt)) return v.t === "none" || ((v.t === "list" || v.t === "tuple") && v.v.every((x) => x.t !== "list"));
    if (/TreeNode/.test(alt)) return v.t === "none" || ((v.t === "list" || v.t === "tuple") && v.v.every((x) => x.t !== "list"));
    const g = /^(\w+)(?:\[(.+)\])?$/.exec(alt);
    if (!g) return true;
    const [, head, args] = g;
    const h = head!.toLowerCase();
    if (h === "list" || h === "sequence") {
      if (v.t !== "list" && v.t !== "tuple") return false;
      return !args || v.v.every((x) => matches(x, args));
    }
    if (h === "tuple") return v.t === "tuple" || v.t === "list";
    if (h === "set" || h === "frozenset") {
      if (v.t !== "set" && v.t !== "list" && !(v.t === "dict" && v.v.length === 0)) return false;
      return !args || v.t === "dict" || v.v.every((x) => matches(x, args));
    }
    if (h === "dict" || h === "mapping") return v.t === "dict";
    // Types the page cannot check (custom classes) are left to Python.
    return true;
  });
}

/** Null when `text` is a valid literal of `type`, else the message shown under the field. */
export function checkInput(text: string, type: string): string | null {
  const shown = text.length > 24 ? `${text.slice(0, 23)}…` : text;
  let v: Lit;
  try {
    v = parseLiteral(text);
  } catch {
    return type ? `Expected ${describeType(type)}, got '${shown}'` : `Not a Python literal: '${shown}'`;
  }
  return matches(v, type) ? null : `Expected ${describeType(type)}, got '${shown}'`;
}

/** Whether every parameter is something the page can build from a literal. */
export function supported(sig: Signature): boolean {
  if (sig.kind === "class") return true;
  return sig.params.every((p) => {
    const named = p.type.match(/\b[A-Z]\w*/g) ?? [];
    return named.every((n) => ["ListNode", "TreeNode", "Optional", "List", "Dict", "Tuple", "Set", "Any", "None"].includes(n));
  });
}

/** Default input for a parameter: an example value of its type. */
export function placeholderFor(type: string): string {
  const alts = alternatives(type).filter((a) => a !== "None");
  const t = alts[0] ?? "";
  if (/^(?:list|List)\[(?:list|List)\[/.test(t)) return "[[1, 2], [3, 4]]";
  if (/^(?:list|List)\[str/.test(t)) return '["a", "b"]';
  if (/^(?:list|List)\[/.test(t) || /ListNode|TreeNode/.test(t)) return "[1, 2, 3]";
  if (t === "str") return '"abc"';
  if (t === "bool") return "True";
  if (t === "float") return "1.5";
  return "1";
}

export interface CaseResult {
  /** `repr` of the return value (or the call list's results for a design class). */
  value: string | null;
  error: string | null;
  /** Line in solution.py where an exception was raised. */
  line: number | null;
  printed: string;
  ms: number | null;
}

const MARK = "__MYLEET__";

const HARNESS = String.raw`
import ast, contextlib, io, json, sys, time, traceback
import solution as _s

def _kind(t):
    if "ListNode" in t and not t.replace(" ", "").startswith("list["):
        return "list_node"
    if "TreeNode" in t and not t.replace(" ", "").startswith("list["):
        return "tree"
    return "plain"

def _to(v, k):
    if v is None:
        return None
    if k == "list_node":
        from list_node import ListNode
        head = None
        for x in reversed(list(v)):
            head = ListNode(x, head)
        return head
    if k == "tree":
        from binary_tree import build_tree_from_level_order
        return build_tree_from_level_order(list(v))
    return v

def _back(r):
    name = type(r).__name__
    if name == "ListNode":
        out, seen = [], 0
        while r is not None and seen < 10000:
            out.append(r.val)
            r = r.next
            seen += 1
        return out
    if name == "TreeNode":
        from binary_tree import tree_to_level_order
        return tree_to_level_order(r)
    if isinstance(r, list):
        return [_back(x) for x in r]
    return r

def _line(e):
    n = None
    for fr in traceback.extract_tb(e.__traceback__):
        if fr.filename.endswith("solution.py"):
            n = fr.lineno
    return n

def _report(res):
    raise AssertionError("${MARK}" + json.dumps(res))

def _call(fn_name, raws, types):
    out, res = io.StringIO(), {"value": None, "error": None, "line": None, "ms": None}
    try:
        vals = [_to(ast.literal_eval(s), _kind(t)) for s, t in zip(raws, types)]
        fn = getattr(_s, fn_name)
        t0 = time.perf_counter()
        with contextlib.redirect_stdout(out):
            r = fn(*vals)
        res["ms"] = (time.perf_counter() - t0) * 1000
        if r is None and vals:
            r = vals[0]
        res["value"] = repr(_back(r))
    except Exception as e:
        res["error"] = "".join(traceback.format_exception_only(type(e), e)).strip().split("\n")[-1]
        res["line"] = _line(e)
    res["printed"] = out.getvalue()
    _report(res)

def _design(cls_name, raw):
    out, res = io.StringIO(), {"value": None, "error": None, "line": None, "ms": None}
    try:
        calls = ast.literal_eval(raw)
        if calls and not isinstance(calls[0], (list, tuple)):
            calls = [calls]
        cls = getattr(_s, cls_name)
        results, obj = [], None
        t0 = time.perf_counter()
        with contextlib.redirect_stdout(out):
            for c in calls:
                name, args = c[0], list(c[1:])
                if obj is None:
                    if name == cls_name:
                        obj = cls(*args)
                        results.append(None)
                        continue
                    obj = cls()
                results.append(_back(getattr(obj, name)(*args)))
        res["ms"] = (time.perf_counter() - t0) * 1000
        res["value"] = repr(results)
    except Exception as e:
        res["error"] = "".join(traceback.format_exception_only(type(e), e)).strip().split("\n")[-1]
        res["line"] = _line(e)
    res["printed"] = out.getvalue()
    _report(res)
`;

/** A pytest file with one `test_case_<i>` per input row. */
export function customTest(sig: Signature, rows: string[][]): string {
  const cases = rows.map((raws, i) => {
    const call =
      sig.kind === "class"
        ? `_design(${JSON.stringify(sig.name)}, ${JSON.stringify(raws[0] ?? "[]")})`
        : `_call(${JSON.stringify(sig.name)}, ${JSON.stringify(raws)}, ${JSON.stringify(sig.params.map((p) => p.type))})`;
    return `\ndef test_case_${i}():\n    ${call}\n`;
  });
  return HARNESS + cases.join("");
}

/** Reads each case's report back out of the run, in input order. */
export function readCases(r: RunResult, count: number): (CaseResult | null)[] {
  const out: (CaseResult | null)[] = Array.from({ length: count }, () => null);
  for (const t of r.tests) {
    const i = /^test_case_(\d+)$/.exec(t.name)?.[1];
    if (i === undefined) continue;
    const text = `${t.message}\n${t.detail}`;
    const at = text.indexOf(MARK);
    if (at < 0) {
      out[Number(i)] = { value: null, error: t.message || "did not run", line: null, printed: "", ms: null };
      continue;
    }
    const json = text.slice(at + MARK.length).split("\n")[0]!;
    try {
      out[Number(i)] = JSON.parse(json) as CaseResult;
    } catch {
      out[Number(i)] = { value: null, error: "could not read the result", line: null, printed: "", ms: null };
    }
  }
  return out;
}
