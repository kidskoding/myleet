import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRoute } from "astro";

// The shared test helpers (`curriculum/_lib`, exported to data/lib), in one request for the runner.
export const GET: APIRoute = () => {
  const dir = join(process.cwd(), "public/data/lib");
  const files = Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".py"))
      .sort()
      .map((f) => [f, readFileSync(join(dir, f), "utf8")]),
  );
  return new Response(JSON.stringify(files), { headers: { "content-type": "application/json" } });
};
