// Command palette (Cmd/Ctrl+K). Loaded on first open; the index is a small build-time JSON.
import { navigate } from "astro:transitions/client";
import { cachedMe } from "../lib/account";
import { highlight, KIND_ORDER, search, type Hit, type PaletteItem, type PaletteKind } from "../lib/palette-search";
import { resolvedTheme, setTheme } from "../lib/prefs";
import { companyLogo } from "../lib/company-logos";
import { ROUTES } from "../lib/routes";
import { kbd } from "../lib/ui/bits";
import { html, render, type SafeHtml } from "../lib/ui/html";
import { icon, type IconName } from "../lib/ui/icons";
import { ladder, displayRung } from "../lib/ui/ladder";
import { closeDialog, openDialog } from "../lib/ui/overlay";

const RECENT = "myleet:palette-recent";
const GROUP_LABEL: Record<PaletteKind, string> = {
  problem: "Problems",
  note: "Techniques and notes",
  company: "Companies",
  command: "Commands",
};
const FILTERS: (PaletteKind | undefined)[] = [undefined, ...KIND_ORDER];
const KIND_ICON: Record<PaletteKind, IconName> = { problem: "square-code", note: "book-open", company: "building-2", command: "arrow-right" };

interface Command extends PaletteItem {
  icon: IconName;
  keys?: string[];
  run?: () => void | Promise<unknown>;
}

function commands(): Command[] {
  const dark = resolvedTheme() === "dark";
  const me = cachedMe();
  const cmds: Command[] = [
    { key: "cmd:today", kind: "command", title: "Go to Today", icon: "sunrise", href: ROUTES.today, keys: ["g", "t"] },
    { key: "cmd:learn", kind: "command", title: "Go to Learn", icon: "map", href: ROUTES.learn, keys: ["g", "l"] },
    { key: "cmd:companies", kind: "command", title: "Go to Companies", icon: "building-2", href: ROUTES.companies, keys: ["g", "c"] },
    { key: "cmd:mock", kind: "command", title: "Start a mock interview", icon: "timer", href: ROUTES.mock, keys: ["g", "m"] },
    { key: "cmd:progress", kind: "command", title: "Go to Progress", icon: "calendar-check", href: ROUTES.progress, keys: ["g", "p"] },
    { key: "cmd:review", kind: "command", title: "Review calendar", icon: "calendar-check", href: ROUTES.calendar },
    { key: "cmd:settings", kind: "command", title: "Settings", icon: "settings", href: ROUTES.settings, keys: ["g", ","] },
    {
      key: "cmd:theme",
      kind: "command",
      title: dark ? "Switch to light theme" : "Switch to dark theme",
      hint: "appearance",
      icon: dark ? "sun" : "moon",
      keys: ["shift", "D"],
      run: () => setTheme(dark ? "light" : "dark"),
    },
    { key: "cmd:system-theme", kind: "command", title: "Use the system theme", hint: "appearance", icon: "monitor", run: () => setTheme("system") },
    { key: "cmd:shortcuts", kind: "command", title: "Keyboard shortcuts", icon: "keyboard", keys: ["?"], run: () => import("./shortcuts").then((m) => m.openShortcuts()) },
    { key: "cmd:plan", kind: "command", title: "Edit my plan", hint: "interview date, companies, daily time", icon: "flag", href: ROUTES.onboarding },
    { key: "cmd:warmup", kind: "command", title: "Take the placement warm-up", icon: "flag", href: `${ROUTES.onboarding}?step=warm-up` },
  ];
  if (me) {
    cmds.push(
      { key: "cmd:share", kind: "command", title: "Share progress card", icon: "share", run: () => import("./share").then((m) => m.openShare()) },
      { key: "cmd:signout", kind: "command", title: "Sign out", icon: "log-out", run: () => import("./auth-ui").then((m) => m.signOutFlow()) },
    );
  } else {
    cmds.push({ key: "cmd:signin", kind: "command", title: "Sign in", hint: "keep your progress on every device", icon: "user", run: () => import("./auth-ui").then((m) => m.openSignIn()) });
  }
  const install = (window as { __myleetInstall?: () => void }).__myleetInstall;
  if (install) cmds.push({ key: "cmd:install", kind: "command", title: "Install myleet", hint: "app, offline practice", icon: "download", run: install });
  return cmds;
}

