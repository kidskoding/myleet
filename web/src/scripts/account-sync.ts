// Signed-in housekeeping: link this device's progress on first sign-in (merge if both
// sides have history), keep progress and settings synced, report sync trouble.
import { fetchMe, fromServer, isDefaultServer, patchMe, putPlan, toServer, type Me } from "../lib/account";
import { onPrefsChange, planSettings, readPrefs, readTheme, updatePrefs } from "../lib/prefs";
import { apiTransport, readEvents, type SyncTransport } from "../lib/progress";
import { publicSummary } from "../lib/summary";
import { createSyncer, firstSync, isLinked } from "../lib/sync";
import { loadTrainer, type TrainerApi } from "../lib/trainer";
import { html } from "../lib/ui/html";
import { hideBanner, showBanner, toast } from "../lib/ui/overlay";
import { plural } from "../lib/ui/bits";

let started = false;
let trainer: TrainerApi | undefined;

function transport(): SyncTransport {
  return apiTransport({ summary: (ev) => (trainer ? publicSummary(trainer, ev) : { streak: 0, mastered: 0, solved: 0, heatmap: {} }) });
}

function syncFailed(retry: () => void): void {
  const b = showBanner("sync", {
    icon: "triangle-alert",
    tone: "error",
    body: html`<strong>Couldn't sync your progress.</strong> It's safe on this device and will sync when the server answers.`,
    actions: html`<button class="btn btn-secondary btn-sm" type="button" data-retry>Retry</button>`,
  });
  b?.querySelector("[data-retry]")?.addEventListener("click", retry);
}

const PLAN_SENT = "myleet:plan-sent";

/** After a sync or a settings change: upload the plan only when its content changed. */
async function uploadPlan(): Promise<void> {
  if (!trainer || !navigator.onLine) return;
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
  const t = transport();
  const user = me.user.id;

  // Settings: a fresh account takes this device's plan; otherwise the account wins (theme stays local).
  if (isDefaultServer(me.settings)) void patchMe({ settings: { ...toServer(readPrefs()), theme: readTheme() } }).catch(() => undefined);
  else updatePrefs(fromServer(me.settings), { silent: true });

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
    if (r.kind === "uploaded") toast(`Your ${plural(Object.keys(trainer?.states(await readEvents()) ?? {}).length, "problem")} are on your account now.`);
    else if (r.kind === "merge") await import("./auth-ui").then((m) => m.openMerge(me, r.remote, t));
    else if (r.kind === "synced") window.dispatchEvent(new Event("myleet:synced"));
    if (r.kind !== "deferred") void uploadPlan().catch(() => undefined);
  } catch {
    syncFailed(() => {
      started = false;
      void fetchMe(true).then((m) => m && startAccountSync(m));
    });
  }

  addEventListener("myleet:progress", () => syncer.request());
  addEventListener("online", () => syncer.request(true));
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && syncer.request(true));

  // Settings changes go to the account, debounced; the Settings page shows Saved / Couldn't save.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let tries = 0;
  const push = (theme = false) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await patchMe({ settings: theme ? { ...toServer(readPrefs()), theme: readTheme() } : toServer(readPrefs()) });
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
