// Settings (/settings): every preference applies and saves as it changes.
import { navigate } from "astro:transitions/client";
import {
  ApiError,
  deleteAccount,
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
import { readPrefs, readTheme, setTheme, updatePrefs, type Prefs } from "../lib/prefs";
import { exportEvents, importEvents, mergeEvents, readEvents } from "../lib/progress";
import { reminderSupport, requestReminderPermission } from "../lib/reminders";
import { profileHref, ROUTES } from "../lib/routes";
import { shortDate } from "../lib/plan";
import { localDay } from "../lib/streak";
import type { Availability, Weekday } from "../lib/types";
import { unlinkDevice } from "../lib/sync";
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
  else if (state === "err") render(el, html`${icon("triangle-alert")}Couldn't save to your account. Kept on this device; retrying.`);
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
  const theme = readTheme();
  for (const r of root()?.querySelectorAll<HTMLInputElement>('input[name="theme"]') ?? []) r.checked = r.value === theme;
  $("[data-codeprev]")?.classList.toggle("no-lig", !p.editor.ligatures);
  const codeprev = $<HTMLElement>("[data-codeprev]");
  if (codeprev) codeprev.style.fontSize = `${p.editor.fontSize}px`;
  const alarm = $<HTMLSelectElement>('[data-pref="plan.reminderMinutes"]');
  if (alarm) alarm.value = p.plan.reminderMinutes === null ? "none" : String(p.plan.reminderMinutes);
  const daily = $<HTMLSelectElement>('[data-pref="plan.dailyMinutes"]');
  if (daily) daily.value = String(p.plan.dailyMinutes ?? 60);
  const rem = $<HTMLInputElement>("[data-reminder]");
  if (rem) rem.checked = p.reminders.on;
  paintReminderNote();
  const iv = $("[data-interview]");
  if (iv) iv.textContent = p.plan.interviewDate ? shortDate(p.plan.interviewDate) : "None set";
  const pub = $<HTMLInputElement>('[data-pref="publicProfile"]');
  if (pub) pub.disabled = !me;
  const mod = $("[data-mod]");
  if (mod) mod.textContent = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
}

const WEEKDAYS: [Weekday, string][] = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
];
const MAX_WINDOWS = 21;

function paintAvailability(): void {
  const el = $("[data-availability]");
  if (!el) return;
  const wins = readPrefs().plan.availability;
  render(
    el,
    html`<div class="avail">${wins.map(
      (w, i) => html`<div class="win" role="group" aria-label="Window ${i + 1}">
        <div class="win-days">${WEEKDAYS.map(([d, l]) => html`<button class="chip" type="button" data-win="${i}" data-day="${d}" aria-pressed="${w.days.includes(d) ? "true" : "false"}">${l}</button>`)}</div>
        <div class="win-times"><input class="input" type="time" aria-label="Window ${i + 1} start" value="${w.start}" data-win-start="${i}" />to<input class="input" type="time" aria-label="Window ${i + 1} end" value="${w.end === "24:00" ? "23:59" : w.end}" data-win-end="${i}" /><button class="icon-btn" type="button" data-win-remove="${i}" aria-label="Remove window ${i + 1}">${icon("trash")}</button></div>
        ${w.start >= w.end ? html`<p class="err" style="font-size:var(--text-xs);color:var(--fail);font-weight:600">Start before end; windows can't run overnight.</p>` : ""}
      </div>`,
    )}${wins.length < MAX_WINDOWS ? html`<button class="btn btn-secondary btn-sm" type="button" style="justify-self:start" data-win-add>${icon("plus")}Add a time window</button>` : ""}</div>`,
  );
}

function setWindows(next: Availability[]): void {
  // Only valid windows reach the planner and the account; the editor keeps showing drafts.
  changed({ plan: { availability: next } });
  paintAvailability();
}

function paintDaysOff(): void {
  const el = $("[data-days-off]");
  if (!el) return;
  const days = [...readPrefs().plan.daysOff].sort();
  render(
    el,
    html`<div class="off"><div class="off-add"><input class="input" id="set-off" type="date" min="${localDay()}" data-off-input /><button class="btn btn-secondary btn-sm" type="button" data-off-add>Add</button></div>
      <div class="off-list" aria-label="Days off">${days.map((d) => html`<button class="chip" type="button" data-off-remove="${d}" aria-label="Remove ${shortDate(d)}">${shortDate(d)}${icon("x")}</button>`)}</div></div>`,
  );
}

