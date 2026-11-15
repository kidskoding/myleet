// Vendors company logos into src/assets/logos/ (run by hand, needs network):
//   bun scripts/vendor-logos.ts <old-simple-icons-package-dir>
// Order per company: SVGL (full-colour official marks) > Simple Icons (installed, brand hex) >
// gilbarbara/logos > an older Simple Icons release for brands since removed > monogram.
// Writes one SVG per vendored logo and manifest.json for every company set.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as current from "simple-icons";

interface Si {
  slug: string;
  title: string;
  path: string;
  hex: string;
}
interface Entry {
  source: string;
  /** Simple Icons slug read from the installed package at build. */
  icon?: string;
  /** Vendored file under src/assets/logos/. */
  file?: string;
  url?: string;
}

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "src/assets/logos");
const oldDir = process.argv[2];
if (!oldDir) throw new Error("usage: bun scripts/vendor-logos.ts <old-simple-icons-package-dir>");
const OLD_VERSION = (JSON.parse(readFileSync(join(oldDir, "package.json"), "utf8")) as { version: string }).version;

/** Matches that the name finds wrongly, or a source to prefer. */
const SKIP_SVGL = new Set(["disney", "x", "magic"]);
const NONE = new Set(["magic"]); // Simple Icons' "Magic" is the auth company, not magic.dev
const ALIAS: Record<string, string> = { snap: "snapchat", alibaba: "alibabadotcom" };
const MAX_BYTES = 24_000;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

const catalog = JSON.parse(readFileSync(join(ROOT, "public/data/catalog.json"), "utf8")) as { playlists: { id: string; title: string }[] };
const slugOf = (id: string) => id.replace(/^\d+_/, "");
const candidates = (title: string, slug: string) =>
  [title, title.replace(/\s*\(.*\)/, ""), ...title.split(/\s*[/(),]\s*/), slug].map(norm).filter(Boolean);

function index<T>(items: T[], keys: (t: T) => string[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const it of items) for (const k of keys(it)) if (k && !m.has(k)) m.set(k, it);
  return m;
}
const find = <T>(m: Map<string, T>, title: string, slug: string) => candidates(title, slug).map((k) => m.get(k)).find(Boolean);

const siCurrent = index((Object.values(current) as unknown[]).filter((v): v is Si => !!v && typeof (v as Si).slug === "string"), (i) => [i.slug, norm(i.title)]);
const oldMod = (await import(join(oldDir, "index.mjs"))) as Record<string, unknown>;
const siOld = index(Object.values(oldMod).filter((v): v is Si => !!v && typeof (v as Si).slug === "string"), (i) => [i.slug, norm(i.title)]);

type SvglEntry = { title: string; route: string | { light: string; dark: string } };
const svgl = index((await (await fetch("https://api.svgl.app")).json()) as SvglEntry[], (e) => [norm(e.title)]);
const gbTree = (await (await fetch("https://api.github.com/repos/gilbarbara/logos/git/trees/main?recursive=1")).json()) as { tree: { path: string }[] };
const gbNames = gbTree.tree.map((t) => t.path).filter((p) => /^logos\/[^/]+\.svg$/.test(p)).map((p) => p.slice(6, -4));
// Prefer a square "-icon" variant over the wordmark.
const gb = index(gbNames, (n) => (n.endsWith("-icon") ? [norm(n.slice(0, -5))] : [norm(n)]));
for (const n of gbNames) if (n.endsWith("-icon")) gb.set(norm(n.slice(0, -5)), n);

async function grab(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const svg = (await res.text()).replace(/<\?xml[^>]*>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return svg.startsWith("<svg") && svg.length <= MAX_BYTES ? svg : null;
}

// Keep manually verified marks and website icons when refreshing the package sources.
const verified = JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf8")) as Record<string, Entry | null>;
mkdirSync(OUT, { recursive: true });
const manifest: Record<string, Entry | null> = {};
for (const p of catalog.playlists) {
  const slug = slugOf(p.id);
  if (verified[slug]) {
    manifest[slug] = verified[slug] ?? null;
    continue;
  }
  if (NONE.has(slug)) {
    manifest[slug] = null;
    continue;
  }
  const alias = ALIAS[slug];
  const s = SKIP_SVGL.has(slug) ? undefined : find(svgl, p.title, slug);
  if (s) {
    const url = typeof s.route === "string" ? s.route : s.route.light;
    const svg = await grab(url);
    if (svg) {
      writeFileSync(join(OUT, `${slug}.svg`), svg);
      manifest[slug] = { source: "svgl", file: `${slug}.svg`, url };
      continue;
    }
  }
  const si = alias ? siCurrent.get(alias) : find(siCurrent, p.title, slug);
  if (si) {
    manifest[slug] = { source: "simple-icons", icon: si.slug };
    continue;
  }
  const g = find(gb, p.title, slug);
  if (g) {
    const url = `https://raw.githubusercontent.com/gilbarbara/logos/main/logos/${g}.svg`;
    const svg = await grab(url);
    if (svg) {
      writeFileSync(join(OUT, `${slug}.svg`), svg);
      manifest[slug] = { source: "gilbarbara/logos", file: `${slug}.svg`, url };
      continue;
    }
  }
  const o = find(siOld, p.title, slug);
  if (o) {
    writeFileSync(join(OUT, `${slug}.svg`), `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#${o.hex}" d="${o.path}"/></svg>`);
    manifest[slug] = { source: `simple-icons@${OLD_VERSION}`, file: `${slug}.svg` };
    continue;
  }
  manifest[slug] = null;
}
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
const by = new Map<string, number>();
for (const e of Object.values(manifest)) by.set(e?.source ?? "monogram", (by.get(e?.source ?? "monogram") ?? 0) + 1);
console.log(Object.fromEntries(by));
