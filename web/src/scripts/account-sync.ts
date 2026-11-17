// Signed-in housekeeping: link this device's progress on first sign-in (merge if both
// sides have history), keep progress and settings synced, report sync trouble.
import { fetchMe, fromServer, googleState, isDefaultServer, patchMe, pushGoogleSessions, putPlan, toServer, type Me, type ServerSettings } from "../lib/account";
import { GCAL_KEY, GCAL_SENT, mergeGoogle, upcoming } from "../lib/google-calendar";
import { DEFAULT_ACCENT, DEFAULT_NIGHT } from "../lib/flavors";
import { adoptAppearance, onPrefsChange, planSettings, readAccent, readNight, readPrefs, readTheme, updatePrefs } from "../lib/prefs";
import { apiTransport, readEvents, type SyncTransport } from "../lib/progress";
import { publicSummary } from "../lib/summary";
import { createSyncer, firstSync, isLinked, mergeIntoAccount } from "../lib/sync";
import { takePending } from "../lib/access";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import { html } from "../lib/ui/html";
import { hideBanner, showBanner, toast } from "../lib/ui/overlay";

let started = false;
/** The Worker stores night flavor and accent too (older Workers reject unknown fields). */
let appearanceSynced = false;

function appearance(): Partial<ServerSettings> {
  const theme = readTheme();
  if (appearanceSynced) return { theme, night_flavor: readNight(), accent: readAccent() };
  return { theme: theme === "system" ? "system" : theme === "latte" ? "light" : "dark" };
}

/** An account whose appearance was never chosen (the Worker's defaults) takes this device's. */
function defaultAppearance(s: ServerSettings): boolean {
  return s.theme === "system" && (s.night_flavor ?? DEFAULT_NIGHT) === DEFAULT_NIGHT && (s.accent ?? DEFAULT_ACCENT) === DEFAULT_ACCENT;
}
let trainer: TrainerApi | undefined;

function transport(): SyncTransport {
  return apiTransport({ summary: (ev) => (trainer ? publicSummary(trainer, ev) : { streak: 0, mastered: 0, solved: 0, heatmap: {} }) });
}

function syncFailed(retry: () => void): void {
  const b = showBanner("sync", {
    icon: "triangle-alert",
    tone: "error",
    body: html`<strong>Couldn't sync your progress</strong> It's safe on this device and will sync when the server answers`,
    actions: html`<button class="btn btn-secondary btn-sm" type="button" data-retry>Retry</button>`,
  });
  b?.querySelector("[data-retry]")?.addEventListener("click", retry);
}

const PLAN_SENT = "myleet:plan-sent";
/** A connected tab reads Google at most this often (open, return to the tab). */
const GCAL_PULL_MS = 60_000;

interface GcalSeen {
  at: number;
  connected: boolean;
  /** False after a free/busy answer that couldn't be read in full. */
  complete: boolean;
}

function session(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function setSession(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // This tab asks again next time; harmless.
  }
}

const seen = (): GcalSeen | null => {
  try {
    return JSON.parse(session(GCAL_KEY) ?? "null") as GcalSeen | null;
  } catch {
    return null;
  }
};

/**
 * Changes made in Google become moves and skips, and busy time reaches the planner.
 * Runs before any push, so a push never puts back a session the learner just moved.
 */
async function pullGoogle(): Promise<void> {
  const last = seen();
  if (!trainer || !navigator.onLine || (last?.connected && Date.now() - last.at < GCAL_PULL_MS)) return;
  const state = await googleState().catch(() => null);
  if (!state) return;
  setSession(GCAL_KEY, JSON.stringify({ at: Date.now(), connected: state.connected, complete: state.busy_complete !== false } satisfies GcalSeen));
  const p = readPrefs();
  if (!state.connected) {
    setSession(GCAL_SENT, null);
    if (p.plan.busy.length) updatePrefs({ plan: { busy: [] } });
    return;
  }
  const patch = mergeGoogle(state, trainer.plan(await readEvents(), planSettings(p)), p.plan);
  if (!patch) return;
  updatePrefs({ plan: patch });
  if (state.moves?.length || state.skips?.length) toast("Updated from your changes in Google Calendar");
}

let pulling: Promise<void> = Promise.resolve();

function pullNow(): Promise<void> {
  pulling = pulling.then(pullGoogle).catch(() => undefined);
  return pulling;
}