let index: Promise<PaletteItem[]> | undefined;
const loadIndex = () => {
  index ??= fetch("/palette-index.json").then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<PaletteItem[]>;
  });
  index.catch(() => (index = undefined));
  return index;
};

let rungs: Record<string, number> | undefined;
async function loadRungs(): Promise<void> {
  const [{ readEvents }, { loadTrainer }] = await Promise.all([import("../lib/progress"), import("../lib/trainer")]);
  const ev = await readEvents();
  if (!ev.trim()) return;
  const states = (await loadTrainer()).states(ev);
  rungs = Object.fromEntries(Object.entries(states).map(([id, s]) => [id, displayRung(s.rung)]));
}

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function pushRecent(key: string): void {
  try {
    localStorage.setItem(RECENT, JSON.stringify([key, ...readRecent().filter((k) => k !== key)].slice(0, 6)));
  } catch {
    // Recent list is a convenience.
  }
}

let dlg: HTMLDialogElement | undefined;
let input: HTMLInputElement;
let list: HTMLElement;
let filterEl: HTMLElement;
let items: PaletteItem[] = [];
let flat: PaletteItem[] = [];
let active = 0;
let filter = 0;
let loaded = false;
let loadError = false;

function itemRight(it: PaletteItem): SafeHtml {
  if (it.kind === "command") {
    const k = (it as Command).keys;
    return k ? html`<span class="hint">${kbd(...k)}</span>` : html`<span class="hint">${it.hint ?? ""}</span>`;
  }
  if (it.kind === "problem") {
    const id = (it.meta as { id: string } | undefined)?.id ?? "";
    const r = rungs?.[id];
    return r ? ladder({ rung: r }) : html``;
  }
  return html``;
}

function row(h: Hit, i: number): SafeHtml {
  const it = h.item;
  const ic = it.kind === "command" ? (it as Command).icon : KIND_ICON[it.kind];
  const parts = highlight(it.title, h.ranges).map((p) => (p.mark ? html`<mark>${p.text}</mark>` : html`${p.text}`));
  const hint = it.kind === "command" ? "" : it.hint;
  const mark = it.kind === "company" && it.href ? companyLogo(it.href.split("/").pop() ?? "", "ic") : icon(ic, { cls: "ic" });
  return html`<li class="palette-item" role="option" id="pi-${i}" data-i="${i}" aria-selected="${i === active ? "true" : "false"}">${mark}<span>${parts}${hint ? html`<span class="hint">&nbsp; ${hint}</span>` : ""}</span>${itemRight(it)}</li>`;
}

function paint(): void {
  const q = input.value;
  const only = FILTERS[filter];
  render(filterEl, only ? html`<span class="tag tag-outline no-dot">${GROUP_LABEL[only]}</span>` : html``);
  let groups: { label: string; hits: Hit[] }[];
  if (!q.trim()) {
    const byKey = new Map(items.map((i) => [i.key, i]));
    const recent = readRecent()
      .map((k) => byKey.get(k))
      .filter((i): i is PaletteItem => !!i && (!only || i.kind === only))
      .map((item) => ({ item, score: 0, ranges: [] as [number, number][] }));
    const suggested = items
      .filter((i) => i.kind === "command" && (!only || only === "command"))
      .slice(0, only ? 50 : 5)
      .map((item) => ({ item, score: 0, ranges: [] as [number, number][] }));
    groups = [
      ...(recent.length ? [{ label: "Recent", hits: recent }] : []),
      ...(only && only !== "command" ? search(items, "", only).map((g) => ({ label: GROUP_LABEL[g.kind], hits: g.hits })) : [{ label: "Suggested", hits: suggested }]),
    ];
  } else {
    groups = search(items, q, only).map((g) => ({ label: GROUP_LABEL[g.kind], hits: g.hits }));
  }
  flat = groups.flatMap((g) => g.hits.map((h) => h.item));
  active = Math.min(active, Math.max(0, flat.length - 1));
  let i = 0;
  if (!loaded && q.trim()) {
    render(list, html`<li class="palette-empty" role="presentation">${loadError ? "Couldn't load the search index. Commands still work; check your connection." : "Loading the index"}</li>`);
  } else if (!flat.length) {
    render(list, html`<li class="palette-empty" role="presentation">No match for '${q}'. Try a technique name or a LeetCode number.</li>`);
  } else {
    render(
      list,
      html`${groups.map((g) => html`<li class="palette-group" role="presentation">${g.label}</li>${g.hits.map((h) => row(h, i++))}`)}`,
    );
  }
  input.setAttribute("aria-activedescendant", flat.length ? `pi-${active}` : "");
}

