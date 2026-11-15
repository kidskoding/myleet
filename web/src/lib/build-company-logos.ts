// Build-time only: one SVG symbol per company set for /company-logos.svg. Sources, in order
// (decided by scripts/vendor-logos.ts, recorded in src/assets/logos/manifest.json): SVGL
// full-colour marks, Simple Icons in its brand hex, gilbarbara/logos, an older Simple Icons
// release; otherwise a monogram tile. Colours stay the brand's, except that a single-colour
// mark under 3:1 on a theme's surface (Apple black on a dark surface) takes the theme's text colour
// there, through `light-dark()`, which follows the page's `color-scheme`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as icons from "simple-icons";
import { companySlug } from "./catalog";
import { flavorTokens, SITE_FLAVOR } from "./flavors";
import { monogram } from "./company-logos";
import type { Playlist } from "./types";

export type LogoKind = "full-colour" | "brand-hex" | "themed-mono" | "monogram";

interface ManifestEntry {
  source: string;
  icon?: string;
  file?: string;
  treatment?: "mono" | "light-background" | "dark-background";
  brandColor?: string;
  /** Width over height, recorded for wide marks (see WIDE_AT) so a page can size the box without the file. */
  aspect?: number;
}

/** Light and current site surfaces used to keep company marks legible. */
const LIGHT = ["#eff1f5", "#e6e9ef"];
const DARK = [flavorTokens(SITE_FLAVOR).surface!, flavorTokens(SITE_FLAVOR).ground!];
const INK_LIGHT = "var(--ink, #4c4f69)";
const INK_DARK = `var(--ink, ${flavorTokens(SITE_FLAVOR).ink})`;
const MIN_CONTRAST = 3;

const LOGO_DIR = join(process.cwd(), "src/assets/logos");

// ---- colour maths (WCAG) ----

const NAMED: Record<string, string> = { black: "#000000", white: "#ffffff", red: "#ff0000", blue: "#0000ff", green: "#008000" };

/** `#abc`, `#aabbcc`, `rgb(…)` or a few names to `#rrggbb`; null for none, url(…) and the like. */
export function toHex(v: string): string | null {
  const s = v.trim().toLowerCase();
  if (NAMED[s]) return NAMED[s] ?? null;
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s)?.[1];
  if (h) return `#${h.length === 3 ? [...h].map((c) => c + c).join("") : h}`;
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(s);
  if (rgb) return `#${rgb.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("")}`;
  return null;
}

const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Readable on every surface of the theme. */
export const visibleOn = (hex: string, surfaces: string[]): boolean => surfaces.every((s) => contrast(hex, s) >= MIN_CONTRAST);

function readableBrand(hex: string, surfaces: string[], dark: boolean): string {
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  if (Math.max(...rgb) - Math.min(...rgb) < 24) return dark ? INK_DARK : INK_LIGHT;
  for (let step = 1; step <= 20; step++) {
    const tint = `#${rgb.map((v) => Math.round(v + ((dark ? 255 : 0) - v) * step / 20).toString(16).padStart(2, "0")).join("")}`;
    if (visibleOn(tint, surfaces)) return tint;
  }
  return hex;
}

function hsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

const hue = (name: string): number => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;

/** Brand-ish tile and initials colours from the name, initials at AA (4.5:1) on the tile in both themes. */
export function monogramColours(name: string): { bgLight: string; fgLight: string; bgDark: string; fgDark: string } {
  const h = hue(name);
  const bgLight = hsl(h, 70, 90);
  const bgDark = hsl(h, 35, 24);
  let l = 40;
  while (l > 5 && contrast(hsl(h, 65, l), bgLight) < 4.5) l -= 2;
  let d = 70;
  while (d < 98 && contrast(hsl(h, 75, d), bgDark) < 4.5) d += 2;
  return { bgLight, fgLight: hsl(h, 65, l), bgDark, fgDark: hsl(h, 75, d) };
}

// ---- sources ----

let manifest: Record<string, ManifestEntry | null> | undefined;
const readManifest = () =>
  import.meta.env.DEV
    ? JSON.parse(readFileSync(join(LOGO_DIR, "manifest.json"), "utf8")) as Record<string, ManifestEntry | null>
    : (manifest ??= JSON.parse(readFileSync(join(LOGO_DIR, "manifest.json"), "utf8")) as Record<string, ManifestEntry | null>);

