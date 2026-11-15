// The app shell: theme, keys, top bar state, banners, account bootstrap, service worker,
// reminders. Runs once per full load; `astro:page-load` refreshes per-page state.
import { navigate } from "astro:transitions/client";
import { AUTH_ERRORS, cachedMe, fetchMe, initials, takeReturn, type Me } from "../lib/account";
import { applyMotionPref, applyTheme, readPrefs, resolvedTheme, toggleTheme } from "../lib/prefs";
import { lastReminder, nextSessionReminder, reminderDelay, reminderSupport, sendReminder, type PlannedSession } from "../lib/reminders";
import { ROUTES } from "../lib/routes";
import { localDay, readStreak, STREAK_MILESTONES, streakNow } from "../lib/streak";
import { html } from "../lib/ui/html";
import { icon } from "../lib/ui/icons";
import { hideBanner, showBanner, toast } from "../lib/ui/overlay";

export const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);

function typing(): boolean {
  const a = document.activeElement as HTMLElement | null;
  if (!a) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable || !!a.closest(".cm-editor");
}

function dialogOpen(): boolean {
  return !!document.querySelector("dialog[open]");
}

// ---- overlays (lazy chunks) ----

export const openPalette = () => import("./palette").then((m) => m.openPalette());
export const openShortcuts = () => import("./shortcuts").then((m) => m.openShortcuts());
export const openSignIn = (error?: string) => import("./auth-ui").then((m) => m.openSignIn(error ? { error } : {}));

// ---- keys ----

const G_ROUTES: Record<string, string> = {
  t: ROUTES.today,
  s: ROUTES.plan,
  l: ROUTES.learn,
  c: ROUTES.companies,
  m: ROUTES.mock,
  p: ROUTES.progress,
  ",": ROUTES.settings,
};
let gAt = 0;

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    void openPalette();
    return;
  }
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || typing() || dialogOpen()) return;
  if (e.key === "?") {
    e.preventDefault();
    void openShortcuts();
  } else if (e.key === "D" && e.shiftKey) {
    e.preventDefault();
    themeToggled(toggleTheme());
  } else if (e.key === "g" && !e.shiftKey) {
    gAt = Date.now();
  } else if (gAt && Date.now() - gAt < 1200 && G_ROUTES[e.key]) {
    e.preventDefault();
    gAt = 0;
    void navigate(G_ROUTES[e.key] ?? ROUTES.today);
  } else {
    gAt = 0;
  }
});

// ---- clicks (delegated, so they survive page swaps) ----

document.addEventListener("click", (e) => {
  const t = e.target as Element;
  if (t.closest("[data-open-palette]")) void openPalette();
  else if (t.closest("[data-open-shortcuts]")) void openShortcuts();
  else if (t.closest("[data-theme-toggle]")) themeToggled(toggleTheme());
  else if (t.closest("[data-signin]")) {
    e.preventDefault();
    void openSignIn();
  } else if (t.closest("[data-account-menu]")) toggleAccountMenu(t.closest<HTMLElement>("[data-account-menu]"));
});

function themeToggled(next: "light" | "dark" | "system"): void {
  updateThemeButton();
  toast(next === "dark" ? "Dark theme on" : "Light theme on", { ms: 2500 });
}

function updateThemeButton(): void {
  const b = $("[data-theme-toggle]");
  b?.setAttribute("aria-label", resolvedTheme() === "dark" ? "Switch to light theme" : "Switch to dark theme");
}

// ---- account menu ----

let menu: HTMLElement | undefined;

function closeMenu(): void {
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  $("[data-account-menu]")?.setAttribute("aria-expanded", "false");
}

function toggleAccountMenu(btn: HTMLElement | null): void {
  if (!btn) return;
  if (menu && !menu.hidden) return closeMenu();
  const me = cachedMe();
  menu?.remove();
  menu = document.createElement("div");
  menu.className = "menu";
  menu.id = "account-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Account");
  menu.innerHTML = html`${me ? html`<div class="menu-head"><strong>${me.user.display_name || me.user.username}</strong><span>${me.user.email}</span></div>` : ""}
    <a role="menuitem" href="${ROUTES.progress}">${icon("calendar-check")}Progress</a>
    <a role="menuitem" href="${ROUTES.settings}">${icon("settings")}Settings</a>
    ${me ? html`<a role="menuitem" href="/u/${me.user.username}">${icon("user")}Public profile</a>` : ""}
    <button role="menuitem" type="button" data-open-shortcuts>${icon("keyboard")}Keyboard shortcuts</button>
    <hr /><button role="menuitem" type="button" data-signout>${icon("log-out")}Sign out</button>`.value;
  document.body.append(menu);
  const r = btn.getBoundingClientRect();
  menu.style.top = `${r.bottom + 6}px`;
  menu.style.right = `${Math.max(8, innerWidth - r.right)}px`;
  btn.setAttribute("aria-expanded", "true");
  const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  items[0]?.focus();
  menu.addEventListener("keydown", (e) => {
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    } else if (e.key === "Escape") {
      closeMenu();
      btn.focus();
    } else if (e.key === "Tab") closeMenu();
  });
  menu.addEventListener("click", (e) => {
    if ((e.target as Element).closest("[data-signout]")) void import("./auth-ui").then((m) => m.signOutFlow());
    closeMenu();
  });
}
document.addEventListener("pointerdown", (e) => {
  if (menu && !menu.hidden && !menu.contains(e.target as Node) && !(e.target as Element).closest("[data-account-menu]")) closeMenu();
});