function move(d: number): void {
  if (!flat.length) return;
  active = (active + d + flat.length) % flat.length;
  for (const li of list.querySelectorAll<HTMLElement>(".palette-item")) li.setAttribute("aria-selected", li.dataset.i === String(active) ? "true" : "false");
  input.setAttribute("aria-activedescendant", `pi-${active}`);
  list.querySelector(`#pi-${active}`)?.scrollIntoView({ block: "nearest" });
}

async function choose(it: PaletteItem | undefined): Promise<void> {
  if (!it || !dlg) return;
  pushRecent(it.key);
  closeDialog(dlg);
  const cmd = it as Command;
  if (cmd.run) await cmd.run();
  else if (it.href) await navigate(it.href);
}

function build(): HTMLDialogElement {
  const d = document.createElement("dialog");
  d.className = "dlg palette";
  d.setAttribute("aria-label", "Search and commands");
  render(
    d,
    html`<div class="palette-input">${icon("search")}<input type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Search problems, notes, companies and commands" aria-label="Search problems, techniques, notes, companies and commands" /><span class="palette-filter"></span><kbd>esc</kbd></div>
      <ul class="palette-list" id="palette-list" role="listbox" aria-label="Results"></ul>
      <div class="palette-foot"><span>${kbd("↑", "↓")} move</span><span>${kbd("enter")} open</span><span>${kbd("tab")} filter by type</span><span style="margin-left:auto">${kbd("?")} all shortcuts</span></div>`,
  );
  input = d.querySelector("input") as HTMLInputElement;
  list = d.querySelector("ul") as HTMLElement;
  filterEl = d.querySelector(".palette-filter") as HTMLElement;
  input.addEventListener("input", () => {
    active = 0;
    paint();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) (e.preventDefault(), move(1));
    else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) (e.preventDefault(), move(-1));
    else if (e.key === "Enter") (e.preventDefault(), void choose(flat[active]));
    else if (e.key === "Tab") {
      e.preventDefault();
      filter = (filter + (e.shiftKey ? FILTERS.length - 1 : 1)) % FILTERS.length;
      active = 0;
      paint();
    }
  });
  list.addEventListener("click", (e) => {
    const li = (e.target as Element).closest<HTMLElement>(".palette-item");
    if (li) void choose(flat[Number(li.dataset.i)]);
  });
  list.addEventListener("pointermove", (e) => {
    const li = (e.target as Element).closest<HTMLElement>(".palette-item");
    if (li && Number(li.dataset.i) !== active) move(Number(li.dataset.i) - active);
  });
  document.body.append(d);
  return d;
}

export function openPalette(): void {
  if (dlg?.open) {
    input.select();
    return;
  }
  // Rebuilt per open so commands reflect the current theme and account.
  dlg?.remove();
  dlg = build();
  filter = 0;
  active = 0;
  const cmds = commands();
  items = [...cmds];
  openDialog(dlg);
  input.focus();
  paint();
  loadIndex()
    .then((idx) => {
      items = [...idx, ...cmds];
      loaded = true;
      paint();
    })
    .catch(() => {
      loadError = true;
      paint();
    });
  if (!rungs) void loadRungs().then(() => dlg?.open && paint()).catch(() => undefined);
}