/** Sends the next four weeks of sessions to Google when they changed. */
async function pushGoogle(): Promise<void> {
  await pulling;
  const s = seen();
  // Unreadable busy time plans nothing, and sending that would empty the calendar.
  if (!trainer || !navigator.onLine || !s?.connected || !s.complete) return;
  const sessions = upcoming(trainer.plan(await readEvents(), planSettings()), Date.now());
  const key = JSON.stringify(sessions);
  if (session(GCAL_SENT) === key) return;
  // Each call writes up to 40 events; a first sync of four weeks may need a few.
  for (let i = 0; i < 5; i++) {
    const r = await pushGoogleSessions(sessions);
    if (!r.connected) return setSession(GCAL_KEY, null);
    if (r.failed) return;
    if (!r.more) return setSession(GCAL_SENT, key);
  }
}

/** After a sync or a settings change: upload the plan only when its content changed. */
async function uploadPlan(): Promise<void> {
  if (!trainer || !navigator.onLine) return;
  void pushGoogle().catch(() => undefined);
  const plan = trainer.plan(await readEvents(), planSettings());
  const key = JSON.stringify({ ...plan, generated_ms: 0 });
  let last: string | null = null;
  try {
    last = localStorage.getItem(PLAN_SENT);
  } catch {
    // Upload anyway; the Worker skips identical plans.
  }
  if (last === key) return;
  await putPlan(plan);
  try {
    localStorage.setItem(PLAN_SENT, key);
  } catch {
    // Re-uploads next time; harmless.
  }
}

export async function startAccountSync(me: Me): Promise<void> {
  if (started) return;
  started = true;
  trainer = await loadTrainer().catch(() => undefined);
  void pullNow();
  const t = transport();
  const user = me.user.id;

  // Settings: a fresh account takes this device's plan; otherwise the account wins. Appearance
  // follows the account once it has one; until then this device's choice is sent up.
  appearanceSynced = "accent" in me.settings;
  if (isDefaultServer(me.settings)) void patchMe({ settings: { ...toServer(readPrefs()), ...appearance() } }).catch(() => undefined);
  else updatePrefs(fromServer(me.settings), { silent: true });
  if (appearanceSynced && !defaultAppearance(me.settings)) adoptAppearance({ theme: me.settings.theme, night: me.settings.night_flavor, accent: me.settings.accent });
  else if (appearanceSynced && !isDefaultServer(me.settings)) void patchMe({ settings: appearance() }).catch(() => undefined);

  const syncer = createSyncer(
    async () => {
      if (!navigator.onLine || !isLinked(user)) return;
      const before = await readEvents();
      const after = await import("../lib/progress").then((m) => m.syncProgress(t));
      if (after !== before) window.dispatchEvent(new Event("myleet:synced"));
      await uploadPlan().catch(() => undefined);
    },
    (s) => {
      if (s.ok) hideBanner("sync");
      else syncFailed(() => syncer.request(true));
    },
  );

  try {
    const r = await firstSync(t, user);
    // Guest work moves into the account without a question: merging keeps both histories.
    if (r.kind === "merge") {
      await mergeIntoAccount(t, user);
      window.dispatchEvent(new Event("myleet:synced"));
    } else if (r.kind === "synced") window.dispatchEvent(new Event("myleet:synced"));
    const pending = takePending();
    if (r.kind === "uploaded" || r.kind === "merge" || (pending !== null && pending !== "calendar-sync")) toast("Saved to your account");
    if (r.kind !== "deferred") void uploadPlan().catch(() => undefined);
    void import("../lib/leetcode").then((m) => m.refreshIfDue()).catch(() => undefined);
  } catch {
    syncFailed(() => {
      started = false;
      void fetchMe(true).then((m) => m && startAccountSync(m));
    });
  }

  addEventListener("myleet:progress", () => syncer.request());
  addEventListener("online", () => syncer.request(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") syncer.request(true);
    else void pullNow();
  });

  // Settings changes go to the account, debounced; the Settings page shows Saved / Couldn't save.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let tries = 0;
  const push = (theme = false) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await patchMe({ settings: theme ? { ...toServer(readPrefs()), ...appearance() } : toServer(readPrefs()) });
        tries = 0;
        window.dispatchEvent(new CustomEvent("myleet:prefs-saved", { detail: { ok: true } }));
        void uploadPlan().catch(() => undefined);
      } catch {
        window.dispatchEvent(new CustomEvent("myleet:prefs-saved", { detail: { ok: false } }));
        tries += 1;
        if (tries < 6) setTimeout(() => push(theme), 2000 * 2 ** tries);
      }
    }, 600);
  };
  onPrefsChange(() => push());
  addEventListener("myleet:theme", () => push(true));
}
