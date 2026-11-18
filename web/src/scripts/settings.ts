// Settings (/settings): every preference applies and saves as it changes.
import {
  ApiError,
  deleteAccount,
  resetProgress,
  fetchMe,
  initials,
  listSessions,
  patchMe,
  revokeSession,
  startOAuth,
  type Me,
  type Provider,
  type SessionInfo,
} from "../lib/account";
import { ACCENT_MEANING, ACCENT_NAMES, ACCENTS, flavorTokens, isAccent, isNight, type Accent } from "../lib/flavors";
import { readAccent, readNight, readPrefs, readTheme, resolvedFlavor, setAccent, setNight, setTheme, updatePrefs, type Prefs, type ThemePref } from "../lib/prefs";
import { exportEvents, importEvents, mergeEvents, readEvents } from "../lib/progress";
import { profileHref, ROUTES } from "../lib/routes";
import { clearDevice, unlinkDevice } from "../lib/sync";
import { html, render } from "../lib/ui/html";
import { icon, type IconName } from "../lib/ui/icons";
import { closeDialog, confirmDialog, openDialog, toast } from "../lib/ui/overlay";

const root = () => document.querySelector<HTMLElement>("[data-settings]");
const $ = <T extends Element = HTMLElement>(sel: string) => root()?.querySelector<T>(sel) ?? null;
const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{2,29}$/;
const LIMITS: Record<string, [number, number]> = { "editor.fontSize": [12, 20], newPerDay: [0, 10] };

let me: Me | null = null;
let savedTimer: ReturnType<typeof setTimeout> | undefined;

function get(p: Prefs, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], p);
}

function patchFor(path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".");
  return keys.reduceRight<unknown>((v, k) => ({ [k]: v }), value) as Record<string, unknown>;
}

function showSaved(state: "ok" | "err" | "idle"): void {
  const el = $("[data-saved]");
  if (!el) return;
  clearTimeout(savedTimer);
  el.classList.toggle("ok", state === "ok");
  el.classList.toggle("err", state === "err");
  if (state === "ok") render(el, html`${icon("check")}Saved`);
  else if (state === "err") render(el, html`${icon("triangle-alert")}Couldn't save to your account. Kept on this device; retrying`);
  else render(el, html`<span class="when-in">Changes save as you go</span><span class="when-out">Saved on this device</span>`);
  if (state === "ok") savedTimer = setTimeout(() => showSaved("idle"), 2000);
}

function changed(patch: Record<string, unknown>): void {
  updatePrefs(patch);
  // Signed out, the change is already saved here; signed in, account-sync reports back.
  if (!me) showSaved("ok");
}

function paintPrefs(): void {
  const p = readPrefs();
  for (const el of root()?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-pref]") ?? []) {
    const path = el.dataset.pref ?? "";
    if (path === "editor.vim") (el as HTMLInputElement).checked = p.editor.keymap === "vim";
    else if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = !!get(p, path);
    else el.value = String(get(p, path) ?? "");
  }
  for (const out of root()?.querySelectorAll<HTMLOutputElement>("[data-out]") ?? []) out.value = String(get(p, out.dataset.out ?? ""));
  paintAppearance();
  $("[data-codeprev]")?.classList.toggle("no-lig", !p.editor.ligatures);
  const codeprev = $<HTMLElement>("[data-codeprev]");
  if (codeprev) codeprev.style.fontSize = `${p.editor.fontSize}px`;
  const pub = $<HTMLInputElement>('[data-pref="publicProfile"]');
  if (pub) pub.disabled = !me;
  const mod = $("[data-mod]");
  if (mod) mod.textContent = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
}

function accentNote(accent: Accent, latte: boolean): string {
  const meaning = ACCENT_MEANING[accent];
  if (meaning)
    return `${ACCENT_NAMES[accent]} is also the color of “${meaning}”, so your current level, links and heatmap will look like it. Tags and the levels keep their words and shapes. Mauve, Blue, Lavender or Sapphire keep them apart`;
  return latte ? "Pale accents are drawn deeper in Latte so text on them stays readable" : "Every accent is readable as text in this flavor";
}