let siBySlug: Map<string, { path: string; hex: string }> | undefined;
function simpleIcon(slug: string): { path: string; hex: string } | undefined {
  if (!siBySlug) {
    siBySlug = new Map();
    for (const v of Object.values(icons) as unknown[]) {
      const i = v as { slug?: unknown; path?: unknown; hex?: unknown } | null;
      if (i && typeof i.slug === "string" && typeof i.path === "string" && typeof i.hex === "string") siBySlug.set(i.slug, { path: i.path, hex: i.hex });
    }
  }
  return siBySlug.get(slug);
}

/** The raw SVG for a set, or null for a monogram. */
export function sourceSvg(slug: string): string | null {
  const e = readManifest()[slug];
  if (!e) return null;
  if (e.file) {
    const svg = readFileSync(join(LOGO_DIR, e.file), "utf8");
    if (!e.treatment) return svg;
    const body = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
    const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 128 128";
    // Use the original image's silhouette as a mask. Neutral favicon backgrounds
    // drop out, and the mark follows the page ink without changing the stored PNG.
    const alpha = e.treatment === "light-background" ? "-1 -1 -1 0 3" : "1 1 1 0 0";
    const filter = e.treatment === "mono" ? "" : ` filter="url(#background)"`;
    const defs = e.treatment === "mono" ? "" : `<filter id="background" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 ${alpha}"/><feComponentTransfer><feFuncA type="linear" slope="1.5" intercept="-0.3"/></feComponentTransfer><feComposite in2="SourceAlpha" operator="in"/></filter>`;
    return `<svg viewBox="${viewBox}"><defs>${defs}<mask id="mark" mask-type="alpha"><g${filter}>${body}</g></mask></defs><rect width="100%" height="100%" fill="${e.brandColor ?? "currentColor"}" mask="url(#mark)"/></svg>`;
  }
  const si = e.icon ? simpleIcon(e.icon) : undefined;
  return si ? `<svg viewBox="0 0 24 24"><path fill="#${si.hex}" d="${si.path}"/></svg>` : null;
}

/** A mark at least this many times wider than tall gets a wider box instead of a square. */
export const WIDE_AT = 1.9;

