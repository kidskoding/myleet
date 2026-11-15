import type { APIRoute } from "astro";
import { listedCompany } from "../lib/catalog";
import { buildCatalog } from "../lib/build-catalog";
import type { PaletteItem } from "../lib/palette-search";
import { companyHref, moduleHref, noteHref, problemHref } from "../lib/routes";

// The palette's search index, built once: titles and links only, a fraction of catalog.json.
export const GET: APIRoute = () => {
  const c = buildCatalog();
  const items: PaletteItem[] = [];
  for (const p of c.problems) {
    const m = c.modules[p.module];
    if (!m || m.bank) continue;
    const t = m.techniques[p.technique];
    items.push({
      key: `p:${p.id}`,
      kind: "problem",
      title: p.title,
      hint: `${m.title}, ${t?.title ?? ""}`,
      aliases: p.leetcode ? [String(p.leetcode), `lc${p.leetcode}`] : [],
      href: problemHref(p.id),
      meta: { id: p.id, d: p.difficulty },
    });
  }
  for (const n of c.guide) items.push({ key: `n:${n.path}`, kind: "note", title: n.title, hint: "Start here", href: noteHref(n.path) });
  for (const m of c.modules) {
    if (m.bank) continue;
    for (const n of m.notes) items.push({ key: `n:${n.path}`, kind: "note", title: n.title, hint: `Note, ${m.title}`, href: noteHref(n.path) });
    for (const t of m.techniques)
      items.push({
        key: `t:${m.id}/${t.id}`,
        kind: "note",
        title: t.title,
        hint: `Technique, ${m.title}, ${t.problems.length} problems`,
        href: t.note ? noteHref(t.note) : moduleHref(m),
      });
  }
  for (const pl of c.playlists.filter(listedCompany))
    items.push({ key: `c:${pl.id}`, kind: "company", title: pl.title, hint: pl.group, href: companyHref(pl.id) });
  return new Response(JSON.stringify(items), { headers: { "content-type": "application/json" } });
};
