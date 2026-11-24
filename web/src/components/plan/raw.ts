import type { SafeHtml } from "../../lib/ui/html";

/** Shared renderers (icons, mix bars, notes) return escaped SafeHtml; this turns it into nodes Solid can insert as is. */
export function raw(h: SafeHtml | string): Node[] {
  const t = document.createElement("template");
  t.innerHTML = String(h);
  return [...t.content.childNodes];
}
