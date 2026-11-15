// Lucide icons (ISC licence, lucide-static), inlined as path data so only these ship.

const PATHS = {
  "arrow-left": "<path d=\"m12 19-7-7 7-7\"/> <path d=\"M19 12H5\"/>",
  "pause": "<rect x=\"14\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\"/> <rect x=\"5\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\"/>",
  "play": "<path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\"/>",
  "scan": "<path d=\"M3 7V5a2 2 0 0 1 2-2h2\"/> <path d=\"M17 3h2a2 2 0 0 1 2 2v2\"/> <path d=\"M21 17v2a2 2 0 0 1-2 2h-2\"/> <path d=\"M7 21H5a2 2 0 0 1-2-2v-2\"/>",
  "command": "<path d=\"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3\"/>",
  "ellipsis": "<circle cx=\"12\" cy=\"12\" r=\"1\"/> <circle cx=\"19\" cy=\"12\" r=\"1\"/> <circle cx=\"5\" cy=\"12\" r=\"1\"/>",
  "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/> <path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>",
  "panel-left-close": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/> <path d=\"M9 3v18\"/> <path d=\"m16 15-3-3 3-3\"/>",
  "panel-left-open": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/> <path d=\"M9 3v18\"/> <path d=\"m14 9 3 3-3 3\"/>",
  "panel-bottom-close": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/> <path d=\"M3 15h18\"/> <path d=\"m15 8-3 3-3-3\"/>",
  "panel-bottom-open": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/> <path d=\"M3 15h18\"/> <path d=\"m9 10 3-3 3 3\"/>",
  "file-code-2": "<path d=\"M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35\"/> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\"/> <path d=\"m5 16-3 3 3 3\"/> <path d=\"m9 22 3-3-3-3\"/>",
  "history": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/> <path d=\"M3 3v5h5\"/> <path d=\"M12 7v5l4 2\"/>",
  "wand-sparkles": "<path d=\"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72\"/> <path d=\"m14 7 3 3\"/> <path d=\"M5 6v4\"/> <path d=\"M19 14v4\"/> <path d=\"M10 2v2\"/> <path d=\"M7 8H3\"/> <path d=\"M21 16h-4\"/> <path d=\"M11 3H9\"/>",
  "settings-2": "<path d=\"M14 17H5\"/> <path d=\"M19 7h-9\"/> <circle cx=\"17\" cy=\"17\" r=\"3\"/> <circle cx=\"7\" cy=\"7\" r=\"3\"/>",
  "maximize-2": "<path d=\"M15 3h6v6\"/> <path d=\"m21 3-7 7\"/> <path d=\"m3 21 7-7\"/> <path d=\"M9 21H3v-6\"/>",
  "minimize-2": "<path d=\"m14 10 7-7\"/> <path d=\"M20 10h-6V4\"/> <path d=\"m3 21 7-7\"/> <path d=\"M4 14h6v6\"/>",
  "x": "<path d=\"M18 6 6 18\"/> <path d=\"m6 6 12 12\"/>",
  "check": "<path d=\"M20 6 9 17l-5-5\"/>",
  "lightbulb": "<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/> <path d=\"M9 18h6\"/> <path d=\"M10 22h4\"/>",
  "key-round": "<path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\"/> <circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>",
  "circle-dashed": "<path d=\"M10.1 2.182a10 10 0 0 1 3.8 0\"/> <path d=\"M13.9 21.818a10 10 0 0 1-3.8 0\"/> <path d=\"M17.609 3.721a10 10 0 0 1 2.69 2.7\"/> <path d=\"M2.182 13.9a10 10 0 0 1 0-3.8\"/> <path d=\"M20.279 17.609a10 10 0 0 1-2.7 2.69\"/> <path d=\"M21.818 10.1a10 10 0 0 1 0 3.8\"/> <path d=\"M3.721 6.391a10 10 0 0 1 2.7-2.69\"/> <path d=\"M6.391 20.279a10 10 0 0 1-2.69-2.7\"/>",
  "hard-drive": "<path d=\"M10 16h.01\"/> <path d=\"M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/> <path d=\"M21.946 12.013H2.054\"/> <path d=\"M6 16h.01\"/>",
  "external-link": "<path d=\"M15 3h6v6\"/> <path d=\"M10 14 21 3\"/> <path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/>",
  "rotate-ccw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/> <path d=\"M3 3v5h5\"/>",
  "flag": "<path d=\"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528\"/>",
  "expand": "<path d=\"m15 15 6 6\"/> <path d=\"m15 9 6-6\"/> <path d=\"M21 16v5h-5\"/> <path d=\"M21 8V3h-5\"/> <path d=\"M3 16v5h5\"/> <path d=\"m3 21 6-6\"/> <path d=\"M3 8V3h5\"/> <path d=\"M9 9 3 3\"/>",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\"/>",
  "terminal": "<path d=\"M12 19h8\"/> <path d=\"m4 17 6-6-6-6\"/>",
  "flask-conical": "<path d=\"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2\"/> <path d=\"M6.453 15h11.094\"/> <path d=\"M8.5 2h7\"/>",
  "keyboard": "<path d=\"M10 8h.01\"/> <path d=\"M12 12h.01\"/> <path d=\"M14 8h.01\"/> <path d=\"M16 12h.01\"/> <path d=\"M18 8h.01\"/> <path d=\"M6 8h.01\"/> <path d=\"M7 16h10\"/> <path d=\"M8 12h.01\"/> <rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/>",
  "search": "<path d=\"m21 21-4.34-4.34\"/> <circle cx=\"11\" cy=\"11\" r=\"8\"/>",
  "git-compare": "<circle cx=\"18\" cy=\"18\" r=\"3\"/> <circle cx=\"6\" cy=\"6\" r=\"3\"/> <path d=\"M13 6h3a2 2 0 0 1 2 2v7\"/> <path d=\"M11 18H8a2 2 0 0 1-2-2V9\"/>",
  "file-text": "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\"/> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\"/> <path d=\"M10 9H8\"/> <path d=\"M16 13H8\"/> <path d=\"M16 17H8\"/>",
  "wifi-off": "<path d=\"M12 20h.01\"/> <path d=\"M8.5 16.429a5 5 0 0 1 7 0\"/> <path d=\"M5 12.859a10 10 0 0 1 5.17-2.69\"/> <path d=\"M19 12.859a10 10 0 0 0-2.007-1.523\"/> <path d=\"M2 8.82a15 15 0 0 1 4.177-2.643\"/> <path d=\"M22 8.82a15 15 0 0 0-11.288-3.764\"/> <path d=\"m2 2 20 20\"/>",
} as const;

export type IconName = keyof typeof PATHS;

/** Inline SVG markup; decorative unless the caller labels the control around it. `i-<name>` matches the site icons (an `i-x` button turns red on hover). */
export function icon(name: IconName, size = 18, cls = "icon"): string {
  return `<svg class="${cls} i-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}
