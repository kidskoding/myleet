import type { APIRoute, GetStaticPaths } from "astro";
import { buildCatalog } from "../../lib/build-catalog";
import { logoFor } from "../../lib/build-company-logos";
import { companySlug } from "../../lib/catalog";
import type { Playlist } from "../../lib/types";

export const getStaticPaths: GetStaticPaths = () => buildCatalog().playlists.map((playlist) => ({
  params: { slug: companySlug(playlist.id) }, props: { playlist },
}));

export const GET: APIRoute = ({ props }) => {
  const { symbol } = logoFor(props.playlist as Playlist);
  const svg = symbol.replace(/^<symbol\b/, '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="color-scheme:light dark;color:light-dark(#4c4f69,#cdd6f4)"')
    .replace(/<\/symbol>$/, "</svg>");
  return new Response(svg, { headers: { "content-type": "image/svg+xml" } });
};
