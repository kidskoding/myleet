// Company logos: one SVG sprite (`/company-logos.svg`, built from Simple Icons) holds a
// symbol per company, a monochrome brand mark or a monogram tile, so pages only reference it.
import { esc, raw, type SafeHtml } from "./ui/html";
import logoManifest from "../assets/logos/manifest.json";

// A new manifest gets a new URL, including during client-side navigation.
const revision = [...JSON.stringify(logoManifest)].reduce((hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0, 0).toString(36);
export const LOGO_SPRITE = `/company-logos.svg?v=${revision}`;

/** A wordmark's box is at most this many times wider than tall; wider marks shrink inside it. */
const MAX_ASPECT = 4;
const aspects = logoManifest as Record<string, { aspect?: number } | null>;

/** Width over height of a company's logo box: 1, or wider for a wordmark such as BlackRock. */
export const logoAspect = (slug: string): number => Math.min(aspects[slug]?.aspect ?? 1, MAX_ASPECT);

/** The mark before a company name; decorative, since the name sits beside it. */
export const companyLogo = (slug: string, cls = ""): SafeHtml => {
  const r = logoAspect(slug);
  // Inline size so every page (palette, landing) gets it without extra CSS: 24px tall on the baseline,
  // and as wide as the mark needs, so a wordmark is as tall as a square mark. Pages resize by height.
  return raw(
    `<img class="co-logo${cls ? ` ${esc(cls)}` : ""}" src="/company-marks/${esc(slug)}.svg?v=${revision}" width="${Math.round(24 * r)}" height="24" style="height:24px;width:auto;aspect-ratio:${r};object-fit:contain;flex:none;display:inline-block;vertical-align:-0.2em" alt="" aria-hidden="true" loading="lazy" decoding="async"/>`,
  );
};

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