function paintAppearance(): void {
  const theme = readTheme();
  const night = readNight();
  const accent = readAccent();
  const flavor = resolvedFlavor(theme, night);
  const check = (name: string, value: string) => {
    for (const r of root()?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`) ?? []) r.checked = r.value === value;
  };
  check("theme", theme);
  check("night", night);
  check("accent", accent);
  const row = $("[data-night-row]");
  if (row) row.hidden = theme !== "system";
  // Each dot's centre is the fill this flavor applies to that accent (deeper than the palette in Latte).
  for (const a of ACCENTS) {
    const dot = $<HTMLElement>(`[data-accent-dot="${a}"] .dot`);
    const t = flavorTokens(flavor, a);
    dot?.style.setProperty("--f", t["accent-fill"] ?? "");
    dot?.style.setProperty("--o", t["on-accent"] ?? "");
  }
  const name = $("[data-accent-name]");
  if (name) name.textContent = ACCENT_NAMES[accent];
  const note = $("[data-accent-note]");
  if (note) note.textContent = accentNote(accent, flavor === "latte");
}

const PROVIDERS: { id: Provider; label: string; icon: IconName; add: string }[] = [
  { id: "github", label: "GitHub", icon: "github", add: "Connect GitHub" },
  { id: "google", label: "Google", icon: "google", add: "Connect Google" },
  { id: "email", label: "Email link", icon: "mail", add: "" },
];

function paintMethods(): void {
  const el = $("[data-methods]");
  if (!el || !me) return;
  const have = new Set(me.providers);
  render(
    el,
    html`${PROVIDERS.map((p) => {
      const on = have.has(p.id);
      const detail = on
        ? p.id === "email"
          ? `${me?.user.email}, one-time sign-in links`
          : `Connected, ${me?.user.email}`
        : p.id === "email"
          ? "Sign in with a one-time link to your email; no password"
          : `Uses ${me?.user.email}. Accounts link by verified email`;
      const action = on
        ? have.size === 1
          ? html`<span class="text-small text-muted">Only method</span>`
          : html`<span class="text-small text-muted">Connected</span>`
        : p.id === "email"
          ? html`<span class="text-small text-muted">Available</span>`
          : html`<button class="btn btn-secondary btn-sm" type="button" data-connect="${p.id}">${p.add}</button>`;
      return html`<div class="meth"><span class="ic">${icon(p.icon)}</span><div><strong>${p.label}</strong><span class="d">${detail}</span></div>${action}</div>`;
    })}
    <div class="row"><div class="note" style="grid-column:1/-1">${icon("lock")}<span>Sign-in methods link to the same account when they share a verified email. To stop using one, sign out of its sessions below</span></div></div>`,
  );
}

function deviceName(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "an unknown system";
  return `${browser} on ${os}`;
}

async function paintSessions(): Promise<void> {
  const el = $("[data-sessions]");
  if (!el || !me) return;
  if (!navigator.onLine) {
    render(el, html`<div class="sess"><span>Available when you're online</span></div>`);
    return;
  }
  let list: SessionInfo[];
  try {
    list = (await listSessions()).sessions;
  } catch {
    render(el, html`<div class="sess"><span>Couldn't load your sessions. <button class="link" type="button" data-reload-sessions>Try again</button></span></div>`);
    return;
  }
  list.sort((a, b) => Number(b.current) - Number(a.current) || b.created_at - a.created_at);
  const others = list.filter((s) => !s.current);
  render(
    el,
    html`${list.map(
      (s) =>
        html`<div class="sess"><strong>${deviceName(s.user_agent)}${s.current ? html`<span class="tag tag-new no-dot">This device</span>` : ""}</strong><span>Signed in ${new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>${
          s.current ? html`<button class="btn btn-ghost btn-sm" type="button" disabled>Current</button>` : html`<button class="btn btn-ghost btn-sm" type="button" data-revoke="${s.id}">Sign out</button>`
        }</div>`,
    )}${others.length ? html`<div class="sess" style="grid-template-columns:1fr"><button class="btn btn-secondary btn-sm" type="button" style="justify-self:start;grid-row:auto;grid-column:auto" data-revoke-others>Sign out everywhere else</button></div>` : ""}`,
  );
}

function paintProfile(): void {
  if (!me) return;
  const av = $("[data-set-avatar]");
  if (av) {
    if (me.user.avatar_url) render(av, html`<img src="${me.user.avatar_url}" alt="" width="44" height="44" referrerpolicy="no-referrer" />`);
    else av.textContent = initials(me.user);
  }
  const name = $<HTMLInputElement>("[data-set-name]");
  if (name && document.activeElement !== name) name.value = me.user.display_name ?? "";
  const user = $<HTMLInputElement>("[data-set-user]");
  if (user && document.activeElement !== user) user.value = me.user.username;
  const path = $("[data-profile-path]");
  if (path) path.textContent = profileHref(me.user.username);
}

let nameTimer: ReturnType<typeof setTimeout> | undefined;
let userTimer: ReturnType<typeof setTimeout> | undefined;

function userMsg(kind: "ok" | "bad" | "", text: string): void {
  const el = $("[data-user-msg]");
  if (!el) return;
  el.className = `field-msg ${kind}`;
  render(el, kind === "ok" ? html`${icon("check")}${text}` : html`${text}`);
  $("[data-set-user]")?.setAttribute("aria-invalid", kind === "bad" ? "true" : "false");
}

function onUsername(v: string): void {
  clearTimeout(userTimer);
  if (!me || v === me.user.username) return userMsg("", "");
  if (!USERNAME_RE.test(v)) return userMsg("bad", "Lowercase letters, numbers and dashes only, 3 to 30 characters");
  userMsg("", "Checking");
  userTimer = setTimeout(async () => {
    try {
      me = await patchMe({ username: v });
      userMsg("ok", `Saved. Your profile is at ${profileHref(v)}`);
      paintProfile();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) userMsg("bad", "Taken. Try another");
      else if (e instanceof ApiError && e.status === 400) userMsg("bad", e.message || "That username isn't allowed");
      else userMsg("bad", "Couldn't save. Check your connection and try again");
    }
  }, 300);
}

function onName(v: string): void {
  clearTimeout(nameTimer);
  nameTimer = setTimeout(async () => {
    try {
      me = await patchMe({ display_name: v.trim() || null });
      showSaved("ok");
    } catch {
      showSaved("err");
    }
  }, 500);
}

async function exportLocal(): Promise<void> {
  const blob = await exportEvents();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "events.jsonl";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** An events.jsonl file, or the events inside an account export. */
function extractEvents(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  try {
    const j = JSON.parse(t) as { t?: string; events_jsonl?: string; progress?: { events_jsonl?: string } };
    if (j && typeof j === "object" && !("t" in j)) return j.progress?.events_jsonl ?? j.events_jsonl ?? null;
  } catch {
    // Several lines: an events.jsonl.
  }
  return t;
}

async function importFile(file: File): Promise<void> {
  const events = extractEvents(await file.text());
  if (events === null) {
    toast("That file isn't an events.jsonl or a myleet export");
    return;
  }
  const before = await readEvents();
  const merged = mergeEvents(before, events);
  const count = (s: string) => s.split("\n").filter((l) => l.trim()).length;
  const added = count(merged) - count(before);
  const problems = new Set(
    events
      .split("\n")
      .map((l) => {
        try {
          return (JSON.parse(l) as { problem?: string }).problem ?? "";
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );
  if (added <= 0) {
    toast("Nothing new in that file; your progress already has all of it");
    return;
  }
  const ok = await confirmDialog({
    title: "Import this progress?",
    body: `Adds ${added} events across ${problems.size} problems. Nothing already here is removed or changed`,
    confirm: "Import",
  });
  if (!ok) return;
  await importEvents(events);
  toast(`Imported ${added} events`);
}

function resetFlow(): void {
  if (!me) return;
  const d = document.createElement("dialog");
  d.className = "dlg confirm-del";
  d.style.setProperty("--dlg-w", "500px");
  d.setAttribute("role", "alertdialog");
  d.setAttribute("aria-labelledby", "rc");
  d.setAttribute("aria-describedby", "rcd");
  render(
    d,
    html`<div class="dlg-head"><h2 id="rc">Reset your progress?</h2></div>
    <div class="dlg-body"><p id="rcd">This deletes, on our servers and in this browser:</p>
      <ul><li>Every attempt, review and streak day</li><li>Your plan, goals and practice schedule</li></ul>
      <p style="margin-top:var(--space-3)">Your account, sign-in and calendar connection stay, and you start again from setup. It can't be undone, so download your data first if you want a copy</p>
      <label for="rc-in">Type <code>reset</code> to confirm</label>
      <input class="input" id="rc-in" autocomplete="off" spellcheck="false" autocapitalize="off" style="margin-top:var(--space-2)" />
      <p class="err" data-rst-err hidden style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--fail);font-weight:600"></p>
    </div>
    <div class="dlg-actions"><a class="btn btn-ghost" href="/api/me/export" download>Download data</a><button class="btn btn-secondary" type="button" data-cancel autofocus>Cancel</button><button class="btn btn-danger" type="button" data-confirm disabled>Reset progress</button></div>`,
  );
  const input = d.querySelector<HTMLInputElement>("#rc-in");
  const confirm = d.querySelector<HTMLButtonElement>("[data-confirm]");
  input?.addEventListener("input", () => {
    if (confirm) confirm.disabled = input.value.trim().toLowerCase() !== "reset";
  });
  d.querySelector("[data-cancel]")?.addEventListener("click", () => closeDialog(d));
  confirm?.addEventListener("click", async () => {
    confirm.setAttribute("aria-busy", "true");
    try {
      await resetProgress();
      clearDevice(true);
      location.assign(ROUTES.onboarding);
    } catch {
      confirm.removeAttribute("aria-busy");
      const err = d.querySelector<HTMLElement>("[data-rst-err]");
      if (err) {
        err.hidden = false;
        err.textContent = "Couldn't reach the server. Nothing was reset; try again";
      }
    }
  });
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  openDialog(d);
}

function deleteFlow(): void {
  if (!me) return;
  const username = me.user.username;
  const d = document.createElement("dialog");
  d.className = "dlg confirm-del";
  d.style.setProperty("--dlg-w", "500px");
  d.setAttribute("role", "alertdialog");
  d.setAttribute("aria-labelledby", "dc");
  d.setAttribute("aria-describedby", "dcd");
  render(
    d,
    html`<div class="dlg-head"><h2 id="dc">Delete your account?</h2></div>
    <div class="dlg-body"><p id="dcd">This removes from our servers:</p>
      <ul><li>Your synced progress and every attempt in it</li><li>Your public profile at ${profileHref(username)}</li><li>Sign-in methods, sessions and settings</li></ul>
      <p style="margin-top:var(--space-3)">It can't be undone, and this browser's copy is cleared too. Download your data first if you want a copy</p>
      <label for="dc-in">Type <code>${username}</code> to confirm</label>
      <input class="input" id="dc-in" autocomplete="off" spellcheck="false" autocapitalize="off" style="margin-top:var(--space-2)" />
      <p class="err" data-del-err hidden style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--fail);font-weight:600"></p>
    </div>
    <div class="dlg-actions"><a class="btn btn-ghost" href="/api/me/export" download>Download data</a><button class="btn btn-secondary" type="button" data-cancel autofocus>Cancel</button><button class="btn btn-danger" type="button" data-confirm disabled>Delete account</button></div>`,
  );
  const input = d.querySelector<HTMLInputElement>("#dc-in");
  const confirm = d.querySelector<HTMLButtonElement>("[data-confirm]");
  input?.addEventListener("input", () => {
    if (confirm) confirm.disabled = input.value.trim() !== username;
  });
  d.querySelector("[data-cancel]")?.addEventListener("click", () => closeDialog(d));
  confirm?.addEventListener("click", async () => {
    confirm.setAttribute("aria-busy", "true");
    try {
      await deleteAccount();
      unlinkDevice();
      clearDevice(false);
      location.assign(ROUTES.home);
    } catch {
      confirm.removeAttribute("aria-busy");
      const err = d.querySelector<HTMLElement>("[data-del-err]");
      if (err) {
        err.hidden = false;
        err.textContent = "Couldn't reach the server. Nothing was deleted; try again";
      }
    }
  });
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  openDialog(d);
}

function onChange(e: Event): void {
  if (!root()) return;
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  if (el.name === "theme" || el.name === "night" || el.name === "accent") {
    if (el.name === "theme") setTheme(el.value as ThemePref);
    else if (el.name === "night" && isNight(el.value)) setNight(el.value);
    else if (isAccent(el.value)) setAccent(el.value);
    showSaved("ok");
    return;
  }
  if (el.matches("[data-import]")) {
    const f = (el as HTMLInputElement).files?.[0];
    if (f) void importFile(f);
    (el as HTMLInputElement).value = "";
    return;
  }
  const path = el.dataset.pref;
  if (!path) return;
  let value: unknown = el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : el.value;
  if (path === "editor.vim") return changed({ editor: { keymap: value ? "vim" : "standard" } });
  if (path === "editor.indent" || path.startsWith("timeTargets.")) value = Number(value);
  changed(patchFor(path, value));
  paintPrefs();
}

function onClick(e: MouseEvent): void {
  if (!root()) return;
  const t = e.target as Element;
  const step = t.closest<HTMLElement>("[data-step]");
  const revoke = t.closest<HTMLElement>("[data-revoke]");
  const connect = t.closest<HTMLElement>("[data-connect]");
  if (step) {
    const path = step.dataset.step ?? "";
    const [lo, hi] = LIMITS[path] ?? [0, 99];
    const next = Math.max(lo, Math.min(hi, Number(get(readPrefs(), path)) + Number(step.dataset.by)));
    changed(patchFor(path, next));
    paintPrefs();
  } else if (revoke?.dataset.revoke) {
    revoke.setAttribute("aria-busy", "true");
    void revokeSession(revoke.dataset.revoke)
      .then(() => (toast("Signed out on that device"), paintSessions()))
      .catch(() => toast("Couldn't sign that device out. Try again"));
  } else if (t.closest("[data-revoke-others]")) {
    void listSessions()
      .then(({ sessions }) => Promise.all(sessions.filter((s) => !s.current).map((s) => revokeSession(s.id))))
      .then(() => (toast("Signed out everywhere else"), paintSessions()))
      .catch(() => toast("Couldn't sign out every device. Try again"));
  } else if (t.closest("[data-reload-sessions]")) void paintSessions();
  else if (connect?.dataset.connect) startOAuth(connect.dataset.connect as "github" | "google", `${ROUTES.settings}#signin`);
  else if (t.closest("[data-export-local]")) void exportLocal();
  else if (t.closest("[data-delete]")) deleteFlow();
  else if (t.closest("[data-reset]")) resetFlow();
}

function onInput(e: Event): void {
  const el = e.target as HTMLInputElement;
  if (!root()) return;
  if (el.matches("[data-set-user]")) {
    const v = el.value.toLowerCase();
    if (v !== el.value) el.value = v;
    onUsername(v);
  } else if (el.matches("[data-set-name]")) onName(el.value);
}

let observer: IntersectionObserver | undefined;
function trackSections(): void {
  observer?.disconnect();
  const links = [...(root()?.querySelectorAll<HTMLAnchorElement>(".side a") ?? [])];
  const mark = (id: string) => links.forEach((a) => a.setAttribute("aria-current", String(a.hash === `#${id}`)));
  observer = new IntersectionObserver(
    (entries) => {
      const top = entries.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) mark(top.target.id);
    },
    { rootMargin: "-60px 0px -60% 0px" },
  );
  root()?.querySelectorAll(".grp > h2, .danger h2").forEach((h) => observer?.observe(h));
  mark(location.hash.slice(1) || "profile");
}

async function init(): Promise<void> {
  if (!root()) return;
  paintPrefs();
  trackSections();
  me = await fetchMe();
  document.documentElement.dataset.auth = me ? "in" : "out";
  paintPrefs();
  const lc = $("[data-lc-settings]");
  if (lc && !lc.dataset.mounted) {
    lc.dataset.mounted = "1";
    void import("../lib/ui/leetcode-connect").then((m) => m.mountLeetcodePanel(lc));
  }
  if (me) {
    paintProfile();
    paintMethods();
    void paintSessions();
  }
}

document.addEventListener("change", onChange);
document.addEventListener("click", onClick);
document.addEventListener("input", onInput);
document.addEventListener("astro:page-load", () => void init());
addEventListener("myleet:prefs-saved", (e) => root() && showSaved((e as CustomEvent<{ ok: boolean }>).detail.ok ? "ok" : "err"));
addEventListener("myleet:prefs", () => root() && paintPrefs());
addEventListener("myleet:theme", () => root() && paintPrefs());
addEventListener("online", () => root() && void paintSessions());
