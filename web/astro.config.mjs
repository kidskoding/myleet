import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  outDir: "dist",
  trailingSlash: "ignore",
  vite: {
    worker: { format: "es" },
  },
});
