import type { Catalog, Playlist, ProblemFiles, ProblemMeta } from "./types";

/** Keep existing prep-page URLs while focusing company discovery on the main list. */
export const listedCompany = (p: Pick<Playlist, "id">): boolean =>
  !["alibaba", "tencent"].includes(companySlug(p.id));

const DATA = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/data`;

async function get(path: string): Promise<Response> {
  const res = await fetch(`${DATA}/${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res;
}

export interface LoadedCatalog {
  catalog: Catalog;
  /** The raw text, handed to the wasm `Trainer` without a second stringify. */
  text: string;
  byId: Map<string, ProblemMeta>;
}

let catalogPromise: Promise<LoadedCatalog> | undefined;

export function loadCatalog(): Promise<LoadedCatalog> {
  catalogPromise ??= get("catalog.json")
    .then((r) => r.text())
    .then((text) => {
      const catalog = JSON.parse(text) as Catalog;
      return { catalog, text, byId: new Map(catalog.problems.map((p) => [p.id, p])) };
    });
  // A failed load must not poison the cache for the next attempt.
  catalogPromise.catch(() => (catalogPromise = undefined));
  return catalogPromise;
}

const problemCache = new Map<string, Promise<ProblemFiles>>();

export function fetchProblem(id: string): Promise<ProblemFiles> {
  let p = problemCache.get(id);
  if (!p) {
    p = get(`problems/${encodeURIComponent(id)}.json`).then((r) => r.json() as Promise<ProblemFiles>);
    p.catch(() => problemCache.delete(id));
    problemCache.set(id, p);
  }
  return p;
}

/** `path` is a catalog note path such as `guide/01_how_to_prep.md`. */
export async function fetchNote(path: string): Promise<string> {
  if (path.split("/").includes("..")) throw new Error(`bad note path: ${path}`);
  return (await get(`notes/${path}`)).text();
}

/** Company pages use the playlist id without its `NNN_` order prefix. */
export function companySlug(playlistId: string): string {
  return playlistId.replace(/^\d+_/, "");
}

export function resetCatalogCache(): void {
  catalogPromise = undefined;
  problemCache.clear();
}