function paintReminderNote(): void {
  const row = $("[data-reminder-note]");
  const text = $("[data-reminder-text]");
  if (!row || !text) return;
  const s = reminderSupport();
  const on = readPrefs().reminders.on;
  let msg = "";
  if (on && s === "denied")
    msg = "Notifications are blocked for this site, so reminders can't show. Allow them in your browser's site settings (the icon left of the address), then come back. Reminders stay on and start once allowed.";
  else if (s === "unsupported")
    msg = "This browser can't show notifications here. On iPhone and iPad, add myleet to your Home Screen first (Share, then Add to Home Screen), then turn reminders on from the app.";
  row.hidden = !msg;
  text.textContent = msg;
}

// ---- account rows ----

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
          ? "Sign in with a one-time link to your email; no password."
          : `Uses ${me?.user.email}. Accounts link by verified email.`;
      const action = on
        ? have.size === 1
          ? html`<span class="text-small text-muted">Only method</span>`
          : html`<span class="text-small text-muted">Connected</span>`
        : p.id === "email"
          ? html`<span class="text-small text-muted">Available</span>`
          : html`<button class="btn btn-secondary btn-sm" type="button" data-connect="${p.id}">${p.add}</button>`;
      return html`<div class="meth"><span class="ic">${icon(p.icon)}</span><div><strong>${p.label}</strong><span class="d">${detail}</span></div>${action}</div>`;
    })}
    <div class="row"><div class="note" style="grid-column:1/-1">${icon("lock")}<span>Sign-in methods link to the same account when they share a verified email. To stop using one, sign out of its sessions below.</span></div></div>`,
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
    render(el, html`<div class="sess"><span>Available when you're online.</span></div>`);
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

// ---- profile fields (debounced saves) ----

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
  if (!USERNAME_RE.test(v)) return userMsg("bad", "Lowercase letters, numbers and dashes only, 3 to 30 characters.");
  userMsg("", "Checking");
  userTimer = setTimeout(async () => {
    try {
      me = await patchMe({ username: v });
      userMsg("ok", `Saved. Your profile is at ${profileHref(v)}.`);
      paintProfile();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) userMsg("bad", "Taken. Try another.");
      else if (e instanceof ApiError && e.status === 400) userMsg("bad", e.message || "That username isn't allowed.");
      else userMsg("bad", "Couldn't save. Check your connection and try again.");
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

// ---- data ----

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
    toast("That file isn't an events.jsonl or a myleet export.");
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
    toast("Nothing new in that file; your progress already has all of it.");
    return;
  }
  const ok = await confirmDialog({
    title: "Import this progress?",
    body: `Adds ${added} events across ${problems.size} problems. Nothing already here is removed or changed.`,
    confirm: "Import",
  });
  if (!ok) return;
  await importEvents(events);
  toast(`Imported ${added} events.`);
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
      <p style="margin-top:var(--space-3)">It can't be undone. Download your data first if you want a copy. Progress in this browser stays.</p>
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
      closeDialog(d);
      document.documentElement.dataset.auth = "out";
      toast("Account deleted. Progress on this device is still here.");
      await navigate(ROUTES.home);
    } catch {
      confirm.removeAttribute("aria-busy");
      const err = d.querySelector<HTMLElement>("[data-del-err]");
      if (err) {
        err.hidden = false;
        err.textContent = "Couldn't reach the server. Nothing was deleted; try again.";
      }
    }
  });
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  openDialog(d);
}

// ---- wiring ----

function onChange(e: Event): void {
  if (!root()) return;
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  if (el.name === "theme") {
    setTheme(el.value as "system" | "light" | "dark");
    showSaved("ok");
    return;
  }
  if (el.matches("[data-reminder]")) return void toggleReminder((el as HTMLInputElement).checked);
  if (el.matches("[data-import]")) {
    const f = (el as HTMLInputElement).files?.[0];
    if (f) void importFile(f);
    (el as HTMLInputElement).value = "";
    return;
  }
  const ws = (el as HTMLElement).dataset.winStart ?? (el as HTMLElement).dataset.winEnd;
  if (ws !== undefined) {
    const wins = readPrefs().plan.availability.map((w) => ({ ...w }));
    const w = wins[Number(ws)];
    if (w) {
      if ((el as HTMLElement).dataset.winStart !== undefined) w.start = el.value;
      else w.end = el.value === "23:59" ? "24:00" : el.value;
      setWindows(wins);
    }
    return;
  }
  const path = el.dataset.pref;
  if (!path) return;
  let value: unknown = el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : el.value;
  if (path === "editor.vim") return changed({ editor: { keymap: value ? "vim" : "standard" } });
  if (path === "editor.indent" || path.startsWith("timeTargets.") || path === "plan.dailyMinutes" || path === "plan.sessionMinutes") value = Number(value);
  if (path === "plan.reminderMinutes") value = value === "none" ? null : Number(value);
  if (el.matches("[data-win-start], [data-win-end]")) return;
  changed(patchFor(path, value));
  paintPrefs();
}

