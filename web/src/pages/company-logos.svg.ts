import type { APIRoute } from "astro";
import { buildCatalog } from "../lib/build-catalog";
import { logoSprite } from "../lib/build-company-logos";

// Simple Icons marks (CC0) and monogram tiles, one symbol per company set.
export const GET: APIRoute = () =>
  new Response(logoSprite(buildCatalog().playlists), { headers: { "content-type": "image/svg+xml" } });
