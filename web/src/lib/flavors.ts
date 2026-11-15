// Catppuccin flavors and accents (https://catppuccin.com, MIT). The resolved colours in
// flavors.json are generated with styles/flavors.css by .planning/design/system/catppuccin.py;
// use them only where CSS variables can't reach (canvas, theme-color, the boot script).
import data from "./flavors.json";

export const FLAVORS = ["latte", "frappe", "macchiato", "mocha"] as const;
export type Flavor = (typeof FLAVORS)[number];
export const NIGHT_FLAVORS = ["frappe", "macchiato", "mocha"] as const;
export type NightFlavor = (typeof NIGHT_FLAVORS)[number];
export const ACCENTS = [
  "rosewater", "flamingo", "pink", "mauve", "red", "maroon", "peach",
  "yellow", "green", "teal", "sky", "sapphire", "blue", "lavender",
] as const;
export type Accent = (typeof ACCENTS)[number];

export const DEFAULT_NIGHT: NightFlavor = "mocha";
export const DEFAULT_ACCENT: Accent = "mauve";

export const FLAVOR_NAMES: Record<Flavor, string> = { latte: "Latte", frappe: "Frappé", macchiato: "Macchiato", mocha: "Mocha" };
export const ACCENT_NAMES = Object.fromEntries(ACCENTS.map((a) => [a, a[0]?.toUpperCase() + a.slice(1)])) as Record<Accent, string>;

/** Accents that share a hue with a meaning; the picker warns about them (never blocks). */
export const ACCENT_MEANING: Partial<Record<Accent, string>> = {
  green: "Passed",
  red: "Failed",
  maroon: "Failed",
  yellow: "Review due",
  peach: "Review due",
  pink: "Weak spot",
  teal: "Keep sharp",
};

export const isFlavor = (v: unknown): v is Flavor => FLAVORS.includes(v as Flavor);
export const isNight = (v: unknown): v is NightFlavor => NIGHT_FLAVORS.includes(v as NightFlavor);
export const isAccent = (v: unknown): v is Accent => ACCENTS.includes(v as Accent);

type Tokens = Record<string, string>;
const DATA = data as unknown as Record<Flavor, Tokens & { accents: Record<Accent, Tokens> }>;

/** Resolved hex per token name (as in CSS, without `--`) for one flavor and accent. */
export function flavorTokens(flavor: Flavor, accent: Accent = DEFAULT_ACCENT): Tokens {
  const { accents, ...base } = DATA[flavor];
  return { ...base, ...accents[accent] };
}

/**
 * The blocking head script: sets data-flavor, data-accent, the derived data-theme and the
 * browser chrome colour before first paint. Storage keys and the legacy light/dark migration
 * match lib/prefs.ts.
 */
export const THEME_BOOT = `(function () {
  function apply() {
    var r = document.documentElement;
    r.dataset.flavor = "mocha";
    r.dataset.theme = "dark";
    r.dataset.accent = "${DEFAULT_ACCENT}";
    try {
      var a = localStorage.getItem("myleet-accent");
      if (${JSON.stringify(ACCENTS)}.indexOf(a) >= 0) r.dataset.accent = a;
      var p = JSON.parse(localStorage.getItem("myleet-prefs") || "{}");
      if (p.reduceMotion) r.dataset.motion = "reduce";
      if (p.font === "mono") r.dataset.font = "mono";
      if (p.readFont === "mono") r.dataset.readFont = "mono";
      r.dataset.auth = localStorage.getItem("myleet:me") ? "in" : "out";
    } catch (e) { r.dataset.auth = "out"; }
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.content = ${JSON.stringify(DATA.mocha.ground)}; });
  }
  apply();
  document.addEventListener("astro:after-swap", apply);
})();`;