/** Width over height of a set's vendored SVG, to 2 decimals; null without a file. */
export function logoAspect(slug: string): number | null {
  const file = readManifest()[slug]?.file;
  if (!file) return null;
  const svg = readFileSync(join(LOGO_DIR, file), "utf8");
  const open = /<svg\b[^>]*>/i.exec(svg)?.[0] ?? "";
  const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(open)?.[1]?.trim().split(/[\s,]+/).map(Number);
  const w = vb?.[2] ?? Number.parseFloat(/\bwidth\s*=\s*"([\d.]+)/.exec(open)?.[1] ?? "");
  const h = vb?.[3] ?? Number.parseFloat(/\bheight\s*=\s*"([\d.]+)/.exec(open)?.[1] ?? "");
  return w && h ? Math.round((w / h) * 100) / 100 : null;
}

// ---- SVG to symbol ----

const COLOUR_ATTR = /\b(fill|stroke|stop-color)\s*=\s*"([^"]*)"/g;
const COLOUR_DECL = /\b(fill|stroke|stop-color)\s*:\s*([^;"]+)/g;
const ROOT_PRESENTATION = /\b(fill|fill-rule|clip-rule|stroke|stroke-width|stroke-linecap|stroke-linejoin)\s*=\s*"[^"]*"/g;

export interface Symbolized {
  kind: Exclude<LogoKind, "monogram">;
  symbol: string;
  colours: string[];
}

/** Turns a logo SVG into `<symbol id>`: ids namespaced, metadata dropped, colours made visible on both themes. */
export function symbolize(svg: string, id: string): Symbolized | null {
  const open = /<svg\b[^>]*>/i.exec(svg)?.[0];
  if (!open) return null;
  let inner = svg.slice(svg.indexOf(open) + open.length, svg.lastIndexOf("</svg>"));
  const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(open)?.[1];
  const w = Number.parseFloat(/\bwidth\s*=\s*"([\d.]+)/.exec(open)?.[1] ?? "");
  const h = Number.parseFloat(/\bheight\s*=\s*"([\d.]+)/.exec(open)?.[1] ?? "");
  const viewBox = vb ?? (w && h ? `0 0 ${w} ${h}` : null);
  if (!viewBox) return null;
  inner = inner.replace(/<(title|desc|metadata|sodipodi:[a-z]+|inkscape:[a-z]+)\b[\s\S]*?(<\/\1>|\/>)/gi, "").replace(/\s(sodipodi|inkscape):[a-z-]+="[^"]*"/gi, "");
  // Namespace ids so gradients and clips from different logos never collide in one sprite.
  inner = inner
    .replace(/\bid="([^"]+)"/g, `id="${id}-$1"`)
    .replace(/url\(\s*['"]?#([^)'"]+)['"]?\s*\)/g, `url(#${id}-$1)`)
    .replace(/(xlink:href|href)="#([^"]+)"/g, `$1="#${id}-$2"`);
  // Styles inside symbols share the sprite's document. Scope vendor classes too:
  // otherwise a later logo's `.st0` rule can recolor Fidelity (or any other mark).
  const classes = new Set([...inner.matchAll(/\bclass="([^"]+)"/g)].flatMap((m) => (m[1] ?? "").split(/\s+/)).filter(Boolean));
  inner = inner.replace(/\bclass="([^"]+)"/g, (_m, names: string) => `class="${names.split(/\s+/).map((name) => `${id}-${name}`).join(" ")}"`);
  inner = inner.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, css: string) => {
    for (const name of classes) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      css = css.replace(new RegExp(`\\.${escaped}(?![\\w-])`, "g"), `.${id}-${name}`);
    }
    return `<style>${css}</style>`;
  });
  const rootAttrs = (open.match(ROOT_PRESENTATION) ?? []).join(" ");
  // Painted shapes with no fill anywhere draw in black.
  const values = [...inner.matchAll(COLOUR_ATTR), ...inner.matchAll(COLOUR_DECL), ...rootAttrs.matchAll(COLOUR_ATTR)].map((m) => m[2] ?? "");
  const explicitFill = /\bfill\s*[=:]/.test(inner) || /\bfill=/.test(rootAttrs);
  const colours = [...new Set(values.map(toHex).filter((c): c is string => !!c))];
  if (!explicitFill) colours.push("#000000");
  const unique = [...new Set(colours)];
  const group = (attrs: string, body: string) => `<g ${attrs}>${body}</g>`;
  let body = rootAttrs ? group(rootAttrs, inner) : inner;
  if (!explicitFill) body = group('fill="#000000"', body);

  if (unique.length !== 1) return { kind: "full-colour", symbol: `<symbol id="${id}" viewBox="${viewBox}">${body}</symbol>`, colours: unique };

  const c = unique[0] as string;
  const okLight = visibleOn(c, LIGHT);
  const okDark = visibleOn(c, DARK);
  if (okLight && okDark) return { kind: "brand-hex", symbol: `<symbol id="${id}" viewBox="${viewBox}">${body}</symbol>`, colours: unique };
  // One colour, unreadable on a theme: paint it with currentColor and choose that per theme.
  const same = (v: string) => toHex(v) === c;
  body = body
    .replace(COLOUR_ATTR, (m, prop: string, v: string) => (same(v) ? `${prop}="currentColor"` : m))
    .replace(COLOUR_DECL, (m, prop: string, v: string) => (same(v) ? `${prop}:currentColor` : m));
  const tint = `light-dark(${okLight ? c : readableBrand(c, LIGHT, false)}, ${okDark ? c : readableBrand(c, DARK, true)})`;
  return { kind: "themed-mono", symbol: `<symbol id="${id}" viewBox="${viewBox}"><g style="color:${tint}">${body}</g></symbol>`, colours: unique };
}

function monogramSymbol(id: string, title: string): string {
  const m = monogram(title);
  const size = m.length >= 3 ? 9.5 : m.length === 2 ? 12 : 15;
  const k = monogramColours(title);
  return `<symbol id="${id}" viewBox="0 0 24 24"><rect x="0" y="0" width="24" height="24" rx="5.5" style="fill:light-dark(${k.bgLight}, ${k.bgDark})"/><text x="12" y="12" dy="0.36em" text-anchor="middle" font-size="${size}" font-weight="700" font-family="Archivo Variable, Archivo, system-ui, sans-serif" style="fill:light-dark(${k.fgLight}, ${k.fgDark})">${m.replace(/&/g, "&amp;")}</text></symbol>`;
}

export interface LogoResult {
  slug: string;
  kind: LogoKind;
  symbol: string;
}

export function logoFor(p: Pick<Playlist, "id" | "title">): LogoResult {
  const slug = companySlug(p.id);
  const id = `co-${slug}`;
  const src = sourceSvg(slug);
  const s = src ? symbolize(src, id) : null;
  return s ? { slug, kind: s.kind, symbol: s.symbol } : { slug, kind: "monogram", symbol: monogramSymbol(id, p.title) };
}

/** The sprite: one symbol per set. */
export function logoSprite(sets: Pick<Playlist, "id" | "title">[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${sets.map((p) => logoFor(p).symbol).join("")}</svg>`;
}
