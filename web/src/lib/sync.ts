// Linking local progress to an account and keeping it synced. Local always wins first:
// writes land in IndexedDB, then a debounced sync pushes them (lib/progress.ts).
import { clearNotes } from "./annotations";
import { clearEvents, readEvents, readMeta, resetSyncMeta, syncProgress, type RemoteProgress, type SyncTransport } from "./progress";

const LINKED = "myleet:linked";
const LATER = "myleet:merge-later";

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Without storage the flags only last this page; sync still works.
  }
}

/** Device progress is tied to this account and syncs. */
export const isLinked = (userId: string): boolean => get(LINKED) === userId && get(LATER) !== userId;
export const deferredMerge = (userId: string): boolean => get(LATER) === userId;

export type FirstSync =
  /** Already linked, or nothing on this device: synced (pulled) quietly. */
  | { kind: "synced" }
  /** Account was empty: this device's progress is on the account now. */
  | { kind: "uploaded" }
  /** Both sides have history: ask before merging. */
  | { kind: "merge"; local: string; remote: RemoteProgress }
  /** The learner chose "Decide later" for this account: stay local. */
  | { kind: "deferred" };

/**
 * Runs once per page load when signed in. A different account than the one this device
 * last synced with starts over as a first sign-in, so one person's history never flows
 * silently into another's account.
 */
export async function firstSync(t: SyncTransport, userId: string): Promise<FirstSync> {
  if (get(LINKED) === userId) {
    if (get(LATER) === userId) return { kind: "deferred" };
    await syncProgress(t);
    return { kind: "synced" };
  }
  if (get(LINKED) !== null || (await readMeta()).version > 0) await resetSyncMeta();
  const local = await readEvents();
  const remote = await t.get();
  if (!local.trim() || !remote.events_jsonl.trim()) {
    const uploaded = local.trim() !== "" && !remote.events_jsonl.trim();
    await syncProgress(t);
    set(LINKED, userId);
    set(LATER, null);
    return uploaded ? { kind: "uploaded" } : { kind: "synced" };
  }
  if (get(LATER) === userId) return { kind: "deferred" };
  return { kind: "merge", local, remote };
}

/** "Merge into my account": union both histories (higher rung wins because events are kept). */
export async function mergeIntoAccount(t: SyncTransport, userId: string): Promise<string> {
  const text = await syncProgress(t);
  set(LINKED, userId);
  set(LATER, null);
  return text;
}

/** "Decide later": keep this device's progress local and unsynced for this account. */
export function decideLater(userId: string): void {
  set(LATER, userId);
  set(LINKED, userId);
}

/** "Use account only, discard this device": drop local events and notes, then pull the account's. */
export async function discardDeviceAndPull(t: SyncTransport, userId: string): Promise<string> {
  await clearEvents();
  clearNotes();
  const text = await syncProgress(t);
  set(LINKED, userId);
  set(LATER, null);
  return text;
}

/** Signing out keeps local progress but forgets the link. */
/** Wipes this browser's myleet data. A reset keeps the sign-in; a deleted account keeps only the theme. */
export function clearDevice(keepAccount: boolean): void {
  const keep = new Set(keepAccount ? ["myleet:me", "myleet:auth", "myleet:theme"] : ["myleet:theme"]);
  for (const store of [localStorage, sessionStorage]) {
    try {
      const keys = Array.from({ length: store.length }, (_, i) => store.key(i) ?? "");
      for (const k of keys) if (k.startsWith("myleet") && !keep.has(k)) store.removeItem(k);
    } catch {
      /* storage refused: nothing was stored to clear */
    }
  }
  try {
    indexedDB.deleteDatabase("myleet");
  } catch {
    /* no IndexedDB in this browser */
  }
}

export function unlinkDevice(): void {
  set(LINKED, null);
  set(LATER, null);
}

export function createSyncer(
  run: () => Promise<unknown>,
  onState: (s: { ok: boolean; error?: unknown }) => void,
  delayMs = 2000,
): { request(now?: boolean): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<unknown> | undefined;
  let again = false;
  const go = async () => {
    if (running) {
      again = true;
      return;
    }
    running = run();
    try {
      await running;
      onState({ ok: true });
    } catch (error) {
      onState({ ok: false, error });
    } finally {
      running = undefined;
      if (again) {
        again = false;
        void go();
      }
    }
  };
  return {
    request(now = false) {
      clearTimeout(timer);
      timer = setTimeout(() => void go(), now ? 0 : delayMs);
    },
  };
}