// ---- top bar state ----

export function paintAccount(me: Me | null): void {
  document.documentElement.dataset.auth = me ? "in" : "out";
  const av = $("[data-avatar]");
  if (!av) return;
  if (me?.user.avatar_url) av.innerHTML = html`<img src="${me.user.avatar_url}" alt="" width="30" height="30" referrerpolicy="no-referrer" />`.value;
  else av.textContent = me ? initials(me.user) : "";
}

let shownStreak = -1;
function paintStreak(): void {
  const el = $<HTMLAnchorElement>("[data-streak]");
  if (!el) return;
  const c = readStreak();
  const s = streakNow(c);
  el.hidden = c.last === null;
  const num = $("[data-streak-num]", el);
  const unit = $("[data-streak-unit]", el);
  if (num && String(s.n) !== num.textContent) {
    num.textContent = String(s.n);
    // Roll only for a solve that extends the streak while the page is open.
    if (shownStreak >= 0 && s.n === shownStreak + 1) {
      num.classList.remove("roll");
      void num.offsetWidth;
      num.classList.add("roll");
      if (STREAK_MILESTONES.includes(s.n)) toast(`${s.n}-day streak.`);
    }
  }
  shownStreak = s.n;
  el.classList.toggle("at-risk", s.atRisk);
  if (unit) unit.textContent = s.atRisk ? `${s.n === 1 ? "day" : "days"}, solve one to keep it` : s.n === 1 ? "day" : "days";
  el.setAttribute(
    "aria-label",
    `${s.n}-day streak${s.atRisk ? ", solve one today to keep it" : ""}. Open progress`,
  );
}

function paintNav(): void {
  const cur = document.body.dataset.nav;
  for (const a of document.querySelectorAll<HTMLAnchorElement>(".nav a, .tabbar a")) {
    if (a.dataset.nav === cur) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  const streak = $("[data-streak]");
  if (cur === "progress") streak?.setAttribute("aria-current", "page");
  else streak?.removeAttribute("aria-current");
  const kbd = $("[data-mod-k]");
  if (kbd) kbd.textContent = isMac ? "⌘K" : "Ctrl K";
}

// ---- banners: offline, update, sync ----

function paintOnline(): void {
  if (navigator.onLine) hideBanner("offline");
  else
    showBanner("offline", {
      icon: "wifi-off",
      body: html`<strong>You're offline.</strong> Practice keeps working: problems you've opened and Python are cached. Progress syncs when you reconnect.`,
      live: true,
    });
}
addEventListener("online", paintOnline);
addEventListener("offline", paintOnline);

let waitingWorker: ServiceWorker | null = null;
function paintUpdate(): void {
  if (!waitingWorker) return;
  showBanner("update", {
    icon: "refresh",
    body: html`<strong>A new version is ready.</strong>`,
    actions: html`<button class="btn btn-secondary btn-sm" type="button" data-sw-reload>Reload</button>`,
    dismissDays: 0,
  })
    ?.querySelector("[data-sw-reload]")
    ?.addEventListener("click", () => waitingWorker?.postMessage("skip-waiting"));
}

async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  const reg = await navigator.serviceWorker.register("/sw.js");
  const track = (w: ServiceWorker | null) => {
    w?.addEventListener("statechange", () => {
      if (w.state === "installed" && navigator.serviceWorker.controller) {
        waitingWorker = w;
        paintUpdate();
      }
    });
  };
  if (reg.waiting && navigator.serviceWorker.controller) {
    waitingWorker = reg.waiting;
    paintUpdate();
  }
  reg.addEventListener("updatefound", () => track(reg.installing));
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !waitingWorker) return;
    reloading = true;
    location.reload();
  });
}

// ---- install (Chromium's install prompt, offered from Today, Settings and the palette) ----

addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  const w = window as { __myleetInstall?: () => void };
  w.__myleetInstall = () => {
    void (e as Event & { prompt(): Promise<void> }).prompt();
    delete w.__myleetInstall;
  };
});

// ---- reminders ----

let reminderTimer: ReturnType<typeof setTimeout> | undefined;
const SESSION_SENT = "myleet:session-reminded";

/** Today's planned sessions, written by Today and Plan whenever they re-plan. */
function plannedToday(): PlannedSession[] | null {
  try {
    const v = JSON.parse(localStorage.getItem("myleet:sessions") ?? "null") as { day: string; sessions: PlannedSession[] } | null;
    return v && v.day === localDay() && v.sessions.length ? v.sessions : null;
  } catch {
    return null;
  }
}

function sentSessions(): number[] {
  try {
    return JSON.parse(localStorage.getItem(SESSION_SENT) ?? "[]") as number[];
  } catch {
    return [];
  }
}

function scheduleReminder(): void {
  clearTimeout(reminderTimer);
  const p = readPrefs();
  if (!p.reminders.on || reminderSupport() !== "granted") return;
  const sessions = plannedToday();
  if (sessions) {
    const r = nextSessionReminder(new Date(), sessions, { lead: p.reminders.lead, quietFrom: p.reminders.quietFrom, quietTo: p.reminders.quietTo, sent: sentSessions() });
    if (!r) return;
    reminderTimer = setTimeout(() => {
      try {
        localStorage.setItem(SESSION_SENT, JSON.stringify([...sentSessions().filter((t) => t > Date.now() - 86_400_000), r.key]));
      } catch {
        // Might remind twice; harmless.
      }
      void sendReminder(r.body).then(scheduleReminder);
    }, r.delay);
    return;
  }
  const delay = reminderDelay(new Date(), p.reminders.time, streakNow(readStreak()).solvedToday, lastReminder());
  if (delay === null) return;
  reminderTimer = setTimeout(() => {
    if (streakNow(readStreak()).solvedToday) return;
    void sendReminder(todayLine());
  }, delay);
}

function todayLine(): string {
  try {
    const t = JSON.parse(localStorage.getItem("myleet:today") ?? "null") as { day: string; due: number; mins: number } | null;
    if (t && t.day === localDay() && t.due > 0) return `${t.due} ${t.due === 1 ? "review is" : "reviews are"} due today. About ${t.mins} min.`;
  } catch {
    // Fall back to the plain line.
  }
  return "One problem keeps your streak going today.";
}

// ---- account bootstrap ----

async function bootAccount(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const err = params.get("auth_error");
  const onSignInPage = location.pathname.replace(/\/$/, "") === ROUTES.signin;
  if (onSignInPage) {
    // The /signin page renders the panel inline with the same error.
  } else if (err !== null) {
    params.delete("auth_error");
    history.replaceState(history.state, "", location.pathname + (params.size ? `?${params}` : "") + location.hash);
    void openSignIn(AUTH_ERRORS[err] ?? "Sign-in didn't finish. Try again or use another method.");
  } else if (params.get("auth") === "signin") {
    void openSignIn();
  }
  const me = await fetchMe();
  paintAccount(me);
  if (!me) return;
  const back = takeReturn();
  if (back && back !== location.pathname + location.search) await navigate(back);
  void import("./account-sync").then((m) => m.startAccountSync(me));
}

// ---- lifecycle ----

function onPage(): void {
  paintNav();
  paintStreak();
  paintOnline();
  paintUpdate();
  updateThemeButton();
  closeMenu();
  const bar = $(".topbar");
  if (bar) bar.classList.toggle("is-scrolled", scrollY > 4);
}

applyTheme();
applyMotionPref();
paintAccount(cachedMe());
document.addEventListener("astro:page-load", onPage);
addEventListener("scroll", () => $(".topbar")?.classList.toggle("is-scrolled", scrollY > 4), { passive: true });
addEventListener("myleet:streak", paintStreak);
addEventListener("myleet:prefs", () => {
  applyMotionPref();
  scheduleReminder();
});
addEventListener("myleet:progress", () => {
  // Pages that write progress already run the trainer; refresh the streak from it.
  void Promise.all([import("../lib/trainer"), import("../lib/progress"), import("../lib/streak")]).then(
    async ([t, p, s]) => s.recordStats((await t.loadTrainer()).stats(await p.readEvents())),
  );
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateThemeButton);
void bootAccount();
// The palette loads on idle so the first Cmd/Ctrl+K opens at once and catches what you type.
(window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 2000)))(() => void import("./palette"));
void registerServiceWorker();
scheduleReminder();
// Today and Plan rewrite the day's sessions as they re-plan; pick them up.
setInterval(() => (paintStreak(), scheduleReminder()), 10 * 60_000);

