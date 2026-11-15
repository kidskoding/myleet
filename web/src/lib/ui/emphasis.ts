import { esc, raw, type SafeHtml } from "./html";

/**
 * Bolds the facts a reader scans for in a coaching note: the focus topic ("focusing on X" or
 * "time on X"), any "N days", and the given company names. Escapes everything else.
 */
export function emphasize(text: string, companies: string[] = []): SafeHtml {
  let s = esc(text);
  s = s.replace(/\b(focusing on|time on|starting with) ([^,.!;]+)/, "$1 <strong>$2</strong>");
  s = s.replace(/\b(\d+ days?)\b/g, "<strong>$1</strong>");
  for (const c of companies) {
    const e = esc(c).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`(^|[^>\\w])(${e})(?=[^\\w<]|$)`, "g"), "$1<strong>$2</strong>");
  }
  return raw(s);
}
