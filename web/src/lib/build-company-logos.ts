// Build-time only: matches each company set to a Simple Icons mark (CC0) by name. Companies
// Simple Icons doesn't carry (several brands asked to be removed) get a monogram tile.
import * as icons from "simple-icons";
import { companySlug } from "./catalog";
import { monogram } from "./company-logos";
import type { Playlist } from "./types";

interface Icon {
  slug: string;
  title: string;
  path: string;
}

/** Names that don't match their Simple Icons title; null where the same name is another brand. */
const ALIASES: Record<string, string | null> = {
  snap: "snapchat",
  alibaba: "alibabadotcom",
  magic: null, // Simple Icons' "Magic" is the auth company, not magic.dev
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

let index: Map<string, Icon> | undefined;

function lookup(): Map<string, Icon> {
  if (index) return index;
  index = new Map();
  for (const v of Object.values(icons) as unknown[]) {
    const i = v as Partial<Icon> | null;
    if (!i || typeof i.slug !== "string" || typeof i.path !== "string" || typeof i.title !== "string") continue;
    const icon = { slug: i.slug, title: i.title, path: i.path };
    index.set(i.slug, icon);
    if (!index.has(norm(i.title))) index.set(norm(i.title), icon);
  }
  return index;
}

/** The Simple Icons mark for a set, trying the full name, its parts ("Salesforce / Slack") and the slug. */
export function iconFor(p: Pick<Playlist, "id" | "title">): Icon | null {
  const map = lookup();
  const slug = companySlug(p.id);
  const alias = ALIASES[slug];
  if (alias !== undefined) return alias === null ? null : (map.get(alias) ?? null);
  const tries = [p.title, p.title.replace(/\s*\(.*\)/, ""), ...p.title.split(/\s*[/(),]\s*/), slug].map(norm).filter(Boolean);
  for (const k of tries) {
    const hit = map.get(k);
    if (hit) return hit;
  }
  return null;
}

/** One `<symbol id="co-<slug>">` per set: the mark, or initials on a soft tile. */
export function logoSprite(sets: Pick<Playlist, "id" | "title">[]): string {
  const symbols = sets.map((p) => {
    const id = `co-${companySlug(p.id)}`;
    const i = iconFor(p);
    if (i) return `<symbol id="${id}" viewBox="0 0 24 24"><path fill="currentColor" d="${i.path}"/></symbol>`;
    const m = monogram(p.title);
    const size = m.length >= 3 ? 9.5 : m.length === 2 ? 12 : 15;
    return `<symbol id="${id}" viewBox="0 0 24 24"><rect x="0.5" y="0.5" width="23" height="23" rx="5" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.35"/><text x="12" y="12" dy="0.36em" text-anchor="middle" font-size="${size}" font-weight="700" fill="currentColor" font-family="Archivo Variable, Archivo, system-ui, sans-serif">${m.replace(/&/g, "&amp;")}</text></symbol>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>`;
}
