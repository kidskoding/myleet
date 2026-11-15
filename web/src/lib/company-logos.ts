// Company logos: one SVG sprite (`/company-logos.svg`, built from Simple Icons) holds a
// symbol per company, a monochrome brand mark or a monogram tile, so pages only reference it.
import { esc, raw, type SafeHtml } from "./ui/html";

export const LOGO_SPRITE = "/company-logos.svg";

/** The mark before a company name; decorative, since the name sits beside it. */
export const companyLogo = (slug: string, cls = ""): SafeHtml =>
  // Inline size so every page (palette, landing) gets it without extra CSS; about 1.1em on the baseline.
  raw(
    `<svg class="co-logo${cls ? ` ${esc(cls)}` : ""}" viewBox="0 0 24 24" style="width:1.1em;height:1.1em;flex:none;display:inline-block;vertical-align:-0.2em" aria-hidden="true" focusable="false"><use href="${LOGO_SPRITE}#co-${esc(slug)}"/></svg>`,
  );

/** "Jane Street" -> "JS", "Ramp" -> "R", "Susquehanna (SIG)" -> "SIG", "IMC Trading" -> "IMC". */
export function monogram(title: string): string {
  const paren = /\(([A-Z0-9&]{2,4})\)/.exec(title)?.[1];
  if (paren) return paren;
  const words = title
    .replace(/\(.*?\)/g, "")
    .split(/[\s/]+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ""))
    .filter((w) => w && w.toLowerCase() !== "the");
  const first = words[0] ?? "?";
  if (/^[A-Z0-9]{2,4}$/.test(first)) return first;
  if (words.length === 1) return first.charAt(0).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}
