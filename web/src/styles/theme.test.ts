// Guards for the Catppuccin retheme: every colour comes from the generated flavors.css, the
// flavor blocks set color-scheme, and only the .on-wall scope paints the wall.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { FLAVORS } from "../lib/flavors";

const SRC = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(SRC, p), "utf8");

function files(dir = SRC): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "wasm" ? [] : files(p);
    return /\.(css|astro|ts)$/.test(n) && !n.endsWith(".test.ts") ? [relative(SRC, p)] : [];
  });
}

/** `file:line` for every match of `re` outside the allowed lines. */
function hits(re: RegExp, allow: (file: string, line: string) => boolean): string[] {
  const out: string[] = [];
  for (const f of files()) {
    if (f === "styles/flavors.css") continue; // generated from the palette
    read(f)
      .split("\n")
      .forEach((line, i) => {
        if (re.test(line) && !allow(f, line)) out.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
  }
  return out;
}

describe("flavors.css", () => {
  const css = read("styles/flavors.css");
  it.each(FLAVORS)("%s sets its color-scheme", (f) => {
    const block = f === "latte" ? css.match(/:root, :root\[data-flavor="latte"\] \{ color-scheme: (\w+);/) : css.match(new RegExp(`:root\\[data-flavor="${f}"\\] \\{ color-scheme: (\\w+);`));
    expect(block?.[1]).toBe(f === "latte" ? "light" : "dark");
  });

  it("falls back to Mocha with a dark color-scheme when no flavor is set", () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{ :root:not\(\[data-flavor\]\) \{ color-scheme: dark;/);
  });
});

describe("no stray colours", () => {
  it("has no hardcoded colour outside the generated tokens", () => {
    const colour = /#[0-9a-fA-F]{3,8}\b(?![-\w])|\b(?:rgba?|hsla?)\(|(?<![-\w$.])(?:white|black)(?![-\w])/;
    // Brand assets keep their own colors; the interface still uses theme tokens.
    const allow = (f: string, line: string) => ["lib/build-company-logos.ts", "pages/company-marks/[slug].svg.ts"].includes(f) || (f === "lib/ui/icons.ts" && line.includes(`fill="#4285F4"`));
    expect(hits(colour, allow)).toEqual([]);
  });

  it("paints the wall only through .on-wall", () => {
    // The landing topo's hollow points are filled with the wall they sit on.
    const allow = (f: string, line: string) => (f === "styles/base.css" && line.includes("background: var(--wall);")) || (f === "pages/index.astro" && line.includes(".topo .pt {"));
    expect(hits(/var\(--wall\)/, allow)).toEqual([]);
  });
});