async function toggleReminder(on: boolean): Promise<void> {
  if (on && reminderSupport() === "default") await requestReminderPermission();
  changed({ reminders: { on } });
  paintReminderNote();
  if (on && reminderSupport() === "granted") toast(`Reminder on: ${readPrefs().reminders.time} on days you haven't practised.`);
}

function onClick(e: MouseEvent): void {
  if (!root()) return;
  const t = e.target as Element;
  const step = t.closest<HTMLElement>("[data-step]");
  const revoke = t.closest<HTMLElement>("[data-revoke]");
  const connect = t.closest<HTMLElement>("[data-connect]");
  const winDay = t.closest<HTMLElement>("[data-day]");
  const winRemove = t.closest<HTMLElement>("[data-win-remove]");
  const offRemove = t.closest<HTMLElement>("[data-off-remove]");
  if (winDay) {
    const wins = readPrefs().plan.availability.map((w) => ({ ...w, days: [...w.days] }));
    const w = wins[Number(winDay.dataset.win)];
    const d = winDay.dataset.day as Weekday;
    if (w) w.days = w.days.includes(d) ? w.days.filter((x) => x !== d) : WEEKDAYS.map(([x]) => x).filter((x) => x === d || w.days.includes(x));
    setWindows(wins);
    return;
  }
  if (winRemove) return setWindows(readPrefs().plan.availability.filter((_, i) => i !== Number(winRemove.dataset.winRemove)));
  if (t.closest("[data-win-add]"))
    return setWindows([...readPrefs().plan.availability, { days: ["mon", "tue", "wed", "thu", "fri"], start: "19:00", end: "20:30" }]);
  if (t.closest("[data-off-add]")) {
    const v = $<HTMLInputElement>("[data-off-input]")?.value;
    if (v && !readPrefs().plan.daysOff.includes(v)) changed({ plan: { daysOff: [...readPrefs().plan.daysOff, v].slice(-366) } });
    return paintDaysOff();
  }
  if (offRemove) {
    changed({ plan: { daysOff: readPrefs().plan.daysOff.filter((d) => d !== offRemove.dataset.offRemove) } });
    return paintDaysOff();
  }
  if (step) {
    const path = step.dataset.step ?? "";
    const [lo, hi] = LIMITS[path] ?? [0, 99];
    const next = Math.max(lo, Math.min(hi, Number(get(readPrefs(), path)) + Number(step.dataset.by)));
    changed(patchFor(path, next));
    paintPrefs();
  } else if (revoke?.dataset.revoke) {
    revoke.setAttribute("aria-busy", "true");
    void revokeSession(revoke.dataset.revoke)
      .then(() => (toast("Signed out on that device."), paintSessions()))
      .catch(() => toast("Couldn't sign that device out. Try again."));
  } else if (t.closest("[data-revoke-others]")) {
    void listSessions()
      .then(({ sessions }) => Promise.all(sessions.filter((s) => !s.current).map((s) => revokeSession(s.id))))
      .then(() => (toast("Signed out everywhere else."), paintSessions()))
      .catch(() => toast("Couldn't sign out every device. Try again."));
  } else if (t.closest("[data-reload-sessions]")) void paintSessions();
  else if (connect?.dataset.connect) startOAuth(connect.dataset.connect as "github" | "google", `${ROUTES.settings}#signin`);
  else if (t.closest("[data-export-local]")) void exportLocal();
  else if (t.closest("[data-delete]")) deleteFlow();
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
  paintAvailability();
  paintDaysOff();
  trackSections();
  me = await fetchMe();
  document.documentElement.dataset.auth = me ? "in" : "out";
  paintPrefs();
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
