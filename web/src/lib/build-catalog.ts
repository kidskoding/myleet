// Build-time only (getStaticPaths): reads the exported catalog from disk.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Catalog } from "./types";

let cached: Catalog | undefined;

export function buildCatalog(): Catalog {
  cached ??= JSON.parse(readFileSync(join(process.cwd(), "public/data/catalog.json"), "utf8")) as Catalog;
  return cached;
}
