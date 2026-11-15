// Local progress: the learner's events.jsonl text plus per-problem drafts, kept in
// IndexedDB (localStorage when IndexedDB is unavailable, e.g. some private windows).

const DB_NAME = "myleet";
const STORE = "kv";
const EVENTS = "events";
const META = "meta";
const LS_PREFIX = "myleet:";

export interface SyncMeta {
  /** Server version the local copy is based on; 0 when it has never synced. */
  version: number;
  /** True when local has lines the server has not accepted yet. */
  dirty: boolean;
}

export interface Draft {
  code: string;
  savedAt: number;
}

interface Kv {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  /** Read-modify-write in one transaction, so two tabs never drop each other's lines. */
  update<T>(key: string, fn: (old: T | undefined) => T): Promise<T>;
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbKv(): Promise<Kv> {
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(STORE);
  const db = await req(open);
  // Let a newer schema in another tab (or a delete) proceed; the next call reopens.
  db.onversionchange = () => {
    db.close();
    kvPromise = undefined;
  };
  const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);
  return {
    get: <T>(key: string) => req(tx("readonly").get(key)) as Promise<T | undefined>,
    set: async (key, value) => void (await req(tx("readwrite").put(value, key))),
    del: async (key) => void (await req(tx("readwrite").delete(key))),
    update: <T>(key: string, fn: (old: T | undefined) => T) =>
      new Promise<T>((res, rej) => {
        const t = db.transaction(STORE, "readwrite");
        const s = t.objectStore(STORE);
        let next: T;
        const g = s.get(key);
        g.onsuccess = () => {
          next = fn(g.result as T | undefined);
          s.put(next, key);
        };
        t.oncomplete = () => res(next);
        t.onerror = () => rej(t.error);
      }),
  };
}

function lsKv(): Kv {
  const get = <T>(key: string): T | undefined => {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v === null ? undefined : (JSON.parse(v) as T);
  };
  const set = (key: string, value: unknown) => localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  return {
    get: async (key) => get(key),
    set: async (key, value) => set(key, value),
    del: async (key) => localStorage.removeItem(LS_PREFIX + key),
    // shortcut: not atomic across tabs; only used when IndexedDB is missing.
    update: async <T>(key: string, fn: (old: T | undefined) => T) => {
      const next = fn(get<T>(key));
      set(key, next);
      return next;
    },
  };
}

let kvPromise: Promise<Kv> | undefined;

function kv(): Promise<Kv> {
  kvPromise ??= (typeof indexedDB === "undefined" ? Promise.reject(new Error("no indexedDB")) : idbKv()).catch(
    () => lsKv(),
  );
  return kvPromise;
}

/** For tests: forget the opened database. */
export function resetProgressStore(): void {
  kvPromise = undefined;
}

// ---- events ----

function eventTime(line: string): number {
  try {
    const t = Date.parse((JSON.parse(line) as { t?: string }).t ?? "");
    return Number.isNaN(t) ? Infinity : t;
  } catch {
    return Infinity;
  }
}

/**
 * Union of two events.jsonl texts: identical lines collapse, the rest sort by event
 * time (stable, so same-time lines keep their order). Unreadable lines are kept at the
 * end rather than dropped, since the core skips them anyway.
 */
export function mergeEvents(a: string, b: string): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const line of `${a}\n${b}`.split("\n")) {
    const l = line.trim();
    if (l && !seen.has(l)) {
      seen.add(l);
      lines.push(l);
    }
  }
  const timed = lines.map((l, i) => ({ l, i, t: eventTime(l) }));
  timed.sort((x, y) => x.t - y.t || x.i - y.i);
  return timed.map((x) => `${x.l}\n`).join("");
}

export async function readEvents(): Promise<string> {
  return (await (await kv()).get<string>(EVENTS)) ?? "";
}

/** Appends one line from the wasm helpers (no trailing newline) and returns the new text. */
export async function appendEvent(line: string): Promise<string> {
  const l = line.trim();
  if (!l || l.includes("\n")) throw new Error("appendEvent takes exactly one events.jsonl line");
  const store = await kv();
  const text = await store.update<string>(EVENTS, (old) => `${old ?? ""}${l}\n`);
  await setMeta({ dirty: true });
  return text;
}

export async function readMeta(): Promise<SyncMeta> {
  return (await (await kv()).get<SyncMeta>(META)) ?? { version: 0, dirty: false };
}

async function setMeta(patch: Partial<SyncMeta>): Promise<SyncMeta> {
  return (await kv()).update<SyncMeta>(META, (old) => ({ version: 0, dirty: false, ...old, ...patch }));
}

