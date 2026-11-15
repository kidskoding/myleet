import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  outDir: "dist",
  trailingSlash: "ignore",
  // Old route names from before the screens landed.
  redirects: { "/map": "/learn", "/playlists": "/companies", "/review": "/progress#calendar" },
  vite: {
    worker: { format: "es" },
  },
});
