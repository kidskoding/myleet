// Tiny escaping template for client-rendered markup. Shared renderers return SafeHtml so
// nesting never double-escapes, and Astro components print them with `set:html`.

export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

export const raw = (s: string): SafeHtml => new SafeHtml(s);

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(v: unknown): string {
  return String(v).replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

type Value = SafeHtml | string | number | boolean | null | undefined | readonly Value[];

function part(v: Value): string {
  if (v === null || v === undefined || v === false || v === true) return "";
  if (v instanceof SafeHtml) return v.value;
  if (Array.isArray(v)) return v.map(part).join("");
  return esc(v);
}

export function html(strings: TemplateStringsArray, ...values: Value[]): SafeHtml {
  let out = strings[0] ?? "";
  values.forEach((v, i) => (out += part(v) + (strings[i + 1] ?? "")));
  return new SafeHtml(out);
}

/** Replaces an element's children with rendered markup. */
export function render(el: Element | null, h: SafeHtml): void {
  if (el) el.innerHTML = h.value;
}
