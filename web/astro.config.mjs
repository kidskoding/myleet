import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTENT = ["playlists", "curriculum", "bank", "guide"].map((d) => ROOT + d);

// In `astro dev`, re-export the catalog when content changes and reload the page,
// so editing a playlist, problem or note never needs a restart.
function liveContent() {
  return {
    name: "myleet-live-content",
    apply: "serve",
    configureServer(server) {
      server.watcher.add(CONTENT);
      const bin = ROOT + "target/release/myleet";
      let timer, running = false, again = false;
      const run = () => {
        if (running) return void (again = true);
        running = true;
        const [cmd, args] = existsSync(bin) ? [bin, []] : ["cargo", ["run", "-q", "--release", "--"]];
        const p = spawn(cmd, [...args, "export", "web/public/data"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
        p.on("close", (code) => {
          running = false;
          if (code === 0) server.ws.send({ type: "full-reload" });
          else server.config.logger.error(`myleet export failed (exit ${code})`);
          if (again) (again = false), run();
        });
      };
      server.watcher.on("all", (_event, file) => {
        if (!CONTENT.some((d) => file.startsWith(d))) return;
        clearTimeout(timer);
        timer = setTimeout(run, 250);
      });
    },
  };
}

export default defineConfig({
  output: "static",
  outDir: "dist",
  trailingSlash: "ignore",
  // Old route names from before the screens landed.
  redirects: { "/map": "/learn", "/playlists": "/companies", "/review": "/progress#calendar" },
  vite: {
    worker: { format: "es" },
    plugins: [liveContent()],
  },
});
