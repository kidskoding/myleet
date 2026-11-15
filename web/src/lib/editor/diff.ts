// Line diff for the History and Solution views: LCS over lines, laid out side by side
// (deleted lines face added ones) or as one unified column for phones.

export type Op = { kind: "same" | "del" | "add"; text: string };

export interface Row {
  left: { text: string; kind: "same" | "del" } | null;
  right: { text: string; kind: "same" | "add" } | null;
}

const MAX_CELLS = 4_000_000;

function lines(s: string): string[] {
  const l = s.replace(/\r\n?/g, "\n").split("\n");
  if (l.length > 1 && l[l.length - 1] === "") l.pop();
  return l;
}

/** Edit script turning `a` into `b`. */
export function diffLines(a: string, b: string): Op[] {
  const x = lines(a);
  const y = lines(b);
  // Trim the common head and tail so the table only covers the changed middle.
  let head = 0;
  while (head < x.length && head < y.length && x[head] === y[head]) head++;
  let tail = 0;
  while (tail < x.length - head && tail < y.length - head && x[x.length - 1 - tail] === y[y.length - 1 - tail]) tail++;
  const xs = x.slice(head, x.length - tail);
  const ys = y.slice(head, y.length - tail);
  const out: Op[] = x.slice(0, head).map((text) => ({ kind: "same", text }));
  if (xs.length * ys.length > MAX_CELLS) {
    // shortcut: huge inputs show as a full replace rather than an LCS; solutions are short.
    out.push(...xs.map((text) => ({ kind: "del" as const, text })), ...ys.map((text) => ({ kind: "add" as const, text })));
  } else {
    const n = xs.length;
    const m = ys.length;
    const t = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        t[i]![j] = xs[i] === ys[j] ? t[i + 1]![j + 1]! + 1 : Math.max(t[i + 1]![j]!, t[i]![j + 1]!);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (xs[i] === ys[j]) {
        out.push({ kind: "same", text: xs[i]! });
        i++;
        j++;
      } else if (t[i + 1]![j]! >= t[i]![j + 1]!) {
        out.push({ kind: "del", text: xs[i++]! });
      } else {
        out.push({ kind: "add", text: ys[j++]! });
      }
    }
    while (i < n) out.push({ kind: "del", text: xs[i++]! });
    while (j < m) out.push({ kind: "add", text: ys[j++]! });
  }
  out.push(...x.slice(x.length - tail).map((text) => ({ kind: "same" as const, text })));
  return out;
}

/** Pairs each run of deletions with the additions after it, so changed lines sit side by side. */
export function sideBySide(ops: Op[]): Row[] {
  const rows: Row[] = [];
  let k = 0;
  while (k < ops.length) {
    const op = ops[k]!;
    if (op.kind === "same") {
      rows.push({ left: { text: op.text, kind: "same" }, right: { text: op.text, kind: "same" } });
      k++;
      continue;
    }
    const dels: string[] = [];
    const adds: string[] = [];
    while (k < ops.length && ops[k]!.kind === "del") dels.push(ops[k++]!.text);
    while (k < ops.length && ops[k]!.kind === "add") adds.push(ops[k++]!.text);
    for (let r = 0; r < Math.max(dels.length, adds.length); r++) {
      const d = dels[r];
      const a = adds[r];
      rows.push({
        left: d === undefined ? null : { text: d, kind: "del" },
        right: a === undefined ? null : { text: a, kind: "add" },
      });
    }
  }
  return rows;
}

export function diffStats(ops: Op[]): { added: number; removed: number } {
  return {
    added: ops.filter((o) => o.kind === "add").length,
    removed: ops.filter((o) => o.kind === "del").length,
  };
}
