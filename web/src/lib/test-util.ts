import { readFileSync } from "node:fs";
import { join } from "node:path";

export const ROOT = join(import.meta.dirname, "../..");

/** A `fetch` that serves `/data/...` and `/runner-lib.json`-style paths from `public/`. */
export function fileFetch(calls: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    try {
      return new Response(readFileSync(join(ROOT, "public", url)));
    } catch {
      return new Response("not found", { status: 404 });
    }
  }) as typeof fetch;
}