/** The events as a downloadable `events.jsonl` file. */
export async function exportEvents(): Promise<Blob> {
  return new Blob([await readEvents()], { type: "application/x-ndjson" });
}

/** Merges an `events.jsonl` file (from the CLI or an export) into local progress. */
export async function importEvents(text: string): Promise<string> {
  const store = await kv();
  const merged = await store.update<string>(EVENTS, (old) => mergeEvents(old ?? "", text));
  await setMeta({ dirty: true });
  return merged;
}

/** Deletes local events and sync state (drafts stay). */
export async function clearEvents(): Promise<void> {
  const store = await kv();
  await store.del(EVENTS);
  await store.del(META);
}

// ---- server sync (the Worker's GET/PUT /api/progress) ----

export interface RemoteProgress {
  events_jsonl: string;
  version: number;
}

export type PutOutcome = { ok: true; version: number } | { ok: false; current: RemoteProgress };

export interface SyncTransport {
  get(): Promise<RemoteProgress>;
  /** 200 gives `{ok: true}`; 409 gives `{ok: false, current}`. Other failures throw. */
  put(baseVersion: number, eventsJsonl: string): Promise<PutOutcome>;
}

/** Shown on the opt-in public profile; computed client-side since the client owns the scheduler. */
export interface PublicSummary {
  streak: number;
  mastered: number;
  solved: number;
  heatmap: Record<string, number>;
}

/** The Worker's `/api/progress` (same origin, session cookie). */
export function apiTransport(opts: { base?: string; summary?: (events: string) => PublicSummary } = {}): SyncTransport {
  const url = `${opts.base ?? ""}/api/progress`;
  const fail = async (res: Response) => {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return new Error(`progress sync: ${res.status} ${body.error ?? res.statusText}`);
  };
  return {
    async get() {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw await fail(res);
      return (await res.json()) as RemoteProgress;
    },
    async put(baseVersion, eventsJsonl) {
      const body: { base_version: number; events_jsonl: string; summary?: PublicSummary } = {
        base_version: baseVersion,
        events_jsonl: eventsJsonl,
      };
      if (opts.summary) body.summary = opts.summary(eventsJsonl);
      const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 409) return { ok: false, current: ((await res.json()) as { current: RemoteProgress }).current };
      if (!res.ok) throw await fail(res);
      return { ok: true, version: ((await res.json()) as { version: number }).version };
    },
  };
}

const MAX_SYNC_TRIES = 5;

/**
 * Pushes local lines when dirty, merging on every 409 until the server accepts;
 * otherwise pulls and merges anything newer. Returns the synced events text.
 */
export async function syncProgress(remote: SyncTransport): Promise<string> {
  const store = await kv();
  let meta = await readMeta();
  let local = await readEvents();
  if (!meta.dirty) {
    const cur = await remote.get();
    if (cur.version === meta.version) return local;
    local = mergeEvents(local, cur.events_jsonl);
    meta = { version: cur.version, dirty: local !== mergeEvents(cur.events_jsonl, "") };
    await store.set(EVENTS, local);
    await store.set(META, meta);
    if (!meta.dirty) return local;
  }
  let base = meta.version;
  for (let i = 0; i < MAX_SYNC_TRIES; i++) {
    const res = await remote.put(base, local);
    if (res.ok) {
      // Lines appended while the PUT was in flight stay dirty for the next sync.
      const now = await readEvents();
      const merged = mergeEvents(now, local);
      await store.set(EVENTS, merged);
      await store.set(META, { version: res.version, dirty: merged !== mergeEvents(local, "") });
      return merged;
    }
    local = mergeEvents(local, res.current.events_jsonl);
    base = res.current.version;
  }
  throw new Error("progress sync kept conflicting; try again");
}

// ---- drafts ----

const draftKey = (problem: string) => `draft:${problem}`;

export async function loadDraft(problem: string): Promise<Draft | undefined> {
  return (await kv()).get<Draft>(draftKey(problem));
}

export async function saveDraft(problem: string, code: string): Promise<void> {
  await (await kv()).set(draftKey(problem), { code, savedAt: Date.now() } satisfies Draft);
}

export async function deleteDraft(problem: string): Promise<void> {
  await (await kv()).del(draftKey(problem));
}

/** Debounced autosave for an editor; call `flush()` before navigating away. */
export function autosaver(problem: string, delayMs = 500): { save(code: string): void; flush(): Promise<void> } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: string | undefined;
  const flush = async () => {
    clearTimeout(timer);
    timer = undefined;
    if (pending === undefined) return;
    const code = pending;
    pending = undefined;
    await saveDraft(problem, code);
  };
  return {
    save(code) {
      pending = code;
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), delayMs);
    },
    flush,
  };
}
